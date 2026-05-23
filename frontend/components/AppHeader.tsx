"use client";

import React, { ReactNode, useEffect } from "react";
import { tokens, Icon, UI } from "@/components/ui/primitives";
import { useSafeBack } from "@/hooks/useSafeBack";

interface AppHeaderProps {
  title: string;
  sub?: string;
  left?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  size?: "sm" | "lg";
  className?: string;
}

export default function AppHeader({
  title,
  sub,
  left,
  right,
  onBack,
  hideBack,
  size = "sm",
  className,
}: AppHeaderProps) {
  const t = tokens();
  const safeBack = useSafeBack();
  const handleBack = hideBack ? null : onBack || safeBack;
  const isLarge = size === "lg";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = window.Telegram?.WebApp;
    if (!tg || !handleBack) return;
    const supportsBackButton =
      typeof tg.isVersionAtLeast === "function"
        ? tg.isVersionAtLeast("6.1")
        : Number.parseFloat(tg.version || "0") >= 6.1;
    const backButton = tg.BackButton;
    if (!tg.initData || !backButton || !supportsBackButton) return;

    backButton.show();
    const handler = () => handleBack();
    backButton.onClick(handler);

    return () => {
      backButton.offClick(handler);
      backButton.hide();
    };
  }, [handleBack]);

  return (
    <div
      className={className}
      style={{
        paddingTop: `calc(${isLarge ? 16 : 12}px + var(--app-safe-top))`,
        paddingRight: "16px",
        paddingBottom: isLarge ? "12px" : "8px",
        paddingLeft: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        background: t.bg,
        position: "sticky",
        top: 0,
        zIndex: UI.z.header,
        borderBottom: `1px solid ${t.divider}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: isLarge ? 40 : 32,
        }}
      >
        {handleBack && (
          <button
            type="button"
            aria-label="Назад"
            onClick={handleBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "none",
              background: t.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: t.text,
              touchAction: "manipulation",
            }}
          >
            {Icon.back(18)}
          </button>
        )}
        {left && <div style={{ color: t.text }}>{left}</div>}
        <div
          style={{
            flex: 1,
            fontSize: isLarge ? UI.type.largeTitle : 16,
            fontWeight: isLarge ? 800 : 600,
            letterSpacing: 0,
            lineHeight: isLarge ? 1.1 : 1.25,
            color: t.text,
          }}
        >
          {title}
        </div>
        {right && <div>{right}</div>}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: t.textSec,
            paddingLeft: handleBack ? 40 : 0,
            marginTop: isLarge ? 2 : 0,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
