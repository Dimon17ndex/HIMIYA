// sw.js — лежит в корне сайта
const CACHE_NAME = 'chemistry-v1';
const OFFLINE_URL = './offline.html';

const urlsToCache = [
  './',
  './index.html',
  './about.html',
  './molecules.html',
  './offline.html'
];

// Установка: кэшируем файлы
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll может упасть, если хоть один файл 404,
      // поэтому добавляем по одному
      return Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(err => console.warn('Не закэшировано:', url, err))
        )
      );
    })
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Для навигации: сеть → при ошибке офлайн-страница
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Для остального: кэш → сеть
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});