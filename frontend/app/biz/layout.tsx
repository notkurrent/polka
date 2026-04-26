"use client";

import { tokens } from "@/components/ui/primitives";
import { useBusinessGuard } from "@/hooks/useBusinessGuard";

export default function BizLayout({ children }: { children: React.ReactNode }) {
  const guard = useBusinessGuard();
  const t = tokens();

  if (!guard.ready) {
    return <div style={{ minHeight: "100dvh", background: t.bg }} />;
  }

  return <>{children}</>;
}
