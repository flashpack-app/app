/* eslint-disable */
// Converts .cube 3D LUTs into 2D "strip" PNG textures for GPU sampling in Skia.
//
// Output layout (horizontal strip):
//   width  = size * size   (one size x size tile per blue slice)
//   height = size
//   tile b occupies columns [b*size, b*size + size)
//   within a tile: local x = red index, y = green index
//
// Usage: node scripts/convertLuts.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', 'src', 'assets', 'LUTs');
const OUT = path.join(ROOT, 'generated');

const GROUPS = [
  { dir: path.join(ROOT, 'freeLUTs') },
  { dir: path.join(ROOT, 'proLUTs') },
];

// ---- PNG encoder (8-bit RGBA) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- .cube parser ----
function parseCube(text) {
  let size = 0;
  const data = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.startsWith('TITLE')) continue;
    if (t.startsWith('LUT_3D_SIZE')) {
      size = parseInt(t.split(/\s+/)[1], 10);
      continue;
    }
    if (t.startsWith('LUT_1D_SIZE')) {
      throw new Error('1D LUTs not supported');
    }
    if (t.startsWith('DOMAIN_MIN') || t.startsWith('DOMAIN_MAX') || t.startsWith('LUT_3D_INPUT_RANGE')) {
      continue;
    }
    const parts = t.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        data.push([r, g, b]);
      }
    }
  }
  if (!size || data.length !== size * size * size) {
    throw new Error(`bad cube: size=${size} entries=${data.length}`);
  }
  return { size, data };
}

function clamp8(v) {
  const n = Math.round(v * 255);
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

function convertFile(file, outName) {
  const text = fs.readFileSync(file, 'utf8');
  const { size, data } = parseCube(text);
  const width = size * size;
  const height = size;
  const rgba = Buffer.alloc(width * height * 4);
  // .cube ordering: red index varies fastest, then green, then blue
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const idx = r + g * size + b * size * size;
        const [cr, cg, cb] = data[idx];
        const px = b * size + r;
        const py = g;
        const o = (py * width + px) * 4;
        rgba[o] = clamp8(cr);
        rgba[o + 1] = clamp8(cg);
        rgba[o + 2] = clamp8(cb);
        rgba[o + 3] = 255;
      }
    }
  }
  const png = encodePng(width, height, rgba);
  fs.writeFileSync(path.join(OUT, outName), png);
  return { size, width, height, bytes: png.length };
}

function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const manifest = {};
  for (const g of GROUPS) {
    const files = fs.readdirSync(g.dir).filter((f) => f.toLowerCase().endsWith('.cube'));
    for (const f of files) {
      const base = path.basename(f, path.extname(f)).toLowerCase();
      const outName = `${base}.png`;
      const info = convertFile(path.join(g.dir, f), outName);
      manifest[base] = info.size;
      console.log(`${f} -> generated/${outName}  (${info.width}x${info.height}, size=${info.size}, ${(info.bytes / 1024).toFixed(0)}kb)`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone. Manifest:', manifest);
}

main();
