"use client";

import * as React from "react";

export interface Tokens {
  bg: string;
  surface: string;
  divider: string;
  primary: string;
  primarySoft: string;
  primaryDeep: string;
  text: string;
  textSec: string;
  textTer: string;
  danger: string;
  warn: string;
  star: string;
}

export const UI = {
  space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 9999 },
  type: { label: 11, meta: 12, bodySm: 14, body: 15, title: 17, largeTitle: 24, hero: 28 },
  z: { header: 40, tabBar: 50, sheet: 60, modal: 70, toast: 80 },
} as const;

export interface StripePlaceholderProps {
  tone?: string;
  w?: number | string;
  h?: number | string;
  radius?: number;
  label?: string;
  style?: React.CSSProperties;
}

export interface PillButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "dark" | "muted" | "danger" | "dangerOutline";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

export interface PriceTagProps {
  original?: number | null;
  now: number;
  size?: "sm" | "md" | "lg";
}

export interface BadgeProps {
  children?: React.ReactNode;
  tone?: "green" | "solid" | "dark" | "neutral" | "amber" | "red";
  size?: "sm" | "md";
}

export interface MapPin {
  x: number;
  y: number;
  label: string;
}

export interface GridMapProps {
  width?: number | string;
  height?: number | string;
  pins?: MapPin[];
  selectedIdx?: number;
  onPin?: (idx: number) => void;
  centerLabel?: string;
  style?: React.CSSProperties;
}

export interface QRCodeProps {
  value?: string;
  size?: number;
}

export type IconFn = (size?: number, color?: string, filled?: boolean) => React.ReactNode;

declare global {
  interface TelegramWebApp {
    initData?: string;
    safeAreaInset?: Record<string, number | undefined>;
    contentSafeAreaInset?: Record<string, number | undefined>;
    platform?: string;
    version?: string;
    ready?: () => void;
    expand?: () => void;
    requestFullscreen?: () => void;
    disableVerticalSwipes?: () => void;
    isVersionAtLeast?: (version: string) => boolean;
    onEvent?: (event: string, handler: () => void) => void;
    offEvent?: (event: string, handler: () => void) => void;
    BackButton?: {
      show: () => void;
      hide: () => void;
      onClick: (handler: () => void) => void;
      offClick: (handler: () => void) => void;
    };
    MainButton?: {
      hide?: () => void;
    };
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
    __GREEN?: string;
    __FONT?: string;
  }
}

export interface IconSet {
  back: IconFn;
  close: IconFn;
  search: IconFn;
  pin: IconFn;
  heart: IconFn;
  clock: IconFn;
  star: IconFn;
  check: IconFn;
  plus: IconFn;
  minus: IconFn;
  home: IconFn;
  list: IconFn;
  user: IconFn;
  bag: IconFn;
  chart: IconFn;
  leaf: IconFn;
  chevronR: IconFn;
  filter: IconFn;
  bell: IconFn;
}

// Shared design primitives — placeholders, map, icons, buttons
// ─────────────────────────────────────────────────────────────

// Color tokens (live — reads from window.__GREEN + window.__FONT)
export const tokens = (): Tokens => {
  const intensity = typeof window !== "undefined" && typeof window.__GREEN !== "undefined" ? window.__GREEN : "pale";
  if (intensity === "vivid") {
    return {
      bg: "#FFFFFF",
      surface: "#F8FBF8",
      divider: "#EEF3EE",
      primary: "#5BC88A", // vivid
      primarySoft: "#D4F1DE",
      primaryDeep: "#1C492B",
      text: "#0D1912",
      textSec: "#5B6660",
      textTer: "#8C9691",
      danger: "#D64545",
      warn: "#E58E26",
      star: "#F0B400",
    };
  }
  // pale (default)
  return {
    bg: "#FFFFFF",
    surface: "#F8F9FA",
    divider: "#EEF2EE",
    primary: "#A8E6CF", // pale
    primarySoft: "#E8F5E9",
    primaryDeep: "#1C492B",
    text: "#111714",
    textSec: "#5B6660",
    textTer: "#8C9691",
    danger: "#D64545",
    warn: "#E58E26",
    star: "#F0B400",
  };
};
if (typeof window !== "undefined")
  (window as Window & { __tokens?: () => Tokens; __FONT_FN?: () => string; __Icon?: IconSet }).__tokens = tokens;

export const FONT = (): string => {
  const f = typeof window !== "undefined" && typeof window.__FONT !== "undefined" ? window.__FONT : "Inter";
  return `'${f}', -apple-system, system-ui, sans-serif`;
};
if (typeof window !== "undefined")
  (window as Window & { __tokens?: () => Tokens; __FONT_FN?: () => string; __Icon?: IconSet }).__FONT_FN = FONT;

// ─────────────────────────────────────────────────────────────
// Striped placeholder — for food photos. Russian monospace label.
// ─────────────────────────────────────────────────────────────
export function StripePlaceholder({
  tone = "green",
  w = "100%",
  h = 200,
  radius = UI.radius.md,
  label = "",
  style = {},
}: StripePlaceholderProps) {
  const palettes: Record<string, { a: string; b: string; ink: string }> = {
    green: { a: "#E8F5E9", b: "#D4ECD8", ink: "#4a6a56" },
    sand: { a: "#F4EDE0", b: "#E8DFCC", ink: "#6b5e45" },
    cream: { a: "#FBF6EC", b: "#F1E8D4", ink: "#7a6a4a" },
    blush: { a: "#F7E8E4", b: "#EDD8D2", ink: "#7a4e46" },
    slate: { a: "#EDF1F3", b: "#DDE4E8", ink: "#4a5660" },
    mint: { a: "#E4F3EE", b: "#D2E9E1", ink: "#3a5e50" },
  };
  const p = palettes[tone] || palettes.green;
  const id = React.useId();
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: radius,
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      <svg width="100%" height="100%" style={{ display: "block", position: "absolute", inset: 0 }}>
        <defs>
          <pattern id={`p-${id}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="14" height="14" fill={p.a} />
            <rect width="7" height="14" fill={p.b} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${id})`} />
      </svg>
      {label && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: 'ui-monospace, "SF Mono", "Roboto Mono", Menlo, monospace',
            fontSize: 10,
            letterSpacing: 0.5,
            color: p.ink,
            textTransform: "uppercase",
            fontWeight: 600,
            padding: "0 10px",
            textAlign: "center",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pill button
// ─────────────────────────────────────────────────────────────
export function PillButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  full = true,
  disabled,
  loading,
  type = "button",
  style = {},
}: PillButtonProps) {
  const sizes = {
    sm: { h: 44, fs: 14, px: 16 },
    md: { h: 48, fs: 15, px: 20 },
    lg: { h: 56, fs: 17, px: 24 },
  };
  const t = tokens();
  const s = sizes[size];
  const variants = {
    primary: { bg: t.primary, color: t.primaryDeep, border: "none" },
    ghost: { bg: t.primarySoft, color: t.primaryDeep, border: "none" },
    outline: { bg: "#fff", color: t.primaryDeep, border: `1.5px solid ${t.primary}` },
    dark: { bg: t.primaryDeep, color: "#fff", border: "none" },
    muted: { bg: t.surface, color: t.text, border: `1px solid ${t.divider}` },
    danger: { bg: "#FDE8E8", color: t.danger, border: "none" },
    dangerOutline: { bg: "#fff", color: t.danger, border: `1.5px solid ${t.danger}` },
  };
  const v = variants[variant];
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={isDisabled ? undefined : () => onClick?.()}
      style={{
        minHeight: 44,
        height: s.h,
        padding: `0 ${s.px}px`,
        width: full ? "100%" : "auto",
        background: v.bg,
        color: v.color,
        border: v.border,
        borderRadius: 9999,
        fontSize: s.fs,
        fontWeight: 600,
        fontFamily: FONT(),
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.58 : 1,
        letterSpacing: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "transform 0.1s ease, opacity 0.2s ease",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      onMouseDown={(e) => !isDisabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {loading ? "Загрузка…" : children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Tiny icons — hand-drawn stroke set (no external)
// ─────────────────────────────────────────────────────────────
export const Icon: IconSet = {
  back: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M6 18L18 6" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  search: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={c} strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  pin: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" stroke={c} strokeWidth="2" />
    </svg>
  ),
  heart: (s = 20, c = "currentColor", filled = false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? c : "none"} stroke={c} strokeWidth="2">
      <path
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  clock: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  star: (s = 20, c = "currentColor", filled = true) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? c : "none"}>
      <path
        d="M12 3l2.7 5.9 6.3.6-4.8 4.4 1.4 6.3L12 17.7l-5.6 2.5 1.4-6.3L3 9.5l6.3-.6L12 3z"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  check: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  minus: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  home: (s = 22, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  list: (s = 22, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h16" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  user: (s = 22, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  bag: (s = 22, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 8h14l-1 12a1 1 0 01-1 1H7a1 1 0 01-1-1L5 8z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 016 0v2" stroke={c} strokeWidth="1.8" />
    </svg>
  ),
  chart: (s = 22, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  leaf: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M20 4c-11 0-16 5-16 12 0 2 1 4 2 4 7 0 14-4 14-16z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 20c6-8 10-10 16-12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  chevronR: (s = 16, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  filter: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 5h16M6 12h12M10 19h4" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  bell: (s = 20, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 17V11a6 6 0 0112 0v6l2 2H4l2-2z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 004 0" stroke={c} strokeWidth="1.8" />
    </svg>
  ),
};
if (typeof window !== "undefined")
  (window as Window & { __tokens?: () => Tokens; __FONT_FN?: () => string; __Icon?: IconSet }).__Icon = Icon;

// ─────────────────────────────────────────────────────────────
// Price tag — original crossed out + new bold
// ─────────────────────────────────────────────────────────────
export function PriceTag({ original, now, size = "md" }: PriceTagProps) {
  const sizes = {
    sm: { now: 15, old: 11 },
    md: { now: 18, old: 12 },
    lg: { now: 28, old: 15 },
  };
  const t = tokens();
  const s = sizes[size];
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
      <span
        style={{
          fontSize: s.now,
          fontWeight: 700,
          color: t.primaryDeep,
          letterSpacing: 0,
          fontFamily: FONT(),
          whiteSpace: "nowrap",
        }}
      >
        {now}&nbsp;₸
      </span>
      {original != null && original > now && (
        <span
          style={{
            fontSize: s.old,
            color: t.textTer,
            textDecoration: "line-through",
            fontFamily: FONT(),
            whiteSpace: "nowrap",
          }}
        >
          {original}&nbsp;₸
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────
export function Badge({ children, tone = "green", size = "md" }: BadgeProps) {
  const t = tokens();
  const tones = {
    green: { bg: t.primarySoft, color: t.primaryDeep },
    solid: { bg: t.primary, color: t.primaryDeep },
    dark: { bg: t.primaryDeep, color: "#fff" },
    neutral: { bg: t.surface, color: t.textSec },
    amber: { bg: "#FFF4DB", color: "#8B5A00" },
    red: { bg: "#FDE8E8", color: t.danger },
  };
  const s = size === "sm" ? { px: 8, py: 3, fs: 11 } : { px: 10, py: 5, fs: 12 };
  const v = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `${s.py}px ${s.px}px`,
        background: v.bg,
        color: v.color,
        borderRadius: 9999,
        fontSize: s.fs,
        fontWeight: 600,
        fontFamily: FONT(),
        letterSpacing: 0,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Abstract grid map
// ─────────────────────────────────────────────────────────────
export function GridMap({
  width = "100%",
  height = 300,
  pins = [],
  selectedIdx = -1,
  onPin,
  centerLabel,
  style = {},
}: GridMapProps) {
  const t = tokens();

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background: `
        radial-gradient(ellipse at 30% 40%, ${t.primarySoft} 0%, transparent 40%),
        radial-gradient(ellipse at 70% 60%, #F0F5F2 0%, transparent 50%),
        #FBFDFB
      `,
        ...style,
      }}
    >
      {/* street grid */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="streets" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="none" />
            <path d="M0 30h60M30 0v60" stroke="#E3EBE5" strokeWidth="1" />
          </pattern>
          <pattern id="streetsMinor" width="15" height="15" patternUnits="userSpaceOnUse">
            <rect width="15" height="15" fill="none" />
            <path d="M0 7.5h15M7.5 0v15" stroke="#F0F4F0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#streetsMinor)" />
        <rect width="100%" height="100%" fill="url(#streets)" />
        {/* diagonal boulevards */}
        <path d="M-20 80 L400 300" stroke="#E3EBE5" strokeWidth="3" opacity="0.6" />
        <path d="M-20 200 L400 50" stroke="#E3EBE5" strokeWidth="2" opacity="0.6" />
        {/* park */}
        <ellipse cx="80" cy="200" rx="50" ry="32" fill={t.primarySoft} opacity="0.6" />
        <ellipse cx="280" cy="100" rx="40" ry="25" fill={t.primarySoft} opacity="0.5" />
      </svg>
      {/* pins */}
      {pins.map((p, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Открыть товар ${p.label}`}
          onClick={() => onPin && onPin(i)}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: "translate(-50%, -100%)",
            cursor: "pointer",
            zIndex: selectedIdx === i ? 10 : 1,
            minWidth: 44,
            minHeight: 44,
            padding: 0,
            border: "none",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
          }}
        >
          <div
            style={{
              position: "relative",
              background: selectedIdx === i ? t.primaryDeep : "#fff",
              color: selectedIdx === i ? "#fff" : t.primaryDeep,
              padding: "4px 9px 4px 7px",
              borderRadius: 9999,
              border: `1.5px solid ${selectedIdx === i ? t.primaryDeep : t.primary}`,
              fontFamily: FONT(),
              fontSize: 11,
              fontWeight: 700,
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 10 }}>●</span>
            {p.label}
            <div
              style={{
                position: "absolute",
                bottom: -5,
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
                width: 8,
                height: 8,
                background: selectedIdx === i ? t.primaryDeep : "#fff",
                borderRight: `1.5px solid ${selectedIdx === i ? t.primaryDeep : t.primary}`,
                borderBottom: `1.5px solid ${selectedIdx === i ? t.primaryDeep : t.primary}`,
              }}
            />
          </div>
        </button>
      ))}
      {/* "you are here" */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(91,200,138,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#3B82F6",
              border: "3px solid #fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      </div>
      {centerLabel && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 10,
            fontFamily: "ui-monospace, monospace",
            color: t.textTer,
          }}
        >
          {centerLabel}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Simple QR — SVG, deterministic from a string (non-scannable placeholder)
// ─────────────────────────────────────────────────────────────
export function QRCode({ value = "", size = 180 }: QRCodeProps) {
  // deterministic pseudo-random from string
  const hash = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
    return h >>> 0;
  };
  const N = 25;
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const isFinder = (x < 7 && y < 7) || (x > N - 8 && y < 7) || (x < 7 && y > N - 8);
      if (isFinder) continue;
      const h = hash(value + "," + x + "," + y);
      if (h % 100 < 46) cells.push([x, y]);
    }
  }
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width="7" height="7" fill="#111714" />
      <rect x={fx + 1} y={fy + 1} width="5" height="5" fill="#fff" />
      <rect x={fx + 2} y={fy + 2} width="3" height="3" fill="#111714" />
    </g>
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${N} ${N}`}
      shapeRendering="crispEdges"
      style={{ background: "#fff", borderRadius: 8, display: "block" }}
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111714" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

if (typeof window !== "undefined")
  Object.assign(window, {
    StripePlaceholder,
    PillButton,
    PriceTag,
    Badge,
    GridMap,
    QRCode,
  });
