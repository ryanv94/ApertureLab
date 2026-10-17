import { defineConfig } from 'astro/config';
import serviceWorker from './integrations/service-worker.mjs';

export default defineConfig({
  site: 'https://aperturelab.cc',
  build: { format: 'file' },
  trailingSlash: 'never',
  integrations: [serviceWorker()],
});
