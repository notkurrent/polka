"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { OfferDetail, OrderDetail } from "@/lib/api-types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/app";
import { tokens, Icon, FONT, PillButton, PriceTag } from "@/components/ui/primitives";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OfferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const t = tokens();
  const { addToCart, cart } = useAppStore();
  const [isReserving, setIsReserving] = useState(false);
  const [error, setError] = useState("");
  const [cartFeedback, setCartFeedback] = useState("");

  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const { data: selectedOfferData, error: loadError } = useSWR<OfferDetail>(
    isAuthenticated && id ? `/offers/${id}` : null,
    (url: string) => api.get<OfferDetail>(url),
  );

  const offer = selectedOfferData?.offer;
  const partner = selectedOfferData?.partner;
  const isOutOfStock = !!offer && offer.stock <= 0;
  const isInCart = id ? cart.some((item) => item.offerId === id) : false;
  const cartHasOtherPartner = !!partner && cart.length > 0 && cart.some((item) => item.partnerId !== String(partner.id));

  const handleReserve = useCallback(async () => {
    if (!id || isOutOfStock || isReserving) return;
    setError("");
    try {
      setIsReserving(true);
      const order = await api.post<OrderDetail>("/orders", { items: [{ offer_id: Number(id), quantity: 1 }] });

      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось забронировать позицию. Попробуйте еще раз."));
    } finally {
      setIsReserving(false);
    }
  }, [id, isOutOfStock, isReserving, router]);

  const handleAddToCart = () => {
    if (!id || !offer || !partner || isOutOfStock) return;
    if (!isInCart) {
      addToCart({
        offerId: id,
        partnerId: String(partner.id),
        name: offer.name,
        price: offer.new_price,
        quantity: 1,
        originalPrice: offer.old_price,
        storeName: partner.name,
        stock: offer.stock,
      });
    }
    setCartFeedback(
      isInCart
        ? "Позиция уже в корзине."
        : cartHasOtherPartner
          ? "Начали новую корзину для этого заведения."
          : "Добавили в корзину.",
    );
  };

  useEffect(() => {
    const mainButton = window.Telegram?.WebApp?.MainButton;
    mainButton?.hide?.();
    return () => mainButton?.hide?.();
  }, []);

  if (loadError) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: t.bg,
          padding: "calc(24px + var(--app-safe-top)) 20px",
          fontFamily: FONT(),
        }}
      >
        <PillButton variant="outline" full={false} onClick={() => router.back()}>
          Назад
        </PillButton>
        <ErrorState message="Не удалось открыть оффер. Вернитесь назад или попробуйте другое предложение." />
      </div>
    );
  }

  if (!offer || !partner) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100%",
          background: t.bg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton w="100%" h={240} radius={0} />
          <Skeleton w="70%" h={24} radius={8} />
          <Skeleton w="45%" h={32} radius={8} />
          <Skeleton w="100%" h={132} radius={16} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        overflow: "auto",
        background: t.bg,
        fontFamily: FONT ? FONT() : "system-ui",
        color: t.text,
        paddingBottom: 148,
      }}
    >
      <div style={{ position: "relative" }}>
        <OfferImagePreview
          imageUrl={offer.image_url}
          label={offer.type === "MAGIC_BOX" ? "Сюрприз" : "позиция"}
          width="100%"
          height={240}
          radius={0}
          tone={offer.type === "MAGIC_BOX" ? "mint" : "sand"}
        />
        <button
          type="button"
          aria-label="Назад"
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: "calc(12px + var(--app-safe-top))",
            left: 12,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.95)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icon.back(18)}
        </button>
      </div>

      <div style={{ padding: "20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 16px", letterSpacing: -0.6 }}>{offer.name}</h1>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <PriceTag original={offer.old_price} now={offer.new_price} size="lg" />
          <span
            style={{
              padding: "5px 10px",
              borderRadius: 9999,
              fontSize: 13,
              background: t.primarySoft,
              color: t.primaryDeep,
              fontWeight: 700,
            }}
          >
            Выгода {Math.round((1 - offer.new_price / offer.old_price) * 100)}%
          </span>
        </div>

        {offer.description && (
          <div style={{ marginBottom: 24, fontSize: 14, color: t.textSec, lineHeight: 1.4 }}>{offer.description}</div>
        )}
        {offer.discount_reason && (
          <div
            style={{
              marginBottom: 24,
              padding: "12px 14px",
              borderRadius: 14,
              background: t.primarySoft,
              color: t.primaryDeep,
              fontSize: 13,
              lineHeight: 1.45,
              fontWeight: 650,
            }}
          >
            Почему скидка: {offer.discount_reason}
          </div>
        )}

        <div style={{ background: t.surface, borderRadius: 16, padding: "16px", marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: t.textSec }}>
            Осталось порций: <strong style={{ color: t.text }}>{offer.stock}</strong>
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: t.textSec }}>
            Заведение: <strong style={{ color: t.text }}>{partner.name}</strong>
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: t.textSec }}>
            Адрес: <strong style={{ color: t.text }}>{partner.address}</strong>
          </p>
          {offer.pickup_time ? (
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: t.textSec }}>
              Выдача: <strong style={{ color: t.text }}>{offer.pickup_time}</strong>
            </p>
          ) : (
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: t.textSec }}>
              Режим работы: <strong style={{ color: t.text }}>{partner.hours}</strong>
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push(`/stores/${partner.id}`)}
            style={{
              marginTop: 12,
              width: "100%",
              minHeight: 44,
              padding: "10px",
              borderRadius: 12,
              border: `1px solid ${t.primary}`,
              background: "transparent",
              color: t.primaryDeep,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Перейти к странице заведения
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background: "#FDE8E8",
              color: t.danger,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
        {cartFeedback && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background: t.primarySoft,
              color: t.primaryDeep,
              fontSize: 13,
            }}
          >
            {cartFeedback}
          </div>
        )}

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            right: "auto",
            width: "min(100vw, var(--app-shell-max-width))",
            transform: "translateX(-50%)",
            padding: "12px 20px calc(16px + var(--app-safe-bottom))",
            background: "rgba(255,255,255,0.96)",
            borderTop: `1px solid ${t.divider}`,
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <PillButton
            size="md"
            variant={isInCart ? "ghost" : "outline"}
            full
            onClick={isInCart ? () => router.push("/cart") : handleAddToCart}
            disabled={isOutOfStock}
          >
            {isInCart ? "Открыть корзину" : "Добавить в корзину"}
          </PillButton>
          <PillButton size="lg" full onClick={handleReserve} disabled={isReserving || isOutOfStock}>
            {isOutOfStock ? "Нет в наличии" : isReserving ? "Бронируем…" : `Забронировать за ${offer.new_price} ₸`}
          </PillButton>
        </div>
      </div>
    </div>
  );
}
