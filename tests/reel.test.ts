import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseJson, parseProjects } from '../src/lib/content';
import { softBreaks } from '../src/lib/escape';
import {
  gateIndex, loopsAllowed, ONE_LINE_MIN, oneLineSize, railIndex, REEL_QUERY, REEL_WORDS, reelMode, roleLine, TITLE_MAX, TITLE_MIN, wrapStart,
} from '../src/works/reel';

// WORK ON A PHONE (owner, 2026-10-20: "on Phone, its completely overwhelming and disorienting … a complete redesign of
// the interface of the Work section, still keeping the fundamental art direction, but changing the UI/UX specifically
// for Phones"): the reel, one film to a screen — a pane the size of the screen, as antiantiart.com's on a phone, with
// only the film's name and its roles on it.
const films = parseProjects(parseJson(readFileSync('public/content/projects.json', 'utf8'), 'projects.json'));

describe('which screens get the reel', () => {
  it('a phone, upright or on its side; never a tablet, never a desktop', () => {
    for (const [width, height] of [[390, 844], [360, 780], [375, 667], [430, 932], [844, 390], [932, 430], [667, 375]]) {
      expect(reelMode({ coarse: true, width, height }), `${width}×${height}`).toBe(true);
    }
    for (const [width, height] of [[820, 1180], [1180, 820], [768, 1024], [1024, 768], [1366, 1024]]) {
      expect(reelMode({ coarse: true, width, height }), `a tablet ${width}×${height}`).toBe(false);
    }
    expect(reelMode({ coarse: false, width: 390, height: 844 }), 'a narrow desktop window keeps the floor').toBe(false);
    expect(reelMode({ coarse: false, width: 1440, height: 900 })).toBe(false);
  });

  it('the media query the page asks draws the same lines', () => {
    expect(REEL_QUERY.match(/\(pointer: coarse\)/g)).toHaveLength(2);
    const w = Number(/max-width: (\d+)px/.exec(REEL_QUERY)![1]), h = Number(/max-height: (\d+)px/.exec(REEL_QUERY)![1]);
    expect(reelMode({ coarse: true, width: w, height: 1000 })).toBe(true);
    expect(reelMode({ coarse: true, width: w + 1, height: 1000 })).toBe(false);
    expect(reelMode({ coarse: true, width: 1000, height: h })).toBe(true);
    expect(reelMode({ coarse: true, width: 1000, height: h + 1 })).toBe(false);
  });
});

describe('the loops (owner, 2026-10-20: "I want the videos to play continuously on the pane via its loop")', () => {
  it('play on every phone, whatever its tier; only Save-Data or a 2g line keeps the posters', () => {
    expect(loopsAllowed(undefined)).toBe(true); // (Safari has no connection to read)
    expect(loopsAllowed(null)).toBe(true);
    expect(loopsAllowed({ effectiveType: '4g' })).toBe(true);
    expect(loopsAllowed({ effectiveType: '3g', saveData: false })).toBe(true);
    expect(loopsAllowed({ effectiveType: '4g', saveData: true })).toBe(false);
    expect(loopsAllowed({ effectiveType: '2g' })).toBe(false);
    expect(loopsAllowed({ effectiveType: 'slow-2g' })).toBe(false);
  });
});

describe("a pane's words: the film's name and its roles, nothing else", () => {
  it('the roles as the record has them, upper case, a role never broken inside, no line opening on a slash', () => {
    expect(roleLine('Colorist')).toBe('COLORIST');
    expect(roleLine('Director / Colorist / Editor / Sound Designer')).toBe('DIRECTOR / COLORIST / EDITOR / SOUND DESIGNER');
    expect(roleLine('1st AD / Colorist')).toBe('1ST AD / COLORIST');
    expect(roleLine(' AI Lead /  Colorist ')).toBe('AI LEAD / COLORIST');
    for (const p of films) {
      const line = roleLine(p.role);
      expect(line, p.slug).not.toMatch(/^\s|\s$/);
      for (const brk of line.split(' ')) expect(brk.startsWith('/'), `${p.slug}: a line opens on a slash`).toBe(false);
    }
  });

  it('a name stands on one line when it can at 34 px or more, up to 52; never above, never wider than its caption', () => {
    expect(oneLineSize(260, 300)).toBe(TITLE_MAX); // (it fits at full size)
    expect(oneLineSize(370, 300)).toBe(42); // MIEN VIEN ▸ at 52 runs about 370: one line at 42, not MIEN over VIEN
    expect(oneLineSize(458, 300)).toBe(ONE_LINE_MIN); // (34.06: just on one line)
    expect(oneLineSize(470, 300)).toBeNull(); // (33.2: it wraps instead)
    for (const w of [120, 250, 300, 380, 459, 1300]) {
      const s = oneLineSize(w, 300);
      if (s !== null) {
        expect(s).toBeGreaterThanOrEqual(ONE_LINE_MIN);
        expect(s).toBeLessThanOrEqual(TITLE_MAX);
        expect((w * s) / TITLE_MAX, `${w}`).toBeLessThanOrEqual(300);
      }
    }
    expect(oneLineSize(0, 300)).toBeNull();
    expect(oneLineSize(300, 0)).toBeNull();
  });

  it('a longer name wraps from a smaller start, never under 22 (the one unbreakable name breaks at its underscores)', () => {
    expect(wrapStart(19)).toBe(ONE_LINE_MIN); // REMNANTS OF A DREAM
    expect(wrapStart(25)).toBe(28); // SOFT HOURS & LONELY LANDS
    expect(wrapStart(45)).toBe(24); // FOREST ONSEN - ECOPARK'S ECO RETREAT COMMERCIAL
    for (const p of films) expect(wrapStart([...p.title].length)).toBeGreaterThanOrEqual(TITLE_MIN);
    expect(softBreaks('mr_PURPLE_dreams_in_electric_fish')).toContain('_\u200b');
  });
});

describe('the scrub rail and the gate', () => {
  it('a thumb on the rail picks the film under it, never past either end', () => {
    expect(railIndex(0, 400, 12)).toBe(0);
    expect(railIndex(399, 400, 12)).toBe(11);
    expect(railIndex(200, 400, 12)).toBe(6);
    expect(railIndex(-30, 400, 12)).toBe(0);
    expect(railIndex(900, 400, 12)).toBe(11);
    expect(railIndex(100, 0, 12)).toBe(0);
  });

  it('the pane in the gate is the nearest snap, the EOF slate included', () => {
    expect(gateIndex(0, 844, 13)).toBe(0);
    expect(gateIndex(1680, 844, 13)).toBe(2);
    expect(gateIndex(12 * 844, 844, 13)).toBe(12);
    expect(gateIndex(99999, 844, 13)).toBe(12);
    expect(gateIndex(300, 0, 13)).toBe(0);
  });
});

describe("the reel's words (controls in plain sentences, the house's codes as they are; none on a pane)", () => {
  it('say what each control does', () => {
    expect(REEL_WORDS.back).toBe('◂ BACK TO THE REEL');
    expect(REEL_WORDS.all).toBe('LIST ▸');
    expect(REEL_WORDS.allLabel(17)).toBe('List all 17 films');
    expect(REEL_WORDS.list(17)).toBe('SEE ALL 17 FILMS IN A LIST ▸');
  });

  it("the end slate tunes to the other chapter, counting its films; the foot counts each chapter's", () => {
    expect(REEL_WORDS.eof('CH·01', 12)).toBe('EOF ▪ CH·01 ▪ 12 FILMS');
    expect(REEL_WORDS.tune('CH·02', 'AI', 5)).toBe('TUNE TO CH·02 ▸ AI — 5 MORE FILMS');
    expect(REEL_WORDS.tune('CH·01', 'COLORIST', 1)).toBe('TUNE TO CH·01 ▸ COLORIST — 1 MORE FILM');
    expect(REEL_WORDS.chapterLine('CH·02', 5)).toBe('CH·02 ▪ 5 FILMS');
  });
});
