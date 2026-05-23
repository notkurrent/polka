"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/app";
import {
  tokens,
  Icon,
  FONT,
  Badge,
  PriceTag,
  StripePlaceholder,
} from "@/components/ui/primitives";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";
import { BusinessLogoPreview } from "@/components/biz/BusinessLogoPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { OfferAvailability, PartnerDetail } from "@/lib/api-types";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  primaryContactLink,
  secondaryContactLinks,
  trackInquiryClick,
} from "@/lib/contact-links";

function availabilityCopy(availability: OfferAvailability, stock: number) {
  if (availability === "OUT_OF_STOCK" || stock <= 0)
    return { label: "Нет в наличии", tone: "neutral" as const };
  if (availability === "PREORDER")
    return { label: "Под заказ", tone: "amber" as const };
  return { label: "В наличии", tone: "green" as const };
}

export default function StoreScreen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const t = tokens();
  const { isAuthenticated } = useAuth();
  const { favorites, toggleFavorite } = useAppStore();
  const [id, setId] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const {
    data: partnerDetail,
    isLoading,
    error,
  } = useSWR<PartnerDetail>(
    isAuthenticated && id ? `/partners/${id}` : null,
    (url: string) => api.get<PartnerDetail>(url),
  );

  const fav = id ? favorites.includes(id) : false;
  const partner = partnerDetail?.partner;
  const contactLink = useMemo(() => primaryContactLink(partner), [partner]);
  const contactLinks = useMemo(() => secondaryContactLinks(partner), [partner]);

  const store = partner && {
    id: String(partner.id),
    name: partner.name,
    logoUrl: partner.logo_url,
    imgLabel: partner.name.slice(0, 10) || "...",
    tone: "blue" as const,
    cat: partner.category || "Магазин",
    address: partner.address,
    hours: partner.hours,
    mapUrl: partner.map_url,
    about:
      partner.description ||
      "Публичная витрина локального продавца. Здесь собраны товары и основные контакты магазина.",
    offers: (partnerDetail?.offers || []).map((offer) => ({
      id: String(offer.id),
      title: offer.name,
      desc: offer.description || "Описание появится у продавца позже.",
      original: offer.old_price,
      now: offer.price ?? offer.new_price,
      qty: offer.stock,
      imageUrl: offer.image_url,
      availability: offer.availability,
    })),
  };

  const copyStoreLink = async () => {
    if (!partner || typeof window === "undefined") return;
    await navigator.clipboard.writeText(
      `${window.location.origin}/stores/${partner.id}`,
    );
    setCopyDone(true);
    window.setTimeout(() => setCopyDone(false), 1800);
  };

  if (!id || isLoading) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: t.bg,
        }}
      >
        <div
          style={{
            width: "100%",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <Skeleton w="100%" h={200} radius={0} />
          <Skeleton w="62%" h={24} radius={8} />
          <Skeleton w="100%" h={86} radius={14} />
          <Skeleton w="100%" h={104} radius={16} />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div
        style={{ minHeight: "100dvh", background: t.bg, fontFamily: FONT() }}
      >
        <EmptyState
          icon={Icon.pin(40, t.textTer)}
          title="Магазин не найден"
          description="Не удалось загрузить страницу магазина. Вернитесь назад или попробуйте открыть другой товар."
        />
      </div>
    );
  }

  return (
    <div
      className="store-detail-page"
      style={{
        height: "100dvh",
        width: "100%",
        overflow: "auto",
        background: t.bg,
        fontFamily: FONT(),
        color: t.text,
        WebkitFontSmoothing: "antialiased",
        paddingBottom: "calc(var(--app-safe-bottom) + 24px)",
      }}
    >
      <div className="store-detail-hero" style={{ position: "relative" }}>
        <StripePlaceholder
          label={store.imgLabel}
          h={200}
          radius={0}
          tone={store.tone}
        />
        <BusinessLogoPreview
          logoUrl={store.logoUrl}
          businessName={store.name}
          size={82}
          radius={18}
          style={{
            position: "absolute",
            left: 20,
            bottom: -34,
            background: "#fff",
            boxShadow: "0 12px 32px rgba(17, 23, 20, 0.16)",
          }}
        />
        <button
          type="button"
          aria-label="Назад"
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: "calc(var(--app-safe-top) + 12px)",
            left: 12,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.95)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icon.back(18)}
        </button>
        <button
          type="button"
          aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
          onClick={() => id && toggleFavorite(id)}
          style={{
            position: "absolute",
            top: "calc(var(--app-safe-top) + 12px)",
            right: 12,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.95)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icon.heart(18, fav ? t.danger : t.text, fav)}
        </button>
      </div>

      <div
        className="app-content store-detail-content"
        style={{ padding: "46px 20px 24px" }}
      >
        <div className="store-detail-summary">
          <div
            style={{
              fontSize: 11,
              color: t.textSec,
              fontWeight: 650,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {store.cat}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "4px 0 8px",
              letterSpacing: 0,
              overflowWrap: "anywhere",
            }}
          >
            {store.name}
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: t.textSec,
              margin: "0 0 16px",
              textWrap: "pretty",
              overflowWrap: "anywhere",
            }}
          >
            {store.about}
          </p>
        </div>

        <section
          id="contacts"
          className="store-contacts-card"
          style={{
            background: t.surface,
            borderRadius: 14,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            border: `1px solid ${t.divider}`,
            scrollMarginTop: 20,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 750 }}>Контакты</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {Icon.pin(16, t.primaryDeep)}
            <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>
              {store.address}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {Icon.clock(16, t.primaryDeep)}
            <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>
              {store.hours}
            </span>
          </div>
          {store.mapUrl && (
            <a
              href={store.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: t.primaryDeep,
                fontSize: 13,
                fontWeight: 750,
                textDecoration: "none",
                overflowWrap: "anywhere",
              }}
            >
              {Icon.pin(16, t.primaryDeep)}
              Открыть карту
            </a>
          )}
          {contactLink && partner && (
            <a
              href={contactLink.href}
              target={contactLink.channel === "phone" ? undefined : "_blank"}
              rel={
                contactLink.channel === "phone"
                  ? undefined
                  : "noopener noreferrer"
              }
              onClick={() =>
                trackInquiryClick({
                  partnerId: partner.id,
                  channel: contactLink.channel,
                  targetUrl: contactLink.href,
                })
              }
              style={{
                minHeight: 48,
                borderRadius: 9999,
                background: t.primaryDeep,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Написать продавцу
            </a>
          )}
          <button
            type="button"
            onClick={copyStoreLink}
            style={{
              minHeight: 44,
              borderRadius: 12,
              border: `1px solid ${t.primary}`,
              background: "#fff",
              color: t.primaryDeep,
              fontSize: 13,
              fontWeight: 750,
              cursor: "pointer",
              fontFamily: FONT(),
            }}
          >
            {copyDone ? "Ссылка скопирована" : "Скопировать ссылку на магазин"}
          </button>
          <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: t.textSec, marginBottom: 8 }}>
              Способы связи
            </div>
            {contactLinks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contactLinks.map((link) => (
                  <a
                    key={`${link.channel}-${link.href}`}
                    href={link.href}
                    target={link.channel === "phone" ? undefined : "_blank"}
                    rel={
                      link.channel === "phone"
                        ? undefined
                        : "noopener noreferrer"
                    }
                    onClick={() =>
                      partner &&
                      trackInquiryClick({
                        partnerId: partner.id,
                        channel: link.channel,
                        targetUrl: link.href,
                      })
                    }
                    style={{
                      color: t.primaryDeep,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: "none",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: t.textSec }}>
                Пока не указаны.
              </div>
            )}
          </div>
        </section>

        <section className="store-products-section" style={{ marginTop: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 750, letterSpacing: 0 }}>
              Товары
            </div>
            <div style={{ fontSize: 12, color: t.textSec }}>
              {store.offers.length}
            </div>
          </div>
          <div
            className="store-offers-list"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {store.offers.length === 0 && (
              <EmptyState
                icon={Icon.bag(34, t.textTer)}
                title="Пока нет товаров"
                description="Когда магазин добавит товары, они появятся здесь."
                compact
              />
            )}
            {store.offers.map((offer) => {
              const availability = availabilityCopy(
                offer.availability,
                offer.qty,
              );
              const unavailable =
                offer.availability === "OUT_OF_STOCK" || offer.qty <= 0;
              return (
                <article
                  key={offer.id}
                  onClick={() => router.push(`/offers/${offer.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      router.push(`/offers/${offer.id}`);
                  }}
                  role="button"
                  tabIndex={0}
                  className="store-offer-card"
                  style={{
                    background: t.bg,
                    border: `1px solid ${t.divider}`,
                    borderRadius: 16,
                    padding: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <OfferImagePreview
                    imageUrl={offer.imageUrl}
                    label="товар"
                    width={76}
                    height={76}
                    radius={12}
                    tone="mint"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 750,
                        letterSpacing: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {offer.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: t.textSec,
                        margin: "3px 0 8px",
                        textWrap: "pretty",
                        overflowWrap: "anywhere",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {offer.desc}
                    </div>
                    <div
                      className="store-offer-card-purchase"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        className="store-offer-card-price"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <PriceTag
                          original={offer.original ?? null}
                          now={offer.now}
                          size="sm"
                        />
                        <Badge tone={availability.tone} size="sm">
                          {availability.label}
                        </Badge>
                      </div>
                      <button
                        className="store-offer-card-action"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (contactLink && partner) {
                            trackInquiryClick({
                              partnerId: partner.id,
                              offerId: Number(offer.id),
                              channel: contactLink.channel,
                              targetUrl: contactLink.href,
                            });
                            window.location.href = contactLink.href;
                            return;
                          }
                          router.push(`/offers/${offer.id}`);
                        }}
                        disabled={unavailable}
                        style={{
                          minWidth: 112,
                          minHeight: 44,
                          padding: "0 16px",
                          borderRadius: 9999,
                          border: `1.5px solid ${t.primary}`,
                          background: "#fff",
                          color: t.primaryDeep,
                          fontSize: 14,
                          fontWeight: 650,
                          fontFamily: FONT(),
                          cursor: unavailable ? "not-allowed" : "pointer",
                          opacity: unavailable ? 0.58 : 1,
                        }}
                      >
                        Написать
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
