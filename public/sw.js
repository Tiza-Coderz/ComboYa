/*
 * Service worker de ComboYa: lo mínimo para una PWA útil con conexión lenta.
 *   · Recursos estáticos (JS/CSS con hash, imágenes del catálogo, iconos): primero caché.
 *   · Páginas: primero red; si falla, la última copia guardada o /offline.html (HTML sin JS).
 *   · Nunca cachea /admin, /api ni peticiones que no sean GET (Server Actions).
 */
const VERSION = "comboya-v2";
const ESTATICOS = `${VERSION}-estaticos`;
const PAGINAS = `${VERSION}-paginas`;
const PRECACHE = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGINAS)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function esEstatico(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/catalogo/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  if (esEstatico(url)) {
    event.respondWith(
      caches.open(ESTATICOS).then(async (cache) => {
        const guardado = await cache.match(req);
        if (guardado) return guardado;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !url.pathname.startsWith("/checkout")) {
            const copia = res.clone();
            caches.open(PAGINAS).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) ?? caches.match("/offline.html")),
    );
  }
});
