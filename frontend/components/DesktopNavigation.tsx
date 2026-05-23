"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, tokens, FONT, type IconFn } from "@/components/ui/primitives";

type NavItem = {
  label: string;
  href: string;
  icon: IconFn;
  match: (pathname: string) => boolean;
};

const buyerItems: NavItem[] = [
  {
    label: "Каталог",
    href: "/",
    icon: Icon.home,
    match: (pathname) => pathname === "/" || pathname.startsWith("/stores") || pathname.startsWith("/offers"),
  },
  { label: "Поиск", href: "/search", icon: Icon.search, match: (pathname) => pathname.startsWith("/search") },
  { label: "Избранное", href: "/favorites", icon: Icon.heart, match: (pathname) => pathname.startsWith("/favorites") },
  { label: "Профиль", href: "/profile", icon: Icon.user, match: (pathname) => pathname.startsWith("/profile") },
];

const bizItems: NavItem[] = [
  { label: "Главная", href: "/biz", icon: Icon.home, match: (pathname) => pathname === "/biz" },
  { label: "Товары", href: "/biz/offers", icon: Icon.bag, match: (pathname) => pathname.startsWith("/biz/offers") },
  { label: "Профиль", href: "/biz/profile", icon: Icon.user, match: (pathname) => pathname.startsWith("/biz/profile") },
  { label: "Аналитика", href: "/biz/analytics", icon: Icon.chart, match: (pathname) => pathname.startsWith("/biz/analytics") },
];

const buyerRoutePrefixes = ["/search", "/favorites", "/profile", "/stores", "/offers"];

export function shouldShowDesktopBuyerNav(pathname: string) {
  return pathname === "/" || buyerRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="desktop-nav-brand" aria-label="Polka">
      <span className="desktop-nav-brand-mark">P</span>
      {!compact && <span className="desktop-nav-brand-name">Polka</span>}
    </div>
  );
}

export function DesktopBuyerNav() {
  const pathname = usePathname();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";

  if (!shouldShowDesktopBuyerNav(pathname)) return null;

  return (
    <nav className="desktop-buyer-nav" aria-label="Навигация покупателя" style={{ fontFamily: fontFn }}>
      <div className="desktop-buyer-nav-inner">
        <Link href="/" className="desktop-buyer-brand-link" aria-label="Polka каталог">
          <BrandMark />
        </Link>
        <div className="desktop-buyer-nav-links">
          {buyerItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="desktop-nav-link"
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
              >
                {item.icon(17, active ? t.primaryDeep : t.textSec, item.href === "/favorites" && active)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function DesktopBizSidebar() {
  const pathname = usePathname();
  const t = tokens();
  const fontFn = FONT ? FONT() : "system-ui";

  return (
    <aside className="desktop-biz-sidebar" aria-label="Навигация продавца" style={{ fontFamily: fontFn }}>
      <Link href="/biz" className="desktop-biz-brand-link" aria-label="Polka бизнес">
        <BrandMark compact />
        <div className="desktop-biz-brand-copy">
          <span className="desktop-nav-brand-name">Polka</span>
          <span>Кабинет продавца</span>
        </div>
      </Link>
      <nav className="desktop-biz-nav-links">
        {bizItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="desktop-biz-nav-link"
              aria-current={active ? "page" : undefined}
              data-active={active ? "true" : "false"}
            >
              {item.icon(18, active ? t.primaryDeep : t.textSec)}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
