/**
 * Чистая бизнес-логика подписки — без побочных эффектов и БД.
 * Отдельный модуль, чтобы unit-тесты не тянули node:sqlite.
 */
import type { SubscriptionRow } from './db';

export const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 дня льготного периода

/** Дата «навсегда» — подписка без срока истечения. */
export const FOREVER_EXPIRES_AT = '9999-12-31T23:59:59.000Z';

export type SubscriptionPlan = 'month' | 'year' | 'forever';

export interface PlanConfig {
  /** Число дней, добавляемых к подписке. */
  days: number | null;
  /** Цена в рублях. */
  priceRub: number;
  /** Короткое человекочитаемое название. */
  title: string;
}

/** Тарифные планы ЗаботаPsy+. Цены из env с фолбэками. */
export const PLANS: Record<SubscriptionPlan, PlanConfig> = {
  month: { days: envInt('SUBSCRIPTION_DAYS', 30), priceRub: envInt('PRICE_RUB', 150), title: 'Месяц' },
  year: { days: 365, priceRub: envInt('PRICE_YEAR_RUB', 1250), title: 'Год' },
  forever: { days: null, priceRub: envInt('PRICE_FOREVER_RUB', 2700), title: 'Навсегда' },
};

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return value === 'month' || value === 'year' || value === 'forever';
}

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

/**
 * Дата истечения подписки для плана.
 * Если подписка ещё активна — дни добавляются к текущему сроку (продление).
 */
export function subscriptionExpiry(now = Date.now(), plan: SubscriptionPlan = 'month', currentExpiresAt?: string | null): string {
  if (plan === 'forever') return FOREVER_EXPIRES_AT;
  const days = PLANS[plan].days ?? 30;
  // Продление: отсчёт от максимума(now, текущий срок) — дни не сгорают.
  const base = currentExpiresAt ? Math.max(now, new Date(currentExpiresAt).getTime()) : now;
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
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