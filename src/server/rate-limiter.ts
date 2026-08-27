/**
 * Rate limiter для API endpoints.
 * Ограничивает количество запросов с одного IP за определённый период.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store для rate limiting (в продакшене лучше использовать Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const MAX_REQUESTS = 20; // максимум запросов за окно

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    // Новое окно
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false; // Лимит исчерпан
  }

  entry.count++;
  return true;
}

/** Получить заголовки для ответа при превышении лимита */
export function getRateLimitHeaders(ip: string): Record<string, string> {
  const entry = rateLimitStore.get(ip);
  const resetAt = entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 900;

  return {
    'X-RateLimit-Limit': String(MAX_REQUESTS),
    'X-RateLimit-Remaining': String(Math.max(0, MAX_REQUESTS - (entry?.count ?? 0))),
    'X-RateLimit-Reset': String(resetAt),
    'Retry-After': String(resetAt),
  };
}

/** Очистка старых записей (запускать periodically) */
export function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}

// Очищаем старые записи каждые 5 минут
setInterval(cleanupRateLimit, 5 * 60 * 1000);
