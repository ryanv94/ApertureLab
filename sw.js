const CACHE_NAME = 'aperturelab-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/dof-visualizer.html',
  '/exposure-calculator.html',
  '/resize-watermark.html',
  '/exif-frame.html',
  '/panorama-splitter.html',
  '/color-palette.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});