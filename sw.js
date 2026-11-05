// Labprox PWA Service Worker
const CACHE_NAME = 'labprox-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo labprox.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or chrome-extension URLs
  if (event.request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // App Navigation Shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html').then(res => res || fetch(event.request)))
    );
    return;
  }

  // Cache-First for Fonts and Static Assets with safe network fallback
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(() => new Response('', { status: 408, statusText: 'Network Timeout' }));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => new Response('', { status: 408, statusText: 'Offline' }));
    })
  );
});

// ESCUTAR MENSAGENS PUSH (BACKGROUND / iOS / Android)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { notification: { title: 'Labprox', body: event.data.text() } };
    }

    const title = payload.notification?.title || payload.title || 'Labprox Notificação';
    const body = payload.notification?.body || payload.body || '';
    const notifData = payload.data || payload.notification?.data || {};

    const options = {
      body: body,
      icon: '/logo labprox.svg',
      badge: '/logo labprox.svg',
      data: notifData,
      vibrate: [200, 100, 200, 100, 200],
      tag: notifData.id || notifData.jobId || notifData.requisitionId || 'labprox_alert',
      renotify: true,
      requireInteraction: notifData.urgency === 'URGENT' || notifData.urgency === 'HIGH',
      actions: [
        { action: 'open', title: 'Abrir no App' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error("Erro ao processar notificação background:", e);
  }
});

// CLIQUE NA NOTIFICAÇÃO (iOS / Android / Desktop)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (data.url) {
    targetUrl = data.url;
  } else if (data.jobId) {
    targetUrl = `/jobs?jobId=${data.jobId}&openChat=true`;
  } else if (data.requisitionId) {
    targetUrl = '/incoming-requisitions';
  } else if (data.orderId) {
    targetUrl = '/incoming-orders';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
