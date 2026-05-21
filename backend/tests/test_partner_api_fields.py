from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.main import app
from app.models import Offer, Order, OrderItem, Partner, PartnerStatus, Rating, User


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


async def approve_partner(partner_id: int) -> None:
    async with AsyncSessionLocal() as session:
        partner = await session.get(Partner, partner_id)
        assert partner is not None
        partner.status = PartnerStatus.APPROVED
        session.add(partner)
        await session.commit()


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
async def test_partner_map_url_and_offer_discount_reason_api() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7761{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(
                client,
                partner_phone,
                f"API Fields Partner {run_id}",
            )
            register_response = await client.post(
                "/partner-api/register",
                headers=auth_headers(partner_token),
                json={
                    "name": f"API Fields Bakery {run_id}",
                    "type": "bakery",
                    "address": "проспект Достык, 52, Алматы",
                    "description": "API fields test partner",
                    "hours": "09:00-21:00",
                    "map_url": "https://2gis.kz/almaty/geo/70000001000000000",
                    "lat": ALMATY_LAT,
                    "lon": ALMATY_LON,
                },
            )
            assert register_response.status_code == 200, register_response.text
            partner = register_response.json()
            assert partner["map_url"] == "https://2gis.kz/almaty/geo/70000001000000000"

            profile_response = await client.patch(
                "/partner-api/profile",
                headers=auth_headers(partner_token),
                json={"map_url": "https://go.2gis.com/example"},
            )
            assert profile_response.status_code == 200, profile_response.text
            assert profile_response.json()["map_url"] == "https://go.2gis.com/example"

            await approve_partner(partner["id"])
            offer_response = await client.post(
                "/partner-api/offers",
                headers=auth_headers(partner_token),
                json={
                    "name": f"API Fields Offer {run_id}",
                    "price": str(Decimal("1600.00")),
                    "category": "bakery",
                    "tags": "bread,local",
                    "discount_reason": "End of day surplus",
                    "stock": 2,
                },
            )
            assert offer_response.status_code == 200, offer_response.text
            assert offer_response.json()["type"] == "SPECIFIC"
            assert offer_response.json()["availability"] == "IN_STOCK"
            assert offer_response.json()["price"] == "1600.00"
            assert offer_response.json()["old_price"] is None
            assert offer_response.json()["new_price"] == "1600.00"
            assert offer_response.json()["category"] == "bakery"
            assert offer_response.json()["tags"] == "bread,local"
            assert offer_response.json()["discount_reason"] == "End of day surplus"
        finally:
            await cleanup_test_data(phone_prefix)


@pytest.mark.asyncio
async def test_offer_create_and_update_accept_product_price_without_required_discount() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7762{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(
                client,
                partner_phone,
                f"Discount Rule Partner {run_id}",
            )
            register_response = await client.post(
                "/partner-api/register",
                headers=auth_headers(partner_token),
                json={
                    "name": f"Discount Rule Bakery {run_id}",
                    "type": "bakery",
                    "address": "проспект Достык, 52, Алматы",
                    "description": "Discount rule test partner",
                    "hours": "09:00-21:00",
                    "lat": ALMATY_LAT,
                    "lon": ALMATY_LON,
                },
            )
            assert register_response.status_code == 200, register_response.text
            partner = register_response.json()
            await approve_partner(partner["id"])

            offer_response = await client.post(
                "/partner-api/offers",
                headers=auth_headers(partner_token),
                json={
                    "name": f"Product Price Offer {run_id}",
                    "old_price": str(Decimal("1000.00")),
                    "price": str(Decimal("950.00")),
                    "stock": 1,
                },
            )
            assert offer_response.status_code == 200, offer_response.text
            offer = offer_response.json()
            assert offer["price"] == "950.00"
            assert offer["new_price"] == "950.00"
            assert offer["old_price"] == "1000.00"
            assert offer["type"] == "SPECIFIC"
            assert offer["availability"] == "IN_STOCK"

            valid_update = await client.patch(
                f"/partner-api/offers/{offer['id']}",
                headers=auth_headers(partner_token),
                json={"price": str(Decimal("980.00")), "old_price": None, "discount_reason": "Limited batch"},
            )
            assert valid_update.status_code == 200, valid_update.text
            assert valid_update.json()["price"] == "980.00"
            assert valid_update.json()["new_price"] == "980.00"
            assert valid_update.json()["old_price"] is None
            assert valid_update.json()["discount_reason"] == "Limited batch"

            hidden_update = await client.patch(
                f"/partner-api/offers/{offer['id']}",
                headers=auth_headers(partner_token),
                json={"availability": "HIDDEN"},
            )
            assert hidden_update.status_code == 200, hidden_update.text
            assert hidden_update.json()["availability"] == "HIDDEN"

            public_offers = await client.get("/offers/")
            assert public_offers.status_code == 200, public_offers.text
            assert all(item["id"] != offer["id"] for item in public_offers.json())
        finally:
            await cleanup_test_data(phone_prefix)
