"use client";

import { api } from "@/lib/api";
import type { OfferPublic, OrderDetail, PartnerProfile, PartnerPublic, PartnerStatus } from "@/lib/api-types";
import { isActiveOrder, statusLabel } from "@/lib/api-types";

export interface PartnerOrder extends OrderDetail {
  order?: {
    id: number;
    status: string;
    code: string;
    created_at: string;
    updated_at: string;
  };
  offer_snapshot?: OfferPublic;
}

export interface BizStats {
  activeOrders: number;
  activeOffers: number;
  todayOrders: number;
  todayRevenue: number;
  completedOrders: number;
  totalRevenue: number;
}

export interface ParsedCodePayload {
  code: string;
  orderId?: number;
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

export function orderId(order: PartnerOrder) {
  return order.order?.id ?? order.id;
}

export function orderCode(order: PartnerOrder) {
  return order.order?.code ?? order.code;
}

export function orderStatus(order: PartnerOrder) {
  return order.order?.status ?? order.status;
}

export function orderCreatedAt(order: PartnerOrder) {
  return order.order?.created_at ?? order.created_at;
}

export function orderOffer(order: PartnerOrder) {
  return order.offer_snapshot ?? order.offer;
}

export function orderImageUrl(order: PartnerOrder) {
  return order.items?.[0]?.image_url ?? order.offer_snapshot?.image_url ?? order.offer?.image_url ?? null;
}

export function orderPrice(order: PartnerOrder) {
  const offer = orderOffer(order);
  return Number(order.total ?? offer?.price ?? offer?.new_price ?? 0);
}

export function orderQuantity(order: PartnerOrder) {
  return order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 1;
}

export function orderTitle(order: PartnerOrder) {
  if (order.items?.length) {
    return order.items.length > 1 ? `${order.items[0].title} +${order.items.length - 1}` : order.items[0].title;
  }
  return orderOffer(order)?.name ?? "Товар";
}

export function orderSubtitle(order: PartnerOrder) {
  const quantity = orderQuantity(order);
  return quantity > 1 ? `${quantity} шт` : "1 шт";
}

export function formatOrderDate(value?: string) {
  if (!value) return "Сегодня";
  return new Date(value).toLocaleString("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusTone(status: string): "solid" | "neutral" | "red" {
  if (isActiveOrder(status)) return "solid";
  if (status.toUpperCase() === "COMPLETED") return "neutral";
  return "red";
}

export function buildBizStats(offers: OfferPublic[] = [], orders: PartnerOrder[] = []): BizStats {
  const today = new Date().toDateString();
  const completed = orders.filter((order) => orderStatus(order).toUpperCase() === "COMPLETED");
  const todayCompleted = completed.filter((order) => new Date(orderCreatedAt(order)).toDateString() === today);
  const activeOrders = orders.filter((order) => isActiveOrder(orderStatus(order))).length;
  const activeOffers = offers.filter((offer) => offer.availability === "IN_STOCK" && offer.stock > 0).length;
  const totalRevenue = completed.reduce((sum, order) => sum + orderPrice(order), 0);
  const todayRevenue = todayCompleted.reduce((sum, order) => sum + orderPrice(order), 0);

  return {
    activeOrders,
    activeOffers,
    todayOrders: todayCompleted.length,
    todayRevenue,
    completedOrders: completed.length,
    totalRevenue,
  };
}

export function parseCodePayload(raw: string): ParsedCodePayload | null {
  const value = raw.trim();
  const queryMatch = value.match(/\/order\/(\d+)\?code=(\d{4})/);
  if (queryMatch) return { orderId: Number(queryMatch[1]), code: queryMatch[2] };

  const pathMatch = value.match(/\/order\/(\d+)\/(\d{4})/);
  if (pathMatch) return { orderId: Number(pathMatch[1]), code: pathMatch[2] };

  const codeMatch = value.match(/\b(\d{4})\b/);
  if (codeMatch) return { code: codeMatch[1] };

  return null;
}

export function partnerErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Не удалось выполнить действие";
  if (message.includes("Partner already exists")) return "Профиль уже создан. Можно перейти в кабинет.";
  if (message.includes("Partner profile not found")) return "Сначала зарегистрируйте магазин.";
  if (message.includes("another partner")) return "Эта заявка относится к другому продавцу.";
  if (message.includes("not active")) return "Эта заявка уже закрыта или отменена.";
  if (message.includes("Multiple orders"))
    return "Несколько заявок с таким номером. Откройте заявку из списка и подтвердите её.";
  if (message.includes("not found")) return "Активная заявка с таким номером не найдена.";
  return message;
}

export function partnerStatusLabel(status?: PartnerStatus) {
  if (status === "PENDING") return "На проверке";
  if (status === "APPROVED") return "Одобрен";
  if (status === "REJECTED") return "Отклонён";
  if (status === "SUSPENDED") return "Заблокирован";
  return "Статус неизвестен";
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
  orders: () => api.get<PartnerOrder[]>("/partner-api/orders"),
  verifyCode: (body: { code: string; order_id?: number }) =>
    api.post<OrderDetail>("/partner-api/orders/verify-code", body),
};

export { isActiveOrder, statusLabel };
