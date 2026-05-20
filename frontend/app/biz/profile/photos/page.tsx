"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppScreenBiz, AppHeaderBiz } from "@/components/biz/BizShared";
import { StripePlaceholder, tokens, FONT } from "@/components/ui/primitives";

export default function BizProfilePhotosPage() {
  const router = useRouter();
  const t = tokens();

  const tones: ("cream" | "green" | "sand" | "blush")[] = ["cream", "green", "sand", "blush"];

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Фото и галерея" onBack={() => router.back()} />
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {tones.map((tone, i) => (
          <StripePlaceholder key={i} h={140} radius={12} tone={tone} />
        ))}
        {/* Добавить Button */}
        <div
          style={{
            height: 140,
            border: `1px dashed ${t.primary}`,
            background: t.primarySoft,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: t.primaryDeep,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: FONT(),
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span>Загрузить фото</span>
          </div>
        </div>
      </div>
      <div
        style={{
          margin: "8px 16px 0",
          background: t.primarySoft,
          borderRadius: 14,
          padding: 14,
          fontSize: 12,
          color: t.primaryDeep,
          textAlign: "center",
          fontFamily: FONT(),
        }}
      >
        Фото магазина будут отображаться на публичной странице после загрузки
      </div>
    </AppScreenBiz>
  );
}
