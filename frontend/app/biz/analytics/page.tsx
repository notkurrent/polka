"use client";

import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz, StatTile } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import { Icon, tokens, FONT } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  bizApi,
  buildBizStats,
  formatOrderDate,
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

export default function BizAnalyticsScreen() {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: profile, isLoading: profileLoading, error: profileError } = useSWR("/partner-api/profile", bizApi.profile);
  const isApproved = profile?.status === "APPROVED";
  const { data: offers } = useSWR(isApproved ? "/partner-api/offers" : null, bizApi.offers);
  const { data: orders, isLoading, error } = useSWR<PartnerOrder[]>(
    isApproved ? "/partner-api/orders" : null,
    bizApi.orders,
  );
  const stats = buildBizStats(offers, orders);
  const completed = (orders || []).filter((order) => orderStatus(order).toUpperCase() === "COMPLETED").slice(0, 5);

  return (
    <AppScreenBiz style={{ background: t.bg, fontFamily: fontFn }}>
      <AppHeaderBiz title="Аналитика" />
      <div className="biz-orders-content" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {profileLoading && (
          <>
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={160} radius={12} />
          </>
        )}
        {profileError && <ErrorState message={partnerErrorMessage(profileError)} />}
        {!profileLoading && !profileError && profile && !isApproved && (
          <PartnerModerationState profile={profile} compact context="feature" />
        )}
        {isApproved && isLoading && (
          <>
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={160} radius={12} />
          </>
        )}
        {isApproved && error && <ErrorState message={partnerErrorMessage(error)} />}
        {isApproved && !isLoading && !error && (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <StatTile value={money(stats.totalRevenue)} label="Выручка всего" accent />
              <StatTile value={stats.completedOrders} label="Закрыто" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <StatTile value={stats.activeOffers} label="Активных товаров" />
            </div>

            <div style={{ background: t.bg, border: `1px solid ${t.divider}`, borderRadius: 12, overflow: "hidden" }}>
              <div
                style={{ padding: "12px 16px", fontSize: 13, fontWeight: 750, borderBottom: `1px solid ${t.divider}` }}
              >
                Последние заявки
              </div>
              {completed.length === 0 ? (
                <div style={{ padding: 16, color: t.textSec, fontSize: 13, lineHeight: 1.45 }}>
                  Здесь появятся завершённые заявки после подтверждения продавцом.
                </div>
              ) : (
                completed.map((order, index) => (
                  <div
                    key={orderId(order)}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      borderTop: index === 0 ? "none" : `1px solid ${t.divider}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 650 }}>{orderTitle(order)}</div>
                      <div style={{ fontSize: 11, color: t.textSec }}>{formatOrderDate(orderCreatedAt(order))}</div>
                      <div style={{ fontSize: 11, color: t.textSec }}>{orderSubtitle(order)}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 750, fontFamily: "ui-monospace, monospace" }}>
                      {money(orderPrice(order))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                background: t.primarySoft,
                color: t.primaryDeep,
                borderRadius: 12,
                padding: 14,
                display: "flex",
                gap: 10,
              }}
            >
              {Icon.chart(20, t.primaryDeep)}
              <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                Расширенные графики и отзывы останутся следующим шагом. Сейчас здесь отображаются только реальные суммы
                и заявки.
              </div>
            </div>
          </>
        )}
      </div>
      <BizTabBar />
    </AppScreenBiz>
  );
}
