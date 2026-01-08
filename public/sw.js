// Service Worker for PriceWaze PWA
// Version with timestamp to force cache invalidation on updates
const CACHE_VERSION = 'v2-' + new Date().getTime();
const CACHE_NAME = `pricewaze-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/demo/map',
  '/properties',
  '/offers',
];

// Check if we're in development mode (localhost)
const isDevelopment = self.location.hostname === 'localhost' || 
                      self.location.hostname === '127.0.0.1' ||
                      self.location.hostname.includes('localhost');

// Install event - cache resources
self.addEventListener('install', (event) => {
  // In development, skip waiting to get updates immediately
  if (isDevelopment) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        if (!isDevelopment) {
          console.log('[SW] Opened cache:', CACHE_NAME);
          return cache.addAll(urlsToCache);
        }
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all old caches (anything that doesn't match current version)
          if (!cacheName.startsWith('pricewaze-')) {
            return caches.delete(cacheName);
          }
          // In development, delete all caches to force fresh fetch
          if (isDevelopment || cacheName !== CACHE_NAME) {
            if (isDevelopment) {
              console.log('[SW] Development mode: deleting cache:', cacheName);
            } else {
              console.log('[SW] Deleting old cache:', cacheName);
            }
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      });
    })
  );
});

// Fetch event - network first strategy in dev, cache first in production
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // In development, don't intercept any requests - let browser handle everything
  // This prevents conflicts with browser extensions (chrome-extension://)
  if (isDevelopment) {
    return; // Let browser handle all requests in development
  }

  const url = new URL(request.url);

  // Skip requests with unsupported schemes (chrome-extension, chrome, moz-extension, etc.)
  // Only handle http/https requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return; // Let browser handle these requests normally
  }

  // Skip external API calls (Supabase, etc.) - let them go directly to network
  // This prevents service worker from intercepting auth token refresh and other API calls
  // Also skip WebSocket connections (wss://) - they cannot be intercepted by service workers
  if (
    url.origin.includes('supabase.co') ||
    url.origin.includes('supabase.io') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') || // Skip Next.js internal files
    request.method !== 'GET' ||
    url.protocol === 'wss:' ||
    url.protocol === 'ws:'
  ) {
    // For external APIs, non-GET requests, and WebSocket connections, bypass service worker entirely
    // Don't call event.respondWith() - let browser handle normally
    return;
  }

  // Production: Cache First (serve from cache, fetch from network as fallback)
  // Note: Development requests are already handled above (early return)
  // Cache First strategy for production
  event.respondWith(
      caches.match(request)
        .then((response) => {
          // Return cached version if available
          if (response) {
            return response;
          }
          // Fetch from network and cache for next time
          return fetch(request).then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Don't cache requests with unsupported schemes (chrome-extension, chrome, etc.)
            // Only cache http/https requests
            const requestUrl = new URL(request.url);
            if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
              return response;
            }
            // Clone the response for caching
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache).catch((error) => {
                // Silently fail if caching fails (e.g., unsupported scheme)
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[SW] Failed to cache request:', request.url, error);
                }
              });
            });
            return response;
          }).catch((error) => {
            // If network fails, return error response
            console.error('[SW] Fetch error:', error);
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

