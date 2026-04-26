"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { tokens, Icon } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AddressesScreen() {
  const router = useRouter();
  const t = tokens();

  return (
    <div className="screen-scroll" style={{ background: t.bg }}>
      <AppHeader title="Адреса доставки" onBack={() => router.back()} />
      <EmptyState
        icon={Icon.pin(34, t.textTer)}
        title="Самовывоз рядом"
        description="Полка работает по самовывозу. Мы показываем ближайшие заведения и позиции вокруг вашей локации."
      />
    </div>
  );
}
