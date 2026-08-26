import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistConfig } from './storage';
import type { AppRoute } from './router';
import type { ThemeId } from '@/shared/schemas';

// ====================
// Router Store
// ====================
interface RouterStore {
  route: AppRoute;
  params: Record<string, string>;
  history: AppRoute[];
  navigate: (route: AppRoute, params?: Record<string, string>) => void;
  back: () => void;
}

export const useRouterStore = create<RouterStore>()(
  persist(
    (set, get) => ({
      route: 'home',
      params: {},
      history: [],
      navigate: (route, params = {}) => {
        const { route: currentRoute, history } = get();
        if (currentRoute !== route) {
          set({ route, params, history: [...history, currentRoute] });
        } else {
          set({ params });
        }
      },
      back: () => {
        const { history } = get();
        if (history.length > 0) {
          const newHistory = [...history];
          const prev = newHistory.pop()!;
          set({ route: prev, params: {}, history: newHistory });
        }
      },
    }),
    {
      name: 'zabotapsy-router',
      storage: createJSONStorage(() => ({
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      })),
      partialize: () => ({}),
    }
  )
);

// ====================
// Theme Store
// ====================
const THEME_CLASSES: Record<ThemeId, string[]> = {
  light: [],
  dark: ['dark'],
  warm: ['theme-warm'],
  forest: ['theme-forest'],
  ocean: ['theme-ocean'],
};

function applyTheme(themeId: ThemeId) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  Object.values(THEME_CLASSES).flat().forEach((cls) => html.classList.remove(cls));
  THEME_CLASSES[themeId].forEach((cls) => html.classList.add(cls));
}

interface ThemeStore {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggleDarkLight: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light' as ThemeId,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleDarkLight: () => {
        const next: ThemeId = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: 'zabotapsy-theme',
      storage: createJSONStorage(() => ({
        getItem: async (key) => localStorage.getItem(key),
        setItem: async (key, value) => localStorage.setItem(key, value),
        removeItem: async (key) => localStorage.removeItem(key),
      })),
    }
  )
);

// ====================
// Mood Store (premium)
// ====================
export interface MoodEntry {
  date: string;
  mood: number;
  note?: string;
  createdAt: string;
}

interface MoodStore {
  entries: MoodEntry[];
  addEntry: (mood: number, note?: string) => void;
  getEntryForDate: (date: string) => MoodEntry | undefined;
  getEntriesForRange: (start: string, end: string) => MoodEntry[];
}

export const useMoodStore = create<MoodStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (mood, note) => {
        const today = new Date().toISOString().split('T')[0];
        const entry: MoodEntry = { date: today, mood, note, createdAt: new Date().toISOString() };
        const entries = get().entries.filter((e) => e.date !== today);
        set({ entries: [...entries, entry] });
      },
      getEntryForDate: (date) => get().entries.find((e) => e.date === date),
      getEntriesForRange: (start, end) =>
        get().entries.filter((e) => e.date >= start && e.date <= end),
    }),
    {
      name: 'zabotapsy-mood',
      storage: createJSONStorage(() => createPersistConfig('zabotapsy-mood').storage),
      partialize: (s) => ({ entries: s.entries }),
    },
  )
);

// ====================
// Care Tree Store (premium)
// ====================
interface CareTreeStore {
  totalPractices: number;
  addPractice: () => void;
  getLevel: () => number;
}

export const useCareTreeStore = create<CareTreeStore>()(
  persist(
    (set, get) => ({
      totalPractices: 0,
      addPractice: () => set({ totalPractices: get().totalPractices + 1 }),
      getLevel: () => {
        const p = get().totalPractices;
        if (p >= 100) return 5;
        if (p >= 50) return 4;
        if (p >= 20) return 3;
        if (p >= 7) return 2;
        if (p >= 2) return 1;
        return 0;
      },
    }),
    {
      name: 'zabotapsy-care-tree',
      storage: createJSONStorage(() => createPersistConfig('zabotapsy-care-tree').storage),
      partialize: (s) => ({ totalPractices: s.totalPractices }),
    },
  )
);
