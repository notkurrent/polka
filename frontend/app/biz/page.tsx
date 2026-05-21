"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { tokens, Icon, FONT, Badge } from "@/components/ui/primitives";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { AppScreenBiz, StatTile, ActionCard } from "@/components/biz/BizShared";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import { bizApi, money, partnerErrorMessage, partnerStatusLabel } from "@/lib/biz-api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";
import type { OfferPublic } from "@/lib/api-types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/app";
import { isTelegramAccountIncomplete } from "@/lib/account-linking";
import { AccountLinkingPrompt } from "@/components/account/AccountLinkingPrompt";

function initials(name?: string) {
  return (name || "P")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function availabilityLabel(offer: OfferPublic) {
  if (offer.availability === "HIDDEN") return "Скрыт";
  if (offer.availability === "PREORDER") return "Предзаказ";
  if (offer.availability === "OUT_OF_STOCK" || offer.stock <= 0) return "Нет в наличии";
  return "В наличии";
}

export default function BizDashboardPage() {
  const t = tokens();
  const router = useRouter();
  const fontFn = FONT ? FONT() : "system-ui";
  const { user } = useAuth();
  const linkPromptDismissed = useAppStore((state) => state.accountLinkPromptDismissed);
  const completionPromptDismissed = useAppStore((state) => state.accountCompletionPromptDismissed);
  const dismissLinkPrompt = useAppStore((state) => state.dismissAccountLinkPrompt);
  const dismissCompletionPrompt = useAppStore((state) => state.dismissAccountCompletionPrompt);

  const { data: profile, error: profileError, isLoading: profileLoading } = useSWR("/partner-api/profile", bizApi.profile);
  const isApproved = profile?.status === "APPROVED";
  const { data: offers, isLoading: offersLoading } = useSWR<OfferPublic[]>(
    isApproved ? "/partner-api/offers" : null,
    bizApi.offers,
  );

  const activeProducts = (offers || []).filter((offer) => offer.availability === "IN_STOCK" && offer.stock > 0).length;
  const hiddenProducts = (offers || []).filter((offer) => offer.availability === "HIDDEN").length;
  const needsProfile = profileError && partnerErrorMessage(profileError).includes("зарегистрируйте");

  return (
    <AppScreenBiz style={{ background: t.bg }}>
      <div
        style={{
          paddingTop: "calc(18px + var(--app-safe-top))",
          paddingRight: 20,
          paddingBottom: 12,
          paddingLeft: 20,
          background: t.bg,
          borderBottom: `1px solid ${t.divider}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: t.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: t.primaryDeep,
              fontSize: 15,
            }}
          >
            {initials(profile?.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: t.textSec }}>Кабинет продавца</div>
            <div style={{ fontSize: 16, fontWeight: 750, letterSpacing: "-0.2px" }}>
              {profile?.name || "Мой магазин"}
            </div>
          </div>
          <button
            type="button"
            aria-label="Открыть профиль магазина"
            onClick={() => router.push("/biz/profile")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              border: "none",
              cursor: "pointer",
              background: t.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon.user(20, t.text)}
          </button>
        </div>
      </div>

      {needsProfile && (
        <div style={{ padding: 16 }}>
          <EmptyState
            icon={Icon.user(34, t.textTer)}
            title="Зарегистрируйте магазин"
            description="После регистрации здесь появится статус магазина и управление товарами."
            compact
          />
          <button
            type="button"
            onClick={() => router.push("/biz/register")}
            style={{
              marginTop: 12,
              width: "100%",
              height: 48,
              border: "none",
              borderRadius: 14,
              background: t.primaryDeep,
              color: "#fff",
              fontWeight: 700,
              fontFamily: fontFn,
            }}
          >
            Зарегистрировать
          </button>
        </div>
      )}

      {!needsProfile && profileError && !profileLoading && (
        <div style={{ padding: 16 }}>
          <ErrorState message={partnerErrorMessage(profileError)} />
        </div>
      )}

      {!needsProfile && profileLoading && (
        <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton w="100%" h={74} radius={14} />
          <Skeleton w="100%" h={74} radius={14} />
        </div>
      )}

      {!needsProfile && !profileError && !profileLoading && profile && !isApproved && (
        <PartnerModerationState profile={profile} />
      )}

      {!needsProfile && !profileError && !profileLoading && isApproved && profile && (
        <div className="biz-dashboard-main">
          {isTelegramAccountIncomplete(user) && (!completionPromptDismissed || !linkPromptDismissed) && (
            <div style={{ padding: "14px 16px 0" }}>
              <AccountLinkingPrompt
                tone="business"
                onDismiss={() => {
                  dismissCompletionPrompt();
                  dismissLinkPrompt();
                }}
              />
            </div>
          )}

          <div style={{ padding: "14px 16px 0" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <StatTile value={activeProducts} label="В продаже" accent />
              <StatTile value={offers?.length || 0} label="Всего товаров" />
              <StatTile value={hiddenProducts} label="Скрыто" />
            </div>
          </div>

          <div style={{ padding: "16px 16px 0" }}>
            <div
              style={{
                border: `1px solid ${t.divider}`,
                borderRadius: 14,
                padding: 14,
                background: t.bg,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: t.primarySoft,
                  color: t.primaryDeep,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                {Icon.bag(22, t.primaryDeep)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 750, color: t.text }}>Магазин</div>
                  <Badge tone="solid" size="sm">
                    {partnerStatusLabel(profile.status)}
                  </Badge>
                </div>
                <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.45, color: t.textSec }}>
                  {profile.category || "Категория не указана"} · {profile.address}
                </div>
                {profile.description && (
                  <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.45, color: t.textSec }}>
                    {profile.description}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: "18px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.2px" }}>Товары</div>
              <button
                type="button"
                onClick={() => router.push("/biz/offers")}
                style={{
                  minHeight: 44,
                  padding: "0 4px",
                  fontSize: 12,
                  fontWeight: 650,
                  color: t.primaryDeep,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: fontFn,
                }}
              >
                Все товары
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {offersLoading && (
                <>
                  <Skeleton w="100%" h={74} radius={14} />
                  <Skeleton w="100%" h={74} radius={14} />
                </>
              )}
              {!offersLoading && (!offers || offers.length === 0) && (
                <EmptyState
                  icon={Icon.plus(34, t.textTer)}
                  title="Пока нет товаров"
                  description="Добавьте первый товар, чтобы он появился в магазине."
                  compact
                />
              )}
              {!offersLoading &&
                offers?.slice(0, 3).map((offer) => (
                  <button
                    key={offer.id}
                    type="button"
                    onClick={() => router.push("/biz/offers")}
                    style={{
                      width: "100%",
                      minHeight: 72,
                      padding: "10px 12px",
                      border: `1px solid ${t.divider}`,
                      borderRadius: 14,
                      background: t.bg,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      fontFamily: fontFn,
                      textAlign: "left",
                      color: t.text,
                    }}
                  >
                    <OfferImagePreview imageUrl={offer.image_url} label="товар" width={52} height={52} radius={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 750, overflowWrap: "anywhere" }}>{offer.name}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: t.textSec }}>
                        {availabilityLabel(offer)} · {offer.stock} шт
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.primaryDeep }}>{money(offer.price)}</div>
                  </button>
                ))}
            </div>
          </div>

          <div style={{ padding: "16px 16px 16px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.2px", marginBottom: 10 }}>
              Быстрые действия
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              <ActionCard icon={Icon.plus} label="Добавить товар" onClick={() => router.push("/biz/offers/new")} primary />
              <ActionCard icon={Icon.bag} label="Мои товары" onClick={() => router.push("/biz/offers")} />
              <ActionCard icon={Icon.user} label="Профиль магазина" onClick={() => router.push("/biz/profile")} />
            </div>
          </div>
        </div>
      )}
      <BizTabBar />
    </AppScreenBiz>
  );
}
