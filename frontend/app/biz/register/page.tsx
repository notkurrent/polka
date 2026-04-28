"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "../../../components/biz/BizShared";
import { Badge, tokens, Icon, FONT } from "../../../components/ui/primitives";
import { api } from "@/lib/api";
import type { User } from "@/store/auth";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { partnerErrorMessage } from "@/lib/biz-api";

export default function BizRegisterPage() {
  const router = useRouter();
  const t = tokens();
  const setUser = useAuthStore((s) => s.setUser);
  const setSelectedMode = useAppStore((s) => s.setSelectedMode);

  const [data, setData] = useState<Record<string, string>>({
    name: "",
    type: "Кофейня",
    address: "",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!data.name.trim() || !data.type.trim() || !data.address.trim()) {
      setError("Заполните название, категорию и адрес.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/partner-api/register", {
        ...data,
        lat: 43.238949,
        lon: 76.889709,
      });
      const me = await api.get<User>("/users/me");
      setUser(me);
      setSelectedMode("business");
      setSubmitted(true);
    } catch (e) {
      const message = partnerErrorMessage(e);
      setError(message);
      if (message.includes("уже создан")) {
        setSelectedMode("business");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToBuyer = () => {
    setSelectedMode("buyer");
    router.replace("/");
  };

  const fields = [
    { id: "name", label: "Название заведения" },
    { id: "type", label: "Категория", options: ["Кофейня", "Пекарня", "Ресторан", "Кондитерская", "Столовая"] },
    { id: "address", label: "Адрес заведения" },
    { id: "description", label: "Описание", textarea: true },
  ];

  if (submitted) {
    return (
      <AppScreenBiz>
        <AppHeaderBiz title="Заявка" onBack={() => router.back()} />
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: t.primarySoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon.check ? Icon.check(40, t.primaryDeep) : null}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, textWrap: "pretty" }}>
              Заявка отправлена на проверку
            </div>
            <div style={{ fontSize: 13, color: t.textSec, marginTop: 8, lineHeight: 1.5, textWrap: "pretty" }}>
              Мы проверим данные заведения. После одобрения откроются позиции, брони и выдача заказов.
            </div>
          </div>
          <Badge tone="amber">Статус · на проверке</Badge>
          <PillButtonBiz onClick={() => router.push("/biz")} style={{ marginTop: 16 }}>
            Перейти в кабинет
          </PillButtonBiz>
        </div>
      </AppScreenBiz>
    );
  }

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Регистрация бизнеса" onBack={() => router.back()} />
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            background: t.primarySoft,
            borderRadius: 14,
            padding: 14,
            fontSize: 12,
            lineHeight: 1.5,
            color: t.primaryDeep,
          }}
        >
          После регистрации точку заведения можно будет уточнить в профиле.
        </div>

        {fields.map((f) => (
          <div key={f.id}>
            <label
              htmlFor={`biz-register-${f.id}`}
              style={{
                fontSize: 11,
                color: t.textSec,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {f.label}
            </label>
            {f.options ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {f.options.map((opt) => {
                  const on = data[f.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setData({ ...data, [f.id]: opt })}
                      style={{
                        minHeight: 44,
                        padding: "7px 12px",
                        borderRadius: 9999,
                        border: `1px solid ${on ? t.primaryDeep : t.divider}`,
                        background: on ? t.primaryDeep : "#fff",
                        color: on ? "#fff" : t.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: FONT(),
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : f.textarea ? (
              <textarea
                id={`biz-register-${f.id}`}
                name={f.id}
                value={data[f.id]}
                onChange={(e) => setData({ ...data, [f.id]: e.target.value })}
                rows={3}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  border: `1px solid ${t.divider}`,
                  borderRadius: 12,
                  fontSize: 16,
                  fontFamily: FONT(),
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                  appearance: "none",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            ) : (
              <input
                id={`biz-register-${f.id}`}
                name={f.id}
                value={data[f.id]}
                onChange={(e) => setData({ ...data, [f.id]: e.target.value })}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  border: `1px solid ${t.divider}`,
                  borderRadius: 12,
                  fontSize: 16,
                  fontFamily: FONT(),
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                  appearance: "none",
                  outline: "none",
                }}
              />
            )}
          </div>
        ))}
        {error && (
          <div
            style={{ color: error.includes("уже создан") ? t.primaryDeep : t.danger, fontSize: 13, fontWeight: 600 }}
          >
            {error}
          </div>
        )}
        {error.includes("уже создан") && (
          <PillButtonBiz onClick={() => router.push("/biz")} size="lg">
            Перейти в кабинет
          </PillButtonBiz>
        )}
        <PillButtonBiz onClick={handleSubmit} size="lg" disabled={loading} style={{ marginTop: 10 }}>
          {loading ? "Отправка…" : "Зарегистрировать"}
        </PillButtonBiz>
        <button
          type="button"
          onClick={switchToBuyer}
          style={{
            minHeight: 44,
            border: "none",
            background: "transparent",
            color: t.primaryDeep,
            fontSize: 14,
            fontWeight: 650,
            fontFamily: FONT(),
            cursor: "pointer",
          }}
        >
          Я покупатель, перейти к позициям
        </button>
      </div>
    </AppScreenBiz>
  );
}
