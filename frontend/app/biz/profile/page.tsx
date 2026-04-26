"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { Badge, Icon, StripePlaceholder, tokens, FONT, PillButton } from "@/components/ui/primitives";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAppStore } from "@/store/app";
import { useAuthStore } from "@/store/auth";
import { hasPassword, hasTelegramIdentity, isTelegramAccountIncomplete } from "@/lib/account-linking";
import { authEntryRoute } from "@/lib/auth-routing";
import { AccountLinkingPrompt } from "@/components/account/AccountLinkingPrompt";

export default function BizProfileScreen() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: profile, isLoading, error } = useSWR("/partner-api/profile", bizApi.profile);
  const setSelectedMode = useAppStore((state) => state.setSelectedMode);
  const { user, logout } = useAuthStore();

  const switchToBuyer = () => {
    setSelectedMode("buyer");
    router.push("/");
  };

  const handleLogout = () => {
    logout();
    router.replace(authEntryRoute());
  };

  return (
    <div className="screen-scroll-with-tabbar" style={{ background: t.surface, fontFamily: fontFn }}>
      <AppHeaderBiz title="Заведение" />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {isLoading && (
          <>
            <Skeleton w="100%" h={94} radius={12} />
            <Skeleton w="100%" h={156} radius={12} />
          </>
        )}
        {error && <ErrorState message={partnerErrorMessage(error)} />}
        {profile && (
          <>
            <div
              style={{
                background: t.bg,
                border: `1px solid ${t.divider}`,
                borderRadius: 12,
                padding: 14,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <StripePlaceholder label="витрина" w={64} h={64} radius={12} tone="cream" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 750 }}>{profile.name}</div>
                <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>{profile.address}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge tone="solid" size="sm">
                    Активно
                  </Badge>
                  {profile.category && (
                    <Badge tone="neutral" size="sm">
                      {profile.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div style={{ background: t.bg, border: `1px solid ${t.divider}`, borderRadius: 12, overflow: "hidden" }}>
              {[
                { label: "Редактировать профиль", href: "/biz/profile/edit" },
                { label: "Часы работы", value: profile.hours, href: "/biz/profile/edit" },
                { label: "Публичная страница", href: `/stores/${profile.id}` },
              ].map((item, i, arr) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push(item.href)}
                  style={{
                    width: "100%",
                    minHeight: 52,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    border: "none",
                    borderBottom: i < arr.length - 1 ? `1px solid ${t.divider}` : "none",
                    background: t.bg,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: fontFn,
                    textAlign: "left",
                  }}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {"value" in item && item.value ? <span style={{ color: t.textSec, marginRight: 8 }}>{item.value}</span> : null}
                  {Icon.chevronR(14, t.textTer)}
                </button>
              ))}
            </div>
            <div style={{ background: t.bg, border: `1px solid ${t.divider}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 750 }}>Вход и связка</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <Badge tone={hasTelegramIdentity(user) ? "green" : "neutral"} size="sm">
                  {hasTelegramIdentity(user) ? "Telegram привязан" : "Telegram не привязан"}
                </Badge>
                <Badge tone={user?.phone ? "green" : "neutral"} size="sm">
                  {user?.phone ? "Телефон добавлен" : "Телефон не добавлен"}
                </Badge>
              </div>
              {!hasPassword(user) && user?.phone && (
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45, color: t.textSec }}>
                  Пароль для входа на сайте ещё не задан.
                </div>
              )}
            </div>
            {isTelegramAccountIncomplete(user) && <AccountLinkingPrompt tone="business" persistent />}
            <PillButtonBiz onClick={() => router.push("/biz/offers/new")} size="md">
              Создать позицию
            </PillButtonBiz>
            <PillButton variant="outline" onClick={switchToBuyer}>
              Перейти в покупателя
            </PillButton>
            <PillButton variant="muted" onClick={handleLogout}>
              Выйти
            </PillButton>
          </>
        )}
      </div>
      <BizTabBar />
    </div>
  );
}
