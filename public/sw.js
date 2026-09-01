const CACHE_NAME = 'zabotapsy-v0.2.1';

/**
 * Версия SW меняется при каждом деплое (см. scripts/sync-sw-version.mjs —
 * подставляет номер сборки из package.json). Иное имя кэша = авто-очистка
 * старого кэша в activate.
 */
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    // ВАЖНО: не вызываем self.skipWaiting() здесь.
    // Новый SW становится "waiting" и активируется только после подтверждения
    // от клиента (кнопка «Обновить» в баннере) — чтобы не обрывать сессию
    // пользователя посреди записи в дневник. При самой первой установке
    // (когда нет предыдущего SW) активация происходит сразу.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => caches.open(CACHE_NAME))
      .then((cache) =>
        // Одноразовая очистка: в старых версиях SW в кэш попадали API-ответы
        // с персональными данными (см. fetch-обработчик выше).
        Promise.all(
          cache.keys().filter((req) => new URL(req.url).pathname.startsWith('/api/'))
            .map((req) => cache.delete(req))
        )
      )
  );
  self.clients.claim();
});

// Команда от клиента: активировать ожидающий SW и перезагрузить страницу.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // API не кэшируем: ответы содержат персональные данные (дневник, entitlement),
  // а актуальность критична. Данные для офлайна и так живут в IndexedDB.
  // Кэш API-ответов также раздувал хранилище и замедлял sync.
  if (url.pathname.startsWith('/api/')) return;

  // Навигация — network-first: после деплоя пользователи сразу видят свежую версию,
  // а офлайн-фолбэк на кэш остаётся для работы без сети.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});