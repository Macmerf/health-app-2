'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';
import type { JournalEntry } from '@/shared/schemas';

interface JournalStore {
  entries: JournalEntry[];
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  getEntry: (id: string) => JournalEntry | undefined;
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        set((state) => ({
          entries: [entry, ...state.entries],
        }));
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e,
          ),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      getEntry: (id) => {
        return get().entries.find((e) => e.id === id);
      },
    }),
    {
      name: 'zabota-journal',
      storage: createJSONStorage(() => createPersistConfig('zabota-journal').storage),
      partialize: (state) => ({ entries: state.entries }),
      // Миграция старых записей: patternId/patternName → emotionId/emotionName
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { entries?: JournalEntry[] };
        const entries = (persisted?.entries ?? []).map((entry) => {
          const legacy = entry as JournalEntry & { patternId?: string; patternName?: string };
          if (entry.emotionId || !legacy.patternId) return entry;
          return {
            ...entry,
            emotionId: legacy.patternId,
            emotionName: legacy.patternName,
          };
        });
        return { ...currentState, entries };
      },
    },
  ),
);
