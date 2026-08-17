import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/shared/ui/app-shell";

export const metadata: Metadata = {
  title: "Забота — поддержка при тревоге",
  description: "PWA для поддержки при тревоге: дневник мыслей, лестница смелости, план заботы",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Забота",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FAF9F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}