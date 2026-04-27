"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { tokens, Icon, PillButton } from "@/components/ui/primitives";
import AppHeader from "@/components/AppHeader";
import { api } from "@/lib/api";
import { OrderDetail } from "@/lib/api-types";

export default function RatingScreen() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const t = tokens();

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const tags = ["Свежее", "Упаковка ОК", "Быстро", "Много еды"];
  const [picked, setPicked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    data: order,
    isLoading,
    error,
  } = useSWR<OrderDetail>(id ? `/orders/${id}` : null, (url: string) => api.get<OrderDetail>(url));

  const toggle = (tag: string) => setPicked((p) => (p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]));

  const handleSubmit = async () => {
    if (!order || order.status !== "COMPLETED" || rating === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post(`/orders/${id}/rating`, { score: rating, tags: picked, comment: feedback });
      router.push("/orders");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось отправить оценку");
    } finally {
      setSubmitting(false);
    }
  };

  const savings = order ? Math.max(0, order.offer.old_price - order.offer.new_price) : 0;
  const canRate = order?.status === "COMPLETED";

  return (
    <div
      className="screen-scroll-with-bottom-action"
      style={{
        background: t.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppHeader title="Оценка" onBack={() => router.back()} />

      <div
        style={{
          padding: "40px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: t.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            {Icon.check(48)}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0 }}>Спасибо!</div>

          <div
            style={{
              fontSize: 13,
              color: t.textSec,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {isLoading && "Загружаем заказ…"}
            {error && "Не удалось загрузить заказ"}
            {order && (
              <>
                {order.partner.name} · код {order.code} <br />
                {order.total} ₸ · Экономия {savings} ₸
              </>
            )}
          </div>
        </div>

        {order && !canRate && (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: t.surface,
              color: t.textSec,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Оценка доступна только после выдачи заказа.
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Как вам заказ?</div>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              marginTop: 16,
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`Поставить ${n} из 5`}
                disabled={!canRate}
                style={{
                  width: 44,
                  height: 44,
                  border: "none",
                  background: "transparent",
                  cursor: canRate ? "pointer" : "default",
                  transform: rating >= n ? "scale(1.1)" : "scale(1)",
                  transition: "transform 0.1s",
                }}
              >
                {Icon.star(36, rating >= n ? t.star : t.divider, rating >= n)}
              </button>
            ))}
          </div>
        </div>

        {rating > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: t.textSec,
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              >
                Что понравилось?
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {tags.map((tag) => {
                  const on = picked.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggle(tag)}
                      style={{
                        minHeight: 44,
                        padding: "10px 16px",
                        borderRadius: 9999,
                        border: `1px solid ${on ? t.primaryDeep : t.divider}`,
                        background: on ? t.primaryDeep : t.surface,
                        color: on ? "#fff" : t.text,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <textarea
                value={feedback}
                name="rating-feedback"
                aria-label="Комментарий к заказу"
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Что понравилось? Что улучшить?"
                rows={4}
                style={{
                  width: "100%",
                  padding: 16,
                  border: `1px solid ${t.divider}`,
                  borderRadius: 16,
                  fontSize: 16,
                  resize: "none",
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                  appearance: "none",
                  outline: "none",
                  background: t.surface,
                }}
              />
            </div>
          </div>
        )}

        {submitError && (
          <div style={{ padding: 12, borderRadius: 12, background: "#FDE8E8", color: t.danger, fontSize: 13 }}>
            {submitError}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: "auto",
            paddingTop: 24,
          }}
        >
          <PillButton
            onClick={handleSubmit}
            disabled={rating === 0 || !canRate || submitting}
            variant="primary"
            size="lg"
          >
            {submitting ? "Отправляем…" : "Отправить отзыв"}
          </PillButton>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            style={{
              border: "none",
              background: "transparent",
              color: t.textSec,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              padding: "12px 0",
            }}
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  );
}
