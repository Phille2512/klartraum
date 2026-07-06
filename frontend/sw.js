// Service Worker: App-Shell cachen, damit die PWA schnell startet.
// API-Anfragen gehen immer ans Netz (Traumdaten sollen aktuell sein).
const CACHE = "klartraum-v1";
const SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/api.js",
  "/js/journal.js",
  "/js/stats.js",
  "/js/learn.js",
  "/js/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return; // API immer live

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
    )
  );
});
