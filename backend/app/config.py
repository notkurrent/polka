import logging
import os

logger = logging.getLogger(__name__)

DEFAULT_JWT_SECRET = "dev_only_default_jwt_secret_32_bytes_minimum"
DEFAULT_TELEGRAM_BOT_TOKEN = "mock_token"


def env_name() -> str:
    return os.getenv("ENV", "dev").lower()


def is_production() -> bool:
    return env_name() in {"prod", "production"}


def get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET", DEFAULT_JWT_SECRET)


def get_jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def get_telegram_bot_token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", DEFAULT_TELEGRAM_BOT_TOKEN)


def get_telegram_webapp_url() -> str:
    return os.getenv("TELEGRAM_WEBAPP_URL", "")


def get_telegram_webhook_secret() -> str:
    return os.getenv("TELEGRAM_WEBHOOK_SECRET", "")


def get_admin_telegram_bot_token() -> str:
    return os.getenv("ADMIN_TELEGRAM_BOT_TOKEN", "")


def get_admin_telegram_chat_id() -> str:
    return os.getenv("ADMIN_TELEGRAM_CHAT_ID", "")


def get_admin_telegram_thread_id() -> str:
    return os.getenv("ADMIN_TELEGRAM_THREAD_ID", "")


def get_admin_panel_url() -> str:
    return os.getenv("ADMIN_PANEL_URL", "")


def get_supabase_url() -> str:
    return os.getenv("SUPABASE_URL", "")


def get_supabase_service_role_key() -> str:
    return os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase_storage_bucket() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET", "media")


def get_supabase_storage_public_base_url() -> str:
    return os.getenv("SUPABASE_STORAGE_PUBLIC_BASE_URL", "")


def get_media_max_upload_bytes() -> int:
    raw = os.getenv("MEDIA_MAX_UPLOAD_BYTES", str(5 * 1024 * 1024))
    try:
        value = int(raw)
    except ValueError:
        return 5 * 1024 * 1024
    return max(value, 1)


def get_admin_phone_allowlist() -> list[str]:
    return parse_csv_env("ADMIN_PHONE_ALLOWLIST", [])


def get_admin_tg_id_allowlist() -> list[str]:
    return parse_csv_env("ADMIN_TG_ID_ALLOWLIST", [])


def parse_csv_env(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if raw is None:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def get_cors_origins() -> list[str]:
    return parse_csv_env(
        "CORS_ORIGINS",
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ],
    )


def get_cors_origin_regex() -> str | None:
    return os.getenv(
        "CORS_ORIGIN_REGEX",
        r"^https://.*\.ngrok(-free)?\.(app|dev)$" if not is_production() else None,
    )


def validate_runtime_config() -> None:
    jwt_secret = get_jwt_secret()
    telegram_token = get_telegram_bot_token()

    if is_production():
        errors = []
        if not jwt_secret or jwt_secret == DEFAULT_JWT_SECRET:
            errors.append("JWT_SECRET must be set to a strong non-default value")
        if not telegram_token or telegram_token == DEFAULT_TELEGRAM_BOT_TOKEN:
            errors.append("TELEGRAM_BOT_TOKEN must be set in production")
        if not get_telegram_webapp_url():
            errors.append("TELEGRAM_WEBAPP_URL must be set in production")
        if not get_telegram_webhook_secret():
            errors.append("TELEGRAM_WEBHOOK_SECRET must be set in production")
        if "*" in get_cors_origins():
            errors.append("CORS_ORIGINS must not contain '*' in production")
        if not get_cors_origins():
            errors.append("CORS_ORIGINS must include at least one production origin")
        if errors:
            raise RuntimeError("Invalid production configuration: " + "; ".join(errors))

    if jwt_secret == DEFAULT_JWT_SECRET:
        logger.warning("Using default JWT_SECRET; only acceptable for local development")
    if telegram_token == DEFAULT_TELEGRAM_BOT_TOKEN:
        logger.warning("Using mock TELEGRAM_BOT_TOKEN; Telegram auth only works in dev bypass mode")
