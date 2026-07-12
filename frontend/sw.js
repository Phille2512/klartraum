// Service Worker: App-Shell cachen, damit die PWA schnell startet.
// API-Anfragen gehen immer ans Netz (Traumdaten sollen aktuell sein).
const CACHE = "klartraum-v21";
const SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/auth.js",
  "/js/api.js",
  "/js/offline.js",
  "/js/journal.js",
  "/js/stats.js",
  "/js/wissen.js",
  "/js/hilfe.js",
  "/js/atlas.js",
  "/js/innenwelt.js",
  "/js/worldmap.js",
  "/js/mandala.js",
  "/js/learn.js",
  "/js/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // "reload" umgeht den HTTP-Cache des Browsers – sonst landen alte Dateien im Shell-Cache
      cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" })))
    )
  );
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

  // Netz zuerst (immer aktuelle App), Cache nur als Offline-Fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
