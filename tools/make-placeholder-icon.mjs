#!/usr/bin/env node
/**
 * Generate a placeholder 512×512 PNG for packaging builds.
 * Replace build/icon.png with a real logo at your earliest convenience.
 * Run: node tools/make-placeholder-icon.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 512;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function crc32(buf) {
  let c;
  const table = (crc32.table ??= (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, fill) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLen = size * 3 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter
    for (let x = 0; x < size; x++) {
      const off = y * rowLen + 1 + x * 3;
      // horizontal gradient for visual interest
      const t = x / size;
      raw[off] = Math.round(fill.r0 * (1 - t) + fill.r1 * t);
      raw[off + 1] = Math.round(fill.g0 * (1 - t) + fill.g1 * t);
      raw[off + 2] = Math.round(fill.b0 * (1 - t) + fill.b1 * t);
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(join(ROOT, 'build'), { recursive: true });

const png = makePng(SIZE, { r0: 37, g0: 99, b0: 235, r1: 147, g1: 51, b1: 234 });
writeFileSync(join(ROOT, 'build', 'icon.png'), png);
console.info(`Wrote build/icon.png (${png.length} bytes)`);
