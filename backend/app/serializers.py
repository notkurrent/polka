from datetime import datetime, timezone

from app.models import Offer, Order, Partner
from app.schemas import (
    OfferPublicDTO,
    OfferWithPartnerDTO,
    OrderDetailDTO,
    OrderItemDTO,
    OrderOfferDTO,
    OrderPartnerDTO,
    PartnerProfileDTO,
    PartnerPublicDTO,
)
from app.order_lifecycle import order_expires_at


def order_status_name(order: Order) -> str:
    return order.status.name if hasattr(order.status, "name") else str(order.status).upper()


def build_partner_dto(
    partner: Partner,
    *,
    lat: float | None = None,
    lon: float | None = None,
) -> PartnerPublicDTO:
    return PartnerPublicDTO(
        id=partner.id,
        name=partner.name,
        address=partner.address,
        hours=partner.hours,
        category=partner.category or "",
        description=partner.description or "",
        lat=lat,
        lon=lon,
    )


def build_partner_profile_dto(
    partner: Partner,
    *,
    lat: float | None = None,
    lon: float | None = None,
) -> PartnerProfileDTO:
    return PartnerProfileDTO(
        id=partner.id,
        name=partner.name,
        address=partner.address,
        hours=partner.hours,
        category=partner.category or "",
        description=partner.description or "",
        lat=lat,
        lon=lon,
        status=partner.status,
        review_note=partner.review_note,
        reviewed_at=partner.reviewed_at,
    )


def build_offer_dto(offer: Offer) -> OfferPublicDTO:
    return OfferPublicDTO(
        id=offer.id,
        partner_id=offer.partner_id,
        type=offer.type,
        name=offer.name,
        description=offer.description,
        pickup_time=offer.pickup_time,
        old_price=offer.old_price,
        new_price=offer.new_price,
        stock=offer.stock,
        created_at=offer.created_at,
    )


def build_offer_with_partner_dto(
    offer: Offer,
    partner: Partner,
    *,
    distance: float | None = None,
    lat: float | None = None,
    lon: float | None = None,
) -> OfferWithPartnerDTO:
    return OfferWithPartnerDTO(
        offer=build_offer_dto(offer),
        partner=build_partner_dto(partner, lat=lat, lon=lon),
        partner_name=partner.name,
        distance=distance,
    )


def order_expires_in_seconds(order: Order) -> int:
    return max(0, int((order_expires_at(order) - datetime.now(timezone.utc)).total_seconds()))


def build_order_detail_dto(order: Order, offer: Offer, partner: Partner) -> OrderDetailDTO:
    expires_in = order_expires_in_seconds(order)
    item = OrderItemDTO(id=str(offer.id), title=offer.name, price=offer.new_price)

    return OrderDetailDTO(
        id=order.id,
        status=order_status_name(order),
        code=order.code,
        created_at=order.created_at,
        updated_at=order.updated_at,
        expires_at=order_expires_at(order),
        expires_in_seconds=expires_in,
        offer=OrderOfferDTO(
            id=offer.id,
            name=offer.name,
            old_price=offer.old_price,
            new_price=offer.new_price,
            type=offer.type,
        ),
        partner=OrderPartnerDTO(
            id=partner.id,
            name=partner.name,
            address=partner.address,
            hours=partner.hours,
        ),
        total=offer.new_price,
        storeName=partner.name,
        address=partner.address,
        pickup=offer.pickup_time or partner.hours,
        expiresIn=expires_in,
        items=[item],
    )
