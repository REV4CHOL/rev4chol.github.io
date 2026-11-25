import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hudYields } from '../src/shell/hud-yield';

// The review's walkthroughs, 2026-11-25: the fixed corner readouts lay on the page's own words. ABOUT's first screen
// on a 1920 x 945 window: the timecode (1698..1892 x 907..923) over the callout line "CLASS :: COLOR GRADE ✚ EDIT"
// (y 921..929); on the 13-inch iPad the coordinates (y 903..915) on the tagline (y 896..941). A phone held sideways:
// the coordinates inside CONTACT's COPY EMAIL button.

const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });
const TIMECODE = box(1698, 907, 1892, 923);

describe('a foot readout steps aside while it meets the words under it', () => {
  it('the timecode over the CLASS callout (1080 window): it yields', () => {
    expect(hudYields(TIMECODE, [box(1400, 921, 1880, 929)])).toBe(true);
  });
  it('words that end where the readout starts do not meet it', () => {
    expect(hudYields(TIMECODE, [box(1400, 880, 1880, 907), box(1500, 923, 1600, 940)])).toBe(false);
  });
  it('nothing under it: it stays', () => {
    expect(hudYields(TIMECODE, [])).toBe(false);
  });
  it('a readout the styles hide (an empty box) never yields; an empty word box is no word', () => {
    expect(hudYields(box(0, 0, 0, 0), [box(-10, -10, 10, 10)])).toBe(false);
    expect(hudYields(TIMECODE, [box(1700, 910, 1700, 910)])).toBe(false);
  });
});

describe('a phone held on its side: the foot readouts leave, as they left the upright phone', () => {
  const css = readFileSync('src/styles/components.css', 'utf8').replace(/\r\n/g, '\n');
  it('a short touch screen hides them', () => {
    const i = css.indexOf('@media (pointer: coarse) and (max-height: 500px) {');
    expect(i).toBeGreaterThan(-1);
    expect(css.slice(i, css.indexOf('}', i) + 1)).toContain('.hud-bl, .hud-br { display: none; }');
  });
});
