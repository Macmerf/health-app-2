/**
 * Утилиты для локальных уведомлений через Notification API.
 * Без web-push, только браузерные уведомления.
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * Проверяет текущий статус разрешения уведомлений.
 */
export function checkNotificationPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission as NotificationPermission;
}

/**
 * Запрашивает разрешение на уведомления у пользователя.
 * Возвращает true, если разрешение получено.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;

  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Планирует показ локального уведомления через указанную задержку.
 * Работает только при наличии разрешения 'granted'.
 */
export async function scheduleNotification(
  title: string,
  body: string,
  delayMs: number,
): Promise<void> {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `zabota-${Date.now()}`,
        });
      } catch {
        // Notification API не поддерживается или заблокирован
      }
      resolve();
    }, delayMs);
  });
}
