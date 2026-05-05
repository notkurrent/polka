"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { tokens, FONT, Icon, Badge } from "@/components/ui/primitives";
import { AppScreenBiz, AppHeaderBiz } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  bizApi,
  formatOrderDate,
  isActiveOrder,
  money,
  orderCreatedAt,
  orderId,
  orderImageUrl,
  orderPrice,
  orderSubtitle,
  orderStatus,
  orderTitle,
  partnerErrorMessage,
  statusLabel,
  statusTone,
  type PartnerOrder,
} from "@/lib/biz-api";
import { OfferImagePreview } from "@/components/biz/OfferImagePicker";

export default function BizOrdersPage() {
  const t = tokens();
  const router = useRouter();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: profile, isLoading: profileLoading, error: profileError } = useSWR("/partner-api/profile", bizApi.profile);
  const isApproved = profile?.status === "APPROVED";
  const { data: orders, isLoading, error } = useSWR<PartnerOrder[]>(
    isApproved ? "/partner-api/orders" : null,
    bizApi.orders,
  );

  const active = (orders || []).filter((order) => isActiveOrder(orderStatus(order)));
  const past = (orders || []).filter((order) => !isActiveOrder(orderStatus(order)));

  const renderOrder = (order: PartnerOrder) => {
    const id = orderId(order);
    const activeOrder = isActiveOrder(orderStatus(order));
    return (
      <button
        key={id}
        type="button"
        disabled={!activeOrder}
        onClick={() => activeOrder && router.push(`/biz/scan?orderId=${id}`)}
        style={{
          width: "100%",
          textAlign: "left",
          background: t.bg,
          borderRadius: 12,
          padding: 14,
          border: `1px solid ${t.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: activeOrder ? "pointer" : "default",
          fontFamily: fontFn,
          opacity: activeOrder ? 1 : 0.78,
          color: t.text,
        }}
      >
        <OfferImagePreview imageUrl={orderImageUrl(order)} label="позиция" width={48} height={48} radius={14} tone="mint" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 750, overflowWrap: "anywhere" }}>
              {orderTitle(order)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 750 }}>{money(orderPrice(order))}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8 }}>
            <span style={{ fontSize: 12, color: t.textSec }}>
              {orderSubtitle(order)} · {formatOrderDate(orderCreatedAt(order))}
            </span>
            <Badge tone={statusTone(orderStatus(order))} size="sm">
              {statusLabel(orderStatus(order))}
            </Badge>
          </div>
        </div>
      </button>
    );
  };

  return (
    <AppScreenBiz style={{ background: t.bg, fontFamily: fontFn }}>
      <AppHeaderBiz title="Заказы" />

      <div style={{ padding: "16px 16px" }}>
        {loadingOrError(profileLoading, profileError)}
        {!profileLoading && !profileError && profile && !isApproved && (
          <PartnerModerationState profile={profile} compact context="feature" />
        )}
        {isApproved && loadingOrError(isLoading, error)}
        {isApproved && !isLoading && !error && (orders || []).length === 0 && (
          <EmptyState
            icon={Icon.list(34, t.textTer)}
            title="Пока нет заказов"
            description="Новые бронирования покупателей появятся здесь."
            compact
          />
        )}
        {isApproved && !isLoading && !error && (orders || []).length > 0 && (
          <>
            <SectionTitle title="Активные" count={active.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {active.length ? active.map(renderOrder) : <EmptyLine>Нет активных заказов</EmptyLine>}
            </div>

            <SectionTitle title="Прошлые" count={past.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {past.length ? past.map(renderOrder) : <EmptyLine>Завершённые заказы появятся после выдачи</EmptyLine>}
            </div>
          </>
        )}
      </div>

      <BizTabBar />
    </AppScreenBiz>
  );
}

function loadingOrError(isLoading: boolean, error: unknown) {
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton w="100%" h={78} radius={12} />
        <Skeleton w="100%" h={78} radius={12} />
        <Skeleton w="100%" h={78} radius={12} />
      </div>
    );
  }
  if (error) return <ErrorState message={partnerErrorMessage(error)} />;
  return null;
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 750, letterSpacing: "-0.2px", marginBottom: 12 }}>
      {title} · {count}
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  const t = tokens();
  return <div style={{ color: t.textSec, fontSize: 13, padding: "10px 0" }}>{children}</div>;
}
