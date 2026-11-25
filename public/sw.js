// アプリ本体を端末にキャッシュする Service Worker(HTTPS または localhost でのみ有効)。
// 旅行データは localStorage にあり、ここでは扱わない。
// 方針: キャッシュがあればすぐ返し、裏で更新する。次回起動で新しい版に切り替わる。
const CACHE = 'ryotei-note-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(async () => hit || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined) || Response.error());
      return hit || net;
    }),
  );
});
