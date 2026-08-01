// Firebase Messaging compat — enables background FCM push notifications.
// Wrapped in try/catch so a CDN failure never crashes the service worker.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');
  firebase.initializeApp({
    apiKey: "AIzaSyDZ_dc_HfSmXL1pjeKwT7uD1xX2lbr48c0",
    authDomain: "carnet-sante-pro.firebaseapp.com",
    projectId: "carnet-sante-pro",
    storageBucket: "carnet-sante-pro.firebasestorage.app",
    messagingSenderId: "1059301417055",
    appId: "1:1059301417055:web:8f5f81e0b075063ad4fbea"
  });
  firebase.messaging().onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    if (!title) return;
    self.registration.showNotification(title, {
      body: body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'dose-reminder',
    });
  });
} catch (e) { /* FCM unavailable — caching and other SW features still work */ }

const CACHE = 'carnet-sante-v18';
const PRECACHE = [
  './',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for Firebase/API calls, cache-first for static assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network-first for Firebase, Firestore, AdSense, GTM, Overpass
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('overpass') ||
    url.hostname.includes('googlesyndication') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('google-analytics')
  ) {
    return; // Let browser handle these normally
  }

  // Network-first for navigation requests and HTML documents, so users
  // always get the latest app shell instead of being stuck on a stale
  // cached index.html. Falls back to cache when offline.
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./')))
    );
    return;
  }

  // Cache-first for other same-origin static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./'));
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});

// Receive reminder notification requests from the app and display them right away
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'reminder',
      requireInteraction: false,
      vibrate: [200, 100, 200],
    });
  }
});
