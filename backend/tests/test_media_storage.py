from __future__ import annotations

from decimal import Decimal
from io import BytesIO
from uuid import uuid4

import pytest
from fastapi import UploadFile
from httpx import ASGITransport, AsyncClient
from PIL import Image
from sqlalchemy import delete
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.main import app
from app.models import Offer, OfferType, Order, OrderItem, Partner, PartnerStatus, Rating, User
from app.routers import partner_api as partner_router
from app.services.media_storage import (
    MediaImageKind,
    MediaValidationError,
    prepare_upload_image,
)


ALMATY_LAT = 43.238949
ALMATY_LON = 76.889709
TEST_PASSWORD = "password123"


class FakeMediaStorage:
    def __init__(self) -> None:
        self.uploads: list[dict] = []
        self.deletes: list[str] = []

    async def upload(self, *, path: str, body: bytes, content_type: str) -> None:
        self.uploads.append(
            {
                "path": path,
                "body": body,
                "content_type": content_type,
            }
        )

    async def delete(self, path: str | None) -> None:
        if path:
            self.deletes.append(path)


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def image_bytes(*, fmt: str = "PNG", size: tuple[int, int] = (40, 30), color=(220, 80, 40)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format=fmt)
    return output.getvalue()


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


async def register_partner(client: AsyncClient, token: str, name: str) -> dict:
    response = await client.post(
        "/partner-api/register",
        headers=auth_headers(token),
        json={
            "name": name,
            "type": "bakery",
            "address": "проспект Достык, 52, Алматы",
            "description": "Media test partner",
            "hours": "09:00-21:00",
            "lat": ALMATY_LAT,
            "lon": ALMATY_LON,
        },
    )
    assert response.status_code == 200, response.text
    partner = response.json()
    await approve_partner(partner["id"])
    return partner


async def create_offer(client: AsyncClient, token: str, name: str, *, stock: int = 2) -> dict:
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


async def cleanup_media_data(phone_prefix: str) -> None:
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
        buyer_order_ids = (
            await session.execute(select(Order.id).where(Order.user_id.in_(user_ids)))
        ).scalars().all()
        order_ids = list({*order_ids, *buyer_order_ids})

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
async def test_prepare_upload_image_validates_extension_mime_and_size(monkeypatch) -> None:
    png = image_bytes(fmt="PNG")
    valid = UploadFile(filename="offer.png", file=BytesIO(png), headers={"content-type": "image/png"})
    prepared = await prepare_upload_image(valid, MediaImageKind.OFFER_IMAGE)
    assert prepared.content_type == "image/jpeg"
    assert prepared.extension == ".jpg"
    assert prepared.body

    mismatch = UploadFile(filename="offer.jpg", file=BytesIO(png), headers={"content-type": "image/png"})
    with pytest.raises(MediaValidationError, match="extension"):
        await prepare_upload_image(mismatch, MediaImageKind.OFFER_IMAGE)

    monkeypatch.setenv("MEDIA_MAX_UPLOAD_BYTES", "8")
    too_large = UploadFile(filename="offer.png", file=BytesIO(png), headers={"content-type": "image/png"})
    with pytest.raises(MediaValidationError, match="too large"):
        await prepare_upload_image(too_large, MediaImageKind.OFFER_IMAGE)


@pytest.mark.asyncio
async def test_offer_image_replacement_and_physical_delete_cleanup(monkeypatch) -> None:
    fake_storage = FakeMediaStorage()
    monkeypatch.setattr(partner_router, "media_storage", fake_storage)
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7788{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(client, partner_phone, f"Media Partner {run_id}")
            await register_partner(client, partner_token, f"Media Bakery {run_id}")
            offer = await create_offer(client, partner_token, f"Media Catalog Product {run_id}")

            first_response = await client.post(
                f"/partner-api/offers/{offer['id']}/image",
                headers=auth_headers(partner_token),
                files={"file": ("first.png", image_bytes(fmt="PNG"), "image/png")},
            )
            assert first_response.status_code == 200, first_response.text
            first_path = first_response.json()["image_path"]
            assert first_path.startswith("offers/")
            assert first_response.json()["image_url"].endswith(first_path)

            second_response = await client.post(
                f"/partner-api/offers/{offer['id']}/image",
                headers=auth_headers(partner_token),
                files={"file": ("second.png", image_bytes(fmt="PNG", color=(40, 100, 220)), "image/png")},
            )
            assert second_response.status_code == 200, second_response.text
            second_path = second_response.json()["image_path"]
            assert second_path != first_path
            assert first_path in fake_storage.deletes

            delete_response = await client.delete(
                f"/partner-api/offers/{offer['id']}",
                headers=auth_headers(partner_token),
            )
            assert delete_response.status_code == 200, delete_response.text
            assert delete_response.json()["status"] == "deleted"
            assert second_path in fake_storage.deletes
        finally:
            await cleanup_media_data(phone_prefix)


@pytest.mark.asyncio
async def test_offer_archive_with_orders_keeps_storage_image(monkeypatch) -> None:
    fake_storage = FakeMediaStorage()
    monkeypatch.setattr(partner_router, "media_storage", fake_storage)
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7787{run_id}"
    buyer_phone = f"{phone_prefix}01"
    partner_phone = f"{phone_prefix}02"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            buyer_token, _buyer_user = await web_register(client, buyer_phone, f"Media Buyer {run_id}")
            partner_token, _partner_user = await web_register(client, partner_phone, f"Archive Media Partner {run_id}")
            await register_partner(client, partner_token, f"Archive Media Bakery {run_id}")
            offer = await create_offer(client, partner_token, f"Archive Media Catalog Product {run_id}")

            image_response = await client.post(
                f"/partner-api/offers/{offer['id']}/image",
                headers=auth_headers(partner_token),
                files={"file": ("offer.png", image_bytes(fmt="PNG"), "image/png")},
            )
            assert image_response.status_code == 200, image_response.text
            image_path = image_response.json()["image_path"]

            order_response = await client.post(
                "/orders/",
                headers=auth_headers(buyer_token),
                json={"offer_id": offer["id"]},
            )
            assert order_response.status_code == 200, order_response.text

            delete_response = await client.delete(
                f"/partner-api/offers/{offer['id']}",
                headers=auth_headers(partner_token),
            )
            assert delete_response.status_code == 200, delete_response.text
            assert delete_response.json()["status"] == "archived"
            assert image_path not in fake_storage.deletes
        finally:
            await cleanup_media_data(phone_prefix)


@pytest.mark.asyncio
async def test_offer_image_delete_endpoint_clears_path_and_storage(monkeypatch) -> None:
    fake_storage = FakeMediaStorage()
    monkeypatch.setattr(partner_router, "media_storage", fake_storage)
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7785{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(client, partner_phone, f"Delete Image Partner {run_id}")
            await register_partner(client, partner_token, f"Delete Image Bakery {run_id}")
            offer = await create_offer(client, partner_token, f"Delete Image Catalog Product {run_id}")

            image_response = await client.post(
                f"/partner-api/offers/{offer['id']}/image",
                headers=auth_headers(partner_token),
                files={"file": ("offer.png", image_bytes(fmt="PNG"), "image/png")},
            )
            assert image_response.status_code == 200, image_response.text
            image_path = image_response.json()["image_path"]

            delete_image_response = await client.delete(
                f"/partner-api/offers/{offer['id']}/image",
                headers=auth_headers(partner_token),
            )
            assert delete_image_response.status_code == 200, delete_image_response.text
            assert delete_image_response.json()["image_path"] is None
            assert delete_image_response.json()["image_url"] is None
            assert image_path in fake_storage.deletes
        finally:
            await cleanup_media_data(phone_prefix)


@pytest.mark.asyncio
async def test_partner_logo_replacement_deletes_old_logo(monkeypatch) -> None:
    fake_storage = FakeMediaStorage()
    monkeypatch.setattr(partner_router, "media_storage", fake_storage)
    run_id = str(uuid4().int % 100000).zfill(5)
    phone_prefix = f"+7786{run_id}"
    partner_phone = f"{phone_prefix}01"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            partner_token, _partner_user = await web_register(client, partner_phone, f"Logo Partner {run_id}")
            await register_partner(client, partner_token, f"Logo Bakery {run_id}")

            first_response = await client.post(
                "/partner-api/profile/logo",
                headers=auth_headers(partner_token),
                files={"file": ("logo.png", image_bytes(fmt="PNG"), "image/png")},
            )
            assert first_response.status_code == 200, first_response.text
            first_path = first_response.json()["logo_path"]
            assert first_path.startswith("partners/")

            second_response = await client.post(
                "/partner-api/profile/logo",
                headers=auth_headers(partner_token),
                files={"file": ("logo.png", image_bytes(fmt="PNG", color=(50, 180, 80)), "image/png")},
            )
            assert second_response.status_code == 200, second_response.text
            second_path = second_response.json()["logo_path"]
            assert second_path != first_path
            assert first_path in fake_storage.deletes
        finally:
            await cleanup_media_data(phone_prefix)
