'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './auth-context';

interface DataItem {
  key: string;
  value: unknown;
  clientVersion: number;
  clientUpdated: string;
}

/**
 * Hook для синхронизации данных клиента с сервером.
 * При изменении данных — пушит на сервер.
 * При загрузке — получает свежие данные.
 */
export function useDataSync() {
  const { user, loading: authLoading } = useAuth();
  const pendingChanges = useRef<Map<string, DataItem>>(new Map());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Отправка изменений на сервер
  const pushChanges = useCallback(async () => {
    if (!user) return;

    const items = Array.from(pendingChanges.current.values());
    if (items.length === 0) return;

    pendingChanges.current.clear();

    try {
      await fetch('/api/data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(items),
      });
    } catch (err) {
      console.error('Sync failed, retrying...', err);
      // Возвращаем изменения обратно для повторной попытки
      for (const item of items) {
        pendingChanges.current.set(item.key, item);
      }
    }
  }, [user]);

  // Загрузка данных с сервера
  const pullData = useCallback(async (): Promise<Record<string, unknown>> => {
    if (!user) return {};

    const res = await fetch('/api/data/sync', {
      credentials: 'include',
    });

    if (!res.ok) return {};

    const { data } = await res.json();
    return data;
  }, [user]);

  // Запланировать push (debounce 1 сек)
  const schedulePush = useCallback(
    (item: DataItem) => {
      pendingChanges.current.set(item.key, item);
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(pushChanges, 1000);
    },
    [pushChanges],
  );

  // При первом входе — загружаем данные с сервера
  useEffect(() => {
    if (user && !authLoading) {
      pullData();
    }
  }, [user, authLoading, pullData]);

  // При разлогине — очищаем
  useEffect(() => {
    if (!user) {
      pendingChanges.current.clear();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    }
  }, [user]);

  return {
    /** Вызвать при изменении данных клиента */
    push: schedulePush,
    /** Вызвать для загрузки данных с сервера */
    pull: pullData,
  };
}
