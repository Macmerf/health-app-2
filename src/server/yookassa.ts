import { createHmac, timingSafeEqual } from 'node:crypto';
import { envInt } from './entitlement';

/**
 * Минимальная серверная интеграция с YooKassa (https://yookassa.ru/developers).
 * Используется только если заданы YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.
 * Без них работает dev-режим: платёж считается успешным сразу (для локального теста флоу).
 */

const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';

export function yookassaConfigured(): boolean {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

export interface CreatedPayment {
  id: string;
  status: string;
  confirmationUrl: string | null;
  dev: boolean;
}

export interface CreatePaymentInput {
  deviceId: string;
  method: 'yookassa_card' | 'sbp' | 'manual_transfer';
}

export async function createYookassaPayment({ deviceId, method }: CreatePaymentInput): Promise<CreatedPayment> {
  if (!yookassaConfigured()) {
    // dev-режим: платёж «успешен» сразу, подписка активируется через entitlement API
    return { id: `dev-${Date.now()}`, status: 'succeeded', confirmationUrl: null, dev: true };
  }

  const priceRub = envInt('PRICE_RUB', 150);
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  const methodName = method === 'yookassa_card' ? 'Банковская карта' : method === 'sbp' ? 'СБП' : 'Перевод по реквизитам';

  const body = {
    amount: { value: String(priceRub), currency: 'RUB' },
    capture: true,
    description: `Забота+ — подписка на месяц (${methodName})`,
    metadata: { deviceId, paymentMethod: method },
    confirmation: {
      type: 'redirect',
      return_url: `${baseUrl}/?payment=success`,
    },
  };

  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64')}`,
      'Idempotence-Key': `zabota-${deviceId}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`YooKassa create payment failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    confirmation?: { confirmation_url?: string };
  };

  return {
    id: data.id,
    status: data.status,
    confirmationUrl: data.confirmation?.confirmation_url ?? null,
    dev: false,
  };
}

/**
 * Проверка вебхука YooKassa.
 * Полноценная проверка подписи требует настройки вебхука с секретом в кабинете.
 * Здесь: если задан YOOKASSA_WEBHOOK_SECRET — сверяем заголовок X-YooKassa-Signature
 * (HMAC-SHA256 от raw body + secret, base64) — упрощённая, но практичная схема.
 * Если секрет не задан — dev-режим: принимаем все события.
 */
export function verifyWebhook(rawBody: string, signature: string | null): boolean {
  if (!process.env.YOOKASSA_WEBHOOK_SECRET) return true; // dev-режим
  if (!signature) return false;
  try {
    const hmac = createHmacSha256(rawBody, process.env.YOOKASSA_WEBHOOK_SECRET);
    return timingSafeEqualStr(hmac, signature);
  } catch {
    return false;
  }
}

function createHmacSha256(body: string, key: string): string {
  return createHmac('sha256', key).update(body, 'utf8').digest('base64');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}