// Auto-cleanup service worker: clears caches and unregisters itself
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.registration.unregister())
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch live from network
  event.respondWith(fetch(event.request));
});

