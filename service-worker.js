// ============================================================
// 數獨 PWA Service Worker
// 每次更新遊戲檔案後，一定要改這個版本號（例如 1.0.0 → 1.0.1），
// 玩家的 App 才會偵測到新版並跳出「有新版本」提示。
// ============================================================
const VERSION = '1.0.1';

const CACHE = 'sudoku-' + VERSION;
const FONT_CACHE = 'sudoku-fonts';
// 需要離線使用的檔案（新增圖片等素材時要加進來）
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// 安裝：下載並快取所有檔案（cache:'reload' 避開瀏覽器舊快取）
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
  );
  // 不自動 skipWaiting，等玩家按「更新」
});

// 啟用：刪除舊版本快取
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('sudoku-') && k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: VERSION });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google 字型：有快取先用快取，背景更新；離線時仍可顯示
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => {
        if (r.ok || r.type === 'opaque') c.put(req, r.clone());
        return r;
      }).catch(() => hit || Response.error());
      return hit || net;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 遊戲本體：只讀「目前這個版本」的快取，避免新舊版混用
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch {
      if (req.mode === 'navigate') return (await c.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
