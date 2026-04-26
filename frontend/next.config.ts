import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.dev",
    "jutta-uneruptive-pulchritudinously.ngrok-free.dev",
  ],
  async rewrites() {
    // В Docker бэкенд будет доступен по имени сервиса "backend:8000"
    // При локальном запуске (через npm run dev) - "127.0.0.1:8000"
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`, // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
