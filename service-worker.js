// -----------------------------------------
// Sensodimension · Service Worker
// Versión robusta para PWA en Android + iOS
// -----------------------------------------

const CACHE_NAME = "sensodimension-v2";

// Archivos a precachear (solo lo esencial)
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-32.png"
];

// -----------------------------------------
// INSTALACIÓN: precache limpio
// -----------------------------------------
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        // Importante: no fallar instalación por un archivo puntual
        console.warn("Precache fallo en algún recurso:", err);
      });
    })
  );
  self.skipWaiting();
});

// -----------------------------------------
// ACTIVACIÓN: elimina caches antiguos
// -----------------------------------------
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Eliminando cache viejo:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// -----------------------------------------
// FETCH: Cache → Red → Offline fallback
// (con exclusión explícita de audio/video)
// -----------------------------------------
self.addEventListener("fetch", event => {
  const request = event.request;

  // iOS Safari: evitar errores con range requests (audio/video)
  if (request.headers.get("range")) {
    return; // permitir manejo directo por la red
  }

  // Evitar cachear audio y video (pesado y conflictivo con reproducción en móviles)
  const isMedia =
    request.destination === "audio" ||
    request.destination === "video" ||
    request.url.match(/\.(mp3|wav|ogg|mp4|webm)$/i);

  if (isMedia) {
    // Siempre ir a la red sin tocar el cache
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          "El recurso multimedia no está disponible offline.",
          { status: 503 }
        );
      })
    );
    return;
  }

  // Default: Cache first → Network fallback → Offline msg
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(networkResponse => {
          // Cachear solo respuestas OK y no-media
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            request.method === "GET"
          ) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(request, networkResponse.clone())
            );
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response("Sin conexión y recurso no cacheado.", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});
