import logging

import httpx

from app.config import (
    get_admin_panel_url,
    get_admin_telegram_bot_token,
    get_admin_telegram_chat_id,
    get_admin_telegram_thread_id,
)
from app.models import Partner, User

logger = logging.getLogger(__name__)


def _admin_partner_url() -> str:
    admin_panel_url = get_admin_panel_url().strip()
    if admin_panel_url:
        return admin_panel_url
    return "/admin/partners"


def _message_thread_id() -> int | None:
    raw_thread_id = get_admin_telegram_thread_id().strip()
    if not raw_thread_id:
        return None

    try:
        return int(raw_thread_id)
    except ValueError:
        logger.warning("admin.telegram.invalid_thread_id thread_id=%s", raw_thread_id)
        return None


def _partner_registered_text(partner: Partner, user: User) -> str:
    lines = [
        "Новая заявка бизнеса",
        f"Название: {partner.name}",
        f"Категория: {partner.category}",
        f"Адрес: {partner.address}",
        f"Часы работы: {partner.hours}",
        f"Пользователь: {user.name}",
    ]

    if user.phone:
        lines.append(f"Телефон: {user.phone}")

    lines.extend(
        [
            f"Partner ID: {partner.id}",
            f"User ID: {user.id}",
            f"Админка: {_admin_partner_url()}",
        ]
    )
    return "\n".join(lines)


async def notify_admin_partner_registered(partner: Partner, user: User) -> None:
    token = get_admin_telegram_bot_token().strip()
    chat_id = get_admin_telegram_chat_id().strip()
    if not token or not chat_id:
        logger.info("admin.telegram.disabled reason=missing_token_or_chat_id")
        return

    payload: dict[str, object] = {
        "chat_id": chat_id,
        "text": _partner_registered_text(partner, user),
    }
    thread_id = _message_thread_id()
    if thread_id is not None:
        payload["message_thread_id"] = thread_id

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        logger.exception("admin.telegram.send_failed partner_id=%s user_id=%s", partner.id, user.id)
        return
    except ValueError:
        logger.warning(
            "admin.telegram.invalid_response partner_id=%s user_id=%s",
            partner.id,
            user.id,
            exc_info=True,
        )
        return

    if not data.get("ok"):
        logger.warning(
            "admin.telegram.api_error partner_id=%s user_id=%s response=%s",
            partner.id,
            user.id,
            data,
        )
        return

    logger.info(
        "admin.telegram.sent partner_id=%s user_id=%s chat_id=%s",
        partner.id,
        user.id,
        chat_id,
    )
