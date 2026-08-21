import { getSubscription, upsertSubscription } from './db';
import {
  isExpiredBeyondGrace,
  rowToEntitlement,
  subscriptionExpiry,
  trialExpiry,
  type ServerEntitlement,
} from './entitlement-logic';

export * from './entitlement-logic';

/** Серверное состояние подписки для устройства. */
export function getServerEntitlement(deviceId: string): ServerEntitlement {
  const row = getSubscription(deviceId);

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
      device_id: deviceId,
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

/** Старт триала: только один раз на устройство. */
export function startTrialForDevice(deviceId: string): ServerEntitlement {
  const existing = getSubscription(deviceId);
  if (existing?.trial_started_at) {
    // Триал уже был — вернуть текущее состояние, не давать второй.
    return getServerEntitlement(deviceId);
  }

  const now = new Date().toISOString();
  const expiresAt = trialExpiry(Date.now());
  upsertSubscription({
    device_id: deviceId,
    tier: 'premium',
    trial_started_at: now,
    expires_at: expiresAt,
    payment_method: 'trial',
    updated_at: now,
  });
  return { tier: 'premium', expiresAt, trialStartedAt: now, trialUsed: true };
}

/** Активация подписки после успешной оплаты (30 дней от текущего момента). */
export function activateSubscription(deviceId: string, method: string): ServerEntitlement {
  const now = new Date().toISOString();
  const expiresAt = subscriptionExpiry(Date.now());
  const existing = getSubscription(deviceId);

  upsertSubscription({
    device_id: deviceId,
    tier: 'premium',
    trial_started_at: existing?.trial_started_at ?? null,
    expires_at: expiresAt,
    payment_method: method,
    updated_at: now,
  });
  return { tier: 'premium', expiresAt, trialStartedAt: existing?.trial_started_at ?? null, trialUsed: Boolean(existing?.trial_started_at) };
}
