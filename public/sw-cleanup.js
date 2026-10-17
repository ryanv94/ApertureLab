// Removes the cache left by the pre-2026 hand-written service worker.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete('aperturelab-v2'));
});
