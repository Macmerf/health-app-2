import type { NextConfig } from "next";

/**
 * Security headers.
 * Приложение хранит чувствительные данные (дневники психического здоровья),
 * поэтому CSP жёсткий: всё своё, плюс фрейм виджета ЮKassa.
 * frame-ancestors 'none' + X-Frame-Options DENY — запрет кликджекинга.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js: инлайн-стили гидрации
      "style-src 'self' 'unsafe-inline'",
      // Dev: 'unsafe-inline' для JSON-LD, Turbopack HMR, nonce-скриптов Next.js
      // Prod: 'unsafe-inline' нужен для JSON-LD (метаданные, не пользовательский код)
      // и nonce-скриптов Next.js. JSON-LD — статичный мета-контент, риски минимальны.
      ...(process.env.NODE_ENV === "production"
        ? ["script-src 'self' 'unsafe-inline'"]
        : ["script-src 'self' 'unsafe-inline' 'unsafe-eval'"]),
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.yookassa.ru",
      // Виджет оплаты ЮKassa рендерится в iframe
      "frame-src https://yookassa.ru https://*.yoomoney.ru",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Standalone-режим нужен для Docker-деплоя на VPS (Timeweb).
  // На Vercel он не нужен и ломает сборку (конфликт с трейсингом файлов
  // Vercel — ошибка .next/next-server.js.nft.json), поэтому отключаем.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Service worker не должен кэшироваться: иначе после деплоя браузер
        // может до 24 часов держать старый SW и не предлагать обновление.
        // Остальную статику не трогаем: /_next/static хеширован и immutable.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
