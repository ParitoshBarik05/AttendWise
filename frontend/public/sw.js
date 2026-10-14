const CACHE_NAME = 'attendwise-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/privacy.html', '/terms.html'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))), clients.claim()])));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin || new URL(request.url).pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') event.respondWith(fetch(request).then(response => { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put('/',copy)); return response; }).catch(() => caches.match(request).then(cached => cached || caches.match('/'))));
  else event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (response.ok) caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone())); return response; })));
});
self.addEventListener('push', event => {
  let data = {}; try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Class reminder';
  const options = { body: data.body || 'Your class starts in 15 minutes.', icon: '/favicon.svg', badge: '/favicon.svg', tag: data.tag || 'attendwise-class', renotify: false, data: { url: data.url || '/' } };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close(); const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { for (const client of list) { if (client.url.startsWith(self.location.origin) && 'focus' in client) return client.focus(); } return clients.openWindow ? clients.openWindow(target) : undefined; }));
});
