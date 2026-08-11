// SKT Büyüteç - Service Worker
// Amaç: siteyi ve ilk açılışta indirilen tüm dosyaları (fontlar, Tesseract.js
// motoru, dil paketi) cihaza kaydedip sonraki açılışlarda internet olmadan
// çalışmayı sağlamak.

const CACHE_NAME = 'skt-buyutec-v1';

// Uygulamanın kendi dosyaları (kesin olarak baştan cache'lenir)
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first, network fallback + runtime cache.
// Bu sayede Google Fonts, Tesseract.js CDN dosyaları (core/worker/dil paketi)
// gibi dış kaynaklar da ilk (internetli) çalıştırmada otomatik olarak
// cache'e yazılır ve sonraki açılışlarda internet olmasa bile oradan okunur.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // opak (cross-origin, no-cors) yanıtlar da dahil cache'e yazılır
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy).catch(() => {});
          });
          return response;
        })
        .catch(() => {
          // Ağ da yoksa ve cache'te de yoksa: elimizden bir şey gelmez.
          // (Uygulama açıldıktan sonra en az bir kez internetli
          // çalıştırılmış olmalı ki bu dosyalar cache'e yazılsın.)
          return cached;
        });
    })
  );
});
