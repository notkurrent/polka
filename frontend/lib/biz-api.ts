"use client";

import { api } from "@/lib/api";
import type {
  OfferPublic,
  PartnerProfile,
  PartnerPublic,
  PartnerStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/lib/api-types";

export interface BizStats {
  activeOffers: number;
  hiddenOffers: number;
  totalOffers: number;
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lon: number;
  place_id?: number | null;
}

export function money(value?: number | string | null) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("ru")} ₸`;
}

export function buildBizStats(offers: OfferPublic[] = []): BizStats {
  return {
    activeOffers: offers.filter((offer) => offer.availability === "IN_STOCK" && offer.stock > 0).length,
    hiddenOffers: offers.filter((offer) => offer.availability === "HIDDEN").length,
    totalOffers: offers.length,
  };
}

export function partnerErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Не удалось выполнить действие";
  if (message.includes("Partner already exists")) return "Профиль уже создан. Можно перейти в кабинет.";
  if (message.includes("Partner profile not found")) return "Сначала зарегистрируйте магазин.";
  if (message.includes("FREE plan allows up to 5 active offers"))
    return "На FREE тарифе можно держать до 5 активных товаров. Скрытые и распроданные товары не считаются.";
  return message;
}

export function partnerStatusLabel(status?: PartnerStatus) {
  if (status === "PENDING") return "На проверке";
  if (status === "APPROVED") return "Одобрен";
  if (status === "REJECTED") return "Отклонён";
  if (status === "SUSPENDED") return "Заблокирован";
  return "Статус неизвестен";
}

export function subscriptionPlanLabel(plan?: SubscriptionPlan) {
  if (plan === "PRO") return "PRO";
  if (plan === "FREE") return "FREE";
  return "Тариф не задан";
}

export function subscriptionStatusLabel(status?: SubscriptionStatus) {
  if (status === "FREE") return "FREE";
  if (status === "ACTIVE") return "Активна";
  if (status === "EXPIRED") return "Истекла";
  if (status === "SUSPENDED") return "Приостановлена";
  return "Статус не задан";
}

export const bizApi = {
  profile: () => api.get<PartnerProfile>("/partner-api/profile"),
  addressSuggestions: (query: string) =>
    api.get<AddressSuggestion[]>(`/partner-api/address-suggestions?q=${encodeURIComponent(query)}`),
  updateProfile: (body: Partial<PartnerPublic>) => api.patch<PartnerPublic>("/partner-api/profile", body),
  uploadLogo: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return api.postForm<PartnerPublic>("/partner-api/profile/logo", body);
  },
  offers: () => api.get<OfferPublic[]>("/partner-api/offers"),
  createOffer: (body: unknown) => api.post<OfferPublic>("/partner-api/offers", body),
  updateOffer: (id: number, body: unknown) => api.patch<OfferPublic>(`/partner-api/offers/${id}`, body),
  uploadOfferImage: (id: number, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return api.postForm<OfferPublic>(`/partner-api/offers/${id}/image`, body);
  },
  deleteOfferImage: (id: number) => api.delete<OfferPublic>(`/partner-api/offers/${id}/image`),
  deleteOffer: (id: number) => api.delete<{ status: string }>(`/partner-api/offers/${id}`),
};
