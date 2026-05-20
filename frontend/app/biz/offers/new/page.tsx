"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { tokens, Icon, FONT } from "@/components/ui/primitives";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { OfferImagePicker } from "@/components/biz/OfferImagePicker";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";

export default function BizCreateOfferPage() {
  const t = tokens();
  const router = useRouter();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: profile, isLoading: profileLoading, error: profileError } = useSWR("/partner-api/profile", bizApi.profile);
  const isApproved = profile?.status === "APPROVED";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pickupFrom, setPickupFrom] = useState("19:00");
  const [pickupTo, setPickupTo] = useState("21:00");
  const [price, setPrice] = useState("");
  const [original, setOriginal] = useState("");
  const [qty, setQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOfferId, setCreatedOfferId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const validate = () => {
    const oldPrice = Number(original);
    const productPrice = Number(price);
    if (!title.trim()) return "Введите название товара.";
    if (!pickupFrom.trim() || !pickupTo.trim()) return "Укажите время для связи.";
    if (!Number.isFinite(productPrice) || productPrice <= 0) return "Цена должна быть больше 0.";
    if (original.trim() && (!Number.isFinite(oldPrice) || oldPrice <= 0)) return "Старая цена должна быть больше 0.";
    if (!Number.isInteger(qty) || qty < 1) return "Укажите хотя бы 1 товар.";
    return "";
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        type: "SPECIFIC",
        availability: qty > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        name: title.trim(),
        description: description.trim(),
        discount_reason: discountReason.trim(),
        pickup_time: `${pickupFrom} - ${pickupTo}`,
        old_price: original.trim() ? Number(original) : null,
        price: Number(price),
        stock: qty,
      };
      const offer = createdOfferId ? await bizApi.updateOffer(createdOfferId, payload) : await bizApi.createOffer(payload);
      if (!createdOfferId) setCreatedOfferId(offer.id);
      if (photoFile) {
        await bizApi.uploadOfferImage(offer.id, photoFile);
      }
      router.push("/biz/offers");
    } catch (err) {
      setError(partnerErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Новый товар" onBack={() => router.back()} />
      {profileLoading && (
        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton w="100%" h={78} radius={12} />
          <Skeleton w="100%" h={78} radius={12} />
          <Skeleton w="100%" h={120} radius={12} />
        </div>
      )}
      {profileError && (
        <div style={{ padding: 16 }}>
          <ErrorState message={partnerErrorMessage(profileError)} />
        </div>
      )}
      {!profileLoading && !profileError && profile && !isApproved && (
        <PartnerModerationState profile={profile} context="feature" />
      )}
      {!profileLoading && !profileError && isApproved && (
      <div className="biz-form-content" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16, fontFamily: fontFn }}>
        <Field label="Название">
          <input
            name="offer-title"
            aria-label="Название"
            placeholder="Например, товар дня"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={inputStyle(t, fontFn)}
          />
        </Field>

        <Field label="Описание">
          <textarea
            name="offer-description"
            aria-label="Описание"
            placeholder="Кратко о том, что внутри"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            style={{ ...inputStyle(t, fontFn), resize: "vertical" }}
          />
        </Field>

        <Field label="Фото">
          <OfferImagePicker
            id="offer-photo"
            file={photoFile}
            loading={isSubmitting && Boolean(photoFile)}
            error={error.toLowerCase().includes("image") || error.toLowerCase().includes("фото") ? error : ""}
            disabled={isSubmitting}
            onFileChange={setPhotoFile}
          />
        </Field>

        <Field label="Комментарий продавца">
          <textarea
            name="discount-reason"
            aria-label="Комментарий продавца"
            placeholder="Например, особенности товара или условия покупки"
            value={discountReason}
            onChange={(event) => setDiscountReason(event.target.value)}
            rows={2}
            style={{ ...inputStyle(t, fontFn), resize: "vertical" }}
          />
        </Field>

        <div>
          <Label>Цены, ₸</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <input
                value={original}
                name="original-price"
                aria-label="Обычная цена"
                onChange={(event) => setOriginal(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                style={inputStyle(t, fontFn)}
              />
              <div style={{ fontSize: 10, color: t.textTer, marginTop: 4 }}>Старая, если есть</div>
            </div>
            <div style={{ flex: 1 }}>
              <input
                value={price}
                name="polka-price"
                aria-label="Цена товара"
                onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                style={{
                  ...inputStyle(t, fontFn),
                  border: `1.5px solid ${t.primary}`,
                  color: t.primaryDeep,
                  fontWeight: 750,
                }}
              />
              <div style={{ fontSize: 10, color: t.primaryDeep, marginTop: 4, fontWeight: 650 }}>Цена товара</div>
            </div>
          </div>
        </div>

        <div>
          <Label>Количество</Label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              justifyContent: "center",
              padding: 10,
              background: t.surface,
              borderRadius: 12,
              marginTop: 8,
            }}
          >
            <button onClick={() => setQty(Math.max(1, qty - 1))} type="button" style={roundButton(t, false)}>
              {Icon.minus(18, t.text)}
            </button>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.primaryDeep, minWidth: 48, textAlign: "center" }}>
              {qty}
            </div>
            <button onClick={() => setQty(qty + 1)} type="button" style={roundButton(t, true)}>
              {Icon.plus(18, t.primaryDeep)}
            </button>
          </div>
        </div>

        <Field label="Время для связи">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="time"
              name="pickup-from"
              aria-label="Время для связи от"
              value={pickupFrom}
              onChange={(e) => setPickupFrom(e.target.value)}
              style={inputStyle(t, fontFn)}
            />
            <span style={{ color: t.textSec }}>—</span>
            <input
              type="time"
              name="pickup-to"
              aria-label="Время для связи до"
              value={pickupTo}
              onChange={(e) => setPickupTo(e.target.value)}
              style={inputStyle(t, fontFn)}
            />
          </div>
        </Field>

        {error && <div style={{ color: t.danger, fontSize: 13, fontWeight: 650 }}>{error}</div>}

        <PillButtonBiz onClick={handleSave} size="lg" disabled={isSubmitting} style={{ marginTop: 2 }}>
          {isSubmitting ? "Сохранение…" : "Опубликовать"}
        </PillButtonBiz>
      </div>
      )}
    </AppScreenBiz>
  );
}

function Label({ children }: { children: ReactNode }) {
  const t = tokens();
  return (
    <div style={{ fontSize: 11, color: t.textSec, fontWeight: 650, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
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

function roundButton(t: ReturnType<typeof tokens>, primary: boolean): CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 22,
    border: "none",
    background: primary ? t.primary : t.bg,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
