import { getSubscription, upsertSubscription } from './db';
import {
  FOREVER_EXPIRES_AT,
  isExpiredBeyondGrace,
  isSubscriptionPlan,
  PLANS,
  rowToEntitlement,
  subscriptionExpiry,
  trialExpiry,
  type ServerEntitlement,
  type SubscriptionPlan,
} from './entitlement-logic';

export * from './entitlement-logic';

/**
 * Серверное состояние подписки для пользователя (по user_id из сессии).
 * Подписки привязаны к аккаунтам — client-side deviceId больше не источник истины.
 */
export function getServerEntitlement(userId: string): ServerEntitlement {
  const row = getSubscription(userId);

  if (!row || row.tier !== 'premium') {
    return rowToEntitlement(row);
  }

  const now = Date.now();
  const ent: ServerEntitlement = {
    tier: 'premium',
    expiresAt: row.expires_at,
    trialStartedAt: row.trial_started_at,
    trialUsed: Boolean(row.trial_started_at),
  };

  // Просрочено за грейс-период — автоматически возвращаем на free.
  if (isExpiredBeyondGrace(ent, now)) {
    upsertSubscription({
      user_id: userId,
      tier: 'free',
      trial_started_at: row.trial_started_at,
      expires_at: null,
      payment_method: row.payment_method,
      updated_at: new Date(now).toISOString(),
    });
    return { tier: 'free', expiresAt: null, trialStartedAt: row.trial_started_at, trialUsed: Boolean(row.trial_started_at) };
  }

  return ent;
}

/** Старт триала: только один раз на аккаунт. */
export function startTrialForUser(userId: string): ServerEntitlement {
  const existing = getSubscription(userId);
  if (existing?.trial_started_at) {
    // Триал уже был — вернуть текущее состояние, не давать второй.
    return getServerEntitlement(userId);
  }

  const now = new Date().toISOString();
  const expiresAt = trialExpiry(Date.now());
  upsertSubscription({
    user_id: userId,
    tier: 'premium',
    trial_started_at: now,
    expires_at: expiresAt,
    payment_method: 'trial',
    updated_at: now,
  });
  return { tier: 'premium', expiresAt, trialStartedAt: now, trialUsed: true };
}

/**
 * Активация подписки после успешной оплаты.
 * Дни добавляются к текущему сроку, если подписка ещё активна (продление).
 * План «forever» устанавливает бессрочную подписку.
 */
export function activateSubscription(userId: string, method: string, plan: SubscriptionPlan = 'month'): ServerEntitlement {
  const now = new Date().toISOString();
  const existing = getSubscription(userId);

  // Дата истечения: для активной подписки — продление, для «навсегда» — бессрочно.
  const expiresAt =
    plan === 'forever'
      ? FOREVER_EXPIRES_AT
      : subscriptionExpiry(Date.now(), plan, existing?.expires_at);

  upsertSubscription({
    user_id: userId,
    tier: 'premium',
    trial_started_at: existing?.trial_started_at ?? null,
    expires_at: expiresAt,
    payment_method: method,
    updated_at: now,
  });
  return { tier: 'premium', expiresAt, trialStartedAt: existing?.trial_started_at ?? null, trialUsed: Boolean(existing?.trial_started_at) };
}

/**
 * Активация подписки после успешной оплаты с защитой от двойной активации.
 * Если этот платёж уже активировал подписку — просто возвращаем текущее состояние,
 * не продлевая срок повторно.
 */
export function activateSubscriptionForPayment(
  userId: string,
  method: string,
  paymentId: string,
  plan: SubscriptionPlan = 'month',
): ServerEntitlement {
  const existing = getSubscription(userId);

  // Этот платёж уже был обработан — не продлеваем подписку повторно.
  if (existing?.last_payment_id === paymentId) {
    return getServerEntitlement(userId);
  }

  const entitlement = activateSubscription(userId, method, plan);
  upsertSubscription({
    user_id: userId,
    tier: 'premium',
    trial_started_at: existing?.trial_started_at ?? null,
    expires_at: entitlement.expiresAt ?? null,
    payment_method: method,
    updated_at: new Date().toISOString(),
    last_payment_id: paymentId,
  });
  return entitlement;
}

/** Нормализация плана из метаданных платежа. */
export function planFromMetadata(value: string | undefined): SubscriptionPlan {
  return value && isSubscriptionPlan(value) ? value : 'month';
}

/** Публичное описание тарифов для клиента. */
export function plansForClient() {
  return (Object.keys(PLANS) as SubscriptionPlan[]).map((id) => ({
    id,
    title: PLANS[id].title,
    priceRub: PLANS[id].priceRub,
  }));
}
