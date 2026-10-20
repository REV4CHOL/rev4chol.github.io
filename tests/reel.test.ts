import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseJson, parseProjects } from '../src/lib/content';
import { softBreaks } from '../src/lib/escape';
import {
  capKeyframes, capOpacity, coast, COAST_TAU, lapProgress, loopsAllowed, MAX_THROW, offsetFromLap, paneKeyframes, offsetForRail, ONE_LINE_MIN, oneLineSize, paneInView, panePlay, paneTop, railProgress,
  REEL_QUERY, REEL_WORDS, reelMode, releaseSpeed, roleLine, ROLL_SECONDS, stripOrder, TITLE_MAX, TITLE_MIN, wrapStart,
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

// (owner, 2026-10-20: "The moment we enter the work section, we can see the already continously scrolling down to the
// next film in a continuous strips. And we can slide our finger up and down to scroll through the strip")
describe('the rolling strip', () => {
  const H = 844;

  it('is endless: every pane stands once in a lap, from one pane above the screen to the lap\'s end', () => {
    for (const n of [3, 5, 12]) for (const offset of [0, 1, 420, H, 5 * H + 17, -3 * H - 5, 1e6]) {
      const tops = Array.from({ length: n }, (_, i) => paneTop(i, offset, H, n));
      for (const t of tops) { expect(t).toBeGreaterThanOrEqual(-H); expect(t).toBeLessThan((n - 1) * H + 1e-6); }
      const sorted = [...tops].sort((a, b) => a - b);
      for (let k = 1; k < n; k++) expect(sorted[k] - sorted[k - 1]).toBeCloseTo(H, 6); // (no gap, no overlap)
      expect(tops.some((t) => t <= 0 && t + H > 0)).toBe(true); // (the screen's top is always covered)
    }
  });

  it('rolls the next film in from below: one pane on, the strip has moved one pane', () => {
    expect(paneTop(0, 0, H, 12)).toBe(0);
    expect(paneTop(1, 0, H, 12)).toBe(H);
    expect(paneTop(1, H, H, 12)).toBe(0);
    expect(paneTop(0, H, H, 12)).toBe(-H);
    expect(paneTop(0, 12 * H, H, 12)).toBe(0); // (a whole lap: the first film again)
    expect(paneTop(11, -H, H, 12)).toBe(0); // (dragged back from the first film: the last one)
  });

  it('knows the film in view, and the rail\'s playhead sits on its tick when it stands square', () => {
    expect(paneInView(0, H, 12)).toBe(0);
    expect(paneInView(H * 0.4, H, 12)).toBe(0);
    expect(paneInView(H * 0.6, H, 12)).toBe(1);
    expect(paneInView(-H, H, 12)).toBe(11);
    for (const i of [0, 4, 11]) expect(railProgress(i * H, H, 12)).toBeCloseTo((i + 0.5) / 12, 9);
    expect(railProgress(12 * H, H, 12)).toBeCloseTo(0.5 / 12, 9);
  });

  it('a touch on the rail moves the strip there, on the lap it is already on', () => {
    for (const i of [0, 3, 5, 11]) {
      const at = offsetForRail((i + 0.5) / 12, H, 12, 0);
      expect(paneInView(at, H, 12)).toBe(i);
      expect(Math.abs(at)).toBeLessThanOrEqual(6 * H); // (the short way round: the last film is one pane back)
    }
    expect(offsetForRail(11.5 / 12, H, 12, 0)).toBeCloseTo(-H, 6);
    const far = 40 * 12 * H; // (forty laps on)
    expect(Math.abs(offsetForRail(0.5, H, 12, far) - far)).toBeLessThanOrEqual(6 * H);
    expect(offsetForRail(-1, H, 12, 0)).toBeCloseTo(-H / 2, 6); // (held to the rail's ends)
  });

  it('a short chapter is laid again, so the strip never shows a gap', () => {
    expect(stripOrder(12)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(stripOrder(5)).toEqual([0, 1, 2, 3, 4]);
    expect(stripOrder(2)).toEqual([0, 1, 0, 1]);
    expect(stripOrder(1)).toEqual([0, 0, 0]);
    expect(stripOrder(0)).toEqual([]);
  });

  // (owner, 2026-10-20: "I want the auto scrolling to happen instantly, but slower and smoother")
  it('rolls one screen every 12 seconds; a throw coasts to its target, a rest swells into the roll', () => {
    expect(ROLL_SECONDS).toBe(12);
    expect(coast(3000, 0, COAST_TAU)).toBeCloseTo(3000 / Math.E, 6);
    let v = 3000;
    for (let t = 0; t < 3; t += 1 / 60) v = coast(v, 0, 1 / 60);
    expect(Math.abs(v)).toBeLessThan(5); // (a hard throw is at rest within three seconds)
    let r = 0;
    for (let t = 0; t < 2; t += 1 / 60) r = coast(r, H / ROLL_SECONDS, 1 / 60);
    expect(r).toBeGreaterThan(0.98 * (H / ROLL_SECONDS)); // (and the roll is back to pace within two)
    expect(coast(500, 120, 0)).toBe(500);
  });

  it('the finger\'s throw: its travel over its last 100 ms, up moving the strip on, held still throwing nothing', () => {
    expect(releaseSpeed([[0, 600], [50, 500], [100, 400]], 100)).toBeCloseTo(2000, 6); // (up 200 px in 0.1 s)
    expect(releaseSpeed([[0, 400], [100, 600]], 100)).toBeCloseTo(-2000, 6); // (down: back)
    expect(releaseSpeed([[0, 600], [40, 400], [300, 400]], 300)).toBe(0); // (stopped, then lifted)
    expect(releaseSpeed([[0, 600]], 0)).toBe(0);
    expect(releaseSpeed([[0, 900], [10, 0]], 10)).toBe(MAX_THROW);
  });

  it('on the compositor: each pane\'s lap is the same place as the strip\'s arithmetic, and the clock\'s time gives the offset back', () => {
    for (const n of [3, 5, 12]) for (const off of [0, 300, H, 7.5 * H, -2.25 * H]) for (let i = 0; i < n; i++) {
      const p = lapProgress(i, off, H, n);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
      // the keyframes run from (n - 1) panes down to one pane up, linearly: the pane stands where paneTop says
      const y = (n - 1) * H - p * n * H;
      const d = (((y - paneTop(i, off, H, n)) % (n * H)) + n * H) % (n * H);
      expect(Math.min(d, n * H - d)).toBeCloseTo(0, 6); // (the same place, a whole lap apart at most)
    }
    expect(paneKeyframes(12)).toEqual([{ transform: 'translate3d(0, 1100%, 0)' }, { transform: 'translate3d(0, -100%, 0)' }]);
    for (const off of [0, 420, 5 * H + 3, 40 * 12 * H + 100]) {
      expect(offsetFromLap(lapProgress(0, off, H, 12), H, 12, off)).toBeCloseTo(off, 6); // (the offset read back off the clock)
    }
    expect(offsetFromLap(lapProgress(0, 3 * H, H, 12), H, 12, 0)).toBeCloseTo(3 * H, 6);
  });

  it('the words\' fade, laid on the lap as keyframes, matches the fade the strip computes by hand', () => {
    const n = 12, span: [number, number] = [640, 756], band: [number, number] = [124, 782];
    const kf = capKeyframes(n, H, span, band);
    const offsets = kf.map((k) => k.offset as number);
    for (let k = 1; k < offsets.length; k++) expect(offsets[k]).toBeGreaterThanOrEqual(offsets[k - 1]);
    const at = (p: number) => { // (the keyframes' opacity at lap point p, linearly between them)
      for (let k = 1; k < kf.length; k++) {
        const [a, b] = [kf[k - 1], kf[k]];
        if (p <= (b.offset as number)) {
          const w = (b.offset as number) - (a.offset as number);
          return w <= 0 ? (b.opacity as number) : (a.opacity as number) + ((b.opacity as number) - (a.opacity as number)) * ((p - (a.offset as number)) / w);
        }
      }
      return kf[kf.length - 1].opacity as number;
    };
    for (let off = -H; off <= 2 * H; off += 37) {
      const top = paneTop(0, off, H, n), p = lapProgress(0, off, H, n);
      expect(at(p), `offset ${off}`).toBeCloseTo(capOpacity(top + span[0], top + span[1], ...band), 2);
    }
    expect(capOpacity(H * 0 + span[0], H * 0 + span[1], ...band)).toBe(1); // (square in the screen, its words stand whole)
  });

  it("a pane's words fade as they pass under the header or the foot, and stand whole between", () => {
    const band = [140, 782] as const; // (under the switches; above a 62 px foot on an 844 screen)
    expect(capOpacity(600, 700, ...band)).toBe(1);
    expect(capOpacity(700, 782, ...band)).toBe(0); // (its foot at the foot's top)
    expect(capOpacity(700, 772, ...band)).toBeCloseTo(0.5, 6); // (10 px clear of 20)
    expect(capOpacity(700, 900, ...band)).toBe(0); // (under the foot)
    expect(capOpacity(140, 240, ...band)).toBe(0); // (its top at the header's bottom)
    expect(capOpacity(150, 250, ...band)).toBeCloseTo(0.5, 6);
    expect(capOpacity(-40, 60, ...band)).toBe(0); // (under the header)
    expect(capOpacity(600, 700, 500, 400)).toBe(1); // (no band to measure: whole)
  });

  it('plays every pane on the screen and the next to come in; rests the near; lets the far go', () => {
    expect(panePlay(0, H, H, 1)).toBe('play');
    expect(panePlay(-H / 2, H, H, 1)).toBe('play'); // (half out at the top)
    expect(panePlay(H / 2, H, H, 1)).toBe('play'); // (half in from below)
    expect(panePlay(H, H, H, 1)).toBe('play'); // (the next to come in, rolling on)
    expect(panePlay(H, H, H, -1)).toBe('rest'); // (… but not while the strip goes back)
    expect(panePlay(-H, H, H, -1)).toBe('play'); // (going back, the one above comes in)
    expect(panePlay(-H, H, H, 1)).toBe('rest');
    expect(panePlay(2 * H, H, H, 1)).toBe('rest');
    expect(panePlay(3 * H, H, H, 1)).toBe('free');
    expect(panePlay(-3 * H, H, H, 1)).toBe('free');
  });
});

describe("the reel's words (controls in plain sentences, the house's codes as they are; none on a pane)", () => {
  it('say what each control does', () => {
    expect(REEL_WORDS.back).toBe('◂ BACK TO THE REEL');
    expect(REEL_WORDS.all).toBe('LIST ▸');
    expect(REEL_WORDS.allLabel(17)).toBe('List all 17 films');
    expect(REEL_WORDS.chapterLine('CH·02', 5)).toBe('CH·02 ▪ 5 FILMS');
  });
});
