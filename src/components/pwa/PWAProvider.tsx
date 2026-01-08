'use client';

import { useEffect } from 'react';

/**
 * PWA Provider
 * Registers service worker and handles PWA installation
 */
export function PWAProvider() {
  useEffect(() => {
    // DISABLE Service Worker in development to avoid conflicts with browser extensions
    // Service Workers in dev cause issues with chrome-extension:// requests from DevTools
    if (process.env.NODE_ENV === 'development') {
      // Unregister any existing service workers in development
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().then(() => {
              console.log('[PWA] Service Worker unregistered in development');
            });
          });
        });
      }
      return undefined; // Exit early in development (proper cleanup)
    }

    // Only register Service Worker in production
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      let updateInterval: NodeJS.Timeout | null = null;

      // Listen for controller changes (service worker updated)
      const handleControllerChange = () => {
        console.log('[PWA] Service Worker updated');
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Register service worker with update checking
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' }) // Force update check on every page load
        .then((registration) => {
          console.log('[PWA] Service Worker registered');

          // Check for updates immediately and periodically
          const checkForUpdates = () => {
            registration.update().catch(() => {
              // Silently fail if update check fails
            });
          };

          // Check for updates on registration
          checkForUpdates();

          // Check for updates every 5 minutes in production
          updateInterval = setInterval(checkForUpdates, 300000);
          
          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, user can reload when ready
                  console.log('[PWA] New Service Worker available. Reload to update.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Cleanup function
      return () => {
        if (updateInterval) {
          clearInterval(updateInterval);
        }
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }

    return undefined;
  }, []);

  return null;
}

