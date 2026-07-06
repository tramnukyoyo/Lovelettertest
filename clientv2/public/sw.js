// Minimal service worker: makes the installed web app a first-class PWA on
// iOS/Android (Settings entry + permission persistence). No caching — network
// passthrough only, so deploys are never served stale.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// A fetch handler must EXIST for installability; not calling respondWith()
// means the browser does its normal network fetch (no interception).
self.addEventListener('fetch', () => {});
