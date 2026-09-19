const CACHE_NAME = 'matz-web-client-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './serverinfo.html',
  './ranking.html',
  './developers.html',
  './maps.html',
  './wiki.html',
  './controls.html',
  './asset/style.css',
  './asset/theme.css',
  './asset/script.js',
  './asset/header.html',
  './asset/footer.html',
  './asset/image/icon.png',
  './asset/image/icon.ico',
  './asset/image/96x96.png',
  './manifest.json'
];

// Service Worker Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(STATIC_ASSETS.map(async (asset) => {
        try {
          await cache.add(asset);
        } catch (error) {
          console.warn(`SW cache skipped: ${asset}`, error);
        }
      })))
      .then(() => self.skipWaiting())
  );
});

// Service Worker Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Service Worker Fetch (Network first, fall back to cache)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(async () => (
          await caches.match(event.request)
          || await caches.match('./index.html')
          || new Response('오프라인 상태입니다.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        ))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
  );
});
