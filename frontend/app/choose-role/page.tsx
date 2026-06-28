"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isTelegramAuthContext, nextRouteForBusiness, nextRouteForBuyer } from "@/lib/auth-routing";
import { isTelegramAccountIncomplete } from "@/lib/account-linking";
import { useAppStore } from "@/store/app";
import { AccountLinkingPrompt } from "@/components/account/AccountLinkingPrompt";
import { tokens, Icon, FONT } from "@/components/ui/primitives";

export default function ChooseRolePage() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { user, isAuthenticated, isLoading } = useAuth();
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const selectedMode = useAppStore((s) => s.selectedMode);
  const setSelectedMode = useAppStore((s) => s.setSelectedMode);
  const linkPromptDismissed = useAppStore((s) => s.accountLinkPromptDismissed);
  const completionPromptDismissed = useAppStore((s) => s.accountCompletionPromptDismissed);
  const dismissLinkPrompt = useAppStore((s) => s.dismissAccountLinkPrompt);
  const dismissCompletionPrompt = useAppStore((s) => s.dismissAccountCompletionPrompt);

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isTelegramAuthContext()) {
      router.replace("/landing");
      return;
    }

    const openedAutomatically =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("auto") === "1";

    if (isAuthenticated && openedAutomatically && selectedMode) {
      router.replace(selectedMode === "buyer" ? nextRouteForBuyer(onboardingDone) : nextRouteForBusiness(user));
    }
  }, [isAuthenticated, isLoading, onboardingDone, router, selectedMode, user]);

  const chooseBuyer = () => {
    setSelectedMode("buyer");
    router.replace(nextRouteForBuyer(onboardingDone));
  };

  const chooseBusiness = () => {
    setSelectedMode("business");
    router.replace(nextRouteForBusiness(user));
  };

  if (isLoading || !isAuthenticated) {
    return <div style={{ minHeight: "100dvh", background: t.bg }} />;
  }

  const roleCard = ({
    title,
    description,
    icon,
    active,
    onClick,
  }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }) => (
      <button
        type="button"
        onClick={onClick}
        data-haptic="selection"
        style={{
        width: "100%",
        minHeight: 104,
        padding: "16px",
        borderRadius: 16,
        border: `1.5px solid ${active ? t.primaryDeep : t.divider}`,
        background: active ? t.primarySoft : t.bg,
        color: t.text,
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: fontFn,
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: active ? t.primary : t.surface,
          color: t.primaryDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 750, letterSpacing: 0 }}>{title}</span>
        <span style={{ display: "block", fontSize: 13, color: t.textSec, lineHeight: 1.45, marginTop: 4 }}>
          {description}
        </span>
      </span>
      <span style={{ display: "flex", color: t.textTer }}>{Icon.chevronR(18, t.textTer)}</span>
    </button>
  );

  return (
    <main
      className="screen-scroll"
      style={{
        background: t.bg,
        color: t.text,
        fontFamily: fontFn,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          maxWidth: 560,
          margin: "0 auto",
          paddingTop: "calc(28px + var(--app-safe-top))",
          paddingRight: 20,
          paddingBottom: "calc(28px + var(--app-safe-bottom))",
          paddingLeft: 20,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: t.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon.leaf(20, t.primaryDeep)}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 0 }}>Polka</div>
        </div>

        <div style={{ marginTop: 44, marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.12, letterSpacing: 0, fontWeight: 800 }}>
            Как хотите пользоваться Polka?
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: t.textSec, lineHeight: 1.5, textWrap: "pretty" }}>
            Выберите режим на сейчас. Его можно сменить позже в профиле.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {roleCard({
            title: "Я покупатель",
            description: "Ищу товары рядом и связываюсь с продавцом.",
            icon: Icon.bag(24, t.primaryDeep),
            active: selectedMode === "buyer",
            onClick: chooseBuyer,
          })}
          {roleCard({
            title: "Я бизнес",
            description:
              user?.role === "PARTNER"
                ? "Перейти в кабинет и товары."
                : "Зарегистрировать магазин и добавить товары.",
            icon: Icon.home(24, t.primaryDeep),
            active: selectedMode === "business",
            onClick: chooseBusiness,
          })}
        </div>

        {isTelegramAccountIncomplete(user) && (!completionPromptDismissed || !linkPromptDismissed) && (
          <div style={{ marginTop: 16 }}>
            <AccountLinkingPrompt
              onDismiss={() => {
                dismissCompletionPrompt();
                dismissLinkPrompt();
              }}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 12, color: t.textTer, lineHeight: 1.45, textAlign: "center", paddingTop: 24 }}>
          Роль продавца открывает бизнес-кабинет, но не мешает пользоваться покупательским режимом.
        </div>
      </div>
    </main>
  );
}
