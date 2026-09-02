'use client';

import { useSyncExternalStore } from 'react';
import { get, set, del } from 'idb-keyval';

const STORAGE_PREFIX = 'zabotapsy_';

/**
 * Реестр hydration-состояний persist-сторов.
 *
 * Zustand persist с асинхронным storage (IndexedDB через idb-keyval)
 * заполняет стор после монтирования. До этого данные пустые — UI должен
 * показывать скелетон, а не ложное «нет записей».
 *
 * Каждый стор регистрируется через `registerHydration(store)` в своём
 * модуле и подписывается на штатные `persist.onFinishHydration()` / `hasHydrated()`.
 * Хук `useHydrated(name)` читает snapshot из реестра — без polling.
 *
 * Старая реализация (localStorage флаг + setInterval) давала бесконечный
 * скелетон, если `onRehydrateStorage` не вызывался: например, при ошибке
 * чтения IndexedDB или при первом запуске без данных на некоторых версиях
 * idb-keyval. Штатный API `persist.hasHydrated()` всегда даёт ответ.
 */
type HydrationListener = () => void;

const hydrationRegistry = new Map<string, boolean>();
const hydrationListeners = new Set<HydrationListener>();

function notify(): void {
  for (const l of hydrationListeners) l();
}

function setHydratedFlag(name: string): void {
  if (hydrationRegistry.get(name)) return;
  hydrationRegistry.set(name, true);
  notify();
}

interface PersistLike {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: (state: unknown) => void) => () => void;
  };
}

/**
 * Регистрирует persist-стор в реестре hydration.
 * Если hydration уже произошёл — отметит сразу. Иначе подпишется на onFinishHydration.
 * Безопасно вызывать многократно (повторно не подписывается).
 */
export function registerHydration(store: PersistLike, name: string): void {
  if (hydrationRegistry.get(name)) return;
  if (store.persist.hasHydrated()) {
    setHydratedFlag(name);
    return;
  }
  const unsub = store.persist.onFinishHydration(() => {
    setHydratedFlag(name);
    unsub();
  });
  // Safety-net на случай, если hydration так и не наступит (ошибка IDB и т.п.).
  applyHydrationTimeout(name);
}

function subscribe(listener: HydrationListener): () => void {
  hydrationListeners.add(listener);
  return () => {
    hydrationListeners.delete(listener);
  };
}

function getSnapshot(): Map<string, boolean> {
  return hydrationRegistry;
}

/**
 * Safety-net: зарегистрированные имена, которые так и не получили hydration
 * за разумное время (например, ошибка чтения IndexedDB), всё равно считаются
 * hydrated — иначе UI навсегда застрянет в скелетоне. Лучше показать пусто,
 * чем крутить спиннер бесконечно.
 */
const HYDRATION_TIMEOUT_MS = 2500;

function applyHydrationTimeout(name: string): void {
  setTimeout(() => {
    if (!hydrationRegistry.get(name)) {
      hydrationRegistry.set(name, true);
      notify();
    }
  }, HYDRATION_TIMEOUT_MS);
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
  };
}

/**
 * Проверяет, восстановлен ли persist-стор из IndexedDB.
 * Пока hydrated === false, UI показывает скелетон вместо «пусто».
 */
export function useHydrated(storeName: string): boolean {
  const map = useSyncExternalStore(subscribe, getSnapshot, () => new Map());
  return map.get(storeName) === true;
}

/**
 * Для редких случаев, когда нужно дождаться hydration всех сторов
 * (например, в e2e/тестах или при первом рендере).
 */
export function useHydratedMap(): ReadonlyMap<string, boolean> {
  return useSyncExternalStore(subscribe, getSnapshot, () => new Map());
}
