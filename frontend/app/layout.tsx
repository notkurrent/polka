import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "../app/globals.css";
import { TelegramProvider } from "@/components/TelegramProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
  title: "Полка - Спасай вкусную еду со скидкой",
  description: "Гибридная платформа для реализации излишков еды из кофеен, пекарен и ресторанов Алматы. Скидки до 70%.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js?v=7.10" strategy="beforeInteractive" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <TelegramProvider />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
