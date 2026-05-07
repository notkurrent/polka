"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/app";
import { tokens, Icon, FONT, StripePlaceholder, PriceTag } from "@/components/ui/primitives";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";
import { BusinessLogoPreview } from "@/components/biz/BusinessLogoPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartnerDetail } from "@/lib/api-types";
import { Skeleton } from "@/components/ui/Skeleton";

export default function StoreScreen({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const t = tokens();
  const { isAuthenticated } = useAuth();
  const { cart, addToCart, cartTotal, favorites, toggleFavorite } = useAppStore();

  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const {
    data: partnerDetail,
    isLoading,
    error,
  } = useSWR<PartnerDetail>(isAuthenticated && id ? `/partners/${id}` : null, (url: string) =>
    api.get<PartnerDetail>(url),
  );

  const fav = id ? favorites.includes(id) : false;
  const partner = partnerDetail?.partner;

  const store = partner && {
    id: String(partner.id),
    name: partner.name,
    logoUrl: partner.logo_url,
    imgLabel: partner.name.slice(0, 10) || "...",
    tone: "blue" as const,
    cat: partner.category || "Заведение",
    district: "Алматы",
    address: partner.address,
    hours: partner.hours,
    mapUrl: partner.map_url,
    about: partner.description || "Свежие позиции по сниженной цене. Забронируйте и заберите в указанное время.",
    offers: (partnerDetail?.offers || []).map((offer) => ({
      id: String(offer.id),
      title: offer.name,
      desc: offer.description || (offer.type === "MAGIC_BOX" ? "Сюрприз-позиция от заведения" : "Готовая позиция"),
      discountReason: offer.discount_reason || "",
      original: offer.old_price,
      now: offer.new_price,
      pickup: offer.pickup_time || partner.hours,
      tone: (offer.type === "MAGIC_BOX" ? "purple" : "orange") as "purple" | "orange",
      label: offer.type === "MAGIC_BOX" ? "Сюрприз" : "Еда",
      qty: offer.stock,
      imageUrl: offer.image_url,
    })),
  };

  const cartQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartTotal();

  if (!id || isLoading) {
    return (
      <div
        style={{ height: "100dvh", display: "flex", justifyContent: "center", alignItems: "center", background: t.bg }}
      >
        <div style={{ width: "100%", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton w="100%" h={200} radius={0} />
          <Skeleton w="62%" h={24} radius={8} />
          <Skeleton w="100%" h={86} radius={14} />
          <Skeleton w="100%" h={104} radius={16} />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div style={{ minHeight: "100dvh", background: t.bg, fontFamily: FONT() }}>
        <EmptyState
          icon={Icon.pin(40, t.textTer)}
          title="Заведение не найдено"
          description="Не удалось загрузить страницу заведения. Вернитесь назад или попробуйте открыть другое предложение."
        />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        overflow: "auto",
        background: t.bg,
        fontFamily: FONT(),
        color: t.text,
        WebkitFontSmoothing: "antialiased",
        paddingBottom: cartQuantity > 0 ? "calc(var(--app-safe-bottom) + 80px)" : 0,
      }}
    >
      {/* hero image */}
      <div style={{ position: "relative" }}>
        <StripePlaceholder label={store.imgLabel} h={200} radius={0} tone={store.tone} />
        <BusinessLogoPreview
          logoUrl={store.logoUrl}
          businessName={store.name}
          size={82}
          radius={18}
          style={{
            position: "absolute",
            left: 20,
            bottom: -34,
            background: "#fff",
            boxShadow: "0 12px 32px rgba(17, 23, 20, 0.16)",
          }}
        />
        <button
          type="button"
          aria-label="Назад"
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: "calc(var(--app-safe-top) + 12px)",
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
        <button
          type="button"
          aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
          onClick={() => id && toggleFavorite(id)}
          style={{
            position: "absolute",
            top: "calc(var(--app-safe-top) + 12px)",
            right: 12,
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
          {Icon.heart(18, fav ? t.danger : t.text, fav)}
        </button>
      </div>

      <div className="app-content" style={{ padding: "46px 20px 24px" }}>
        <div
          style={{ fontSize: 11, color: t.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
        >
          {store.cat}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 6px", letterSpacing: 0, overflowWrap: "anywhere" }}>
          {store.name}
        </h1>
        <div
          style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: t.textSec, marginBottom: 12 }}
        >
          <span>Самовывоз</span>
          <span>·</span>
          <span>{store.district}</span>
        </div>

        {/* info card */}
        <div
          style={{
            background: t.surface,
            borderRadius: 14,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            border: `1px solid ${t.divider}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {Icon.pin(16, t.primaryDeep)}
            <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>{store.address}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {Icon.clock(16, t.primaryDeep)}
            <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>{store.hours}</span>
          </div>
          {store.mapUrl && (
            <a
              href={store.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: t.primaryDeep,
                fontSize: 13,
                fontWeight: 750,
                textDecoration: "none",
                overflowWrap: "anywhere",
              }}
            >
              {Icon.pin(16, t.primaryDeep)}
              Открыть в 2GIS / карте
            </a>
          )}
        </div>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: t.textSec,
            marginTop: 14,
            textWrap: "pretty",
            overflowWrap: "anywhere",
          }}
        >
          {store.about}
        </p>

        {/* offers */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginBottom: 10 }}>Доступные позиции</div>
          <div className="store-offers-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {store.offers.length === 0 && (
              <EmptyState
                icon={Icon.bag(34, t.textTer)}
                title="Пока нет доступных позиций"
                description="Когда заведение добавит офферы, они появятся здесь."
                compact
              />
            )}
            {store.offers.map((o) => {
              const inCart = cart.some((c) => c.offerId === o.id);
              const unavailable = o.qty <= 0;
              return (
                <div key={o.id} style={{ display: "contents" }}>
                  <div
                    className="store-offer-card"
                    style={{
                      background: t.bg,
                      border: `1px solid ${t.divider}`,
                      borderRadius: 16,
                      padding: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <OfferImagePreview imageUrl={o.imageUrl} label={o.label} width={76} height={76} radius={12} tone="mint" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0, overflowWrap: "anywhere" }}>{o.title}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: t.textSec,
                          margin: "2px 0 4px",
                          textWrap: "pretty",
                          overflowWrap: "anywhere",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {o.desc}
                      </div>
                      {o.discountReason && (
                        <div
                          style={{
                            margin: "6px 0",
                            padding: "6px 8px",
                            borderRadius: 10,
                            background: t.primarySoft,
                            color: t.primaryDeep,
                            fontSize: 11,
                            lineHeight: 1.3,
                            fontWeight: 700,
                            overflowWrap: "anywhere",
                          }}
                        >
                          Почему скидка? {o.discountReason}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 11,
                          color: t.primaryDeep,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        {Icon.clock(12, t.primaryDeep)}
                        Время выдачи: {o.pickup}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <PriceTag original={o.original} now={o.now} size="sm" />
                        <button
                          type="button"
                          onClick={() => {
                            if (unavailable || inCart) return;
                            addToCart({
                              offerId: o.id,
                              partnerId: store.id,
                              name: o.title,
                              price: o.now,
                              quantity: 1,
                              originalPrice: o.original,
                              storeName: store.name,
                              stock: o.qty,
                              imageUrl: o.imageUrl,
                            });
                          }}
                          disabled={inCart || unavailable}
                          aria-label={
                            unavailable ? "Нет в наличии" : inCart ? "Уже в корзине" : `Добавить ${o.title} в корзину`
                          }
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            border: "none",
                            background: inCart ? t.primaryDeep : unavailable ? t.surface : t.primary,
                            color: inCart ? "#fff" : unavailable ? t.textTer : t.primaryDeep,
                            cursor: inCart || unavailable ? "default" : "pointer",
                            opacity: unavailable ? 0.6 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {inCart
                            ? Icon.check(18, "#fff")
                            : unavailable
                              ? Icon.close(18, t.textTer)
                              : Icon.plus(18, t.primaryDeep)}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {cartQuantity > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            right: "auto",
            width: "min(100vw, var(--app-fixed-bar-width))",
            transform: "translateX(-50%)",
            paddingTop: "16px",
            paddingRight: "16px",
            paddingBottom: "calc(16px + var(--app-safe-bottom))",
            paddingLeft: "16px",
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${t.divider}`,
            zIndex: 50,
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/cart")}
            style={{
              width: "100%",
              minHeight: 56,
              padding: "0 16px",
              borderRadius: 100,
              border: "none",
              background: t.primaryDeep,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 14,
              }}
            >
              {cartQuantity} шт
            </span>
            <span>Перейти в корзину</span>
            <span style={{ fontSize: 15 }}>{totalPrice} ₸</span>
          </button>
        </div>
      )}
    </div>
  );
}
