"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { OfferAvailability, OfferDetail } from "@/lib/api-types";
import { useAuth } from "@/hooks/useAuth";
import { tokens, Icon, FONT, Badge, PillButton, PriceTag } from "@/components/ui/primitives";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";
import { BusinessLogoPreview } from "@/components/biz/BusinessLogoPicker";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

function availabilityCopy(availability: OfferAvailability, stock: number) {
  if (availability === "OUT_OF_STOCK" || stock <= 0) return { label: "Нет в наличии", tone: "neutral" as const };
  if (availability === "PREORDER") return { label: "Под заказ", tone: "amber" as const };
  return { label: stock <= 2 ? `В наличии: ${stock}` : "В наличии", tone: "green" as const };
}

export default function OfferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const t = tokens();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const { data: selectedOfferData, error: loadError } = useSWR<OfferDetail>(
    isAuthenticated && id ? `/offers/${id}` : null,
    (url: string) => api.get<OfferDetail>(url),
  );

  useEffect(() => {
    const mainButton = window.Telegram?.WebApp?.MainButton;
    mainButton?.hide?.();
    return () => mainButton?.hide?.();
  }, []);

  const offer = selectedOfferData?.offer;
  const partner = selectedOfferData?.partner;
  const availability = offer ? availabilityCopy(offer.availability, offer.stock) : null;
  const contactRoute = partner ? `/stores/${partner.id}#contacts` : "/search";

  if (loadError) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: t.bg,
          padding: "calc(24px + var(--app-safe-top)) 20px",
          fontFamily: FONT(),
        }}
      >
        <PillButton variant="outline" full={false} onClick={() => router.back()}>
          Назад
        </PillButton>
        <ErrorState message="Не удалось открыть товар. Вернитесь назад или попробуйте другой товар." />
      </div>
    );
  }

  if (!offer || !partner || !availability) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100%",
          background: t.bg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton w="100%" h={240} radius={0} />
          <Skeleton w="70%" h={24} radius={8} />
          <Skeleton w="45%" h={32} radius={8} />
          <Skeleton w="100%" h={132} radius={16} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="offer-detail-page"
      style={{
        height: "100vh",
        width: "100%",
        overflow: "auto",
        background: t.bg,
        fontFamily: FONT ? FONT() : "system-ui",
        color: t.text,
        paddingBottom: 104,
      }}
    >
      <div className="offer-detail-hero" style={{ position: "relative" }}>
        <OfferImagePreview imageUrl={offer.image_url} label="товар" width="100%" height={240} radius={0} tone="mint" />
        <button
          type="button"
          aria-label="Назад"
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: "calc(12px + var(--app-safe-top))",
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
      </div>

      <div className="offer-detail-body" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <BusinessLogoPreview logoUrl={partner.logo_url} businessName={partner.name} size={40} radius={10} />
          <button
            type="button"
            onClick={() => router.push(`/stores/${partner.id}`)}
            style={{
              minWidth: 0,
              flex: 1,
              border: "none",
              padding: 0,
              background: "transparent",
              textAlign: "left",
              cursor: "pointer",
              color: t.text,
            }}
          >
            <div style={{ fontSize: 13, color: t.textSec }}>Магазин</div>
            <div style={{ fontSize: 15, fontWeight: 750, overflowWrap: "anywhere" }}>{partner.name}</div>
          </button>
          <Badge tone={availability.tone} size="sm">
            {availability.label}
          </Badge>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 14px", letterSpacing: 0, overflowWrap: "anywhere" }}>
          {offer.name}
        </h1>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
          <PriceTag original={offer.old_price ?? null} now={offer.price ?? offer.new_price} size="lg" />
        </div>

        {offer.description && (
          <div style={{ marginBottom: 20, fontSize: 14, color: t.textSec, lineHeight: 1.5, overflowWrap: "anywhere" }}>
            {offer.description}
          </div>
        )}

        <div style={{ background: t.surface, borderRadius: 16, padding: "16px", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 12 }}>О продавце</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {Icon.pin(16, t.primaryDeep)}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: t.textSec }}>Адрес</div>
                <div style={{ fontSize: 13, fontWeight: 650, overflowWrap: "anywhere" }}>{partner.address}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {Icon.clock(16, t.primaryDeep)}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: t.textSec }}>График</div>
                <div style={{ fontSize: 13, fontWeight: 650, overflowWrap: "anywhere" }}>{partner.hours}</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/stores/${partner.id}`)}
            style={{
              marginTop: 14,
              width: "100%",
              minHeight: 44,
              padding: "10px",
              borderRadius: 12,
              border: `1px solid ${t.primary}`,
              background: "transparent",
              color: t.primaryDeep,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Открыть витрину магазина
          </button>
        </div>

        <div style={{ background: t.bg, border: `1px solid ${t.divider}`, borderRadius: 16, padding: "16px" }}>
          <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 8 }}>Контакт продавца</div>
          <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.45 }}>
            Перейдите на витрину магазина, чтобы посмотреть адрес, карту и доступные способы связи.
          </div>
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            right: "auto",
            width: "min(100vw, var(--app-fixed-bar-width))",
            transform: "translateX(-50%)",
            padding: "12px 20px calc(16px + var(--app-safe-bottom))",
            background: "rgba(255,255,255,0.96)",
            borderTop: `1px solid ${t.divider}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <PillButton size="lg" full onClick={() => router.push(contactRoute)} disabled={offer.availability === "OUT_OF_STOCK" || offer.stock <= 0}>
            {offer.availability === "OUT_OF_STOCK" || offer.stock <= 0 ? "Нет в наличии" : "Написать продавцу"}
          </PillButton>
        </div>
      </div>
    </div>
  );
}
