from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging
import random

from app.database import get_session
from app.models import Order, OrderStatus, Offer, Partner, PartnerStatus, Rating, User
from app.dependencies import get_current_user
from app.schemas import OrderDetailDTO
from app.serializers import build_order_detail_dto
from app.order_lifecycle import ACTIVE_ORDER_STATUSES, normalize_order_status
from pydantic import BaseModel, Field as PydanticField

router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger(__name__)

class CreateOrderRequest(BaseModel):
    offer_id: int


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
    result = await session.execute(
        select(Order, Offer, Partner)
        .join(Offer, Order.offer_id == Offer.id)
        .join(Partner, Offer.partner_id == Partner.id)
        .where(Order.id == order_id)
    )
    return result.one_or_none()


@router.post("", response_model=OrderDetailDTO, include_in_schema=False)
@router.post("/", response_model=OrderDetailDTO)
async def create_order(
    req: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    try:
        query = (
            select(Offer)
            .join(Partner, Offer.partner_id == Partner.id)
            .where(Offer.id == req.offer_id, Partner.status == PartnerStatus.APPROVED)
            .with_for_update()
        )
        result = await session.execute(query)
        offer = result.scalar_one_or_none()

        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")

        if offer.stock <= 0:
            raise HTTPException(status_code=400, detail="Out of stock")

        offer.stock -= 1

        new_order = Order(
            user_id=current_user.id,
            offer_id=offer.id,
            status=OrderStatus.RESERVED,
            code=str(random.randint(1000, 9999))
        )

        session.add(new_order)
        await session.commit()
        await session.refresh(new_order)
        await session.refresh(offer)
        logger.info(
            "order.created order_id=%s user_id=%s offer_id=%s status=%s",
            new_order.id,
            current_user.id,
            offer.id,
            new_order.status.value,
        )

        partner = await session.get(Partner, offer.partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")

        return build_order_detail_dto(new_order, offer, partner)
    except HTTPException:
        # Must rollback incase of errors within logic
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=list[OrderDetailDTO], include_in_schema=False)
@router.get("/", response_model=list[OrderDetailDTO])
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = (
        select(Order, Offer, Partner)
        .join(Offer, Order.offer_id == Offer.id)
        .join(Partner, Offer.partner_id == Partner.id)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    result = await session.execute(query)
    return [
        build_order_detail_dto(order, offer, partner)
        for order, offer, partner in result.all()
    ]


@router.get("/{order_id}", response_model=OrderDetailDTO)
async def get_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    row = await get_order_detail_row(session, order_id)

    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    order, offer, partner = row
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return build_order_detail_dto(order, offer, partner)


@router.patch("/{order_id}", response_model=OrderDetailDTO)
async def update_my_order_status(
    order_id: int,
    req: UpdateOrderStatus,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    try:
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

        offer_result = await session.execute(
            select(Offer).where(Offer.id == order.offer_id).with_for_update()
        )
        offer = offer_result.scalar_one_or_none()
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        offer.stock += 1
        session.add(offer)

        order.status = next_status
        session.add(order)
        await session.commit()
        await session.refresh(order)
        await session.refresh(offer)
        logger.info(
            "order.status_changed order_id=%s user_id=%s status=%s actor=buyer",
            order.id,
            current_user.id,
            order.status.value,
        )

        partner = await session.get(Partner, offer.partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        return build_order_detail_dto(order, offer, partner)
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/rating", response_model=Rating)
async def create_order_rating(
    order_id: int,
    req: CreateRating,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
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

    offer_result = await session.execute(select(Offer).where(Offer.id == order.offer_id))
    offer = offer_result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    rating = Rating(
        order_id=order.id,
        user_id=current_user.id,
        partner_id=offer.partner_id,
        score=req.score,
        tags=json.dumps(req.tags, ensure_ascii=False),
        comment=req.comment,
    )
    session.add(rating)
    await session.commit()
    await session.refresh(rating)
    return rating
