"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { tokens, Icon, QRCode, PillButton, Badge } from "@/components/ui/primitives";
import AppHeader from "@/components/AppHeader";
import { api, getApiErrorMessage } from "@/lib/api";
import { isActiveOrder, OrderDetail, statusLabel } from "@/lib/api-types";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

function secondsUntilExpiration(order: OrderDetail, now: number) {
  if (order.expires_at) {
    const expiresAt = new Date(order.expires_at).getTime();
    if (Number.isFinite(expiresAt)) {
      return Math.max(0, Math.floor((expiresAt - now) / 1000));
    }
  }
  const createdAt = new Date(order.created_at).getTime();
  const fallbackExpiresAt = createdAt + 30 * 60 * 1000;
  return Math.max(0, Math.floor((fallbackExpiresAt - now) / 1000));
}

export default function ActiveOrderScreen() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const t = tokens();

  const { data: order, isLoading, error, mutate } = useSWR<OrderDetail>(`/orders/${id}`, (url: string) => api.get<OrderDetail>(url));
  const [now, setNow] = useState(() => Date.now());
  const [actionError, setActionError] = useState("");
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const mainButton = window.Telegram?.WebApp?.MainButton;
    mainButton?.hide?.();
    return () => mainButton?.hide?.();
  }, []);

  useEffect(() => {
    if (!order) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [order]);

  useEffect(() => {
    if (!order || !isActiveOrder(order.status)) return;
    if (secondsUntilExpiration(order, now) > 0) return;
    mutate();
  }, [mutate, now, order]);

  const handleCancel = async () => {
    setCanceling(true);
    setActionError("");
    try {
      const updated = await api.patch<OrderDetail>(`/orders/${id}`, { status: "EXPIRED" });
      mutate(updated, false);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Не удалось отменить бронь"));
    } finally {
      setCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="screen-scroll"
        style={{
          background: t.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton w="46%" h={20} radius={8} />
          <Skeleton w="100%" h={260} radius={16} />
          <Skeleton w="100%" h={88} radius={16} />
          <Skeleton w="100%" h={120} radius={16} />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="screen-scroll" style={{ background: t.bg }}>
        <AppHeader title="Бронь" onBack={() => router.back()} />
        <ErrorState message="Не удалось загрузить бронь. Проверьте соединение и попробуйте ещё раз." />
      </div>
    );
  }

  const sec = order ? secondsUntilExpiration(order, now) : 0;
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const expiredByTimer = isActiveOrder(order.status) && sec <= 0;
  const active = isActiveOrder(order.status) && !expiredByTimer;
  const completed = order.status === "COMPLETED";
  const displayStatus = expiredByTimer ? "EXPIRED" : order.status;
  const items = order.items?.length
    ? order.items
    : [
        {
          id: order.offer.id,
          offer_id: order.offer.id,
          title: order.offer.name,
          quantity: 1,
          unit_price: order.offer.new_price,
          total_price: order.offer.new_price,
          price: order.offer.new_price,
        },
      ];
  const qrValue = `polka://order/${order.id}/${order.code}`;

  return (
    <div
      className="screen-scroll-with-bottom-action"
      style={{
        background: t.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppHeader title={order.partner.name} sub={`Бронь #${order.id}`} onBack={() => router.back()} />

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Badge tone={active ? "green" : completed ? "dark" : "amber"}>{statusLabel(displayStatus)}</Badge>
          {active && (
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: sec < 300 ? t.warn : t.text,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mm}:{ss}
            </div>
          )}
        </div>

        <div
          style={{
            background: t.surface,
            borderRadius: 20,
            padding: 24,
            border: `1px solid ${t.divider}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <QRCode value={qrValue} size={180} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: t.textSec,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Покажите код продавцу
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: t.primaryDeep,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: 4,
              }}
            >
              {order.code}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 16,
            background: t.bg,
            border: `1px solid ${t.divider}`,
            borderRadius: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: t.primaryDeep, display: "flex" }}>{Icon.pin(20)}</span>
            <div style={{ fontSize: 14, color: t.text }}>{order.partner.address}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: t.primaryDeep, display: "flex" }}>{Icon.clock(20)}</span>
            <div style={{ fontSize: 14, color: t.text }}>{order.partner.hours}</div>
          </div>
        </div>

        {/* Items List */}
        <div
          style={{
            padding: 16,
            background: t.surface,
            border: `1px solid ${t.divider}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
              }}
            >
              <span style={{ color: t.text }}>
                {it.title}
                {it.quantity > 1 ? <span style={{ color: t.textSec }}> · {it.quantity} шт</span> : null}
              </span>
              <span style={{ fontWeight: 600 }}>{it.total_price} ₸</span>
            </div>
          ))}
          <div style={{ height: 1, background: t.divider, margin: "4px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            <span>Итого</span>
            <span>{order.total} ₸</span>
          </div>
        </div>

        {actionError && (
          <div style={{ padding: 12, borderRadius: 12, background: "#FDE8E8", color: t.danger, fontSize: 13 }}>
            {actionError}
          </div>
        )}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: 16,
          }}
        >
          {completed ? (
            <PillButton onClick={() => router.push(`/orders/${id}/rating`)} variant="dark" size="lg">
              Оценить заказ
            </PillButton>
          ) : active ? (
            <div
              style={{
                minHeight: 56,
                padding: "12px 18px",
                borderRadius: 16,
                border: `1px solid ${t.divider}`,
                background: t.surface,
                color: t.textSec,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 650,
                lineHeight: 1.35,
              }}
            >
              Покажите QR или 4-значный код продавцу
            </div>
          ) : (
            <PillButton onClick={() => router.push("/")} variant="outline" size="lg">
              Найти ещё позиции
            </PillButton>
          )}
          {active && (
            <PillButton onClick={handleCancel} variant="danger" size="md" disabled={canceling}>
              {canceling ? "Отменяем…" : "Отменить бронь"}
            </PillButton>
          )}
        </div>
      </div>
    </div>
  );
}
