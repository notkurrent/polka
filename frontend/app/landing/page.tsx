"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { tokens, Icon, FONT, PillButton } from "@/components/ui/primitives";

export default function LandingPage() {
  const router = useRouter();
  const t = tokens();

  return (
    <div
      className="landing-screen"
      style={{
        background: t.bg,
        fontFamily: FONT(),
        color: t.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        className="landing-inner"
      >
        {/* logo */}
        <div className="landing-logo">
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
        <div className="landing-hero">
          <h1
            className="landing-title"
            style={{
              fontWeight: 800,
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
            className="landing-subtitle"
            style={{
              color: t.textSec,
              textWrap: "pretty",
            }}
          >
            Polka помогает выбрать оффер заведения, забронировать набор и забрать его по коду в указанное время.
          </p>
        </div>

        <div className="landing-how">
          <div
            className="landing-eyebrow"
            style={{
              color: t.textTer,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Как это работает
          </div>
          <div className="landing-steps">
            {[
              { title: "Выберите оффер", body: "На главном экране появятся реальные наборы от заведений рядом." },
              { title: "Забронируйте", body: "После брони заказ будет доступен в разделе броней." },
              { title: "Заберите по коду", body: "Покажите код сотруднику заведения в указанное время." },
            ].map((item, i) => (
            <div
              key={i}
              className="landing-step"
              style={{
                background: t.surface,
                border: `1px solid ${t.divider}`,
              }}
            >
              <div className="landing-step-title" style={{ fontWeight: 750, color: t.text }}>{item.title}</div>
              <div className="landing-step-body" style={{ color: t.textSec }}>{item.body}</div>
            </div>
          ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div className="landing-cta">
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
