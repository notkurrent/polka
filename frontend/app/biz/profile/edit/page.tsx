"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { tokens, FONT } from "@/components/ui/primitives";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import { Skeleton } from "@/components/ui/Skeleton";

export default function BizProfileEditPage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";

  const [data, setData] = useState({
    name: "",
    category: "Кофейня",
    address: "",
    hours: "09:00-21:00",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    bizApi
      .profile()
      .then((profile) =>
        setData({
          name: profile.name || "",
          category: profile.category || "Кофейня",
          address: profile.address || "",
          hours: profile.hours || "09:00-21:00",
          description: profile.description || "",
        }),
      )
      .catch((err) => setError(partnerErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["Кофейня", "Пекарня", "Ресторан", "Кондитерская", "Столовая"];

  const save = async () => {
    if (!data.name.trim() || !data.address.trim()) {
      setError("Название и адрес обязательны.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await bizApi.updateProfile({
        name: data.name.trim(),
        category: data.category,
        address: data.address.trim(),
        hours: data.hours.trim(),
        description: data.description.trim(),
        lat: 43.238949,
        lon: 76.889709,
      });
      router.push("/biz/profile");
    } catch (err) {
      setError(partnerErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Редактировать" onBack={() => router.back()} />
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14, fontFamily: fontFn }}>
        {loading ? (
          <>
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={120} radius={12} />
          </>
        ) : (
          <>
            <Field label="Название заведения">
              <input name="partner-name" aria-label="Название заведения" value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} style={inputStyle(t, fontFn)} />
            </Field>

            <div>
              <Label>Категория</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {categories.map((opt) => {
                  const on = data.category === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setData({ ...data, category: opt })}
                      style={{
                        minHeight: 44,
                        padding: "0 12px",
                        borderRadius: 9999,
                        border: `1px solid ${on ? t.primaryDeep : t.divider}`,
                        background: on ? t.primaryDeep : "#fff",
                        color: on ? "#fff" : t.text,
                        fontSize: 12,
                        fontWeight: 650,
                        cursor: "pointer",
                        fontFamily: fontFn,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Адрес">
              <input name="partner-address" aria-label="Адрес" value={data.address} onChange={(event) => setData({ ...data, address: event.target.value })} style={inputStyle(t, fontFn)} />
            </Field>

            <Field label="Часы работы">
              <input name="partner-hours" aria-label="Часы работы" value={data.hours} onChange={(event) => setData({ ...data, hours: event.target.value })} style={inputStyle(t, fontFn)} />
            </Field>

            <Field label="Описание">
              <textarea
                value={data.description}
                name="partner-description"
                aria-label="Описание"
                onChange={(event) => setData({ ...data, description: event.target.value })}
                rows={4}
                style={{ ...inputStyle(t, fontFn), resize: "vertical" }}
              />
            </Field>

            <div style={{ padding: 12, background: t.primarySoft, color: t.primaryDeep, borderRadius: 12, fontSize: 12, lineHeight: 1.45 }}>
              Геопозицию заведения можно будет уточнить отдельно. Сейчас используется точка по умолчанию для Алматы.
            </div>

            {error && <div style={{ color: t.danger, fontSize: 13, fontWeight: 650 }}>{error}</div>}
            <PillButtonBiz onClick={save} disabled={saving} size="lg" style={{ marginTop: 8 }}>
              {saving ? "Сохранение…" : "Сохранить"}
            </PillButtonBiz>
          </>
        )}
      </div>
    </AppScreenBiz>
  );
}

function Label({ children }: { children: ReactNode }) {
  const t = tokens();
  return (
    <label style={{ fontSize: 11, color: t.textSec, fontWeight: 650, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ marginTop: 6 }}>{children}</div>
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
