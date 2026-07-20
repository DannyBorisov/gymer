const CACHE_NAME = 'gymer-v1';

// Install event - minimal caching
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - pass through to network, no caching
// Let Next.js handle all routing
self.addEventListener('fetch', (event) => {
  // Don't intercept - let the browser handle it normally
  return;
});
