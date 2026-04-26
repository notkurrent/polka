"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ALMATY_CENTER, formatDistance, NearbyOffer } from "@/lib/api-types";
import { isTelegramAuthContext, nextRouteForBusiness } from "@/lib/auth-routing";
import { isTelegramAccountIncomplete } from "@/lib/account-linking";
import { useAppStore } from "@/store/app";
import { AccountLinkingPrompt } from "@/components/account/AccountLinkingPrompt";
import { TabBar } from "@/components/TabBar";
import { tokens, Icon, FONT, StripePlaceholder, Badge, PriceTag, GridMap, PillButton } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function mapPinPosition(lat: number | null | undefined, lon: number | null | undefined, centerLat: number, centerLon: number) {
  if (lat == null || lon == null) return null;
  return {
    x: clamp(50 + (lon - centerLon) * 900, 10, 90),
    y: clamp(50 - (lat - centerLat) * 1100, 10, 90),
  };
}

export default function AppScreenBuyerPage() {
  const { user, isAuthenticated, isLoading: authLoading, telegramAuthError } = useAuth();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const router = useRouter();

  const {
    location,
    cart,
    onboardingDone,
    selectedMode,
    favorites,
    accountLinkPromptDismissed,
    accountCompletionPromptDismissed,
    toggleFavorite,
    dismissAccountLinkPrompt,
    dismissAccountCompletionPrompt,
  } = useAppStore();
  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);

  const [layout] = useState<"map+list" | "list-only" | "map-only">("list-only");
  const [filter, setFilter] = useState("all");
  const [selectedPin, setSelectedPin] = useState(-1);

  // Default to Almaty coordinates if not present
  const lat = location?.lat || ALMATY_CENTER.lat;
  const lon = location?.lon || ALMATY_CENTER.lon;

  const { data: nearbyOffers, isLoading: isOffersLoading, error } = useSWR<NearbyOffer[]>(
    isAuthenticated && selectedMode === "buyer" ? `/offers/nearby?lat=${lat}&lon=${lon}&radius=5000` : null,
    (url: string) => api.get<NearbyOffer[]>(url),
    { keepPreviousData: true }
  );

  useEffect(() => {
    if (authLoading) return;
    const isTMA = isTelegramAuthContext();

    if (!isAuthenticated) {
      if (isTMA) {
        // TMA: auth happens automatically in useAuth hook
        // Do not redirect to landing
      } else {
        router.replace("/landing");
      }
    } else if (!selectedMode) {
      router.replace("/choose-role?auto=1");
    } else if (selectedMode === "business") {
      router.replace(nextRouteForBusiness(user));
    } else if (!onboardingDone) {
      router.replace("/onboarding");
    }
  }, [authLoading, isAuthenticated, onboardingDone, router, selectedMode, user]);

  if (!authLoading && isTelegramAuthContext() && !isAuthenticated && telegramAuthError) {
    const telegramAuthCopy = {
      missing_init_data: {
        title: "Откройте Polka через Mini App-кнопку",
        body: "Telegram не передал данные сессии. Откройте именно Mini App-кнопку в Telegram, не обычную ссылку.",
      },
      failed: {
        title: "Telegram-сессию не удалось проверить",
        body: "Проверьте, что Mini App привязан к этому боту и на сервере указан правильный TELEGRAM_BOT_TOKEN.",
      },
      network: {
        title: "Не удалось связаться с сервером",
        body: "Проверьте интернет и попробуйте открыть Mini App ещё раз. Если ошибка повторится, проверьте backend /auth/telegram.",
      },
    } as const;
    const copy = telegramAuthCopy[telegramAuthError];

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: t.bg,
          color: t.text,
          fontFamily: fontFn,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 320 }}>
          <div style={{ fontSize: 18, fontWeight: 750, marginBottom: 8 }}>{copy.title}</div>
          <div style={{ fontSize: 14, color: t.textSec, lineHeight: 1.45 }}>
            {copy.body}
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || !isAuthenticated || selectedMode !== "buyer") {
    return <div style={{ height: "100vh", background: t.bg }} />;
  }

  const filters = [
    { id: "all", label: "Все" },
    { id: "Пекарня", label: "Пекарни" },
    { id: "MAGIC_BOX", label: "Сюрпризы" },
  ];

  // Map to FlattenedOffer format used by Buyer screens
  const ALL_OFFERS = (nearbyOffers || []).map((o) => ({
    id: String(o.offer.id),
    storeId: String(o.offer.partner_id),
    storeName: o.partner.name || o.partner_name,
    partnerLat: o.partner.lat,
    partnerLon: o.partner.lon,
    distanceText: formatDistance(o.distance),
    pickup: o.partner.hours,
    qty: o.offer.stock,
    title: o.offer.name,
    original: o.offer.old_price,
    now: o.offer.new_price,
    label: o.offer.type === "MAGIC_BOX" ? "Сюрприз" : undefined,
    tone: o.offer.type === "MAGIC_BOX" ? "purple" : "orange",
    cat: o.offer.type,
  }));

  // visible filters
  const visibleOffers = filter === "all" ? ALL_OFFERS : ALL_OFFERS.filter((o) => o.cat === filter);

  // Group by store for stable map pins.
  const stores = Array.from(new Set(visibleOffers.map((o) => o.storeId))).map((storeId) => {
    const o = visibleOffers.find((off) => off.storeId === storeId)!;
    const point = mapPinPosition(o.partnerLat, o.partnerLon, lat, lon);
    return {
      id: storeId,
      offerId: o.id,
      cat: o.cat,
      x: point?.x ?? 50,
      y: point?.y ?? 50,
      offers: [o],
    };
  });

  const pins = stores.map((s) => ({ x: s.x, y: s.y, label: `${s.offers[0].now} ₸` }));

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        overflow: "auto",
        background: t.bg,
        fontFamily: fontFn,
        color: t.text,
        WebkitFontSmoothing: "antialiased",
        paddingBottom: "calc(72px + var(--app-safe-bottom))",
      }}
    >
      {/* Header (location + search) */}
      <div
        style={{
          paddingTop: "calc(12px + var(--app-safe-top))",
          paddingRight: "16px",
          paddingBottom: "8px",
          paddingLeft: "16px",
          background: t.bg,
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: t.primaryDeep }}>
            {Icon.pin(16, t.primaryDeep)}
            <div>
              <div style={{ fontSize: 10, color: t.textSec, lineHeight: 1 }}>Доставка</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2 }}>Самовывоз · Алматы</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            aria-label="Открыть корзину"
            onClick={() => router.push("/cart")}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: cartCount > 0 ? t.primary : t.surface,
              color: t.primaryDeep,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon.bag(18, t.primaryDeep)}
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 8,
                  background: t.primaryDeep,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div
          onClick={() => router.push("/search")}
          style={{
            marginTop: 10,
            background: t.surface,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            cursor: "pointer",
          }}
        >
          {Icon.search(18, t.textTer)}
          <span style={{ fontSize: 14, color: t.textTer, flex: 1 }}>Кафе, блюда, районы…</span>
          {Icon.filter(18, t.textTer)}
        </div>

        {/* Filter chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 10,
            overflowX: "auto",
            marginLeft: -16,
            marginRight: -16,
            padding: "0 16px",
          }}
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0,
                minHeight: 44,
                padding: "6px 14px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: fontFn,
                border: `1px solid ${filter === f.id ? t.primaryDeep : t.divider}`,
                background: filter === f.id ? t.primaryDeep : "#fff",
                color: filter === f.id ? "#fff" : t.text,
                cursor: "pointer",
                whiteSpace: "nowrap",
                letterSpacing: 0,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isTelegramAccountIncomplete(user) && (!accountCompletionPromptDismissed || !accountLinkPromptDismissed) && (
        <div style={{ padding: "12px 16px 0" }}>
          <AccountLinkingPrompt
            onDismiss={() => {
              dismissAccountCompletionPrompt();
              dismissAccountLinkPrompt();
            }}
          />
        </div>
      )}

      {/* map */}
      {(layout === "map+list" || layout === "map-only") && (
        <div style={{ padding: "12px 16px 0" }}>
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: `1px solid ${t.divider}`,
            }}
          >
            <GridMap
              height={layout === "map-only" ? 400 : 180}
              pins={pins}
              selectedIdx={selectedPin}
              onPin={(i: number) => {
                setSelectedPin(i);
                router.push(`/offers/${stores[i].offerId}`);
              }}
              centerLabel={location ? "Вы здесь" : "Алматы · по умолчанию"}
            />
          </div>
        </div>
      )}

      {/* list of offers */}
      {layout !== "map-only" && (
        <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Рядом с вами</div>
            <div style={{ fontSize: 12, color: t.textSec }}>{visibleOffers.length} предложений</div>
          </div>

          {error ? (
            <ErrorState message="Не удалось загрузить предложения рядом. Проверьте соединение и попробуйте ещё раз." />
          ) : (isOffersLoading || (!nearbyOffers && !error)) && !error
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${t.divider}` }}>
                  <Skeleton w="100%" h={140} radius={0} />
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <Skeleton w={200} h={16} />
                    <Skeleton w={140} h={12} />
                    <Skeleton w={100} h={20} />
                  </div>
                </div>
              ))
            : visibleOffers.length === 0
              ? (
                <div
                  style={{
                    background: t.bg,
                    borderRadius: 18,
                    border: `1px solid ${t.divider}`,
                    overflow: "hidden",
                  }}
                  >
                  <EmptyState
                    icon={Icon.bag(34, t.textTer)}
                    title={filter === "all" ? "Пока ничего рядом" : "По этому фильтру пусто"}
                    description={
                      filter === "all"
                        ? "Когда рядом появятся новые позиции, они отобразятся здесь. Попробуйте позже или измените район."
                        : "Сбросьте фильтр или посмотрите другие категории — возможно, рядом есть другие предложения."
                    }
                    compact
                    action={
                      filter === "all" ? undefined : (
                        <PillButton
                          variant="outline"
                          onClick={() => setFilter("all")}
                        >
                          Показать все
                        </PillButton>
                      )
                    }
                  />
                </div>
              )
            : visibleOffers.map((offer) => (
                <div key={offer.id} style={{ display: "contents" }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/offers/${offer.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") router.push(`/offers/${offer.id}`);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: t.bg,
                      borderRadius: 18,
                      overflow: "hidden",
                      border: `1px solid ${t.divider}`,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      padding: 0,
                      color: t.text,
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <StripePlaceholder label={offer.label} h={140} radius={0} tone={offer.tone} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(offer.storeId);
                        }}
                        aria-label={favorites.includes(offer.storeId) ? "Убрать из избранного" : "Добавить в избранное"}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.92)",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        {Icon.heart(16, favorites.includes(offer.storeId) ? t.danger : t.text, favorites.includes(offer.storeId))}
                      </button>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 10,
                          left: 10,
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <Badge tone="dark" size="sm">
                          <span>●</span>
                          {offer.pickup}
                        </Badge>
                        {offer.qty <= 2 && (
                          <Badge tone="amber" size="sm">
                            Осталось {offer.qty}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0 }}>{offer.title}</div>
                          <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>
                            {offer.storeName} · {offer.distanceText}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, color: t.textSec, fontSize: 12 }}>
                          {Icon.clock(12, t.primaryDeep)}
                          <span style={{ fontWeight: 600, color: t.text }}>{offer.pickup}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <PriceTag original={offer.original} now={offer.now} size="md" />
                        <span
                          style={{
                            padding: "5px 10px",
                            borderRadius: 9999,
                            fontSize: 11,
                            background: t.primarySoft,
                            color: t.primaryDeep,
                            fontWeight: 700,
                          }}
                        >
                          −{Math.round((1 - offer.now / offer.original) * 100)}%
                        </span>
                      </div>
	                    </div>
	                  </div>
                </div>
              ))}
          <div style={{ height: 16 }} />
        </div>
      )}

      <TabBar />
    </div>
  );
}
