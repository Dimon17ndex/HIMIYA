// sw.js — лежит в корне сайта
// Логика: страницы НЕ кэшируются, при отсутствии сети → только offline.html

const CACHE_NAME = 'chemistry-offline-v1';
const OFFLINE_URL = './offline.html';

// Кэшируем ТОЛЬКО страницу ошибки
const PRECACHE_URLS = [
  './offline.html'
];

// ============================================================
// УСТАНОВКА — сохраняем только offline.html
// ============================================================
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('Не закэшировано:', url, err))
        )
      )
    )
  );
});

// ============================================================
// АКТИВАЦИЯ — удаляем все старые кэши
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
// ПЕРЕХВАТ ЗАПРОСОВ
// ============================================================
self.addEventListener('fetch', event => {
  const req = event.request;

  // Только GET
  if (req.method !== 'GET') return;

  // 🌐 Переход по страницам (index, about, molecules и т.д.):
  //    - Сеть → отдаём страницу как обычно.
  //    - Сети нет → отдаём offline.html (НЕ кэшированную страницу).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 🟡 Прочие ресурсы (CSS, JS, картинки):
  //    сначала кэш, если нет — сеть. HTML-страницы сюда не попадают,
  //    потому что они идут с mode === 'navigate'.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
