"use client";

import React, { FormEvent, useState } from "react";
import { useAuthStore, type User } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { tokens, FONT, PillButton } from "@/components/ui/primitives";
import { api, getApiErrorMessage } from "@/lib/api";
import { AUTH_UNDERLINE_INPUT_CLASS, authUnderlineInputStyle } from "@/lib/auth-input";
import { isPhoneComplete, normalizePhoneInput } from "@/lib/phone";

interface AuthResponse {
  access_token: string;
  user: User;
}

export default function LoginForm() {
  const t = tokens();
  const fontFn = FONT();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setSelectedMode = useAppStore((s) => s.setSelectedMode);

  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isPhoneComplete(phone) && password.length > 0 && !isSubmitting;

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
    } catch (e) {
      setError(getApiErrorMessage(e, "Неверный телефон или пароль"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        background: t.bg,
        fontFamily: fontFn,
        color: t.text,
        padding: "20px 20px max(24px, env(safe-area-inset-bottom))",
        minHeight: "100dvh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label htmlFor="inline-login-phone" style={{ fontSize: 12, color: t.textSec, fontWeight: 600 }}>
            Номер телефона
          </label>
          <input
            id="inline-login-phone"
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
          <label htmlFor="inline-login-password" style={{ fontSize: 12, color: t.textSec, fontWeight: 600 }}>
            Пароль
          </label>
          <input
            id="inline-login-password"
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
      </div>

      <div style={{ flex: 1 }} />

      <PillButton type="submit" size="lg" disabled={!canSubmit} loading={isSubmitting}>
        Войти
      </PillButton>
    </form>
  );
}
