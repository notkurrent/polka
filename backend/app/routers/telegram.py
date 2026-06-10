import logging

import httpx
from fastapi import APIRouter, Header, HTTPException, Request

from app.config import (
    get_telegram_bot_token,
    get_telegram_webapp_url,
    get_telegram_webhook_secret,
    is_production,
)

router = APIRouter(prefix="/telegram", tags=["telegram"])
logger = logging.getLogger(__name__)

START_MESSAGE = (
    "Привет! Это Polka 🛍️\n\n"
    "Находите товары в локальных магазинах Алматы и связывайтесь с продавцами напрямую.\n\n"
    "Откройте приложение, чтобы посмотреть предложения рядом. Если у вас магазин, выберите роль бизнеса и добавьте свою витрину."
)


async def send_start_message(chat_id: int) -> None:
    webapp_url = get_telegram_webapp_url()
    if not webapp_url:
        logger.warning("telegram.start_message_skipped reason=missing_webapp_url")
        return

    payload = {
        "chat_id": chat_id,
        "text": START_MESSAGE,
        "reply_markup": {
            "inline_keyboard": [
                [
                    {
                        "text": "Открыть Polka",
                        "web_app": {"url": webapp_url},
                    }
                ]
            ]
        },
    }

    url = f"https://api.telegram.org/bot{get_telegram_bot_token()}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(url, json=payload)
        if response.status_code >= 400:
            logger.warning("telegram.send_message_failed status=%s", response.status_code)
            response.raise_for_status()


def verify_webhook_secret(secret_token: str | None) -> None:
    expected_secret = get_telegram_webhook_secret()
    if not expected_secret:
        if is_production():
            raise HTTPException(status_code=500, detail="Telegram webhook secret is not configured")
        return

    if secret_token != expected_secret:
        logger.warning("telegram.webhook_forbidden")
        raise HTTPException(status_code=403, detail="Invalid Telegram webhook secret")


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    verify_webhook_secret(x_telegram_bot_api_secret_token)
    update = await request.json()
    message = update.get("message") or {}
    text = message.get("text") or ""
    chat_id = message.get("chat", {}).get("id")

    if chat_id and text.startswith("/start"):
        try:
            await send_start_message(chat_id)
            logger.info("telegram.start_message_sent chat_id=%s", chat_id)
        except httpx.HTTPError:
            logger.exception("telegram.start_message_failed chat_id=%s", chat_id)

    return {"ok": True}
