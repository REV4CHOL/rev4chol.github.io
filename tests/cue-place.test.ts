import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cueBottom } from '../src/project/cue-place';

// The film page's scroll cue stands where ABOUT's does, unless the intake sheet's first row stands there too (measured
// on a portrait Android tablet, 800 x 1152: the hero is capped at 980 px and the sheet's first value lay under the mark).
describe("where a film page's cue stands", () => {
  it('where ABOUT stands it, on the screens where the sheet starts below the screen or beside the cue', () => {
    // 1920 x 945: the sheet starts at 981, under the screen's foot
    expect(cueBottom({ top: 900, bottom: 931, left: 898, right: 1022 }, { top: 981, left: 192, right: 1072 }, 869, 945)).toBeNull();
    // 2560 x 1305: the sheet is in view, left of the cue
    expect(cueBottom({ top: 1260, bottom: 1291, left: 1218, right: 1342 }, { top: 1100, left: 192, right: 1072 }, 980, 1305)).toBeNull();
    // a 393 px phone: the sheet starts at the screen's foot
    expect(cueBottom({ top: 631, bottom: 645, left: 191, right: 202 }, { top: 660, left: 18, right: 375 }, 580, 659)).toBeNull();
  });

  it("midway between the hero's foot and the sheet where the sheet's first row would stand under it", () => {
    // 800 x 1152 (measured): hero to 980, sheet from 1092 (1076 once risen), cue 14 px tall at 1124
    const b = cueBottom({ top: 1124, bottom: 1138, left: 394, right: 406 }, { top: 1092, left: 192, right: 756 }, 980, 1152)!;
    expect(b).toBe(1152 - (980 + (1076 - 980 - 14) / 2) - 14);
    const top = 1152 - b - 14;
    expect(top).toBeGreaterThan(980);
    expect(top + 14).toBeLessThan(1076 - 10);
  });

  it('stays put where there is no room between the hero and the sheet', () => {
    expect(cueBottom({ top: 700, bottom: 714, left: 300, right: 312 }, { top: 720, left: 0, right: 600 }, 700, 730)).toBeNull();
  });

  it('the page places it once armed, again on a resize and once the display face is in', () => {
    const page = readFileSync('src/pages/project.ts', 'utf8');
    expect(page).toContain('placeCue(armScrollCue());');
    expect(page).toContain("window.addEventListener('resize', place);");
    expect(page).toContain('cue.style.bottom = `${Math.round(bottom / posterZoom())}px`;');
  });
});
