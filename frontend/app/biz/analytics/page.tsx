"use client";

import useSWR from "swr";
import { AppHeaderBiz, StatTile } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
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
  orderStatus,
  orderTitle,
  partnerErrorMessage,
  type PartnerOrder,
} from "@/lib/biz-api";

export default function BizAnalyticsScreen() {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: offers } = useSWR("/partner-api/offers", bizApi.offers);
  const { data: orders, isLoading, error } = useSWR<PartnerOrder[]>("/partner-api/orders", bizApi.orders);
  const stats = buildBizStats(offers, orders);
  const completed = (orders || []).filter((order) => orderStatus(order).toUpperCase() === "COMPLETED").slice(0, 5);

  return (
    <div className="screen-scroll-with-tabbar" style={{ background: t.bg, fontFamily: fontFn }}>
      <AppHeaderBiz title="Аналитика" />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {isLoading && (
          <>
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={160} radius={12} />
          </>
        )}
        {error && <ErrorState message={partnerErrorMessage(error)} />}
        {!isLoading && !error && (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <StatTile value={money(stats.totalRevenue)} label="Выручка всего" accent />
              <StatTile value={stats.completedOrders} label="Выдано" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <StatTile value={stats.activeOffers} label="Активных позиций" />
            </div>

            <div style={{ background: t.bg, border: `1px solid ${t.divider}`, borderRadius: 12, overflow: "hidden" }}>
              <div
                style={{ padding: "12px 16px", fontSize: 13, fontWeight: 750, borderBottom: `1px solid ${t.divider}` }}
              >
                Последние выдачи
              </div>
              {completed.length === 0 ? (
                <div style={{ padding: 16, color: t.textSec, fontSize: 13, lineHeight: 1.45 }}>
                  Здесь появятся завершённые заказы после проверки кода.
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
                и выдачи.
              </div>
            </div>
          </>
        )}
      </div>
      <BizTabBar />
    </div>
  );
}
