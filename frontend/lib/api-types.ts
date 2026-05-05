export type OfferType = "MAGIC_BOX" | "SPECIFIC" | string;
export type PartnerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface PartnerPublic {
  id: number;
  name: string;
  address: string;
  hours: string;
  category?: string;
  description?: string;
  logo_path?: string | null;
  logo_url?: string | null;
  map_url?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface PartnerProfile extends PartnerPublic {
  status: PartnerStatus;
  review_note?: string | null;
  reviewed_at?: string | null;
}

export interface OfferPublic {
  id: number;
  partner_id: number;
  type: OfferType;
  name: string;
  description: string;
  pickup_time: string;
  old_price: number;
  new_price: number;
  discount_reason: string;
  stock: number;
  image_path?: string | null;
  image_url?: string | null;
  created_at?: string;
}

export interface NearbyOffer {
  offer: OfferPublic;
  partner: PartnerPublic;
  partner_name: string;
  distance: number | null;
}

export type OfferDetail = NearbyOffer;

export interface PartnerDetail {
  partner: PartnerPublic;
  offers: OfferPublic[];
}

export interface OrderOffer {
  id: number;
  name: string;
  old_price: number;
  new_price: number;
  type: OfferType;
  discount_reason?: string;
  image_path?: string | null;
  image_url?: string | null;
}

export interface OrderPartner {
  id: number;
  name: string;
  address: string;
  hours: string;
  map_url?: string | null;
}

export interface OrderItem {
  id: number;
  offer_id: number;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  price: number;
  image_path?: string | null;
  image_url?: string | null;
}

export interface OrderDetail {
  id: number;
  status: string;
  code: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  expires_in_seconds?: number;
  offer: OrderOffer;
  partner: OrderPartner;
  total: number;
  storeName?: string;
  address?: string;
  pickup?: string;
  expiresIn?: number;
  items?: OrderItem[];
}

export type OrderSummary = OrderDetail;

export const ALMATY_CENTER = {
  lat: 43.238949,
  lon: 76.889709,
};

export function statusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "RESERVED" || normalized === "PENDING") return "Активна";
  if (normalized === "COMPLETED") return "Выдан";
  if (normalized === "EXPIRED") return "Отменен";
  if (normalized === "CANCELLED") return "Отменен";
  return status;
}

export function isActiveOrder(status: string) {
  const normalized = status.toUpperCase();
  return normalized === "RESERVED" || normalized === "PENDING";
}

export function formatDistance(distance?: number | null) {
  if (distance == null) return "рядом";
  return `${(distance / 1000).toFixed(1)} км`;
}
