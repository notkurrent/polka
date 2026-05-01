import enum
import sqlalchemy as sa
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import Column, DateTime
from sqlmodel import SQLModel, Field, Enum
from geoalchemy2 import Geometry

class UserRole(str, enum.Enum):
    BUYER = "BUYER"
    PARTNER = "PARTNER"

class PartnerStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class OfferType(str, enum.Enum):
    MAGIC_BOX = "MAGIC_BOX"
    SPECIFIC = "SPECIFIC"

class OrderStatus(str, enum.Enum):
    PENDING = "Pending"
    RESERVED = "Reserved"
    COMPLETED = "Completed"
    EXPIRED = "Expired"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tg_id: Optional[str] = Field(default=None, unique=True, index=True)
    email: Optional[str] = Field(default=None, unique=True, index=True)
    phone: Optional[str] = Field(default=None, unique=True, index=True)
    password_hash: Optional[str] = Field(default=None, max_length=255)
    name: str
    role: UserRole = Field(sa_column=Column(Enum(UserRole)))
    is_tma: bool = Field(default=False)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            onupdate=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )

class Partner(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str
    address: str
    hours: str
    description: str = Field(default="")
    category: str = Field(default="")
    status: PartnerStatus = Field(
        default=PartnerStatus.PENDING,
        sa_column=Column(Enum(PartnerStatus), nullable=False),
    )
    review_note: Optional[str] = Field(default=None)
    reviewed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    reviewed_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    location: Optional[str] = Field(
        sa_column=Column(Geometry("POINT", srid=4326, spatial_index=False)),
        default=None
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            onupdate=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )

class Offer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    partner_id: int = Field(foreign_key="partner.id")
    type: OfferType = Field(sa_column=Column(Enum(OfferType)))
    name: str
    description: str = Field(default="")
    pickup_time: str = Field(default="")
    old_price: Decimal = Field(sa_column=Column(sa.Numeric(10, 2)), default=Decimal("0"))
    new_price: Decimal = Field(sa_column=Column(sa.Numeric(10, 2)), default=Decimal("0"))
    stock: int = Field(default=0)
    is_archived: bool = Field(default=False)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            onupdate=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    offer_id: int = Field(foreign_key="offer.id")
    status: OrderStatus = Field(sa_column=Column(Enum(OrderStatus)))
    code: str = Field(default="", max_length=4)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            onupdate=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )


class Rating(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", unique=True)
    user_id: int = Field(foreign_key="user.id")
    partner_id: int = Field(foreign_key="partner.id")
    score: int = Field(ge=1, le=5)
    tags: str = Field(default="")
    comment: str = Field(default="")
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False
        )
    )
