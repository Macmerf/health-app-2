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
    // Синхронизируем подписку с сервером (источник истины)
    usePaymentStore.getState().syncFromServer();

    // Если вернулись после оплаты YooKassa (?payment=success) — обновляем статус
    if (typeof window !== 'undefined' && window.location.search.includes('payment=success')) {
      usePaymentStore.getState().syncFromServer();
      // Чистим query, чтобы не триггерить повторно
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return <>{children}</>;
}
