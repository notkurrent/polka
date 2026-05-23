from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging
import random

from app.database import get_session
from app.models import Order, OrderItem, OrderStatus, Offer, OfferAvailability, Partner, PartnerStatus, Rating, User
from app.dependencies import get_current_user
from app.schemas import OrderDetailDTO
from app.serializers import build_order_detail_dto
from app.order_lifecycle import ACTIVE_ORDER_STATUSES, expire_stale_orders, normalize_order_status, restore_order_stock
from pydantic import BaseModel, Field as PydanticField

# Legacy reservation endpoints are kept for existing historical orders and
# stock-restoration tests. The marketplace-light frontend no longer calls them.
router = APIRouter(prefix="/orders", tags=["legacy-orders"], include_in_schema=False)
logger = logging.getLogger(__name__)


class CreateOrderItemRequest(BaseModel):
    offer_id: int
    quantity: int = PydanticField(default=1, ge=1)


class CreateOrderRequest(BaseModel):
    offer_id: int | None = None
    items: list[CreateOrderItemRequest] = PydanticField(default_factory=list)


class UpdateOrderStatus(BaseModel):
    status: str


class CreateRating(BaseModel):
    score: int = PydanticField(ge=1, le=5)
    tags: list[str] = PydanticField(default_factory=list)
    comment: str = ""


async def get_order_detail_row(
    session: AsyncSession,
    order_id: int,
):
    order = await session.get(Order, order_id)
    if not order:
        return None

    result = await session.execute(
        select(OrderItem, Offer, Partner)
        .join(Offer, OrderItem.offer_id == Offer.id)
        .join(Partner, Offer.partner_id == Partner.id)
        .where(OrderItem.order_id == order_id)
        .order_by(OrderItem.id)
    )
    rows = result.all()
    if not rows:
        return None

    partner = rows[0][2]
    return order, [(item, offer) for item, offer, _partner in rows], partner


def order_item_quantities(req: CreateOrderRequest) -> dict[int, int]:
    requested_items = req.items
    if not requested_items and req.offer_id is not None:
        requested_items = [CreateOrderItemRequest(offer_id=req.offer_id, quantity=1)]

    quantities: dict[int, int] = {}
    for item in requested_items:
        quantities[item.offer_id] = quantities.get(item.offer_id, 0) + item.quantity
    return quantities


@router.post("", response_model=OrderDetailDTO, include_in_schema=False)
@router.post("/", response_model=OrderDetailDTO, include_in_schema=False)
async def create_order(
    req: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    try:
        await expire_stale_orders(session)
        quantities = order_item_quantities(req)
        if not quantities:
            raise HTTPException(status_code=400, detail="Order items required")

        result = await session.execute(
            select(Offer, Partner)
            .join(Partner, Offer.partner_id == Partner.id)
            .where(
                Offer.id.in_(quantities.keys()),
                Offer.is_archived.is_(False),
                Partner.status == PartnerStatus.APPROVED,
            )
            .with_for_update()
        )
        rows = result.all()

        if len(rows) != len(quantities):
            raise HTTPException(status_code=404, detail="Offer not found")

        partner_ids = {partner.id for _offer, partner in rows}
        if len(partner_ids) != 1:
            raise HTTPException(status_code=400, detail="Order items must belong to one partner")

        offers_by_id = {offer.id: offer for offer, _partner in rows}
        for offer_id, quantity in quantities.items():
            offer = offers_by_id[offer_id]
            if offer.availability != OfferAvailability.IN_STOCK:
                raise HTTPException(status_code=400, detail="Out of stock")
            if offer.stock < quantity:
                raise HTTPException(status_code=400, detail="Out of stock")
            offer.stock -= quantity
            session.add(offer)

        new_order = Order(
            user_id=current_user.id,
            status=OrderStatus.RESERVED,
            code=str(random.randint(1000, 9999))
        )

        session.add(new_order)
        await session.flush()
        for offer_id, quantity in quantities.items():
            offer = offers_by_id[offer_id]
            session.add(
                OrderItem(
                    order_id=new_order.id,
                    offer_id=offer.id,
                    quantity=quantity,
                    unit_price=offer.new_price,
                    total_price=offer.new_price * quantity,
                )
            )

        await session.commit()
        logger.info(
            "order.created order_id=%s user_id=%s items=%s status=%s",
            new_order.id,
            current_user.id,
            len(quantities),
            new_order.status.value,
        )

        row = await get_order_detail_row(session, new_order.id)
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        order, item_rows, partner = row
        return build_order_detail_dto(order, item_rows, partner)
    except HTTPException:
        # Must rollback incase of errors within logic
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=list[OrderDetailDTO], include_in_schema=False)
@router.get("/", response_model=list[OrderDetailDTO], include_in_schema=False)
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await expire_stale_orders(session)
    query = select(Order).where(Order.user_id == current_user.id).order_by(Order.created_at.desc())
    result = await session.execute(query)
    details = []
    for order in result.scalars().all():
        row = await get_order_detail_row(session, order.id)
        if row:
            detail_order, item_rows, partner = row
            details.append(build_order_detail_dto(detail_order, item_rows, partner))
    return details


@router.get("/{order_id}", response_model=OrderDetailDTO, include_in_schema=False)
async def get_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await expire_stale_orders(session)
    row = await get_order_detail_row(session, order_id)

    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    order, item_rows, partner = row
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return build_order_detail_dto(order, item_rows, partner)


@router.patch("/{order_id}", response_model=OrderDetailDTO, include_in_schema=False)
async def update_my_order_status(
    order_id: int,
    req: UpdateOrderStatus,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    try:
        await expire_stale_orders(session)
        result = await session.execute(
            select(Order).where(Order.id == order_id).with_for_update()
        )
        order = result.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

        if order.status not in ACTIVE_ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="Order status can not be changed")

        next_status = normalize_order_status(req.status)
        if next_status == OrderStatus.COMPLETED:
            raise HTTPException(status_code=403, detail="Order completion is only available to partners")
        if next_status != OrderStatus.EXPIRED:
            raise HTTPException(status_code=400, detail="Invalid status transition")

        await restore_order_stock(session, order.id)
        order.status = next_status
        session.add(order)
        await session.commit()
        logger.info(
            "order.status_changed order_id=%s user_id=%s status=%s actor=buyer",
            order.id,
            current_user.id,
            order.status.value,
        )

        row = await get_order_detail_row(session, order.id)
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        detail_order, item_rows, partner = row
        return build_order_detail_dto(detail_order, item_rows, partner)
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/rating", response_model=Rating, include_in_schema=False)
async def create_order_rating(
    order_id: int,
    req: CreateRating,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await expire_stale_orders(session)
    result = await session.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Order must be completed")

    existing_rating_result = await session.execute(
        select(Rating).where(Rating.order_id == order_id)
    )
    if existing_rating_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Rating already exists")

    item_result = await session.execute(
        select(OrderItem, Offer).join(Offer, OrderItem.offer_id == Offer.id).where(OrderItem.order_id == order.id)
    )
    item_row = item_result.first()
    if not item_row:
        raise HTTPException(status_code=404, detail="Order item not found")

    rating = Rating(
        order_id=order.id,
        user_id=current_user.id,
        partner_id=item_row[1].partner_id,
        score=req.score,
        tags=json.dumps(req.tags, ensure_ascii=False),
        comment=req.comment,
    )
    session.add(rating)
    await session.commit()
    await session.refresh(rating)
    return rating
