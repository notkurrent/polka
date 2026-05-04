from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models import OfferType, PartnerStatus


class PartnerPublicDTO(BaseModel):
    id: int
    name: str
    address: str
    hours: str
    category: str = ""
    description: str = ""
    logo_path: str | None = None
    logo_url: str | None = None
    map_url: str | None = None
    lat: float | None = None
    lon: float | None = None


class PartnerProfileDTO(PartnerPublicDTO):
    status: PartnerStatus
    review_note: str | None = None
    reviewed_at: datetime | None = None


class AdminPartnerDTO(PartnerProfileDTO):
    user_id: int
    created_at: datetime
    reviewed_by_user_id: int | None = None


class OfferPublicDTO(BaseModel):
    id: int
    partner_id: int
    type: OfferType
    name: str
    description: str
    pickup_time: str
    old_price: Decimal
    new_price: Decimal
    discount_reason: str = ""
    stock: int
    image_path: str | None = None
    image_url: str | None = None
    created_at: datetime


class OfferWithPartnerDTO(BaseModel):
    offer: OfferPublicDTO
    partner: PartnerPublicDTO
    partner_name: str
    distance: float | None = None


class PartnerDetailDTO(BaseModel):
    partner: PartnerPublicDTO
    offers: list[OfferPublicDTO] = Field(default_factory=list)


class OrderOfferDTO(BaseModel):
    id: int
    name: str
    old_price: Decimal
    new_price: Decimal
    discount_reason: str = ""
    type: OfferType


class OrderPartnerDTO(BaseModel):
    id: int
    name: str
    address: str
    hours: str
    map_url: str | None = None


class OrderItemDTO(BaseModel):
    id: str
    title: str
    price: Decimal


class OrderDetailDTO(BaseModel):
    id: int
    status: str
    code: str
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    expires_in_seconds: int
    offer: OrderOfferDTO
    partner: OrderPartnerDTO
    total: Decimal

    # Compatibility fields for the current Next screens while they migrate to
    # the nested DTO above.
    storeName: str
    address: str
    pickup: str
    expiresIn: int
    items: list[OrderItemDTO]
