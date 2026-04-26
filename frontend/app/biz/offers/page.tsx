"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { Badge, PriceTag, StripePlaceholder, tokens, FONT, Icon } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import type { OfferPublic } from "@/lib/api-types";

export default function BizOffersListScreen() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: offers, isLoading, mutate, error } = useSWR<OfferPublic[]>("/partner-api/offers", bizApi.offers);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", old_price: "", new_price: "", stock: "" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const beginEdit = (offer: OfferPublic) => {
    setEditingId(offer.id);
    setMessage("");
    setDraft({
      name: offer.name,
      old_price: String(offer.old_price),
      new_price: String(offer.new_price),
      stock: String(offer.stock),
    });
  };

  const saveEdit = async (id: number) => {
    setBusyId(id);
    setMessage("");
    try {
      await bizApi.updateOffer(id, {
        name: draft.name.trim(),
        old_price: Number(draft.old_price),
        new_price: Number(draft.new_price),
        stock: Number(draft.stock),
      });
      setEditingId(null);
      await mutate();
    } catch (err) {
      setMessage(partnerErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const deleteOffer = async (id: number) => {
    setBusyId(id);
    setMessage("");
    try {
      await bizApi.deleteOffer(id);
      await mutate();
    } catch (err) {
      setMessage(partnerErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="screen-scroll-with-tabbar" style={{ background: t.surface, fontFamily: fontFn }}>
      <AppHeaderBiz
        title="Мои позиции"
        right={
          <button
            type="button"
            aria-label="Создать позицию"
            onClick={() => router.push("/biz/offers/new")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              border: "none",
              background: t.primary,
              color: t.primaryDeep,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              padding: 0,
            }}
          >
            <span style={{ display: "grid", placeItems: "center", width: 22, height: 22 }}>
              {Icon.plus(20, t.primaryDeep)}
            </span>
          </button>
        }
      />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading && (
          <>
            <Skeleton w="100%" h={86} radius={12} />
            <Skeleton w="100%" h={86} radius={12} />
          </>
        )}
        {error && <ErrorState message={partnerErrorMessage(error)} />}
        {message && <div role="alert" style={{ color: t.danger, fontSize: 13 }}>{message}</div>}
        {!isLoading && !error && (!offers || offers.length === 0) && (
          <EmptyState
            icon={Icon.plus(34, t.textTer)}
            title="Пока нет позиций"
            description="Создайте первую позицию, чтобы она появилась в ленте покупателей."
            compact
          />
        )}
        {offers?.map((offer) => {
          const isEditing = editingId === offer.id;
          const active = offer.stock > 0;

          return (
            <div
              key={offer.id}
              style={{
                background: t.bg,
                border: `1px solid ${t.divider}`,
                borderRadius: 12,
                padding: 12,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <StripePlaceholder label="позиция" w={60} h={60} radius={10} tone={active ? "mint" : "slate"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      value={draft.name}
                      name="offer-name"
                      aria-label="Название позиции"
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      style={inputStyle(t, fontFn)}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 8 }}>
                      <input
                        value={draft.old_price}
                        name="old-price"
                        aria-label="Обычная цена"
                        onChange={(event) => setDraft({ ...draft, old_price: event.target.value })}
                        inputMode="numeric"
                        style={inputStyle(t, fontFn)}
                      />
                      <input
                        value={draft.new_price}
                        name="new-price"
                        aria-label="Цена Polka"
                        onChange={(event) => setDraft({ ...draft, new_price: event.target.value })}
                        inputMode="numeric"
                        style={inputStyle(t, fontFn)}
                      />
                      <input
                        value={draft.stock}
                        name="stock"
                        aria-label="Остаток"
                        onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
                        inputMode="numeric"
                        style={inputStyle(t, fontFn)}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <PillButtonBiz onClick={() => saveEdit(offer.id)} disabled={busyId === offer.id}>
                        {busyId === offer.id ? "Сохраняем…" : "Сохранить"}
                      </PillButtonBiz>
                      <button type="button" onClick={() => setEditingId(null)} style={secondaryButton(t, fontFn)}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Badge tone={active ? "solid" : "neutral"} size="sm">
                        {active ? "Активно" : "Нет остатков"}
                      </Badge>
                      <span style={{ fontSize: 11, color: t.textSec }}>{offer.type === "MAGIC_BOX" ? "Сюрприз" : "Состав"}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 750, marginTop: 5 }}>{offer.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                      <PriceTag original={Number(offer.old_price)} now={Number(offer.new_price)} size="sm" />
                      <span style={{ fontSize: 11, color: t.textSec }}>· {offer.stock} шт</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" onClick={() => beginEdit(offer)} style={secondaryButton(t, fontFn)}>
                        Изменить
                      </button>
                      <button
                        onClick={() => deleteOffer(offer.id)}
                        type="button"
                        disabled={busyId === offer.id}
                        style={{ ...secondaryButton(t, fontFn), color: t.danger }}
                      >
                        {busyId === offer.id ? "Удаляем…" : "Удалить"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div
          style={{
            padding: "14px 16px",
            background: t.primarySoft,
            borderRadius: 12,
            fontSize: 12,
            color: t.primaryDeep,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Позиция исчезает из покупательской ленты, когда остаток становится 0.
        </div>
      </div>
      <BizTabBar />
    </div>
  );
}

function inputStyle(t: ReturnType<typeof tokens>, fontFn: string): CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    border: `1px solid ${t.divider}`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: fontFn,
    boxSizing: "border-box",
  };
}

function secondaryButton(t: ReturnType<typeof tokens>, fontFn: string): CSSProperties {
  return {
    minHeight: 44,
    padding: "0 12px",
    borderRadius: 12,
    border: `1px solid ${t.divider}`,
    background: t.bg,
    color: t.text,
    fontSize: 13,
    fontWeight: 650,
    fontFamily: fontFn,
    cursor: "pointer",
  };
}
