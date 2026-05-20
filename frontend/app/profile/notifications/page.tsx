"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { tokens, Icon } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotificationsScreen() {
  const router = useRouter();
  const t = tokens();

  return (
    <div className="screen-scroll" style={{ background: t.bg }}>
      <AppHeader title="Уведомления" onBack={() => router.back()} />
      <EmptyState
        icon={Icon.bell(34, t.textTer)}
        title="Пока тихо"
        description="Здесь появятся статусы заявок, новые товары рядом и новости от любимых магазинов."
      />
    </div>
  );
}
