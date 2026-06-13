"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tokens, Icon, FONT } from "@/components/ui/primitives";

export function TabBar() {
  const pathname = usePathname();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";

  let active = "catalog";
  if (pathname.includes("/search")) active = "search";
  if (pathname.includes("/favorites")) active = "favorites";
  if (pathname.includes("/profile")) active = "profile";

  const tabs: Array<{ id: string; label: string; icon: keyof typeof Icon; route: string }> = [
    { id: "catalog", label: "Каталог", icon: "home", route: "/" },
    { id: "search", label: "Поиск", icon: "search", route: "/search" },
    { id: "favorites", label: "Избранное", icon: "heart", route: "/favorites" },
    { id: "profile", label: "Профиль", icon: "user", route: "/profile" },
  ];

  return (
    <div
      className="mobile-tabbar"
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        right: "auto",
        width: "min(100vw, var(--app-fixed-bar-width))",
        transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${t.divider}`,
        zIndex: 50,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-start",
        paddingTop: "8px",
        paddingRight: "8px",
        paddingBottom: "calc(16px + var(--app-safe-bottom))",
        paddingLeft: "8px",
        height: "auto",
        minHeight: 76,
        boxSizing: "border-box",
        fontFamily: fontFn,
      }}
    >
      {tabs.map((tab) => {
        const on = active === tab.id;
        const c = on ? t.primaryDeep : t.textTer;
        const IconFn = Icon[tab.icon];

        return (
          <Link
            key={tab.id}
            href={tab.route}
            aria-label={tab.label}
            aria-current={on ? "page" : undefined}
            style={{
              flex: 1,
              minHeight: 52,
              border: "none",
              background: on ? t.primarySoft : "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              color: c,
              padding: "6px 0",
              borderRadius: 14,
              position: "relative",
              touchAction: "manipulation",
              textDecoration: "none",
            }}
          >
            <div style={{ position: "relative" }}>
              {tab.icon === "heart" && on ? IconFn(22, t.danger, true) : IconFn(22, c)}
            </div>
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
