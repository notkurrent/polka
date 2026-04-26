"use client";

import type { User } from "@/store/auth";
import type { SelectedMode } from "@/store/app";
import { isTelegramLaunch, nextRouteForBusiness, nextRouteForBuyer } from "@/lib/auth-routing";

export function hasTelegramIdentity(user: User | null) {
  return Boolean(user?.has_telegram || user?.is_tma || isTelegramLaunch());
}

export function hasPassword(user: User | null) {
  if (!user) return false;
  if (typeof user.has_password === "boolean") return user.has_password;
  return Boolean(user.phone);
}

export function isTelegramAccountIncomplete(user: User | null) {
  if (!user || !hasTelegramIdentity(user)) return false;
  return !user.phone || !hasPassword(user);
}

export function accountDestination(user: User | null, selectedMode: SelectedMode | null, onboardingDone: boolean) {
  if (selectedMode === "buyer") return nextRouteForBuyer(onboardingDone);
  if (selectedMode === "business") return nextRouteForBusiness(user);
  return "/choose-role";
}
