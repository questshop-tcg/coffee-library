// Generates the PNG app icons (no dependencies): `node tools/make-icons.mjs`
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CREAM = [0xf4, 0xe6, 0xd4];
const CARAMEL = [0xcb, 0x8a, 0x4e];
const TOP = [0x4b, 0x2e, 0x1e];
const BOTTOM = [0x32, 0x1e, 0x14];
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// A V60 dripper with a drop, in unit coordinates.
function colorAt(x, y) {
  const dx = x - 0.5;
  if (y >= 0.25 && y <= 0.3 && Math.abs(dx) <= 0.31) return CREAM;
  if (y > 0.3 && y <= 0.58) {
    const hw = 0.27 - 0.2 * ((y - 0.3) / 0.28);
    if (Math.abs(dx) <= hw) return CREAM;
  }
  if (y >= 0.6 && y <= 0.635 && Math.abs(dx) <= 0.17) return CREAM;
  const cy = 0.775, r = 0.055, tip = 0.665;
  if (dx * dx + (y - cy) ** 2 <= r * r) return CARAMEL;
  if (y >= tip && y <= cy - r * 0.5 && Math.abs(dx) <= (y - tip) * 0.577) return CARAMEL;
  return lerp(TOP, BOTTOM, y);
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const ss = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const c = colorAt((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      const i = (py * size + px) * 4;
      buf[i] = acc[0] / (ss * ss); buf[i + 1] = acc[1] / (ss * ss); buf[i + 2] = acc[2] / (ss * ss); buf[i + 3] = 255;
    }
  }
  return png(size, size, buf);
}

const out = new URL('../icons/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]]) {
  writeFileSync(new URL(name, out), render(size));
  console.log('wrote', name);
}
