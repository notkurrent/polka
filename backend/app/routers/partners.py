import os
import re
import asyncio
import logging
import time
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.dependencies import get_current_user
from app.models import Offer, OfferType, Order, OrderStatus, Partner, User, UserRole
from app.order_lifecycle import ACTIVE_ORDER_STATUSES, normalize_order_status
from app.schemas import (
    OfferPublicDTO,
    OrderDetailDTO,
    PartnerDetailDTO,
    PartnerPublicDTO,
)
from app.serializers import (
    build_offer_dto,
    build_order_detail_dto,
    build_partner_dto,
)

router = APIRouter(prefix="/partner-api", tags=["partner"])
public_router = APIRouter(prefix="/partners", tags=["partners"])
logger = logging.getLogger(__name__)

DEFAULT_DEV_LAT = 43.238949
DEFAULT_DEV_LON = 76.889709
ALMATY_VIEWBOX = "76.75,43.36,77.05,43.12"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "PolkaMVP/0.1 local-address-search")
ADDRESS_CACHE_TTL_SECONDS = 300
ADDRESS_RATE_LIMIT_SECONDS = 1.0
_address_cache: dict[str, tuple[float, list[dict]]] = {}
_last_address_lookup_at = 0.0


def is_dev_env() -> bool:
    return os.getenv("ENV", "dev").lower() == "dev"


def env_flag(name: str) -> bool:
    return os.getenv(name, "").lower() in {"1", "true", "yes", "on"}


def verify_partner_role(user: User) -> None:
    if user.role == UserRole.PARTNER:
        return

    if is_dev_env() and env_flag("POLKA_DEV_ALLOW_PARTNER_ROLE_BYPASS"):
        return

    raise HTTPException(status_code=403, detail="Partner role required")


async def apply_partner_location(
    session: AsyncSession,
    partner: Partner,
    *,
    lat: float | None,
    lon: float | None,
) -> None:
    if lat is None or lon is None:
        if not is_dev_env():
            return
        lat = DEFAULT_DEV_LAT
        lon = DEFAULT_DEV_LON

    await session.execute(
        text(
            """
            UPDATE partner
            SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
            WHERE id = :partner_id
            """
        ),
        {"lat": lat, "lon": lon, "partner_id": partner.id},
    )


async def get_current_partner(user: User, session: AsyncSession) -> Partner:
    verify_partner_role(user)

    query = select(Partner).where(Partner.user_id == user.id)
    result = await session.execute(query)
    partner = result.scalar_one_or_none()

    if partner:
        return partner

    if is_dev_env() and env_flag("POLKA_DEV_AUTO_CREATE_PARTNER"):
        partner = Partner(
            user_id=user.id,
            name="Polka Dev Partner",
            address="проспект Достык, 52, Алматы",
            hours="09:00-21:00",
            description="Dev partner profile.",
            category="dev",
        )
        session.add(partner)
        await session.flush()
        await apply_partner_location(session, partner, lat=None, lon=None)
        await session.commit()
        await session.refresh(partner)
        return partner

    raise HTTPException(status_code=404, detail="Partner profile not found")


async def get_partner_location_row(session: AsyncSession, partner_id: int):
    result = await session.execute(
        select(
            Partner,
            func.ST_Y(Partner.location).label("lat"),
            func.ST_X(Partner.location).label("lon"),
        ).where(Partner.id == partner_id)
    )
    return result.one_or_none()


def partner_order_response(order: Order, offer: Offer, partner: Partner) -> dict:
    detail = build_order_detail_dto(order, offer, partner).model_dump()
    detail["order"] = {
        "id": order.id,
        "status": detail["status"],
        "code": order.code,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }
    detail["offer_snapshot"] = build_offer_dto(offer).model_dump()
    return detail


class OfferCreate(BaseModel):
    type: OfferType
    name: str
    old_price: Decimal = Field(ge=0)
    new_price: Decimal = Field(ge=0)
    stock: int = Field(ge=0)


class OfferUpdate(BaseModel):
    name: str | None = None
    old_price: Decimal | None = Field(default=None, ge=0)
    new_price: Decimal | None = Field(default=None, ge=0)
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
    lat: float | None = None
    lon: float | None = None


class PartnerProfileUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    hours: str | None = None
    description: str | None = None
    category: str | None = None
    lat: float | None = None
    lon: float | None = None


class AddressSuggestion(BaseModel):
    label: str
    lat: float
    lon: float
    place_id: int | None = None


def compact_address_label(item: dict) -> str:
    address = item.get("address") or {}
    display_name = item.get("display_name", "")
    name = item.get("name") or address.get("amenity") or address.get("shop") or address.get("building")
    road = address.get("road") or address.get("pedestrian") or address.get("footway")
    house_number = address.get("house_number")

    street = ""
    if road and house_number:
        street = f"{road}, {house_number}"
    elif road:
        street = road
    elif house_number:
        street = str(house_number)

    parts = []
    if name and name != road:
        parts.append(str(name))
    if street:
        parts.append(street)

    if parts:
        return ", ".join(parts)
    return display_name


@router.get("/profile", response_model=PartnerPublicDTO)
async def get_partner_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)
    row = await get_partner_location_row(session, partner.id)
    partner, lat, lon = row
    return build_partner_dto(
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


@public_router.get("/{partner_id}", response_model=PartnerDetailDTO)
async def get_partner_detail(
    partner_id: int,
    session: AsyncSession = Depends(get_session),
):
    row = await get_partner_location_row(session, partner_id)
    if not row:
        raise HTTPException(status_code=404, detail="Partner not found")

    partner, lat, lon = row
    offers_result = await session.execute(
        select(Offer).where(Offer.partner_id == partner.id).order_by(Offer.created_at.desc())
    )

    return PartnerDetailDTO(
        partner=build_partner_dto(
            partner,
            lat=float(lat) if lat is not None else None,
            lon=float(lon) if lon is not None else None,
        ),
        offers=[build_offer_dto(offer) for offer in offers_result.scalars().all()],
    )


@router.post("/register", response_model=PartnerPublicDTO)
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
    )
    session.add(partner)
    await session.flush()
    await apply_partner_location(session, partner, lat=req.lat, lon=req.lon)

    current_user.role = UserRole.PARTNER
    session.add(current_user)

    await session.commit()
    row = await get_partner_location_row(session, partner.id)
    partner, lat, lon = row
    return build_partner_dto(
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


@router.get("/offers", response_model=list[OfferPublicDTO])
async def get_partner_offers(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)

    query = select(Offer).where(Offer.partner_id == partner.id).order_by(Offer.created_at.desc())
    result = await session.execute(query)
    return [build_offer_dto(offer) for offer in result.scalars().all()]


@router.post("/offers", response_model=OfferPublicDTO)
async def create_partner_offer(
    req: OfferCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)

    new_offer = Offer(
        partner_id=partner.id,
        type=req.type,
        name=req.name,
        old_price=req.old_price,
        new_price=req.new_price,
        stock=req.stock,
    )
    session.add(new_offer)
    await session.commit()
    await session.refresh(new_offer)
    return build_offer_dto(new_offer)


@router.patch("/offers/{offer_id}", response_model=OfferPublicDTO)
async def update_partner_offer(
    offer_id: int,
    req: OfferUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)

    query = select(Offer).where(Offer.id == offer_id, Offer.partner_id == partner.id)
    result = await session.execute(query)
    offer = result.scalar_one_or_none()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    update_data = req.model_dump(exclude_unset=True)
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
    partner = await get_current_partner(current_user, session)

    query = select(Offer).where(Offer.id == offer_id, Offer.partner_id == partner.id)
    result = await session.execute(query)
    offer = result.scalar_one_or_none()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    order_result = await session.execute(select(Order).where(Order.offer_id == offer.id))
    if order_result.scalar_one_or_none() is not None:
        offer.stock = 0
        session.add(offer)
        await session.commit()
        return {"status": "archived"}

    await session.delete(offer)
    await session.commit()
    return {"status": "deleted"}


@router.get("/orders")
async def get_partner_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)

    query = (
        select(Order, Offer, Partner)
        .join(Offer, Order.offer_id == Offer.id)
        .join(Partner, Offer.partner_id == Partner.id)
        .where(Offer.partner_id == partner.id)
        .order_by(Order.created_at.desc())
    )
    result = await session.execute(query)

    return [
        partner_order_response(order, offer, order_partner)
        for order, offer, order_partner in result.all()
    ]


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


@router.post("/orders/verify-code", response_model=OrderDetailDTO)
async def verify_order_code(
    req: VerifyOrderCodeRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)
    order_id, code = parse_code_payload(req)

    query = (
        select(Order, Offer, Partner)
        .join(Offer, Order.offer_id == Offer.id)
        .join(Partner, Offer.partner_id == Partner.id)
        .where(Offer.partner_id == partner.id, Order.code == code)
        .with_for_update(of=Order)
    )
    if order_id is not None:
        query = query.where(Order.id == order_id)
    else:
        query = query.where(Order.status.in_(ACTIVE_ORDER_STATUSES))

    result = await session.execute(query)
    rows = result.all()

    if not rows:
        ownership_query = (
            select(Order, Offer)
            .join(Offer, Order.offer_id == Offer.id)
            .where(Order.code == code)
        )
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

    order, offer, order_partner = rows[0]
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
    return build_order_detail_dto(order, offer, order_partner)


@router.patch("/orders/{order_id}/status", response_model=OrderDetailDTO)
async def update_order_status(
    order_id: int,
    req: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_current_partner(current_user, session)
    next_status = normalize_order_status(req.status)

    if next_status == OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Use /partner-api/orders/verify-code to complete orders")
    if next_status != OrderStatus.EXPIRED:
        raise HTTPException(status_code=400, detail="Invalid status transition")

    try:
        query = (
            select(Order, Offer, Partner)
            .join(Offer, Order.offer_id == Offer.id)
            .join(Partner, Offer.partner_id == Partner.id)
            .where(Order.id == order_id, Offer.partner_id == partner.id)
            .with_for_update(of=Order)
        )
        result = await session.execute(query)
        row = result.one_or_none()

        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        order, offer, order_partner = row
        if order.status not in ACTIVE_ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="Order status can not be changed")

        offer_result = await session.execute(
            select(Offer).where(Offer.id == order.offer_id).with_for_update()
        )
        locked_offer = offer_result.scalar_one_or_none()
        if not locked_offer:
            raise HTTPException(status_code=404, detail="Offer not found")

        locked_offer.stock += 1
        order.status = next_status
        session.add(locked_offer)
        session.add(order)
        await session.commit()
        await session.refresh(order)
        await session.refresh(locked_offer)
        logger.info(
            "order.status_changed order_id=%s partner_id=%s status=%s actor=partner",
            order.id,
            partner.id,
            order.status.value,
        )
        return build_order_detail_dto(order, locked_offer, order_partner)
    except HTTPException:
        await session.rollback()
        raise
