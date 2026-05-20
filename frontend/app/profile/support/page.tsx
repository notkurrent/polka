"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { tokens } from "@/components/ui/primitives";

const helpItems = [
  {
    title: "Связь с продавцом",
    body: "Откройте заявку и покажите номер заявки продавцу. После согласования продавец закроет её в своем кабинете.",
  },
  {
    title: "Если планы изменились",
    body: "Активную заявку можно отменить из карточки заявки. После отмены товар вернётся в доступный остаток.",
  },
  {
    title: "Проблема с заявкой",
    body: "Проверьте, что открыта нужная заявка. Если продавец не видит её в списке, назовите номер заявки вручную.",
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const t = tokens();

  return (
    <div className="screen-scroll" style={{ background: t.bg }}>
      <AppHeader title="Помощь и поддержка" onBack={() => router.back()} />
      <main className="app-readable-content" style={{ padding: "18px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {helpItems.map((item) => (
          <section
            key={item.title}
            style={{
              padding: "16px",
              border: `1px solid ${t.divider}`,
              borderRadius: 14,
              background: t.surface,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: 1.25, color: t.text }}>{item.title}</h2>
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: t.textSec }}>{item.body}</p>
          </section>
        ))}

        <section
          style={{
            padding: "16px",
            border: `1px solid ${t.divider}`,
            borderRadius: 14,
            background: t.surface,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, lineHeight: 1.25, color: t.text }}>Связь с командой</h2>
          <p style={{ margin: "8px 0 14px", fontSize: 14, lineHeight: 1.5, color: t.textSec }}>
            Отдельный канал поддержки пока не подключен. Обратитесь к команде Polka, если заявка не находится,
            продавец не видит номер или нужно решить вопрос с товаром.
          </p>
        </section>
      </main>
    </div>
  );
}
