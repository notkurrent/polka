from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.main import app
from app.models import (
    Offer,
    Order,
    OrderItem,
    Partner,
    PartnerStatus,
    Rating,
    SubscriptionPlan,
    SubscriptionStatus,
    User,
)


ALMATY_LAT = 43.238949
ALMATY_LON = 76.889709
TEST_PASSWORD = "password123"


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def web_register(client: AsyncClient, phone: str, name: str) -> tuple[str, dict]:
    response = await client.post(
        "/auth/web/register",
        json={"phone": phone, "name": name, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    return payload["access_token"], payload["user"]


async def make_admin(user_id: int) -> None:
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        assert user is not None
        user.is_admin = True
        session.add(user)
        await session.commit()


async def register_partner(client: AsyncClient, token: str, name: str) -> dict:
    response = await client.post(
        "/partner-api/register",
        headers=auth_headers(token),
        json={
            "name": name,
            "type": "bakery",
            "address": "проспект Достык, 52, Алматы",
            "description": "Subscription test partner",
            "hours": "09:00-21:00",
            "lat": ALMATY_LAT,
            "lon": ALMATY_LON,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


async def approve_partner(partner_id: int) -> None:
    async with AsyncSessionLocal() as session:
        partner = await session.get(Partner, partner_id)
        assert partner is not None
        partner.status = PartnerStatus.APPROVED
        session.add(partner)
        await session.commit()


async def create_offer(client: AsyncClient, token: str, name: str, availability: str = "IN_STOCK"):
    return await client.post(
        "/partner-api/offers",
        headers=auth_headers(token),
        json={
            "type": "SPECIFIC",
            "availability": availability,
            "name": name,
            "old_price": str(Decimal("2500.00")),
            "new_price": str(Decimal("1500.00")),
            "stock": 2,
        },
    )


async def cleanup_test_data(phone_prefix: str) -> None:
    async with AsyncSessionLocal() as session:
        user_ids = (
            await session.execute(select(User.id).where(User.phone.like(f"{phone_prefix}%")))
        ).scalars().all()
        if not user_ids:
            return

        partner_ids = (
            await session.execute(select(Partner.id).where(Partner.user_id.in_(user_ids)))
        ).scalars().all()
        offer_ids = []
        order_ids = []
        if partner_ids:
            offer_ids = (
                await session.execute(select(Offer.id).where(Offer.partner_id.in_(partner_ids)))
            ).scalars().all()
        if offer_ids:
            order_ids = (
                await session.execute(select(OrderItem.order_id).where(OrderItem.offer_id.in_(offer_ids)))
            ).scalars().all()

        if order_ids:
            await session.execute(delete(Rating).where(Rating.order_id.in_(order_ids)))
            await session.execute(delete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
            await session.execute(delete(Order).where(Order.id.in_(order_ids)))
        if offer_ids:
            await session.execute(delete(Offer).where(Offer.id.in_(offer_ids)))
        if partner_ids:
            await session.execute(delete(Partner).where(Partner.id.in_(partner_ids)))
        await session.execute(delete(User).where(User.id.in_(user_ids)))
        await session.commit()


@pytest.mark.asyncio
async def test_free_subscription_limits_active_offers_until_admin_activates() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7796{run_id}"
    partner_phone = f"{phone_prefix}01"
    admin_phone = f"{phone_prefix}02"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(
                client,
                partner_phone,
                f"Subscription Partner {run_id}",
            )
            admin_token, admin_user = await web_register(
                client,
                admin_phone,
                f"Subscription Admin {run_id}",
            )
            await make_admin(admin_user["id"])

            partner = await register_partner(client, partner_token, f"Subscription Bakery {run_id}")
            assert partner["plan"] == SubscriptionPlan.FREE.value
            assert partner["subscription_status"] == SubscriptionStatus.FREE.value
            await approve_partner(partner["id"])

            for index in range(5):
                response = await create_offer(client, partner_token, f"Free active offer {index} {run_id}")
                assert response.status_code == 200, response.text

            limit_response = await create_offer(client, partner_token, f"Free blocked offer {run_id}")
            assert limit_response.status_code == 403
            assert "FREE plan allows up to 5 active offers" in limit_response.text

            hidden_response = await create_offer(
                client,
                partner_token,
                f"Free hidden offer {run_id}",
                availability="HIDDEN",
            )
            assert hidden_response.status_code == 200, hidden_response.text
            hidden_offer = hidden_response.json()

            activate_hidden_response = await client.patch(
                f"/partner-api/offers/{hidden_offer['id']}",
                headers=auth_headers(partner_token),
                json={"availability": "IN_STOCK"},
            )
            assert activate_hidden_response.status_code == 403

            subscription_response = await client.patch(
                f"/admin/partners/{partner['id']}/subscription",
                headers=auth_headers(admin_token),
                json={
                    "plan": SubscriptionPlan.PRO.value,
                    "subscription_status": SubscriptionStatus.ACTIVE.value,
                    "subscription_expires_at": None,
                },
            )
            assert subscription_response.status_code == 200, subscription_response.text
            subscription_payload = subscription_response.json()
            assert subscription_payload["plan"] == SubscriptionPlan.PRO.value
            assert subscription_payload["subscription_status"] == SubscriptionStatus.ACTIVE.value

            activated_response = await client.patch(
                f"/partner-api/offers/{hidden_offer['id']}",
                headers=auth_headers(partner_token),
                json={"availability": "IN_STOCK"},
            )
            assert activated_response.status_code == 200, activated_response.text
        finally:
            await cleanup_test_data(phone_prefix)
