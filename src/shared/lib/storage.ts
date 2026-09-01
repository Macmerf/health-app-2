'use client';

import { useEffect, useState } from 'react';
import { get, set, del } from 'idb-keyval';

const STORAGE_PREFIX = 'zabotapsy_';

/**
 * Флаги hydration persist-сторов.
 * Zustand persist восстанавливает данные из IndexedDB асинхронно:
 * до этого сторы пустые, и UI показывает «нет записей» — ложное состояние.
 * Хук useHydrated() отслеживает hydration и позволяет показывать скелетон.
 */
const hydrationListeners = new Set<() => void>();

function notifyHydrated(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`zabotapsy-hydrated-${name}`, '1');
  } catch {
    // localStorage недоступен — hydration-флаг не критичен.
  }
  for (const listener of hydrationListeners) listener();
}

export const storage = {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await get<T>(STORAGE_PREFIX + key);
    } catch {
      return undefined;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await set(STORAGE_PREFIX + key, value);
    } catch (e) {
      console.error('Storage write error:', e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await del(STORAGE_PREFIX + key);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  },
};

export function createPersistConfig(name: string) {
  return {
    name,
    storage: {
      getItem: async (key: string): Promise<string | null> => {
        const val = await storage.get<string>(key);
        return val ?? null;
      },
      setItem: async (key: string, value: string): Promise<void> => {
        await storage.set(key, value);
      },
      removeItem: async (key: string): Promise<void> => {
        await storage.remove(key);
      },
    },
    /** После первой успешной загрузки помечаем стор как hydrated. */
    onRehydrateStorage: () => () => notifyHydrated(name),
  };
}

/**
 * Проверяет, восстановлен ли persist-стор из IndexedDB.
 * Пока hydrated === false, UI показывает скелетон вместо «пусто».
 */
export function useHydrated(storeName: string): boolean {
  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(`zabotapsy-hydrated-${storeName}`) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (hydrated) return;
    const flagKey = `zabotapsy-hydrated-${storeName}`;
    const check = () => {
      try {
        if (localStorage.getItem(flagKey) === '1') setHydrated(true);
      } catch {
        setHydrated(true);
      }
    };
    check();
    // Слушаем hydration других сторов: как только нужный — обновляемся.
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, [hydrated, storeName]);

  return hydrated;
}
