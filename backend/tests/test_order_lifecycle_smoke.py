from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.main import app
from app.models import Offer, OfferType, Order, Partner, PartnerStatus, Rating, User


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
    assert payload["access_token"]
    assert payload["user"]["has_password"] is True
    return payload["access_token"], payload["user"]


async def approve_partner(partner_id: int) -> None:
    async with AsyncSessionLocal() as session:
        partner = await session.get(Partner, partner_id)
        assert partner is not None
        partner.status = PartnerStatus.APPROVED
        session.add(partner)
        await session.commit()


async def register_partner(
    client: AsyncClient,
    token: str,
    name: str,
    *,
    approve: bool = True,
) -> dict:
    response = await client.post(
        "/partner-api/register",
        headers=auth_headers(token),
        json={
            "name": name,
            "type": "bakery",
            "address": "проспект Достык, 52, Алматы",
            "description": "Smoke test partner",
            "hours": "09:00-21:00",
            "lat": ALMATY_LAT,
            "lon": ALMATY_LON,
        },
    )
    assert response.status_code == 200, response.text
    partner = response.json()
    if approve:
        await approve_partner(partner["id"])
        partner["status"] = PartnerStatus.APPROVED.value
    return partner


async def create_offer(
    client: AsyncClient,
    token: str,
    *,
    name: str,
    stock: int,
) -> dict:
    response = await client.post(
        "/partner-api/offers",
        headers=auth_headers(token),
        json={
            "type": "MAGIC_BOX",
            "name": name,
            "old_price": str(Decimal("4200.00")),
            "new_price": str(Decimal("1600.00")),
            "stock": stock,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


async def cleanup_smoke_data(phone_prefix: str) -> None:
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
                await session.execute(select(Order.id).where(Order.offer_id.in_(offer_ids)))
            ).scalars().all()
        buyer_order_ids = (
            await session.execute(select(Order.id).where(Order.user_id.in_(user_ids)))
        ).scalars().all()
        order_ids = list({*order_ids, *buyer_order_ids})

        if order_ids:
            await session.execute(delete(Rating).where(Rating.order_id.in_(order_ids)))
            await session.execute(delete(Order).where(Order.id.in_(order_ids)))
        if offer_ids:
            await session.execute(delete(Offer).where(Offer.id.in_(offer_ids)))
        if partner_ids:
            await session.execute(delete(Partner).where(Partner.id.in_(partner_ids)))
        await session.execute(delete(User).where(User.id.in_(user_ids)))
        await session.commit()


@pytest.mark.asyncio
async def test_order_lifecycle_smoke() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7799{run_id}"
    buyer_phone = f"{phone_prefix}01"
    partner_phone = f"{phone_prefix}02"
    other_partner_phone = f"{phone_prefix}03"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            buyer_token, buyer = await web_register(client, buyer_phone, f"Smoke Buyer {run_id}")
            partner_token, _partner_user = await web_register(client, partner_phone, f"Smoke Partner {run_id}")
            other_partner_token, _other_partner_user = await web_register(
                client,
                other_partner_phone,
                f"Other Smoke Partner {run_id}",
            )

            me_response = await client.get("/users/me", headers=auth_headers(buyer_token))
            assert me_response.status_code == 200
            assert me_response.json()["id"] == buyer["id"]

            partner = await register_partner(client, partner_token, f"Smoke Bakery {run_id}")
            await register_partner(client, other_partner_token, f"Other Smoke Bakery {run_id}")

            offer = await create_offer(
                client,
                partner_token,
                name=f"Smoke Magic Box {run_id}",
                stock=2,
            )
            nearby_response = await client.get(
                "/offers/nearby",
                params={"lat": ALMATY_LAT, "lon": ALMATY_LON, "radius": 5000, "search": run_id},
            )
            assert nearby_response.status_code == 200
            assert any(item["offer"]["id"] == offer["id"] for item in nearby_response.json())

            order_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_token),
                json={"offer_id": offer["id"]},
            )
            assert order_response.status_code == 200, order_response.text
            order = order_response.json()
            assert order["status"] == "RESERVED"
            assert order["partner"]["id"] == partner["id"]
            assert len(order["code"]) == 4

            offer_after_order = await client.get(f"/offers/{offer['id']}")
            assert offer_after_order.status_code == 200
            assert offer_after_order.json()["offer"]["stock"] == 1

            buyer_complete_response = await client.patch(
                f"/orders/{order['id']}",
                headers=auth_headers(buyer_token),
                json={"status": "Completed"},
            )
            assert buyer_complete_response.status_code == 403

            partner_orders_response = await client.get(
                "/partner-api/orders",
                headers=auth_headers(partner_token),
            )
            assert partner_orders_response.status_code == 200
            assert any(item["id"] == order["id"] for item in partner_orders_response.json())

            wrong_partner_response = await client.post(
                "/partner-api/orders/verify-code",
                headers=auth_headers(other_partner_token),
                json={"order_id": order["id"], "code": order["code"]},
            )
            assert wrong_partner_response.status_code == 403

            verify_response = await client.post(
                "/partner-api/orders/verify-code",
                headers=auth_headers(partner_token),
                json={"order_id": order["id"], "code": order["code"]},
            )
            assert verify_response.status_code == 200, verify_response.text
            assert verify_response.json()["status"] == "COMPLETED"

            rating_response = await client.post(
                f"/orders/{order['id']}/rating",
                headers=auth_headers(buyer_token),
                json={"score": 5, "tags": ["fresh"], "comment": "Smoke ok"},
            )
            assert rating_response.status_code == 200, rating_response.text

            duplicate_rating_response = await client.post(
                f"/orders/{order['id']}/rating",
                headers=auth_headers(buyer_token),
                json={"score": 4, "tags": [], "comment": ""},
            )
            assert duplicate_rating_response.status_code == 400

            collision_offer = await create_offer(
                client,
                partner_token,
                name=f"Smoke Collision Box {run_id}",
                stock=1,
            )
            collision_order_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_token),
                json={"offer_id": collision_offer["id"]},
            )
            assert collision_order_response.status_code == 200
            collision_order = collision_order_response.json()
            async with AsyncSessionLocal() as session:
                db_collision_order = await session.get(Order, collision_order["id"])
                assert db_collision_order is not None
                db_collision_order.code = order["code"]
                session.add(db_collision_order)
                await session.commit()

            collision_verify_response = await client.post(
                "/partner-api/orders/verify-code",
                headers=auth_headers(partner_token),
                json={"code": order["code"]},
            )
            assert collision_verify_response.status_code == 200, collision_verify_response.text
            assert collision_verify_response.json()["id"] == collision_order["id"]
            assert collision_verify_response.json()["status"] == "COMPLETED"

            cancel_offer = await create_offer(
                client,
                partner_token,
                name=f"Smoke Cancel Box {run_id}",
                stock=1,
            )
            cancel_order_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_token),
                json={"offer_id": cancel_offer["id"]},
            )
            assert cancel_order_response.status_code == 200
            cancel_order = cancel_order_response.json()

            out_of_stock_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_token),
                json={"offer_id": cancel_offer["id"]},
            )
            assert out_of_stock_response.status_code == 400
            assert out_of_stock_response.json()["detail"] == "Out of stock"

            cancel_response = await client.patch(
                f"/orders/{cancel_order['id']}",
                headers=auth_headers(buyer_token),
                json={"status": "Expired"},
            )
            assert cancel_response.status_code == 200, cancel_response.text
            assert cancel_response.json()["status"] == "EXPIRED"

            cancel_offer_after = await client.get(f"/offers/{cancel_offer['id']}")
            assert cancel_offer_after.status_code == 200
            assert cancel_offer_after.json()["offer"]["stock"] == 1
        finally:
            await cleanup_smoke_data(phone_prefix)


@pytest.mark.asyncio
async def test_pending_partner_can_not_create_offer() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7798{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(client, partner_phone, f"Pending Partner {run_id}")
            partner = await register_partner(
                client,
                partner_token,
                f"Pending Bakery {run_id}",
                approve=False,
            )
            assert partner["status"] == PartnerStatus.PENDING.value

            response = await client.post(
                "/partner-api/offers",
                headers=auth_headers(partner_token),
                json={
                    "type": "MAGIC_BOX",
                    "name": f"Blocked Magic Box {run_id}",
                    "old_price": str(Decimal("4200.00")),
                    "new_price": str(Decimal("1600.00")),
                    "stock": 2,
                },
            )
            assert response.status_code == 403
        finally:
            await cleanup_smoke_data(phone_prefix)


@pytest.mark.asyncio
async def test_pending_partner_offer_is_hidden_from_buyer() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7797{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(client, partner_phone, f"Hidden Partner {run_id}")
            partner = await register_partner(
                client,
                partner_token,
                f"Hidden Bakery {run_id}",
                approve=False,
            )
            async with AsyncSessionLocal() as session:
                offer = Offer(
                    partner_id=partner["id"],
                    type=OfferType.MAGIC_BOX,
                    name=f"Hidden Magic Box {run_id}",
                    old_price=Decimal("4200.00"),
                    new_price=Decimal("1600.00"),
                    stock=2,
                )
                session.add(offer)
                await session.commit()
                await session.refresh(offer)
                offer_id = offer.id

            offers_response = await client.get("/offers/")
            assert offers_response.status_code == 200
            assert all(item["id"] != offer_id for item in offers_response.json())

            detail_response = await client.get(f"/offers/{offer_id}")
            assert detail_response.status_code == 404

            partner_response = await client.get(f"/partners/{partner['id']}")
            assert partner_response.status_code == 404

            nearby_response = await client.get(
                "/offers/nearby",
                params={"lat": ALMATY_LAT, "lon": ALMATY_LON, "radius": 5000, "search": run_id},
            )
            assert nearby_response.status_code == 200
            assert all(item["offer"]["id"] != offer_id for item in nearby_response.json())
        finally:
            await cleanup_smoke_data(phone_prefix)


@pytest.mark.asyncio
async def test_approved_partner_can_create_offer() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7796{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(client, partner_phone, f"Approved Partner {run_id}")
            await register_partner(client, partner_token, f"Approved Bakery {run_id}", approve=True)

            offer = await create_offer(
                client,
                partner_token,
                name=f"Approved Magic Box {run_id}",
                stock=2,
            )
            assert offer["id"]
        finally:
            await cleanup_smoke_data(phone_prefix)


@pytest.mark.asyncio
async def test_partner_can_delete_offer_without_orders() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7794{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(client, partner_phone, f"Delete Partner {run_id}")
            await register_partner(client, partner_token, f"Delete Bakery {run_id}", approve=True)
            offer = await create_offer(
                client,
                partner_token,
                name=f"Delete Magic Box {run_id}",
                stock=2,
            )

            delete_response = await client.delete(
                f"/partner-api/offers/{offer['id']}",
                headers=auth_headers(partner_token),
            )
            assert delete_response.status_code == 200, delete_response.text
            assert delete_response.json()["status"] == "deleted"

            partner_offers_response = await client.get(
                "/partner-api/offers",
                headers=auth_headers(partner_token),
            )
            assert partner_offers_response.status_code == 200
            assert all(item["id"] != offer["id"] for item in partner_offers_response.json())
        finally:
            await cleanup_smoke_data(phone_prefix)


@pytest.mark.asyncio
async def test_partner_delete_offer_with_orders_archives_once_orders_exist() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7793{run_id}"
    buyer_one_phone = f"{phone_prefix}01"
    buyer_two_phone = f"{phone_prefix}02"
    partner_phone = f"{phone_prefix}03"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            buyer_one_token, _buyer_one = await web_register(client, buyer_one_phone, f"Archive Buyer One {run_id}")
            buyer_two_token, _buyer_two = await web_register(client, buyer_two_phone, f"Archive Buyer Two {run_id}")
            partner_token, _partner_user = await web_register(client, partner_phone, f"Archive Partner {run_id}")
            await register_partner(client, partner_token, f"Archive Bakery {run_id}", approve=True)
            offer = await create_offer(
                client,
                partner_token,
                name=f"Archive Magic Box {run_id}",
                stock=2,
            )

            first_order_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_one_token),
                json={"offer_id": offer["id"]},
            )
            assert first_order_response.status_code == 200, first_order_response.text
            second_order_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_two_token),
                json={"offer_id": offer["id"]},
            )
            assert second_order_response.status_code == 200, second_order_response.text

            delete_response = await client.delete(
                f"/partner-api/offers/{offer['id']}",
                headers=auth_headers(partner_token),
            )
            assert delete_response.status_code == 200, delete_response.text
            assert delete_response.json()["status"] == "archived"

            partner_offers_response = await client.get(
                "/partner-api/offers",
                headers=auth_headers(partner_token),
            )
            assert partner_offers_response.status_code == 200
            assert all(item["id"] != offer["id"] for item in partner_offers_response.json())

            async with AsyncSessionLocal() as session:
                archived_offer = await session.get(Offer, offer["id"])
                assert archived_offer is not None
                assert archived_offer.is_archived is True
                assert archived_offer.stock == 0
        finally:
            await cleanup_smoke_data(phone_prefix)


@pytest.mark.asyncio
async def test_expired_reservation_is_closed_and_stock_is_restored() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7792{run_id}"
    buyer_phone = f"{phone_prefix}01"
    partner_phone = f"{phone_prefix}02"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            buyer_token, _buyer = await web_register(client, buyer_phone, f"Expire Buyer {run_id}")
            partner_token, _partner_user = await web_register(client, partner_phone, f"Expire Partner {run_id}")
            await register_partner(client, partner_token, f"Expire Bakery {run_id}", approve=True)
            offer = await create_offer(
                client,
                partner_token,
                name=f"Expire Magic Box {run_id}",
                stock=1,
            )

            order_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_token),
                json={"offer_id": offer["id"]},
            )
            assert order_response.status_code == 200, order_response.text
            order = order_response.json()
            assert order["status"] == "RESERVED"

            stale_created_at = datetime.now(timezone.utc) - timedelta(minutes=31)
            async with AsyncSessionLocal() as session:
                db_order = await session.get(Order, order["id"])
                assert db_order is not None
                db_order.created_at = stale_created_at
                db_order.updated_at = stale_created_at
                session.add(db_order)
                await session.commit()

            orders_response = await client.get(
                "/orders/",
                headers=auth_headers(buyer_token),
            )
            assert orders_response.status_code == 200, orders_response.text
            expired_order = next(item for item in orders_response.json() if item["id"] == order["id"])
            assert expired_order["status"] == "EXPIRED"
            assert expired_order["expires_in_seconds"] == 0

            offer_after_expiry = await client.get(f"/offers/{offer['id']}")
            assert offer_after_expiry.status_code == 200, offer_after_expiry.text
            assert offer_after_expiry.json()["offer"]["stock"] == 1

            verify_response = await client.post(
                "/partner-api/orders/verify-code",
                headers=auth_headers(partner_token),
                json={"order_id": order["id"], "code": order["code"]},
            )
            assert verify_response.status_code == 400
            assert verify_response.json()["detail"] == "Order is not active"
        finally:
            await cleanup_smoke_data(phone_prefix)
