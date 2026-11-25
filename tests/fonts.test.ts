import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseAbout, parseJson, parseProjects } from '../src/lib/content';

// Every letter a film's name carries must come from the site's own type — the owner's
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

  it('every film title, in the display voice (dossier headline, ticker, next-link, the floor\'s caption, THE LIST)', () => {
    const display = drawable('f-display');
    for (const p of films) expect(missing(p.title, display), p.slug).toEqual([]);
  });

  it('sets every film\'s name in the display voice (owner 2026-10-13: "the font for project titles are very hard to read")', () => {
    const sheet = (f: string) => readFileSync(fileURLToPath(new URL(`../src/styles/${f}`, import.meta.url)), 'utf8');
    const families = (src: string, sel: string) => { // the font-family every rule for the selector sets
      const out: string[] = [];
      for (let i = src.indexOf(`\n${sel} {`); i > -1; i = src.indexOf(`\n${sel} {`, i + 1)) { const m = /font-family: ([^;]+);/.exec(src.slice(i, src.indexOf('}', i))); if (m) out.push(m[1]); }
      return out;
    };
    const comp = sheet('components.css'), proj = sheet('project.css');
    for (const [src, sel] of [[comp, '#tile-label .tl-title'], [comp, '.fl-title'], [comp, '.rl-title'], [proj, '.p-title, .p-title-ghost'], [proj, '.p-back, .p-nextlink'], [proj, '.p-ticker .tk, .p-ticker .tk-sep']] as const) {
      expect(families(src, sel), sel).toEqual(['var(--f-display)']);
    }
  });

  it('the Vietnamese companions stand on both sides of the primary in their voices; the micro voice names its own first and falls back to Geist Mono', () => {
    expect(stack('f-display').slice(0, 3)).toEqual(['RVL Viet Display First', 'Clash Display', 'RVL Viet Display']);
    expect(stack('f-serif').slice(0, 3)).toEqual(['RVL Viet Serif First', 'Bodoni Moda', 'RVL Viet Serif']);
    expect(stack('f-micro').slice(0, 3)).toEqual(['RVL Viet Micro First', 'Martian Mono', 'Geist Mono']); // Geist Mono has the whole block
  });

  it('each companion face is on disk, covers the Vietnamese block, and keeps its primary\'s line metrics', () => {
    const viet = [0x1a0, 0x1a1, 0x1af, 0x1b0, ...Array.from({ length: 0x1ef9 - 0x1ea0 + 1 }, (_, i) => 0x1ea0 + i)];
    const companions = faces.filter((f) => f.family.startsWith('RVL Viet') && !f.family.endsWith(' First'));
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

  // The owner, 2026-11-24, of EVER FARAWAY / MIÊN VIỄN: 'the "~" in Miên Viễn got demolished'. Clash Display has no Ễ of
  // its own, but it has Ê and a loose combining tilde, so the browser built the letter from those two glyphs, the tilde
  // beside the Ê and over the next letter, and never fell through to the companion. Measured in Chrome: Clash pieced 24
  // letters of the Vietnamese block that way, Bodoni Moda 48, none outside the block. So each companion stands a second
  // time, limited to that block and named FIRST in its voice: it takes those letters whole before the primary is asked.
  it('the Vietnamese block is drawn whole by the companions: a face limited to it leads the display and serif voices', () => {
    const first = faces.filter((f) => /^RVL Viet (Display|Serif) First$/.test(f.family)); // (the micro voice's has its own test below)
    expect(first.map((f) => f.family)).toEqual(['RVL Viet Display First', 'RVL Viet Display First', 'RVL Viet Serif First']);
    for (const f of first) {
      expect(/unicode-range:\s*([^;]+);/.exec(f.body)?.[1].trim(), f.url).toBe('U+1EA0-1EF9'); // (that block only: every other letter stays the primary's)
      const twin = faces.find((g) => g.family === f.family.replace(' First', '') && g.url === f.url);
      expect(twin, f.url).toBeDefined(); // (the same file as the companion it doubles…)
      for (const re of [/font-weight:\s*([^;]+);/, /ascent-override:\s*([\d.]+%)/, /descent-override:\s*([\d.]+%)/, /line-gap-override:\s*([\d.]+%)/])
        expect(re.exec(f.body)?.[1], f.url).toBe(re.exec(twin!.body)?.[1]); // (…with its weights and its line metrics)
    }
    for (const voice of ['f-display', 'f-serif']) expect(stack(voice)[0].endsWith(' First'), voice).toBe(true);
  });

  // The owner, 2026-11-25, of who directed seven films (Hồ Mai Phương, Minh Quốc / Myke, Tony Phạm, Nguyễn Lion, Võ
  // Thành Công, Bá Hương, Khang Nguyễn): a director's name stands in the micro voice on the wall's caption, THE LIST,
  // the phone's strip and the hero's readouts. Martian Mono has the accented letters other languages share (Ă Â Ê Ô,
  // the plain accents, Ẽ Ị Ọ Ụ Ỳ Ỹ, Đ) and no Vietnamese beyond them. Measured in Chrome over the alphabet's 134
  // letters outside plain ASCII, capitals and small: 38 it PIECED from a letter and a loose accent (Ồ Ố Ạ Ễ …), 44
  // fell to Geist Mono as it stands, lighter and narrower (Ơ Ư Ả …), 52 it drew whole. So the micro voice has a
  // companion too, named FIRST: Geist Mono itself (the mono voice's file, which has every one of them whole), limited
  // to exactly the letters Martian Mono has no glyph for, drawn at 113 % so its capitals stand as tall as Martian's
  // (0.71 em against 0.80: 0.805 at 113 %), and wearing Martian's line (ascent 100 %, descent 20 %, no gap: the
  // overrides are multiplied by the size, so 88.5 % and 17.7 %; a line holding a borrowed letter then measures
  // Martian's own 1.2 em, where it measured 1.47 em without them).
  it('the micro voice draws every Vietnamese letter whole: a companion limited to the letters Martian Mono lacks leads it', () => {
    const micro = faces.filter((f) => f.family === 'RVL Viet Micro First');
    expect(micro.map((f) => f.url)).toEqual(['/fonts/GeistMono-Var.woff2']); // (one face, no new file)
    const face = micro[0];
    expect(stack('f-micro')[0]).toBe('RVL Viet Micro First');

    // the Vietnamese alphabet outside plain ASCII: twelve vowels under six tones, in both cases, and Đ đ
    const tones = ['', '\u0300', '\u0301', '\u0309', '\u0303', '\u0323'];
    const small = [...'aăâeêioôơuưy'].flatMap((b) => tones.map((t) => (b + t).normalize('NFC'))).concat('đ');
    const alphabet = [...new Set([...small, ...small.map((l) => l.toUpperCase())])]
      .filter((l) => [...l].length === 1 && l.codePointAt(0)! > 127).map((l) => l.codePointAt(0)!).sort((a, b) => a - b);
    expect(alphabet.length).toBe(134);

    const martian = codepoints(pub + 'fonts/MartianMono-Var.woff2'), geist = codepoints(pub + 'fonts/GeistMono-Var.woff2');
    const lacks = alphabet.filter((c) => !martian.has(c));
    expect(lacks.length).toBe(82); // (the 38 pieced and the 44 that fell through)
    expect(lacks.filter((c) => !geist.has(c)).map((c) => c.toString(16))).toEqual([]); // (the companion's file has each of them)

    // its range is those letters, no more and no fewer: every letter Martian has of its own stays Martian's
    const range = /unicode-range:\s*([^;]+);/.exec(face.body)![1].split(',').flatMap((part) => {
      const m = /^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i.exec(part.trim())!;
      const from = parseInt(m[1], 16), to = parseInt(m[2] ?? m[1], 16);
      return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    });
    expect(range.map((c) => c.toString(16))).toEqual(lacks.map((c) => c.toString(16)));
    expect(range.includes(0x20)).toBe(false); // (never the space: the voice's own line is Martian's)

    // sized to Martian's capitals, wearing Martian's line, at every weight Geist Mono has
    const geistFace = faces.find((f) => f.family === 'Geist Mono')!;
    expect(/font-weight:\s*([^;]+);/.exec(face.body)?.[1]).toBe(/font-weight:\s*([^;]+);/.exec(geistFace.body)?.[1]);
    expect([/size-adjust:\s*([\d.]+%)/, /ascent-override:\s*([\d.]+%)/, /descent-override:\s*([\d.]+%)/, /line-gap-override:\s*([\d.]+%)/]
      .map((re) => re.exec(face.body)?.[1])).toEqual(['113%', '88.5%', '17.7%', '0%']);
  });
});

// (owner, 2026-11-24, of a film's synopsis: "I dont like this font too hard to read."; shown the line in four faces
//  they chose "Bodoni upright", and "Everywhere" for the four other lines that stood in the same slanted Bodoni. The
//  face, its size and its weight stay; only the slant goes.) Then, owner 2026-11-25: "Every running line: the synopsis
//  on every film page, ABOUT's statement and OP: paragraph, and CONTACT's line" moved to the text voice, Source Serif 4
//  (tests/text-face.test.ts); the homepage's line was not named and keeps the serif voice. The synopsis left every film
//  page the same day, the owner's word: four lines stand.
describe('the running lines stand upright', () => {
  const sheet = (f: string) => readFileSync(fileURLToPath(new URL(`../src/styles/${f}`, import.meta.url)), 'utf8');
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
  // the homepage's line, ABOUT's statement and the opening of its bio, CONTACT's line
  const LINES: [string, string, string][] = [
    ['components.css', '.home-cta', 'f-serif'], ['about.css', '.a-statement', 'f-text'],
    ['about.css', '.a-bio-lead', 'f-text'], ['contact.css', '.c-vow', 'f-text'],
  ];

  it('the four lines keep their voice (three in the text voice, the homepage\'s line in the serif), and none of them is slanted', () => {
    for (const [file, sel, voice] of LINES) {
      const found = rules(sheet(file), sel);
      expect(found.length, sel).toBeGreaterThan(0);
      expect(found.filter((r) => r.includes(`font-family: var(--${voice})`)).length, sel).toBe(1);
      for (const r of found) expect(r, sel).not.toContain('italic');
    }
  });

  it("the homepage's great ampersand keeps its slant: it is a drawing, not a line to read", () => {
    const amp = rules(sheet('components.css'), '.amp-bg');
    expect(amp[0]).toContain('font-family: var(--f-serif); font-style: italic;');
  });

  it('nothing else on the site is slanted: the ampersand, and the face that draws it, are the only two', () => {
    const count = (f: string) => sheet(f).split('font-style: italic').length - 1;
    expect(['tokens.css', 'base.css', 'components.css', 'project.css', 'about.css', 'contact.css', 'story.css', 'stats.css'].map(count))
      .toEqual([1, 0, 1, 0, 0, 0, 0, 0]);
  });

  it('the upright faces draw every letter of those lines themselves: no slanted or system face steps in', () => {
    const upright = new Set<number>();
    for (const fam of stack('f-text'))
      for (const f of faces.filter((x) => x.family === fam && !x.body.includes('font-style: italic')))
        for (const c of codepoints(pub + f.url.slice(1))) upright.add(c);
    const about = parseAbout(parseJson(readFileSync(pub + 'content/about/about.json', 'utf8'), 'about.json'));
    expect(missing(about.statement, upright), 'statement').toEqual([]);
    expect(missing(about.bio[0] ?? '', upright), 'bio').toEqual([]);
    const vow = /<p class="c-vow">([^<]*)<\/p>/.exec(readFileSync(fileURLToPath(new URL('../contact.html', import.meta.url)), 'utf8'));
    expect(vow, 'the line on CONTACT').not.toBeNull();
    expect(missing(vow![1], upright), 'vow').toEqual([]);
  });
});
