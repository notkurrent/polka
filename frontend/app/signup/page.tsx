"use client";

import React, { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tokens, FONT, PillButton } from "@/components/ui/primitives";
import AppHeader from "@/components/AppHeader";
import { ApiError, api, getApiErrorMessage } from "@/lib/api";
import { AUTH_UNDERLINE_INPUT_CLASS, authUnderlineInputStyle } from "@/lib/auth-input";
import { isPhoneComplete, normalizePhoneInput } from "@/lib/phone";
import { useAuthStore, type User } from "@/store/auth";
import { useAppStore } from "@/store/app";

interface AuthResponse {
  access_token: string;
  user: User;
}

export default function SignupPage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setSelectedMode = useAppStore((s) => s.setSelectedMode);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const validationError = useMemo(() => {
    if (!isPhoneComplete(phone)) return "Введите номер телефона полностью";
    if (password.length < 8) return "Пароль должен быть не короче 8 символов";
    if (confirmPassword && password !== confirmPassword) return "Пароли не совпадают";
    return "";
  }, [confirmPassword, password, phone]);

  const canSubmit = name.trim().length >= 2 && !validationError && confirmPassword.length > 0 && !isSubmitting;
  const stepTitles = ["Как вас зовут?", "Ваш номер", "Придумайте пароль"];
  const currentStepValid =
    (step === 0 && name.trim().length >= 2) ||
    (step === 1 && isPhoneComplete(phone)) ||
    (step === 2 && canSubmit);

  const handleNext = () => {
    setError("");
    if (step === 0 && name.trim().length < 2) {
      setError("Введите имя");
      return;
    }
    if (step === 1 && !isPhoneComplete(phone)) {
      setError("Введите номер телефона полностью");
      return;
    }
    setStep((current) => Math.min(current + 1, 2));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < 2) {
      handleNext();
      return;
    }
    if (!canSubmit) {
      setError(validationError || "Заполните все поля");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post<AuthResponse>("/auth/web/register", {
        name: name.trim(),
        phone: normalizePhoneInput(phone),
        password,
      });
      setAuth(response.user, response.access_token);
      setSelectedMode(null);
      router.replace("/choose-role");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.code === "ACCOUNT_EXISTS_WITHOUT_PASSWORD") {
          setError("Этот номер уже связан с Telegram. Откройте Mini App и задайте пароль в профиле.");
        } else {
          setError("Аккаунт с этим номером уже существует. Войдите по номеру и паролю.");
        }
        return;
      }
      setError(getApiErrorMessage(err, "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldStyle = authUnderlineInputStyle(t, fontFn);

  const labelStyle: React.CSSProperties = { fontSize: 12, color: t.textSec, fontWeight: 600 };

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        overflow: "auto",
        background: t.bg,
        fontFamily: fontFn,
        color: t.text,
        WebkitFontSmoothing: "antialiased",
        paddingBottom: "max(32px, var(--app-safe-bottom), env(safe-area-inset-bottom))",
      }}
    >
      <AppHeader
        title="Регистрация"
        sub={`Шаг ${step + 1} из 3`}
        onBack={step === 0 ? () => router.back() : () => {
          setError("");
          setStep((current) => Math.max(current - 1, 0));
        }}
      />
      <form
        onSubmit={handleSubmit}
        style={{
          minHeight: "calc(100dvh - 92px)",
          padding: "24px 20px max(32px, var(--app-safe-bottom), env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                background: item <= step ? t.primary : t.divider,
                transition: "background 180ms ease",
              }}
            />
          ))}
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800, letterSpacing: 0 }}>
            {stepTitles[step]}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
            {step === 0 && "Так мы будем обращаться к вам в заказах и профиле."}
            {step === 1 && "Используйте казахстанский номер. Он нужен для входа и связи аккаунтов."}
            {step === 2 && "Пароль нужен для входа на сайте без SMS."}
          </p>
        </div>

        {step === 0 && (
          <div>
            <label htmlFor="signup-name" style={labelStyle}>
              Имя
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              autoComplete="name"
              autoFocus
              className={AUTH_UNDERLINE_INPUT_CLASS}
              style={fieldStyle}
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <label htmlFor="signup-phone" style={labelStyle}>
              Номер телефона
            </label>
            <input
              id="signup-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
              placeholder="+7 (700) 000-00-00"
              autoComplete="tel"
              maxLength={18}
              autoFocus
              className={AUTH_UNDERLINE_INPUT_CLASS}
              style={fieldStyle}
            />
          </div>
        )}

        {step === 2 && (
          <>
            <div>
              <label htmlFor="signup-password" style={labelStyle}>
                Пароль
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                autoFocus
                className={AUTH_UNDERLINE_INPUT_CLASS}
                style={fieldStyle}
              />
            </div>

            <div>
              <label htmlFor="signup-confirm-password" style={labelStyle}>
                Повторите пароль
              </label>
              <input
                id="signup-confirm-password"
                name="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={AUTH_UNDERLINE_INPUT_CLASS}
                style={fieldStyle}
              />
            </div>
          </>
        )}

        {(error || (confirmPassword && validationError)) && (
          <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: t.danger, fontWeight: 600 }}>
            {error || validationError}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 11, color: t.textTer, lineHeight: 1.5 }}>
          Продолжая, вы принимаете условия сервиса и политику конфиденциальности.
        </div>

        <PillButton type="submit" disabled={!currentStepValid} loading={isSubmitting} size="lg">
          {step < 2 ? "Далее" : "Создать аккаунт"}
        </PillButton>

        <button
          type="button"
          onClick={() => router.push("/login")}
          style={{
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
          Уже есть аккаунт? Войти
        </button>
      </form>
    </div>
  );
}
