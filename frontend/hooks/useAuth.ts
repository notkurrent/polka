"use client";

import { useEffect, useState } from "react";
import type { User } from "@/store/auth";
import { useAuthStore } from "@/store/auth";
import { api, ApiError } from "@/lib/api";
import { getTelegramLaunchInfo, isTelegramAuthContext } from "@/lib/auth-routing";

type TelegramAuthError = "missing_init_data" | "failed" | "network" | null;

function classifyTelegramAuthError(error: unknown): Exclude<TelegramAuthError, null> {
  if (error instanceof ApiError) {
    return error.status === 401 ? "failed" : "network";
  }
  return "network";
}

export const useAuth = () => {
  const { user, accessToken, setAuth, setUser, clearAuth, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [telegramAuthError, setTelegramAuthError] = useState<TelegramAuthError>(null);

  useEffect(() => {
    const authWithTelegram = async () => {
      if (typeof window === "undefined") return false;

      const info = getTelegramLaunchInfo();
      if (!info.hasInitData && !info.isLikelyTelegramWebView) return false;

      if (!info.initData) {
        setTelegramAuthError("missing_init_data");
        return false;
      }

      const data = await api.post<{
        access_token: string;
        user: User;
      }>("/auth/telegram", { initData: info.initData });

      setAuth(data.user, data.access_token);
      setTelegramAuthError(null);
      return true;
    };

    const initAuth = async () => {
      if (accessToken) {
        try {
          const me = await api.get<User>("/users/me");
          setUser(me);
        } catch {
          if (isTelegramAuthContext()) {
            clearAuth();
          } else {
            logout();
          }
          try {
            await authWithTelegram();
          } catch (telegramError) {
            if (isTelegramAuthContext()) setTelegramAuthError(classifyTelegramAuthError(telegramError));
          }
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        await authWithTelegram();
      } catch (error) {
        if (isTelegramAuthContext()) setTelegramAuthError(classifyTelegramAuthError(error));
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [accessToken, setAuth, setUser, clearAuth, logout]);

  return { user, accessToken, isLoading, logout, isAuthenticated: !!accessToken, telegramAuthError };
};
