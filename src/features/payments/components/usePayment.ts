'use client';

import { useState, useCallback } from 'react';
import { usePaymentStore } from '../store';
import type { PaymentMethod } from '@/shared/schemas';

/**
 * Хук для инициирования оплаты.
 * Сейчас все методы симулируют успех — в продакшене
 * здесь будет интеграция с YooKassa, СБП и т.д.
 */
export function usePayment() {
  const activatePremium = usePaymentStore((s) => s.activatePremium);
  const [processing, setProcessing] = useState(false);

  const initiatePayment = useCallback(
    (method: PaymentMethod) => {
      switch (method) {
        case 'yookassa_card': {
          // В продакшене: открыть виджет YooKassa
          setProcessing(true);
          setTimeout(() => {
            activatePremium(method);
            setProcessing(false);
          }, 1500);
          break;
        }
        case 'sbp': {
          // В продакшене: открыть deep link СБП
          setProcessing(true);
          setTimeout(() => {
            activatePremium(method);
            setProcessing(false);
          }, 1500);
          break;
        }
        case 'manual_transfer': {
          // Копируем реквизиты в буфер обмена
          try {
            navigator.clipboard.writeText('Реквизиты для перевода будут здесь');
          } catch {
            // Буфер обмена может быть недоступен
          }
          setProcessing(true);
          setTimeout(() => {
            activatePremium(method);
            setProcessing(false);
          }, 1500);
          break;
        }
      }
    },
    [activatePremium],
  );

  return { initiatePayment, processing };
}
