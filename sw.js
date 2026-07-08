// Minimal service worker for SmartCalculator BD
// Caches static assets, but always prefers a fresh network copy of the
// HTML app shell so calculator/ad-system fixes are never served stale.
const CACHE_NAME = "smartcalculator-bd-v2";
const APP_SHELL = [
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const isHTML =
    req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");

  if (isHTML) {
    // Network-first for HTML so fixes/updates always show up immediately.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(
          () =>
            caches.match(req).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  // Cache-first for static assets (icons, manifest).
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
