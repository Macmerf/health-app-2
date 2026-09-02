'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';

/**
 * Быстрая заметка — короткая запись о ситуации или мысли,
 * которую позже можно развернуть в полноценную запись дневника.
 *
 * Сценарий: человек в течение дня ловит тревожную мысль, но не
 * готов сесть за 5-шаговый мастер. Он быстро пишет одно предложение
 * и возвращается к жизни. Вечером открывает список заметок и
 * превращает нужные в записи дневника (кнопка «В дневник» —
 * содержимое заметки подставляется в поле «Ситуация» черновика).
 */
export interface QuickNote {
  id: string;
  text: string;
  emotionId?: string;
  createdAt: string;
  /** Ссылка на запись дневника, если заметка уже превращена в запись. */
  journalEntryId?: string;
}

interface QuickNotesStore {
  notes: QuickNote[];
  addNote: (text: string, emotionId?: string) => void;
  deleteNote: (id: string) => void;
  markConverted: (id: string, journalEntryId: string) => void;
}

export const useQuickNotesStore = create<QuickNotesStore>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (text, emotionId) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const note: QuickNote = {
          id: crypto.randomUUID?.() ?? Date.now().toString(36),
          text: trimmed,
          emotionId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ notes: [note, ...state.notes] }));
      },
      deleteNote: (id) => {
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
      },
      markConverted: (id, journalEntryId) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, journalEntryId } : n,
          ),
        }));
      },
    }),
    {
      name: 'zabotapsy-quick-notes',
      storage: createJSONStorage(() =>
        createPersistConfig('zabotapsy-quick-notes').storage,
      ),
      partialize: (state) => ({ notes: state.notes }),
    },
  ),
);
