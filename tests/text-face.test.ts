import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseAbout, parseJson } from '../src/lib/content';

// THE RUNNING TEXT'S FACE (owner, 2026-11-25, of a film's synopsis: "Do we have alternative fonts for this part? I really
// dont like this font too hard to read"; shown six faces they chose "E: Source Serif 4", and for its reach: "Every
// running line: the synopsis on every film page, ABOUT's statement and OP: paragraph, and CONTACT's line. The wordmark
// and the '&' stay as they are."). Source Serif 4 (SIL OFL), upright only, at weight 400 and optical size 20, in its
// own voice, --f-text. The serif voice, Bodoni Moda, keeps the REVACHOL wordmark and the homepage's great ampersand.

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const pub = fileURLToPath(new URL('../public/', import.meta.url));
const tokens = read('../src/styles/tokens.css');
const sheet = (f: string) => read(`../src/styles/${f}`);

const faces = [...tokens.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => ({
  family: /font-family:\s*'([^']+)'/.exec(m[1])![1],
  url: /url\('([^']+)'\)/.exec(m[1])![1],
  body: m[1],
}));
const text = faces.filter((f) => f.family === 'Source Serif 4');
const voice = (name: string) => /* the families a voice names, in order */
  new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)![1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
/** Every rule body a stylesheet gives a selector standing alone (".x {", at any indent). */
const rules = (src: string, sel: string) => {
  const out: string[] = [];
  const open = `${sel} {`;
  for (let i = src.indexOf(open); i > -1; i = src.indexOf(open, i + 1)) {
    const before = src.slice(src.lastIndexOf('\n', i) + 1, i);
    if (before.trim() === '') out.push(src.slice(i + open.length, src.indexOf('}', i)));
  }
  return out;
};

// Google Fonts' own subsets of Source Serif 4 (its css2 answer to a current browser), in its order
const RANGES: [string, string][] = [
  ['/fonts/SourceSerif4-Vietnamese-Var.woff2', 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB'],
  ['/fonts/SourceSerif4-LatinExt-Var.woff2', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF'],
  ['/fonts/SourceSerif4-Var.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
];

/** The code points a .woff2 maps to a glyph, and the axes its fvar table names (tag, min, default, max). */
function woff2(file: string): { cps: Set<number>; axes: [string, number, number, number][] } {
  const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep',
    'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
    'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln',
    'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf',
    'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
  const buf = readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file}: not woff2`);
  let o = 48;
  const b128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) { const x = buf[o++]; v = v * 128 + (x & 127); if (!(x & 128)) return v; }
    throw new Error('bad UIntBase128');
  };
  const dir: { tag: string; len: number }[] = [];
  for (let i = 0, n = buf.readUInt16BE(12); i < n; i++) {
    const f = buf[o++];
    let tag = TAGS[f & 63];
    if ((f & 63) === 63) { tag = buf.toString('latin1', o, o + 4); o += 4; }
    const orig = b128();
    const transformed = tag === 'glyf' || tag === 'loca' ? f >> 6 === 0 : f >> 6 !== 0;
    dir.push({ tag, len: transformed ? b128() : orig });
  }
  const data = brotliDecompressSync(buf.subarray(o, o + buf.readUInt32BE(20)));
  const t: Record<string, Buffer> = {};
  let off = 0;
  for (const d of dir) { t[d.tag] = data.subarray(off, off + d.len); off += d.len; }
  const cps = new Set<number>();
  const cmap = t.cmap;
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const at = cmap.readUInt32BE(8 + i * 8);
    const fmt = cmap.readUInt16BE(at);
    if (fmt === 12) {
      for (let g = 0; g < cmap.readUInt32BE(at + 12); g++)
        for (let c = cmap.readUInt32BE(at + 16 + g * 12); c <= cmap.readUInt32BE(at + 20 + g * 12); c++) cps.add(c);
    } else if (fmt === 4) {
      const seg = cmap.readUInt16BE(at + 6) / 2;
      const ends = at + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ros = deltas + seg * 2;
      for (let s = 0; s < seg; s++) {
        const start = cmap.readUInt16BE(starts + s * 2), end = cmap.readUInt16BE(ends + s * 2);
        const d = cmap.readUInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ros + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const gi = ro === 0 ? (c + d) & 0xffff : cmap.readUInt16BE(ros + s * 2 + ro + (c - start) * 2);
          if (gi !== 0) cps.add(c);
        }
      }
    }
  }
  const axes: [string, number, number, number][] = [];
  const fv = t.fvar;
  if (fv) for (let i = 0, a0 = fv.readUInt16BE(4); i < fv.readUInt16BE(8); i++) {
    const a = a0 + i * 20;
    axes.push([fv.toString('latin1', a, a + 4), fv.readInt32BE(a + 4) / 65536, fv.readInt32BE(a + 8) / 65536, fv.readInt32BE(a + 12) / 65536]);
  }
  return { cps, axes };
}

const span = (r: string) => r.split(',').map((x) => x.trim().slice(2).split('-').map((h) => parseInt(h, 16))).map(([a, b]) => [a, b ?? a]);
/** The file the browser takes a code point from: of the faces whose range holds it, the LAST declared. */
const fileFor = (cp: number) => {
  let won: string | null = null;
  for (const f of text) {
    const r = /unicode-range:\s*([^;]+);/.exec(f.body)![1];
    if (span(r).some(([a, b]) => cp >= a && cp <= b)) won = f.url;
  }
  return won;
};
const cache = new Map<string, Set<number>>();
const cpsOf = (url: string) => { if (!cache.has(url)) cache.set(url, woff2(pub + url.slice(1)).cps); return cache.get(url)!; };
/** Letters of a line (as written and in capitals) the text face would NOT draw from the file the browser picks. */
const undrawn = (line: string) => [...new Set([...line, ...line.toUpperCase()])].filter((ch) => {
  const cp = ch.codePointAt(0)!;
  if (cp < 0x21) return false; // spaces and breaks
  const f = fileFor(cp);
  return !f || !cpsOf(f).has(cp);
});

// the running lines (owner, 2026-11-25): ABOUT's statement and the OP: paragraph, CONTACT's line. A film's synopsis was
// the fourth until the owner took it off every film page the same day.
const LINES: [string, string][] = [
  ['about.css', '.a-statement'], ['about.css', '.a-bio-lead'], ['contact.css', '.c-vow'],
];

describe('the running text is set in Source Serif 4', () => {
  it('the text voice is Source Serif 4 first, with no Bodoni and no borrowed Vietnamese face in it', () => {
    const v = voice('f-text');
    expect(v[0]).toBe('Source Serif 4');
    expect(v.at(-1)).toBe('serif');
    expect(v.some((f) => /Bodoni|RVL Viet/.test(f)), v.join(', ')).toBe(false);
  });

  it('the three running lines use the text voice, upright, at weight 400 and optical size 20 (CONTACT\'s 16 px line: 16)', () => {
    for (const [file, sel] of LINES) {
      const opsz = sel === '.c-vow' ? 16 : 20;
      const found = rules(sheet(file), sel);
      expect(found.length, sel).toBeGreaterThan(0);
      const decl = found.filter((r) => r.includes('font-family:'));
      expect(decl.length, sel).toBe(1);
      expect(decl[0], sel).toContain('font-family: var(--f-text);');
      expect(decl[0], sel).toContain('font-weight: 400;');
      expect(decl[0], sel).toContain(`font-variation-settings: 'opsz' ${opsz};`);
      for (const r of found) expect(r, sel).not.toContain('italic');
    }
  });

  it("ABOUT's statement keeps the column Bodoni's 26ch made (16em: 32ch of Source Serif 4), so it stays on one line", () => {
    expect(rules(sheet('about.css'), '.a-statement')[0]).toContain('max-width: 32ch;');
  });

  it('nothing else takes the text voice', () => {
    const files = ['base.css', 'components.css', 'project.css', 'about.css', 'contact.css', 'story.css', 'stats.css'];
    const users = files.flatMap((f) => (sheet(f).match(/var\(--f-text\)/g) ?? []).map(() => f));
    expect(users.sort()).toEqual(['about.css', 'about.css', 'contact.css']);
  });

  it('the wordmark and the homepage\'s ampersand keep Bodoni Moda (the serif voice)', () => {
    expect(voice('f-serif').slice(0, 3)).toEqual(['RVL Viet Serif First', 'Bodoni Moda', 'RVL Viet Serif']);
    const comp = sheet('components.css');
    expect(rules(comp, '.brand')[0]).toContain('font-family: var(--f-serif);');
    expect(rules(comp, '.amp-bg')[0]).toContain('font-family: var(--f-serif); font-style: italic;');
  });

  it('three upright faces: Google\'s Vietnamese, Latin Extended and Latin subsets, in Google\'s order and ranges', () => {
    expect(text.map((f) => [f.url, /unicode-range:\s*([^;]+);/.exec(f.body)?.[1].trim()])).toEqual(RANGES);
    for (const f of text) {
      expect(f.body, f.url).toMatch(/font-weight:\s*200 900;/);
      expect(f.body, f.url).toMatch(/font-display:\s*swap;/);
      expect(f.body, f.url).not.toContain('italic'); // (no slanted face of it is declared, anywhere)
    }
    expect(faces.filter((f) => /SourceSerif/i.test(f.url)).length).toBe(3);
  });

  it('each file is a real woff2 on disk, of a sane size, with its weight and optical-size axes', () => {
    for (const [url] of RANGES) {
      const file = pub + url.slice(1);
      expect(existsSync(file), url).toBe(true);
      const size = readFileSync(file).length;
      expect(size, url).toBeGreaterThan(20_000);
      expect(size, url).toBeLessThan(160_000);
      expect(woff2(file).axes, url).toEqual([['wght', 200, 400, 900], ['opsz', 8, 20, 60]]);
    }
  });

  it('the Vietnamese block is drawn whole from its own subset (no letter pieced from a base and a loose accent)', () => {
    const viet = [0x102, 0x103, 0x110, 0x111, 0x128, 0x129, 0x168, 0x169, 0x1a0, 0x1a1, 0x1af, 0x1b0,
      ...Array.from({ length: 0x1ef9 - 0x1ea0 + 1 }, (_, i) => 0x1ea0 + i)];
    const want = '/fonts/SourceSerif4-Vietnamese-Var.woff2';
    for (const cp of viet) {
      const f = fileFor(cp)!;
      expect(cpsOf(f).has(cp), cp.toString(16)).toBe(true);
      if (cp >= 0x1ea0 && cp <= 0x1ef1) expect(f, cp.toString(16)).toBe(want); // (Ỳ..ỹ fall to Latin Extended, which carries them)
    }
    expect(undrawn('Miên Viễn Xiêu Lòng Ăn Hỏi Đ ơ ư ạ ề ỹ')).toEqual([]);
  });

  it('every letter of the three lines as they stand today comes from Source Serif 4', () => {
    const about = parseAbout(parseJson(read('../public/content/about/about.json'), 'about.json'));
    expect(undrawn(about.statement), 'statement').toEqual([]);
    expect(undrawn(about.bio[0] ?? ''), 'bio').toEqual([]);
    const vow = /<p class="c-vow">([^<]*)<\/p>/.exec(read('../contact.html'));
    expect(undrawn(vow![1]), 'vow').toEqual([]);
  });

  it('the pages that show it hold their boot until its Latin face is in: ABOUT, CONTACT, and no other (a film page has no running text since its synopsis left)', () => {
    const page = read('../src/shell/page.ts');
    expect(page).toMatch(/TEXT_FACE_PAGES[^=]*=\s*\[\s*'about',\s*'contact'\s*\]/);
    expect(page).toContain(`document.fonts.load('400 1rem "Source Serif 4"')`);
  });
});
