"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tokens, FONT, PillButton } from "@/components/ui/primitives";
import AppHeader from "@/components/AppHeader";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { api, getApiErrorMessage } from "@/lib/api";
import { AUTH_UNDERLINE_INPUT_CLASS, authUnderlineInputStyle } from "@/lib/auth-input";
import { authEntryRoute, useTelegramAuthPage } from "@/lib/auth-routing";
import { isPhoneComplete, normalizePhoneInput } from "@/lib/phone";
import type { User } from "@/store/auth";

interface AuthResponse {
  access_token: string;
  user: User;
}

export default function LoginPage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setSelectedMode = useAppStore((s) => s.setSelectedMode);

  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTelegramPage = useTelegramAuthPage();

  const canSubmit = isPhoneComplete(phone) && password.length > 0 && !isSubmitting;

  useEffect(() => {
    if (isTelegramPage) router.replace("/");
  }, [isTelegramPage, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);

    try {
      const resp = await api.post<AuthResponse>("/auth/web/login", {
        phone: normalizePhoneInput(phone),
        password,
      });
      setAuth(resp.user, resp.access_token);
      setSelectedMode(null);
      router.replace("/choose-role");
    } catch (e) {
      setError(getApiErrorMessage(e, "Неверный телефон или пароль"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTelegramPage !== false) {
    return <div style={{ minHeight: "100dvh", background: t.bg }} />;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: t.bg,
        fontFamily: fontFn,
        color: t.text,
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <AppHeader title="Вход" onBack={() => router.push(authEntryRoute())} />

      <form
        onSubmit={handleSubmit}
        style={{
          flex: 1,
          padding: "20px 20px 0",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div>
          <label htmlFor="login-phone" style={{ fontSize: 12, color: t.textSec, fontWeight: 600 }}>
            Номер телефона
          </label>
          <input
            id="login-phone"
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            maxLength={18}
            value={phone}
            onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
            autoFocus
            className={AUTH_UNDERLINE_INPUT_CLASS}
            style={authUnderlineInputStyle(t, fontFn, 22)}
          />
        </div>

        <div>
          <label htmlFor="login-password" style={{ fontSize: 12, color: t.textSec, fontWeight: 600 }}>
            Пароль
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_UNDERLINE_INPUT_CLASS}
            style={authUnderlineInputStyle(t, fontFn)}
          />
        </div>

        {error && (
          <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: t.danger, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push("/forgot-password")}
          style={{
            alignSelf: "flex-start",
            minHeight: 44,
            padding: 0,
            border: "none",
            background: "transparent",
            color: t.primaryDeep,
            fontFamily: fontFn,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Забыли пароль?
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PillButton type="submit" size="lg" disabled={!canSubmit} loading={isSubmitting}>
            Войти
          </PillButton>
          <PillButton type="button" size="md" variant="ghost" onClick={() => router.push("/signup")}>
            Создать аккаунт
          </PillButton>
        </div>
      </form>
    </div>
  );
}
