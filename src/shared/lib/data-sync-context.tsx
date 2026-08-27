'use client';

import { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { get, set, keys } from 'idb-keyval';
import { useQueryClient } from '@tanstack/react-query';

interface DataSyncContextValue {
  /** Синхронизировать данные при входе (мердж локальных и серверных) */
  syncOnLogin: () => Promise<void>;
  /** Отправить локальные изменения на сервер */
  pushToLocal: () => Promise<void>;
  /** Получить все локальные ключи */
  getLocalKeys: () => Promise<string[]>;
}

const DataSyncContext = createContext<DataSyncContextValue | null>(null);

/**
 * Провайдер синхронизации данных.
 * - Работает всегда (даже без авторизации)
 * - При авторизации делает мерж: локальные данные + серверные данные
 * - Сохраняет локальные данные как приоритетные, но добавляет отсутствующие с сервера
 */
export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /** Получить все ключи из IndexedDB (без префикса) */
  const getLocalKeys = useCallback(async (): Promise<string[]> => {
    try {
      const prefix = 'zabotapsy_';
      const allKeys = (await keys<string>()) as string[];
      return allKeys
        .filter((k) => typeof k === 'string' && k.startsWith(prefix))
        .map((k) => k.slice(prefix.length));
    } catch {
      return [];
    }
  }, []);

  /** Мердж данных: локальные данные + серверные данные */
  const mergeData = useCallback(async (serverData: Record<string, unknown>) => {
    const prefix = 'zabotapsy_';
    const localKeys = await getLocalKeys();

    // Добавляем серверные данные, которых нет локально
    for (const [key, value] of Object.entries(serverData)) {
      const hasLocal = localKeys.includes(key);
      if (!hasLocal) {
        // Нет локальных данных — берём с сервера
        await set(prefix + key, value);
      }
      // Если есть локальные — оставляем их (приоритет локальным)
    }

    // Обновляем QueryClient
    queryClient.invalidateQueries();
  }, [getLocalKeys, queryClient]);

  /** Синхронизация при входе: мерж серверных + пуш недостающих локальных */
  const syncOnLogin = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Получаем серверные данные
      const res = await fetch('/api/data/sync', {
        method: 'GET',
        credentials: 'include',
      });

      const serverData: Record<string, unknown> = res.ok
        ? (await res.json()).data
        : {};

      // 2. Мерж: добавляем локально то, чего нет
      await mergeData(serverData);

      // 3. Пушим на сервер локальные ключи, которых там ещё нет
      const localKeys = await getLocalKeys();
      const missing = localKeys.filter((key) => !(key in serverData));

      if (missing.length > 0) {
        const items = [];
        for (const key of missing) {
          const value = await get(`zabotapsy_${key}`);
          if (value !== undefined) {
            items.push({
              key,
              value: JSON.stringify(value),
              clientVersion: 1,
              clientUpdated: new Date().toISOString(),
            });
          }
        }

        if (items.length > 0) {
          await fetch('/api/data/sync', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items),
          });
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }, [user, mergeData, getLocalKeys]);

  /** Отправка локальных данных на сервер */
  const pushToLocal = useCallback(async () => {
    if (!user) return;

    try {
      const keys = await getLocalKeys();
      const items = [];

      for (const key of keys) {
        const value = await get(`zabotapsy_${key}`);
        if (value !== undefined) {
          items.push({
            key,
            value: JSON.stringify(value),
            clientVersion: 1,
            clientUpdated: new Date().toISOString(),
          });
        }
      }

      if (items.length > 0) {
        await fetch('/api/data/sync', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items),
        });
      }
    } catch (err) {
      console.error('Push failed:', err);
    }
  }, [user, getLocalKeys]);

  // При входе — делаем мерж
  useEffect(() => {
    if (user) {
      syncOnLogin();
    }
  }, [user, syncOnLogin]);

  return (
    <DataSyncContext.Provider value={{ syncOnLogin, pushToLocal, getLocalKeys }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync(): DataSyncContextValue {
  const ctx = useContext(DataSyncContext);
  if (!ctx) throw new Error('useDataSync must be used within DataSyncProvider');
  return ctx;
}
