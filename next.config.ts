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
      // Next.js dev-режим требует 'unsafe-eval'; в проде — только 'self'
      ...(process.env.NODE_ENV === "production"
        ? ["script-src 'self'"]
        : ["script-src 'self' 'unsafe-eval'"]),
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
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
