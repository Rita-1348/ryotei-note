// アプリ本体を端末にキャッシュする Service Worker(HTTPS または localhost でのみ有効)。
// 旅行データは localStorage にあり、ここでは扱わない。
// 方針: ネットワーク優先。つながるときは常に最新を取得してキャッシュを更新し、
//       つながらない/遅い(3秒)ときだけキャッシュを返す。古い画面が居座って真っ白になるのを防ぐ。
const CACHE = 'ryotei-note-v3';
const SLOW_MS = 3000;

self.addEventListener('install', () => self.skipWaiting());

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
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const isNav = req.mode === 'navigate';
  // 画面(HTML)は、?v= などが付いても同じ1件として保存する
  const key = isNav ? new Request(new URL('./index.html', self.location).href) : req;
  const cached = await cache.match(key);

  const network = fetch(isNav ? req.url : req, { cache: 'no-store' }).then((res) => {
    if (res.ok) {
      cache.put(key, res.clone());
      return res;
    }
    if (cached) return cached; // 404 などでも、持っているキャッシュを優先
    return res;
  });

  if (!cached) return network.catch(() => Response.error());
  return Promise.race([
    network.catch(() => cached),
    new Promise((resolve) => setTimeout(() => resolve(cached), SLOW_MS)),
  ]);
}
