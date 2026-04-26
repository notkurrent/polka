"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tokens, Icon, FONT } from "@/components/ui/primitives";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";

export default function BizCreateOfferPage() {
  const t = tokens();
  const router = useRouter();
  const fontFn = FONT ? FONT() : "system-ui";

  const [format, setFormat] = useState<"MAGIC_BOX" | "SPECIFIC">("MAGIC_BOX");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [original, setOriginal] = useState("");
  const [qty, setQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const discount = useMemo(() => {
    const oldPrice = Number(original);
    const newPrice = Number(price);
    if (!oldPrice || !newPrice) return 0;
    return Math.max(0, Math.round((1 - newPrice / oldPrice) * 100));
  }, [original, price]);

  const validate = () => {
    const oldPrice = Number(original);
    const newPrice = Number(price);
    if (!title.trim()) return "Введите название позиции.";
    if (!Number.isFinite(oldPrice) || oldPrice <= 0) return "Обычная цена должна быть больше 0.";
    if (!Number.isFinite(newPrice) || newPrice <= 0) return "Цена Polka должна быть больше 0.";
    if (newPrice >= oldPrice) return "Цена Polka должна быть ниже обычной цены.";
    if (!Number.isInteger(qty) || qty < 1) return "Укажите хотя бы 1 порцию.";
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
      await bizApi.createOffer({
        type: format,
        name: title.trim(),
        old_price: Number(original),
        new_price: Number(price),
        stock: qty,
      });
      router.push("/biz/offers");
    } catch (err) {
      setError(partnerErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Новая позиция" onBack={() => router.back()} />
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16, fontFamily: fontFn }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Label>Формат</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {[
              { id: "MAGIC_BOX", label: "Сюрприз", desc: "Случайная позиция дня" },
              { id: "SPECIFIC", label: "Состав", desc: "Понятное содержимое" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormat(opt.id as "MAGIC_BOX" | "SPECIFIC")}
                style={{
                  minHeight: 78,
                  padding: 12,
                  borderRadius: 12,
                  textAlign: "left",
                  border: `1.5px solid ${format === opt.id ? t.primaryDeep : t.divider}`,
                  background: format === opt.id ? t.primarySoft : "#fff",
                  cursor: "pointer",
                  fontFamily: fontFn,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 750, color: t.text }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: t.textSec, marginTop: 3, lineHeight: 1.35 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <Field label="Название">
          <input
            name="offer-title"
            aria-label="Название"
            placeholder="Например, вечерняя позиция"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={inputStyle(t, fontFn)}
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
              <div style={{ fontSize: 10, color: t.textTer, marginTop: 4 }}>Обычная</div>
            </div>
            <div style={{ flex: 1 }}>
              <input
                value={price}
                name="polka-price"
                aria-label="Цена Polka"
                onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                style={{ ...inputStyle(t, fontFn), border: `1.5px solid ${t.primary}`, color: t.primaryDeep, fontWeight: 750 }}
              />
              <div style={{ fontSize: 10, color: t.primaryDeep, marginTop: 4, fontWeight: 650 }}>Скидка {discount}%</div>
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
            <div style={{ fontSize: 28, fontWeight: 800, color: t.primaryDeep, minWidth: 48, textAlign: "center" }}>{qty}</div>
            <button onClick={() => setQty(qty + 1)} type="button" style={roundButton(t, true)}>
              {Icon.plus(18, t.primaryDeep)}
            </button>
          </div>
        </div>

        <div style={{ padding: 12, background: t.primarySoft, borderRadius: 12, color: t.primaryDeep, fontSize: 12, lineHeight: 1.45 }}>
          Окно выдачи берётся из часов работы заведения. Изменить их можно в профиле.
        </div>

        {error && <div style={{ color: t.danger, fontSize: 13, fontWeight: 650 }}>{error}</div>}

        <PillButtonBiz onClick={handleSave} size="lg" disabled={isSubmitting} style={{ marginTop: 2 }}>
          {isSubmitting ? "Сохранение…" : "Опубликовать"}
        </PillButtonBiz>
      </div>
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
    borderRadius: 10,
    fontSize: 14,
    fontFamily: fontFn,
    boxSizing: "border-box",
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
