import React, { ComponentType, LazyExoticComponent } from 'react';

const RELOAD_STORAGE_KEY = 'sco_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 15000;

export function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '').toLowerCase();
  const name = String((error as any)?.name || '').toLowerCase();
  return (
    name === 'chunkloaderror' ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('unable to preload css')
  );
}

export async function clearAppCachesAndReload(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k).catch(() => false)));
    }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            await reg.update();
          } catch {}
        })
      );
    }
  } catch {
    // Ignore cache clear failures and still reload
  }

  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

function canAutoReloadNow(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(RELOAD_STORAGE_KEY);
    const lastTs = raw ? parseInt(raw, 10) : 0;
    const now = Date.now();
    if (!Number.isNaN(lastTs) && lastTs > 0 && now - lastTs < RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  _chunkName?: string
): LazyExoticComponent<T> {
  return React.lazy(async () => {
    const retryDelays = [350, 900];
    let lastError: unknown;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        if (!isChunkLoadError(err) || attempt === retryDelays.length) {
          break;
        }
        await sleep(retryDelays[attempt]);
      }
    }

    if (isChunkLoadError(lastError) && canAutoReloadNow()) {
      clearAppCachesAndReload();
      // Keep Suspense fallback mounted while the page reloads cleanly to the latest build
      return new Promise<{ default: T }>(() => {});
    }

    throw lastError;
  });
}

let vitePreloadListenerRegistered = false;

export function registerVitePreloadErrorRecovery(): void {
  if (typeof window === 'undefined' || vitePreloadListenerRegistered) return;
  vitePreloadListenerRegistered = true;

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    if (canAutoReloadNow()) {
      clearAppCachesAndReload();
    }
  });
}
