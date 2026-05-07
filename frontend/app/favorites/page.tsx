"use client";

import React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { PartnerDetail } from "@/lib/api-types";
import { useAppStore } from "@/store/app";
import { tokens, Icon, Badge, FONT } from "@/components/ui/primitives";
import { TabBar } from "@/components/TabBar";
import AppHeader from "@/components/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPositionsCount } from "@/lib/utils";
import { BusinessLogoPreview } from "@/components/biz/BusinessLogoPicker";

export default function FavoritesScreen() {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const router = useRouter();
  const { favorites, toggleFavorite } = useAppStore();

  const { data: favStores, isLoading, error } = useSWR<PartnerDetail[]>(
    favorites.length ? ["favorite-stores", favorites] : null,
    () => Promise.all(favorites.map((id) => api.get<PartnerDetail>(`/partners/${id}`))),
  );
  const stores = favStores || [];

  return (
    <div
      className="screen-scroll-with-tabbar"
      style={{
        width: "100%",
        background: t.bg,
        fontFamily: fontFn,
        color: t.text,
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppHeader
        title="Избранное"
        hideBack
        size="lg"
        sub={stores.length > 0 ? `${stores.length} заведений` : undefined}
      />

      {favorites.length === 0 ? (
        <div className="app-readable-content" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <EmptyState
            icon={Icon.heart(42, t.textTer)}
            title="Пока пусто"
            description="Добавляйте заведения в избранное, чтобы быстро возвращаться к любимым местам и следить за новыми позициями."
            action={<span aria-hidden="true" style={{ display: "block", height: 48 }} />}
          />
        </div>
      ) : isLoading ? (
        <div className="app-readable-content" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton w="100%" h={90} radius={14} />
          <Skeleton w="100%" h={90} radius={14} />
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить избранные заведения. Проверьте соединение и попробуйте ещё раз." />
      ) : (
        <div
          className="app-content store-offers-list"
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            className="buyer-section-title"
            style={{
              fontSize: 17,
              fontWeight: 700,
              marginBottom: 12,
              color: t.text,
            }}
          >
            Избранное
          </div>
          {stores.map(({ partner, offers }) => {
            const activeOffers = offers.filter((offer) => offer.stock > 0);
            const minPrice = activeOffers.length
              ? Math.min(...activeOffers.map((offer) => Number(offer.new_price)))
              : null;
            return (
            <div
              className="store-offer-card"
              key={partner.id}
              onClick={() => router.push(`/stores/${partner.id}`)}
              style={{
                background: t.bg,
                border: `1px solid ${t.divider}`,
                borderRadius: 14,
                padding: 12,
                display: "flex",
                gap: 12,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <BusinessLogoPreview logoUrl={partner.logo_url} businessName={partner.name} size={64} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.text, overflowWrap: "anywhere" }}>{partner.name}</div>
                <div style={{ fontSize: 12, color: t.textSec, overflowWrap: "anywhere" }}>
                  {partner.category || "Заведение"} · {partner.address}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {activeOffers.length > 0 ? (
                    <Badge tone="green" size="sm">
                      {formatPositionsCount(activeOffers.length)} от {minPrice} ₸
                    </Badge>
                  ) : (
                    <Badge tone="neutral" size="sm">
                      Нет активных позиций
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(String(partner.id));
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                }}
              >
                {Icon.heart(18, t.danger, true)}
              </button>
            </div>
          );
          })}
        </div>
      )}
      <TabBar />
    </div>
  );
}
