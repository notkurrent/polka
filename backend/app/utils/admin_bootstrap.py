import re

from app.config import get_admin_phone_allowlist, get_admin_tg_id_allowlist
from app.models import User


def normalize_admin_allowlist_phone(phone: str | None) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11 and digits.startswith("8"):
        digits = f"7{digits[1:]}"
    elif len(digits) == 10:
        digits = f"7{digits}"
    return f"+{digits}" if digits else phone.strip()


def normalized_admin_phone_allowlist() -> set[str]:
    return {normalized for item in get_admin_phone_allowlist() if (normalized := normalize_admin_allowlist_phone(item))}


def normalized_admin_tg_id_allowlist() -> set[str]:
    return {item.strip() for item in get_admin_tg_id_allowlist() if item.strip()}


def user_matches_admin_allowlist(user: User) -> bool:
    phone = normalize_admin_allowlist_phone(user.phone)
    tg_id = str(user.tg_id).strip() if user.tg_id is not None else ""
    return bool(
        (phone and phone in normalized_admin_phone_allowlist())
        or (tg_id and tg_id in normalized_admin_tg_id_allowlist())
    )


def apply_admin_bootstrap(user: User) -> bool:
    if user.is_admin:
        return False
    if not user_matches_admin_allowlist(user):
        return False
    user.is_admin = True
    return True
