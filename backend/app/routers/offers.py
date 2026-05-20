from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import String, cast, func
from typing import Optional
from geoalchemy2 import Geography

from app.database import get_session
from app.models import Offer, OfferAvailability, OfferType, Partner, PartnerStatus
from app.order_lifecycle import expire_stale_orders
from app.schemas import OfferPublicDTO, OfferWithPartnerDTO
from app.serializers import build_offer_dto, build_offer_with_partner_dto

router = APIRouter(prefix="/offers", tags=["offers"])

@router.get("/", response_model=list[OfferPublicDTO])
async def get_offers(
    type: Optional[OfferType] = None,
    session: AsyncSession = Depends(get_session)
):
    await expire_stale_orders(session)
    query = (
        select(Offer)
        .join(Partner, Offer.partner_id == Partner.id)
        .where(
            Offer.stock > 0,
            Offer.availability != OfferAvailability.HIDDEN,
            Offer.is_archived.is_(False),
            Partner.status == PartnerStatus.APPROVED,
        )
    )
    if type:
        query = query.where(Offer.type == type)

    result = await session.execute(query)
    offers = result.scalars().all()
    return [build_offer_dto(offer) for offer in offers]


@router.get("/nearby", response_model=list[OfferWithPartnerDTO])
async def get_nearby_offers(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius: float = Query(5000.0, description="Radius in meters"),
    search: Optional[str] = Query(None, description="Search by offer or partner name"),
    session: AsyncSession = Depends(get_session)
):
    await expire_stale_orders(session)
    user_location = func.ST_GeogFromText(f"SRID=4326;POINT({lon} {lat})")
    partner_location = Partner.location.cast(Geography)
    distance = func.ST_Distance(partner_location, user_location)

    query = (
        select(
            Offer,
            Partner,
            distance.label("distance"),
            func.ST_Y(Partner.location).label("lat"),
            func.ST_X(Partner.location).label("lon"),
        )
        .join(Partner, Offer.partner_id == Partner.id)
        .where(
            Offer.stock > 0,
            Offer.availability != OfferAvailability.HIDDEN,
            Offer.is_archived.is_(False),
            Partner.status == PartnerStatus.APPROVED,
            Partner.location.is_not(None),
            func.ST_DWithin(
                partner_location,
                user_location,
                radius
            )
        )
    )

    if search:
        normalized = search.strip().lower()
        aliases = {
            "кофейни": "Кофейня",
            "кофейня": "Кофейня",
            "пекарни": "Пекарня",
            "пекарня": "Пекарня",
            "рестораны": "Ресторан",
            "ресторан": "Ресторан",
            "десерты": "Кондитерская",
            "десерт": "Кондитерская",
            "магазины": "Магазин",
            "магазин": "Магазин",
            "сюрприз-пакеты": "MAGIC_BOX",
            "сюрпризы": "MAGIC_BOX",
            "сюрприз": "MAGIC_BOX",
            "magic box": "MAGIC_BOX",
        }
        terms = {search.strip()}
        if normalized in aliases:
            terms.add(aliases[normalized])

        search_filters = []
        for term in terms:
            search_term = f"%{term}%"
            search_filters.extend(
                [
                    Offer.name.ilike(search_term),
                    Partner.name.ilike(search_term),
                    Partner.category.ilike(search_term),
                    cast(Offer.type, String).ilike(search_term),
                ]
            )
        query = query.where(
            or_(*search_filters)
        )

    query = query.order_by(distance)

    result = await session.execute(query)
    rows = result.all()

    return [
        build_offer_with_partner_dto(
            offer,
            partner,
            distance=float(row_distance) if row_distance is not None else None,
            lat=float(row_lat) if row_lat is not None else None,
            lon=float(row_lon) if row_lon is not None else None,
        )
        for offer, partner, row_distance, row_lat, row_lon in rows
    ]


@router.get("/{offer_id}", response_model=OfferWithPartnerDTO)
async def get_offer_detail(
    offer_id: int,
    session: AsyncSession = Depends(get_session),
):
    await expire_stale_orders(session)
    query = (
        select(
            Offer,
            Partner,
            func.ST_Y(Partner.location).label("lat"),
            func.ST_X(Partner.location).label("lon"),
        )
        .join(Partner, Offer.partner_id == Partner.id)
        .where(
            Offer.id == offer_id,
            Offer.availability != OfferAvailability.HIDDEN,
            Offer.is_archived.is_(False),
            Partner.status == PartnerStatus.APPROVED,
        )
    )
    result = await session.execute(query)
    row = result.one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Offer not found")

    offer, partner, lat, lon = row
    return build_offer_with_partner_dto(
        offer,
        partner,
        lat=float(lat) if lat is not None else None,
        lon=float(lon) if lon is not None else None,
    )
