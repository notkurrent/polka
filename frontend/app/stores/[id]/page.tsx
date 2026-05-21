"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/app";
import { tokens, Icon, FONT, Badge, PillButton, PriceTag, StripePlaceholder } from "@/components/ui/primitives";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";
import { BusinessLogoPreview } from "@/components/biz/BusinessLogoPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { OfferAvailability, PartnerDetail } from "@/lib/api-types";
import { Skeleton } from "@/components/ui/Skeleton";

function availabilityCopy(availability: OfferAvailability, stock: number) {
  if (availability === "OUT_OF_STOCK" || stock <= 0) return { label: "Нет в наличии", tone: "neutral" as const };
  if (availability === "PREORDER") return { label: "Под заказ", tone: "amber" as const };
  return { label: "В наличии", tone: "green" as const };
}

function socialLinksFromText(text: string) {
  const matches = text.match(/https?:\/\/[^\s,]+/g) || [];
  return matches.filter((url) => /instagram|t\.me|telegram|wa\.me|whatsapp|vk\.com/i.test(url));
}

export default function StoreScreen({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const t = tokens();
  const { isAuthenticated } = useAuth();
  const { favorites, toggleFavorite } = useAppStore();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const {
    data: partnerDetail,
    isLoading,
    error,
  } = useSWR<PartnerDetail>(isAuthenticated && id ? `/partners/${id}` : null, (url: string) =>
    api.get<PartnerDetail>(url),
  );

  const fav = id ? favorites.includes(id) : false;
  const partner = partnerDetail?.partner;
  const socialLinks = useMemo(() => socialLinksFromText(partner?.description || ""), [partner?.description]);

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
    about: partner.description || "Публичная витрина локального продавца. Здесь собраны товары и основные контакты магазина.",
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

  if (!id || isLoading) {
    return (
      <div
        style={{ height: "100dvh", display: "flex", justifyContent: "center", alignItems: "center", background: t.bg }}
      >
        <div style={{ width: "100%", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
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
      <div style={{ minHeight: "100dvh", background: t.bg, fontFamily: FONT() }}>
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
      <div style={{ position: "relative" }}>
        <StripePlaceholder label={store.imgLabel} h={200} radius={0} tone={store.tone} />
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

      <div className="app-content" style={{ padding: "46px 20px 24px" }}>
        <div
          style={{ fontSize: 11, color: t.textSec, fontWeight: 650, textTransform: "uppercase", letterSpacing: 0.6 }}
        >
          {store.cat}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 8px", letterSpacing: 0, overflowWrap: "anywhere" }}>
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

        <section
          id="contacts"
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
            <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>{store.address}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {Icon.clock(16, t.primaryDeep)}
            <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>{store.hours}</span>
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
          <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: t.textSec, marginBottom: 8 }}>Соцсети</div>
            {socialLinks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {socialLinks.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: t.primaryDeep, fontSize: 13, fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: t.textSec }}>Пока не указаны.</div>
            )}
          </div>
        </section>

        <section style={{ marginTop: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 17, fontWeight: 750, letterSpacing: 0 }}>Товары</div>
            <div style={{ fontSize: 12, color: t.textSec }}>{store.offers.length}</div>
          </div>
          <div className="store-offers-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {store.offers.length === 0 && (
              <EmptyState
                icon={Icon.bag(34, t.textTer)}
                title="Пока нет товаров"
                description="Когда магазин добавит товары, они появятся здесь."
                compact
              />
            )}
            {store.offers.map((offer) => {
              const availability = availabilityCopy(offer.availability, offer.qty);
              const unavailable = offer.availability === "OUT_OF_STOCK" || offer.qty <= 0;
              return (
                <article
                  key={offer.id}
                  onClick={() => router.push(`/offers/${offer.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") router.push(`/offers/${offer.id}`);
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
                  <OfferImagePreview imageUrl={offer.imageUrl} label="товар" width={76} height={76} radius={12} tone="mint" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 750, letterSpacing: 0, overflowWrap: "anywhere" }}>{offer.title}</div>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <PriceTag original={offer.original ?? null} now={offer.now} size="sm" />
                        <Badge tone={availability.tone} size="sm">
                          {availability.label}
                        </Badge>
                      </div>
                      <PillButton
                        variant="outline"
                        size="sm"
                        full={false}
                        onClick={() => router.push(`/offers/${offer.id}`)}
                        disabled={unavailable}
                        style={{ minWidth: 112 }}
                      >
                        Связаться
                      </PillButton>
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
