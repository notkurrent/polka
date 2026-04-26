"use client";
import type React from "react";
import { tokens } from "./primitives";

export function Skeleton({
  w,
  h,
  radius = 8,
  style,
}: {
  w: number | string;
  h: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
}) {
  const t = tokens();
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${t.surface} 25%, ${t.divider} 50%, ${t.surface} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite linear",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
