"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz } from "@/components/biz/BizShared";
import { StripePlaceholder, tokens, FONT } from "@/components/ui/primitives";
import { bizApi, partnerErrorMessage } from "@/lib/biz-api";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { hapticNotification } from "@/lib/haptics";

export default function BizProfilePublicPage() {
  const router = useRouter();
  const t = tokens();
  const { data: profile, isLoading, error } = useSWR("/partner-api/profile", bizApi.profile);

  const [copyDone, setCopyDone] = useState(false);

  const copyUrl = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/stores/${profile.id}`);
      hapticNotification("success");
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 1800);
    } catch {
      hapticNotification("error");
    }
  };

  return (
    <AppScreenBiz className="biz-public-profile-screen">
      <AppHeaderBiz title="Публичная страница" onBack={() => router.back()} />
      <div className="biz-public-profile-content biz-form-content" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {isLoading && (
          <>
            <Skeleton w="100%" h={94} radius={14} />
            <Skeleton w="100%" h={48} radius={12} />
          </>
        )}
        {error && <ErrorState message={partnerErrorMessage(error)} />}
        {profile && (
          <>
        <div
          className="biz-admin-card"
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
            {copyDone ? "Скопировано" : "Копировать"}
          </button>
        </div>
          </>
        )}
      </div>
    </AppScreenBiz>
  );
}
