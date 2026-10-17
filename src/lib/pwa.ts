import { toast } from './toast';

/** Registers the service worker; when a new build takes over, offers a reload. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('New version available — reload to update');
  });
}
