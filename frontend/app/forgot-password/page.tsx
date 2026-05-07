"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { FONT, PillButton, tokens } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { AUTH_UNDERLINE_INPUT_CLASS, authUnderlineInputStyle } from "@/lib/auth-input";
import { isPhoneComplete, normalizePhoneInput } from "@/lib/phone";

interface ForgotPasswordResponse {
  message?: string;
}

const PASSWORD_RESET_NOTICE =
  "Автоматическое восстановление пока не подключено. Если вы забыли пароль, напишите в поддержку: мы проверим владение аккаунтом и поможем вручную. Это сообщение не означает, что аккаунт с таким номером есть или отсутствует.";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT();

  const [phone, setPhone] = useState("+7");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isPhoneComplete(phone) && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("Введите номер телефона полностью");
      return;
    }

    setError("");
    setResult("");
    setIsSubmitting(true);

    try {
      await api.post<ForgotPasswordResponse>("/auth/password/forgot", {
        phone: normalizePhoneInput(phone),
      });
      setResult(PASSWORD_RESET_NOTICE);
    } catch {
      setResult(PASSWORD_RESET_NOTICE);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <AppHeader title="Восстановление" onBack={() => router.push("/login")} />

      <form
        className="app-form-content"
        onSubmit={handleSubmit}
        style={{
          flex: 1,
          padding: "20px 20px 0",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
          Для входа в Polka SMS не нужен: используйте номер телефона и пароль. Автоматический сброс пароля
          еще не подключен, поэтому восстановление идет через поддержку.
        </p>

        <div>
          <label htmlFor="forgot-phone" style={{ fontSize: 12, color: t.textSec, fontWeight: 600 }}>
            Номер телефона
          </label>
          <input
            id="forgot-phone"
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

        {error && (
          <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: t.danger, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {result && (
          <div
            role="status"
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: t.primaryDeep,
              background: t.primarySoft,
              borderRadius: 8,
              padding: 14,
            }}
          >
            {result}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <PillButton type="submit" size="lg" disabled={!canSubmit} loading={isSubmitting}>
          Получить инструкцию
        </PillButton>
        {result && (
          <PillButton type="button" size="lg" variant="muted" onClick={() => router.push("/profile/support")}>
            Написать в поддержку
          </PillButton>
        )}
      </form>
    </div>
  );
}
