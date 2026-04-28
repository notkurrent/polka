from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.dependencies import get_current_user
from app.models import User
from app.routers.auth import normalize_phone

router = APIRouter(prefix="/users", tags=["users"])


class UpdateUser(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "role": current_user.role,
        "is_tma": current_user.is_tma,
        "is_admin": current_user.is_admin,
        "has_password": bool(current_user.password_hash),
        "has_telegram": bool(current_user.tg_id),
        "created_at": current_user.created_at,
    }


@router.patch("/me")
async def update_me(
    req: UpdateUser,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    update_data = req.model_dump(exclude_unset=True)
    if "phone" in update_data and update_data["phone"] is not None:
        update_data["phone"] = normalize_phone(update_data["phone"])

    if (
        "phone" in update_data
        and update_data["phone"] is not None
        and update_data["phone"] != current_user.phone
    ):
        phone_result = await session.execute(
            select(User).where(User.phone == update_data["phone"], User.id != current_user.id)
        )
        if phone_result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=400, detail="Phone already in use")

    if (
        "email" in update_data
        and update_data["email"] is not None
        and update_data["email"] != current_user.email
    ):
        email_result = await session.execute(
            select(User).where(User.email == update_data["email"], User.id != current_user.id)
        )
        if email_result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=400, detail="Email already in use")

    for key, value in update_data.items():
        setattr(current_user, key, value)

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "role": current_user.role,
        "is_tma": current_user.is_tma,
        "is_admin": current_user.is_admin,
        "has_password": bool(current_user.password_hash),
        "has_telegram": bool(current_user.tg_id),
        "created_at": current_user.created_at,
    }
