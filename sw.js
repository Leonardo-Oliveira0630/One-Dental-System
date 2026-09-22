// Labprox PWA Service Worker
const CACHE_NAME = 'labprox-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
  // Pass-through network requests with cache fallback for app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html') || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
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
