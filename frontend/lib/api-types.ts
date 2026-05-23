export type OfferType = "SPECIFIC" | string;
export type OfferAvailability = "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "HIDDEN";
export type PartnerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type SubscriptionPlan = "FREE" | "PRO";
export type SubscriptionStatus = "FREE" | "ACTIVE" | "EXPIRED" | "SUSPENDED";

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
  phone?: string | null;
  whatsapp_url?: string | null;
  telegram_url?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface PartnerProfile extends PartnerPublic {
  status: PartnerStatus;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_expires_at?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
}

export interface OfferPublic {
  id: number;
  partner_id: number;
  type: OfferType;
  availability: OfferAvailability;
  name: string;
  description: string;
  category: string;
  tags: string;
  pickup_time: string;
  price: number;
  old_price?: number | null;
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

export const ALMATY_CENTER = {
  lat: 43.238949,
  lon: 76.889709,
};

export function formatDistance(distance?: number | null) {
  if (distance == null) return "рядом";
  return `${(distance / 1000).toFixed(1)} км`;
}
