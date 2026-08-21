import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRACE_PERIOD_MS,
  isPremiumActive,
  isExpiredBeyondGrace,
  trialExpiry,
  subscriptionExpiry,
  envInt,
} from '../src/server/entitlement-logic.ts';

describe('entitlement logic', () => {
  const now = Date.parse('2026-08-21T10:00:00.000Z');

  it('free tier никогда не считается премиумом', () => {
    assert.equal(
      isPremiumActive({ tier: 'free', expiresAt: null, trialStartedAt: null, trialUsed: false }, now),
      false,
    );
  });

  it('премиум активен до истечения срока', () => {
    const ent = { tier: 'premium' as const, expiresAt: new Date(now + 86_400_000).toISOString(), trialStartedAt: null, trialUsed: false };
    assert.equal(isPremiumActive(ent, now), true);
  });

  it('премиум остаётся активным в течение льготного периода 3 дня', () => {
    const ent = { tier: 'premium' as const, expiresAt: new Date(now - GRACE_PERIOD_MS / 2).toISOString(), trialStartedAt: null, trialUsed: false };
    assert.equal(isPremiumActive(ent, now), true);
  });

  it('премиум отключается после льготного периода', () => {
    const ent = { tier: 'premium' as const, expiresAt: new Date(now - GRACE_PERIOD_MS - 1).toISOString(), trialStartedAt: null, trialUsed: false };
    assert.equal(isPremiumActive(ent, now), false);
    assert.equal(isExpiredBeyondGrace(ent, now), true);
  });

  it('trial длится 7 дней по умолчанию', () => {
    const expiry = Date.parse(trialExpiry(now));
    assert.equal(expiry - now, 7 * 24 * 60 * 60 * 1000);
  });

  it('подписка длится 30 дней по умолчанию', () => {
    const expiry = Date.parse(subscriptionExpiry(now));
    assert.equal(expiry - now, 30 * 24 * 60 * 60 * 1000);
  });

  it('envInt читает положительные числа, фолбэк на невалидные', () => {
    assert.equal(envInt('TRIAL_DAYS', 7), 7); // если не задано — фолбэк
    process.env.TRIAL_DAYS = '14';
    assert.equal(envInt('TRIAL_DAYS', 7), 14);
    process.env.TRIAL_DAYS = 'abc';
    assert.equal(envInt('TRIAL_DAYS', 7), 7);
    delete process.env.TRIAL_DAYS;
  });
});
