"use client";

import { api } from "@/lib/api";
import type { PartnerStatus } from "@/lib/api-types";

export interface AdminPartner {
  id: number;
  user_id: number;
  name: string;
  address: string;
  hours: string;
  category: string;
  description: string;
  lat?: number | null;
  lon?: number | null;
  status: PartnerStatus;
  review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by_user_id?: number | null;
  created_at?: string | null;
}

export type AdminPartnerAction = "approve" | "reject" | "suspend" | "return-to-review";

function bodyWithNote(note?: string) {
  const trimmed = note?.trim();
  return trimmed ? { note: trimmed } : {};
}

export const adminApi = {
  partners: (status?: PartnerStatus) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<AdminPartner[]>(`/admin/partners${query}`);
  },
  partner: (id: number) => api.get<AdminPartner>(`/admin/partners/${id}`),
  moderatePartner: (id: number, action: AdminPartnerAction, note?: string) =>
    api.post<AdminPartner>(`/admin/partners/${id}/${action}`, bodyWithNote(note)),
};
