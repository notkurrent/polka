"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { tokens, Icon, FONT, Badge, PriceTag, PillButton } from "@/components/ui/primitives";
import { useAppStore } from "@/store/app";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ALMATY_CENTER, NearbyOffer, OfferAvailability } from "@/lib/api-types";
import { BUSINESS_CATEGORY_SEARCH_OPTIONS } from "@/lib/business-constants";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";

function availabilityCopy(availability: OfferAvailability, stock: number) {
  if (availability === "OUT_OF_STOCK" || stock <= 0) return { label: "Нет в наличии", tone: "neutral" as const };
  if (availability === "PREORDER") return { label: "Под заказ", tone: "amber" as const };
  return { label: "В наличии", tone: "green" as const };
}

export default function SearchPage() {
  const router = useRouter();
  const t = tokens();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const lat = useAppStore((state) => state.location?.lat) ?? ALMATY_CENTER.lat;
  const lon = useAppStore((state) => state.location?.lon) ?? ALMATY_CENTER.lon;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const {
    data: offers,
    isLoading,
    error,
  } = useSWR<NearbyOffer[]>(
    debouncedQuery
      ? `/offers/nearby?lat=${lat}&lon=${lon}&radius=50000&search=${encodeURIComponent(debouncedQuery)}`
      : null,
    (url: string) => api.get<NearbyOffer[]>(url),
  );

  const categories = [...BUSINESS_CATEGORY_SEARCH_OPTIONS, { label: "Товары", query: "Товары" }];

  return (
    <div
      style={{
        height: "100dvh",
        background: t.bg,
        fontFamily: FONT(),
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="app-content"
        style={{
          position: "sticky",
          top: 0,
          padding: "calc(12px + var(--app-safe-top)) 16px 8px",
          background: t.bg,
          zIndex: 30,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: t.surface,
            borderRadius: 12,
            padding: "8px 12px",
            gap: 8,
          }}
        >
          {Icon.search(18, t.textTer)}
          <input
            type="text"
            name="search"
            aria-label="Поиск товаров и магазинов"
            placeholder="Товары и магазины"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              fontSize: 16,
              border: "none",
              background: "transparent",
              fontFamily: FONT(),
              color: t.text,
              WebkitAppearance: "none",
              appearance: "none",
              outline: "none",
            }}
          />
          {query && (
            <button
              aria-label="Очистить поиск"
              onClick={() => setQuery("")}
              style={{
                minWidth: 44,
                minHeight: 44,
                margin: "-10px",
                cursor: "pointer",
                border: "none",
                background: "transparent",
                display: "grid",
                placeItems: "center",
              }}
            >
              {Icon.close(16, t.textTer)}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            fontSize: 14,
            color: t.primaryDeep,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: FONT(),
          }}
        >
          Отмена
        </button>
      </div>

      {!debouncedQuery ? (
        <div className="app-readable-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 11,
              color: t.textSec,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              padding: "12px 16px 8px",
              fontWeight: 600,
            }}
          >
            Популярные категории
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              padding: "0 16px",
            }}
          >
            {categories.map((c) => (
              <button
                key={c.label}
                onClick={() => setQuery(c.query)}
                type="button"
                style={{
                  minHeight: 44,
                  padding: "8px 14px",
                  borderRadius: 9999,
                  background: t.surface,
                  border: `1px solid ${t.divider}`,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: t.text,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 260,
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: t.textSec,
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: t.surface,
                border: `1px solid ${t.divider}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              {Icon.search(32, t.textTer)}
            </div>
            <div style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 750, color: t.text }}>Найдите товар или магазин</div>
            <div style={{ maxWidth: 300, marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
              Введите название магазина, товара или выберите популярную категорию выше.
            </div>
          </div>
        </div>
      ) : (
        <div className="app-readable-content" style={{ flex: 1, overflowY: "auto" }}>
          {isLoading && (
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton w="100%" h={96} radius={14} />
              <Skeleton w="100%" h={96} radius={14} />
              <Skeleton w="100%" h={96} radius={14} />
            </div>
          )}
          {error && (
            <ErrorState message="Не удалось загрузить результаты. Проверьте соединение и попробуйте ещё раз." />
          )}
          {!isLoading && !error && offers && offers.length > 0
            ? offers.map((item) => (
                <button
                  key={item.offer.id}
                  type="button"
                  onClick={() => router.push(`/offers/${item.offer.id}`)}
                  style={{
                    width: "100%",
                    display: "flex",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: `1px solid ${t.divider}`,
                    borderTop: "none",
                    borderRight: "none",
                    borderLeft: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <OfferImagePreview imageUrl={item.offer.image_url} label="товар" width={64} height={64} radius={10} tone="mint" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.text, overflowWrap: "anywhere" }}>{item.offer.name}</div>
                    <div style={{ fontSize: 12, color: t.textSec, overflowWrap: "anywhere" }}>
                      {item.partner.name || item.partner_name}
                    </div>
                    {item.offer.description && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          lineHeight: 1.35,
                          color: t.textSec,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.offer.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 8 }}>
                    <PriceTag now={item.offer.price ?? item.offer.new_price} original={item.offer.old_price ?? null} size="sm" />
                    <Badge tone={availabilityCopy(item.offer.availability, item.offer.stock).tone} size="sm">
                      {availabilityCopy(item.offer.availability, item.offer.stock).label}
                    </Badge>
                  </div>
                </button>
              ))
            : !isLoading &&
              !error &&
              offers && (
                <EmptyState
                  icon={Icon.search(34, t.textTer)}
                  title="Ничего не нашлось"
                  description="Попробуйте другой запрос, уберите лишние слова или выберите одну из популярных категорий."
                  compact
                  action={
                    <PillButton
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        setDebouncedQuery("");
                      }}
                    >
                      Очистить поиск
                    </PillButton>
                  }
                />
              )}
        </div>
      )}
    </div>
  );
}
