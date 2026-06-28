"use client";

import { getTelegramLaunchInfo, getTelegramWebApp } from "@/lib/auth-routing";

export type HapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotificationType = "error" | "success" | "warning";
export type HapticClickPattern =
  | "none"
  | "selection"
  | `impact:${HapticImpactStyle}`
  | `notification:${HapticNotificationType}`;

function telegramHaptics() {
  if (typeof window === "undefined") return null;

  const webApp = getTelegramWebApp();
  const launchInfo = getTelegramLaunchInfo();
  const isTma = launchInfo.hasInitData || launchInfo.isLikelyTelegramWebView;
  if (!isTma || !webApp?.HapticFeedback) return null;

  if (typeof webApp.isVersionAtLeast === "function" && !webApp.isVersionAtLeast("6.1")) {
    return null;
  }

  return webApp.HapticFeedback;
}

export function hapticImpact(style: HapticImpactStyle = "light") {
  try {
    telegramHaptics()?.impactOccurred?.(style);
  } catch {
    // Haptics are optional progressive feedback.
  }
}

export function hapticSelection() {
  try {
    telegramHaptics()?.selectionChanged?.();
  } catch {
    // Haptics are optional progressive feedback.
  }
}

export function hapticNotification(type: HapticNotificationType) {
  try {
    telegramHaptics()?.notificationOccurred?.(type);
  } catch {
    // Haptics are optional progressive feedback.
  }
}

function isDisabledTarget(target: HTMLElement) {
  return target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true";
}

function inputHapticPattern(input: HTMLInputElement): HapticClickPattern | null {
  if (["checkbox", "radio", "range"].includes(input.type)) return "selection";
  if (["button", "submit", "reset", "file"].includes(input.type)) return "impact:light";
  return null;
}

function applyClickPattern(pattern: HapticClickPattern) {
  if (pattern === "none") return;
  if (pattern === "selection") {
    hapticSelection();
    return;
  }
  if (pattern.startsWith("impact:")) {
    hapticImpact(pattern.slice("impact:".length) as HapticImpactStyle);
    return;
  }
  if (pattern.startsWith("notification:")) {
    hapticNotification(pattern.slice("notification:".length) as HapticNotificationType);
  }
}

export function handleTmaHapticClick(event: Event) {
  const rawTarget = event.target;
  if (!(rawTarget instanceof Element)) return;

  const target = rawTarget.closest<HTMLElement>(
    '[data-haptic], button, a, label[for], [role="button"], [role="tab"], input, select, textarea',
  );
  if (!target || isDisabledTarget(target)) return;

  const explicitPattern = target.dataset.haptic as HapticClickPattern | undefined;
  if (explicitPattern) {
    applyClickPattern(explicitPattern);
    return;
  }

  if (target instanceof HTMLTextAreaElement) return;
  if (target instanceof HTMLInputElement) {
    const pattern = inputHapticPattern(target);
    if (!pattern) return;
    applyClickPattern(pattern);
    return;
  }
  if (target instanceof HTMLSelectElement || target.getAttribute("role") === "tab" || target.hasAttribute("aria-pressed")) {
    hapticSelection();
    return;
  }

  hapticImpact("light");
}
