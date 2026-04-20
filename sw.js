const CACHE_NAME = 'matz-cache-v1';
const ASSETS = [
  './index.html',
  './asset/style.css',
  './asset/script.js',
  './asset/image/icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});