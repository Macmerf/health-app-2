'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Обнаружение и применение обновлений PWA.
 *
 * Как это работает:
 * 1. Браузер periodically проверяет /sw.js. Если байты изменились (новая версия
 *    CACHE_NAME после деплоя) — новый SW устанавливается и переходит в waiting.
 * 2. Этот хук ловит событие `updatefound` + смену `state` на "installed" =>
 *    показывает баннер «Доступна новая версия» (updateReady = true).
 * 3. Пользователь нажимает «Обновить» => шлём SKIP_WAITING в SW,
 *    ждём controllerchange и перезагружаем страницу — свежая версия загружена.
 * 4. Проверка также запускается при возврате на вкладку и раз в час.
 */
export function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // в dev SW отключён

    const onControllerChange = () => {
      // Новый SW взял управление — перезагружаем, чтобы все вкладки работали
      // с новой версией бандла.
      window.location.reload();
    };

    const trackInstalling = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          // Есть предыдущий SW => это именно обновление, а не первая установка.
          waitingRef.current = worker;
          setUpdateReady(true);
        }
      });
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Если SW уже ждёт (например, вкладка открыта давно)
        if (reg.waiting) {
          waitingRef.current = reg.waiting;
          setUpdateReady(true);
        }
        // Новое обновление пришло при открытой вкладке
        reg.addEventListener('updatefound', () => trackInstalling(reg.installing));
        // Проверка обновлений при возврате на вкладку
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });
        // И раз в час на всякий случай
        const interval = setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        window.addEventListener('pagehide', () => clearInterval(interval), { once: true });
      })
      .catch(() => {
        // Ошибка регистрации SW не критична — приложение работает и без него
      });

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const waiting = waitingRef.current ?? navigator.serviceWorker?.controller;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      // controllerchange (навешан в effect) перезагрузит страницу
    } else {
      // SW не найден — просто перезагружаем
      window.location.reload();
    }
  }, []);

  return { updateReady, applyUpdate };
}
