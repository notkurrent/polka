import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "../app/globals.css";
import { TelegramProvider } from "@/components/TelegramProvider";
import { AppShell } from "@/components/AppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom-lock временно сохраняется из-за iOS/Telegram input/double-tap zoom; снимать только после device QA.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Полка - локальные магазины и товары",
  description: "Лёгкий маркетплейс для каталога локальных магазинов и прямого контакта с продавцами в Алматы.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <TelegramProvider />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
