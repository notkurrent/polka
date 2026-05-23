"use client";

import { usePathname, useRouter } from "next/navigation";
import { tokens, Icon, FONT } from "@/components/ui/primitives";

export function BizTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";

  let active = "dash";
  if (pathname.includes("/biz/offers")) active = "offers";
  if (pathname.includes("/biz/profile")) active = "profile";

  const tabs: Array<{ id: string; label: string; icon: keyof typeof Icon; route: string }> = [
    { id: "dash", label: "Главная", icon: "home", route: "/biz" },
    { id: "offers", label: "Товары", icon: "bag", route: "/biz/offers" },
    { id: "profile", label: "Профиль", icon: "user", route: "/biz/profile" },
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
          <button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            aria-current={on ? "page" : undefined}
            onClick={() => router.push(tab.route)}
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
              touchAction: "manipulation",
            }}
          >
            {IconFn(22, c)}
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
