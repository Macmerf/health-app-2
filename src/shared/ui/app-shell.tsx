'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/shared/lib/stores';
import { usePaymentStore } from '@/features/payments';

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
  }
}

function applyTheme(theme: 'light' | 'dark' | 'warm' | 'forest' | 'ocean') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    registerSW();
    // Понижаем тариф, если подписка истекла — вне рендера
    usePaymentStore.getState().refreshEntitlement();
  }, []);

  return <>{children}</>;
}
