"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { tokens, Icon } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PaymentScreen() {
  const router = useRouter();
  const t = tokens();

  return (
    <div className="screen-scroll" style={{ background: t.bg }}>
      <AppHeader title="Способы оплаты" onBack={() => router.back()} />
      <EmptyState
        icon={Icon.bag(34, t.textTer)}
        title="Оплата напрямую продавцу"
        description="Сейчас детали оплаты уточняются с магазином после заявки. Онлайн-способы добавим позже."
      />
    </div>
  );
}
