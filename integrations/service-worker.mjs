import { generateSW } from 'workbox-build';
import { fileURLToPath } from 'node:url';

/** Generates a versioned Workbox service worker over the finished static build. */
export default function serviceWorker() {
  return {
    name: 'aperturelab-service-worker',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const { count, size } = await generateSW({
          globDirectory: root,
          globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
          swDest: `${root}/sw.js`,
          cleanupOutdatedCaches: true,
          importScripts: ['sw-cleanup.js'],
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: null,
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [{ urlPattern: /\/data\/cities\.json$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'aperturelab-data' } }],
        });
        logger.info(`service worker precaches ${count} files (${Math.round(size / 1024)} KB)`);
      },
    },
  };
}
