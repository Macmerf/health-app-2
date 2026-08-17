'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';
import { achievements } from './data/achievements';
import type { Achievement } from '@/shared/schemas';

interface GamificationStore {
  unlockedIds: string[];
  /** Карта id → ISO datetime разблокировки */
  unlockedDates: Record<string, string>;
  /** Счётчики действий по ключам условий */
  actions: Record<string, number>;
  unlockAchievement: (id: string) => void;
  recordAction: (condition: string, count?: number) => void;
  isUnlocked: (id: string) => boolean;
  /** Возвращает все 18 достижений с проставленным unlockedAt для разблокированных */
  getAllAchievements: () => Achievement[];
}

function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([50, 30, 50]);
    } catch {
      // Vibration API не поддерживается
    }
  }
}

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      unlockedIds: [],
      unlockedDates: {},
      actions: {},

      unlockAchievement: (id) => {
        const { unlockedIds } = get();
        if (unlockedIds.includes(id)) return;

        const now = new Date().toISOString();
        set({
          unlockedIds: [...unlockedIds, id],
          unlockedDates: { ...get().unlockedDates, [id]: now },
        });
        vibrate();
      },

      recordAction: (condition, count) => {
        set((state) => {
          const current = state.actions[condition] ?? 0;
          const next = count ?? current + 1;
          return {
            actions: { ...state.actions, [condition]: next },
          };
        });
      },

      isUnlocked: (id) => {
        return get().unlockedIds.includes(id);
      },

      getAllAchievements: () => {
        const { unlockedIds, unlockedDates } = get();
        return achievements.map((a) => {
          const isUnlocked = unlockedIds.includes(a.id);
          return {
            ...a,
            unlockedAt: isUnlocked ? unlockedDates[a.id] : undefined,
          } as Achievement;
        });
      },
    }),
    {
      name: 'zabota-achievements',
      storage: createJSONStorage(() =>
        createPersistConfig('zabota-achievements').storage,
      ),
      partialize: (state) => ({
        unlockedIds: state.unlockedIds,
        unlockedDates: state.unlockedDates,
        actions: state.actions,
      }),
    },
  ),
);
