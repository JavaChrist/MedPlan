self.addEventListener('install', () => console.log('[SW] Installed'));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));