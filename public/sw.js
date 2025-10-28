self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    try { return await fetch(event.request); } catch (e) {
      return new Response('offline', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
