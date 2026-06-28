"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTelegramAuthPage } from "@/lib/auth-routing";
import { tokens, FONT, PillButton } from "@/components/ui/primitives";
import { BrandLogo } from "@/components/BrandLogo";

export default function LandingPage() {
  const router = useRouter();
  const t = tokens();
  const isTelegramPage = useTelegramAuthPage();

  useEffect(() => {
    if (isTelegramPage) router.replace("/");
  }, [isTelegramPage, router]);

  if (isTelegramPage !== false) {
    return <div style={{ minHeight: "100dvh", background: t.bg }} />;
  }

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
          <BrandLogo size={40} />
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
            Товары рядом.
            <br />
            <span style={{ color: t.primaryDeep, background: t.primarySoft, padding: "0 8px", borderRadius: 8 }}>
              От локальных продавцов.
            </span>
          </h1>
          <p
            className="landing-subtitle"
            style={{
              color: t.textSec,
              textWrap: "pretty",
            }}
          >
            Polka помогает найти товары в локальных магазинах и связаться с продавцом напрямую.
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
              { title: "Выберите товар", body: "На главном экране появятся реальные товары от магазинов рядом." },
              { title: "Откройте контакты", body: "Перейдите к удобному каналу связи прямо из товара или витрины." },
              { title: "Свяжитесь с продавцом", body: "Уточните детали напрямую с магазином в удобное время." },
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
            Смотреть товары
          </PillButton>
          <PillButton onClick={() => router.push("/login")} variant="ghost" size="md">
            Уже есть аккаунт · войти
          </PillButton>
        </div>
      </div>
    </div>
  );
}
