"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { tokens, Icon, FONT, PillButton } from "@/components/ui/primitives";

export default function LandingPage() {
  const router = useRouter();
  const t = tokens();

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        overflow: "auto",
        background: t.bg,
        fontFamily: FONT(),
        color: t.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          paddingTop: "calc(var(--app-safe-top) + 24px)",
          paddingRight: "20px",
          paddingBottom: "calc(var(--app-safe-bottom) + 80px)",
          paddingLeft: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          minHeight: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
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
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Polka</div>
        </div>

        {/* hero */}
        <div style={{ marginTop: 8 }}>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1,
              color: t.text,
              margin: 0,
              textWrap: "pretty",
            }}
          >
            Наборы еды.
            <br />
            <span style={{ color: t.primaryDeep, background: t.primarySoft, padding: "0 8px", borderRadius: 8 }}>
              По сниженной цене.
            </span>
          </h1>
          <p
            style={{
              fontSize: 14,
              color: t.textSec,
              lineHeight: 1.5,
              marginTop: 14,
              textWrap: "pretty",
            }}
          >
            Polka помогает выбрать оффер заведения, забронировать набор и забрать его по коду в указанное время.
          </p>
        </div>

        <div style={{ marginTop: 4 }}>
          <div
            style={{
              fontSize: 11,
              color: t.textTer,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Как это работает
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { title: "Выберите оффер", body: "На главном экране появятся реальные наборы от заведений рядом." },
              { title: "Забронируйте", body: "После брони заказ будет доступен в разделе броней." },
              { title: "Заберите по коду", body: "Покажите код сотруднику заведения в указанное время." },
            ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                background: t.surface,
                borderRadius: 14,
                border: `1px solid ${t.divider}`,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 750, color: t.text }}>{item.title}</div>
              <div style={{ fontSize: 12, color: t.textSec, marginTop: 4, lineHeight: 1.45 }}>{item.body}</div>
            </div>
          ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PillButton onClick={() => router.push("/signup")} size="lg">
            Начать экономить
          </PillButton>
          <PillButton onClick={() => router.push("/login")} variant="ghost" size="md">
            Уже есть аккаунт · войти
          </PillButton>
        </div>
      </div>
    </div>
  );
}
