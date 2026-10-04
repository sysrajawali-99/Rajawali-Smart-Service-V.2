// JTI Smart / Smart Cleaning Operations - Progressive Web App Service Worker
// Versioned cache with current timestamp for reliable cache invalidation
const CACHE_VERSION = 'jti-smart-v2026-10-04';
const STATIC_CACHE = `jti-static-${CACHE_VERSION}`;
const ASSET_CACHE = `jti-assets-${CACHE_VERSION}`;

// Precache list for the application shell and offline fallback
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/badge-72.png',
  '/icons/favicon-32.png',
];

// Install: precache app shell & activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache notice:', err);
      });
    })
  );
});

// Activate: clean up all outdated versioned caches and claim active clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== STATIC_CACHE && name !== ASSET_CACHE) {
              console.log('[SW] Purging outdated cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Message listener: handle instant update & skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: network-first navigation with offline.html fallback, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // CRITICAL: Never cache API endpoints, socket.io websockets, sync routes, or uploaded images
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/uploads')
  ) {
    return;
  }

  // Ignore non-http/https schemes (extensions, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML / SPA): Network-first with offline.html fallback
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Try cached page first
          const cached = await caches.match(request);
          if (cached) return cached;

          // If offline and not in cache, serve offline.html
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          const fallbackIndex = await caches.match('/index.html');
          if (fallbackIndex) return fallbackIndex;

          return caches.match('/');
        })
    );
    return;
  }

  // 2. Static assets & Icons: Cache-first with network fallback
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Google Fonts: Stale-while-revalidate
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// WEB PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  let data = {
    title: 'Smart Cleaning Operations',
    body: 'Pemberitahuan operasional baru',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'sco-notification',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || 'sco-general-notification',
    renotify: true,
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
    actions: data.actions || [
      { action: 'open', title: 'Buka Tugas' },
      { action: 'close', title: 'Tutup' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, notificationOptions));
});

// Notification Click Handler: Focus existing tab or open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync Event (Supported in Chromium browsers)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checklist-outbox') {
    console.log('[SW] Background sync triggered for checklist outbox');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OUTBOX_SYNC' });
        });
      })
    );
  }
});
