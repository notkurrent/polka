from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_sensitive_rate_limit_allows_normal_requests(monkeypatch) -> None:
    monkeypatch.setenv("SENSITIVE_RATE_LIMIT_MAX_REQUESTS", "2")
    monkeypatch.setenv("SENSITIVE_RATE_LIMIT_WINDOW_SECONDS", "60")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        first_response = await client.post("/auth/password/forgot", json={"phone": "+77771112233"})
        second_response = await client.post("/auth/password/forgot", json={"phone": "+77771112233"})

    assert first_response.status_code == 200
    assert second_response.status_code == 200


@pytest.mark.asyncio
async def test_sensitive_rate_limit_rejects_excessive_requests(monkeypatch) -> None:
    monkeypatch.setenv("SENSITIVE_RATE_LIMIT_MAX_REQUESTS", "2")
    monkeypatch.setenv("SENSITIVE_RATE_LIMIT_WINDOW_SECONDS", "60")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        await client.post("/auth/password/forgot", json={"phone": "+77771112233"})
        await client.post("/auth/password/forgot", json={"phone": "+77771112233"})
        response = await client.post("/auth/password/forgot", json={"phone": "+77771112233"})

    assert response.status_code == 429
    assert response.json() == {"detail": "Too many requests"}
    assert response.headers["Retry-After"]


@pytest.mark.asyncio
async def test_production_mock_otp_stays_hidden_when_rate_limit_is_exceeded(monkeypatch) -> None:
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("SENSITIVE_RATE_LIMIT_MAX_REQUESTS", "1")
    monkeypatch.setenv("SENSITIVE_RATE_LIMIT_WINDOW_SECONDS", "60")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        first_response = await client.post("/auth/web/send-otp", json={"phone": "+77771112233"})
        second_response = await client.post("/auth/web/send-otp", json={"phone": "+77771112233"})

    assert first_response.status_code == 404
    assert second_response.status_code == 404
