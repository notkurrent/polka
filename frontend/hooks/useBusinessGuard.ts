"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isTelegramAuthContext, nextRouteForBusiness } from "@/lib/auth-routing";
import { useAppStore } from "@/store/app";

export function useBusinessGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const selectedMode = useAppStore((s) => s.selectedMode);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      if (!isTelegramAuthContext()) {
        router.replace("/login");
      }
      return;
    }

    if (selectedMode !== "business") {
      router.replace("/choose-role");
      return;
    }

    const next = nextRouteForBusiness(user);
    const isRegister = pathname === "/biz/register";

    if (next === "/biz/register" && !isRegister) {
      router.replace("/biz/register");
    } else if (next === "/biz" && isRegister) {
      router.replace("/biz");
    }
  }, [isAuthenticated, isLoading, pathname, router, selectedMode, user]);

  if (isLoading) return { ready: false };
  if (!isAuthenticated) return { ready: false };
  if (selectedMode !== "business") return { ready: false };
  if (user?.role !== "PARTNER" && pathname !== "/biz/register") return { ready: false };
  if (user?.role === "PARTNER" && pathname === "/biz/register") return { ready: false };

  return { ready: true };
}
