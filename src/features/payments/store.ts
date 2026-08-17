'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';
import type { UserEntitlement, PaymentMethod } from '@/shared/schemas';

const FREE_FEATURES = new Set([
  'journal',
  'exposure',
  'care-plan',
  'breathing',
  'grounding',
  'basic-achievements',
]);

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 дня
const TRIAL_DAYS = 7;
const SUBSCRIPTION_DAYS = 30;

interface PaymentStore {
  entitlement: UserEntitlement;
  startTrial: () => void;
  activatePremium: (method: PaymentMethod) => void;
  checkEntitlement: (key: string) => boolean;
  isPremium: () => boolean;
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
}

function isInGracePeriod(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  const expiredAt = new Date(expiresAt).getTime();
  return Date.now() - expiredAt <= GRACE_PERIOD_MS;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set, get) => ({
      entitlement: {
        tier: 'free',
        expiresAt: undefined,
        trialStartedAt: undefined,
        trialUsed: false,
      },

      startTrial: () => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        set({
          entitlement: {
            tier: 'premium',
            expiresAt: expiresAt.toISOString(),
            trialStartedAt: now.toISOString(),
            trialUsed: true,
          },
        });
      },

      activatePremium: (_method: PaymentMethod) => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
        set({
          entitlement: {
            ...get().entitlement,
            tier: 'premium',
            expiresAt: expiresAt.toISOString(),
          },
        });
      },

      checkEntitlement: (key: string) => {
        // Базовые функции всегда доступны
        if (FREE_FEATURES.has(key)) return true;

        const { entitlement } = get();

        // Если уже free — премимум-функции недоступны
        if (entitlement.tier === 'free') return false;

        // Если премиум активен и не истёк — доступно
        if (!isExpired(entitlement.expiresAt)) return true;

        // Если истёк, но в льготном периоде — пока доступно
        if (isInGracePeriod(entitlement.expiresAt)) return true;

        // Истёк, льготный период прошёл — понижаем до free
        set({
          entitlement: {
            ...entitlement,
            tier: 'free',
          },
        });
        return false;
      },

      isPremium: () => {
        const { entitlement } = get();
        if (entitlement.tier !== 'premium') return false;
        if (!isExpired(entitlement.expiresAt)) return true;
        if (isInGracePeriod(entitlement.expiresAt)) return true;

        // Истёк — понижаем
        set({
          entitlement: {
            ...entitlement,
            tier: 'free',
          },
        });
        return false;
      },
    }),
    {
      name: 'zabota-entitlements',
      storage: createJSONStorage(() => createPersistConfig('zabota-entitlements').storage),
      partialize: (state) => ({ entitlement: state.entitlement }),
    },
  ),
);
