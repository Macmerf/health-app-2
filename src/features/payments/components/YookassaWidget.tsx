'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/shared/ui/ZToast';
import { texts } from '@/shared/constants/texts';
import { usePaymentStore } from '../store';
import { usePayment } from './usePayment';

/**
 * Виджет оплаты ЮKassa (checkout-widget v1).
 * Скрипт загружается динамически только при открытии формы,
 * чтобы не тащить сторонний код на всех страницах.
 * Документация: https://yookassa.ru/developers/payment-acceptance/integration-scenarios/widget/basics
 */

interface YooMoneyCheckoutWidgetInstance {
  render: (containerId: string) => Promise<void>;
  on: (event: string, callback: () => void) => void;
  destroy: () => void;
}

interface YooMoneyCheckoutWidgetCtor {
  new (config: {
    confirmation_token: string;
    error_callback: (error: unknown) => void;
  }): YooMoneyCheckoutWidgetInstance;
}

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: YooMoneyCheckoutWidgetCtor;
  }
}

const WIDGET_SCRIPT_URL = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';
const CONTAINER_ID = 'yookassa-payment-form';

/** Загружает скрипт виджета один раз (промис кэшируется). */
let scriptPromise: Promise<YooMoneyCheckoutWidgetCtor> | null = null;

function loadWidgetScript(): Promise<YooMoneyCheckoutWidgetCtor> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR'));
  }
  if (window.YooMoneyCheckoutWidget) {
    return Promise.resolve(window.YooMoneyCheckoutWidget);
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = WIDGET_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        if (window.YooMoneyCheckoutWidget) resolve(window.YooMoneyCheckoutWidget);
        else reject(new Error('Widget script loaded but constructor not found'));
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Failed to load YooKassa widget script'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface YookassaWidgetProps {
  /** Токен подтверждения из POST /api/payments. */
  confirmationToken: string;
  /** ID платежа для проверки статуса после события success. */
  paymentId: string | null;
  /** Вызывается, когда подписка активирована (или в dev-режиме). */
  onSuccess: () => void;
  /** Вызывается при ошибке оплаты или закрытии формы пользователем. */
  onCancel: () => void;
}

export function YookassaWidget({ confirmationToken, paymentId, onSuccess, onCancel }: YookassaWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const widgetRef = useRef<YooMoneyCheckoutWidgetInstance | null>(null);
  const { showToast } = useToast();
  const { checkPaymentStatus } = usePayment();
  const syncFromServer = usePaymentStore((s) => s.syncFromServer);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const handleSuccess = async () => {
      if (settled || cancelled) return;
      settled = true;
      // Виджет сообщил об успехе, но вебхук мог ещё не прийти —
      // проверяем статус платежа на сервере (это активирует подписку).
      const activated = await checkPaymentStatus(paymentId);
      if (activated) {
        showToast(texts.paywall.paymentSuccess, 'success');
      } else {
        // Статус ещё не подтвердился — синхронизируемся, вебхук догонит.
        await syncFromServer();
        showToast(texts.paywall.paymentPending, 'info');
      }
      onSuccess();
    };

    const handleFail = () => {
      if (settled || cancelled) return;
      settled = true;
      showToast(texts.paywall.paymentFailed, 'error');
      onCancel();
    };

    loadWidgetScript()
      .then((Ctor) => {
        if (cancelled) return;

        const widget = new Ctor({
          confirmation_token: confirmationToken,
          error_callback: () => {
            if (settled || cancelled) return;
            settled = true;
            setLoadError(true);
            showToast(texts.paywall.paymentFailed, 'error');
          },
        });

        widgetRef.current = widget;

        // Без return_url виджет отдаёт события success/fail вместо редиректа.
        widget.on('success', handleSuccess);
        widget.on('fail', handleFail);

        widget.render(CONTAINER_ID)
          .then(() => {
            if (!cancelled) setLoading(false);
          })
          .catch(() => {
            if (settled || cancelled) return;
            settled = true;
            setLoadError(true);
            setLoading(false);
          });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      try {
        widgetRef.current?.destroy();
      } catch {
        // Виджет мог не успеть инициализироваться.
      }
      widgetRef.current = null;
    };
    // confirmationToken/paymentId фиксированы на время жизни формы виджета.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <div className="text-center space-y-3 py-8">
        <p className="text-sm text-muted-foreground">{texts.paywall.widgetLoadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loading && (
        <p className="text-center text-sm text-muted-foreground py-4">{texts.common.loading}</p>
      )}
      {/* Минимальная ширина контейнера виджета — 288px */}
      <div id={CONTAINER_ID} className="min-w-[288px]" />
    </div>
  );
}
