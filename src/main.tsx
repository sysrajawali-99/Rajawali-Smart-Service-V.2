import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker safely:
// 1. Only in production environment
// 2. Only if supported by browser
// 3. Skip cleanly inside iframe (AI Studio preview) without throwing errors
function registerServiceWorkerSafely() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Gracefully skip when embedded inside AI Studio iframe preview
  const isInIframe = window.self !== window.top;
  const isProd = Boolean((import.meta as any).env?.PROD);

  if (!isProd || isInIframe) {
    // In preview iframe or dev, skip service worker registration
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker terdaftar dengan scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New update available! Dispatch event so UI can display "Versi baru tersedia - Muat ulang" banner
              window.dispatchEvent(
                new CustomEvent('pwa:update-available', {
                  detail: { registration },
                })
              );
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration skipped/notice:', err?.message || err);
      });

    // Handle background sync message from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'TRIGGER_OUTBOX_SYNC') {
        window.dispatchEvent(new CustomEvent('pwa:trigger-sync'));
      }
    });
  });
}

registerServiceWorkerSafely();
