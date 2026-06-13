import os
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import (
    Offer,
    OfferAvailability,
    Order,
    OrderItem,
    Partner,
    PartnerStatus,
    SubscriptionStatus,
    User,
    UserRole,
)
from app.serializers import build_offer_dto, build_order_detail_dto
from app.services.media_storage import MediaStorageError, MediaValidationError

DEFAULT_DEV_LAT = 43.238949
DEFAULT_DEV_LON = 76.889709
ALMATY_VIEWBOX = "76.75,43.36,77.05,43.12"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "PolkaMVP/0.1 local-address-search")
ADDRESS_CACHE_TTL_SECONDS = 300
ADDRESS_RATE_LIMIT_SECONDS = 1.0
FREE_ACTIVE_OFFER_LIMIT = 5
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
            status=PartnerStatus.APPROVED,
        )
        session.add(partner)
        await session.flush()
        await apply_partner_location(session, partner, lat=None, lon=None)
        await session.commit()
        await session.refresh(partner)
        return partner

    raise HTTPException(status_code=404, detail="Partner profile not found")


async def get_approved_partner(user: User, session: AsyncSession) -> Partner:
    partner = await get_current_partner(user, session)
    if partner.status == PartnerStatus.APPROVED:
        return partner
    raise HTTPException(status_code=403, detail="Partner account is not approved")


async def get_partner_location_row(session: AsyncSession, partner_id: int):
    result = await session.execute(
        select(
            Partner,
            func.ST_Y(Partner.location).label("lat"),
            func.ST_X(Partner.location).label("lon"),
        ).where(Partner.id == partner_id)
    )
    return result.one_or_none()


async def get_order_item_rows(session: AsyncSession, order_id: int) -> list[tuple[OrderItem, Offer]]:
    result = await session.execute(
        select(OrderItem, Offer)
        .join(Offer, OrderItem.offer_id == Offer.id)
        .where(OrderItem.order_id == order_id)
        .order_by(OrderItem.id)
    )
    return result.all()


def partner_order_response(order: Order, item_rows: list[tuple[OrderItem, Offer]], partner: Partner) -> dict:
    detail = build_order_detail_dto(order, item_rows, partner).model_dump(mode="json")
    detail["order"] = {
        "id": order.id,
        "status": detail["status"],
        "code": order.code,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }
    detail["offer_snapshot"] = build_offer_dto(item_rows[0][1]).model_dump(mode="json")
    return detail


class AddressSuggestion(BaseModel):
    label: str
    lat: float
    lon: float
    place_id: int | None = None


def resolve_offer_price(*, price: Decimal | None, new_price: Decimal | None) -> Decimal:
    resolved = price if price is not None else new_price
    if resolved is None:
        raise HTTPException(status_code=422, detail="Product price is required")
    return resolved


def default_offer_availability(stock: int) -> OfferAvailability:
    return OfferAvailability.IN_STOCK if stock > 0 else OfferAvailability.OUT_OF_STOCK


def is_active_offer(availability: OfferAvailability, stock: int) -> bool:
    return availability == OfferAvailability.IN_STOCK and stock > 0


def has_unlimited_offer_subscription(partner: Partner) -> bool:
    if partner.subscription_status != SubscriptionStatus.ACTIVE:
        return False
    return partner.subscription_expires_at is None or partner.subscription_expires_at > datetime.now(timezone.utc)


async def count_active_partner_offers(
    session: AsyncSession,
    partner_id: int,
    *,
    exclude_offer_id: int | None = None,
) -> int:
    query = select(func.count(Offer.id)).where(
        Offer.partner_id == partner_id,
        Offer.is_archived.is_(False),
        Offer.availability == OfferAvailability.IN_STOCK,
        Offer.stock > 0,
    )
    if exclude_offer_id is not None:
        query = query.where(Offer.id != exclude_offer_id)

    result = await session.execute(query)
    return int(result.scalar_one())


async def enforce_active_offer_limit(
    session: AsyncSession,
    partner: Partner,
    *,
    availability: OfferAvailability,
    stock: int,
    exclude_offer_id: int | None = None,
) -> None:
    if not is_active_offer(availability, stock) or has_unlimited_offer_subscription(partner):
        return

    active_count = await count_active_partner_offers(
        session,
        partner.id,
        exclude_offer_id=exclude_offer_id,
    )
    if active_count >= FREE_ACTIVE_OFFER_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"FREE plan allows up to {FREE_ACTIVE_OFFER_LIMIT} active offers",
        )


def media_http_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, MediaValidationError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, MediaStorageError):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=500, detail="Image processing failed")


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
