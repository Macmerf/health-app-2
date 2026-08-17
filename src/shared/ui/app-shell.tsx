'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/shared/lib/stores';

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    registerSW();
  }, []);

  return <>{children}</>;
}
