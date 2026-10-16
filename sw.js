// sw.js — лежит в корне сайта
const CACHE_NAME = 'chemistry-v1';
const OFFLINE_URL = './offline.html';

// Файлы, которые кэшируем при первой установке
const PRECACHE_URLS = [
  './',
  './index.html',
  './about.html',
  './molecules.html',
  './offline.html'
];

// Установка: предварительно кэшируем основные страницы
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

// Активация: удаляем старые кэши (на случай смены CACHE_NAME)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  const req = event.request;

  // Только GET
  if (req.method !== 'GET') return;

  // 🟢 HTML-страницы: сначала СЕТЬ, при неудаче — кэш (или offline.html)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Обновляем кэш свежей версией
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached =>
            cached || caches.match(OFFLINE_URL)
          )
        )
    );
    return;
  }

  // 🟡 Остальные ресурсы (css, js, картинки): сначала КЭШ, потом сеть
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Кэшируем новые ресурсы на лету
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
