import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rackKeepsCaps } from '../src/about/rack';

// The review's walkthroughs, 2026-11-25: on every desktop size four of the eight small counters at the end of ABOUT's
// skill bars were cut mid-word by the bar's edge ("CRE ▪ 01/", "TEC"): on a 1920 x 945 window "CRE ▪ 01/04" ran to
// x 679 in a bar whose edge stood at 658. A counter is never shown cut: where any would be, the rack drops them all
// (uniform hardware), and the names keep their size.

const row = (capRight: number, edge: number) => ({ capRight, edge });

describe("ABOUT's skill rack: its counters show only where every one stands whole", () => {
  it('every counter inside its bar: the rack keeps them', () => {
    expect(rackKeepsCaps([row(600, 640), row(640, 640), row(512.4, 640)])).toBe(true);
  });
  it('one counter past its bar (the 1080 window: 679 against 658): the rack drops them all', () => {
    expect(rackKeepsCaps([row(600, 640), row(679, 658), row(500, 640)])).toBe(false);
  });
  it("a sub-pixel of layout rounding is not a cut", () => {
    expect(rackKeepsCaps([row(640.4, 640)])).toBe(true);
    expect(rackKeepsCaps([row(641, 640)])).toBe(false);
  });
  it('no counter on show (a phone, a wide tablet: the styles drop them): nothing to judge', () => {
    expect(rackKeepsCaps([])).toBe(true);
  });
  it('the styles drop the counters of a rack the page has judged', () => {
    expect(readFileSync('src/styles/about.css', 'utf8')).toMatch(/\.a-rack\.is-bare \.a-bar-cap \{ display: none; \}/);
  });
});
