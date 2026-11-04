/**
 * App Icon Badging & Persistent Notification Utility
 * Mendukung App Badging API resmi PWA (navigator.setAppBadge & navigator.clearAppBadge),
 * Fallback Favicon Badge dengan HTML5 Canvas, dan Prefix Indikator pada Judul Tab Dokumen.
 */

import { getActiveAppIcon, updateDocumentFavicon } from './dynamicFavicon';

let baseDocumentTitle = '';

/**
 * Memperbarui badge pada ikon aplikasi (PWA Home Screen / Taskbar)
 * serta badge angka pada favicon dan tab browser.
 */
export function setAppBadgeCount(count: number) {
  if (typeof window === 'undefined') return;

  // 1. Native PWA App Badging API (Android, Windows, macOS, ChromeOS, iOS 16.4+ PWA)
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch((err: any) => {
          console.warn('[AppBadge] setAppBadge notice:', err);
        });
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    } catch {}
  }

  // 2. Perbarui Judul Dokumen dengan prefix (N)
  try {
    if (!baseDocumentTitle) {
      baseDocumentTitle = document.title.replace(/^\(\d+\+?\)\s*/, '');
    }
    const cleanTitle = document.title.replace(/^\(\d+\+?\)\s*/, '');
    if (cleanTitle) {
      baseDocumentTitle = cleanTitle;
    }
    if (count > 0) {
      const displayCount = count > 99 ? '99+' : String(count);
      document.title = `(${displayCount}) ${baseDocumentTitle || 'Smart Cleaning Operations'}`;
    } else if (baseDocumentTitle) {
      document.title = baseDocumentTitle;
    }
  } catch {}

  // 3. Fallback Favicon Badging dengan Canvas untuk Tab Browser Desktop
  try {
    drawFaviconWithBadge(count);
  } catch (err) {
    console.warn('[AppBadge] drawFaviconWithBadge notice:', err);
  }
}

/**
 * Menghapus badge pada ikon aplikasi dan mengembalikan favicon serta judul dokumen ke kondisi normal.
 */
export function clearAppBadgeCount() {
  if (typeof window === 'undefined') return;

  // 1. Native PWA Badging
  if ('clearAppBadge' in navigator) {
    try {
      (navigator as any).clearAppBadge().catch(() => {});
    } catch {}
  }

  // 2. Kembalikan Judul Dokumen
  try {
    if (baseDocumentTitle) {
      document.title = baseDocumentTitle;
    } else {
      document.title = document.title.replace(/^\(\d+\+?\)\s*/, '');
    }
  } catch {}

  // 3. Kembalikan Favicon Normal
  try {
    const activeIcon = getActiveAppIcon();
    updateDocumentFavicon(activeIcon);
  } catch {}
}

/**
 * Menggambar badge angka merah pada favicon menggunakan HTML5 Canvas
 */
function drawFaviconWithBadge(count: number) {
  if (typeof document === 'undefined') return;

  if (count <= 0) {
    const defaultIcon = getActiveAppIcon();
    updateDocumentFavicon(defaultIcon);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const baseIconSrc = getActiveAppIcon();
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    try {
      ctx.clearRect(0, 0, 32, 32);
      // Gambar icon dasar
      ctx.drawImage(img, 0, 0, 32, 32);

      // Gambar lingkaran badge merah di pojok kanan atas
      const badgeText = count > 99 ? '99+' : String(count);
      const isWide = badgeText.length > 2;
      const badgeX = isWide ? 22 : 23;
      const badgeY = 9;
      const radius = isWide ? 9 : 8;

      ctx.beginPath();
      ctx.arc(badgeX, badgeY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444'; // Red 500
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Gambar teks angka pada badge
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isWide ? '8px' : '9px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX, badgeY + 0.5);

      const badgedDataUrl = canvas.toDataURL('image/png');
      updateDocumentFavicon(badgedDataUrl);
    } catch {}
  };

  img.onerror = () => {
    // Jika gambar dasar gagal dimuat, buat badge sederhana
    try {
      ctx.clearRect(0, 0, 32, 32);
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI);
      ctx.fillStyle = '#0284c7';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(24, 8, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(count > 9 ? '9+' : count), 24, 8.5);

      updateDocumentFavicon(canvas.toDataURL('image/png'));
    } catch {}
  };

  img.src = baseIconSrc;
}
