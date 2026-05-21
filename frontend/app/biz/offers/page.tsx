"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { OfferImagePicker, OfferImagePreview } from "@/components/biz/OfferImagePicker";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import { Badge, tokens, FONT, Icon } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { bizApi, money, partnerErrorMessage, subscriptionPlanLabel, subscriptionStatusLabel } from "@/lib/biz-api";
import type { OfferAvailability, OfferPublic } from "@/lib/api-types";

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
    category: "",
    tags: "",
    price: "",
    availability: "IN_STOCK" as OfferAvailability,
    stock: "",
  });
  const [draftPhoto, setDraftPhoto] = useState<File | null>(null);
  const [deleteDraftPhoto, setDeleteDraftPhoto] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<OfferPublic | null>(null);
  const activeOfferCount = (offers || []).filter((offer) => offer.availability === "IN_STOCK" && offer.stock > 0).length;

  const beginEdit = (offer: OfferPublic) => {
    setEditingId(offer.id);
    setMessage("");
    setDraft({
      name: offer.name,
      description: offer.description || "",
      category: offer.category || "",
      tags: offer.tags || "",
      price: String(offer.price ?? offer.new_price),
      availability: offer.availability,
      stock: String(offer.stock),
    });
    setDraftPhoto(null);
    setDeleteDraftPhoto(false);
  };

  const validateDraft = () => {
    const productPrice = Number(draft.price);
    const stock = Number(draft.stock);
    if (!draft.name.trim()) return "Введите название товара.";
    if (!Number.isFinite(productPrice) || productPrice <= 0) return "Цена должна быть больше 0.";
    if (!Number.isInteger(stock) || stock < 0) return "Остаток должен быть целым числом от 0.";
    if (draft.availability === "IN_STOCK" && stock <= 0) return "Для статуса в наличии укажите остаток больше 0.";
    return "";
  };

  const saveEdit = async (id: number) => {
    const validationError = validateDraft();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setBusyId(id);
    setMessage("");
    try {
      await bizApi.updateOffer(id, {
        name: draft.name.trim(),
        description: draft.description.trim(),
        category: draft.category.trim(),
        tags: draft.tags.trim(),
        price: Number(draft.price),
        availability: draft.availability,
        stock: Number(draft.stock),
      });
      if (draftPhoto) {
        await bizApi.uploadOfferImage(id, draftPhoto);
      } else if (deleteDraftPhoto) {
        await bizApi.deleteOfferImage(id);
      }
      setEditingId(null);
      setDraftPhoto(null);
      setDeleteDraftPhoto(false);
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
        title="Мои товары"
        right={
          isApproved ? (
            <button
              type="button"
              aria-label="Создать товар"
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
      <div className="biz-offers-content" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
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
        {isApproved && profile && (
          <div
            style={{
              border: `1px solid ${t.divider}`,
              borderRadius: 12,
              padding: "11px 12px",
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              background: t.bg,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 750, color: t.text }}>Тариф {subscriptionPlanLabel(profile.plan)}</div>
              <div style={{ marginTop: 2, fontSize: 12, color: t.textSec }}>
                {profile.subscription_status === "ACTIVE" ? "Активные товары без лимита" : `${activeOfferCount}/5 активных товаров`}
              </div>
            </div>
            <Badge tone={profile.subscription_status === "ACTIVE" ? "solid" : "neutral"} size="sm">
              {subscriptionStatusLabel(profile.subscription_status)}
            </Badge>
          </div>
        )}
        {isApproved && !isLoading && !error && (!offers || offers.length === 0) && (
          <EmptyState
            icon={Icon.plus(34, t.textTer)}
            title="Пока нет товаров"
            description="Создайте первый товар, чтобы он появился в магазине и ленте покупателей."
            compact
          />
        )}
        {isApproved && offers?.map((offer) => {
          const isEditing = editingId === offer.id;
          const active = offer.availability === "IN_STOCK" && offer.stock > 0;

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
              <OfferImagePreview
                imageUrl={offer.image_url}
                label="товар"
                width={60}
                height={60}
                radius={10}
                tone={active ? "mint" : "slate"}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <OfferImagePicker
                      id={`offer-photo-${offer.id}`}
                      file={draftPhoto}
                      imageUrl={offer.image_url}
                      loading={busyId === offer.id && Boolean(draftPhoto)}
                      disabled={busyId === offer.id}
                      markedForDelete={deleteDraftPhoto}
                      onFileChange={(file) => {
                        setDraftPhoto(file);
                        setDeleteDraftPhoto(false);
                      }}
                      onDelete={() => {
                        setDraftPhoto(null);
                        setDeleteDraftPhoto((value) => !value);
                      }}
                    />
                    <input
                      value={draft.name}
                      name="offer-name"
                      aria-label="Название товара"
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      style={inputStyle(t, fontFn)}
                    />
                    <textarea
                      value={draft.description}
                      name="offer-description"
                      aria-label="Описание"
                      placeholder="Описание товара"
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      rows={2}
                      style={{ ...inputStyle(t, fontFn), resize: "vertical" }}
                    />
                    <input
                      value={draft.category}
                      name="offer-category"
                      aria-label="Категория"
                      placeholder="Категория"
                      onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                      style={inputStyle(t, fontFn)}
                    />
                    <input
                      value={draft.tags}
                      name="offer-tags"
                      aria-label="Теги"
                      placeholder="Теги через запятую"
                      onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                      style={inputStyle(t, fontFn)}
                    />
                    <select
                      value={draft.availability}
                      name="availability"
                      aria-label="Статус наличия"
                      onChange={(event) => setDraft({ ...draft, availability: event.target.value as OfferAvailability })}
                      style={inputStyle(t, fontFn)}
                    >
                      <option value="IN_STOCK">В наличии</option>
                      <option value="OUT_OF_STOCK">Нет в наличии</option>
                      <option value="PREORDER">Предзаказ</option>
                      <option value="HIDDEN">Скрыт</option>
                    </select>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr", gap: 8 }}>
                      <input
                        value={draft.price}
                        name="price"
                        aria-label="Цена"
                        onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/\D/g, "") })}
                        inputMode="numeric"
                        style={inputStyle(t, fontFn)}
                      />
                      <input
                        value={draft.stock}
                        name="stock"
                        aria-label="Остаток"
                        onChange={(event) => setDraft({ ...draft, stock: event.target.value.replace(/\D/g, "") })}
                        inputMode="numeric"
                        style={inputStyle(t, fontFn)}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <PillButtonBiz onClick={() => saveEdit(offer.id)} disabled={busyId === offer.id}>
                        {busyId === offer.id ? "Сохраняем..." : "Сохранить"}
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
                        {availabilityLabel(offer.availability)}
                      </Badge>
                      {offer.category && (
                        <Badge tone="neutral" size="sm">
                          {offer.category}
                        </Badge>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 750, marginTop: 5 }}>{offer.name}</div>
                    {offer.description && (
                      <div style={{ fontSize: 12, color: t.textSec, marginTop: 3, lineHeight: 1.35 }}>
                        {offer.description}
                      </div>
                    )}
                    {offer.tags && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {tagsToArray(offer.tags).map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            style={{
                              padding: "3px 7px",
                              borderRadius: 999,
                              background: t.surface,
                              color: t.textSec,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: t.primaryDeep }}>{money(offer.price ?? offer.new_price)}</span>
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
                        {busyId === offer.id ? "Удаляем..." : "Удалить"}
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
            Товар скрывается из покупательской ленты, когда статус &quot;Скрыт&quot; или остаток равен 0.
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
              Удалить товар?
            </div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: t.textSec }}>
              {pendingDelete.name} исчезнет из списка товаров и из покупательской ленты. История уже созданных заявок
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

function availabilityLabel(availability: OfferPublic["availability"]) {
  if (availability === "OUT_OF_STOCK") return "Нет в наличии";
  if (availability === "PREORDER") return "Предзаказ";
  if (availability === "HIDDEN") return "Скрыт";
  return "В наличии";
}

function tagsToArray(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
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
