"use client";

import React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { StripePlaceholder, tokens, FONT, Badge } from "@/components/ui/primitives";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function BizProfileLocationsPage() {
  const router = useRouter();
  const t = tokens();
  const { data: profile, isLoading, error } = useSWR("/partner-api/profile", bizApi.profile);

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Точки продаж" onBack={() => router.back()} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {isLoading && <Skeleton w="100%" h={78} radius={14} />}
        {error && <ErrorState message={partnerErrorMessage(error)} />}
        {profile && (
          <>
            {/* Карточка текущей точки */}
            <div
          style={{
            background: "#fff",
            border: `1px solid ${t.divider}`,
            borderRadius: 14,
            padding: 14,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <StripePlaceholder label={profile.name.slice(0, 10) || "точка"} w={48} h={48} radius={10} tone="green" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT() }}>{profile.name}</span>
              <Badge tone="solid" size="sm">
                Основная
              </Badge>
            </div>
            <div style={{ fontSize: 11, color: t.textSec, fontFamily: FONT() }}>{profile.address}</div>
          </div>
            </div>
          </>
        )}

        {/* Добавить точку */}
        <PillButtonBiz
          variant="outline"
          style={{ background: "transparent", border: `1px solid ${t.primaryDeep}`, color: t.primaryDeep }}
        >
          + Добавить точку
        </PillButtonBiz>

        {/* Info-блок */}
        <div style={{ background: t.primarySoft, borderRadius: 14, padding: 14, marginTop: 8 }}>
          <div style={{ fontSize: 13, color: t.primaryDeep, lineHeight: 1.5, fontFamily: FONT() }}>
            Добавьте больше точек, чтобы привлечь клиентов из других районов.
          </div>
        </div>
      </div>
    </AppScreenBiz>
  );
}
