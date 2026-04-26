"use client";

import { api } from "@/lib/api";
import type { OfferPublic, OrderDetail, PartnerPublic } from "@/lib/api-types";
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
  conversion: number;
}

export interface ParsedCodePayload {
  code: string;
  orderId?: number;
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

export function orderPrice(order: PartnerOrder) {
  return Number(order.total ?? orderOffer(order)?.new_price ?? 0);
}

export function orderTitle(order: PartnerOrder) {
  return orderOffer(order)?.name ?? "Набор";
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
  const activeOffers = offers.filter((offer) => offer.stock > 0).length;
  const totalRevenue = completed.reduce((sum, order) => sum + orderPrice(order), 0);
  const todayRevenue = todayCompleted.reduce((sum, order) => sum + orderPrice(order), 0);

  return {
    activeOrders,
    activeOffers,
    todayOrders: todayCompleted.length,
    todayRevenue,
    completedOrders: completed.length,
    totalRevenue,
    conversion: orders.length ? Math.round((completed.length / orders.length) * 100) : 0,
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
  if (message.includes("Partner profile not found")) return "Сначала зарегистрируйте заведение.";
  if (message.includes("another partner")) return "Этот заказ относится к другому заведению.";
  if (message.includes("not active")) return "Этот заказ уже закрыт или отменён.";
  if (message.includes("Multiple orders")) return "Несколько заказов с таким кодом. Откройте заказ из списка и подтвердите его.";
  if (message.includes("not found")) return "Активный заказ с таким кодом не найден.";
  return message;
}

export const bizApi = {
  profile: () => api.get<PartnerPublic>("/partner-api/profile"),
  updateProfile: (body: Partial<PartnerPublic>) => api.patch<PartnerPublic>("/partner-api/profile", body),
  offers: () => api.get<OfferPublic[]>("/partner-api/offers"),
  createOffer: (body: unknown) => api.post<OfferPublic>("/partner-api/offers", body),
  updateOffer: (id: number, body: unknown) => api.patch<OfferPublic>(`/partner-api/offers/${id}`, body),
  deleteOffer: (id: number) => api.delete<{ status: string }>(`/partner-api/offers/${id}`),
  orders: () => api.get<PartnerOrder[]>("/partner-api/orders"),
  verifyCode: (body: { code: string; order_id?: number }) =>
    api.post<OrderDetail>("/partner-api/orders/verify-code", body),
};

export { isActiveOrder, statusLabel };
