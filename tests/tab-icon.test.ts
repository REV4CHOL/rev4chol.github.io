import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

/** The tab icon (scripts/make-icons.py): the wordmark's R. in the site's own signal on its void, with the floor's
 *  registration crosses and the legend's tick rail in a dimmer signal. */

const PAGES = ['index.html', 'works.html', 'about.html', 'contact.html', 'project.html', 'story.html'];
const token = (name: string): number[] => {
  const m = readFileSync('src/styles/tokens.css', 'utf8').match(new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6})`));
  return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16));
};
const SIGNAL = token('signal');
const VOID = token('void');
const DIM = SIGNAL.map((s, i) => Math.round(0.55 * s + 0.45 * VOID[i]));
const hex = (c: number[]) => c.map((v) => v.toString(16).padStart(2, '0')).join('');

/** An .ico's frames, as its directory lists them. */
function icoFrames(file: string): { width: number; height: number; png: Buffer }[] {
  const b = readFileSync(file);
  expect(b.readUInt16LE(0)).toBe(0);
  expect(b.readUInt16LE(2)).toBe(1); // an icon, not a cursor
  return Array.from({ length: b.readUInt16LE(4) }, (_, i) => {
    const e = 6 + 16 * i;
    const size = b.readUInt32LE(e + 8);
    const at = b.readUInt32LE(e + 12);
    return { width: b[e] || 256, height: b[e + 1] || 256, png: b.subarray(at, at + size) };
  });
}

/** An 8-bit, non-interlaced RGB or RGBA PNG's pixels, each as 'rrggbb' (alpha checked opaque). */
function pngPixels(png: Buffer): { width: number; height: number; px: string[] } {
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let width = 0, height = 0, channels = 0;
  const idat: Buffer[] = [];
  for (let at = 8; at < png.length; ) {
    const len = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8); // bit depth
      expect(data[12]).toBe(0); // no interlace
      channels = { 2: 3, 6: 4 }[data[9]] ?? 0;
      expect(channels).toBeGreaterThan(0);
    }
    if (type === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      out[y * stride + x] = (v + [0, a, b, (a + b) >> 1, paeth][f]) & 255;
    }
  }
  const px: string[] = [];
  for (let i = 0; i < out.length; i += channels) {
    if (channels === 4) expect(out[i + 3]).toBe(255);
    px.push(out.subarray(i, i + 3).toString('hex'));
  }
  return { width, height, px };
}

describe('The tab icon', () => {
  it('is linked from every page but the archived ABOUT, which the browser asks /favicon.ico for on its own', () => {
    for (const page of PAGES) {
      const head = readFileSync(page, 'utf8').split('</head>')[0];
      expect(head, page).toContain('<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />');
      expect(head, page).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    }
    expect(readFileSync('about-old.html', 'utf8')).not.toContain('rel="icon"'); // (never touched)
  });

  it('carries 16, 32 and 48 px frames drawn in the site\'s signal and void, and the dim signal of the hardware', () => {
    const frames = icoFrames('public/favicon.ico');
    expect(frames.map((f) => f.width)).toEqual([16, 32, 48]);
    for (const f of frames) {
      const { width, height, px } = pngPixels(f.png);
      expect([width, height]).toEqual([f.width, f.height]);
      expect(new Set(px), `${f.width} px`).toEqual(new Set([hex(SIGNAL), hex(DIM), hex(VOID)]));
      expect(px.filter((c) => c === hex(SIGNAL)).length, `${f.width} px: the R. is signal`).toBeGreaterThan(f.width * 2);
      expect(px[0], `${f.width} px: the plate is void`).toBe(hex(VOID));
    }
  });

  it('has a 180 px home-screen icon: the R. in signal, under the grain, and a void the grain leaves alone', () => {
    const { width, height, px } = pngPixels(readFileSync('public/apple-touch-icon.png'));
    expect([width, height]).toEqual([180, 180]);
    const rgb = px.map((c) => [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)));
    const signal = rgb.filter(([r, g, b]) => Math.abs(r - SIGNAL[0]) <= 16 && Math.abs(g - SIGNAL[1]) <= 4 && Math.abs(b - SIGNAL[2]) <= 4);
    expect(signal.length).toBeGreaterThan(1500);
    const corner = rgb[0];
    corner.forEach((v, i) => expect(Math.abs(v - VOID[i])).toBeLessThanOrEqual(2));
  });
});
