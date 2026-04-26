"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { tokens } from "@/components/ui/primitives";

const sections = [
  {
    title: "Что делает Polka",
    body: "Polka помогает покупать наборы еды, которые заведения готовы отдать в конце дня или перед обновлением витрины. Доступны бронирование, код/QR для выдачи и история заказов.",
  },
  {
    title: "Как работает заказ",
    body: "Вы выбираете оффер, бронируете набор и показываете код заведению в указанное время. Состав набора может меняться: заведение собирает его из доступных позиций.",
  },
  {
    title: "Статус сервиса",
    body: "Сервис находится на раннем этапе запуска. Юридические документы, публичная оферта и политика обработки данных будут добавлены перед публичным запуском.",
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const t = tokens();

  return (
    <div className="screen-scroll" style={{ background: t.bg }}>
      <AppHeader title="О сервисе" onBack={() => router.back()} />
      <main style={{ padding: "18px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {sections.map((section) => (
          <section
            key={section.title}
            style={{
              padding: "16px",
              border: `1px solid ${t.divider}`,
              borderRadius: 14,
              background: t.surface,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: 1.25, color: t.text }}>{section.title}</h2>
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
              {section.body}
            </p>
          </section>
        ))}
      </main>
    </div>
  );
}
