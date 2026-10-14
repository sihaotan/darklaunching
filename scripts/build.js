import { mkdir, copyFile, rm, readFile, writeFile, access } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function iconPng(size, grey = false) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const center = size / 2;
  const radius = size * 0.46;
  for (let y = 0; y < size; y += 1) {
    const row = (size * 4 + 1) * y;
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distance = Math.hypot(dx, dy);
      const offset = row + 1 + x * 4;
      if (distance > radius + 0.8) continue;
      const coverage = Math.max(0, Math.min(1, radius + 0.8 - distance));
      let red = 0x3d;
      let green = 0x5a;
      let blue = 0xfe;
      if (distance < size * 0.1) {
        red = 0x2f;
        green = 0xce;
        blue = 0x8b;
      } else if (distance <= size * 0.28 && distance >= size * 0.18) {
        red = 255;
        green = 255;
        blue = 255;
      }
      if (grey) {
        const shade = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
        red = shade;
        green = shade;
        blue = shade;
      }
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = Math.round(coverage * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'icons'), { recursive: true });

await esbuild.build({
  entryPoints: {
    background: join(root, 'src/background.js'),
    popup: join(root, 'src/popup.js'),
    content: join(root, 'src/content.js')
  },
  bundle: true,
  outdir: dist,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' }
});

await copyFile(join(root, 'src/manifest.json'), join(dist, 'manifest.json'));
await copyFile(join(root, 'src/popup.html'), join(dist, 'popup.html'));
await copyFile(join(root, 'src/popup.css'), join(dist, 'popup.css'));
for (const size of [16, 32, 48, 128]) {
  await writeFile(join(dist, 'icons', `icon${size}.png`), iconPng(size));
  await writeFile(join(dist, 'icons', `icon${size}-grey.png`), iconPng(size, true));
}

const licensePath = join(root, 'node_modules/@launchdarkly/js-client-sdk/LICENSE');
try {
  await access(licensePath);
  const license = await readFile(licensePath, 'utf8');
  await writeFile(
    join(dist, 'THIRD_PARTY_NOTICES.txt'),
    `This extension bundles @launchdarkly/js-client-sdk (Apache-2.0).\n\n${license}`
  );
} catch {
  // The license file is included when the SDK package is installed.
}

const content = await readFile(join(dist, 'content.js'), 'utf8');
if (content.includes('app.launchdarkly.com')) {
  throw new Error('The content script bundle references the LaunchDarkly REST API host.');
}
if (content.includes("apiKey")) {
  throw new Error('The content script bundle references apiKey.');
}
