"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppScreenBiz, AppHeaderBiz } from "@/components/biz/BizShared";
import { tokens, FONT } from "@/components/ui/primitives";

export default function BizProfileNotificationsPage() {
  const router = useRouter();
  const t = tokens();

  const [toggles, setToggles] = useState([
    { id: "newOrder", label: "Новый заказ", enabled: true },
    { id: "cancelOrder", label: "Заказ отменён", enabled: true },
    { id: "reviews", label: "Отзывы", enabled: true },
    { id: "payments", label: "Баланс и платежи", enabled: true },
    { id: "sound", label: "Звуковые уведомления", enabled: false },
  ]);

  const toggleItem = (index: number) => {
    const newToggles = [...toggles];
    newToggles[index].enabled = !newToggles[index].enabled;
    setToggles(newToggles);
  };

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Уведомления" onBack={() => router.back()} />
      <div className="biz-form-content" style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
        {toggles.map((item, i) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, flex: 1, fontFamily: FONT() }}>{item.label}</div>
            <div
              onClick={() => toggleItem(i)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: item.enabled ? t.primaryDeep : t.divider,
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 2,
                  left: item.enabled ? 22 : 2,
                  transition: "left 0.2s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </AppScreenBiz>
  );
}
