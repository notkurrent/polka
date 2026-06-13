from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.rate_limit import sensitive_rate_limit
from app.models import Inquiry, Offer, OfferAvailability, Partner, PartnerStatus
from app.order_lifecycle import expire_stale_orders
from app.schemas import InquiryCreateDTO, InquiryDTO, PartnerDetailDTO
from app.serializers import build_offer_dto, build_partner_dto
from app.routers.partner_common import get_partner_location_row

router = APIRouter(prefix="/partners", tags=["partners"])

@router.get("/{partner_id}", response_model=PartnerDetailDTO)
async def get_partner_detail(
    partner_id: int,
    session: AsyncSession = Depends(get_session),
):
    await expire_stale_orders(session)
    row = await get_partner_location_row(session, partner_id)
    if not row:
        raise HTTPException(status_code=404, detail="Partner not found")

    partner, lat, lon = row
    if partner.status != PartnerStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Partner not found")

    offers_result = await session.execute(
        select(Offer)
        .where(
            Offer.partner_id == partner.id,
            Offer.stock > 0,
            Offer.availability != OfferAvailability.HIDDEN,
            Offer.is_archived.is_(False),
        )
        .order_by(Offer.created_at.desc())
    )

    return PartnerDetailDTO(
        partner=build_partner_dto(
            partner,
            lat=float(lat) if lat is not None else None,
            lon=float(lon) if lon is not None else None,
        ),
        offers=[build_offer_dto(offer) for offer in offers_result.scalars().all()],
    )


@router.post(
    "/{partner_id}/inquiries",
    response_model=InquiryDTO,
    dependencies=[Depends(sensitive_rate_limit("partners.inquiries.create"))],
)
async def create_partner_inquiry(
    partner_id: int,
    req: InquiryCreateDTO,
    session: AsyncSession = Depends(get_session),
):
    partner = await session.get(Partner, partner_id)
    if not partner or partner.status != PartnerStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Partner not found")

    if req.offer_id is not None:
        offer = await session.get(Offer, req.offer_id)
        if (
            not offer
            or offer.partner_id != partner.id
            or offer.availability == OfferAvailability.HIDDEN
            or offer.is_archived
        ):
            raise HTTPException(status_code=404, detail="Offer not found")

    inquiry = Inquiry(
        partner_id=partner.id,
        offer_id=req.offer_id,
        channel=req.channel,
        target_url=req.target_url,
    )
    session.add(inquiry)
    await session.commit()
    await session.refresh(inquiry)
    return InquiryDTO(
        id=inquiry.id,
        partner_id=inquiry.partner_id,
        offer_id=inquiry.offer_id,
        channel=inquiry.channel,
        target_url=inquiry.target_url,
        created_at=inquiry.created_at,
    )
