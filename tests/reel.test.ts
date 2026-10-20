import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseJson, parseProjects } from '../src/lib/content';
import { softBreaks } from '../src/lib/escape';
import {
  contactCount, edgeCode, frameCode, frameNumber, gateIndex, paneShare, paneSize, railIndex, REEL_QUERY, REEL_WORDS, reelMode, teaser,
  titleSize,
} from '../src/works/reel';

// WORK ON A PHONE (owner, 2026-10-20: "on Phone, its completely overwhelming and disorienting … a complete redesign of
// the interface of the Work section, still keeping the fundamental art direction, but changing the UI/UX specifically
// for Phones"): the reel, one film to a frame.
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

describe("a frame's pane keeps its film's shape (owner 2026-09-28: vertical footage is shown vertical, never cropped)", () => {
  it('in its own ratio, inside its box, filling one side of it', () => {
    for (const r of [16 / 9, 4 / 3, 2.39, 1, 9 / 16]) {
      for (const [w, h] of [[316, 340], [316, 120], [600, 200], [292, 520]]) {
        const b = paneSize(r, w, h);
        expect(b.w).toBeLessThanOrEqual(w);
        expect(b.h).toBeLessThanOrEqual(h);
        expect(b.w / b.h, `${r} in ${w}×${h}`).toBeCloseTo(r, 1);
        expect(b.w === w || b.h === h).toBe(true);
      }
    }
  });

  it('a vertical film stands tall: it takes the most of a frame, a scope film the least', () => {
    const v = paneSize(9 / 16, 316, 560 * paneShare(9 / 16));
    expect(v.h).toBeGreaterThan(v.w);
    expect(paneShare(9 / 16)).toBeGreaterThan(paneShare(4 / 3));
    expect(paneShare(4 / 3)).toBeGreaterThan(paneShare(16 / 9));
    expect(paneShare(16 / 9)).toBeGreaterThan(paneShare(2.39));
  });

  it('a contact strip of the stills under it: four of a vertical film, three of another, never more than it has', () => {
    expect(contactCount(9 / 16, 9)).toBe(4);
    expect(contactCount(16 / 9, 9)).toBe(3);
    expect(contactCount(2.39, 2)).toBe(2);
    expect(contactCount(16 / 9, 0)).toBe(0);
  });
});

describe("a frame's words", () => {
  it('the title stands between 22 and 52 px, its longest word inside the column', () => {
    for (const p of films) for (const w of [288, 316, 358]) {
      const s = titleSize(p.title, w);
      expect(s).toBeGreaterThanOrEqual(22);
      expect(s).toBeLessThanOrEqual(52);
      const longest = Math.max(...p.title.split(/\s+/).map((x) => [...x].length));
      if (s > 22) expect(s * 0.7 * longest, `${p.slug} at ${w}`).toBeLessThanOrEqual(w);
    }
    expect(titleSize('PHILIA', 316)).toBe(52);
    expect(titleSize('Remnants of a Dream', 316)).toBeLessThan(titleSize('HALIDE', 316));
  });

  it('the one unbreakable name stands at the floor and breaks at its underscores', () => {
    expect(titleSize('mr_PURPLE_dreams_in_electric_fish', 316)).toBe(22);
    expect(softBreaks('mr_PURPLE_dreams_in_electric_fish')).toContain('_​');
  });

  it("the synopsis is its first sentence, whole; a long one is cut at a whole word (the film's page holds the rest)", () => {
    expect(teaser('A ghost of the past. And then more.')).toBe('A ghost of the past.');
    expect(teaser('Failure is not an option! Another.')).toBe('Failure is not an option!');
    expect(teaser('  no stop at all  ')).toBe('no stop at all');
    expect(teaser('')).toBe('');
    expect(teaser('The stillness of ordinary moments, in places.', 20)).toBe('The stillness of…');
    expect(teaser('Change your life’s experience, with Forest Onsen.', 30)).toBe('Change your life’s experience…');
    const long = `${'word '.repeat(60).trim()}.`;
    expect(teaser(long).length).toBeLessThanOrEqual(141);
    expect(teaser(long)).toMatch(/ word…$/);
  });

  it("every film's teaser is the start of its own synopsis: nothing is written for it", () => {
    for (const p of films) {
      const t = teaser(p.synopsis);
      expect(t.length, p.slug).toBeGreaterThan(0);
      expect(p.synopsis.replace(/\s+/g, ' ').trim().startsWith(t.replace(/…$/, '')), p.slug).toBe(true);
    }
  });
});

describe("a frame's codes", () => {
  it('its number in two digits, its code the same for a film on every visit', () => {
    expect([0, 8, 11].map(frameNumber)).toEqual(['01', '09', '12']);
    expect(frameCode('philia')).toBe(frameCode('philia'));
    for (const p of films) expect(frameCode(p.slug)).toMatch(/^RVL\/\d{4}$/);
    expect(new Set(films.map((p) => frameCode(p.slug))).size).toBe(films.length);
    expect(edgeCode(6, 'CH·01')).toBe('RVL ▸ 07 ▸ CH·01');
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

  it('the frame in the gate is the nearest snap, the EOF slate included', () => {
    expect(gateIndex(0, 600, 13)).toBe(0);
    expect(gateIndex(1190, 600, 13)).toBe(2);
    expect(gateIndex(12 * 600, 600, 13)).toBe(12);
    expect(gateIndex(99999, 600, 13)).toBe(12);
    expect(gateIndex(300, 0, 13)).toBe(0);
  });
});

describe("the reel's words (controls in plain sentences, the house's codes as they are)", () => {
  it('says what each control does', () => {
    expect(REEL_WORDS.open).toBe('OPEN THIS FILM ▸');
    expect(REEL_WORDS.back).toBe('◂ BACK TO THE REEL');
    expect(REEL_WORDS.all).toBe('LIST ▸');
    expect(REEL_WORDS.allLabel(17)).toBe('List all 17 films');
    expect(REEL_WORDS.cue(11)).toBe('SCROLL DOWN FOR 11 MORE FILMS ▾');
    expect(REEL_WORDS.cue(1)).toBe('SCROLL DOWN FOR 1 MORE FILM ▾');
    expect(REEL_WORDS.list(17)).toBe('SEE ALL 17 FILMS IN A LIST ▸');
  });

  it("the end slate tunes to the other chapter, counting its films; the foot counts each chapter's", () => {
    expect(REEL_WORDS.eof('CH·01', 12)).toBe('EOF ▪ CH·01 ▪ 12 FILMS');
    expect(REEL_WORDS.tune('CH·02', 'AI', 5)).toBe('TUNE TO CH·02 ▸ AI — 5 MORE FILMS');
    expect(REEL_WORDS.tune('CH·01', 'COLORIST', 1)).toBe('TUNE TO CH·01 ▸ COLORIST — 1 MORE FILM');
    expect(REEL_WORDS.chapterLine('CH·02', 5)).toBe('CH·02 ▪ 5 FILMS');
    expect(REEL_WORDS.chapter('CH·01', 'COLORIST')).toBe('CH·01 ▸ COLORIST');
  });
});
