"use client";

import React from "react";
import { Icon, tokens, FONT, PillButton, type IconFn, type PillButtonProps } from "@/components/ui/primitives";

export function AppScreenBiz({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={["screen-scroll-with-tabbar app-screen-biz", className].filter(Boolean).join(" ")}
      style={{
        width: "100%",
        height: "100dvh",
        maxHeight: "100dvh",
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        display: "block",
        background: "#fff",
        maxWidth: 600,
        margin: "0 auto",
        position: "relative",
        color: tokens().text,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function AppHeaderBiz({
  title,
  onBack,
  right,
}: {
  title: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  return (
    <div
      className="biz-page-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "var(--app-safe-top)",
        paddingRight: "16px",
        paddingBottom: "0px",
        paddingLeft: "16px",
        height: 56,
        boxSizing: "content-box",
        background: t.bg,
        borderBottom: `1px solid ${t.divider}`,
        position: "sticky",
        top: 0,
        zIndex: 40,
        fontFamily: fontFn,
      }}
    >
      {onBack ? (
        <button
          className="biz-page-header-back"
          type="button"
          aria-label="Назад"
          onClick={onBack}
          style={{
            width: 44,
            height: 44,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            marginLeft: -8,
            display: "grid",
            placeItems: "center",
          }}
        >
          {Icon.back(24, t.text)}
        </button>
      ) : (
        <div className="biz-page-header-spacer" style={{ width: 44 }} />
      )}
      <div className="biz-page-header-title" style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3, flex: 1, textAlign: "center" }}>
        {title}
      </div>
      {right ? (
        <div className="biz-page-header-right" style={{ width: 44, display: "flex", justifyContent: "flex-end" }}>
          {right}
        </div>
      ) : (
        <div className="biz-page-header-spacer" style={{ width: 44 }} />
      )}
    </div>
  );
}

export function PillButtonBiz({ children, onClick, style, size = "md", disabled }: PillButtonProps) {
  return (
    <PillButton onClick={onClick} variant="dark" size={size} disabled={disabled} style={style}>
      {children}
    </PillButton>
  );
}

export function StatTile({
  value,
  label,
  accent = false,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  return (
    <div
      className="biz-stat-tile"
      style={{
        flex: 1,
        background: accent ? t.primarySoft : t.surface,
        border: accent ? "none" : `1px solid ${t.divider}`,
        borderRadius: 12,
        padding: "12px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontFamily: fontFn,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 800, color: accent ? t.primaryDeep : t.text, letterSpacing: -0.5 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: accent ? t.primaryDeep : t.textSec, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export function ActionCard({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: IconFn;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  return (
    <button
      className="biz-action-card"
      type="button"
      onClick={onClick}
      style={{
        background: primary ? t.primary : t.bg,
        border: primary ? "none" : `1px solid ${t.divider}`,
        borderRadius: 12,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: 8,
        minHeight: 86,
        cursor: "pointer",
        fontFamily: fontFn,
        touchAction: "manipulation",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: primary ? "rgba(0,0,0,0.05)" : t.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon(17, primary ? t.primaryDeep : t.text)}
      </div>
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.15,
          fontWeight: 650,
          color: primary ? t.primaryDeep : t.text,
          letterSpacing: 0,
          textAlign: "center",
          minHeight: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {label}
      </div>
    </button>
  );
}
