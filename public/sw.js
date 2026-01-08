// Service Worker for PriceWaze PWA
const CACHE_NAME = 'pricewaze-v1';
const urlsToCache = [
  '/',
  '/demo/map',
  '/properties',
  '/offers',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip external API calls (Supabase, etc.) - let them go directly to network
  // This prevents service worker from intercepting auth token refresh and other API calls
  if (
    url.origin.includes('supabase.co') ||
    url.origin.includes('supabase.io') ||
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET'
  ) {
    // For external APIs and non-GET requests, bypass service worker entirely
    // Don't call event.respondWith() - let browser handle normally
    return;
  }

  // Only cache GET requests to same-origin pages
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(request).catch((error) => {
          // If network fails, return error response
          console.error('Service worker fetch error:', error);
          throw error;
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'PriceWaze';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon.png',
    badge: '/icon.png',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

