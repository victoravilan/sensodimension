const CACHE_NAME = "sensodimension-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-32.png"
];

// INSTALACIÓN
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// ACTIVACIÓN: limpia caches viejos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// FETCH: cache primero, luego red (sin cachear audio/video pesados)
self.addEventListener("fetch", event => {
  const request = event.request;

  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }

      return fetch(request).then(networkResponse => {
        const clone = networkResponse.clone();
        const contentType = clone.headers.get("content-type") || "";

        if (!contentType.includes("audio") && !contentType.includes("video")) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });
        }

        return networkResponse;
      }).catch(() => {
        return new Response("Sin conexión y recurso no cacheado.", {
          status: 503,
          statusText: "Offline"
        });
      });
    })
  );
});
