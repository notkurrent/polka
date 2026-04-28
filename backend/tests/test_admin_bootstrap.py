from __future__ import annotations

import json
import urllib.parse
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal, engine
from app.main import app
from app.models import User


TEST_PASSWORD = "password123"


async def cleanup_users(phone_prefix: str, tg_ids: list[str] | None = None) -> None:
    async with AsyncSessionLocal() as session:
        phone_ids = (
            await session.execute(select(User.id).where(User.phone.like(f"{phone_prefix}%")))
        ).scalars().all()
        tg_ids = tg_ids or []
        telegram_ids = []
        if tg_ids:
            telegram_ids = (
                await session.execute(select(User.id).where(User.tg_id.in_(tg_ids)))
            ).scalars().all()
        user_ids = list(set(phone_ids + telegram_ids))
        if user_ids:
            await session.execute(delete(User).where(User.id.in_(user_ids)))
            await session.commit()


async def web_register(client: AsyncClient, phone: str, name: str) -> dict:
    response = await client.post(
        "/auth/web/register",
        json={"phone": phone, "name": name, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()["user"]


async def web_login(client: AsyncClient, phone: str) -> dict:
    response = await client.post(
        "/auth/web/login",
        json={"phone": phone, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()["user"]


async def web_login_response(client: AsyncClient, phone: str) -> dict:
    response = await client.post(
        "/auth/web/login",
        json={"phone": phone, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()


async def telegram_auth(client: AsyncClient, tg_id: str) -> dict:
    init_data = urllib.parse.urlencode({"user": json.dumps({"id": tg_id, "first_name": "Admin Tg"})})
    response = await client.post("/auth/telegram", json={"initData": init_data})
    assert response.status_code == 200, response.text
    return response.json()["user"]


@pytest.mark.asyncio(loop_scope="module")
async def test_web_user_with_admin_phone_allowlist_becomes_admin(monkeypatch) -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7781{run_id}"
    phone = f"{phone_prefix}01"
    monkeypatch.setenv("ADMIN_PHONE_ALLOWLIST", phone)
    monkeypatch.delenv("ADMIN_TG_ID_ALLOWLIST", raising=False)

    await engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            user = await web_register(client, phone, f"Phone Admin {run_id}")
            assert user["is_admin"] is True
        finally:
            await engine.dispose()
            await cleanup_users(phone_prefix)
            await engine.dispose()


@pytest.mark.asyncio(loop_scope="module")
async def test_telegram_user_with_admin_tg_id_allowlist_becomes_admin(monkeypatch) -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    tg_id = f"4299{run_id}"
    monkeypatch.setenv("ENV", "dev")
    monkeypatch.delenv("ADMIN_PHONE_ALLOWLIST", raising=False)
    monkeypatch.setenv("ADMIN_TG_ID_ALLOWLIST", tg_id)

    await engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            user = await telegram_auth(client, tg_id)
            assert user["is_admin"] is True
        finally:
            await engine.dispose()
            await cleanup_users("+77000000000", [tg_id])
            await engine.dispose()


@pytest.mark.asyncio(loop_scope="module")
async def test_user_outside_admin_allowlist_does_not_become_admin(monkeypatch) -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7782{run_id}"
    phone = f"{phone_prefix}01"
    monkeypatch.setenv("ADMIN_PHONE_ALLOWLIST", f"{phone_prefix}99")
    monkeypatch.setenv("ADMIN_TG_ID_ALLOWLIST", "123456789")

    await engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            user = await web_register(client, phone, f"Not Admin {run_id}")
            assert user["is_admin"] is False
        finally:
            await engine.dispose()
            await cleanup_users(phone_prefix)
            await engine.dispose()


@pytest.mark.asyncio(loop_scope="module")
async def test_existing_admin_stays_admin_when_removed_from_allowlist(monkeypatch) -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7783{run_id}"
    phone = f"{phone_prefix}01"
    monkeypatch.setenv("ADMIN_PHONE_ALLOWLIST", phone)

    await engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            user = await web_register(client, phone, f"Sticky Admin {run_id}")
            assert user["is_admin"] is True

            monkeypatch.delenv("ADMIN_PHONE_ALLOWLIST", raising=False)
            user = await web_login(client, phone)
            assert user["is_admin"] is True
        finally:
            await engine.dispose()
            await cleanup_users(phone_prefix)
            await engine.dispose()


@pytest.mark.asyncio(loop_scope="module")
async def test_users_me_applies_admin_allowlist_for_existing_session(monkeypatch) -> None:
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7784{run_id}"
    phone = f"{phone_prefix}01"
    monkeypatch.delenv("ADMIN_PHONE_ALLOWLIST", raising=False)
    monkeypatch.delenv("ADMIN_TG_ID_ALLOWLIST", raising=False)

    await engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            user = await web_register(client, phone, f"Existing Session Admin {run_id}")
            assert user["is_admin"] is False

            login = await web_login_response(client, phone)
            token = login["access_token"]

            monkeypatch.setenv("ADMIN_PHONE_ALLOWLIST", phone)
            response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 200, response.text
            assert response.json()["is_admin"] is True
        finally:
            await engine.dispose()
            await cleanup_users(phone_prefix)
            await engine.dispose()
