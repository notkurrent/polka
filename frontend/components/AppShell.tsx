"use client";

import { usePathname } from "next/navigation";
import { DesktopBuyerNav, shouldShowDesktopBuyerNav } from "@/components/DesktopNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBiz = pathname.startsWith("/biz");
  const isBuyer = shouldShowDesktopBuyerNav(pathname);
  const className = ["app-shell", isBiz ? "app-shell--biz" : "", isBuyer ? "app-shell--buyer" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <DesktopBuyerNav />
      {children}
    </div>
  );
}
