"use client";

import useSWR from "swr";
import { AppScreenBiz, AppHeaderBiz, StatTile } from "@/components/biz/BizShared";
import { BizTabBar } from "@/components/biz/BizTabBar";
import { PartnerModerationState } from "@/components/biz/PartnerModerationState";
import { Icon, tokens, FONT } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { bizApi, buildBizStats, partnerErrorMessage } from "@/lib/biz-api";
import { EmptyState } from "@/components/ui/EmptyState";

export default function BizAnalyticsScreen() {
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";
  const { data: profile, isLoading: profileLoading, error: profileError } = useSWR("/partner-api/profile", bizApi.profile);
  const isApproved = profile?.status === "APPROVED";
  const { data: offers, isLoading, error } = useSWR(isApproved ? "/partner-api/offers" : null, bizApi.offers);
  const stats = buildBizStats(offers);

  return (
    <AppScreenBiz style={{ background: t.bg, fontFamily: fontFn }}>
      <AppHeaderBiz title="Аналитика" />
      <div className="biz-offers-content" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {profileLoading && (
          <>
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={160} radius={12} />
          </>
        )}
        {profileError && <ErrorState message={partnerErrorMessage(profileError)} />}
        {!profileLoading && !profileError && profile && !isApproved && (
          <PartnerModerationState profile={profile} compact context="feature" />
        )}
        {isApproved && isLoading && (
          <>
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={68} radius={12} />
            <Skeleton w="100%" h={160} radius={12} />
          </>
        )}
        {isApproved && error && <ErrorState message={partnerErrorMessage(error)} />}
        {isApproved && !isLoading && !error && (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <StatTile value={stats.activeOffers} label="В продаже" accent />
              <StatTile value={stats.totalOffers} label="Всего товаров" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <StatTile value={stats.hiddenOffers} label="Скрыто" />
            </div>

            {stats.totalOffers === 0 ? (
              <EmptyState
                icon={Icon.chart(34, t.textTer)}
                title="Данных пока нет"
                description="Добавьте товары, чтобы видеть состояние витрины."
                compact
              />
            ) : (
              <div
                style={{
                  background: t.primarySoft,
                  color: t.primaryDeep,
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  gap: 10,
                }}
              >
                {Icon.chart(20, t.primaryDeep)}
                <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                  Сейчас аналитика показывает состояние витрины. Метрики контактов продавца появятся после отдельного отчета.
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BizTabBar />
    </AppScreenBiz>
  );
}
