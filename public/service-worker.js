const CACHE_NAME = "dollar-app-v3-20260320";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];
const STATIC_EXT_RE = /\.(?:js|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|json|webmanifest|mp4|webm)$/i;
const STATIC_DESTINATIONS = new Set(["style", "script", "image", "font", "manifest", "video"]);
const BYPASS_PREFIXES = ["/api/", "/auth/", "/rest/v1/", "/realtime/v1/"];

const shouldBypass = (url) => BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

const isStaticAssetRequest = (req, url) => {
  if (req.mode === "navigate") return true;
  if (STATIC_DESTINATIONS.has(req.destination)) return true;
  return STATIC_EXT_RE.test(url.pathname);
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url)) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  if (!isStaticAssetRequest(req, url)) return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
    )
  );
});
