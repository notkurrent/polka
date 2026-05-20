"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz } from "@/components/biz/BizShared";
import { StripePlaceholder, tokens, FONT } from "@/components/ui/primitives";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function BizProfilePublicPage() {
  const router = useRouter();
  const t = tokens();
  const { data: profile, isLoading, error } = useSWR("/partner-api/profile", bizApi.profile);

  const [mapVisible, setMapVisible] = useState(true);
  const [acceptOrders, setAcceptOrders] = useState(true);

  const copyUrl = () => {
    if (!profile) return;
    navigator.clipboard.writeText(`${window.location.origin}/stores/${profile.id}`);
    alert("Ссылка скопирована!");
  };

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Публичная страница" onBack={() => router.back()} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {isLoading && (
          <>
            <Skeleton w="100%" h={94} radius={14} />
            <Skeleton w="100%" h={48} radius={12} />
          </>
        )}
        {error && <ErrorState message={partnerErrorMessage(error)} />}
        {profile && (
          <>
        {/* Превью карточки */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${t.divider}`,
            borderRadius: 14,
            padding: 14,
            display: "flex",
            gap: 12,
          }}
        >
          <StripePlaceholder label={profile.name.slice(0, 10) || "место"} w={64} h={64} radius={12} tone="cream" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT() }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: t.textSec, fontFamily: FONT() }}>{profile.address}</div>
            {profile.category && <div style={{ fontSize: 12, color: t.textSec, fontFamily: FONT() }}>{profile.category}</div>}
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            background: t.surface,
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, fontFamily: FONT() }}>{`/stores/${profile.id}`}</span>
          <button
            onClick={copyUrl}
            style={{
              fontSize: 12,
              color: t.primaryDeep,
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: FONT(),
              padding: 0,
            }}
          >
            Копировать
          </button>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, flex: 1, fontFamily: FONT() }}>Показывать на карте</div>
            <div
              onClick={() => setMapVisible(!mapVisible)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: mapVisible ? t.primaryDeep : t.divider,
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 2,
                  left: mapVisible ? 22 : 2,
                  transition: "left 0.2s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, flex: 1, fontFamily: FONT() }}>Принимать заявки</div>
            <div
              onClick={() => setAcceptOrders(!acceptOrders)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: acceptOrders ? t.primaryDeep : t.divider,
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 2,
                  left: acceptOrders ? 22 : 2,
                  transition: "left 0.2s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </AppScreenBiz>
  );
}
