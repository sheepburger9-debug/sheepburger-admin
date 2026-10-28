/* Sheep & Burger Admin — Service Worker
 * - يخزّن ملفات الواجهة فقط (HTML/CSS/JS/أيقونات) ليفتح التطبيق بسرعة.
 * - لا يخزّن أبدًا أي طلب إلى Supabase (بيانات، مصادقة، Edge Functions).
 * - الشبكة أولًا دائمًا، والكاش احتياطي عند انقطاع الإنترنت، لتصل التحديثات فورًا.
 */
const CACHE = 'sb-admin-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/admin.css',
  './js/00-boot-guard.js',
  './js/01-config.js',
  './js/02-payments-roles-nav.js',
  './js/03-utils.js',
  './js/04-charts.js',
  './js/05-sound-theme-network.js',
  './js/06-supabase-state.js',
  './js/07-auth.js',
  './js/08-navigation.js',
  './js/09-realtime.js',
  './js/10-kanban.js',
  './js/11-order-actions.js',
  './js/12-views.js',
  './js/13-pagination-table.js',
  './js/14-boot.js',
  './js/15-pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // لا تلمس أي طلب خارجي أو Supabase: بيانات حساسة ومصادقة لازم تفضل لحظية
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('غير متصل بالإنترنت', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
