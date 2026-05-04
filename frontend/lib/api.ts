import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { isTelegramAuthContext } from "@/lib/auth-routing";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const AUTH_FREE_PATHS = ["/login", "/signup", "/forgot-password", "/landing"];
const INLINE_AUTH_ERROR_ENDPOINTS = [
  "/auth/web/login",
  "/auth/web/register",
  "/auth/password/forgot",
  "/auth/telegram/link-web-account",
  "/auth/telegram/complete-account",
];

function getPayloadField(payload: unknown, field: "code" | "message"): string | undefined {
  if (typeof payload !== "object" || payload === null || !(field in payload)) {
    return undefined;
  }
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  code?: string;

  constructor(status: number, payload: Record<string, unknown>) {
    const detail = payload.detail;
    const detailMessage = getPayloadField(detail, "message");
    const message =
      typeof detail === "string"
        ? detail
        : detailMessage ?? getPayloadField(payload, "message") ?? `API error: ${status}`;

    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = getPayloadField(payload, "code") ?? getPayloadField(detail, "code");
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  if (typeof error.detail !== "string" && error.message && !error.message.startsWith("API error:")) {
    return error.message;
  }
  return fallback;
}

function handleUnauthorized() {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath = window.location.pathname;
  if (isTelegramAuthContext()) {
    useAuthStore.getState().clearAuth();
    return;
  }
  useAuthStore.getState().logout();
  if (!AUTH_FREE_PATHS.includes(currentPath)) {
    window.location.assign("/login?expired=1");
  }
}

function handlePartnerRoleRequired() {
  if (typeof window === "undefined") {
    return;
  }

  useAppStore.getState().setSelectedMode("business");
  if (!window.location.pathname.startsWith("/biz/register")) {
    window.location.assign("/biz/register");
  }
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const hasFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
    const defaultHeaders: HeadersInit = {
      "ngrok-skip-browser-warning": "true",
    };
    if (!hasFormDataBody) {
      (defaultHeaders as Record<string, string>)["Content-Type"] = "application/json";
    }

    // Достаём токен из Zustand persist (auth-storage в localStorage)
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("auth-storage");
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.state?.accessToken;
          if (token) {
            (defaultHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401 && !INLINE_AUTH_ERROR_ENDPOINTS.includes(endpoint)) {
        handleUnauthorized();
      }
      if (response.status === 403 && error.detail === "Partner role required") {
        handlePartnerRoleRequired();
      }
      throw new ApiError(response.status, error);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  postForm<T>(endpoint: string, body: FormData, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body,
    });
  }

  put<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();
