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
  /** Побочный эффект: понижает тариф до free, если подписка истекла и льготный период прошёл. */
  refreshEntitlement: () => void;
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

/** Чистая (без побочных эффектов) проверка активного премиума. */
function isPremiumActive(entitlement: UserEntitlement): boolean {
  if (entitlement.tier !== 'premium') return false;
  if (!isExpired(entitlement.expiresAt)) return true;
  return isInGracePeriod(entitlement.expiresAt);
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

      activatePremium: () => {
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

      // Чистая проверка — безопасна для вызова во время рендера.
      checkEntitlement: (key: string) => {
        if (FREE_FEATURES.has(key)) return true;
        return isPremiumActive(get().entitlement);
      },

      // Чистая проверка — безопасна для вызова во время рендера.
      isPremium: () => isPremiumActive(get().entitlement),

      // Побочный эффект понижения вынесен сюда; вызывать в useEffect, не в рендере.
      refreshEntitlement: () => {
        const { entitlement } = get();
        if (entitlement.tier === 'premium' && !isPremiumActive(entitlement)) {
          set({
            entitlement: {
              ...entitlement,
              tier: 'free',
            },
          });
        }
      },
    }),
    {
      name: 'zabota-entitlements',
      storage: createJSONStorage(() => createPersistConfig('zabota-entitlements').storage),
      partialize: (state) => ({ entitlement: state.entitlement }),
    },
  ),
);
