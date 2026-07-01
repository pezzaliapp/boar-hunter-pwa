/*
 * sw.js — service worker for offline PWA support.
 * Strategy: precache the full app shell on install (cache-first at runtime),
 * with a network fallback that also caches any newly fetched same-origin GETs.
 * Bump CACHE_VERSION whenever shipped files change to invalidate old caches.
 */
const CACHE_VERSION = 'boar-hunter-v0.2.0';

// Paths are relative so the SW works from the repo root AND from a GitHub
// Pages subpath (e.g. /boar-hunter-pwa/).
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './src/main.js',
  './src/game/config.js',
  './src/game/world.js',
  './src/game/player.js',
  './src/game/boar.js',
  './src/game/jeep.js',
  './src/game/ui.js',
  './src/game/controls.js',
  './src/game/sceneBoot.js',
  './src/game/sceneMenu.js',
  './src/game/sceneGame.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // cache same-origin successful responses for future offline use
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // offline navigation fallback -> app shell
          if (req.mode === 'navigate') return caches.match('./index.html');
          return undefined;
        });
    })
  );
});
