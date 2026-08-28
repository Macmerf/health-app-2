'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';
import type { UserEntitlement } from '@/shared/schemas';

const FREE_FEATURES = new Set([
  'journal',
  'exposure',
  'care-plan',
  'breathing',
  'grounding',
  'basic-achievements',
]);

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 дня

interface PaymentStore {
  entitlement: UserEntitlement;
  checkEntitlement: (key: string) => boolean;
  isPremium: () => boolean;
  /** Побочный эффект: понижает тариф до free, если подписка истекла и льготный период прошёл. */
  refreshEntitlement: () => void;
  /** Синхронизация подписки с сервером (источник истины). Требует авторизацию. */
  syncFromServer: () => Promise<void>;
  /** Старт триала через сервер (только один раз на аккаунт). Требует авторизацию. */
  startTrialServer: () => Promise<boolean>;
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

interface ServerEntitlementPayload {
  tier: 'free' | 'premium';
  expiresAt: string | null;
  trialStartedAt: string | null;
  trialUsed: boolean;
}

function fromServer(data: ServerEntitlementPayload): UserEntitlement {
  return {
    tier: data.tier,
    expiresAt: data.expiresAt ?? undefined,
    trialStartedAt: data.trialStartedAt ?? undefined,
    trialUsed: data.trialUsed,
  };
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

      syncFromServer: async () => {
        try {
          const res = await fetch('/api/entitlement', {
            cache: 'no-store',
            credentials: 'include',
          });
          if (!res.ok) return; // не авторизован — остаёмся на локальном кэше (free)
          const data = (await res.json()) as ServerEntitlementPayload;
          set({ entitlement: fromServer(data) });
        } catch {
          // Офлайн/сеть недоступна — остаёмся на локальном кэше.
        }
      },

      startTrialServer: async () => {
        try {
          const res = await fetch('/api/payments/trial', {
            method: 'POST',
            credentials: 'include',
          });
          if (!res.ok) return false;
          const data = (await res.json()) as ServerEntitlementPayload;
          set({ entitlement: fromServer(data) });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'zabotapsy-entitlements',
      storage: createJSONStorage(() => createPersistConfig('zabotapsy-entitlements').storage),
      partialize: (state) => ({ entitlement: state.entitlement }),
    },
  ),
);
