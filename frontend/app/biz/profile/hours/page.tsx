"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppScreenBiz, AppHeaderBiz, PillButtonBiz } from "@/components/biz/BizShared";
import { tokens, FONT } from "@/components/ui/primitives";

export default function BizProfileHoursPage() {
  const router = useRouter();
  const t = tokens();

  const [days, setDays] = useState([
    { name: "Понедельник", enabled: true, from: "09:00", to: "21:00" },
    { name: "Вторник", enabled: true, from: "09:00", to: "21:00" },
    { name: "Среда", enabled: true, from: "09:00", to: "21:00" },
    { name: "Четверг", enabled: true, from: "09:00", to: "21:00" },
    { name: "Пятница", enabled: true, from: "09:00", to: "21:00" },
    { name: "Суббота", enabled: true, from: "10:00", to: "18:00" },
    { name: "Воскресенье", enabled: false, from: "10:00", to: "18:00" },
  ]);

  const toggleDay = (index: number) => {
    const newDays = [...days];
    newDays[index].enabled = !newDays[index].enabled;
    setDays(newDays);
  };

  const updateTime = (index: number, field: "from" | "to", value: string) => {
    const newDays = [...days];
    newDays[index][field] = value;
    setDays(newDays);
  };

  return (
    <AppScreenBiz>
      <AppHeaderBiz title="Часы работы" onBack={() => router.back()} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {days.map((day, i) => (
          <div
            key={day.name}
            style={{
              background: t.surface,
              border: `1px solid ${t.divider}`,
              borderRadius: 14,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Toggle */}
            <button
              type="button"
              aria-pressed={day.enabled}
              aria-label={`${day.name}: ${day.enabled ? "рабочий день" : "выходной"}`}
              onClick={() => toggleDay(i)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "transparent",
                position: "relative",
                cursor: "pointer",
                border: "none",
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: day.enabled ? t.primaryDeep : t.divider,
                  position: "absolute",
                  top: 10,
                  left: 0,
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: day.enabled ? 22 : 2,
                    transition: "left 0.2s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
            </button>

            <div style={{ fontSize: 14, fontWeight: 600, flex: 1, fontFamily: FONT() }}>{day.name}</div>

            {day.enabled ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="time"
                  name={`${day.name}-from`}
                  aria-label={`${day.name}, начало`}
                  value={day.from}
                  onChange={(e) => updateTime(i, "from", e.target.value)}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    border: `1px solid ${t.divider}`,
                    borderRadius: 8,
                    padding: "6px 8px",
                    width: 70,
                    textAlign: "center",
                    fontFamily: FONT(),
                  }}
                />
                <span style={{ fontSize: 13, color: t.textSec }}>—</span>
                <input
                  type="time"
                  name={`${day.name}-to`}
                  aria-label={`${day.name}, конец`}
                  value={day.to}
                  onChange={(e) => updateTime(i, "to", e.target.value)}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    border: `1px solid ${t.divider}`,
                    borderRadius: 8,
                    padding: "6px 8px",
                    width: 70,
                    textAlign: "center",
                    fontFamily: FONT(),
                  }}
                />
              </div>
            ) : (
              <div style={{ fontSize: 13, color: t.textSec, fontFamily: FONT() }}>Выходной</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 16px 24px" }}>
        <PillButtonBiz size="lg">Сохранить</PillButtonBiz>
      </div>
    </AppScreenBiz>
  );
}
