import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseJson, parseProjects } from '../src/lib/content';

// Every letter a film's name or synopsis carries must come from the site's own type — the owner's
// "Ăn Hỏi" Ceremony (2026-09-27) showed its Ỏ in a system font, because Clash Display and Bodoni
// Moda stop short of the Vietnamese block. The voices in tokens.css name companion faces for it.

const pub = fileURLToPath(new URL('../public/', import.meta.url));
const css = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8');

// WOFF2's known-table tags, by directory index (WOFF2 spec §5.1)
const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep',
  'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln',
  'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf',
  'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

/** The code points a .woff2 maps to a real glyph — just enough WOFF2 to reach its cmap (formats 4 and 12). */
function codepoints(file: string): Set<number> {
  const buf = readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file}: not woff2`);
  const n = buf.readUInt16BE(12);
  let o = 48;
  const b128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) { const x = buf[o++]; v = v * 128 + (x & 127); if (!(x & 128)) return v; }
    throw new Error('bad UIntBase128');
  };
  const dir: { tag: string; len: number }[] = [];
  for (let i = 0; i < n; i++) {
    const f = buf[o++];
    let tag = TAGS[f & 63];
    if ((f & 63) === 63) { tag = buf.toString('latin1', o, o + 4); o += 4; }
    const orig = b128();
    const transformed = tag === 'glyf' || tag === 'loca' ? f >> 6 === 0 : f >> 6 !== 0;
    dir.push({ tag, len: transformed ? b128() : orig });
  }
  const data = brotliDecompressSync(buf.subarray(o, o + buf.readUInt32BE(20)));
  let off = 0;
  let cmap: Buffer | null = null;
  for (const t of dir) { if (t.tag === 'cmap') cmap = data.subarray(off, off + t.len); off += t.len; }
  if (!cmap) throw new Error(`${file}: no cmap`);
  const out = new Set<number>();
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const at = cmap.readUInt32BE(8 + i * 8);
    const fmt = cmap.readUInt16BE(at);
    if (fmt === 12) {
      for (let g = 0; g < cmap.readUInt32BE(at + 12); g++)
        for (let c = cmap.readUInt32BE(at + 16 + g * 12); c <= cmap.readUInt32BE(at + 20 + g * 12); c++) out.add(c);
    } else if (fmt === 4) {
      const seg = cmap.readUInt16BE(at + 6) / 2;
      const ends = at + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ros = deltas + seg * 2;
      for (let s = 0; s < seg; s++) {
        const start = cmap.readUInt16BE(starts + s * 2), end = cmap.readUInt16BE(ends + s * 2);
        const d = cmap.readUInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ros + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const gi = ro === 0 ? (c + d) & 0xffff : cmap.readUInt16BE(ros + s * 2 + ro + (c - start) * 2);
          if (gi !== 0) out.add(c);
        }
      }
    }
  }
  return out;
}

const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => ({
  family: /font-family:\s*'([^']+)'/.exec(m[1])![1],
  url: /url\('([^']+)'\)/.exec(m[1])![1],
  body: m[1],
}));
/** A voice's families in order, e.g. `--f-display` → ['Clash Display', …, 'system-ui', 'sans-serif']. */
const stack = (voice: string) =>
  new RegExp(`--${voice}:\\s*([^;]+);`).exec(css)![1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
/** Everything the voice's self-hosted faces can draw, before any system fallback. */
const drawable = (voice: string) => {
  const all = new Set<number>();
  for (const fam of stack(voice))
    for (const f of faces.filter((x) => x.family === fam)) for (const c of codepoints(pub + f.url.slice(1))) all.add(c);
  return all;
};
const missing = (text: string, set: Set<number>) =>
  [...new Set([...text, ...text.toUpperCase()])].filter((ch) => !set.has(ch.codePointAt(0)!));

describe('the site draws every letter in its own type', () => {
  const films = parseProjects(parseJson(readFileSync(pub + 'content/projects.json', 'utf8'), 'projects.json'));

  it('every film title, in the display voice (dossier headline, ticker, next-link)', () => {
    const display = drawable('f-display');
    for (const p of films) expect(missing(p.title, display), p.slug).toEqual([]);
  });

  it('every film title and synopsis, in the serif voice (hover label, synopsis)', () => {
    const serif = drawable('f-serif');
    for (const p of films) expect(missing(`${p.title} ${p.synopsis}`, serif), p.slug).toEqual([]);
  });

  it('the Vietnamese companions stand second in their voices, and the micro voice falls back to Geist Mono', () => {
    expect(stack('f-display').slice(0, 2)).toEqual(['Clash Display', 'RVL Viet Display']);
    expect(stack('f-serif').slice(0, 2)).toEqual(['Bodoni Moda', 'RVL Viet Serif']);
    expect(stack('f-micro').slice(0, 2)).toEqual(['Martian Mono', 'Geist Mono']); // Geist Mono has the whole block
  });

  it('each companion face is on disk, covers the Vietnamese block, and keeps its primary\'s line metrics', () => {
    const viet = [0x1a0, 0x1a1, 0x1af, 0x1b0, ...Array.from({ length: 0x1ef9 - 0x1ea0 + 1 }, (_, i) => 0x1ea0 + i)];
    const companions = faces.filter((f) => f.family.startsWith('RVL Viet'));
    expect(companions.map((f) => f.family)).toEqual(['RVL Viet Display', 'RVL Viet Display', 'RVL Viet Serif']);
    for (const f of companions) {
      expect(existsSync(pub + f.url.slice(1)), f.url).toBe(true);
      const cps = codepoints(pub + f.url.slice(1));
      expect(viet.filter((c) => !cps.has(c)).map((c) => c.toString(16)), f.url).toEqual([]);
      // a borrowed letter must not stretch the line: the companion wears its primary's ascent/descent/gap
      const want = f.family === 'RVL Viet Display' ? ['89%', '25%', '9%'] : ['112.5%', '40%', '0%'];
      expect([/ascent-override:\s*([\d.]+%)/, /descent-override:\s*([\d.]+%)/, /line-gap-override:\s*([\d.]+%)/]
        .map((re) => re.exec(f.body)?.[1]), f.url).toEqual(want);
    }
  });
});
