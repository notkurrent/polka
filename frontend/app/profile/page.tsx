"use client";

import React, { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import {
  hasPassword,
  hasTelegramIdentity,
  isTelegramAccountIncomplete,
} from "@/lib/account-linking";
import { authEntryRoute } from "@/lib/auth-routing";
import { AccountLinkingPrompt } from "@/components/account/AccountLinkingPrompt";
import { tokens, Icon, PillButton } from "@/components/ui/primitives";
import { TabBar } from "@/components/TabBar";
import AppHeader from "@/components/AppHeader";

const subscribeHydration = () => () => undefined;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const setSelectedMode = useAppStore((s) => s.setSelectedMode);
  const setSelectedModeForUser = useAppStore((s) => s.setSelectedModeForUser);
  const t = tokens();
  const mounted = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  const hydratedUser = mounted ? user : null;
  const name = hydratedUser?.name || "Пользователь";
  const initial = name.charAt(0).toUpperCase();
  const phone = hydratedUser?.phone || "Телефон не добавлен";
  const accountIncomplete = isTelegramAccountIncomplete(hydratedUser);

  const handleLogout = () => {
    logout();
    router.replace(authEntryRoute());
  };

  const openBusinessCabinet = () => {
    if (hydratedUser?.id) {
      setSelectedModeForUser(hydratedUser.id, "business");
    } else {
      setSelectedMode("business");
    }
    router.push(hydratedUser?.role === "PARTNER" ? "/biz" : "/biz/register");
  };

  const menuItems = [
    ...(hydratedUser?.is_admin === true
      ? [{ label: "Админка", path: "/admin/partners" }]
      : []),
    { label: "Уведомления", path: "/profile/notifications" },
    { label: "Способы оплаты", path: "/profile/payment" },
    { label: "Помощь и поддержка", path: "/profile/support" },
    { label: "О сервисе", path: "/profile/about" },
  ];

  return (
    <div
      className="buyer-secondary-page buyer-profile-page screen-scroll-with-tabbar"
      style={{ background: t.bg }}
    >
      <AppHeader
        className="buyer-page-header"
        title="Профиль"
        hideBack
        size="lg"
      />

      <div
        className="app-form-content buyer-profile-layout"
        style={{
          padding: "20px 20px 0",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          className="buyer-profile-main"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div
            className="buyer-profile-summary"
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: t.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: t.primaryDeep,
                letterSpacing: -0.6,
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{name}</div>
              <div style={{ fontSize: 12, color: t.textSec }}>{phone}</div>
            </div>
          </div>

          <div
            className="buyer-profile-status"
            style={{
              border: `1px solid ${t.divider}`,
              borderRadius: 12,
              background: t.bg,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 750 }}>Статус аккаунта</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: hasTelegramIdentity(hydratedUser)
                    ? t.primarySoft
                    : t.surface,
                  color: hasTelegramIdentity(hydratedUser)
                    ? t.primaryDeep
                    : t.textSec,
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                {hasTelegramIdentity(hydratedUser)
                  ? "Telegram привязан"
                  : "Telegram не привязан"}
              </span>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: hydratedUser?.phone ? t.primarySoft : t.surface,
                  color: hydratedUser?.phone ? t.primaryDeep : t.textSec,
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                {hydratedUser?.phone
                  ? "Телефон добавлен"
                  : "Телефон не добавлен"}
              </span>
            </div>
            {!hasPassword(hydratedUser) && hydratedUser?.phone && (
              <div style={{ fontSize: 12, lineHeight: 1.45, color: t.textSec }}>
                Пароль для входа на сайте ещё не задан.
              </div>
            )}
          </div>

          {accountIncomplete && <AccountLinkingPrompt persistent />}

          <div
            className="buyer-profile-actions"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            <PillButton
              onClick={openBusinessCabinet}
              variant="outline"
              size="md"
            >
              Бизнес-кабинет
            </PillButton>

            <PillButton
              onClick={handleLogout}
              variant="dangerOutline"
              size="md"
            >
              Выйти
            </PillButton>
          </div>
        </div>

        <div
          className="buyer-profile-menu"
          style={{
            border: `1px solid ${t.divider}`,
            borderRadius: 14,
            overflow: "hidden",
            background: t.bg,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              style={{
                width: "100%",
                minHeight: 52,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                background: t.bg,
                border: "none",
                borderBottom:
                  i < menuItems.length - 1 ? `1px solid ${t.divider}` : "none",
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ flex: 1, color: t.text }}>{item.label}</span>
              <span style={{ color: t.textTer, display: "flex" }}>
                {Icon.chevronR(14, t.textTer)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  );
}
