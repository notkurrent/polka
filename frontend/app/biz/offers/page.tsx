"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
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
  const { data: profile, isLoading: profileLoading, error: profileError } = useSWR("/partner-api/profile", bizApi.profile);
  const isApproved = profile?.status === "APPROVED";
  const { data: offers, isLoading, mutate, error } = useSWR<OfferPublic[]>(
    isApproved ? "/partner-api/offers" : null,
    bizApi.offers,
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    pickup_from: "19:00",
    pickup_to: "21:00",
    old_price: "",
    new_price: "",
    stock: "",
  });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<OfferPublic | null>(null);

  const beginEdit = (offer: OfferPublic) => {
    setEditingId(offer.id);
    setMessage("");
    const defaultTime = offer.pickup_time || "19:00 - 21:00";
    const [from = "19:00", to = "21:00"] = defaultTime.split("-").map((s) => s.trim());
    setDraft({
      name: offer.name,
      description: offer.description || "",
      pickup_from: from,
      pickup_to: to,
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
        description: draft.description.trim(),
        pickup_time: `${draft.pickup_from} - ${draft.pickup_to}`,
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
      setPendingDelete(null);
      await mutate();
    } catch (err) {
      setMessage(partnerErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppScreenBiz style={{ background: t.bg, fontFamily: fontFn }}>
      <AppHeaderBiz
        title="Мои позиции"
        right={
          isApproved ? (
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
          ) : undefined
        }
      />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {profileLoading && (
          <>
            <Skeleton w="100%" h={86} radius={12} />
            <Skeleton w="100%" h={86} radius={12} />
          </>
        )}
        {profileError && <ErrorState message={partnerErrorMessage(profileError)} />}
        {!profileLoading && !profileError && profile && !isApproved && (
          <PartnerModerationState profile={profile} compact context="feature" />
        )}
        {!profileLoading && isApproved && isLoading && (
          <>
            <Skeleton w="100%" h={86} radius={12} />
            <Skeleton w="100%" h={86} radius={12} />
          </>
        )}
        {isApproved && error && <ErrorState message={partnerErrorMessage(error)} />}
        {message && (
          <div role="alert" style={{ color: t.danger, fontSize: 13 }}>
            {message}
          </div>
        )}
        {isApproved && !isLoading && !error && (!offers || offers.length === 0) && (
          <EmptyState
            icon={Icon.plus(34, t.textTer)}
            title="Пока нет позиций"
            description="Создайте первую позицию, чтобы она появилась в ленте покупателей."
            compact
          />
        )}
        {isApproved && offers?.map((offer) => {
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
                    <textarea
                      value={draft.description}
                      name="offer-description"
                      aria-label="Описание"
                      placeholder="Кратко о составе"
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      rows={2}
                      style={{ ...inputStyle(t, fontFn), resize: "vertical" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="time"
                        value={draft.pickup_from}
                        name="offer-pickup_from"
                        aria-label="Окно выдачи от"
                        onChange={(event) => setDraft({ ...draft, pickup_from: event.target.value })}
                        style={inputStyle(t, fontFn)}
                      />
                      <span style={{ color: t.textSec }}>—</span>
                      <input
                        type="time"
                        value={draft.pickup_to}
                        name="offer-pickup_to"
                        aria-label="Окно выдачи до"
                        onChange={(event) => setDraft({ ...draft, pickup_to: event.target.value })}
                        style={inputStyle(t, fontFn)}
                      />
                    </div>
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
                      <span style={{ fontSize: 11, color: t.textSec }}>
                        {offer.type === "MAGIC_BOX" ? "Сюрприз" : "Состав"}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 750, marginTop: 5 }}>{offer.name}</div>
                    {offer.pickup_time && (
                      <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>Выдача: {offer.pickup_time}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                      <PriceTag original={Number(offer.old_price)} now={Number(offer.new_price)} size="sm" />
                      <span style={{ fontSize: 11, color: t.textSec }}>· {offer.stock} шт</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" onClick={() => beginEdit(offer)} style={secondaryButton(t, fontFn)}>
                        Изменить
                      </button>
                      <button
                        onClick={() => setPendingDelete(offer)}
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
        {isApproved && (
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
        )}
      </div>
      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-offer-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(17, 23, 20, 0.36)",
          }}
          onClick={() => {
            if (busyId !== pendingDelete.id) setPendingDelete(null);
          }}
        >
          <div
            style={{
              width: "min(100%, calc(var(--app-shell-max-width) - 32px))",
              borderRadius: 16,
              background: t.bg,
              border: `1px solid ${t.divider}`,
              padding: 16,
              boxShadow: "0 18px 60px rgba(17, 23, 20, 0.22)",
              fontFamily: fontFn,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div id="delete-offer-title" style={{ fontSize: 17, fontWeight: 800, color: t.text, lineHeight: 1.25 }}>
              Удалить позицию?
            </div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: t.textSec }}>
              {pendingDelete.name} исчезнет из списка позиций и из покупательской ленты. История уже созданных заказов
              сохранится.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => deleteOffer(pendingDelete.id)}
                disabled={busyId === pendingDelete.id}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  border: "none",
                  background: "#FDE8E8",
                  color: t.danger,
                  fontSize: 14,
                  fontWeight: 750,
                  fontFamily: fontFn,
                  cursor: busyId === pendingDelete.id ? "not-allowed" : "pointer",
                  opacity: busyId === pendingDelete.id ? 0.66 : 1,
                }}
              >
                {busyId === pendingDelete.id ? "Удаляем..." : "Да, удалить"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={busyId === pendingDelete.id}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  border: `1px solid ${t.divider}`,
                  background: t.bg,
                  color: t.text,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: fontFn,
                  cursor: busyId === pendingDelete.id ? "not-allowed" : "pointer",
                }}
              >
                Оставить
              </button>
            </div>
          </div>
        </div>
      )}
      <BizTabBar />
    </AppScreenBiz>
  );
}

function inputStyle(t: ReturnType<typeof tokens>, fontFn: string): CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    border: `1px solid ${t.divider}`,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: fontFn,
    boxSizing: "border-box",
    WebkitAppearance: "none",
    appearance: "none",
    outline: "none",
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
