"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function useAdminGuard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return { ready: false, forbidden: false };
  if (!isAuthenticated) return { ready: false, forbidden: false };
  if (!user?.is_admin) return { ready: true, forbidden: true };

  return { ready: true, forbidden: false };
}
