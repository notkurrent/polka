"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tokens, Icon, PillButton, FONT } from "@/components/ui/primitives";
import { useAppStore } from "@/store/app";

export default function OnboardingScreen() {
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { setOnboardingDone } = useAppStore();

  const [slide, setSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const maxSlide = 2;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 50 && slide < maxSlide) {
      setSlide((s) => s + 1); // Swipe left -> next slide
    } else if (diff < -50 && slide > 0) {
      setSlide((s) => s - 1); // Swipe right -> prev slide
    }
    setTouchStart(null);
  };

  const finish = useCallback(() => {
    setOnboardingDone(true);
    router.replace("/");
  }, [router, setOnboardingDone]);

  const goBack = useCallback(() => setSlide((s) => Math.max(0, s - 1)), []);
  const goNext = useCallback(() => {
    if (slide === maxSlide) {
      finish();
      return;
    }
    setSlide((s) => Math.min(maxSlide, s + 1));
  }, [finish, slide]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goBack();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, goNext]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: t.bg,
        fontFamily: fontFn,
        overflow: "auto",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "calc(12px + var(--app-safe-top, env(safe-area-inset-top)))",
          right: 16,
          zIndex: 10,
        }}
      >
        {slide < 2 && (
          <button
            type="button"
            onClick={finish}
            style={{
              background: "none",
              border: "none",
              color: t.textSec,
              fontSize: 15,
              fontWeight: 500,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Пропустить
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        {slide === 0 && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "76px 32px 24px",
              gap: 20,
              boxSizing: "border-box",
              width: "100%",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: t.primarySoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {Icon.leaf(40, t.primaryDeep)}
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: 0,
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Позиции еды.
              <br />
              <span
                style={{
                  background: t.primarySoft,
                  padding: "0 8px",
                  borderRadius: 8,
                  color: t.primaryDeep,
                }}
              >
                По сниженной цене.
              </span>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: t.textSec,
                textAlign: "center",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Выбирайте предложения заведений рядом и забирайте их по коду
            </p>
          </div>
        )}

        {slide === 1 && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "76px 24px 24px",
              gap: 24,
              boxSizing: "border-box",
              width: "100%",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: t.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: t.primaryDeep,
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Найдите позицию</div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
                  Откройте карту и выберите заведение рядом
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: t.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: t.primaryDeep,
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Забронируйте</div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>Нажмите кнопку и получите код выдачи</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: t.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: t.primaryDeep,
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Заберите</div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
                  Покажите код на кассе в указанное время
                </div>
              </div>
            </div>
          </div>
        )}

        {slide === 2 && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "76px 24px 24px",
              gap: 32,
              boxSizing: "border-box",
              width: "100%",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
              <div
                style={{
                  background: t.surface,
                  padding: "16px",
                  borderRadius: 12,
                  border: `1px solid ${t.divider}`,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 750 }}>Выбирайте оффер</div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 6, lineHeight: 1.45 }}>
                  На главном экране появятся реальные позиции от заведений, когда они будут доступны рядом.
                </div>
              </div>
              <div
                style={{
                  background: t.surface,
                  padding: "16px",
                  borderRadius: 12,
                  border: `1px solid ${t.divider}`,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 750 }}>Бронируйте</div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 6, lineHeight: 1.45 }}>
                  После брони заказ появится в разделе броней вместе с кодом выдачи.
                </div>
              </div>
              <div
                style={{
                  background: t.surface,
                  padding: "16px",
                  borderRadius: 12,
                  border: `1px solid ${t.divider}`,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 750 }}>Забирайте по коду</div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 6, lineHeight: 1.45 }}>
                  Покажите код сотруднику заведения в указанное время.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          padding: "0 24px calc(18px + var(--app-safe-bottom, env(safe-area-inset-bottom)))",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          {slide > 0 && (
            <PillButton size="md" variant="muted" onClick={goBack} style={{ flex: 1 }}>
              Назад
            </PillButton>
          )}
          <PillButton size="md" onClick={goNext} style={{ flex: slide > 0 ? 1 : undefined }}>
            {slide === maxSlide ? "Начать" : "Далее"}
          </PillButton>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, minHeight: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: slide === i ? t.primary : t.divider,
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
