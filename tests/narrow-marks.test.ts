import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { narrowCss } from '../src/lib/narrow-css';

// WHICH BLOCKS A NARROW PC WINDOW READS AS A TABLET (owner, 2026-11-25: "Tablet layout: below a floor width the window
// gets the layout a tablet gets, with readable words. Wide windows keep your poster lock exactly as now."). Every
// pointer-gated block says on the line above it whether it is LAYOUT (a narrow window reads it as a touch screen would)
// or TOUCH (left as it is: a narrow PC is still a mouse: hover, the cursor, no press areas, no veil, the volume slider).
// A new pointer-gated block must say which; this list says what each one is.
const STYLES = 'src/styles/';
const sheets = readdirSync(STYLES).filter((f) => f.endsWith('.css') && f !== 'about-old.css').sort();
const lines = (f: string) => readFileSync(STYLES + f, 'utf8').replace(/\r\n/g, '\n').split('\n');

const marks = sheets.flatMap((f) => {
  const L = lines(f);
  return L.flatMap((l, i) => {
    const m = /^\/\* narrow: (\w+) \*\/$/.exec(l);
    return m ? [`${f} ${m[1]} ${L[i + 1].replace(/\s*\{.*$/, '')}`] : [];
  });
});

const LAYOUT = [
  'about.css layout @media (pointer: coarse) and (min-width: 761px)',
  'about.css layout @media (pointer: coarse) and (min-width: 761px) and (max-width: 999px)',
  'about.css layout @media (pointer: coarse) and (min-width: 1000px)',
  'about.css layout @media (max-width: 760px) and (pointer: coarse)',
  'about.css layout @media (pointer: fine)', // the 1440 pins: a narrow window takes the fluid sizes instead
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the nav stacks
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the corner readouts
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the nav's sizes
  'components.css layout @media (pointer: fine)', // the 1440 pins
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the kicker
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the phone's poster
  'components.css layout @media (min-width: 641px) and (pointer: coarse)', // the tablet's poster at 60 % (owner)
  'components.css layout @media (pointer: coarse) and (orientation: landscape) and (max-height: 480px)',
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the legend on a phone
  'components.css layout @media (pointer: coarse) and (min-width: 641px)', // the legend wraps between its pieces
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // THE LIST's rows
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the chapter switch
  'components.css layout @media (max-width: 640px) and (pointer: coarse)', // the phone's chrome
  'contact.css layout @media (max-width: 760px) and (pointer: coarse)',
  'project.css layout @media (max-width: 760px) and (pointer: coarse)',
  'project.css layout @media (pointer: coarse) and (min-width: 761px) and (orientation: portrait)',
  'project.css layout @media (max-width: 900px) and (pointer: coarse)',
  'project.css layout @media (min-width: 1100px), (pointer: fine)', // the wide film grid: a narrow window from 1100 up
  'project.css layout @media (max-width: 1099px) and (pointer: coarse)',
  'project.css layout @media (max-width: 760px) and (pointer: coarse)',
  'project.css layout @media (max-width: 760px) and (pointer: coarse)',
  'project.css layout @media (min-width: 1100px), (pointer: fine)',
];

describe('every pointer-gated block says what a narrow PC window does with it', () => {
  it('each @media that names a pointer carries a marker on the line above it', () => {
    for (const f of sheets) {
      const L = lines(f);
      L.forEach((l, i) => {
        if (/@media[^{]*pointer/.test(l)) expect(L[i - 1], `${f}:${i + 1} ${l}`).toMatch(/^\/\* narrow: (layout|touch) \*\/$/);
      });
    }
  });

  it('the layout blocks are these, in this order (27: 18 at 641 px and up, 9 for a window under 641)', () => {
    expect(marks.filter((m) => m.includes(' layout '))).toEqual(LAYOUT);
  });

  it('everything else is touch, left as it is (18)', () => {
    const touch = marks.filter((m) => m.includes(' touch '));
    expect(touch).toHaveLength(18);
    for (const t of [
      'base.css touch @media (pointer: fine)', // the site's cursor
      'components.css touch @media (pointer: coarse)', // the switch row's veil, the legend leaving while a pane is awake
      'components.css touch @media (pointer: coarse) and (min-width: 641px)', // the 44 px press areas
      'project.css touch @media (pointer: fine)', // the volume slider
      'project.css touch @media (pointer: coarse)', // the bar's finger sizes
    ]) expect(touch).toContain(t);
  });

  it('the homepage keeps its clip on a narrow window: the rule stands in a block of its own, left as it is', () => {
    const css = readFileSync(STYLES + 'components.css', 'utf8').replace(/\r\n/g, '\n');
    expect(css).toContain('/* narrow: touch */\n@media (pointer: fine) {\n  /* the home poster never scrolls');
    const at = css.indexOf('html:has(> body.page-home) { overflow-y: clip; }');
    expect(css.lastIndexOf('/* narrow: ', at)).toBe(css.lastIndexOf('/* narrow: touch */', at));
  });

  it('every sheet passes the transform, and each marked sheet gets its mirrors', () => {
    for (const f of sheets) {
      const out = narrowCss(readFileSync(STYLES + f, 'utf8'));
      const want = marks.filter((m) => m.startsWith(f + ' layout') && !m.endsWith('@media (pointer: fine)')).length;
      expect(out.split('/* narrow: mirror */').length - 1, f).toBe(want);
    }
  });
});
