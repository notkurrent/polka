from datetime import datetime, timezone

from app.models import Offer, Order, OrderItem, Partner
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
from app.services.media_storage import build_public_media_url


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
        logo_path=partner.logo_path,
        logo_url=build_public_media_url(partner.logo_path),
        map_url=partner.map_url,
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
        logo_path=partner.logo_path,
        logo_url=build_public_media_url(partner.logo_path),
        map_url=partner.map_url,
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
        availability=offer.availability,
        name=offer.name,
        description=offer.description,
        pickup_time=offer.pickup_time,
        price=offer.new_price,
        old_price=offer.old_price,
        new_price=offer.new_price,
        discount_reason=offer.discount_reason or "",
        stock=offer.stock,
        image_path=offer.image_path,
        image_url=build_public_media_url(offer.image_path),
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


def build_order_detail_dto(order: Order, item_rows: list[tuple[OrderItem, Offer]], partner: Partner) -> OrderDetailDTO:
    if not item_rows:
        raise ValueError("Order has no items")

    expires_in = order_expires_in_seconds(order)
    first_item, first_offer = item_rows[0]
    items = [
        OrderItemDTO(
            id=item.id,
            offer_id=offer.id,
            title=offer.name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
            image_path=offer.image_path,
            image_url=build_public_media_url(offer.image_path),
            price=item.unit_price,
        )
        for item, offer in item_rows
    ]
    total = sum((item.total_price for item, _offer in item_rows), start=first_item.total_price * 0)

    return OrderDetailDTO(
        id=order.id,
        status=order_status_name(order),
        code=order.code,
        created_at=order.created_at,
        updated_at=order.updated_at,
        expires_at=order_expires_at(order),
        expires_in_seconds=expires_in,
        offer=OrderOfferDTO(
            id=first_offer.id,
            name=first_offer.name,
            price=first_offer.new_price,
            old_price=first_offer.old_price,
            new_price=first_offer.new_price,
            discount_reason=first_offer.discount_reason or "",
            type=first_offer.type,
            availability=first_offer.availability,
            image_path=first_offer.image_path,
            image_url=build_public_media_url(first_offer.image_path),
        ),
        partner=OrderPartnerDTO(
            id=partner.id,
            name=partner.name,
            address=partner.address,
            hours=partner.hours,
            map_url=partner.map_url,
        ),
        total=total,
        storeName=partner.name,
        address=partner.address,
        pickup=first_offer.pickup_time or partner.hours,
        expiresIn=expires_in,
        items=items,
    )
