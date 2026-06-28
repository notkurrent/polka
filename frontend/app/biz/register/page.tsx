"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "../../../components/biz/BizShared";
import { Badge, tokens, Icon, FONT } from "../../../components/ui/primitives";
import { api } from "@/lib/api";
import type { User } from "@/store/auth";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import { BUSINESS_CATEGORIES, DEFAULT_BUSINESS_CATEGORY } from "@/lib/business-constants";
import { BusinessLogoPicker } from "@/components/biz/BusinessLogoPicker";
import { hapticNotification } from "@/lib/haptics";

export default function BizRegisterPage() {
  const router = useRouter();
  const t = tokens();
  const setUser = useAuthStore((s) => s.setUser);
  const setSelectedMode = useAppStore((s) => s.setSelectedMode);

  const [data, setData] = useState<Record<string, string>>({
    name: "",
    type: DEFAULT_BUSINESS_CATEGORY,
    address: "",
    map_url: "",
    phone: "",
    whatsapp_url: "",
    telegram_url: "",
    instagram_url: "",
    website_url: "",
    description: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [profileCreated, setProfileCreated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!data.name.trim() || !data.type.trim() || !data.address.trim()) {
      hapticNotification("error");
      setError("Заполните название, категорию и адрес.");
      return;
    }
    setLoading(true);
    setError("");
    setLogoError("");
    try {
      if (!profileCreated) {
        await api.post("/partner-api/register", {
          ...data,
          map_url: data.map_url.trim() || null,
          phone: data.phone.trim() || null,
          whatsapp_url: data.whatsapp_url.trim() || null,
          telegram_url: data.telegram_url.trim() || null,
          instagram_url: data.instagram_url.trim() || null,
          website_url: data.website_url.trim() || null,
          lat: 43.238949,
          lon: 76.889709,
        });
        setProfileCreated(true);
      }
      if (logoFile) {
        setLogoUploading(true);
        try {
          await bizApi.uploadLogo(logoFile);
        } catch (uploadError) {
          hapticNotification("warning");
          setLogoError(partnerErrorMessage(uploadError));
          setError("Заявка создана, но логотип не загрузился. Выберите другой файл или перейдите в кабинет.");
          return;
        } finally {
          setLogoUploading(false);
        }
      }
      const me = await api.get<User>("/users/me");
      setUser(me);
      setSelectedMode("business");
      hapticNotification("success");
      setSubmitted(true);
    } catch (e) {
      hapticNotification("error");
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

  const fields: Array<{
    id: string;
    label: string;
    options?: readonly string[];
    textarea?: boolean;
    placeholder?: string;
  }> = [
    { id: "name", label: "Название магазина" },
    { id: "type", label: "Категория", options: BUSINESS_CATEGORIES },
    { id: "address", label: "Адрес магазина" },
    { id: "map_url", label: "Ссылка на 2GIS / карту", placeholder: "https://2gis.kz/..." },
    { id: "phone", label: "Телефон", placeholder: "+7 700 123 45 67" },
    { id: "whatsapp_url", label: "WhatsApp", placeholder: "https://wa.me/77001234567" },
    { id: "telegram_url", label: "Telegram", placeholder: "https://t.me/store" },
    { id: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/store" },
    { id: "website_url", label: "Сайт", placeholder: "https://example.kz" },
    { id: "description", label: "Описание", textarea: true },
  ];

  if (submitted) {
    return (
      <AppScreenBiz>
        <AppHeaderBiz title="Заявка" onBack={() => router.back()} />
        <div
          className="biz-form-content"
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
              Профиль отправлен на проверку
            </div>
            <div style={{ fontSize: 13, color: t.textSec, marginTop: 8, lineHeight: 1.5, textWrap: "pretty" }}>
              Мы проверим данные магазина. После одобрения откроются товары, витрина и кабинет продавца.
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
      <div className="biz-form-content" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
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
          После регистрации точку магазина можно будет уточнить в профиле.
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
                      data-haptic="selection"
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
                placeholder={f.placeholder}
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
        <BusinessLogoPicker
          id="biz-register-logo"
          businessName={data.name}
          file={logoFile}
          loading={logoUploading}
          error={logoError}
          disabled={loading || logoUploading}
          onFileChange={(file) => {
            setLogoFile(file);
            setLogoError("");
            setError("");
          }}
        />
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
        {profileCreated && (
          <PillButtonBiz
            onClick={async () => {
              const me = await api.get<User>("/users/me");
              setUser(me);
              setSelectedMode("business");
              router.push("/biz");
            }}
            size="lg"
          >
            Перейти в кабинет
          </PillButtonBiz>
        )}
        <PillButtonBiz onClick={handleSubmit} size="lg" disabled={loading || logoUploading} style={{ marginTop: 10 }}>
          {loading || logoUploading
            ? profileCreated
              ? "Загружаем логотип…"
              : "Отправляем на проверку…"
            : profileCreated
              ? "Загрузить логотип и перейти"
              : "Отправить на проверку"}
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
          Я покупатель, перейти к товарам
        </button>
      </div>
    </AppScreenBiz>
  );
}
