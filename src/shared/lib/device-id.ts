'use client';

const STORAGE_KEY = 'zabotapsy-device-id';

let cached: string | null = null;

/**
 * Идентификатор устройства — анонимный, генерируется локально и хранится в localStorage.
 * Используется как ключ подписки на сервере (без аккаунтов/паролей).
 */
export function getDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  if (cached) return cached;

  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    cached = id;
    return id;
  } catch {
    return null;
  }
}
