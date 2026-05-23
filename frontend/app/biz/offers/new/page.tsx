"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { tokens, FONT } from "@/components/ui/primitives";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { OfferImagePicker } from "@/components/biz/OfferImagePicker";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import type { OfferAvailability } from "@/lib/api-types";

export default function BizCreateOfferPage() {
  const t = tokens();
  const router = useRouter();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: profile, isLoading: profileLoading, error: profileError } = useSWR("/partner-api/profile", bizApi.profile);
  const isApproved = profile?.status === "APPROVED";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [availability, setAvailability] = useState<OfferAvailability>("IN_STOCK");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOfferId, setCreatedOfferId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const validate = () => {
    const productPrice = Number(price);
    const stockCount = Number(stock);
    if (!title.trim()) return "Введите название товара.";
    if (!Number.isFinite(productPrice) || productPrice <= 0) return "Цена должна быть больше 0.";
    if (!Number.isInteger(stockCount) || stockCount < 0) return "Остаток должен быть целым числом от 0.";
    if (availability === "IN_STOCK" && stockCount <= 0) return "Для статуса в наличии укажите остаток больше 0.";
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
        availability,
        name: title.trim(),
        description: description.trim(),
        category: category.trim(),
        tags: tags.trim(),
        price: Number(price),
        stock: Number(stock),
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
    <AppScreenBiz className="biz-offer-form-screen">
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
        <div className="biz-form-content biz-offer-form-content" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16, fontFamily: fontFn }}>
          <Field label="Название">
            <input
              name="offer-title"
              aria-label="Название"
              placeholder="Например, керамическая кружка"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              style={inputStyle(t, fontFn)}
            />
          </Field>

          <Field label="Описание" className="biz-form-field-wide">
            <textarea
              name="offer-description"
              aria-label="Описание"
              placeholder="Материал, размер, состояние, условия покупки"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              style={{ ...inputStyle(t, fontFn), resize: "vertical" }}
            />
          </Field>

          <Field label="Фото" className="biz-form-field-wide">
            <OfferImagePicker
              id="offer-photo"
              file={photoFile}
              loading={isSubmitting && Boolean(photoFile)}
              error={error.toLowerCase().includes("image") || error.toLowerCase().includes("фото") ? error : ""}
              disabled={isSubmitting}
              onFileChange={setPhotoFile}
            />
          </Field>

          <Field label="Категория">
            <input
              name="offer-category"
              aria-label="Категория"
              placeholder="Например, посуда"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              style={inputStyle(t, fontFn)}
            />
          </Field>

          <Field label="Теги">
            <input
              name="offer-tags"
              aria-label="Теги"
              placeholder="ручная работа, подарок, дом"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              style={inputStyle(t, fontFn)}
            />
          </Field>

          <Field label="Цена, ₸">
            <input
              value={price}
              name="price"
              aria-label="Цена"
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              style={{
                ...inputStyle(t, fontFn),
                border: `1.5px solid ${t.primary}`,
                color: t.primaryDeep,
                fontWeight: 750,
              }}
            />
          </Field>

          <div className="biz-form-field-wide biz-inventory-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Наличие">
              <select
                value={availability}
                name="availability"
                aria-label="Статус наличия"
                onChange={(event) => setAvailability(event.target.value as OfferAvailability)}
                style={inputStyle(t, fontFn)}
              >
                <option value="IN_STOCK">В наличии</option>
                <option value="OUT_OF_STOCK">Нет в наличии</option>
                <option value="PREORDER">Предзаказ</option>
                <option value="HIDDEN">Скрыт</option>
              </select>
            </Field>
            <Field label="Остаток">
              <input
                value={stock}
                name="stock"
                aria-label="Остаток"
                onChange={(event) => setStock(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                style={inputStyle(t, fontFn)}
              />
            </Field>
          </div>

          {error && <div className="biz-form-message" style={{ color: t.danger, fontSize: 13, fontWeight: 650 }}>{error}</div>}

          <PillButtonBiz onClick={handleSave} size="lg" disabled={isSubmitting} style={{ marginTop: 2 }}>
            {isSubmitting ? "Сохранение..." : "Опубликовать"}
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

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={["biz-form-field", className].filter(Boolean).join(" ")}>
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
