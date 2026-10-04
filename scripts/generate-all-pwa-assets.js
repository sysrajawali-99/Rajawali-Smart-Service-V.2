import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, drawPixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colorType RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdr);

  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowBytes));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Brand color palette:
 * Primary: #0284c7 (rgb: 2, 132, 199)
 * Dark Accent: #0369a1 (rgb: 3, 105, 161)
 * Sparkle Yellow: #fbbf24 (rgb: 251, 191, 36)
 * White: #ffffff (rgb: 255, 255, 255)
 */

// Draw brand cleaning sparkle & broom badge
function drawBrandPixel(x, y, w, h, mode) {
  // mode: 'transparent' | 'solid' | 'badge_silhouette'
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;

  // Mode badge_silhouette: Pure white icon on transparent background for Android Notification Bar
  if (mode === 'badge_silhouette') {
    const scale = 0.7;
    const nx = dx / (cx * scale);
    const ny = dy / (cy * scale);
    const dist = Math.sqrt(nx * nx + ny * ny);

    // Star sparkle in center
    const angle = Math.atan2(ny, nx);
    const starR = 0.85 * Math.pow(Math.abs(Math.cos(2 * angle)), 3);
    if (dist < starR) {
      return [255, 255, 255, 255];
    }
    // Small diamond sparkles
    const d1 = Math.abs(nx - 0.7) + Math.abs(ny + 0.6);
    const d2 = Math.abs(nx + 0.7) + Math.abs(ny - 0.6);
    if (d1 < 0.25 || d2 < 0.22) {
      return [255, 255, 255, 255];
    }
    return [0, 0, 0, 0];
  }

  // Base background
  let bgR = 2, bgG = 132, bgB = 199, bgA = 255;
  if (mode === 'transparent') {
    // Check if inside rounded shield / badge
    const radius = w * 0.46;
    const cornerDist = Math.sqrt(dx * dx + dy * dy);
    if (cornerDist > radius) {
      return [0, 0, 0, 0]; // Transparent outside circle
    }
  }

  // Solid background with soft top-to-bottom subtle gradient
  const gradY = y / h;
  bgR = Math.round(3 + gradY * 8);
  bgG = Math.round(115 + gradY * 35);
  bgB = Math.round(180 + gradY * 35);
  bgA = 255;

  // Safe zone scaling: maskable uses 0.62 safe zone, solid/transparent uses 0.78
  const safeScale = mode === 'maskable' ? 0.62 : 0.78;
  const nx = dx / (cx * safeScale);
  const ny = dy / (cy * safeScale);

  // Decorative inner white subtle border ring
  const ringDist = Math.sqrt(nx * nx + ny * ny);
  if (ringDist > 0.94 && ringDist < 0.99) {
    return [255, 255, 255, 110];
  }

  // Main emblem: Stylized Sparkle / Diamond Star of Cleanliness + Clean Waves
  // 1. 4-pointed sparkle star in center-right
  const sparkX = nx - 0.15;
  const sparkY = ny + 0.15;
  const sparkDist = Math.sqrt(sparkX * sparkX + sparkY * sparkY);
  const sparkAngle = Math.atan2(sparkY, sparkX);
  const starR = 0.72 * Math.pow(Math.abs(Math.cos(2 * sparkAngle)), 2.8);

  if (sparkDist < starR) {
    // Star center gradient to warm gold/amber
    if (sparkDist < starR * 0.45) {
      return [254, 240, 138, 255]; // Yellow gold
    }
    return [255, 255, 255, 255]; // Crisp white
  }

  // 2. Small secondary sparkle star in top-left
  const s2X = nx + 0.52;
  const s2Y = ny + 0.48;
  const s2Dist = Math.sqrt(s2X * s2X + s2Y * s2Y);
  const s2Angle = Math.atan2(s2Y, s2X);
  const s2R = 0.32 * Math.pow(Math.abs(Math.cos(2 * s2Angle)), 3);
  if (s2Dist < s2R) {
    return [251, 191, 36, 255]; // Amber shine
  }

  // 3. Small tertiary sparkle star in bottom-right
  const s3X = nx - 0.55;
  const s3Y = ny - 0.52;
  const s3Dist = Math.sqrt(s3X * s3X + s3Y * s3Y);
  const s3Angle = Math.atan2(s3Y, s3X);
  const s3R = 0.22 * Math.pow(Math.abs(Math.cos(2 * s3Angle)), 3);
  if (s3Dist < s3R) {
    return [255, 255, 255, 230];
  }

  // 4. Stylized dynamic swoosh / cleaning bubble arcs
  // Arc 1 (lower left swoosh)
  const arcDist1 = Math.sqrt((nx + 0.3) * (nx + 0.3) + (ny - 0.2) * (ny - 0.2));
  if (arcDist1 > 0.48 && arcDist1 < 0.62 && ny > -0.1 && nx < 0.3) {
    return [255, 255, 255, 240];
  }
  // Arc 2 (inner sparkle wave)
  const arcDist2 = Math.sqrt((nx + 0.2) * (nx + 0.2) + (ny - 0.1) * (ny - 0.1));
  if (arcDist2 > 0.68 && arcDist2 < 0.78 && ny > -0.3 && nx < 0.4) {
    return [224, 242, 254, 210]; // Light ice blue
  }

  return [bgR, bgG, bgB, bgA];
}

const rootPublic = path.resolve(process.cwd(), 'public');
const iconsDir = path.resolve(rootPublic, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons and brand assets...');

// 1. icon-192.png & icon-512.png (purpose any, transparent background outer)
fs.writeFileSync(
  path.join(iconsDir, 'icon-192.png'),
  generatePNG(192, 192, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'transparent'))
);
fs.writeFileSync(
  path.join(iconsDir, 'icon-512.png'),
  generatePNG(512, 512, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'transparent'))
);

// 2. maskable-192.png & maskable-512.png (purpose maskable, SOLID background with 80% safe zone)
fs.writeFileSync(
  path.join(iconsDir, 'maskable-192.png'),
  generatePNG(192, 192, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'maskable'))
);
fs.writeFileSync(
  path.join(iconsDir, 'maskable-512.png'),
  generatePNG(512, 512, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'maskable'))
);

// 3. Apple Touch Icons: 180 (iPhone/iPad), 152, 167 (iPad Pro)
fs.writeFileSync(
  path.join(iconsDir, 'apple-touch-icon-180.png'),
  generatePNG(180, 180, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'))
);
fs.writeFileSync(
  path.join(iconsDir, 'apple-touch-icon-152.png'),
  generatePNG(152, 152, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'))
);
fs.writeFileSync(
  path.join(iconsDir, 'apple-touch-icon-167.png'),
  generatePNG(167, 167, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'))
);
fs.writeFileSync(
  path.join(iconsDir, 'apple-touch-icon.png'),
  generatePNG(180, 180, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'))
);
fs.writeFileSync(
  path.join(rootPublic, 'apple-touch-icon.png'),
  generatePNG(180, 180, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'))
);

// 4. Favicons (16, 32, 48)
const fav16 = generatePNG(16, 16, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'));
const fav32 = generatePNG(32, 32, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'));
fs.writeFileSync(path.join(iconsDir, 'favicon-16.png'), fav16);
fs.writeFileSync(path.join(iconsDir, 'favicon-32.png'), fav32);
fs.writeFileSync(path.join(rootPublic, 'favicon.png'), fav32);

// 5. Minimal valid multi-res ICO file containing 16x16 & 32x32 PNG entries
function createIcoFromPngs(pngBuffers) {
  // ICO Header: reserved(2)=0, type(2)=1, count(2)
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];

  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    const dir = Buffer.alloc(16);
    dir.writeUInt8(width >= 256 ? 0 : width, 0);
    dir.writeUInt8(height >= 256 ? 0 : height, 1);
    dir.writeUInt8(0, 2); // colors
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(png.length, 8); // size
    dir.writeUInt32LE(offset, 12); // offset
    dirEntries.push(dir);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

const icoBuffer = createIcoFromPngs([fav16, fav32]);
fs.writeFileSync(path.join(rootPublic, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(iconsDir, 'favicon.ico'), icoBuffer);

// 6. badge-72.png (pure white silhouette on transparent for Android Push Notifications)
fs.writeFileSync(
  path.join(iconsDir, 'badge-72.png'),
  generatePNG(72, 72, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'badge_silhouette'))
);

// 7. mstile-150.png (Windows tile 150x150)
fs.writeFileSync(
  path.join(iconsDir, 'mstile-150.png'),
  generatePNG(150, 150, (x, y, w, h) => drawBrandPixel(x, y, w, h, 'solid'))
);

// 8. safari-pinned-tab.svg (monochrome SVG silhouette)
const safariSvg = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path fill="#000000" d="M50 5 Q52 40 85 45 Q52 50 50 95 Q48 50 15 45 Q48 40 50 5 Z M25 20 Q26 30 35 32 Q26 34 25 45 Q24 34 15 32 Q24 30 25 20 Z" />
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'safari-pinned-tab.svg'), safariSvg.trim());

// 9. browserconfig.xml for Windows/Edge tiles
const browserConfigXml = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/icons/mstile-150.png"/>
      <TileColor>#0284c7</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
fs.writeFileSync(path.join(rootPublic, 'browserconfig.xml'), browserConfigXml.trim());

// 10. offline.html - Pristine Indonesian offline fallback page
const offlineHtml = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Mode Offline - Smart Cleaning Operations</title>
    <meta name="theme-color" content="#0284c7" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #0f172a;
        color: #f8fafc;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
      }
      .card {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 20px;
        padding: 32px 24px;
        max-width: 420px;
        width: 100%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .icon-box {
        width: 72px;
        height: 72px;
        border-radius: 20px;
        background: linear-gradient(135deg, #0284c7, #0369a1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        box-shadow: 0 10px 15px -3px rgba(2, 132, 199, 0.4);
      }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 9999px;
        background-color: #f59e0b20;
        color: #fbbf24;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
        border: 1px solid #f59e0b40;
      }
      h1 {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #f8fafc;
      }
      p {
        font-size: 14px;
        color: #94a3b8;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      .btn {
        display: block;
        width: 100%;
        padding: 12px 20px;
        background-color: #0284c7;
        color: #ffffff;
        font-weight: 600;
        font-size: 14px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
        text-decoration: none;
      }
      .btn:hover { background-color: #0369a1; }
      .tips {
        margin-top: 20px;
        font-size: 12px;
        color: #64748b;
        background-color: #0f172a80;
        padding: 12px;
        border-radius: 10px;
        border: 1px dashed #334155;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon-box">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
      <div class="badge">Koneksi Internet Terputus</div>
      <h1>Anda Sedang Offline</h1>
      <p>
        Aplikasi Smart Cleaning Operations tetap dapat digunakan untuk mengisi ceklist area dalam mode offline. Data yang Anda simpan akan otomatis tersinkronisasi saat sinyal kembali normal.
      </p>
      <button class="btn" onclick="window.location.reload()">Coba Muat Ulang Halaman</button>
      <div class="tips">
        💡 Data yang tersimpan di perangkat aman dalam antrean outbox lokal dan tidak akan hilang.
      </div>
    </div>
  </body>
</html>`;
fs.writeFileSync(path.join(rootPublic, 'offline.html'), offlineHtml.trim());

console.log('All PWA icons and brand assets generated successfully!');
