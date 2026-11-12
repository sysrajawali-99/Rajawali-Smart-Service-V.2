// JTI Smart / Smart Cleaning Operations - Progressive Web App Service Worker
// Versioned cache with current timestamp for reliable cache invalidation
const CACHE_VERSION = 'jti-smart-v2026-11-04-badge';
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

// WEB PUSH NOTIFICATIONS (Tetap aktif & muncul walau aplikasi sedang ditutup)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Smart Cleaning Operations',
    body: 'Pemberitahuan operasional baru',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `sco-${Date.now()}`,
    data: { url: '/' },
    badgeCount: 1,
    requireInteraction: true,
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

  // 1. Update Badge pada Ikon Aplikasi di Layar Utama / Taskbar (App Badging API)
  // Berjalan di background Service Worker walau aplikasi sedang tertutup penuh
  if ('setAppBadge' in self.navigator) {
    try {
      const count =
        typeof data.badgeCount === 'number' && data.badgeCount > 0
          ? data.badgeCount
          : (typeof data.count === 'number' && data.count > 0)
          ? data.count
          : 1;
      self.navigator.setAppBadge(count).catch((err) => {
        console.warn('[SW Badging] Notice:', err);
      });
    } catch (e) {
      console.warn('[SW Badging] Failed:', e);
    }
  }

  // 2. Opsi Notifikasi Pop-Up Persisten
  // requireInteraction: true membuat pop-up sistem operasi TETAP TERLIHAT di layar sampai diklik/ditutup pengguna
  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || `sco-${Date.now()}`,
    requireInteraction: true, // Pop-up tetap bertahan di layar (tidak hilang otomatis)
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200], // Pola getar agar terasa saat ponsel di kantong
    timestamp: Date.now(),
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'close', title: 'Tutup' },
    ],
  };

  const showNotificationPromise = self.registration.showNotification(data.title, notificationOptions);

  // Broadcast notifikasi ke seluruh window yang sedang aktif jika ada
  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'PUSH_NOTIFICATION_RECEIVED', payload: data });
    });
  });

  event.waitUntil(Promise.all([showNotificationPromise, broadcastPromise]));
});

// Notification Click Handler: Buka URL dan Bersihkan Badge
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Bersihkan badge ikon aplikasi saat notifikasi dibuka
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

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

// Notification Close Handler: Perbarui atau bersihkan badge saat notifikasi di-dismiss
self.addEventListener('notificationclose', (event) => {
  self.registration.getNotifications().then((notifications) => {
    if (notifications.length === 0) {
      if ('clearAppBadge' in self.navigator) {
        self.navigator.clearAppBadge().catch(() => {});
      }
    } else {
      if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(notifications.length).catch(() => {});
      }
    }
  });
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
