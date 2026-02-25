// Minimal Service Worker to satisfy PWA installability requirements
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Pass through fetch requests (no caching, just to satisfy the PWA requirement)
});
