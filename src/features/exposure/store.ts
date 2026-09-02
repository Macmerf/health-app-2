'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';
import type { ExposureHierarchy, ExposureSession } from '@/shared/schemas';

interface ExposureStore {
  hierarchies: ExposureHierarchy[];
  sessions: ExposureSession[];
  addHierarchy: (h: ExposureHierarchy) => void;
  updateHierarchy: (id: string, updates: Partial<ExposureHierarchy>) => void;
  deleteHierarchy: (id: string) => void;
  addSession: (s: ExposureSession) => void;
  updateSession: (id: string, updates: Partial<ExposureSession>) => void;
}

export const useExposureStore = create<ExposureStore>()(
  persist(
    (set) => ({
      hierarchies: [],
      sessions: [],

      addHierarchy: (h) => {
        set((state) => ({
          hierarchies: [...state.hierarchies, h],
        }));
      },

      updateHierarchy: (id, updates) => {
        set((state) => ({
          hierarchies: state.hierarchies.map((h) =>
            h.id === id
              ? { ...h, ...updates, updatedAt: new Date().toISOString() }
              : h,
          ),
        }));
      },

      deleteHierarchy: (id) => {
        set((state) => ({
          hierarchies: state.hierarchies.filter((h) => h.id !== id),
        }));
      },

      addSession: (s) => {
        set((state) => ({
          sessions: [...state.sessions, s],
        }));
      },

      updateSession: (id, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        }));
      },
    }),
    {
      name: 'zabotapsy-exposure',
      storage: createJSONStorage(() =>
        createPersistConfig('zabotapsy-exposure').storage,
      ),
      partialize: (state) => ({
        hierarchies: state.hierarchies,
        sessions: state.sessions,
      }),
    },
  ),
);

// Регистрация в реестре hydration делается централизованно
// в src/shared/ui/RegisterPersistHydration.tsx.
