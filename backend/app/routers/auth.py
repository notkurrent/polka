from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from app.config import is_production
from app.dependencies import get_current_user
from app.rate_limit import sensitive_rate_limit
from app.utils.auth import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_telegram_web_app_data,
)
from app.utils.admin_bootstrap import apply_admin_bootstrap
from app.database import get_session
from app.models import User, UserRole
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import logging
import os
import re
import urllib.parse
import json

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
KZ_PHONE_DIGITS = 11

class TelegramAuthRequest(BaseModel):
    initData: str

class SendOtpRequest(BaseModel):
    phone: str

class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


class RegisterRequest(BaseModel):
    phone: str
    name: str
    password: str


class LoginRequest(BaseModel):
    phone: str
    password: str


class ForgotPasswordRequest(BaseModel):
    phone: str


class LinkTelegramRequest(BaseModel):
    phone: str
    password: str


class CompleteTelegramAccountRequest(BaseModel):
    phone: str
    password: str


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == KZ_PHONE_DIGITS and digits.startswith("8"):
        digits = f"7{digits[1:]}"
    elif len(digits) == 10:
        digits = f"7{digits}"
    if not digits:
        raise HTTPException(status_code=422, detail="Phone is required")
    if len(digits) != KZ_PHONE_DIGITS or not digits.startswith("7"):
        raise HTTPException(status_code=422, detail="Phone must be a Kazakhstan number")
    return f"+{digits}"


def auth_user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "role": user.role.value,
        "is_tma": user.is_tma,
        "is_admin": user.is_admin,
        "has_password": bool(user.password_hash),
        "has_telegram": bool(user.tg_id),
    }


def auth_response(user: User) -> dict:
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": auth_user_payload(user),
    }


def auth_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message},
    )


def telegram_init_data_status(init_data: str) -> dict[str, object]:
    parsed_data = dict(urllib.parse.parse_qsl(init_data))
    return {
        "length": len(init_data),
        "has_hash": "hash" in parsed_data,
        "has_user": bool(parsed_data.get("user")),
        "has_auth_date": "auth_date" in parsed_data,
    }


@router.post("/telegram", dependencies=[Depends(sensitive_rate_limit("auth.telegram"))])
async def telegram_auth(req: TelegramAuthRequest, session: AsyncSession = Depends(get_session)):
    init_data_status = telegram_init_data_status(req.initData)
    if not verify_telegram_web_app_data(req.initData):
        logger.warning("auth.telegram_verify_failed status=%s", init_data_status)
        if os.getenv("ENV", "dev").lower() != "dev":
            raise HTTPException(status_code=401, detail="Invalid Telegram init data")
        logger.info("Telegram initData verification failed; skipping in dev mode")

    # extract user from initData
    parsed_data = dict(urllib.parse.parse_qsl(req.initData))
    user_data = json.loads(parsed_data.get("user", "{}"))
    tg_id = user_data.get("id")
    if tg_id is None:
        raise HTTPException(status_code=400, detail="Telegram user id is missing")
    tg_id = str(tg_id)

    result = await session.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            tg_id=tg_id,
            name=user_data.get("first_name") or "Пользователь",
            role=UserRole.BUYER,
            is_tma=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    if apply_admin_bootstrap(user):
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return auth_response(user)


@router.post(
    "/telegram/link-web-account",
    dependencies=[Depends(sensitive_rate_limit("auth.telegram.link_web_account"))],
)
async def link_telegram_web_account(
    req: LinkTelegramRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not current_user.tg_id:
        raise auth_error(
            400,
            "TELEGRAM_ACCOUNT_REQUIRED",
            "Current user is not a Telegram account",
        )

    phone = normalize_phone(req.phone)
    result = await session.execute(select(User).where(User.phone == phone).with_for_update())
    target_user = result.scalar_one_or_none()
    if target_user is None or not verify_password(req.password, target_user.password_hash):
        raise auth_error(401, "INVALID_PHONE_OR_PASSWORD", "Invalid phone or password")

    if target_user.tg_id and target_user.tg_id != current_user.tg_id:
        raise auth_error(
            409,
            "WEB_ACCOUNT_ALREADY_LINKED",
            "Web account is already linked to another Telegram account",
        )

    if current_user.id == target_user.id:
        if apply_admin_bootstrap(target_user):
            session.add(target_user)
            await session.commit()
            await session.refresh(target_user)
        return auth_response(target_user)

    tg_id = current_user.tg_id
    current_user.tg_id = None
    session.add(current_user)
    await session.flush()

    target_user.tg_id = tg_id
    target_user.is_tma = True
    apply_admin_bootstrap(target_user)

    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)

    return auth_response(target_user)


@router.post(
    "/telegram/complete-account",
    dependencies=[Depends(sensitive_rate_limit("auth.telegram.complete_account"))],
)
async def complete_telegram_account(
    req: CompleteTelegramAccountRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not current_user.tg_id:
        raise auth_error(
            400,
            "TELEGRAM_ACCOUNT_REQUIRED",
            "Current user is not a Telegram account",
        )

    try:
        password_hash = hash_password(req.password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    phone = normalize_phone(req.phone)
    result = await session.execute(select(User).where(User.phone == phone).with_for_update())
    phone_user = result.scalar_one_or_none()

    if phone_user is None:
        current_user.phone = phone
        current_user.password_hash = password_hash
        current_user.is_tma = True
        apply_admin_bootstrap(current_user)
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)
        return auth_response(current_user)

    if phone_user.id == current_user.id:
        if not current_user.password_hash:
            current_user.password_hash = password_hash
        current_user.is_tma = True
        apply_admin_bootstrap(current_user)
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)
        return auth_response(current_user)

    if phone_user.password_hash:
        raise auth_error(
            409,
            "PHONE_BELONGS_TO_WEB_ACCOUNT",
            "Phone belongs to an existing web account. Link the existing account with password.",
        )

    raise auth_error(
        409,
        "PHONE_ALREADY_USED",
        "Phone is already used by another account",
    )


@router.post("/web/register", dependencies=[Depends(sensitive_rate_limit("auth.web.register"))])
async def register_web(req: RegisterRequest, session: AsyncSession = Depends(get_session)):
    phone = normalize_phone(req.phone)
    name = req.name.strip() or "Пользователь"

    try:
        password_hash = hash_password(req.password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    result = await session.execute(select(User).where(User.phone == phone))
    existing_user = result.scalar_one_or_none()
    if existing_user is not None:
        if existing_user.password_hash:
            raise HTTPException(
                status_code=409,
                detail={"code": "ACCOUNT_ALREADY_EXISTS", "message": "account already exists"},
            )
        raise HTTPException(
            status_code=409,
            detail={
                "code": "ACCOUNT_EXISTS_WITHOUT_PASSWORD",
                "message": "Аккаунт уже существует в Telegram Mini App. Откройте Mini App, чтобы задать пароль.",
            },
        )

    user = User(
        phone=phone,
        name=name,
        password_hash=password_hash,
        role=UserRole.BUYER,
        is_tma=False,
    )
    apply_admin_bootstrap(user)
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return auth_response(user)


@router.post("/web/login", dependencies=[Depends(sensitive_rate_limit("auth.web.login"))])
async def login_web(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    phone = normalize_phone(req.phone)

    result = await session.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(req.password, user.password_hash):
        logger.info("auth.web_login_invalid phone_suffix=%s", phone[-4:])
        raise HTTPException(status_code=401, detail="Invalid phone or password")

    if apply_admin_bootstrap(user):
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return auth_response(user)


@router.post("/password/forgot", dependencies=[Depends(sensitive_rate_limit("auth.password.forgot"))])
async def forgot_password(req: ForgotPasswordRequest):
    normalize_phone(req.phone)
    return {"message": "Если аккаунт существует, мы покажем доступный способ восстановления."}


@router.post("/web/send-otp", deprecated=True)
async def send_otp(req: SendOtpRequest, request: Request):
    if is_production():
        raise HTTPException(status_code=404, detail="Not found")
    sensitive_rate_limit("auth.web.send_otp")(request)
    # Deprecated mock OTP endpoint kept temporarily for existing frontend flows.
    return {"message": "OTP sent", "mock_code": "1111"}


@router.post("/web/verify", deprecated=True)
async def verify_otp(req: VerifyOtpRequest, request: Request, session: AsyncSession = Depends(get_session)):
    if is_production():
        raise HTTPException(status_code=404, detail="Not found")
    sensitive_rate_limit("auth.web.verify_otp")(request)
    if req.code != "1111":
        logger.info("auth.web_otp_invalid phone_suffix=%s", req.phone[-4:])
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    phone = normalize_phone(req.phone)
    result = await session.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            phone=phone,
            name="Пользователь",
            role=UserRole.BUYER,
            is_tma=False,
        )
        apply_admin_bootstrap(user)
        session.add(user)
        await session.commit()
        await session.refresh(user)
    elif apply_admin_bootstrap(user):
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return auth_response(user)
