// ============================================
// SERVICE WORKER — Budget Hero PWA
// Network-first strategy (always get latest)
// ============================================

const CACHE_NAME = 'budget-hero-v3';
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/variables.css',
    '/css/base.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/dashboard.css',
    '/css/transactions.css',
    '/css/budgets.css',
    '/css/goals.css',
    '/css/modal.css',
    '/css/animations.css',
    '/css/onboarding.css',
    '/css/mascot.css',
    '/css/mobile.css',
    '/css/calendar.css',
    '/css/banners.css',
    '/js/store.js',
    '/js/categories.js',
    '/js/chart.js',
    '/js/ai.js',
    '/js/calendar.js',
    '/js/app.js'
];

// Install — pre-cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL);
        }).then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch — network first, cache fallback (ensures updates always arrive)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).then((response) => {
            // Cache successful responses
            if (response.ok && event.request.url.startsWith(self.location.origin)) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
            }
            return response;
        }).catch(() => {
            // Offline — serve from cache
            return caches.match(event.request).then((cached) => {
                if (cached) return cached;
                // Offline fallback for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
