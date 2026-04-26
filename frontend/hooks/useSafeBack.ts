"use client";
import { useRouter } from "next/navigation";

export const useSafeBack = (fallback = "/") => {
  const router = useRouter();
  return () => {
    if (typeof window === "undefined") {
      router.push(fallback);
      return;
    }

    let sameOriginReferrer = false;
    try {
      sameOriginReferrer = document.referrer ? new URL(document.referrer).origin === window.location.origin : false;
    } catch {
      sameOriginReferrer = false;
    }
    const nextHistoryIndex = Number(window.history.state?.idx);
    if (sameOriginReferrer || nextHistoryIndex > 0) {
      router.back();
    } else {
      router.push(fallback);
    }
  };
};
