import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GUARD, MIRROR_MARK, mirrorQuery, narrowCss, narrowSelectors, stripNarrow } from '../src/lib/narrow-css';

// THE MIRROR (owner, 2026-11-25: "Tablet layout: below a floor width the window gets the layout a tablet gets, with
// readable words. Wide windows keep your poster lock exactly as now."). A pointer-gated block marked
// `/* narrow: layout */` gets a copy right after it that a narrow PC window (`html.rvl-narrow`) reads as a touch
// screen would; a block marked `/* narrow: touch */` is left as it is (a narrow PC is still a mouse).
const STYLES = 'src/styles/';
const sheets = readdirSync(STYLES).filter((f) => f.endsWith('.css') && f !== 'about-old.css');
const read = (f: string) => readFileSync(STYLES + f, 'utf8');

describe('the media query, read as a touch screen', () => {
  it('(pointer: coarse) is true, (pointer: fine) is false', () => {
    expect(mirrorQuery('(min-width: 641px) and (pointer: coarse)')).toBe('(min-width: 641px)');
    expect(mirrorQuery('(pointer: coarse) and (orientation: landscape) and (max-height: 480px)')).toBe('(orientation: landscape) and (max-height: 480px)');
    expect(mirrorQuery('(max-width: 760px) and (pointer:coarse)')).toBe('(max-width: 760px)');
  });
  it('a query that is only the pointer is always true: an empty query', () => {
    expect(mirrorQuery('(pointer: coarse)')).toBe('');
  });
  it('a list drops its fine-pointer queries; nothing left, no mirror', () => {
    expect(mirrorQuery('(min-width: 1100px), (pointer: fine)')).toBe('(min-width: 1100px)');
    expect(mirrorQuery('(pointer: fine)')).toBeNull();
  });
  it('an unconditional query in a list makes the whole list true', () => {
    expect(mirrorQuery('(min-width: 1100px), (pointer: coarse)')).toBe('');
  });
  it('refuses what it cannot read', () => {
    expect(() => mirrorQuery('not all and (pointer: coarse)')).toThrow();
    expect(() => mirrorQuery('(hover: none) and (pointer: coarse)')).toThrow();
    expect(() => mirrorQuery('(any-pointer: coarse)')).toThrow();
    expect(() => mirrorQuery('(pointer: none)')).toThrow();
  });
});

describe('the selectors', () => {
  it('each one is keyed on the narrow root, specificity unchanged (:where)', () => {
    expect(narrowSelectors('.a, .b::before', 'on')).toBe(':where(html.rvl-narrow) .a, :where(html.rvl-narrow) .b::before');
  });
  it('commas inside :is(), :not(), :has() and attribute values stay inside', () => {
    expect(narrowSelectors('.x:is(.a, .b) > p, [data-x="a,b"]', 'on')).toBe(':where(html.rvl-narrow) .x:is(.a, .b) > p, :where(html.rvl-narrow) [data-x="a,b"]');
  });
  it('a selector that starts at html keys its own compound', () => {
    expect(narrowSelectors('html:has(> body.page-home)', 'on')).toBe('html:has(> body.page-home):where(.rvl-narrow)');
    expect(narrowSelectors('html.rvl-list-tight .fl-row', 'off')).toBe('html.rvl-list-tight:where(:not(.rvl-narrow)) .fl-row');
  });
  it('the guard keeps a fine-pointer rule off a narrow window', () => {
    expect(narrowSelectors('.page-about', 'off')).toBe(GUARD + '.page-about');
  });
  it('refuses :root (the class is on html: key it there by hand)', () => {
    expect(() => narrowSelectors(':root', 'on')).toThrow();
  });
});

const EX = [
  '.a { color: red; }',
  '/* narrow: layout */',
  '@media (min-width: 641px) and (pointer: coarse) {',
  '  /* a note */',
  '  .b, .c::after { color: blue; content: \'{ , }\'; }',
  '  .d { top: calc(1px + 2px); }',
  '}',
  '/* narrow: touch */',
  '@media (pointer: coarse) {',
  '  .e { color: green; }',
  '}',
  '/* narrow: layout */',
  '@media (min-width: 1100px), (pointer: fine) {',
  '  .f { display: grid; }',
  '}',
  '@media (max-width: 640px) {',
  '  .g { color: black; }',
  '}',
  'body { visibility: visible; }',
  '',
].join('\n');

describe('the transform', () => {
  const out = narrowCss(EX);
  it('emits the mirror right after its original, on the narrow root, the query read as touch', () => {
    const i = out.indexOf('  .d { top: calc(1px + 2px); }\n}');
    expect(out.slice(i)).toMatch(/^ {2}\.d \{ top: calc\(1px \+ 2px\); \}\n\}\n\/\* narrow: mirror \*\/\n@media \(min-width: 641px\) \{/);
    expect(out).toContain(":where(html.rvl-narrow) .b, :where(html.rvl-narrow) .c::after { color: blue; content: '{ , }'; }");
  });
  it('a touch-marked block and unmarked blocks are untouched', () => {
    expect(out).toContain('/* narrow: touch */\n@media (pointer: coarse) {\n  .e { color: green; }\n}\n/* narrow: layout */');
    expect(out).toContain('@media (max-width: 640px) {\n  .g { color: black; }\n}');
  });
  it('a block that names the fine pointer guards its original and mirrors the rest of its query', () => {
    expect(out).toContain('@media (min-width: 1100px), (pointer: fine) {\n  ' + GUARD + '.f { display: grid; }\n}\n' + MIRROR_MARK + '\n@media (min-width: 1100px) {\n  :where(html.rvl-narrow) .f { display: grid; }\n}');
  });
  it('an empty query mirrors under @media all', () => {
    const o = narrowCss('/* narrow: layout */\n@media (pointer: coarse) {\n  .x { a: b; }\n}\n');
    expect(o).toContain(MIRROR_MARK + '\n@media all {\n  :where(html.rvl-narrow) .x { a: b; }\n}');
  });
  it('a fine-pointer-only block is guarded and has no mirror', () => {
    const o = narrowCss('/* narrow: layout */\n@media (pointer: fine) {\n  .x { a: b; }\n}\n');
    expect(o).toBe('/* narrow: layout */\n@media (pointer: fine) {\n  ' + GUARD + '.x { a: b; }\n}\n');
  });
  it('keeps CRLF line endings', () => {
    const o = narrowCss(EX.replace(/\n/g, '\r\n'));
    expect(o.replace(/\r\n/g, '')).not.toContain('\n');
    expect(stripNarrow(o)).toBe(EX.replace(/\n/g, '\r\n'));
  });
  it('refuses a nested at-rule, a marker not followed by @media, an unknown marker', () => {
    expect(() => narrowCss('/* narrow: layout */\n@media (pointer: coarse) {\n  @supports (x: y) { .a { b: c; } }\n}\n')).toThrow();
    expect(() => narrowCss('/* narrow: layout */\n.a { b: c; }\n')).toThrow();
    expect(() => narrowCss('/* narrow: wide */\n@media (pointer: coarse) { .a { b: c; } }\n')).toThrow();
    expect(() => narrowCss('/* narrow: touch */\n@media (min-width: 9px) { .a { b: c; } }\n')).toThrow();
  });
  it('THE STRIP-BACK PROOF: without its mirrors and guards the output is the input, byte for byte', () => {
    expect(stripNarrow(out)).toBe(EX);
    for (const f of sheets) {
      const src = read(f);
      expect(stripNarrow(narrowCss(src)), f).toBe(src);
    }
  });
});

describe('every sheet that reaches the transform', () => {
  it('no sheet imports another (an imported sheet would be inlined after the transform and skip its mirrors)', () => {
    for (const f of sheets) expect(read(f), f).not.toMatch(/@import/);
  });
});
