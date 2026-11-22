/*
 * Service worker Verbs First: приложение открывается и без сети.
 * - Страницы, скрипты, стили, манифест озвучки — сначала сеть, без сети — из кэша
 *   (имена main.js/main.css без хэша, поэтому кэш только на случай офлайна). В сеть — мимо HTTP-кэша
 *   браузера (cache: 'no-cache' — сверка по ETag), иначе GitHub Pages до 10 минут отдаёт старые файлы.
 * - version.json (номер сборки, src/app/update.ts) — только из сети.
 * - mp3 озвучки — сначала кэш: имя файла — хэш текста, файл не меняется.
 * - Шрифт с Google Fonts — тоже кэшируется, чтобы заголовки офлайн не падали на запасной шрифт.
 */
const VERSION = 'v2';
const CACHE = `verbs-first-${VERSION}`;
const SCOPE = new URL(self.registration.scope);
const SHELL = new URL('index.html', SCOPE).href;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('verbs-first-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE);
  try {
    // Страницу (mode: navigate) с параметрами не перезапросить — запрашиваем её адрес заново.
    const response = await (request.mode === 'navigate' ? fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(request, { cache: 'no-cache' }));
    // GitHub Pages отдаёт страницы уроков как 404.html со статусом 404 — это всё равно наше приложение.
    if (response.ok || (request.mode === 'navigate' && response.status === 404)) {
      cache.put(fallbackKey ?? request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(fallbackKey ?? request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.href.startsWith(SCOPE.href)) {
    // Любая страница приложения — одна и та же оболочка (SPA).
    event.respondWith(networkFirst(request, SHELL));
    return;
  }
  if (isFont(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (!url.href.startsWith(SCOPE.href)) return;
  if (url.pathname.endsWith('/version.json')) return;
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});
