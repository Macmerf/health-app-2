/**
 * Чистая бизнес-логика подписки — без побочных эффектов и БД.
 * Отдельный модуль, чтобы unit-тесты не тянули node:sqlite.
 */
import type { SubscriptionRow } from './db';

export const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 дня льготного периода

export interface ServerEntitlement {
  tier: 'free' | 'premium';
  expiresAt: string | null;
  trialStartedAt: string | null;
  trialUsed: boolean;
}

export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isPremiumActive(ent: ServerEntitlement, now = Date.now()): boolean {
  if (ent.tier !== 'premium' || !ent.expiresAt) return false;
  const expiresAt = new Date(ent.expiresAt).getTime();
  return now <= expiresAt + GRACE_PERIOD_MS;
}

export function isExpiredBeyondGrace(ent: ServerEntitlement, now = Date.now()): boolean {
  if (!ent.expiresAt) return true;
  return now > new Date(ent.expiresAt).getTime() + GRACE_PERIOD_MS;
}

export function trialExpiry(now = Date.now()): string {
  const days = envInt('TRIAL_DAYS', 7);
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

export function subscriptionExpiry(now = Date.now()): string {
  const days = envInt('SUBSCRIPTION_DAYS', 30);
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Преобразование строки БД в публичный вид для клиента. */
export function rowToEntitlement(row: SubscriptionRow | null): ServerEntitlement {
  if (!row) return { tier: 'free', expiresAt: null, trialStartedAt: null, trialUsed: false };
  return {
    tier: row.tier,
    expiresAt: row.expires_at,
    trialStartedAt: row.trial_started_at,
    trialUsed: Boolean(row.trial_started_at),
  };
}