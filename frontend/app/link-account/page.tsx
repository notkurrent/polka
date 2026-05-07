"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { tokens, FONT, PillButton } from "@/components/ui/primitives";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, api, getApiErrorMessage } from "@/lib/api";
import { accountDestination } from "@/lib/account-linking";
import { AUTH_UNDERLINE_INPUT_CLASS, authUnderlineInputStyle } from "@/lib/auth-input";
import { isPhoneComplete, normalizePhoneInput } from "@/lib/phone";
import { useAppStore } from "@/store/app";
import { useAuthStore, type User } from "@/store/auth";

interface AuthResponse {
  access_token: string;
  user: User;
}

export default function LinkAccountPage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { isAuthenticated, isLoading } = useAuth();
  const setAuth = useAuthStore((state) => state.setAuth);
  const selectedMode = useAppStore((state) => state.selectedMode);
  const onboardingDone = useAppStore((state) => state.onboardingDone);

  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/landing");
  }, [isAuthenticated, isLoading, router]);

  const canSubmit = isPhoneComplete(phone) && password.length > 0 && !isSubmitting;

  const errorMessage = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.code === "INVALID_PHONE_OR_PASSWORD" || err.status === 401) return "Неверный телефон или пароль.";
      if (err.code === "WEB_ACCOUNT_ALREADY_LINKED") return "Этот web-аккаунт уже связан с другим Telegram.";
      if (err.code === "TELEGRAM_ACCOUNT_REQUIRED") return "Откройте эту страницу из Telegram Mini App.";
    }
    return getApiErrorMessage(err, "Не удалось связать аккаунт. Проверьте данные и попробуйте ещё раз.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);
    try {
      const response = await api.post<AuthResponse>("/auth/telegram/link-web-account", {
        phone: normalizePhoneInput(phone),
        password,
      });
      setAuth(response.user, response.access_token);
      router.replace(accountDestination(response.user, selectedMode, onboardingDone));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldStyle = authUnderlineInputStyle(t, fontFn);

  if (isLoading || !isAuthenticated) return <div style={{ minHeight: "100dvh", background: t.bg }} />;

  return (
    <main className="screen-scroll-with-bottom-action" style={{ background: t.bg, color: t.text, fontFamily: fontFn }}>
      <AppHeader title="Связать аккаунт" onBack={() => router.back()} />
      <form className="app-form-content" onSubmit={handleSubmit} style={{ minHeight: "calc(100% - 56px - var(--app-safe-top))", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18, boxSizing: "border-box" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800 }}>Связать аккаунт</h1>
          <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
            Если вы уже входили на сайте по телефону и паролю, свяжите этот web-аккаунт с Telegram. Заказы, профиль и
            бизнес-кабинет будут общими.
          </p>
        </div>

        <div>
          <label htmlFor="link-phone" style={{ fontSize: 12, color: t.textSec, fontWeight: 650 }}>
            Номер телефона
          </label>
          <input
            id="link-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={18}
            value={phone}
            onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
            className={AUTH_UNDERLINE_INPUT_CLASS}
            style={fieldStyle}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="link-password" style={{ fontSize: 12, color: t.textSec, fontWeight: 650 }}>
            Пароль от web-аккаунта
          </label>
          <input
            id="link-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={AUTH_UNDERLINE_INPUT_CLASS}
            style={fieldStyle}
          />
        </div>

        {error && <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: t.danger, fontWeight: 650 }}>{error}</div>}

        <div style={{ flex: 1 }} />
        <PillButton type="submit" size="lg" disabled={!canSubmit} loading={isSubmitting}>
          Связать web-аккаунт
        </PillButton>
      </form>
    </main>
  );
}
