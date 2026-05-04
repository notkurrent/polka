import logging
from dataclasses import dataclass
from enum import Enum
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

import httpx
from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError, features

from app.config import (
    get_media_max_upload_bytes,
    get_supabase_service_role_key,
    get_supabase_storage_bucket,
    get_supabase_storage_public_base_url,
    get_supabase_url,
)

logger = logging.getLogger(__name__)

ALLOWED_EXTENSION_MIMES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
IMAGE_FORMAT_MIMES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


class MediaImageKind(str, Enum):
    OFFER_IMAGE = "offer_image"
    PARTNER_LOGO = "partner_logo"


class MediaStorageError(Exception):
    pass


class MediaValidationError(ValueError):
    pass


@dataclass(frozen=True)
class PreparedImage:
    body: bytes
    content_type: str
    extension: str


def _storage_public_base_url() -> str:
    configured = get_supabase_storage_public_base_url().strip()
    if configured:
        return configured.rstrip("/")

    supabase_url = get_supabase_url().strip().rstrip("/")
    if not supabase_url:
        return ""

    bucket = get_supabase_storage_bucket().strip()
    return f"{supabase_url}/storage/v1/object/public/{quote(bucket, safe='')}"


def build_public_media_url(path: str | None) -> str | None:
    if not path:
        return None

    base_url = _storage_public_base_url()
    if not base_url:
        return None

    return f"{base_url}/{quote(path, safe='/')}"


def _has_alpha(image: Image.Image) -> bool:
    return image.mode in {"RGBA", "LA"} or (
        image.mode == "P" and "transparency" in image.info
    )


def _open_verified_image(raw: bytes) -> Image.Image:
    try:
        probe = Image.open(BytesIO(raw))
        probe.verify()
        image = Image.open(BytesIO(raw))
        image.load()
        return image
    except (UnidentifiedImageError, OSError) as exc:
        raise MediaValidationError("File is not a supported image") from exc


def _normalize_image(image: Image.Image, kind: MediaImageKind) -> PreparedImage:
    image = ImageOps.exif_transpose(image)
    max_dimension = 1600 if kind == MediaImageKind.OFFER_IMAGE else 1024
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    output = BytesIO()
    if _has_alpha(image):
        if features.check("webp"):
            image.save(output, format="WEBP", quality=84, method=6)
            return PreparedImage(output.getvalue(), "image/webp", ".webp")
        image.save(output, format="PNG", optimize=True)
        return PreparedImage(output.getvalue(), "image/png", ".png")

    image = image.convert("RGB")
    image.save(output, format="JPEG", quality=84, optimize=True, progressive=True)
    return PreparedImage(output.getvalue(), "image/jpeg", ".jpg")


async def prepare_upload_image(file: UploadFile, kind: MediaImageKind) -> PreparedImage:
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()
    expected_mime = ALLOWED_EXTENSION_MIMES.get(extension)
    if not expected_mime:
        raise MediaValidationError("Unsupported image extension")

    declared_mime = (file.content_type or "").split(";")[0].lower()
    if declared_mime not in ALLOWED_EXTENSION_MIMES.values():
        raise MediaValidationError("Unsupported image mime type")
    if declared_mime != expected_mime:
        raise MediaValidationError("Image extension does not match mime type")

    max_bytes = get_media_max_upload_bytes()
    raw = await file.read(max_bytes + 1)
    if not raw:
        raise MediaValidationError("Image file is empty")
    if len(raw) > max_bytes:
        raise MediaValidationError("Image file is too large")

    image = _open_verified_image(raw)
    actual_mime = IMAGE_FORMAT_MIMES.get((image.format or "").upper())
    if actual_mime != declared_mime:
        raise MediaValidationError("Image content does not match mime type")

    return _normalize_image(image, kind)


class SupabaseMediaStorage:
    def __init__(self, *, timeout_seconds: float = 10.0) -> None:
        self.timeout_seconds = timeout_seconds

    def _settings(self) -> tuple[str, str, str]:
        supabase_url = get_supabase_url().strip().rstrip("/")
        service_key = get_supabase_service_role_key().strip()
        bucket = get_supabase_storage_bucket().strip()
        if not supabase_url or not service_key or not bucket:
            raise MediaStorageError("Supabase Storage is not configured")
        return supabase_url, service_key, bucket

    async def upload(self, *, path: str, body: bytes, content_type: str) -> None:
        supabase_url, service_key, bucket = self._settings()
        url = f"{supabase_url}/storage/v1/object/{quote(bucket, safe='')}/{quote(path, safe='/')}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type,
            "Cache-Control": "public, max-age=31536000, immutable",
            "x-upsert": "false",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, headers=headers, content=body)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.exception("media.upload_failed path=%s", path)
            raise MediaStorageError("Failed to upload image") from exc

    async def delete(self, path: str | None) -> None:
        if not path:
            return

        supabase_url, service_key, bucket = self._settings()
        url = f"{supabase_url}/storage/v1/object/{quote(bucket, safe='')}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.request("DELETE", url, headers=headers, json={"prefixes": [path]})
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.exception("media.delete_failed path=%s", path)
            raise MediaStorageError("Failed to delete image") from exc


def new_offer_image_path(partner_id: int, offer_id: int, extension: str) -> str:
    return f"offers/{partner_id}/{offer_id}/{uuid4().hex}{extension}"


def new_partner_logo_path(partner_id: int, extension: str) -> str:
    return f"partners/{partner_id}/logo/{uuid4().hex}{extension}"
