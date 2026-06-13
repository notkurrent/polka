import asyncio
import logging
import re
import time
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.dependencies import get_current_user
from app.rate_limit import sensitive_rate_limit
from app.models import (
    Offer,
    OfferAvailability,
    OfferType,
    Order,
    OrderItem,
    OrderStatus,
    Partner,
    PartnerStatus,
    User,
    UserRole,
)
from app.order_lifecycle import ACTIVE_ORDER_STATUSES, expire_stale_orders, normalize_order_status, restore_order_stock
from app.schemas import OfferPublicDTO, OrderDetailDTO, PartnerProfileDTO, PartnerPublicDTO
from app.serializers import (
    build_offer_dto,
    build_order_detail_dto,
    build_partner_dto,
    build_partner_profile_dto,
)
from app.services.notifications import notify_admin_partner_registered
from app.services.media_storage import (
    MediaImageKind,
    MediaStorageError,
    MediaValidationError,
    SupabaseMediaStorage,
    new_offer_image_path,
    new_partner_logo_path,
    prepare_upload_image,
)
from app.routers.partner_common import (
    ADDRESS_CACHE_TTL_SECONDS,
    ADDRESS_RATE_LIMIT_SECONDS,
    ALMATY_VIEWBOX,
    NOMINATIM_SEARCH_URL,
    NOMINATIM_USER_AGENT,
    AddressSuggestion,
    _address_cache,
    _last_address_lookup_at,
    apply_partner_location,
    compact_address_label,
    default_offer_availability,
    enforce_active_offer_limit,
    get_approved_partner,
    get_current_partner,
    get_order_item_rows,
    get_partner_location_row,
    media_http_exception,
    partner_order_response,
    resolve_offer_price,
    verify_partner_role,
)

router = APIRouter(prefix="/partner-api", tags=["partner"])
logger = logging.getLogger(__name__)
media_storage = SupabaseMediaStorage()

class OfferCreate(BaseModel):
    type: OfferType = OfferType.SPECIFIC
    availability: OfferAvailability | None = None
    name: str
    description: str = ""
    category: str = ""
    tags: str = ""
    pickup_time: str = ""
    price: Decimal | None = Field(default=None, ge=0)
    old_price: Decimal | None = Field(default=None, ge=0)
    new_price: Decimal | None = Field(default=None, ge=0)
    discount_reason: str = ""
    stock: int = Field(ge=0)


class OfferUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    tags: str | None = None
    pickup_time: str | None = None
    type: OfferType | None = None
    availability: OfferAvailability | None = None
    price: Decimal | None = Field(default=None, ge=0)
    old_price: Decimal | None = Field(default=None, ge=0)
    new_price: Decimal | None = Field(default=None, ge=0)
    discount_reason: str | None = None
    stock: int | None = Field(default=None, ge=0)


class OrderStatusUpdate(BaseModel):
    status: str


class VerifyOrderCodeRequest(BaseModel):
    code: str = Field(min_length=4)
    order_id: int | None = None


class PartnerRegister(BaseModel):
    name: str
    type: str
    address: str
    description: str = ""
    hours: str | None = None
    map_url: str | None = None
    phone: str | None = None
    whatsapp_url: str | None = None
    telegram_url: str | None = None
    instagram_url: str | None = None
    website_url: str | None = None
    lat: float | None = None
    lon: float | None = None


class PartnerProfileUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    hours: str | None = None
    description: str | None = None
    category: str | None = None
    map_url: str | None = None
    phone: str | None = None
    whatsapp_url: str | None = None
    telegram_url: str | None = None
    instagram_url: str | None = None
    website_url: str | None = None
    lat: float | None = None
    lon: float | None = None


@router.get("/profile", response_model=PartnerProfileDTO)
async def get_partner_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)
    row = await get_partner_location_row(session, partner.id)
    partner, lat, lon = row
    return build_partner_profile_dto(
        partner,
        lat=float(lat) if lat is not None else None,
        lon=float(lon) if lon is not None else None,
    )


@router.get("/address-suggestions", response_model=list[AddressSuggestion])
async def suggest_partner_addresses(
    q: str,
    current_user: User = Depends(get_current_user),
):
    verify_partner_role(current_user)

    query = q.strip()
    if len(query) < 3:
        return []

    cache_key = query.lower()
    cached = _address_cache.get(cache_key)
    now = time.monotonic()
    if cached and now - cached[0] < ADDRESS_CACHE_TTL_SECONDS:
        return cached[1]

    global _last_address_lookup_at
    elapsed = now - _last_address_lookup_at
    if elapsed < ADDRESS_RATE_LIMIT_SECONDS:
        await asyncio.sleep(ADDRESS_RATE_LIMIT_SECONDS - elapsed)

    params = {
        "q": f"{query}, Алматы",
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 5,
        "countrycodes": "kz",
        "viewbox": ALMATY_VIEWBOX,
        "bounded": 1,
        "accept-language": "ru",
    }
    headers = {"User-Agent": NOMINATIM_USER_AGENT}

    try:
        async with httpx.AsyncClient(timeout=6) as client:
            response = await client.get(NOMINATIM_SEARCH_URL, params=params, headers=headers)
            response.raise_for_status()
            raw_results = response.json()
    except httpx.HTTPError as exc:
        logger.warning("address.suggest_failed error=%s", exc.__class__.__name__)
        raise HTTPException(status_code=502, detail="Address search is unavailable") from exc
    finally:
        _last_address_lookup_at = time.monotonic()

    suggestions = [
        {
            "label": compact_address_label(item),
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
            "place_id": item.get("place_id"),
        }
        for item in raw_results
        if item.get("display_name") and item.get("lat") and item.get("lon")
    ]
    _address_cache[cache_key] = (time.monotonic(), suggestions)
    return suggestions


@router.post(
    "/register",
    response_model=PartnerProfileDTO,
    dependencies=[Depends(sensitive_rate_limit("partner_api.register"))],
)
async def register_partner(
    req: PartnerRegister,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    existing_partner_result = await session.execute(
        select(Partner).where(Partner.user_id == current_user.id)
    )
    existing_partner = existing_partner_result.scalar_one_or_none()
    if existing_partner is not None:
        raise HTTPException(status_code=400, detail="Partner already exists")

    partner = Partner(
        user_id=current_user.id,
        name=req.name,
        address=req.address,
        hours=req.hours or "09:00-21:00",
        category=req.type,
        description=req.description,
        map_url=req.map_url,
        phone=req.phone,
        whatsapp_url=req.whatsapp_url,
        telegram_url=req.telegram_url,
        instagram_url=req.instagram_url,
        website_url=req.website_url,
        status=PartnerStatus.PENDING,
    )
    session.add(partner)
    await session.flush()
    await apply_partner_location(session, partner, lat=req.lat, lon=req.lon)

    current_user.role = UserRole.PARTNER
    session.add(current_user)

    await session.commit()

    try:
        await notify_admin_partner_registered(partner, current_user)
    except Exception:
        logger.exception(
            "partner.register_admin_notification_failed partner_id=%s user_id=%s",
            partner.id,
            current_user.id,
        )

    row = await get_partner_location_row(session, partner.id)
    partner, lat, lon = row
    return build_partner_profile_dto(
        partner,
        lat=float(lat) if lat is not None else None,
        lon=float(lon) if lon is not None else None,
    )


@router.patch("/profile", response_model=PartnerPublicDTO)
async def update_partner_profile(
    req: PartnerProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)

    update_data = req.model_dump(exclude_unset=True)
    lat = update_data.pop("lat", None)
    lon = update_data.pop("lon", None)
    for key, value in update_data.items():
        setattr(partner, key, value)

    session.add(partner)
    await session.flush()
    if lat is not None or lon is not None:
        await apply_partner_location(session, partner, lat=lat, lon=lon)
    await session.commit()

    row = await get_partner_location_row(session, partner.id)
    partner, row_lat, row_lon = row
    return build_partner_dto(
        partner,
        lat=float(row_lat) if row_lat is not None else None,
        lon=float(row_lon) if row_lon is not None else None,
    )


@router.post("/profile/logo", response_model=PartnerPublicDTO)
async def upload_partner_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)

    try:
        prepared = await prepare_upload_image(file, MediaImageKind.PARTNER_LOGO)
        new_path = new_partner_logo_path(partner.id, prepared.extension)
        await media_storage.upload(
            path=new_path,
            body=prepared.body,
            content_type=prepared.content_type,
        )
    except (MediaValidationError, MediaStorageError) as exc:
        raise media_http_exception(exc) from exc

    old_path = partner.logo_path
    partner.logo_path = new_path
    session.add(partner)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        try:
            await media_storage.delete(new_path)
        except MediaStorageError:
            logger.exception("media.rollback_delete_failed path=%s", new_path)
        raise

    try:
        await media_storage.delete(old_path)
    except MediaStorageError:
        logger.exception("media.old_logo_delete_failed path=%s", old_path)

    row = await get_partner_location_row(session, partner.id)
    partner, row_lat, row_lon = row
    return build_partner_dto(
        partner,
        lat=float(row_lat) if row_lat is not None else None,
        lon=float(row_lon) if row_lon is not None else None,
    )


@router.get("/offers", response_model=list[OfferPublicDTO])
async def get_partner_offers(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)
    await expire_stale_orders(session)

    query = (
        select(Offer)
        .where(Offer.partner_id == partner.id, Offer.is_archived.is_(False))
        .order_by(Offer.created_at.desc())
    )
    result = await session.execute(query)
    return [build_offer_dto(offer) for offer in result.scalars().all()]


@router.post("/offers", response_model=OfferPublicDTO)
async def create_partner_offer(
    req: OfferCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await expire_stale_orders(session)
    partner = await get_approved_partner(current_user, session)
    price = resolve_offer_price(price=req.price, new_price=req.new_price)
    availability = req.availability or default_offer_availability(req.stock)
    await enforce_active_offer_limit(
        session,
        partner,
        availability=availability,
        stock=req.stock,
    )

    new_offer = Offer(
        partner_id=partner.id,
        type=req.type,
        availability=availability,
        name=req.name,
        description=req.description,
        category=req.category,
        tags=req.tags,
        pickup_time=req.pickup_time,
        old_price=req.old_price,
        new_price=price,
        discount_reason=req.discount_reason,
        stock=req.stock,
    )
    session.add(new_offer)
    await session.commit()
    await session.refresh(new_offer)
    return build_offer_dto(new_offer)


@router.post("/offers/{offer_id}/image", response_model=OfferPublicDTO)
async def upload_partner_offer_image(
    offer_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_approved_partner(current_user, session)

    query = select(Offer).where(Offer.id == offer_id, Offer.partner_id == partner.id, Offer.is_archived.is_(False))
    result = await session.execute(query)
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    try:
        prepared = await prepare_upload_image(file, MediaImageKind.OFFER_IMAGE)
        new_path = new_offer_image_path(partner.id, offer.id, prepared.extension)
        await media_storage.upload(
            path=new_path,
            body=prepared.body,
            content_type=prepared.content_type,
        )
    except (MediaValidationError, MediaStorageError) as exc:
        raise media_http_exception(exc) from exc

    old_path = offer.image_path
    offer.image_path = new_path
    session.add(offer)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        try:
            await media_storage.delete(new_path)
        except MediaStorageError:
            logger.exception("media.rollback_delete_failed path=%s", new_path)
        raise

    try:
        await media_storage.delete(old_path)
    except MediaStorageError:
        logger.exception("media.old_offer_image_delete_failed path=%s", old_path)

    await session.refresh(offer)
    return build_offer_dto(offer)


@router.delete("/offers/{offer_id}/image", response_model=OfferPublicDTO)
async def delete_partner_offer_image(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_approved_partner(current_user, session)

    query = select(Offer).where(Offer.id == offer_id, Offer.partner_id == partner.id, Offer.is_archived.is_(False))
    result = await session.execute(query)
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    old_path = offer.image_path
    offer.image_path = None
    session.add(offer)
    await session.commit()

    try:
        await media_storage.delete(old_path)
    except MediaStorageError:
        logger.exception("media.offer_image_delete_failed path=%s", old_path)

    await session.refresh(offer)
    return build_offer_dto(offer)


@router.patch("/offers/{offer_id}", response_model=OfferPublicDTO)
async def update_partner_offer(
    offer_id: int,
    req: OfferUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_approved_partner(current_user, session)

    query = select(Offer).where(Offer.id == offer_id, Offer.partner_id == partner.id, Offer.is_archived.is_(False))
    result = await session.execute(query)
    offer = result.scalar_one_or_none()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    update_data = req.model_dump(exclude_unset=True)
    price = update_data.pop("price", None)
    if price is not None:
        update_data["new_price"] = price
    stock = update_data.get("stock")
    if stock is not None and "availability" not in update_data:
        if stock <= 0:
            update_data["availability"] = OfferAvailability.OUT_OF_STOCK
        elif offer.availability == OfferAvailability.OUT_OF_STOCK:
            update_data["availability"] = OfferAvailability.IN_STOCK
    next_availability = update_data.get("availability", offer.availability)
    next_stock = update_data.get("stock", offer.stock)
    await enforce_active_offer_limit(
        session,
        partner,
        availability=next_availability,
        stock=next_stock,
        exclude_offer_id=offer.id,
    )
    for key, value in update_data.items():
        setattr(offer, key, value)

    session.add(offer)
    await session.commit()
    await session.refresh(offer)
    return build_offer_dto(offer)


@router.delete("/offers/{offer_id}")
async def delete_partner_offer(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_approved_partner(current_user, session)

    query = select(Offer).where(Offer.id == offer_id, Offer.partner_id == partner.id, Offer.is_archived.is_(False))
    result = await session.execute(query)
    offer = result.scalar_one_or_none()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    order_result = await session.execute(select(OrderItem.id).where(OrderItem.offer_id == offer.id).limit(1))
    if order_result.scalar_one_or_none() is not None:
        offer.is_archived = True
        offer.availability = OfferAvailability.HIDDEN
        offer.stock = 0
        session.add(offer)
        await session.commit()
        return {"status": "archived"}

    image_path = offer.image_path
    await session.delete(offer)
    await session.commit()
    try:
        await media_storage.delete(image_path)
    except MediaStorageError:
        logger.exception("media.deleted_offer_image_delete_failed path=%s", image_path)
    return {"status": "deleted"}


# Legacy reservation endpoints are hidden from public API docs. They remain so
# existing archived order data can still protect product deletion semantics.
@router.get("/orders", include_in_schema=False)
async def get_partner_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_approved_partner(current_user, session)

    order_ids_query = (
        select(OrderItem.order_id)
        .join(Offer, OrderItem.offer_id == Offer.id)
        .where(Offer.partner_id == partner.id)
        .distinct()
        .subquery()
    )
    query = (
        select(Order)
        .where(Order.id.in_(select(order_ids_query.c.order_id)))
        .order_by(Order.created_at.desc())
    )
    result = await session.execute(query)

    responses = []
    for order in result.scalars().all():
        item_rows = await get_order_item_rows(session, order.id)
        if item_rows:
            responses.append(partner_order_response(order, item_rows, partner))
    return responses


def parse_code_payload(req: VerifyOrderCodeRequest) -> tuple[int | None, str]:
    order_id = req.order_id
    raw_code = req.code.strip()

    query_match = re.search(r"/order/(\d+)\?code=(\d{4})", raw_code)
    if query_match:
        return int(query_match.group(1)), query_match.group(2)

    qr_match = re.search(r"/order/(\d+)/(\d{4})", raw_code)
    if qr_match:
        return int(qr_match.group(1)), qr_match.group(2)

    code_match = re.search(r"\b(\d{4})\b", raw_code)
    if code_match:
        return order_id, code_match.group(1)

    raise HTTPException(status_code=400, detail="Code must contain 4 digits")


@router.post(
    "/orders/verify-code",
    response_model=OrderDetailDTO,
    include_in_schema=False,
    dependencies=[Depends(sensitive_rate_limit("partner_api.orders.verify_code"))],
)
async def verify_order_code(
    req: VerifyOrderCodeRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await expire_stale_orders(session)
    partner = await get_approved_partner(current_user, session)
    order_id, code = parse_code_payload(req)

    query = (
        select(Order)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(Offer, OrderItem.offer_id == Offer.id)
        .where(Offer.partner_id == partner.id, Order.code == code)
        .with_for_update(of=Order)
    )
    if order_id is not None:
        query = query.where(Order.id == order_id)
    else:
        query = query.where(Order.status.in_(ACTIVE_ORDER_STATUSES))

    result = await session.execute(query)
    raw_rows = result.all()
    seen_order_ids: set[int] = set()
    rows = []
    for row in raw_rows:
        row_order = row[0]
        if row_order.id in seen_order_ids:
            continue
        seen_order_ids.add(row_order.id)
        rows.append(row)

    if not rows:
        ownership_query = select(Order, Offer).join(OrderItem, OrderItem.order_id == Order.id).join(
            Offer, OrderItem.offer_id == Offer.id
        ).where(Order.code == code)
        if order_id is not None:
            ownership_query = ownership_query.where(Order.id == order_id)
        ownership_result = await session.execute(ownership_query)
        ownership_row = ownership_result.first()
        if ownership_row and ownership_row[1].partner_id != partner.id:
            logger.warning(
                "order.verify_code_forbidden partner_id=%s order_id=%s",
                partner.id,
                order_id,
            )
            raise HTTPException(status_code=403, detail="Order belongs to another partner")
        logger.warning("order.verify_code_not_found partner_id=%s order_id=%s", partner.id, order_id)
        raise HTTPException(status_code=404, detail="Active order with this code not found")
    if order_id is None and len(rows) > 1:
        raise HTTPException(status_code=409, detail="Multiple orders match this code; include order_id")

    active_rows = [row for row in rows if row[0].status in ACTIVE_ORDER_STATUSES]
    if order_id is None:
        rows = active_rows
    if order_id is None and not rows:
        raise HTTPException(status_code=404, detail="Active order with this code not found")
    if order_id is not None and not active_rows:
        raise HTTPException(status_code=400, detail="Order is not active")

    order = rows[0][0]
    if order.status not in ACTIVE_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Order is not active")

    order.status = OrderStatus.COMPLETED
    session.add(order)
    await session.commit()
    await session.refresh(order)
    logger.info(
        "order.status_changed order_id=%s partner_id=%s status=%s actor=partner",
        order.id,
        partner.id,
        order.status.value,
    )
    item_rows = await get_order_item_rows(session, order.id)
    return build_order_detail_dto(order, item_rows, partner)


@router.patch("/orders/{order_id}/status", response_model=OrderDetailDTO, include_in_schema=False)
async def update_order_status(
    order_id: int,
    req: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await expire_stale_orders(session)
    partner = await get_approved_partner(current_user, session)
    next_status = normalize_order_status(req.status)

    if next_status == OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Use /partner-api/orders/verify-code to complete orders")
    if next_status != OrderStatus.EXPIRED:
        raise HTTPException(status_code=400, detail="Invalid status transition")

    try:
        query = (
            select(Order)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(Offer, OrderItem.offer_id == Offer.id)
            .where(Order.id == order_id, Offer.partner_id == partner.id)
            .with_for_update(of=Order)
        )
        result = await session.execute(query)
        row = result.first()

        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        order = row[0]
        if order.status not in ACTIVE_ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="Order status can not be changed")

        await restore_order_stock(session, order.id)
        order.status = next_status
        session.add(order)
        await session.commit()
        logger.info(
            "order.status_changed order_id=%s partner_id=%s status=%s actor=partner",
            order.id,
            partner.id,
            order.status.value,
        )
        item_rows = await get_order_item_rows(session, order.id)
        return build_order_detail_dto(order, item_rows, partner)
    except HTTPException:
        await session.rollback()
        raise
