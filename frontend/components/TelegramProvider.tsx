"use client";

import { useEffect } from "react";

type Insets = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

const px = (value: unknown) => `${Number(value) || 0}px`;

export function TelegramProvider() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      const isTelegramLaunch = Boolean(webApp.initData);
      if (!isTelegramLaunch) return;

      const root = document.documentElement;
      const previousOverscroll = document.body.style.overscrollBehaviorY;

      const applyTelegramSafeAreas = () => {
        const safeArea = (webApp.safeAreaInset || {}) as Insets;
        const contentSafeArea = (webApp.contentSafeAreaInset || {}) as Insets;
        const platform = String(webApp.platform || "").toLowerCase();
        const isAndroid = platform.includes("android");
        const contentTop = Number(contentSafeArea.top) || 0;
        const contentBottom = Number(contentSafeArea.bottom) || 0;

        root.style.setProperty("--tg-js-safe-area-top", px(safeArea.top));
        root.style.setProperty("--tg-js-safe-area-bottom", px(safeArea.bottom));
        root.style.setProperty("--tg-js-safe-area-left", px(safeArea.left));
        root.style.setProperty("--tg-js-safe-area-right", px(safeArea.right));
        root.style.setProperty("--tg-js-content-safe-area-top", px(contentSafeArea.top));
        root.style.setProperty("--tg-js-content-safe-area-bottom", px(contentSafeArea.bottom));
        root.style.setProperty("--tg-js-content-safe-area-left", px(contentSafeArea.left));
        root.style.setProperty("--tg-js-content-safe-area-right", px(contentSafeArea.right));

        // Android Telegram can report 0 content inset even when top controls
        // overlap the WebView. Official contentSafeAreaInset wins when present;
        // this is only a small visual fallback, not a second full header.
        root.style.setProperty("--tg-android-controls-safe-top", isAndroid && contentTop < 1 ? "36px" : "0px");
        root.style.setProperty("--tg-android-controls-safe-bottom", isAndroid && contentBottom < 1 ? "0px" : "0px");
      };

      try {
        root.dataset.telegramWebapp = "true";
        // Говорим телеграму, что приложение готово к отображению
        webApp.ready?.();
        applyTelegramSafeAreas();

        // 1. Разворачиваем на максимальную высоту (убирает половинчатый режим)
        if (typeof webApp.expand === "function") {
          webApp.expand();
        }

        // 2. Делаем настоящий Full-Screen (убирает верхнюю шапку ТГ) — доступно в свежих версиях Telegram (>= 8.0)
        if (
          typeof webApp.isVersionAtLeast === "function" &&
          webApp.isVersionAtLeast("8.0") &&
          typeof webApp.requestFullscreen === "function"
        ) {
          try {
            webApp.requestFullscreen();
          } catch (e) {
            console.warn("Fullscreen not supported", e);
          }
        }

        // 3. Отключаем закрытие мини-аппа по свайпу вниз (>= 7.7)
        if (
          typeof webApp.isVersionAtLeast === "function" &&
          webApp.isVersionAtLeast("7.7") &&
          typeof webApp.disableVerticalSwipes === "function"
        ) {
          try {
            webApp.disableVerticalSwipes();
          } catch (e) {
            console.warn("Disable vertical swipes not supported", e);
          }
        }

        // Убираем "резинку" (bounce effect) при скролле на iOS
        document.body.style.overscrollBehaviorY = "none";

        webApp.onEvent?.("safeAreaChanged", applyTelegramSafeAreas);
        webApp.onEvent?.("contentSafeAreaChanged", applyTelegramSafeAreas);
        webApp.onEvent?.("viewportChanged", applyTelegramSafeAreas);
      } catch (error) {
        console.error("Telegram WebApp Config Error:", error);
      }

      return () => {
        webApp.offEvent?.("safeAreaChanged", applyTelegramSafeAreas);
        webApp.offEvent?.("contentSafeAreaChanged", applyTelegramSafeAreas);
        webApp.offEvent?.("viewportChanged", applyTelegramSafeAreas);
        document.body.style.overscrollBehaviorY = previousOverscroll;
        delete root.dataset.telegramWebapp;
      };
    }
  }, []);

  return null;
}
