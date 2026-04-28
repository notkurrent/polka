from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal, engine
from app.main import app
from app.models import Partner, User
from app.routers import partners as partner_router


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


async def register_partner(client: AsyncClient, token: str, name: str):
    return await client.post(
        "/partner-api/register",
        headers=auth_headers(token),
        json={
            "name": name,
            "type": "bakery",
            "address": "проспект Достык, 52, Алматы",
            "description": "Admin notification test partner",
            "hours": "09:00-21:00",
            "lat": ALMATY_LAT,
            "lon": ALMATY_LON,
        },
    )


async def cleanup_test_data(phone_prefix: str) -> None:
    async with AsyncSessionLocal() as session:
        user_ids = (
            await session.execute(select(User.id).where(User.phone.like(f"{phone_prefix}%")))
        ).scalars().all()
        if not user_ids:
            return

        await session.execute(delete(Partner).where(Partner.user_id.in_(user_ids)))
        await session.execute(delete(User).where(User.id.in_(user_ids)))
        await session.commit()


async def partner_exists(partner_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        return await session.get(Partner, partner_id) is not None


@pytest.mark.asyncio(loop_scope="module")
async def test_partner_register_passes_without_admin_telegram_env(monkeypatch) -> None:
    monkeypatch.delenv("ADMIN_TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("ADMIN_TELEGRAM_CHAT_ID", raising=False)
    monkeypatch.delenv("ADMIN_TELEGRAM_THREAD_ID", raising=False)

    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7781{run_id}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            token, _user = await web_register(client, f"{phone_prefix}01", f"Notify Off {run_id}")
            response = await register_partner(client, token, f"Notify Off Bakery {run_id}")

            assert response.status_code == 200, response.text
            assert await partner_exists(response.json()["id"])
        finally:
            await cleanup_test_data(phone_prefix)
            await engine.dispose()


@pytest.mark.asyncio(loop_scope="module")
async def test_partner_register_calls_admin_notification_when_env_is_configured(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_TELEGRAM_BOT_TOKEN", "admin-bot-token")
    monkeypatch.setenv("ADMIN_TELEGRAM_CHAT_ID", "-1001234567890")

    calls = []

    async def notify_spy(partner: Partner, user: User) -> None:
        calls.append((partner.id, user.id))

    monkeypatch.setattr(partner_router, "notify_admin_partner_registered", notify_spy)

    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7782{run_id}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            token, user = await web_register(client, f"{phone_prefix}01", f"Notify On {run_id}")
            response = await register_partner(client, token, f"Notify On Bakery {run_id}")

            assert response.status_code == 200, response.text
            assert calls == [(response.json()["id"], user["id"])]
        finally:
            await cleanup_test_data(phone_prefix)
            await engine.dispose()


@pytest.mark.asyncio(loop_scope="module")
async def test_partner_register_commits_when_admin_notification_fails(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_TELEGRAM_BOT_TOKEN", "admin-bot-token")
    monkeypatch.setenv("ADMIN_TELEGRAM_CHAT_ID", "-1001234567890")

    async def notify_fails(partner: Partner, user: User) -> None:
        raise RuntimeError("telegram unavailable")

    monkeypatch.setattr(partner_router, "notify_admin_partner_registered", notify_fails)

    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7783{run_id}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            token, _user = await web_register(client, f"{phone_prefix}01", f"Notify Fail {run_id}")
            response = await register_partner(client, token, f"Notify Fail Bakery {run_id}")

            assert response.status_code == 200, response.text
            assert await partner_exists(response.json()["id"])
        finally:
            await cleanup_test_data(phone_prefix)
            await engine.dispose()
