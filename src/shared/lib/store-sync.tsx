'use client';

import { useEffect } from 'react';
import { useAuth } from './auth-context';
import { useJournalStore } from '@/features/journal';
import { useExposureStore } from '@/features/exposure';
import { useCarePlanStore } from '@/features/care-plan/store';
import { useMoodStore, useCareTreeStore } from './stores';
import { useGamificationStore } from '@/features/gamification/store';
import { useNotificationSettingsStore } from '@/features/gamification/components/NotificationsScreen';

/**
 * Провайдер-обёртка: активирует движок синхронизации сторов (useStoreSync).
 * Подключается в layout внутри AuthProvider.
 */
export function StoreSyncProvider({ children }: { children: React.ReactNode }) {
  useStoreSync();
  return <>{children}</>;
}

/**
 * Единый движок синхронизации сторов с сервером.
 *
 * Как работает:
 *  - Все пользовательские persist-сторы регистрируются в SYNC_STORES.
 *  - При логине: pull с сервера. Для каждого ключа побеждает более свежая
 *    версия (LWW по updatedAt; серверные данные без локальных дописываются).
 *  - При любом изменении стора: debounce 3 c → push на сервер.
 *  - Ключ серверного хранилища = имя стора (одна запись = весь стор целиком),
 *    версии хранятся в localStorage (sync-meta) — IndexedDB остаётся
 *    единственным местом данных.
 *
 * Данные компрессируются на сервере (см. src/server/data-store.ts).
 */
// --- Регистрация сторов ---

interface SyncStoreDef {
  /** Ключ на сервере и в meta. */
  key: string;
  /** Значение стора для отправки (без функций). */
  select: () => unknown;
  /** Применить серверные данные к стору. */
  apply: (value: unknown) => void;
}

const SYNC_STORES: SyncStoreDef[] = [
  {
    key: 'journal',
    select: () => useJournalStore.getState().entries,
    apply: (v) => {
      if (Array.isArray(v)) useJournalStore.setState({ entries: v as never });
    },
  },
  {
    key: 'exposure',
    select: () => ({
      hierarchies: useExposureStore.getState().hierarchies,
      sessions: useExposureStore.getState().sessions,
    }),
    apply: (v) => {
      const val = v as { hierarchies?: unknown; sessions?: unknown };
      if (val && typeof val === 'object') {
        useExposureStore.setState({
          hierarchies: Array.isArray(val.hierarchies) ? (val.hierarchies as never) : [],
          sessions: Array.isArray(val.sessions) ? (val.sessions as never) : [],
        });
      }
    },
  },
  {
    key: 'careplan',
    select: () => {
      const s = useCarePlanStore.getState();
      return {
        fatigueSigns: s.fatigueSigns,
        whatHelps: s.whatHelps,
        contacts: s.contacts,
        safePlaces: s.safePlaces,
        selfTalk: s.selfTalk,
        triggers: s.triggers,
      };
    },
    apply: (v) => {
      if (v && typeof v === 'object') useCarePlanStore.setState(v as never);
    },
  },
  {
    key: 'mood',
    select: () => useMoodStore.getState().entries,
    apply: (v) => {
      if (Array.isArray(v)) useMoodStore.setState({ entries: v as never });
    },
  },
  {
    key: 'care-tree',
    select: () => useCareTreeStore.getState().totalPractices,
    apply: (v) => {
      if (typeof v === 'number' && v >= 0) useCareTreeStore.setState({ totalPractices: v });
    },
  },
  {
    key: 'achievements',
    select: () => {
      const s = useGamificationStore.getState();
      return { unlockedIds: s.unlockedIds, unlockedDates: s.unlockedDates };
    },
    apply: (v) => {
      const val = v as { unlockedIds?: unknown; unlockedDates?: unknown };
      if (val && typeof val === 'object') {
        useGamificationStore.setState({
          unlockedIds: Array.isArray(val.unlockedIds) ? (val.unlockedIds as never) : [],
          unlockedDates: val.unlockedDates && typeof val.unlockedDates === 'object' ? (val.unlockedDates as never) : {},
        });
      }
    },
  },
  {
    key: 'notification-settings',
    select: () => {
      const s = useNotificationSettingsStore.getState();
      return {
        enabled: s.enabled,
        reminderTime: s.reminderTime,
        journalReminder: s.journalReminder,
        breathingReminder: s.breathingReminder,
      };
    },
    apply: (v) => {
      if (v && typeof v === 'object') useNotificationSettingsStore.setState(v as never);
    },
  },
];

// --- Meta: версии и время последнего изменения по ключам ---

const META_KEY = 'zabotapsy-sync-meta';

interface KeyMeta {
  version: number;
  updatedAt: string;
}

function loadMeta(): Record<string, KeyMeta> {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, KeyMeta>) : {};
  } catch {
    return {};
  }
}

function saveMeta(meta: Record<string, KeyMeta>): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // localStorage переполнен — синхронизация деградирует, но данные не теряются.
  }
}

function getMeta(key: string): KeyMeta | undefined {
  return loadMeta()[key];
}

function setMeta(key: string, meta: KeyMeta): void {
  const all = loadMeta();
  all[key] = meta;
  saveMeta(all);
}

// --- Sync engine hook ---

const PUSH_DEBOUNCE_MS = 3000;
const PUSH_MAX_WAIT_MS = 30_000;

export function useStoreSync(): void {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user || loading) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
    let pending = new Set<string>();
    let lastPushAt = 0;
    let syncing = false;

    const doPush = async () => {
      if (syncing || cancelled || pending.size === 0) return;
      syncing = true;
      const keys = Array.from(pending);
      pending = new Set();

      try {
        const items = [];
        for (const key of keys) {
          const def = SYNC_STORES.find((s) => s.key === key);
          if (!def) continue;
          const meta = getMeta(key);
          items.push({
            key,
            value: JSON.stringify(def.select()),
            clientVersion: meta?.version ?? 0,
            clientUpdated: meta?.updatedAt ?? new Date().toISOString(),
          });
        }

        const res = await fetch('/api/data/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(items),
        });
        if (!res.ok) throw new Error(`push failed: ${res.status}`);

        const result = (await res.json()) as { inserted: number; updated: number; conflicts: number };
        // Версии на сервере могли уехать вперёд (конфликты LWW) — подтягиваем.
        if (result.conflicts > 0) {
          await doPull();
        } else {
          for (const key of keys) {
            const meta = getMeta(key);
            setMeta(key, {
              version: (meta?.version ?? 0) + 1,
              updatedAt: new Date().toISOString(),
            });
          }
        }
        lastPushAt = Date.now();
      } catch {
        // Ошибка сети — возвращаем ключи в очередь (следующий триггер запушит).
        for (const key of keys) pending.add(key);
      } finally {
        syncing = false;
      }
    };

    const schedulePush = (keys: string[]) => {
      if (!user || cancelled) return;
      for (const key of keys) pending.add(key);

      const sinceLastPush = Date.now() - lastPushAt;
      if (timer) clearTimeout(timer);
      const delay = Math.max(
        0,
        Math.min(PUSH_DEBOUNCE_MS, PUSH_MAX_WAIT_MS - sinceLastPush),
      );
      timer = setTimeout(doPush, delay);

      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      maxWaitTimer = setTimeout(doPush, PUSH_MAX_WAIT_MS);
    };

    const doPull = async () => {
      try {
        const res = await fetch('/api/data/sync', { credentials: 'include' });
        if (!res.ok) return;
        const { data } = (await res.json()) as {
          data: Record<string, { value: unknown; version: number; updatedAt: string }>;
        };

        applyingRemote = true;
        try {
          for (const def of SYNC_STORES) {
            const server = data[def.key];
            if (!server) {
              // Ключа нет на сервере — отправляем локальную копию.
              schedulePush([def.key]);
              continue;
            }

            const localMeta = getMeta(def.key);
            const localUpdatedAt = localMeta?.updatedAt ? new Date(localMeta.updatedAt).getTime() : 0;
            const serverUpdatedAt = new Date(server.updatedAt).getTime();

            if (!localMeta) {
              // Локальных данных никогда не было — просто принимаем серверные.
              def.apply(server.value);
              setMeta(def.key, { version: server.version, updatedAt: server.updatedAt });
              continue;
            }

            // LWW: у кого updatedAt свежее — тот и прав.
            if (serverUpdatedAt > localUpdatedAt) {
              def.apply(server.value);
              setMeta(def.key, { version: server.version, updatedAt: server.updatedAt });
            }
            // Иначе локальное свежее — оставляем как есть (запушится при изменении).
          }
        } finally {
          applyingRemote = false;
        }
      } catch {
        // Офлайн — работаем локально.
      }
    };

    let applyingRemote = false;

    // 1. Первоначальный pull при логине.
    void doPull();

    // 2. Подписка на изменения сторов → debounce-push.
    const unsubscribers = SYNC_STORES.map((def) => {
      const storeApi = getStoreApi(def);
      return storeApi?.subscribe(() => {
        // Не пушим то, что только что применили с сервера (иначе цикл push↔pull).
        if (applyingRemote) return;
        schedulePush([def.key]);
      });
    });

    // 3. Push при возвращении на вкладку/онлайн (догоняем пропущенное).
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pending.size > 0) void doPush();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      for (const unsub of unsubscribers) unsub?.();
    };
  }, [user, loading]);
}

/** Zustand API у сторов единый: subscribe есть у всех. */
function getStoreApi(def: SyncStoreDef): { subscribe: (cb: () => void) => () => void } | null {
  switch (def.key) {
    case 'journal':
      return useJournalStore;
    case 'exposure':
      return useExposureStore;
    case 'careplan':
      return useCarePlanStore;
    case 'mood':
      return useMoodStore;
    case 'care-tree':
      return useCareTreeStore;
    case 'achievements':
      return useGamificationStore;
    case 'notification-settings':
      return useNotificationSettingsStore as never;
    default:
      return null;
  }
}
