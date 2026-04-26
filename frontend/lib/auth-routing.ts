"use client";

import type { User } from "@/store/auth";

type TelegramWebApp = NonNullable<typeof window.Telegram>["WebApp"];

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData() {
  const webApp = getTelegramWebApp();
  if (webApp?.initData) return webApp.initData;

  if (typeof window === "undefined") return "";
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.get("tgWebAppData") || hash.get("tgWebAppData") || "";
}

export function isTelegramLaunch() {
  if (typeof window === "undefined") return false;
  return Boolean(getTelegramInitData());
}

export function nextRouteForBuyer(onboardingDone: boolean) {
  return onboardingDone ? "/" : "/onboarding";
}

export function nextRouteForBusiness(user: User | null) {
  return user?.role === "PARTNER" ? "/biz" : "/biz/register";
}
