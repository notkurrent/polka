"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { tokens, Icon, FONT } from "@/components/ui/primitives";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { AppScreenBiz, StatTile, ActionCard, ReservationRow, type BizReservation } from "@/components/biz/BizShared";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import {
  bizApi,
  buildBizStats,
  formatOrderDate,
  isActiveOrder,
  money,
  orderCreatedAt,
  orderId,
  orderPrice,
  orderSubtitle,
  orderStatus,
  orderTitle,
  partnerErrorMessage,
  type PartnerOrder,
} from "@/lib/biz-api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
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

function toReservation(order: PartnerOrder): BizReservation {
  return {
    id: String(orderId(order)),
    user: `Клиент #${orderId(order)}`,
    offer: `${orderTitle(order)} · ${orderSubtitle(order)}`,
    price: money(orderPrice(order)),
    code: "",
    status: isActiveOrder(orderStatus(order)) ? "active" : orderStatus(order).toUpperCase() === "COMPLETED" ? "completed" : "expired",
    time: formatOrderDate(orderCreatedAt(order)),
  };
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
  const { data: offers } = useSWR<OfferPublic[]>(isApproved ? "/partner-api/offers" : null, bizApi.offers);
  const { data: orders, isLoading } = useSWR<PartnerOrder[]>(isApproved ? "/partner-api/orders" : null, bizApi.orders);

  const stats = buildBizStats(offers, orders);
  const activeReservations = (orders || []).filter((order) => isActiveOrder(orderStatus(order))).slice(0, 3);
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
            <div style={{ fontSize: 11, color: t.textSec }}>Партнёр</div>
            <div style={{ fontSize: 16, fontWeight: 750, letterSpacing: "-0.2px" }}>
              {profile?.name || "Бизнес-кабинет"}
            </div>
          </div>
          <button
            type="button"
            aria-label="Открыть профиль бизнеса"
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
            title="Зарегистрируйте заведение"
            description="После регистрации здесь появятся офферы, брони и выдача заказов."
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

      {!needsProfile && !profileError && !profileLoading && isApproved && (
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
              <StatTile value={stats.activeOrders} label="Активных броней" />
              <StatTile value={stats.activeOffers} label="Позиций в ленте" />
              <StatTile value={money(stats.todayRevenue)} label="Сегодня" accent />
            </div>
          </div>

          <div style={{ padding: "18px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.2px" }}>
                Активные брони · {stats.activeOrders}
              </div>
              <button
                type="button"
                onClick={() => router.push("/biz/scan")}
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
                Ввести код
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isLoading && (
                <>
                  <Skeleton w="100%" h={74} radius={14} />
                  <Skeleton w="100%" h={74} radius={14} />
                </>
              )}
              {!isLoading && activeReservations.length === 0 && (
                <div
                  style={{
                    minHeight: 72,
                    padding: "12px 14px",
                    border: `1px solid ${t.divider}`,
                    borderRadius: 14,
                    background: t.bg,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: t.surface,
                      color: t.textTer,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {Icon.list(22, t.textTer)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 750, color: t.text }}>Активных броней нет</div>
                    <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.35, color: t.textSec }}>
                      Новые заказы появятся после публикации позиции.
                    </div>
                  </div>
                </div>
              )}
              {activeReservations.map((order) => {
                const row = toReservation(order);
                return (
                  <ReservationRow
                    key={row.id}
                    r={row}
                    onClick={() => router.push(`/biz/scan?orderId=${row.id}`)}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ padding: "16px 16px 16px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.2px", marginBottom: 10 }}>
              Быстрые действия
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
              <ActionCard icon={Icon.plus} label="Новая позиция" onClick={() => router.push("/biz/offers/new")} primary />
              <ActionCard icon={Icon.check} label="Принять код" onClick={() => router.push("/biz/scan")} />
              <ActionCard icon={Icon.chart} label="Аналитика" onClick={() => router.push("/biz/analytics")} />
              <ActionCard icon={Icon.list} label="Все заказы" onClick={() => router.push("/biz/orders")} />
            </div>
          </div>
        </div>
      )}
      <BizTabBar />
    </AppScreenBiz>
  );
}
