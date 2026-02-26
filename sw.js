// ============================================
// SERVICE WORKER — Budget Hero PWA
// Cache-first strategy for app shell
// ============================================

const CACHE_NAME = 'budget-hero-v1';
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
    '/js/store.js',
    '/js/categories.js',
    '/js/chart.js',
    '/js/ai.js',
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

// Fetch — cache-first, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // For Google Fonts and external resources — network first, cache fallback
    if (event.request.url.includes('fonts.googleapis.com') ||
        event.request.url.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return fetch(event.request).then((response) => {
                    cache.put(event.request, response.clone());
                    return response;
                }).catch(() => cache.match(event.request));
            })
        );
        return;
    }

    // For app shell — cache first, fallback to network
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Cache successful responses for app resources
                if (response.ok && event.request.url.startsWith(self.location.origin)) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback for navigation
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});
