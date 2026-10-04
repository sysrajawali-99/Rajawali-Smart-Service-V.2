/**
 * PWA Icon Generator Utility
 * Generates all 11 standardized PWA and device icon variants from a single image source.
 * Adapts each variant according to its specific purpose (any, maskable, iOS, Android badge, Windows, Favicon).
 */

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
