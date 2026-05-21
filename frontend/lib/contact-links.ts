import { API_BASE_URL } from "@/lib/api";
import type { PartnerPublic } from "@/lib/api-types";

export type ContactChannel = "whatsapp" | "telegram" | "phone" | "website" | "instagram";

export interface ContactLink {
  channel: ContactChannel;
  label: string;
  href: string;
}

function withProtocol(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function phoneHref(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

export function primaryContactLink(partner?: PartnerPublic | null): ContactLink | null {
  if (!partner) return null;

  const whatsapp = withProtocol(partner.whatsapp_url);
  if (whatsapp) return { channel: "whatsapp", label: "WhatsApp", href: whatsapp };

  const telegram = withProtocol(partner.telegram_url);
  if (telegram) return { channel: "telegram", label: "Telegram", href: telegram };

  const phone = phoneHref(partner.phone);
  if (phone) return { channel: "phone", label: "Позвонить", href: phone };

  const website = withProtocol(partner.website_url);
  if (website) return { channel: "website", label: "Сайт", href: website };

  return null;
}

export function secondaryContactLinks(partner?: PartnerPublic | null): ContactLink[] {
  if (!partner) return [];

  const links: ContactLink[] = [];
  const telegram = withProtocol(partner.telegram_url);
  const whatsapp = withProtocol(partner.whatsapp_url);
  const phone = phoneHref(partner.phone);
  const website = withProtocol(partner.website_url);
  const instagram = withProtocol(partner.instagram_url);

  if (whatsapp) links.push({ channel: "whatsapp", label: "WhatsApp", href: whatsapp });
  if (telegram) links.push({ channel: "telegram", label: "Telegram", href: telegram });
  if (phone) links.push({ channel: "phone", label: partner.phone?.trim() || "Позвонить", href: phone });
  if (website) links.push({ channel: "website", label: "Сайт", href: website });
  if (instagram) links.push({ channel: "instagram", label: "Instagram", href: instagram });

  return links;
}

export function trackInquiryClick({
  partnerId,
  offerId,
  channel,
  targetUrl,
}: {
  partnerId: number;
  offerId?: number;
  channel: ContactChannel;
  targetUrl: string;
}) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    offer_id: offerId,
    channel,
    target_url: targetUrl,
  });
  const endpoint = `${API_BASE_URL}/partners/${partnerId}/inquiries`;

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
    body,
    keepalive: true,
  }).catch(() => {});
}
