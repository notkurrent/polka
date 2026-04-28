from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.dependencies import get_current_admin_user
from app.models import Partner, PartnerStatus, User
from app.schemas import AdminPartnerDTO

router = APIRouter(prefix="/admin", tags=["admin"])


class ModerationRequest(BaseModel):
    note: str | None = None


async def get_partner_location_row(session: AsyncSession, partner_id: int):
    result = await session.execute(
        select(
            Partner,
            func.ST_Y(Partner.location).label("lat"),
            func.ST_X(Partner.location).label("lon"),
        ).where(Partner.id == partner_id)
    )
    return result.one_or_none()


def build_admin_partner_dto(
    partner: Partner,
    *,
    lat: float | None = None,
    lon: float | None = None,
) -> AdminPartnerDTO:
    return AdminPartnerDTO(
        id=partner.id,
        user_id=partner.user_id,
        name=partner.name,
        address=partner.address,
        hours=partner.hours,
        category=partner.category or "",
        description=partner.description or "",
        lat=lat,
        lon=lon,
        status=partner.status,
        review_note=partner.review_note,
        reviewed_at=partner.reviewed_at,
        created_at=partner.created_at,
        reviewed_by_user_id=partner.reviewed_by_user_id,
    )


async def get_partner_or_404(session: AsyncSession, partner_id: int) -> Partner:
    partner = await session.get(Partner, partner_id)
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner


async def update_partner_status(
    session: AsyncSession,
    partner: Partner,
    *,
    status: PartnerStatus,
    admin: User,
    note: str | None,
) -> AdminPartnerDTO:
    partner.status = status
    partner.review_note = note
    partner.reviewed_at = datetime.now(timezone.utc)
    partner.reviewed_by_user_id = admin.id

    session.add(partner)
    await session.commit()

    row = await get_partner_location_row(session, partner.id)
    partner, lat, lon = row
    return build_admin_partner_dto(
        partner,
        lat=float(lat) if lat is not None else None,
        lon=float(lon) if lon is not None else None,
    )


@router.get("/partners", response_model=list[AdminPartnerDTO])
async def list_partners(
    status: PartnerStatus | None = None,
    current_admin: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(
        Partner,
        func.ST_Y(Partner.location).label("lat"),
        func.ST_X(Partner.location).label("lon"),
    ).order_by(Partner.created_at.desc())
    if status is not None:
        query = query.where(Partner.status == status)

    result = await session.execute(query)
    return [
        build_admin_partner_dto(
            partner,
            lat=float(lat) if lat is not None else None,
            lon=float(lon) if lon is not None else None,
        )
        for partner, lat, lon in result.all()
    ]


@router.get("/partners/{partner_id}", response_model=AdminPartnerDTO)
async def get_partner(
    partner_id: int,
    current_admin: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session),
):
    row = await get_partner_location_row(session, partner_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    partner, lat, lon = row
    return build_admin_partner_dto(
        partner,
        lat=float(lat) if lat is not None else None,
        lon=float(lon) if lon is not None else None,
    )


@router.post("/partners/{partner_id}/approve", response_model=AdminPartnerDTO)
async def approve_partner(
    partner_id: int,
    req: ModerationRequest | None = None,
    current_admin: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_partner_or_404(session, partner_id)
    return await update_partner_status(
        session,
        partner,
        status=PartnerStatus.APPROVED,
        admin=current_admin,
        note=req.note if req else None,
    )


@router.post("/partners/{partner_id}/reject", response_model=AdminPartnerDTO)
async def reject_partner(
    partner_id: int,
    req: ModerationRequest | None = None,
    current_admin: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_partner_or_404(session, partner_id)
    return await update_partner_status(
        session,
        partner,
        status=PartnerStatus.REJECTED,
        admin=current_admin,
        note=req.note if req else None,
    )


@router.post("/partners/{partner_id}/suspend", response_model=AdminPartnerDTO)
async def suspend_partner(
    partner_id: int,
    req: ModerationRequest | None = None,
    current_admin: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_partner_or_404(session, partner_id)
    return await update_partner_status(
        session,
        partner,
        status=PartnerStatus.SUSPENDED,
        admin=current_admin,
        note=req.note if req else None,
    )


@router.post("/partners/{partner_id}/return-to-review", response_model=AdminPartnerDTO)
async def return_partner_to_review(
    partner_id: int,
    req: ModerationRequest | None = None,
    current_admin: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session),
):
    partner = await get_partner_or_404(session, partner_id)
    return await update_partner_status(
        session,
        partner,
        status=PartnerStatus.PENDING,
        admin=current_admin,
        note=req.note if req else None,
    )
