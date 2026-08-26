'use client';

import { useState, useCallback } from 'react';
import { usePaymentStore } from '../store';
import { useToast } from '@/shared/ui/ZToast';
import { getDeviceId } from '@/shared/lib/device-id';
import { texts } from '@/shared/constants/texts';
import type { SubscriptionPlan } from '@/shared/schemas';

interface WidgetPaymentResult {
  payment?: { id?: string; dev?: boolean; confirmationToken?: string | null };
  entitlement?: unknown;
  error?: string;
}

/**
 * Хук для инициирования оплаты через виджет ЮKassa.
 * - С заданными ключами YOOKASSA: сервер создаёт платёж с confirmation.type=embedded
 *   и возвращает confirmationToken для инициализации виджета. Подписку активирует
 *   вебхук или проверка статуса (GET /api/payments/status) после события success.
 * - Без ключей (dev): сервер сразу активирует подписку, виджет не нужен.
 */
export function usePayment() {
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();

  /**
   * Создаёт платёж для выбранного тарифа. Возвращает confirmationToken для виджета
   * или null в dev-режиме (подписка уже активирована).
   */
  const createPayment = useCallback(async (plan: SubscriptionPlan): Promise<{ confirmationToken: string; paymentId: string | null } | null> => {
    const deviceId = getDeviceId();
    if (!deviceId) return null;

    setProcessing(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, method: 'widget', plan }),
      });

      const data = (await res.json()) as WidgetPaymentResult;

      if (!res.ok || data.error) {
        showToast(data.error ?? texts.common.error, 'error');
        return null;
      }

      if (data.payment?.dev) {
        // Тестовый режим: сервер уже активировал подписку.
        await usePaymentStore.getState().syncFromServer();
        showToast(texts.paywall.devActivated, 'success');
        return null;
      }

      if (!data.payment?.confirmationToken) {
        showToast(texts.common.error, 'error');
        return null;
      }

      return {
        confirmationToken: data.payment.confirmationToken,
        paymentId: data.payment.id ?? null,
      };
    } catch {
      showToast(texts.common.error, 'error');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [showToast]);

  /** Проверяет статус платежа и активирует подписку (после события success виджета). */
  const checkPaymentStatus = useCallback(async (paymentId: string | null): Promise<boolean> => {
    const deviceId = getDeviceId();
    if (!deviceId) return false;

    try {
      const params = new URLSearchParams({ deviceId });
      if (paymentId) params.set('paymentId', paymentId);
      const res = await fetch(`/api/payments/status?${params}`, { cache: 'no-store' });
      if (!res.ok) return false;
      const data = (await res.json()) as { status?: string; entitlement?: { tier?: string } };
      await usePaymentStore.getState().syncFromServer();
      return data.entitlement?.tier === 'premium';
    } catch {
      return false;
    }
  }, []);

  return { createPayment, checkPaymentStatus, processing };
}
