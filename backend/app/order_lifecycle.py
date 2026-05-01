import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import Offer, Order, OrderStatus


ACTIVE_ORDER_STATUSES = {OrderStatus.PENDING, OrderStatus.RESERVED}
RESERVATION_TTL_MINUTES = int(os.getenv("ORDER_RESERVATION_TTL_MINUTES", "30"))
logger = logging.getLogger(__name__)


def normalize_order_status(value: str) -> OrderStatus:
    normalized = value.strip().upper()
    for status in OrderStatus:
        if normalized in {status.name, status.value.upper()}:
            return status
    raise HTTPException(status_code=400, detail="Invalid order status")


def order_expires_at(order: Order) -> datetime:
    created_at = order.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at + timedelta(minutes=RESERVATION_TTL_MINUTES)


def is_order_expired(order: Order, *, now: datetime | None = None) -> bool:
    current_time = now or datetime.now(timezone.utc)
    return order.status in ACTIVE_ORDER_STATUSES and order_expires_at(order) <= current_time


async def expire_stale_orders(session: AsyncSession) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=RESERVATION_TTL_MINUTES)
    result = await session.execute(
        select(Order)
        .where(Order.status.in_(ACTIVE_ORDER_STATUSES), Order.created_at <= cutoff)
        .with_for_update()
    )
    stale_orders = result.scalars().all()
    if not stale_orders:
        return 0

    for order in stale_orders:
        offer_result = await session.execute(
            select(Offer).where(Offer.id == order.offer_id).with_for_update()
        )
        offer = offer_result.scalar_one_or_none()
        if offer is not None:
            offer.stock += 1
            session.add(offer)
        order.status = OrderStatus.EXPIRED
        session.add(order)

    await session.commit()
    logger.info("order.expired_stale count=%s", len(stale_orders))
    return len(stale_orders)
