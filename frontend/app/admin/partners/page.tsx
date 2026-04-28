"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AppHeaderBiz, AppScreenBiz } from "@/components/biz/BizShared";
import { Badge, FONT, Icon, PillButton, tokens } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { adminApi, type AdminPartner, type AdminPartnerAction } from "@/lib/admin-api";
import { partnerStatusLabel } from "@/lib/biz-api";
import type { PartnerStatus } from "@/lib/api-types";

const STATUSES: PartnerStatus[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

const STATUS_TONE: Record<PartnerStatus, "amber" | "solid" | "red" | "neutral"> = {
  PENDING: "amber",
  APPROVED: "solid",
  REJECTED: "red",
  SUSPENDED: "neutral",
};

function formatDate(value?: string | null) {
  if (!value) return "Дата не указана";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function moderationDate(partner: AdminPartner) {
  return partner.created_at ?? partner.reviewed_at;
}

function actionLabel(action: AdminPartnerAction) {
  if (action === "approve") return "Одобрить";
  if (action === "reject") return "Отклонить";
  if (action === "suspend") return "Заблокировать";
  return "Вернуть на проверку";
}

function needsNote(action: AdminPartnerAction) {
  return action === "reject" || action === "suspend";
}

function PartnerCard({
  partner,
  busy,
  onAction,
}: {
  partner: AdminPartner;
  busy: boolean;
  onAction: (partner: AdminPartner, action: AdminPartnerAction, note?: string) => Promise<void>;
}) {
  const t = tokens();
  const fontFn = FONT();
  const [noteAction, setNoteAction] = useState<AdminPartnerAction | null>(null);
  const [note, setNote] = useState("");

  const actions = useMemo<AdminPartnerAction[]>(() => {
    if (partner.status === "PENDING") return ["approve", "reject"];
    if (partner.status === "APPROVED") return ["suspend"];
    return ["return-to-review"];
  }, [partner.status]);

  const submitAction = async (action: AdminPartnerAction) => {
    if (needsNote(action) && noteAction !== action) {
      setNoteAction(action);
      setNote(partner.review_note || "");
      return;
    }
    await onAction(partner, action, needsNote(action) ? note : undefined);
    setNoteAction(null);
    setNote("");
  };

  return (
    <article
      style={{
        border: `1px solid ${t.divider}`,
        borderRadius: 12,
        padding: 12,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          aria-hidden
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: t.surface,
            color: t.primaryDeep,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {Icon.bag(20, t.primaryDeep)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <h2
              style={{
                margin: 0,
                color: t.text,
                fontSize: 15,
                lineHeight: 1.25,
                fontWeight: 750,
                letterSpacing: 0,
              }}
            >
              {partner.name}
            </h2>
            <Badge tone={STATUS_TONE[partner.status]} size="sm">
              {partnerStatusLabel(partner.status)}
            </Badge>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, color: t.textSec }}>
            {partner.category || "Категория не указана"} · {formatDate(moderationDate(partner))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: t.textSec, fontSize: 13, lineHeight: 1.4 }}>
        <span style={{ width: 18, height: 18, display: "grid", placeItems: "center", flexShrink: 0 }}>
          {Icon.pin(16, t.textTer)}
        </span>
        <span>{partner.address || "Адрес не указан"}</span>
      </div>

      {partner.review_note ? (
        <div
          style={{
            borderRadius: 10,
            background: t.surface,
            color: t.textSec,
            padding: "9px 10px",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {partner.review_note}
        </div>
      ) : null}

      {noteAction ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor={`note-${partner.id}`} style={{ fontSize: 12, fontWeight: 650, color: t.text }}>
            Причина
          </label>
          <textarea
            id={`note-${partner.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Коротко опишите причину"
            style={{
              width: "100%",
              resize: "vertical",
              border: `1px solid ${t.divider}`,
              borderRadius: 10,
              padding: 10,
              color: t.text,
              background: t.bg,
              fontFamily: fontFn,
              fontSize: 14,
              lineHeight: 1.4,
              outline: "none",
            }}
          />
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: actions.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
        {actions.map((action) => (
          <PillButton
            key={action}
            size="sm"
            variant={action === "reject" || action === "suspend" ? "dangerOutline" : "dark"}
            disabled={busy}
            loading={busy && noteAction === action}
            onClick={() => void submitAction(action)}
          >
            {noteAction === action ? "Сохранить" : actionLabel(action)}
          </PillButton>
        ))}
      </div>
    </article>
  );
}

export default function AdminPartnersPage() {
  const t = tokens();
  const fontFn = FONT();
  const guard = useAdminGuard();
  const [status, setStatus] = useState<PartnerStatus>("PENDING");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const swrKey = `/admin/partners?status=${status}`;
  const { data, error, isLoading, mutate } = useSWR<AdminPartner[]>(guard.ready && !guard.forbidden ? swrKey : null, () =>
    adminApi.partners(status),
  );

  const handleAction = async (partner: AdminPartner, action: AdminPartnerAction, note?: string) => {
    setBusyId(partner.id);
    setMessage("");
    try {
      await adminApi.moderatePartner(partner.id, action, note);
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось выполнить действие");
    } finally {
      setBusyId(null);
    }
  };

  if (!guard.ready) {
    return <div style={{ minHeight: "100dvh", background: t.bg }} />;
  }

  if (guard.forbidden) {
    return (
      <AppScreenBiz style={{ background: t.bg, fontFamily: fontFn }}>
        <AppHeaderBiz title="Админка" />
        <EmptyState
          icon={Icon.close(34, t.textTer)}
          title="Нет доступа"
          description="Этот раздел доступен только администраторам."
          compact
        />
      </AppScreenBiz>
    );
  }

  return (
    <AppScreenBiz style={{ background: t.bg, fontFamily: fontFn }}>
      <AppHeaderBiz title="Модерация партнёров" />

      <div style={{ padding: "12px 16px 0" }}>
        <div
          role="tablist"
          aria-label="Фильтр по статусу"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {STATUSES.map((item) => {
            const selected = status === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStatus(item)}
                style={{
                  minHeight: 40,
                  borderRadius: 999,
                  border: selected ? "none" : `1px solid ${t.divider}`,
                  background: selected ? t.primaryDeep : t.bg,
                  color: selected ? "#fff" : t.text,
                  fontFamily: fontFn,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: 0,
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {message ? (
          <div role="alert" style={{ color: t.danger, fontSize: 13, lineHeight: 1.45, fontWeight: 650 }}>
            {message}
          </div>
        ) : null}

        {isLoading ? (
          <>
            <Skeleton w="100%" h={156} radius={12} />
            <Skeleton w="100%" h={156} radius={12} />
          </>
        ) : null}

        {error ? <ErrorState message="Не удалось загрузить заявки." onRetry={() => void mutate()} /> : null}

        {!isLoading && !error && data?.length === 0 ? (
          <EmptyState
            icon={Icon.list(34, t.textTer)}
            title="Заявок нет"
            description="В этом статусе пока нет партнёров для модерации."
            compact
          />
        ) : null}

        {!isLoading && !error
          ? data?.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                busy={busyId === partner.id}
                onAction={handleAction}
              />
            ))
          : null}
      </main>
    </AppScreenBiz>
  );
}
