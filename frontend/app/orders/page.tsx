"use client";

import { QrCode } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { OrderSummary, statusLabel } from "@/lib/api-types";
import { useAuth } from "@/hooks/useAuth";
import { TabBar } from "@/components/TabBar";
import { tokens, FONT, PillButton } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/Skeleton";
import LoginForm from "@/components/LoginForm";
import AppHeader from "@/components/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";

  const { data: orders, isLoading, error } = useSWR<OrderSummary[]>(isAuthenticated ? "/orders/" : null, (url: string) =>
    api.get<OrderSummary[]>(url),
  );
  const hasOrders = Array.isArray(orders) && orders.length > 0;

  if (authLoading) return <div style={{ background: t.bg, height: "100vh" }} />;
  if (!isAuthenticated) return <LoginForm />;

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
      <AppHeader title="Брони" hideBack size="lg" />

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {isLoading && (
          <>
            <Skeleton w="100%" h={70} radius={16} />
            <Skeleton w="100%" h={70} radius={16} />
            <Skeleton w="100%" h={70} radius={16} />
          </>
        )}

        {!isLoading && error && <ErrorState message="Не удалось загрузить заказы. Проверьте соединение и попробуйте ещё раз." />}

        {!isLoading && !error && !hasOrders && (
          <EmptyState
            icon={<QrCode size={40} color={t.textTer} />}
            title="Пока нет броней"
            description="Когда забронируете первую позицию, здесь появятся активные и завершённые брони."
            action={
              <PillButton variant="outline" onClick={() => router.push("/")}>
                Найти позиции
              </PillButton>
            }
          />
        )}

        {!isLoading &&
          !error &&
          hasOrders &&
          orders.map((order) => (
            <button
              type="button"
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              style={{
                width: "100%",
                textAlign: "left",
                background: t.surface,
                borderRadius: 16,
                padding: "16px",
                cursor: "pointer",
                border: `1px solid ${t.divider}`,
                color: t.text,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{order.offer.name}</div>
                  <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
                    {order.partner.name} · {order.total} ₸
                  </div>
                  <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>
                    {statusLabel(order.status)} · {new Date(order.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                {<QrCode size={24} color={t.primaryDeep} />}
              </div>
            </button>
          ))}
      </div>

      <TabBar />
    </div>
  );
}
