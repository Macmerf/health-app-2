'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';

/**
 * Чек-ин тревоги вокруг быстрых практик (SUDS 0–100).
 *
 * Сценарий: пользователь отмечает уровень тревоги ДО практики на главной,
 * после возвращения приложение мягко просит отметить уровень ПОСЛЕ и
 * показывает дельту — самое сильное подкрепление ценности практик.
 *
 * Важно: отметка опциональна и никогда не блокирует доступ к практике —
 * SOS-доступ должен оставаться бесфрикционным.
 */
export type PracticeRoute = 'breathing' | 'grounding' | 'care-plan';

export interface PendingCheckIn {
  /** Уровень тревоги до практики (0–100). */
  sudsBefore: number;
  /** ISO-момент старта практики — для «созревания» карточки после-чек-ина. */
  startedAt: string;
  practice: PracticeRoute;
}

/** Сколько ждать до показа карточки «отметь тревогу после» (2 минуты). */
export const POST_CHECK_MIN_AGE_MS = 2 * 60 * 1000;
/** Сколько живёт pending-чек-ин (24 часа), после чего считается протухшим. */
export const POST_CHECK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface SudsCheckInStore {
  pending: PendingCheckIn | null;
  startCheckIn: (sudsBefore: number, practice: PracticeRoute) => void;
  clearPending: () => void;
}

export const useSudsCheckInStore = create<SudsCheckInStore>()(
  persist(
    (set) => ({
      pending: null,
      startCheckIn: (sudsBefore, practice) =>
        set({ pending: { sudsBefore, practice, startedAt: new Date().toISOString() } }),
      clearPending: () => set({ pending: null }),
    }),
    {
      name: 'zabotapsy-suds-checkin',
      storage: createJSONStorage(() =>
        createPersistConfig('zabotapsy-suds-checkin').storage,
      ),
      partialize: (state) => ({ pending: state.pending }),
    },
  ),
);

/**
 * Ежедневный мягкий чек-ин настроения (retention-петля).
 * Хранит только дату последнего отклонения — чтобы не спрашивать
 * чаще одного раза в день, даже если пользователь не отметил настроение.
 */
interface MoodNudgeStore {
  lastDismissedDate: string | null;
  dismissMoodNudge: (date: string) => void;
}

export const useMoodNudgeStore = create<MoodNudgeStore>()(
  persist(
    (set) => ({
      lastDismissedDate: null,
      dismissMoodNudge: (date) => set({ lastDismissedDate: date }),
    }),
    {
      name: 'zabotapsy-mood-nudge',
      storage: createJSONStorage(() =>
        createPersistConfig('zabotapsy-mood-nudge').storage,
      ),
      partialize: (state) => ({ lastDismissedDate: state.lastDismissedDate }),
    },
  ),
);