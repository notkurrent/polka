from __future__ import annotations

import hashlib
import hmac
import json
import urllib.parse
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.utils.auth import verify_telegram_web_app_data


TELEGRAM_BOT_TOKEN = "test-telegram-token"


def signed_init_data(params: dict[str, str], token: str = TELEGRAM_BOT_TOKEN) -> str:
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    hash_value = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return urllib.parse.urlencode({**params, "hash": hash_value})


@pytest.mark.asyncio
async def test_mock_otp_endpoints_are_not_available_in_production(monkeypatch) -> None:
    monkeypatch.setenv("ENV", "production")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        send_response = await client.post("/auth/web/send-otp", json={"phone": "+77771112233"})
        verify_response = await client.post(
            "/auth/web/verify",
            json={"phone": "+77771112233", "code": "1111"},
        )

    assert send_response.status_code == 404
    assert verify_response.status_code == 404


@pytest.mark.asyncio
async def test_telegram_auth_rejects_stale_init_data_in_production(monkeypatch) -> None:
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN)
    stale_auth_date = datetime.now(timezone.utc) - timedelta(hours=25)
    init_data = signed_init_data(
        {
            "auth_date": str(int(stale_auth_date.timestamp())),
            "user": json.dumps({"id": 12345, "first_name": "Test"}),
        }
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/auth/telegram", json={"initData": init_data})

    assert response.status_code == 401


def test_telegram_init_data_accepts_fresh_auth_date(monkeypatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN)
    init_data = signed_init_data(
        {
            "auth_date": str(int(datetime.now(timezone.utc).timestamp())),
            "user": json.dumps({"id": 12345, "first_name": "Test"}),
        }
    )

    assert verify_telegram_web_app_data(init_data) is True


def test_telegram_init_data_rejects_stale_auth_date(monkeypatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN)
    stale_auth_date = datetime.now(timezone.utc) - timedelta(hours=25)
    init_data = signed_init_data(
        {
            "auth_date": str(int(stale_auth_date.timestamp())),
            "user": json.dumps({"id": 12345, "first_name": "Test"}),
        }
    )

    assert verify_telegram_web_app_data(init_data) is False


def test_telegram_init_data_rejects_far_future_auth_date(monkeypatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN)
    future_auth_date = datetime.now(timezone.utc) + timedelta(minutes=10)
    init_data = signed_init_data(
        {
            "auth_date": str(int(future_auth_date.timestamp())),
            "user": json.dumps({"id": 12345, "first_name": "Test"}),
        }
    )

    assert verify_telegram_web_app_data(init_data) is False
