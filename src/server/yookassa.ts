import { createHmac, timingSafeEqual } from 'node:crypto';
import { PLANS, type SubscriptionPlan } from './entitlement-logic';

/**
 * Минимальная серверная интеграция с YooKassa (https://yookassa.ru/developers).
 * Используется только если заданы YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.
 * Без них работает dev-режим: платёж считается успешным сразу (для локального теста флоу).
 */

const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';
export function yookassaConfigured(): boolean {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

/** Требуются ли ключи ЮKassa (в production — обязательно). */
export function requireYookassaConfigured(): void {
  if (process.env.NODE_ENV === 'production' && !yookassaConfigured()) {
    throw new Error('YooKassa is not configured: set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY');
  }
}

export interface CreatedPayment {
  id: string;
  status: string;
  /** Токен для инициализации виджета ЮKassa (confirmation.type=embedded). */
  confirmationToken: string | null;
  dev: boolean;
}

export interface CreatePaymentInput {
  /** Идентификатор плательщика (user_id). Кладётся в metadata платежа —
   *  вебхук и проверка статуса сверяют его с сессией. */
  userId: string;
  method?: 'yookassa_card' | 'sbp' | 'manual_transfer' | 'widget';
  /** Тарифный план: месяц / год / навсегда. */
  plan?: SubscriptionPlan;
}

export async function createYookassaPayment({ userId, method, plan = 'month' }: CreatePaymentInput): Promise<CreatedPayment> {
  if (!yookassaConfigured()) {
    // dev-режим: платёж «успешен» сразу, подписка активируется через entitlement API.
    // В production ключи обязательны — dev-активация без оплаты недопустима.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('YooKassa is not configured: set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY');
    }
    return { id: `dev-${Date.now()}`, status: 'succeeded', confirmationToken: null, dev: true };
  }

  const config = PLANS[plan];
  const methodName = method === 'sbp' ? 'СБП' : method === 'manual_transfer' ? 'Перевод по реквизитам' : 'Виджет ЮKassa';

  const body = {
    amount: { value: String(config.priceRub), currency: 'RUB' },
    capture: true,
    description: `ЗаботаPsy+ — подписка (${config.title}, ${methodName})`,
    metadata: { userId, paymentMethod: method ?? 'widget', plan },
    confirmation: {
      // embedded — оплата через виджет на нашей странице (без редиректа на ЮKassa)
      type: 'embedded',
    },
  };

  const res = await fetch(`${YOOKASSA_API}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64')}`,
      'Idempotence-Key': `zabotapsy-${userId}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // 401 invalid_credentials — ключи от шлюза выплат (gateId) вместо магазина (shopId),
    // либо неверный секретный ключ. Даём понятную подсказку вместо сырой ошибки.
    if (res.status === 401) {
      throw new Error(
        'YooKassa отклонила ключи (401). Убедитесь, что YOOKASSA_SHOP_ID — это shopId магазина (не gateId шлюза выплат), а YOOKASSA_SECRET_KEY — секретный ключ из раздела «Интеграция — Ключи API» этого магазина.',
      );
    }
    throw new Error(`YooKassa create payment failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    confirmation?: { confirmation_token?: string };
  };

  return {
    id: data.id,
    status: data.status,
    confirmationToken: data.confirmation?.confirmation_token ?? null,
    dev: false,
  };
}

export interface PaymentInfo {
  id: string;
  status: string;
  paid: boolean;
  metadata?: Record<string, string>;
}

/** Получить информацию о платеже у ЮKassa (для проверки статуса после оплаты виджетом). */
export async function getPaymentInfo(paymentId: string): Promise<PaymentInfo> {
  const res = await fetch(`${YOOKASSA_API}/${paymentId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64')}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`YooKassa get payment failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as PaymentInfo;
  return data;
}

/**
 * Проверка вебхука YooKassa.
 * Если задан YOOKASSA_WEBHOOK_SECRET — сверяем заголовок X-YooKassa-Signature
 * (HMAC-SHA256 от raw body + secret, base64) — упрощённая, но практичная схема.
 * Fail-closed в production: без секрета вебхуки отклоняются, иначе кто угодно
 * мог бы POST'ом активировать подписку. Dev-режим (без секрета) — только локально.
 */
export function verifyWebhook(rawBody: string, signature: string | null): boolean {
  if (!process.env.YOOKASSA_WEBHOOK_SECRET) {
    return process.env.NODE_ENV !== 'production'; // dev-режим только вне прода
  }
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