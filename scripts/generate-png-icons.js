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

  // IHDR: width(4), height(4), bitDepth(1=8), colorType(1=6: RGBA), comp(0), filter(0), interlace(0)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowBytes));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter 0 (None)
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

// Draw Smart Cleaning icon
// Palette: Theme Sky-600 #0284c7 (2, 132, 199), Accent Amber #f59e0b, White #ffffff
function drawIconPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background gradient: from deep sky #0369a1 to vibrant sky #0ea5e9
  const gradY = y / h;
  let bgR = Math.round(3 + gradY * 11);
  let bgG = Math.round(105 + gradY * 60);
  let bgB = Math.round(161 + gradY * 72);
  let bgA = 255;

  if (!isMaskable) {
    // Rounded squircle / rounded rect for non-maskable icon
    const radius = w * 0.22;
    const qx = Math.max(0, Math.abs(dx) - (cx - radius));
    const qy = Math.max(0, Math.abs(dy) - (cy - radius));
    const cornerDist = Math.sqrt(qx * qx + qy * qy);
    if (cornerDist > radius) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }
  }

  // Safe inner scale
  const scale = isMaskable ? 0.65 : 0.85;
  const normX = dx / (cx * scale); // -1 to 1
  const normY = dy / (cy * scale); // -1 to 1

  // Decorative inner shield/badge outline
  const shieldRadius = 0.88;
  const normDist = Math.sqrt(normX * normX + normY * normY);
  if (normDist > 0.84 && normDist < shieldRadius) {
    // Subtle white glow ring
    return [255, 255, 255, 120];
  }

  // Draw Letter "S" (left side) and "C" (right side)
  // "S" center around normX: -0.42, normY: 0
  // "C" center around normX: +0.42, normY: 0
  const sx = normX + 0.38;
  const sy = normY;
  const cx2 = normX - 0.38;
  const cy2 = normY;

  // Let's render clean bold geometric typography for "S":
  // Top horizontal bar: sy between -0.42 and -0.26, sx between -0.28 and 0.28
  // Middle horizontal bar: sy between -0.08 and 0.08, sx between -0.26 and 0.26
  // Bottom horizontal bar: sy between 0.26 and 0.42, sx between -0.28 and 0.28
  // Top-left vertical stem: sx between -0.28 and -0.12, sy between -0.35 and 0.0
  // Bottom-right vertical stem: sx between 0.12 and 0.28, sy between 0.0 and 0.35
  const inSTop = sy >= -0.42 && sy <= -0.26 && sx >= -0.28 && sx <= 0.28;
  const inSMid = sy >= -0.08 && sy <= 0.08 && sx >= -0.26 && sx <= 0.26;
  const inSBot = sy >= 0.26 && sy <= 0.42 && sx >= -0.28 && sx <= 0.28;
  const inSLeftStem = sx >= -0.28 && sx <= -0.12 && sy >= -0.35 && sy <= 0.02;
  const inSRightStem = sx >= 0.12 && sx <= 0.28 && sy >= -0.02 && sy <= 0.35;

  if (inSTop || inSMid || inSBot || inSLeftStem || inSRightStem) {
    return [255, 255, 255, 255];
  }

  // Render clean bold geometric typography for "C":
  // Top horizontal bar: cy2 between -0.42 and -0.26, cx2 between -0.26 and 0.28
  // Bottom horizontal bar: cy2 between 0.26 and 0.42, cx2 between -0.26 and 0.28
  // Left vertical spine: cx2 between -0.28 and -0.12, cy2 between -0.35 and 0.35
  const inCTop = cy2 >= -0.42 && cy2 <= -0.26 && cx2 >= -0.26 && cx2 <= 0.28;
  const inCBot = cy2 >= 0.26 && cy2 <= 0.42 && cx2 >= -0.26 && cx2 <= 0.28;
  const inCLeft = cx2 >= -0.28 && cx2 <= -0.12 && cy2 >= -0.35 && cy2 <= 0.35;

  if (inCTop || inCBot || inCLeft) {
    return [255, 255, 255, 255];
  }

  // Sparkle / Star of cleanliness in upper right (around normX: 0.65, normY: -0.55)
  const sparkX = normX - 0.58;
  const sparkY = normY + 0.58;
  const sparkDist = Math.sqrt(sparkX * sparkX + sparkY * sparkY);
  const sparkAngle = Math.atan2(sparkY, sparkX);
  // 4-point star shape: r = a * (cos(2 * theta)^2)
  const starR = 0.18 * Math.pow(Math.abs(Math.cos(2 * sparkAngle)), 3);
  if (sparkDist < starR) {
    return [251, 191, 36, 255]; // Amber shine #fbbf24
  }

  return [bgR, bgG, bgB, bgA];
}

const iconsDir = path.resolve(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. icon-192.png (192x192)
fs.writeFileSync(
  path.join(iconsDir, 'icon-192.png'),
  generatePNG(192, 192, (x, y, w, h) => drawIconPixel(x, y, w, h, false))
);

// 2. icon-512.png (512x512)
fs.writeFileSync(
  path.join(iconsDir, 'icon-512.png'),
  generatePNG(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, false))
);

// 3. maskable-512.png (512x512)
fs.writeFileSync(
  path.join(iconsDir, 'maskable-512.png'),
  generatePNG(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, true))
);

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(
  path.join(iconsDir, 'apple-touch-icon.png'),
  generatePNG(180, 180, (x, y, w, h) => drawIconPixel(x, y, w, h, false))
);

console.log('PWA PNG icons generated successfully:');
console.log('- public/icons/icon-192.png');
console.log('- public/icons/icon-512.png');
console.log('- public/icons/maskable-512.png');
console.log('- public/icons/apple-touch-icon.png');
