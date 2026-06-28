"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ALMATY_CENTER, NearbyOffer, OfferAvailability } from "@/lib/api-types";
import { isTelegramAuthContext, nextRouteForBusiness } from "@/lib/auth-routing";
import { isTelegramAccountIncomplete } from "@/lib/account-linking";
import { useAppStore } from "@/store/app";
import { AccountLinkingPrompt } from "@/components/account/AccountLinkingPrompt";
import { TabBar } from "@/components/TabBar";
import { tokens, Icon, FONT, Badge, PriceTag, PillButton } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";
import { BusinessLogoPreview } from "@/components/biz/BusinessLogoPicker";

function availabilityCopy(availability: OfferAvailability, stock: number) {
  if (availability === "OUT_OF_STOCK" || stock <= 0) return { label: "Нет в наличии", tone: "neutral" as const };
  if (availability === "PREORDER") return { label: "Под заказ", tone: "amber" as const };
  return { label: stock <= 2 ? `В наличии: ${stock}` : "В наличии", tone: "green" as const };
}

export default function AppScreenBuyerPage() {
  const { user, isAuthenticated, isLoading: authLoading, telegramAuthError } = useAuth();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const router = useRouter();

  const {
    location,
    onboardingDone,
    selectedMode,
    favorites,
    accountLinkPromptDismissed,
    accountCompletionPromptDismissed,
    setSelectedModeForUser,
    toggleFavorite,
    dismissAccountLinkPrompt,
    dismissAccountCompletionPrompt,
  } = useAppStore();

  const [filter, setFilter] = useState("all");
  const lat = location?.lat || ALMATY_CENTER.lat;
  const lon = location?.lon || ALMATY_CENTER.lon;

  const {
    data: catalogOffers,
    isLoading: isOffersLoading,
    error,
  } = useSWR<NearbyOffer[]>(
    isAuthenticated && selectedMode === "buyer" ? `/offers/nearby?lat=${lat}&lon=${lon}&radius=50000` : null,
    (url: string) => api.get<NearbyOffer[]>(url),
    { keepPreviousData: true },
  );

  useEffect(() => {
    if (authLoading) return;
    const isTMA = isTelegramAuthContext();
    const requestedMode =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("mode") ||
          window.sessionStorage.getItem("polka:requested-mode")
        : null;

    if (!isAuthenticated) {
      if (!isTMA) router.replace("/landing");
      return;
    }

    if (requestedMode === "buyer") {
      if (user?.id) setSelectedModeForUser(user.id, "buyer");
      window.sessionStorage.removeItem("polka:requested-mode");
      if (!onboardingDone) {
        router.replace("/onboarding");
      } else if (window.location.search) {
        router.replace("/");
      }
      return;
    }

    if (!selectedMode) {
      router.replace("/choose-role?auto=1");
    } else if (selectedMode === "business") {
      router.replace(nextRouteForBusiness(user));
    } else if (!onboardingDone) {
      router.replace("/onboarding");
    }
  }, [authLoading, isAuthenticated, onboardingDone, router, selectedMode, setSelectedModeForUser, user]);

  const products = useMemo(
    () =>
      (catalogOffers || []).map((item) => ({
        id: String(item.offer.id),
        storeId: String(item.offer.partner_id),
        storeName: item.partner.name || item.partner_name,
        title: item.offer.name,
        desc: item.offer.description || "Описание появится у продавца позже.",
        original: item.offer.old_price,
        now: item.offer.price ?? item.offer.new_price,
        imageUrl: item.offer.image_url,
        logoUrl: item.partner.logo_url,
        cat: item.partner.category || item.offer.type,
        availability: item.offer.availability,
        stock: item.offer.stock,
        storeAddress: item.partner.address,
      })),
    [catalogOffers],
  );

  const filters = useMemo(
    () => [
      { id: "all", label: "Все" },
      { id: "Кофейня", label: "Кофейни" },
      { id: "Пекарня", label: "Пекарни" },
      { id: "Ресторан", label: "Рестораны" },
      { id: "Кондитерская", label: "Десерты" },
      { id: "Магазин", label: "Магазины" },
    ],
    [],
  );
  const visibleProducts = filter === "all" ? products : products.filter((product) => product.cat === filter);
  const stores = useMemo(() => {
    const map = new Map<string, { id: string; name: string; logoUrl?: string | null; category: string; address: string; count: number }>();
    visibleProducts.forEach((product) => {
      const current = map.get(product.storeId);
      if (current) {
        current.count += 1;
        return;
      }
      map.set(product.storeId, {
        id: product.storeId,
        name: product.storeName,
        logoUrl: product.logoUrl,
        category: product.cat || "Магазин",
        address: product.storeAddress,
        count: 1,
      });
    });
    return Array.from(map.values());
  }, [visibleProducts]);

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
          <div style={{ fontSize: 14, color: t.textSec, lineHeight: 1.45 }}>{copy.body}</div>
        </div>
      </div>
    );
  }

  if (authLoading || !isAuthenticated || selectedMode !== "buyer") {
    return <div style={{ height: "100vh", background: t.bg }} />;
  }

  return (
    <div
      className="buyer-catalog-screen screen-scroll-with-tabbar"
      style={{
        width: "100%",
        background: t.bg,
        fontFamily: fontFn,
        color: t.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        className="buyer-catalog-header"
        style={{
          paddingTop: "calc(14px + var(--app-safe-top))",
          paddingRight: 16,
          paddingBottom: 10,
          paddingLeft: 16,
          background: t.bg,
          position: "sticky",
          top: 0,
          zIndex: 30,
          borderBottom: `1px solid ${t.divider}`,
        }}
      >
        <div
          className="buyer-catalog-header-inner"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <div style={{ fontSize: 28, lineHeight: 1.05, fontWeight: 850, letterSpacing: 0 }}>Каталог</div>
            <div style={{ marginTop: 4, fontSize: 13, color: t.textSec }}>Товары и магазины Polka</div>
          </div>
          <Link
            className="buyer-catalog-favorite-shortcut"
            href="/favorites"
            aria-label="Открыть избранное"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `1px solid ${t.divider}`,
              cursor: "pointer",
              background: t.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            {Icon.heart(18, t.primaryDeep)}
          </Link>
        </div>

        <div
          className="buyer-catalog-controls"
          style={{
            marginTop: 12,
          }}
        >
          <Link
            className="buyer-search-trigger"
            href="/search"
            style={{
              width: "100%",
              background: t.surface,
              borderRadius: 12,
              border: `1px solid ${t.divider}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 12px",
              cursor: "pointer",
              textAlign: "left",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            {Icon.search(18, t.textTer)}
            <span style={{ fontSize: 14, color: t.textTer, flex: 1 }}>Искать товары и магазины</span>
          </Link>

          <div
            className="buyer-filter-row"
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
            {filters.map((item) => (
              <button
                className="buyer-filter-chip"
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                data-haptic="selection"
                style={{
                  flexShrink: 0,
                  minHeight: 44,
                  padding: "6px 14px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 650,
                  fontFamily: fontFn,
                  border: `1px solid ${filter === item.id ? t.primaryDeep : t.divider}`,
                  background: filter === item.id ? t.primaryDeep : "#fff",
                  color: filter === item.id ? "#fff" : t.text,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: 0,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isTelegramAccountIncomplete(user) && (!accountCompletionPromptDismissed || !accountLinkPromptDismissed) && (
        <div className="app-content buyer-account-prompt" style={{ padding: "12px 16px 0" }}>
          <AccountLinkingPrompt
            onDismiss={() => {
              dismissAccountCompletionPrompt();
              dismissAccountLinkPrompt();
            }}
          />
        </div>
      )}

      {(isOffersLoading || (!catalogOffers && !error) || stores.length > 0) && (
        <section className="app-content buyer-catalog-section buyer-stores-section" style={{ padding: "16px 16px 0" }}>
          <div
            className="buyer-section-heading"
            style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}
          >
            <div style={{ fontSize: 17, fontWeight: 750, letterSpacing: 0 }}>Магазины</div>
            {stores.length > 0 ? <div style={{ fontSize: 12, color: t.textSec }}>{stores.length}</div> : null}
          </div>
          {isOffersLoading || (!catalogOffers && !error) ? (
            <div className="buyer-store-list" style={{ display: "flex", gap: 10, overflowX: "auto" }}>
              <Skeleton w={180} h={82} radius={14} />
              <Skeleton w={180} h={82} radius={14} />
              <Skeleton w={180} h={82} radius={14} />
            </div>
          ) : (
            <div className="buyer-store-list" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
              {stores.map((store) => (
                <Link
                  className="buyer-store-card"
                  key={store.id}
                  href={`/stores/${store.id}`}
                  style={{
                    width: 210,
                    flexShrink: 0,
                    minHeight: 88,
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${t.divider}`,
                    background: t.bg,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    cursor: "pointer",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <BusinessLogoPreview logoUrl={store.logoUrl} businessName={store.name} size={48} radius={12} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 750, overflowWrap: "anywhere" }}>{store.name}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: t.textSec, overflowWrap: "anywhere" }}>{store.category}</div>
                    <div style={{ marginTop: 5, fontSize: 11, color: t.primaryDeep, fontWeight: 700 }}>
                      {store.count} товар{store.count === 1 ? "" : "а"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="app-content buyer-catalog-section buyer-products-section" style={{ padding: "18px 16px 0" }}>
        <div
          className="buyer-section-heading"
          style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}
        >
          <div style={{ fontSize: 17, fontWeight: 750, letterSpacing: 0 }}>Товары</div>
          <div style={{ fontSize: 12, color: t.textSec }}>{visibleProducts.length}</div>
        </div>

        {error ? (
          <div className="buyer-products-state">
            <ErrorState message="Не удалось загрузить каталог. Проверьте соединение и попробуйте ещё раз." />
          </div>
        ) : (isOffersLoading || (!catalogOffers && !error)) && !error ? (
          <div className="buyer-products-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="buyer-offer-card" key={index} style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${t.divider}` }}>
                <Skeleton w="100%" h="var(--buyer-offer-image-height, 150px)" radius={0} />
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <Skeleton w="80%" h={16} />
                  <Skeleton w="62%" h={12} />
                  <Skeleton w={100} h={20} />
                </div>
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="buyer-products-state buyer-products-empty" style={{ background: t.bg, borderRadius: 18, border: `1px solid ${t.divider}`, overflow: "hidden" }}>
            <EmptyState
              icon={Icon.bag(34, t.textTer)}
              title={filter === "all" ? "Каталог пока пуст" : "В этой категории пока пусто"}
              description={
                filter === "all"
                  ? "Когда продавцы добавят товары, они появятся в каталоге."
                  : "Сбросьте фильтр или выберите другую категорию."
              }
              compact
              action={
                filter === "all" ? undefined : (
                  <PillButton variant="outline" onClick={() => setFilter("all")}>
                    Показать все
                  </PillButton>
                )
              }
            />
          </div>
        ) : (
          <div className="buyer-products-grid">
            {visibleProducts.map((product) => {
              const availability = availabilityCopy(product.availability, product.stock);
              return (
                <article
                  key={product.id}
                  className="buyer-offer-card"
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
                    position: "relative",
                  }}
                >
                  <Link
                    href={`/offers/${product.id}`}
                    aria-label={`Открыть товар ${product.title}`}
                    style={{ position: "absolute", inset: 0, zIndex: 1, borderRadius: "inherit" }}
                  />
                  <div className="buyer-offer-media" style={{ position: "relative" }}>
                    <OfferImagePreview
                      imageUrl={product.imageUrl}
                      label="товар"
                      width="100%"
                      height="var(--buyer-offer-image-height, 150px)"
                      radius={0}
                      tone="mint"
                    />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(product.storeId);
                      }}
                      data-haptic="selection"
                      aria-label={favorites.includes(product.storeId) ? "Убрать магазин из избранного" : "Добавить магазин в избранное"}
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
                        zIndex: 2,
                      }}
                    >
                      {Icon.heart(
                        16,
                        favorites.includes(product.storeId) ? t.danger : t.text,
                        favorites.includes(product.storeId),
                      )}
                    </button>
                  </div>

                  <div className="buyer-offer-card-body" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <BusinessLogoPreview logoUrl={product.logoUrl} businessName={product.storeName} size={38} radius={10} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 750, letterSpacing: 0, overflowWrap: "anywhere" }}>
                          {product.title}
                        </h2>
                        <div style={{ fontSize: 12, color: t.textSec, marginTop: 2, overflowWrap: "anywhere" }}>
                          {product.storeName}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
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
                      {product.desc}
                    </div>

                    <div className="buyer-offer-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <PriceTag original={product.original} now={product.now} size="md" />
                      <Badge tone={availability.tone} size="sm">
                        {availability.label}
                      </Badge>
                    </div>

                    <div className="buyer-offer-card-action" style={{ position: "relative", zIndex: 2 }}>
                      {product.availability === "OUT_OF_STOCK" || product.stock <= 0 ? (
                        <PillButton variant="dark" size="sm" disabled>
                          Связаться
                        </PillButton>
                      ) : (
                        <Link
                          href={`/offers/${product.id}`}
                          onMouseDown={(event) => {
                            event.currentTarget.style.transform = "scale(0.97)";
                          }}
                          onMouseUp={(event) => {
                            event.currentTarget.style.transform = "scale(1)";
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.transform = "scale(1)";
                          }}
                          style={{
                            minHeight: 44,
                            height: 44,
                            padding: "0 16px",
                            width: "auto",
                            background: t.primaryDeep,
                            color: "#fff",
                            border: "none",
                            borderRadius: 9999,
                            fontSize: 14,
                            fontWeight: 600,
                            fontFamily: FONT(),
                            cursor: "pointer",
                            opacity: 1,
                            letterSpacing: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            transition: "transform 0.1s ease, opacity 0.2s ease",
                            touchAction: "manipulation",
                            WebkitTapHighlightColor: "transparent",
                            textDecoration: "none",
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          Связаться
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div style={{ height: 16 }} />
      </section>

      <TabBar />
    </div>
  );
}
