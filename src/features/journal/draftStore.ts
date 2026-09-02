'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';

/**
 * Черновик записи дневника.
 *
 * Раньше wizard держал всё в локальных useState — при навигации в
 * дыхание/заземление компонент размонтировался и ответы терялись.
 * Теперь данные хранятся в zustand с persist в IndexedDB, поэтому
 * пользователь может спокойно сходить на практику и вернуться
 * к той же записи с того же шага.
 *
 * После сохранения записи в дневник — вызывается clearDraft().
 */
export interface JournalDraft {
  step: number;
  situation: string;
  thoughts: string;
  selectedEmotionId: string | null;
  selectedPatternId: string | null;
  physical: string;
  sudsBefore: number;
  sudsAfter: number;
  newView: string;
  reflectionAnswers: Record<number, string>;
  /** ISO строка последнего изменения — для UI и отладки. */
  updatedAt: string;
}

export const EMPTY_DRAFT: JournalDraft = {
  step: 0,
  situation: '',
  thoughts: '',
  selectedEmotionId: null,
  selectedPatternId: null,
  physical: '',
  sudsBefore: 50,
  sudsAfter: 50,
  newView: '',
  reflectionAnswers: {},
  updatedAt: '',
};

interface JournalDraftStore {
  draft: JournalDraft;
  patch: (data: Partial<JournalDraft>) => void;
  clearDraft: () => void;
}

export const useJournalDraftStore = create<JournalDraftStore>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT,
      patch: (data) =>
        set((state) => ({
          draft: { ...state.draft, ...data, updatedAt: new Date().toISOString() },
        })),
      clearDraft: () => set({ draft: EMPTY_DRAFT }),
    }),
    {
      name: 'zabotapsy-journal-draft',
      storage: createJSONStorage(() =>
        createPersistConfig('zabotapsy-journal-draft').storage,
      ),
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
);
