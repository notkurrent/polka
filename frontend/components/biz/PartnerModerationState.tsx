"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, Icon, tokens } from "@/components/ui/primitives";
import { PillButtonBiz } from "@/components/biz/BizShared";
import { partnerStatusLabel } from "@/lib/biz-api";
import type { PartnerProfile, PartnerStatus } from "@/lib/api-types";

interface PartnerModerationStateProps {
  profile?: PartnerProfile;
  compact?: boolean;
  context?: "dashboard" | "feature";
}

function statusTone(status?: PartnerStatus): "amber" | "red" | "neutral" | "solid" {
  if (status === "PENDING") return "amber";
  if (status === "REJECTED" || status === "SUSPENDED") return "red";
  if (status === "APPROVED") return "solid";
  return "neutral";
}

function statusCopy(status?: PartnerStatus, note?: string | null, context: "dashboard" | "feature" = "dashboard") {
  if (status === "PENDING") {
    return {
      icon: "clock" as const,
      title: "Заявка на проверке",
      description:
        context === "feature"
          ? "Этот раздел откроется после проверки бизнес-аккаунта."
          : "Мы проверяем данные магазина. После одобрения откроются товары, витрина и аналитика.",
    };
  }
  if (status === "REJECTED") {
    return {
      icon: "close" as const,
      title: "Заявка отклонена",
      description: note ? `Причина: ${note}` : "Заявка не прошла проверку. Уточните данные магазина и отправьте их снова.",
    };
  }
  if (status === "SUSPENDED") {
    return {
      icon: "close" as const,
      title: "Кабинет заблокирован",
      description: "Рабочие разделы временно недоступны. Если нужна помощь, свяжитесь с поддержкой Polka.",
    };
  }
  return {
    icon: "user" as const,
    title: "Статус недоступен",
    description: "Не удалось определить статус бизнес-аккаунта. Попробуйте обновить страницу.",
  };
}

export function PartnerModerationState({ profile, compact = false, context = "dashboard" }: PartnerModerationStateProps) {
  const router = useRouter();
  const t = tokens();
  const status = profile?.status;
  const copy = statusCopy(status, profile?.review_note, context);
  const icon =
    copy.icon === "clock"
      ? Icon.clock(34, t.textTer)
      : copy.icon === "close"
        ? Icon.close(34, status === "REJECTED" || status === "SUSPENDED" ? t.danger : t.textTer)
        : Icon.user(34, t.textTer);

  return (
    <div style={{ padding: compact ? 16 : "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: compact ? 0 : 8 }}>
        <Badge tone={statusTone(status)} size="sm">
          {partnerStatusLabel(status)}
        </Badge>
      </div>
      <EmptyState
        icon={icon}
        title={copy.title}
        description={copy.description}
        compact={compact}
        fill={false}
        action={
          status === "REJECTED" ? (
            <PillButtonBiz onClick={() => router.push("/biz/profile/edit")} style={{ width: "100%" }}>
              Исправить данные
            </PillButtonBiz>
          ) : undefined
        }
      />
    </div>
  );
}
