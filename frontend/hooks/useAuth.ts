"use client";

import { useEffect, useState } from "react";
import type { User } from "@/store/auth";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { getTelegramInitData, isTelegramLaunch } from "@/lib/auth-routing";

type TelegramAuthError = "missing_init_data" | "failed" | null;

export const useAuth = () => {
  const { user, accessToken, setAuth, setUser, clearAuth, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [telegramAuthError, setTelegramAuthError] = useState<TelegramAuthError>(null);

  useEffect(() => {
    const authWithTelegram = async () => {
      if (typeof window === "undefined" || !isTelegramLaunch()) return false;

      const initData = getTelegramInitData();
      if (!initData) {
        setTelegramAuthError("missing_init_data");
        return false;
      }

      const data = await api.post<{
        access_token: string;
        user: User;
      }>("/auth/telegram", { initData });

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
          if (isTelegramLaunch()) {
            clearAuth();
          } else {
            logout();
          }
          try {
            await authWithTelegram();
          } catch (telegramError) {
            console.warn("Telegram auth retry failed", telegramError);
            if (isTelegramLaunch()) setTelegramAuthError("failed");
          }
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        await authWithTelegram();
      } catch (error) {
        console.warn("Telegram auth failed", error);
        if (isTelegramLaunch()) setTelegramAuthError("failed");
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [accessToken, setAuth, setUser, clearAuth, logout]);

  return { user, accessToken, isLoading, logout, isAuthenticated: !!accessToken, telegramAuthError };
};
