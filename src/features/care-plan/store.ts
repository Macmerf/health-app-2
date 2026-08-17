'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from '@/shared/lib/storage';

interface CarePlanStore {
  fatigueSigns: string;
  whatHelps: string;
  contacts: string;
  safePlaces: string;
  selfTalk: string;
  triggers: string;
  updateField: (
    field: keyof Pick<CarePlanStore, 'fatigueSigns' | 'whatHelps' | 'contacts' | 'safePlaces' | 'selfTalk' | 'triggers'>,
    value: string,
  ) => void;
}

export const useCarePlanStore = create<CarePlanStore>()(
  persist(
    (set) => ({
      fatigueSigns: '',
      whatHelps: '',
      contacts: '',
      safePlaces: '',
      selfTalk: '',
      triggers: '',

      updateField: (field, value) => {
        set({ [field]: value });
      },
    }),
    {
      name: 'zabota-careplan',
      storage: createJSONStorage(() =>
        createPersistConfig('zabota-careplan').storage,
      ),
      partialize: (state) => ({
        fatigueSigns: state.fatigueSigns,
        whatHelps: state.whatHelps,
        contacts: state.contacts,
        safePlaces: state.safePlaces,
        selfTalk: state.selfTalk,
        triggers: state.triggers,
      }),
    },
  ),
);
