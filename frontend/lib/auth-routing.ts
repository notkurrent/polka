"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@/store/auth";

type TelegramWebApp = NonNullable<typeof window.Telegram>["WebApp"];

export type TelegramInitDataSource = "webapp" | "query" | "hash" | "missing";

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramLaunchInfo() {
  if (typeof window === "undefined") {
    return {
      hasTelegramWebApp: false,
      hasInitData: false,
      initData: "",
      initDataLength: 0,
      initDataSource: "missing" as TelegramInitDataSource,
      platform: "server",
      isLikelyTelegramWebView: false,
    };
  }

  const webApp = getTelegramWebApp();
  const platform = String(webApp?.platform || "unknown").toLowerCase();
  if (webApp?.initData) {
    return {
      hasTelegramWebApp: true,
      hasInitData: true,
      initData: webApp.initData,
      initDataLength: webApp.initData.length,
      initDataSource: "webapp" as TelegramInitDataSource,
      platform,
      isLikelyTelegramWebView: platform !== "unknown",
    };
  }

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryInitData = search.get("tgWebAppData");
  const hashInitData = hash.get("tgWebAppData");
  const initData = queryInitData || hashInitData || "";
  const initDataSource: TelegramInitDataSource = queryInitData ? "query" : hashInitData ? "hash" : "missing";

  return {
    hasTelegramWebApp: Boolean(webApp),
    hasInitData: Boolean(initData),
    initData,
    initDataLength: initData.length,
    initDataSource,
    platform,
    isLikelyTelegramWebView: Boolean(webApp) && platform !== "unknown",
  };
}

export function getTelegramInitData() {
  return getTelegramLaunchInfo().initData;
}

export function isTelegramLaunch() {
  return getTelegramLaunchInfo().hasInitData;
}

export function isTelegramAuthContext() {
  const info = getTelegramLaunchInfo();
  return info.hasInitData || info.isLikelyTelegramWebView;
}

const subscribeTelegramAuthContext = () => () => undefined;

export function useTelegramAuthPage() {
  return useSyncExternalStore(
    subscribeTelegramAuthContext,
    () => isTelegramAuthContext(),
    () => null,
  );
}

export function authEntryRoute() {
  return isTelegramAuthContext() ? "/" : "/landing";
}

export function nextRouteForBuyer(onboardingDone: boolean) {
  return onboardingDone ? "/" : "/onboarding";
}

export function nextRouteForBusiness(user: User | null) {
  return user?.role === "PARTNER" ? "/biz" : "/biz/register";
}
