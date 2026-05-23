"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
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

type Mode = "complete" | "conflict" | "success";

export default function CompleteAccountPage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { isAuthenticated, isLoading } = useAuth();
  const setAuth = useAuthStore((state) => state.setAuth);
  const selectedMode = useAppStore((state) => state.selectedMode);
  const onboardingDone = useAppStore((state) => state.onboardingDone);

  const [mode, setMode] = useState<Mode>("complete");
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successUser, setSuccessUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/landing");
  }, [isAuthenticated, isLoading, router]);

  const validationError = useMemo(() => {
    if (!isPhoneComplete(phone)) return "Введите номер телефона полностью";
    if (password.length < 8) return "Пароль должен быть не короче 8 символов";
    if (confirmPassword && password !== confirmPassword) return "Пароли не совпадают";
    return "";
  }, [confirmPassword, password, phone]);

  const canComplete = !validationError && confirmPassword.length > 0 && !isSubmitting;
  const canLink = isPhoneComplete(phone) && linkPassword.length > 0 && !isSubmitting;

  const finish = (response: AuthResponse) => {
    setAuth(response.user, response.access_token);
    setSuccessUser(response.user);
    setMode("success");
  };

  const handleComplete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canComplete) {
      setError(validationError || "Заполните все поля");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const response = await api.post<AuthResponse>("/auth/telegram/complete-account", {
        phone: normalizePhoneInput(phone),
        password,
      });
      finish(response);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_BELONGS_TO_WEB_ACCOUNT") {
        setMode("conflict");
        setLinkPassword("");
        setError("");
      } else if (err instanceof ApiError && err.code === "TELEGRAM_ACCOUNT_REQUIRED") {
        setError("Откройте эту страницу из Telegram Mini App.");
      } else {
        setError(getApiErrorMessage(err, "Не удалось добавить телефон и пароль. Проверьте данные и попробуйте ещё раз."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canLink) return;

    setError("");
    setIsSubmitting(true);
    try {
      const response = await api.post<AuthResponse>("/auth/telegram/link-web-account", {
        phone: normalizePhoneInput(phone),
        password: linkPassword,
      });
      finish(response);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "INVALID_PHONE_OR_PASSWORD" || err.status === 401)) {
        setError("Неверный пароль от существующего аккаунта.");
      } else if (err instanceof ApiError && err.code === "WEB_ACCOUNT_ALREADY_LINKED") {
        setError("Этот web-аккаунт уже связан с другим Telegram.");
      } else {
        setError(getApiErrorMessage(err, "Не удалось связать аккаунт. Попробуйте ещё раз."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => router.replace(accountDestination(successUser, selectedMode, onboardingDone));

  const fieldStyle = authUnderlineInputStyle(t, fontFn);

  const labelStyle: React.CSSProperties = { fontSize: 12, color: t.textSec, fontWeight: 650 };

  if (isLoading || !isAuthenticated) return <div style={{ minHeight: "100dvh", background: t.bg }} />;

  return (
    <main className="screen-scroll-with-bottom-action" style={{ background: t.bg, color: t.text, fontFamily: fontFn }}>
      <AppHeader title="Добавить телефон и пароль" onBack={() => router.back()} />

      {mode === "success" ? (
        <div className="app-form-content" style={{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800 }}>Теперь можно входить на сайте</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
            Телефон и пароль сохранены в вашем аккаунте Polka.
          </p>
          <PillButton size="lg" onClick={goNext}>
            Продолжить
          </PillButton>
        </div>
      ) : mode === "conflict" ? (
        <form className="app-form-content" onSubmit={handleLink} style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800 }}>Аккаунт с этим номером уже есть</h1>
            <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
              Введите пароль от существующего web-аккаунта, чтобы связать его с Telegram.
            </p>
          </div>
          <div>
            <label htmlFor="conflict-phone" style={labelStyle}>
              Номер телефона
            </label>
            <input
              id="conflict-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              maxLength={18}
              value={phone}
              onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
              className={AUTH_UNDERLINE_INPUT_CLASS}
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="conflict-password" style={labelStyle}>
              Пароль от web-аккаунта
            </label>
            <input id="conflict-password" name="password" type="password" autoComplete="current-password" value={linkPassword} onChange={(event) => setLinkPassword(event.target.value)} className={AUTH_UNDERLINE_INPUT_CLASS} style={fieldStyle} autoFocus />
          </div>
          {error && <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: t.danger, fontWeight: 650 }}>{error}</div>}
          <PillButton type="submit" size="lg" disabled={!canLink} loading={isSubmitting}>
            Связать аккаунт
          </PillButton>
          <button
            type="button"
            onClick={() => {
              setMode("complete");
              setError("");
              setPassword("");
              setConfirmPassword("");
            }}
            style={{
              minHeight: 44,
              border: "none",
              background: "transparent",
              color: t.primaryDeep,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: fontFn,
              cursor: "pointer",
            }}
          >
            Использовать другой номер
          </button>
        </form>
      ) : (
        <form className="app-form-content" onSubmit={handleComplete} style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800 }}>Добавить телефон и пароль</h1>
            <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
              Так вы сможете входить в этот же аккаунт на сайте, а профиль и избранные магазины останутся на месте.
            </p>
          </div>
          <div>
            <label htmlFor="complete-phone" style={labelStyle}>
              Номер телефона
            </label>
            <input
              id="complete-phone"
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
            <label htmlFor="complete-password" style={labelStyle}>
              Пароль
            </label>
            <input id="complete-password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={AUTH_UNDERLINE_INPUT_CLASS} style={fieldStyle} />
          </div>
          <div>
            <label htmlFor="complete-confirm" style={labelStyle}>
              Повторите пароль
            </label>
            <input id="complete-confirm" name="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={AUTH_UNDERLINE_INPUT_CLASS} style={fieldStyle} />
          </div>
          {(error || (confirmPassword && validationError)) && (
            <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: t.danger, fontWeight: 650 }}>
              {error || validationError}
            </div>
          )}
          <PillButton type="submit" size="lg" disabled={!canComplete} loading={isSubmitting}>
            Добавить
          </PillButton>
        </form>
      )}
    </main>
  );
}
