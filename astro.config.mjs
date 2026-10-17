import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://aperturelab.cc',
  build: { format: 'file' },
  trailingSlash: 'never',
});
