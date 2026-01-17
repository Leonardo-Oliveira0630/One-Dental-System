// MyTooth PWA Service Worker
const CACHE_NAME = 'mytooth-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ESCUTAR MENSAGENS PUSH (BACKGROUND)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.notification.body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3467/3467771.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/3467/3467771.png',
            data: data.data || {},
            vibrate: [200, 100, 200],
            actions: [
                { action: 'open', title: 'Ver Detalhes' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.notification.title, options)
        );
    } catch (e) {
        console.error("Erro ao processar notificação background:", e);
    }
});

// CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Tenta focar no app se já estiver aberto ou abre uma nova aba
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                const jobId = event.notification.data?.jobId;
                const url = jobId ? `/jobs/${jobId}` : '/';
                return clients.openWindow(url);
            }
        })
    );
});