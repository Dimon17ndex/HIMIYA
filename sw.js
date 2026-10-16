// sw.js — лежит в корне сайта
// Логика:
//   • страницы (index, about, molecules) НЕ кэшируются — всегда из сети
//   • offline.html — network-first: всегда сначала сеть, кэш только при её отсутствии
//   • остальные ресурсы (css/js/картинки) — cache-first
//   • версию CACHE_NAME можно больше не поднимать при правках offline.html

const CACHE_NAME = 'chemistry-offline-v2';
const OFFLINE_URL = './offline.html';

// ============================================================
// УСТАНОВКА — кэшируем offline.html
// ============================================================
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.add(OFFLINE_URL).catch(err =>
        console.warn('Не закэшировано:', OFFLINE_URL, err)
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
  //    сеть → при провале offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 🟢 offline.html — network-first:
  //    сначала сеть, обновляем кэш, при отсутствии сети отдаём старую версию
  if (req.url.endsWith('offline.html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          // обновляем кэш свежей копией
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 🟡 Остальные ресурсы (CSS, JS, картинки):
  //    сначала кэш, если нет — сеть
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
