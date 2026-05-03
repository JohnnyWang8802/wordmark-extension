// Generate PNG icons with Anthropic-inspired warm style
// Pure Node.js - no external dependencies
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xEDB88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function distance(x, y, cx, cy) {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
}

function isInRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return distance(x, y, r, r) <= r;
  if (x >= w - r && y < r) return distance(x, y, w - r, r) <= r;
  if (x < r && y >= h - r) return distance(x, y, r, h - r) <= r;
  if (x >= w - r && y >= h - r) return distance(x, y, w - r, h - r) <= r;
  return x >= 0 && x < w && y >= 0 && y < h;
}

function blendPixel(pixels, size, x, y, r, g, b, a) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;

  const srcA = a / 255;
  const dstA = pixels[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;

  pixels[idx] = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA);
  pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
  pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
  pixels[idx + 3] = Math.round(outA * 255);
}

function fillRect(pixels, size, x1, y1, x2, y2, r, g, b, a) {
  for (let y = Math.floor(y1); y <= Math.ceil(y2); y++) {
    for (let x = Math.floor(x1); x <= Math.ceil(x2); x++) {
      blendPixel(pixels, size, x, y, r, g, b, a);
    }
  }
}

function fillCircle(pixels, size, cx, cy, radius, r, g, b, a) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if (distance(x, y, cx, cy) <= radius) {
        blendPixel(pixels, size, x, y, r, g, b, a);
      }
    }
  }
}

function drawLine(pixels, size, x1, y1, x2, y2, thickness, r, g, b, a) {
  const len = distance(x1, y1, x2, y2);
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    fillCircle(pixels, size, px, py, thickness / 2, r, g, b, a);
  }
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cornerR = size * 0.22;

  // Background with warm gradient
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isInRoundedRect(x, y, size, size, cornerR)) continue;
      const idx = (y * size + x) * 4;
      const t = y / size;
      // #C87B4A → #A85A32
      pixels[idx] = Math.round(200 - 32 * t);
      pixels[idx + 1] = Math.round(123 - 33 * t);
      pixels[idx + 2] = Math.round(74 - 24 * t);
      pixels[idx + 3] = 255;
    }
  }

  const cx = size / 2;
  const cy = size / 2;

  // Draw bold "W" letter
  const thick = Math.max(2, Math.round(size * 0.09));
  const halfW = size * 0.28;
  const halfH = size * 0.22;
  const top = cy - halfH;
  const bot = cy + halfH;
  const left = cx - halfW;
  const right = cx + halfW;

  // W shape: 4 diagonal strokes meeting at bottom
  const gap = thick * 0.4;
  const midLeft = cx - halfW * 0.32;
  const midRight = cx + halfW * 0.32;
  const midTop = cy - halfH * 0.05;

  drawLine(pixels, size, left, top, midLeft - gap, bot, thick, 255, 255, 255, 245);
  drawLine(pixels, size, midLeft + gap, bot, cx, midTop, thick, 255, 255, 255, 245);
  drawLine(pixels, size, cx, midTop, midRight - gap, bot, thick, 255, 255, 255, 245);
  drawLine(pixels, size, midRight + gap, bot, right, top, thick, 255, 255, 255, 245);

  // Subtle underline
  const uY = bot + size * 0.07;
  const barH = Math.max(1, Math.round(size * 0.02));
  fillRect(pixels, size, cx - size * 0.13, uY, cx + size * 0.13, uY + barH, 255, 230, 200, 160);

  // Encode PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const rawRows = [];
  for (let y = 0; y < size; y++) {
    rawRows.push(Buffer.from([0]));
    rawRows.push(pixels.subarray(y * size * 4, (y + 1) * size * 4));
  }
  const compressed = zlib.deflateSync(Buffer.concat(rawRows));

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdrData),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const sz of [16, 48, 128]) {
  const png = createIcon(sz);
  fs.writeFileSync(`public/icons/icon${sz}.png`, png);
  console.log(`Created icon${sz}.png (${png.length} bytes)`);
}
