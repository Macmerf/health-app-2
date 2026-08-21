'use client';

import { useState, useCallback } from 'react';
import { usePaymentStore } from '../store';
import { useToast } from '@/shared/ui/ZToast';
import { getDeviceId } from '@/shared/lib/device-id';
import { texts } from '@/shared/constants/texts';
import type { PaymentMethod } from '@/shared/schemas';

/**
 * Хук для инициирования оплаты.
 * Платёж создаётся на сервере (/api/payments):
 * - с заданными YOOKASSA ключами — открывается страница оплаты YooKassa,
 *   подписку активирует вебхук после успешной оплаты;
 * - без ключей (dev) — сервер сразу активирует подписку, чтобы флоу можно было проверить локально.
 */
export function usePayment() {
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();

  const initiatePayment = useCallback(
    async (method: PaymentMethod) => {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      setProcessing(true);
      try {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, method }),
        });

        const data = (await res.json()) as {
          payment?: { dev?: boolean; confirmationUrl?: string | null };
          error?: string;
        };

        if (!res.ok || data.error) {
          showToast(data.error ?? texts.common.error, 'error');
          return;
        }

        if (data.payment?.dev) {
          // Тестовый режим: сервер уже активировал подписку.
          await usePaymentStore.getState().syncFromServer();
          showToast(texts.paywall.devActivated, 'success');
          return;
        }

        if (data.payment?.confirmationUrl) {
          // Режим продакшена: открываем страницу оплаты YooKassa.
          window.open(data.payment.confirmationUrl, '_blank', 'noopener,noreferrer');
          showToast(texts.paywall.paymentOpened, 'info');
        }
      } catch {
        showToast(texts.common.error, 'error');
      } finally {
        setProcessing(false);
      }
    },
    [showToast],
  );

  return { initiatePayment, processing };
}
