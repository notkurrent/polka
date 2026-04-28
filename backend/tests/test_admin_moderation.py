from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal, engine
from app.main import app
from app.models import Offer, Order, Partner, PartnerStatus, Rating, User


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
            "description": "Admin moderation test partner",
            "hours": "09:00-21:00",
            "lat": ALMATY_LAT,
            "lon": ALMATY_LON,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


async def create_offer_response(client: AsyncClient, token: str, name: str):
    return await client.post(
        "/partner-api/offers",
        headers=auth_headers(token),
        json={
            "type": "MAGIC_BOX",
            "name": name,
            "old_price": str(Decimal("4200.00")),
            "new_price": str(Decimal("1600.00")),
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
                await session.execute(select(Order.id).where(Order.offer_id.in_(offer_ids)))
            ).scalars().all()

        if order_ids:
            await session.execute(delete(Rating).where(Rating.order_id.in_(order_ids)))
            await session.execute(delete(Order).where(Order.id.in_(order_ids)))
        if offer_ids:
            await session.execute(delete(Offer).where(Offer.id.in_(offer_ids)))
        if partner_ids:
            await session.execute(delete(Partner).where(Partner.id.in_(partner_ids)))
        await session.execute(delete(User).where(User.id.in_(user_ids)))
        await session.commit()


@pytest.mark.asyncio(loop_scope="module")
async def test_admin_partner_moderation_api() -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7795{run_id}"
    user_phone = f"{phone_prefix}01"
    admin_phone = f"{phone_prefix}02"
    approved_partner_phone = f"{phone_prefix}03"
    rejected_partner_phone = f"{phone_prefix}04"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            user_token, _user = await web_register(client, user_phone, f"Admin Test User {run_id}")
            admin_token, admin_user = await web_register(
                client,
                admin_phone,
                f"Admin Test Admin {run_id}",
            )
            await make_admin(admin_user["id"])

            approved_partner_token, _approved_partner_user = await web_register(
                client,
                approved_partner_phone,
                f"Admin Test Approved Partner {run_id}",
            )
            approved_partner = await register_partner(
                client,
                approved_partner_token,
                f"Admin Approved Bakery {run_id}",
            )

            rejected_partner_token, _rejected_partner_user = await web_register(
                client,
                rejected_partner_phone,
                f"Admin Test Rejected Partner {run_id}",
            )
            rejected_partner = await register_partner(
                client,
                rejected_partner_token,
                f"Admin Rejected Bakery {run_id}",
            )

            non_admin_response = await client.get(
                "/admin/partners",
                headers=auth_headers(user_token),
            )
            assert non_admin_response.status_code == 403

            pending_response = await client.get(
                "/admin/partners",
                headers=auth_headers(admin_token),
                params={"status": "PENDING"},
            )
            assert pending_response.status_code == 200, pending_response.text
            pending_ids = {partner["id"] for partner in pending_response.json()}
            assert approved_partner["id"] in pending_ids
            assert rejected_partner["id"] in pending_ids

            approve_response = await client.post(
                f"/admin/partners/{approved_partner['id']}/approve",
                headers=auth_headers(admin_token),
            )
            assert approve_response.status_code == 200, approve_response.text
            approved_payload = approve_response.json()
            assert approved_payload["status"] == PartnerStatus.APPROVED.value
            assert approved_payload["reviewed_by_user_id"] == admin_user["id"]
            assert approved_payload["reviewed_at"] is not None

            offer_response = await create_offer_response(
                client,
                approved_partner_token,
                f"Admin Approved Magic Box {run_id}",
            )
            assert offer_response.status_code == 200, offer_response.text

            reject_response = await client.post(
                f"/admin/partners/{rejected_partner['id']}/reject",
                headers=auth_headers(admin_token),
                json={"note": "Missing documents"},
            )
            assert reject_response.status_code == 200, reject_response.text
            rejected_payload = reject_response.json()
            assert rejected_payload["status"] == PartnerStatus.REJECTED.value
            assert rejected_payload["review_note"] == "Missing documents"
            assert rejected_payload["reviewed_by_user_id"] == admin_user["id"]

            rejected_offer_response = await create_offer_response(
                client,
                rejected_partner_token,
                f"Admin Rejected Magic Box {run_id}",
            )
            assert rejected_offer_response.status_code == 403
        finally:
            await cleanup_test_data(phone_prefix)
            await engine.dispose()
