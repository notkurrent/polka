"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app";
import { tokens, Icon, StripePlaceholder, PillButton, PriceTag } from "@/components/ui/primitives";
import AppHeader from "@/components/AppHeader";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CartScreen() {
  const router = useRouter();
  const { cart, removeFromCart, cartTotal, clearCart } = useAppStore();
  const t = tokens();
  const total = cartTotal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReserve = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError("");
    try {
      for (const item of cart) {
        await api.post("/orders/", { offer_id: item.offerId });
      }
      clearCart();
      router.push("/orders");
    } catch (err) {
      console.error("Reservation failed:", err);
      setError(err instanceof Error ? err.message : "Не удалось забронировать все позиции. Корзина сохранена.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.MainButton?.hide?.();

    return () => {
      tg.MainButton?.hide?.();
    };
  }, []);

  return (
    <div className="screen-scroll" style={{ background: t.bg, display: "flex", flexDirection: "column" }}>
      <AppHeader title="Корзина" onBack={() => router.back()} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {cart.length === 0 ? (
          <EmptyState
            icon={Icon.bag(40, t.textTer, true)}
            title="Корзина пуста"
            description="Добавьте одну или несколько позиций, чтобы забронировать их и получить код выдачи."
            action={
              <PillButton variant="outline" onClick={() => router.push("/")}>
                Найти позиции
              </PillButton>
            }
          />
        ) : (
          <>
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column" }}>
              {cart.map((item, index) => {
                return (
                  <React.Fragment key={item.offerId}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 0" }}>
                      <StripePlaceholder w={56} h={56} radius={12} tone="green" />

                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: t.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: 13, color: t.textSec }}>{item.storeName || "Заведение"}</div>
                        <div style={{ marginTop: 2 }}>
                          <PriceTag original={item.originalPrice ?? item.price} now={item.price} size="sm" />
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.offerId)}
                        aria-label={`Убрать ${item.name} из корзины`}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: t.surface,
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: t.textTer,
                          flexShrink: 0,
                        }}
                      >
                        {Icon.close(16)}
                      </button>
                    </div>
                    {index < cart.length - 1 && <div style={{ height: 1, background: t.divider }} />}
                  </React.Fragment>
                );
              })}
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                paddingRight: "16px",
                paddingLeft: "16px",
                paddingBottom: "calc(24px + var(--app-safe-bottom))",
                borderTop: `1px solid ${t.divider}`,
                background: t.bg,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyItems: "center",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Итого</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: t.primaryDeep }}>{total} ₸</span>
              </div>
              {error && (
                <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#FDE8E8", color: t.danger, fontSize: 13 }}>
                  {error}
                </div>
              )}
              <PillButton onClick={handleReserve} variant="dark" size="lg" disabled={cart.length === 0 || loading}>
                {loading ? "Бронируем…" : "Забронировать"}
              </PillButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
