/**
 * PWA Icon Generator Utility
 * Generates all 11 standardized PWA and device icon variants from a single image source.
 * Adapts each variant according to its specific purpose (any, maskable, iOS, Android badge, Windows, Favicon).
 */

import { updateDocumentFavicon, updateDocumentTitle } from './dynamicFavicon';

export interface PwaIconItem {
  id: string;
  name: string;
  size: string;
  purpose: string;
  path: string;
  isCustom?: boolean;
}

export const DEFAULT_PWA_ICONS: PwaIconItem[] = [
  { id: 'def-1', name: 'icon-192.png', size: '192x192', purpose: 'Any (Android Launcher / Splash)', path: '/icons/icon-192.png' },
  { id: 'def-2', name: 'icon-512.png', size: '512x512', purpose: 'Any (PWA Splash Screen & Store)', path: '/icons/icon-512.png' },
  { id: 'def-3', name: 'maskable-192.png', size: '192x192', purpose: 'Maskable (Android Circle/Squircle)', path: '/icons/maskable-192.png' },
  { id: 'def-4', name: 'maskable-512.png', size: '512x512', purpose: 'Maskable (Solid Safe Zone 80%)', path: '/icons/maskable-512.png' },
  { id: 'def-5', name: 'apple-touch-icon-180.png', size: '180x180', purpose: 'iOS Safari Home Screen (iPhone)', path: '/icons/apple-touch-icon-180.png' },
  { id: 'def-6', name: 'apple-touch-icon-167.png', size: '167x167', purpose: 'iPad Pro Retina', path: '/icons/apple-touch-icon-167.png' },
  { id: 'def-7', name: 'apple-touch-icon-152.png', size: '152x152', purpose: 'iPad Standard', path: '/icons/apple-touch-icon-152.png' },
  { id: 'def-8', name: 'badge-72.png', size: '72x72', purpose: 'Android Notification Bar (Monochrome)', path: '/icons/badge-72.png' },
  { id: 'def-9', name: 'mstile-150.png', size: '150x150', purpose: 'Windows Start Menu Tile', path: '/icons/mstile-150.png' },
  { id: 'def-10', name: 'favicon-32.png', size: '32x32', purpose: 'Browser Desktop Tab', path: '/icons/favicon-32.png' },
  { id: 'def-11', name: 'favicon-16.png', size: '16x16', purpose: 'Browser Small Tab', path: '/icons/favicon-16.png' },
];

export interface GeneratedPwaIcon {
  id: string;
  name: string;
  size: string;
  purpose: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface IconVariantConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  purpose: string;
  style: 'transparent' | 'maskable_solid' | 'badge_monochrome' | 'favicon';
  scale: number; // Scale factor within the canvas (e.g. 0.72 for maskable safe-zone)
}

export const PWA_ICON_CONFIGS: IconVariantConfig[] = [
  {
    id: 'def-1',
    name: 'icon-192.png',
    width: 192,
    height: 192,
    purpose: 'Any (Android Launcher / Splash)',
    style: 'transparent',
    scale: 0.85,
  },
  {
    id: 'def-2',
    name: 'icon-512.png',
    width: 512,
    height: 512,
    purpose: 'Any (PWA Splash Screen & Store)',
    style: 'transparent',
    scale: 0.88,
  },
  {
    id: 'def-3',
    name: 'maskable-192.png',
    width: 192,
    height: 192,
    purpose: 'Maskable (Android Circle/Squircle)',
    style: 'maskable_solid',
    scale: 0.72, // 80% safe zone
  },
  {
    id: 'def-4',
    name: 'maskable-512.png',
    width: 512,
    height: 512,
    purpose: 'Maskable (Solid Safe Zone 80%)',
    style: 'maskable_solid',
    scale: 0.72, // 80% safe zone
  },
  {
    id: 'def-5',
    name: 'apple-touch-icon-180.png',
    width: 180,
    height: 180,
    purpose: 'iOS Safari Home Screen (iPhone)',
    style: 'maskable_solid',
    scale: 0.78,
  },
  {
    id: 'def-6',
    name: 'apple-touch-icon-167.png',
    width: 167,
    height: 167,
    purpose: 'iPad Pro Retina',
    style: 'maskable_solid',
    scale: 0.78,
  },
  {
    id: 'def-7',
    name: 'apple-touch-icon-152.png',
    width: 152,
    height: 152,
    purpose: 'iPad Standard',
    style: 'maskable_solid',
    scale: 0.78,
  },
  {
    id: 'def-8',
    name: 'badge-72.png',
    width: 72,
    height: 72,
    purpose: 'Android Notification Bar (Monochrome)',
    style: 'badge_monochrome',
    scale: 0.82,
  },
  {
    id: 'def-9',
    name: 'mstile-150.png',
    width: 150,
    height: 150,
    purpose: 'Windows Start Menu Tile',
    style: 'maskable_solid',
    scale: 0.75,
  },
  {
    id: 'def-10',
    name: 'favicon-32.png',
    width: 32,
    height: 32,
    purpose: 'Browser Desktop Tab',
    style: 'favicon',
    scale: 0.9,
  },
  {
    id: 'def-11',
    name: 'favicon-16.png',
    width: 16,
    height: 16,
    purpose: 'Browser Small Tab',
    style: 'favicon',
    scale: 0.9,
  },
];

/**
 * Loads an image from a data URL or image URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Gagal memuat gambar sumber'));
    img.src = src;
  });
}

/**
 * Generates all 11 PWA icons tailored to their specific purpose from a source image
 */
export async function generateAllPwaIcons(
  imageSource: string | HTMLImageElement,
  themeColor: string = '#0284c7'
): Promise<GeneratedPwaIcon[]> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const results: GeneratedPwaIcon[] = [];

  for (const config of PWA_ICON_CONFIGS) {
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Apply background according to purpose
    if (config.style === 'maskable_solid') {
      // Solid brand background for Maskable and iOS Apple Touch
      ctx.fillStyle = themeColor;
      ctx.fillRect(0, 0, config.width, config.height);
    } else {
      // Transparent background
      ctx.clearRect(0, 0, config.width, config.height);
    }

    // Calculate dimensions to maintain aspect ratio and fit within target scale
    const targetW = config.width * config.scale;
    const targetH = config.height * config.scale;

    const imgAspect = img.width / img.height;
    let drawW = targetW;
    let drawH = targetH;

    if (imgAspect > 1) {
      drawH = drawW / imgAspect;
    } else {
      drawW = drawH * imgAspect;
    }

    const drawX = (config.width - drawW) / 2;
    const drawY = (config.height - drawH) / 2;

    // Draw the image onto canvas
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // If it's the Android Notification Badge (monochrome):
    // Android status bar requires all opaque pixels to be pure white silhouette on transparent canvas
    if (config.style === 'badge_monochrome') {
      const imgData = ctx.getImageData(0, 0, config.width, config.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 20) {
          data[i] = 255;     // R
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
          // preserve alpha
        } else {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/png');
    results.push({
      id: config.id,
      name: config.name,
      size: `${config.width}x${config.height}`,
      purpose: config.purpose,
      dataUrl,
      width: config.width,
      height: config.height,
    });
  }

  return results;
}

/**
 * Otomatis meregenerasi atau memetakan ulang ke-11 ikon standar PWA saat logo diperbarui:
 * 1. Mengadaptasi ke masing-masing peruntukan (Android Any, Maskable Safe Zone, iOS Touch, Android Badge Monochrome, Windows Tile, Favicon).
 * 2. Menyimpan daftar ikon ke localStorage ('jti_pwa_icons').
 * 3. Menyinkronkan file ikon fisik ke server via /api/pwa/update-icons (folder /public/icons/ & root favicon).
 * 4. Memperbarui favicon tab browser dan nama judul seketika tanpa refresh.
 * 5. Menyiarkan event 'pwa-icons-updated' agar seluruh komponen UI tersinkronisasi.
 */
export async function autoSyncPwaIconsFromLogo(
  logoUrl?: string,
  themeColor: string = '#0284c7',
  appName?: string
): Promise<PwaIconItem[]> {
  if (typeof window === 'undefined') return DEFAULT_PWA_ICONS;

  // Kasus 1: Logo dihapus / kosong -> Kembalikan ke 11 ikon bawaan default
  if (!logoUrl || !logoUrl.trim()) {
    try {
      localStorage.setItem('jti_pwa_icons', JSON.stringify(DEFAULT_PWA_ICONS));
    } catch {}

    updateDocumentFavicon('/icons/favicon-32.png');
    if (appName) {
      updateDocumentTitle(appName);
    }

    window.dispatchEvent(
      new CustomEvent('pwa-icons-updated', {
        detail: {
          icon: '/icons/favicon-32.png',
          name: appName,
          icons: DEFAULT_PWA_ICONS,
          isReset: true,
        },
      })
    );

    return DEFAULT_PWA_ICONS;
  }

  // Kasus 2: Logo memiliki URL / base64 valid -> Generate ke-11 varian ikon
  try {
    const cleanLogoUrl = logoUrl.trim();
    const generatedList = await generateAllPwaIcons(cleanLogoUrl, themeColor);

    // Kirim ke endpoint backend agar ditulis langsung ke public/icons/ dan root favicon
    try {
      await fetch('/api/pwa/update-icons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icons: generatedList }),
      });
    } catch (serverErr) {
      console.warn('[PWA Auto-Sync Notice] Local canvas storage active:', serverErr);
    }

    const updatedIcons: PwaIconItem[] = generatedList.map((g) => ({
      id: g.id,
      name: g.name,
      size: g.size,
      purpose: g.purpose,
      path: g.dataUrl,
      isCustom: true,
    }));

    try {
      localStorage.setItem('jti_pwa_icons', JSON.stringify(updatedIcons));
    } catch {}

    const faviconVariant =
      generatedList.find((g) => g.name === 'favicon-32.png') ||
      generatedList.find((g) => g.name.includes('favicon')) ||
      generatedList[0];

    if (faviconVariant?.dataUrl) {
      updateDocumentFavicon(faviconVariant.dataUrl);
    }
    if (appName) {
      updateDocumentTitle(appName);
    }

    window.dispatchEvent(
      new CustomEvent('pwa-icons-updated', {
        detail: {
          icon: faviconVariant?.dataUrl || cleanLogoUrl,
          name: appName,
          icons: updatedIcons,
        },
      })
    );

    return updatedIcons;
  } catch (err: any) {
    console.error('[autoSyncPwaIconsFromLogo] Gagal meregenerasi ikon PWA:', err);
    throw err;
  }
}
