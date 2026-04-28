"use client";

import React from "react";
import { FONT, tokens } from "@/components/ui/primitives";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
  fill?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false, fill = true }: EmptyStateProps) {
  const t = tokens();

  return (
    <div
      style={{
        minHeight: compact || !fill ? undefined : "calc(100dvh - 220px)",
        padding: compact ? "24px 20px" : "40px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: t.textSec,
      }}
    >
      <div
        style={{
          width: compact ? 72 : 88,
          height: compact ? 72 : 88,
          borderRadius: "50%",
          background: t.surface,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: compact ? 16 : 20,
          border: `1px solid ${t.divider}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: compact ? 20 : 22,
          lineHeight: 1.2,
          fontWeight: 700,
          color: t.text,
          letterSpacing: -0.4,
          marginBottom: 10,
          fontFamily: FONT(),
        }}
      >
        {title}
      </div>
      <div
        style={{
          maxWidth: 320,
          fontSize: 14,
          lineHeight: 1.55,
          fontFamily: FONT(),
        }}
      >
        {description}
      </div>
      {action ? <div style={{ marginTop: compact ? 18 : 22, width: "100%", maxWidth: 280 }}>{action}</div> : null}
    </div>
  );
}
