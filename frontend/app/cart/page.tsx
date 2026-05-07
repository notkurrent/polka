"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app";
import { tokens, Icon, PillButton, PriceTag } from "@/components/ui/primitives";
import AppHeader from "@/components/AppHeader";
import { api, getApiErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";

export default function CartScreen() {
  const router = useRouter();
  const { cart, updateCartQuantity, removeFromCart, cartTotal, clearCart } = useAppStore();
  const t = tokens();
  const total = cartTotal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReserve = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const order = await api.post<{ id: number }>("/orders", {
        items: cart.map((item) => ({
          offer_id: Number(item.offerId),
          quantity: item.quantity,
        })),
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось забронировать заказ. Корзина сохранена."));
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

      <div
        className={cart.length === 0 ? "app-readable-content" : "cart-content"}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
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
            <div className="cart-items" style={{ padding: "0 16px", display: "flex", flexDirection: "column" }}>
              {cart.map((item, index) => {
                const lineTotal = item.price * item.quantity;
                const canIncrease = item.stock == null || item.quantity < item.stock;
                return (
                  <React.Fragment key={item.offerId}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 0" }}>
                      <OfferImagePreview imageUrl={item.imageUrl} label="позиция" width={56} height={56} radius={12} tone="mint" />

                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: t.text,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: 13, color: t.textSec, overflowWrap: "anywhere" }}>{item.storeName || "Заведение"}</div>
                        <div style={{ marginTop: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <PriceTag original={item.originalPrice ?? item.price} now={item.price} size="sm" />
                          <span style={{ fontSize: 13, fontWeight: 750, color: t.text }}>{formatTenge(lineTotal)}</span>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.offerId, item.quantity - 1)}
                            aria-label={`Уменьшить количество ${item.name}`}
                            style={qtyButtonStyle(t)}
                          >
                            {Icon.minus(16, t.primaryDeep)}
                          </button>
                          <span
                            style={{
                              minWidth: 34,
                              height: 32,
                              borderRadius: 10,
                              background: t.bg,
                              border: `1px solid ${t.divider}`,
                              display: "grid",
                              placeItems: "center",
                              fontSize: 14,
                              fontWeight: 750,
                              color: t.text,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.offerId, item.quantity + 1)}
                            disabled={!canIncrease}
                            aria-label={`Увеличить количество ${item.name}`}
                            style={{ ...qtyButtonStyle(t), opacity: canIncrease ? 1 : 0.45, cursor: canIncrease ? "pointer" : "default" }}
                          >
                            {Icon.plus(16, t.primaryDeep)}
                          </button>
                          {item.stock != null && (
                            <span style={{ fontSize: 12, color: t.textSec }}>из {item.stock}</span>
                          )}
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
              className="cart-summary"
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
                <span style={{ fontSize: 20, fontWeight: 800, color: t.primaryDeep }}>{formatTenge(total)}</span>
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

function formatTenge(value: number) {
  return `${value.toLocaleString("ru")} ₸`;
}

function qtyButtonStyle(t: ReturnType<typeof tokens>): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: t.primarySoft,
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: t.primaryDeep,
    flexShrink: 0,
  };
}
