import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from './storage';

interface OnboardingStore {
  tourCompleted: boolean;
  dismissedGuides: string[];
  completeTour: () => void;
  dismissGuide: (guideId: string) => void;
  isGuideDismissed: (guideId: string) => boolean;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      tourCompleted: false,
      dismissedGuides: [],

      completeTour: () => set({ tourCompleted: true }),

      dismissGuide: (guideId: string) => {
        const { dismissedGuides } = get();
        if (!dismissedGuides.includes(guideId)) {
          set({ dismissedGuides: [...dismissedGuides, guideId] });
        }
      },

      isGuideDismissed: (guideId: string) => {
        return get().dismissedGuides.includes(guideId);
      },

      resetOnboarding: () => set({ tourCompleted: false, dismissedGuides: [] }),
    }),
    {
      ...createPersistConfig('onboarding'),
      partialize: (state) => ({
        tourCompleted: state.tourCompleted,
        dismissedGuides: state.dismissedGuides,
      }),
    },
  ),
);
