import asyncio
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.models import Offer, OfferType, Order, OrderItem, OrderStatus, Partner, PartnerStatus, User, UserRole
from app.utils.auth import hash_password


BUYER_PHONE = "+77001234567"
PARTNER_PHONE = "+77007654321"
DEV_PASSWORD = "password123"
DEMO_ORDER_CODE = "4821"

ALMATY_LON = 76.889709
ALMATY_LAT = 43.238949


async def upsert_user(
    session: AsyncSession,
    *,
    phone: str,
    name: str,
    role: UserRole,
    password: str,
) -> User:
    password_hash = hash_password(password)
    result = await session.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            phone=phone,
            name=name,
            role=role,
            password_hash=password_hash,
            is_tma=False,
        )
        session.add(user)
        await session.flush()
        return user

    user.name = name
    user.role = role
    user.password_hash = password_hash
    user.is_tma = False
    session.add(user)
    await session.flush()
    return user


async def upsert_partner(session: AsyncSession, user: User) -> Partner:
    result = await session.execute(select(Partner).where(Partner.user_id == user.id))
    partner = result.scalar_one_or_none()

    if partner is None:
        partner = Partner(
            user_id=user.id,
            name="Polka Bakery",
            address="проспект Достык, 52, Алматы",
            hours="08:00-21:00",
            description="Свежая выпечка и готовые позиции рядом с центром Алматы.",
            category="bakery",
            status=PartnerStatus.APPROVED,
        )
        session.add(partner)
        await session.flush()
    else:
        partner.name = "Polka Bakery"
        partner.address = "проспект Достык, 52, Алматы"
        partner.hours = "08:00-21:00"
        partner.description = "Свежая выпечка и готовые позиции рядом с центром Алматы."
        partner.category = "bakery"
        partner.status = PartnerStatus.APPROVED
        session.add(partner)
        await session.flush()

    await session.execute(
        text(
            """
            UPDATE partner
            SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
            WHERE id = :partner_id
            """
        ),
        {"lon": ALMATY_LON, "lat": ALMATY_LAT, "partner_id": partner.id},
    )
    await session.refresh(partner)
    return partner


async def upsert_offer(
    session: AsyncSession,
    *,
    partner: Partner,
    offer_type: OfferType,
    name: str,
    old_price: str,
    new_price: str,
    stock: int,
) -> Offer:
    result = await session.execute(
        select(Offer).where(Offer.partner_id == partner.id, Offer.name == name)
    )
    offer = result.scalar_one_or_none()

    if offer is None:
        offer = Offer(
            partner_id=partner.id,
            type=offer_type,
            name=name,
            old_price=Decimal(old_price),
            new_price=Decimal(new_price),
            stock=stock,
        )
        session.add(offer)
        await session.flush()
        return offer

    offer.type = offer_type
    offer.old_price = Decimal(old_price)
    offer.new_price = Decimal(new_price)
    offer.stock = stock
    session.add(offer)
    await session.flush()
    return offer


async def upsert_demo_order(
    session: AsyncSession,
    *,
    buyer: User,
    offer: Offer,
) -> Order:
    result = await session.execute(
        select(Order)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .where(
            Order.user_id == buyer.id,
            OrderItem.offer_id == offer.id,
            Order.code == DEMO_ORDER_CODE,
        )
    )
    order = result.scalar_one_or_none()

    if order is None:
        order = Order(
            user_id=buyer.id,
            status=OrderStatus.RESERVED,
            code=DEMO_ORDER_CODE,
        )
        session.add(order)
        await session.flush()
        session.add(
            OrderItem(
                order_id=order.id,
                offer_id=offer.id,
                quantity=1,
                unit_price=offer.new_price,
                total_price=offer.new_price,
            )
        )
        await session.flush()
        return order

    if order.status in {OrderStatus.PENDING, OrderStatus.RESERVED}:
        order.status = OrderStatus.RESERVED
    session.add(order)
    await session.flush()
    return order


async def expire_other_active_partner_orders(
    session: AsyncSession,
    *,
    partner: Partner,
    keep_order: Order,
) -> None:
    result = await session.execute(
        select(Order)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(Offer, OrderItem.offer_id == Offer.id)
        .where(
            Offer.partner_id == partner.id,
            Order.id != keep_order.id,
            Order.status.in_([OrderStatus.PENDING, OrderStatus.RESERVED]),
        )
    )
    for order in result.scalars().all():
        order.status = OrderStatus.EXPIRED
        session.add(order)


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        buyer = await upsert_user(
            session,
            phone=BUYER_PHONE,
            name="Асель Покупатель",
            role=UserRole.BUYER,
            password=DEV_PASSWORD,
        )
        partner_user = await upsert_user(
            session,
            phone=PARTNER_PHONE,
            name="Данияр Партнер",
            role=UserRole.PARTNER,
            password=DEV_PASSWORD,
        )
        partner = await upsert_partner(session, partner_user)

        offers = [
            await upsert_offer(
                session,
                partner=partner,
                offer_type=OfferType.MAGIC_BOX,
                name="Утренний magic box",
                old_price="4200.00",
                new_price="1600.00",
                stock=6,
            ),
            await upsert_offer(
                session,
                partner=partner,
                offer_type=OfferType.SPECIFIC,
                name="Круассаны ассорти",
                old_price="3600.00",
                new_price="1400.00",
                stock=8,
            ),
            await upsert_offer(
                session,
                partner=partner,
                offer_type=OfferType.MAGIC_BOX,
                name="Обеденная позиция",
                old_price="5200.00",
                new_price="2100.00",
                stock=5,
            ),
            await upsert_offer(
                session,
                partner=partner,
                offer_type=OfferType.SPECIFIC,
                name="Десерты к вечеру",
                old_price="4800.00",
                new_price="1900.00",
                stock=4,
            ),
        ]

        demo_order = await upsert_demo_order(session, buyer=buyer, offer=offers[0])
        await expire_other_active_partner_orders(session, partner=partner, keep_order=demo_order)
        await session.commit()

        print("Seed complete.")
        print(f"Buyer:   {BUYER_PHONE} / {DEV_PASSWORD} / user_id={buyer.id}")
        print(f"Partner: {PARTNER_PHONE} / {DEV_PASSWORD} / user_id={partner_user.id}")
        print(
            f"Partner profile: id={partner.id}, location=({ALMATY_LAT}, {ALMATY_LON})"
        )
        print(f"Offers:  {', '.join(str(offer.id) for offer in offers)}")
        print(f"Demo order: id={demo_order.id}, code={DEMO_ORDER_CODE}")


if __name__ == "__main__":
    asyncio.run(seed())
