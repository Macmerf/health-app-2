import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/shared/ui/app-shell";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zabotapsy.ru";

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ЗаботаPsy",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, Android, iOS",
  url: APP_URL,
  description:
    "PWA для поддержки при тревоге: дневник мыслей, лестница смелости, план заботы. Работает офлайн.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RUB",
    description: "Базовые функции бесплатны навсегда",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "ЗаботаPsy — поддержка при тревоге",
  description:
    "ЗаботаPsy — PWA для поддержки при тревоге: дневник эмоций, лестница смелости, план заботы. Работает офлайн, базовые упражнения всегда бесплатны.",
  keywords: [
    "тревога",
    "панические атаки",
    "поддержка",
    "дневник эмоций",
    "лестница смелости",
    "план заботы",
    "дыхание",
    "заземление",
    "PWA",
    "офлайн",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ЗаботаPsy",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: APP_URL,
    siteName: "ЗаботаPsy — поддержка при тревоге",
    title: "ЗаботаPsy — поддержка при тревоге",
    description:
      "Дневник мыслей, лестница смелости и план заботы. Работает без интернета.",
    images: [{ url: "/og/cover.png", width: 1200, height: 630, alt: "ЗаботаPsy — поддержка при тревоге" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ЗаботаPsy — поддержка при тревоге",
    description:
      "Дневник мыслей, лестница смелости, план заботы. Офлайн-first, базовые функции всегда бесплатны.",
    images: ["/og/cover.png"],
  },
  alternates: {
    canonical: APP_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FAF9F7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}