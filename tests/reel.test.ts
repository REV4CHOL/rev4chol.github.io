import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aspectRatio, parseJson, parseProjects } from '../src/lib/content';
import { softBreaks } from '../src/lib/escape';
import {
  capKeyframes, capOpacity, coast, COAST_TAU, lapProgress, loopsAllowed, MAX_THROW, offsetFromLap, paneKeyframes, offsetForRail, ONE_LINE_MIN, oneLineSize, paneInView, panePlay, paneTop, railProgress,
  REEL_QUERY, REEL_WORDS, reelMode, releaseSpeed, roleLine, ROLL_SECONDS, stripOrder, TITLE_MAX, TITLE_MIN, wrapStart,
  lapSeconds, lapUnits, offsetForPane, offsetForPlace, paneUnits, places, railTicks, rollPace, screenUnits, SIDE_QUERY, stripPlace,
  arrivalOffset,
} from '../src/works/reel';

// WORK ON A PHONE (owner, 2026-10-20: "on Phone, its completely overwhelming and disorienting … a complete redesign of
// the interface of the Work section, still keeping the fundamental art direction, but changing the UI/UX specifically
// for Phones"): the reel, a rolling strip of panes with only the film's name and its roles on each. A pane was the size
// of the screen, as antiantiart.com's on a phone; since 2026-11-24 it is half of it, and two show at once.
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
  const VIEW = 844, UNIT = VIEW / 2; // (an upright 390 × 844 phone: two panes on the screen)
  const ones = (n: number): number[] => Array.from({ length: n }, () => 1);
  // chapters of 1, 2, 5 with a tall pane, and 12 (the two real ones are the last two); then a tall pane alone, and with one more
  const CHAPTERS: boolean[][] = [[false], [false, false], [false, false, false, false, true], ones(12).map(() => false), [true], [true, false]];
  /** a chapter's strip as the view lays it: built once for the upright screen, measured as the screen stands */
  const lay = (tall: boolean[], side: boolean) => {
    const order = stripOrder(tall.map((t) => paneUnits(t, false)), screenUnits(false));
    const units = order.map((f) => paneUnits(tall[f], side)), view = side ? 390 : VIEW;
    return { units, at: places(units), total: lapUnits(units), unit: view / screenUnits(side), view };
  };

  it('is endless: every pane stands once in a lap, and the screen is always covered, upright and on its side', () => {
    for (const tall of CHAPTERS) for (const side of [false, true]) {
      const { units, at, total, unit, view } = lay(tall, side);
      expect(units.length).toBeGreaterThanOrEqual(3);
      expect(total).toBeGreaterThanOrEqual(screenUnits(side) + Math.max(...units)); // (the screen and the tallest pane)
      for (const offset of [0, 1, 211, unit, view, 5 * unit + 17, -3 * unit - 5, 1e6]) {
        const spans = units.map((u, i) => { const top = paneTop(at[i], u, offset, unit, total); return [top, top + u * unit]; });
        spans.forEach(([top], i) => { // (from its own height above the screen's top to the lap's end)
          expect(top).toBeGreaterThanOrEqual(-units[i] * unit - 1e-6);
          expect(top).toBeLessThan((total - units[i]) * unit + 1e-6);
        });
        // down the screen each pane starts where the last one ended: no gap, no overlap
        const on = spans.filter(([top, bottom]) => bottom > 1e-6 && top < view - 1e-6).sort((a, b) => a[0] - b[0]);
        expect(on[0][0]).toBeLessThanOrEqual(1e-6);
        for (let k = 1; k < on.length; k++) expect(on[k][0]).toBeCloseTo(on[k - 1][1], 6);
        expect(on[on.length - 1][1]).toBeGreaterThanOrEqual(view - 1e-6);
      }
    }
  });

  it('rolls the next film in from below: one unit on, the strip has moved one pane', () => {
    expect(paneTop(0, 1, 0, UNIT, 12)).toBe(0);
    expect(paneTop(1, 1, 0, UNIT, 12)).toBe(UNIT); // (two panes fill the screen at rest)
    expect(paneTop(2, 1, 0, UNIT, 12)).toBe(VIEW); // (the third waits just under it)
    expect(paneTop(1, 1, UNIT, UNIT, 12)).toBe(0);
    expect(paneTop(0, 1, UNIT, UNIT, 12)).toBe(-UNIT);
    expect(paneTop(0, 1, 12 * UNIT, UNIT, 12)).toBe(0); // (a whole lap: the first film again)
    expect(paneTop(11, 1, -UNIT, UNIT, 12)).toBe(0); // (dragged back from the first film: the last one)
    // a tall pane (CH·02's last: place 4, 2 units, a lap of 6) is the whole screen
    expect(paneTop(4, 2, 4 * UNIT, UNIT, 6)).toBe(0); // (square in the screen)
    expect(paneTop(4, 2, 6 * UNIT - 1, UNIT, 6)).toBe(1 - VIEW); // (a pixel of it left at the top …)
    expect(paneTop(4, 2, 6 * UNIT + 1, UNIT, 6)).toBe(4 * UNIT - 1); // (… then it waits two screens down: never a jump in sight)
    // on its side a pane is the screen, as before
    expect(paneTop(1, 1, 390, 390, 12)).toBe(0);
    expect(paneTop(0, 1, 390, 390, 12)).toBe(-390);
  });

  it("knows the film in view, the pane under the screen's middle; the rail's playhead marks that point of the lap", () => {
    const twelve = ones(12), ch2 = [1, 1, 1, 1, 2];
    expect(paneInView(-UNIT / 2, UNIT, VIEW, twelve)).toBe(0); // (the first pane's middle on the screen's)
    expect(paneInView(0, UNIT, VIEW, twelve)).toBe(1); // (at rest the middle is the second pane's top)
    expect(paneInView(UNIT * 0.9, UNIT, VIEW, twelve)).toBe(1);
    expect(paneInView(UNIT, UNIT, VIEW, twelve)).toBe(2);
    expect(paneInView(-UNIT - 1, UNIT, VIEW, twelve)).toBe(11);
    expect(paneInView(3 * UNIT, UNIT, VIEW, ch2)).toBe(4); // (the tall pane, from its top …)
    expect(paneInView(5 * UNIT - 1, UNIT, VIEW, ch2)).toBe(4); // (… to its foot)
    expect(paneInView(0, UNIT, VIEW, [])).toBe(0);
    // the playhead sits on a film's tick when that film's middle is on the screen's
    const ticks = railTicks(ch2);
    ch2.forEach((u, i) => expect(railProgress(offsetForPane(places(ch2)[i], u, UNIT, VIEW, 6, 0), UNIT, VIEW, 6)).toBeCloseTo(ticks[i], 9));
    expect(railProgress(0, UNIT, VIEW, 12)).toBeCloseTo(1 / 12, 9); // (at rest: between the first two films' ticks)
    expect(railProgress(12 * UNIT, UNIT, VIEW, 12)).toBeCloseTo(1 / 12, 9);
    for (const i of [0, 4, 11]) expect(railProgress(i * 390, 390, 390, 12)).toBeCloseTo((i + 0.5) / 12, 9); // (on its side, as before: on its tick when it stands square)
    expect(railProgress(0, 0, VIEW, 12)).toBe(0);
  });

  it("a touch on the rail brings that point of the lap to the screen's middle, on the lap the strip is already on", () => {
    const twelve = ones(12), ticks = railTicks(twelve);
    for (const i of [0, 3, 5, 11]) {
      const at = offsetForRail(ticks[i], UNIT, VIEW, 12, 0);
      expect(paneInView(at, UNIT, VIEW, twelve)).toBe(i);
      expect(railProgress(at, UNIT, VIEW, 12)).toBeCloseTo(ticks[i], 9);
      expect(Math.abs(at)).toBeLessThanOrEqual(6 * UNIT); // (the short way round)
    }
    // the vertical film's tick stands its pane square in the screen
    expect(paneTop(4, 2, offsetForRail(railTicks([1, 1, 1, 1, 2])[4], UNIT, VIEW, 6, 0), UNIT, 6)).toBeCloseTo(0, 6);
    const far = 40 * 12 * UNIT; // (forty laps on)
    expect(Math.abs(offsetForRail(0.5, UNIT, VIEW, 12, far) - far)).toBeLessThanOrEqual(6 * UNIT);
    expect(offsetForRail(-1, UNIT, VIEW, 12, 0)).toBeCloseTo(-VIEW / 2, 6); // (held to the rail's ends)
    expect(offsetForRail(11.5 / 12, 390, 390, 12, 0)).toBeCloseTo(-390, 6); // (on its side, as before: the last film is one pane back)
  });

  it('a short chapter is laid again until it holds the screen and its tallest pane, and never fewer than three panes', () => {
    expect(stripOrder(ones(12), 2)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(stripOrder([1, 1, 1, 1, 2], 2)).toEqual([0, 1, 2, 3, 4]); // (CH·02: 6 units, laid once)
    expect(stripOrder([1, 1], 2)).toEqual([0, 1, 0, 1]);
    expect(stripOrder([1], 2)).toEqual([0, 0, 0]); // (upright: three units for unit panes)
    expect(stripOrder([2, 1], 2)).toEqual([0, 1, 0, 1]); // (… four with a vertical film: 3 units are too few)
    expect(stripOrder([1, 1, 2], 2)).toEqual([0, 1, 2]);
    expect(stripOrder([2], 2)).toEqual([0, 0, 0]); // (4 units would do: never fewer than three panes)
    expect(stripOrder([1, 1], 1)).toEqual([0, 1, 0, 1]); // (on its side, as before)
    expect(stripOrder([1], 1)).toEqual([0, 0, 0]);
    expect(stripOrder([], 2)).toEqual([]);
    for (const tall of CHAPTERS) { // (a strip laid for the upright screen is long enough on its side: a turn never rebuilds it)
      const side = stripOrder(tall.map((t) => paneUnits(t, true)), screenUnits(true));
      expect(stripOrder(tall.map((t) => paneUnits(t, false)), screenUnits(false)).length).toBeGreaterThanOrEqual(side.length);
    }
  });

  // (owner, 2026-10-20: "I want the auto scrolling to happen instantly, but slower and smoother")
  it('rolls one screen every 18 seconds ("Even slower"); a throw coasts to its target, a rest swells into the roll', () => {
    expect(ROLL_SECONDS).toBe(18);
    expect(coast(3000, 0, COAST_TAU)).toBeCloseTo(3000 / Math.E, 6);
    let v = 3000;
    for (let t = 0; t < 3; t += 1 / 60) v = coast(v, 0, 1 / 60);
    expect(Math.abs(v)).toBeLessThan(5); // (a hard throw is at rest within three seconds)
    let r = 0;
    for (let t = 0; t < 2; t += 1 / 60) r = coast(r, rollPace(VIEW), 1 / 60);
    expect(r).toBeGreaterThan(0.98 * rollPace(VIEW)); // (and the roll is back to pace within two)
    expect(coast(500, 120, 0)).toBe(500);
  });

  it('the finger\'s throw: its travel over its last 100 ms, up moving the strip on, held still throwing nothing', () => {
    expect(releaseSpeed([[0, 600], [50, 500], [100, 400]], 100)).toBeCloseTo(2000, 6); // (up 200 px in 0.1 s)
    expect(releaseSpeed([[0, 400], [100, 600]], 100)).toBeCloseTo(-2000, 6); // (down: back)
    expect(releaseSpeed([[0, 600], [40, 400], [300, 400]], 300)).toBe(0); // (stopped, then lifted)
    expect(releaseSpeed([[0, 600]], 0)).toBe(0);
    expect(releaseSpeed([[0, 900], [10, 0]], 10)).toBe(MAX_THROW);
  });

  it("on the compositor: each pane's lap is the same place as the strip's arithmetic, and the clock's time gives the offset back", () => {
    for (const tall of CHAPTERS) for (const side of [false, true]) {
      const { units, at, total, unit } = lay(tall, side), lap = total * unit;
      for (const off of [0, 300, unit, 7.5 * unit, -2.25 * unit]) {
        units.forEach((u, i) => {
          const p = lapProgress(at[i], u, off, unit, total);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThan(1);
          // the keyframes run from the lap less the pane's own height down to its own height up, linearly
          const y = (total - u) * unit - p * lap;
          const d = (((y - paneTop(at[i], u, off, unit, total)) % lap) + lap) % lap;
          expect(Math.min(d, lap - d)).toBeCloseTo(0, 6); // (the same place, a whole lap apart at most)
        });
        expect(offsetFromLap(lapProgress(0, units[0], off, unit, total), units[0], unit, total, off)).toBeCloseTo(off, 6); // (the offset read back off the clock)
      }
    }
    expect(paneKeyframes(1, 12)).toEqual([{ transform: 'translate3d(0, 1100%, 0)' }, { transform: 'translate3d(0, -100%, 0)' }]);
    expect(paneKeyframes(1, 6)).toEqual([{ transform: 'translate3d(0, 500%, 0)' }, { transform: 'translate3d(0, -100%, 0)' }]);
    // a tall pane's keyframes differ only by the ratio: in its own height, (6 − 2) / 2 of itself down
    expect(paneKeyframes(2, 6)).toEqual([{ transform: 'translate3d(0, 200%, 0)' }, { transform: 'translate3d(0, -100%, 0)' }]);
    expect(offsetFromLap(lapProgress(0, 1, 3 * UNIT, UNIT, 12), 1, UNIT, 12, 0)).toBeCloseTo(3 * UNIT, 6);
    const far = 40 * 6 * UNIT + 100; // (a tall first pane, forty laps on)
    expect(offsetFromLap(lapProgress(0, 2, far, UNIT, 6), 2, UNIT, 6, far - 100)).toBeCloseTo(far, 6);
  });

  it("the words' fade, laid on the lap as keyframes, matches the fade the strip computes by hand: a half pane's, and a tall pane's", () => {
    const band: [number, number] = [124, 782]; // (under the header; above a 62 px foot on an 844 screen)
    const cases: [u: number, total: number, span: [number, number]][] = [
      [1, 12, [218, 334]], // a half pane: its words end 88 px above its own foot
      [1, 12, [191, 334]], // the tallest name of chapter one (143 px)
      [2, 6, [640, 756]], // the tall pane: where a whole-screen pane's words stood before
    ];
    for (const [u, total, span] of cases) {
      const kf = capKeyframes(u, UNIT, total, span, band);
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
      for (let off = -VIEW; off <= 2 * VIEW; off += 37) {
        const top = paneTop(0, u, off, UNIT, total), p = lapProgress(0, u, off, UNIT, total);
        expect(at(p), `${u} of ${total}, offset ${off}`).toBeCloseTo(capOpacity(top + span[0], top + span[1], ...band), 2);
      }
    }
    // at rest both panes' names stand whole: the upper pane's, and the lower one's clear of the foot
    expect(capOpacity(218, 334, ...band)).toBe(1);
    expect(capOpacity(UNIT + 218, UNIT + 334, ...band)).toBe(1);
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

  // (owner, 2026-11-24, on the design: the next pane starts as it enters, so three loops decode at most)
  it('plays every pane on the screen; rests the panes within one unit of it, loaded; lets the far go', () => {
    expect(panePlay(0, UNIT, VIEW, UNIT)).toBe('play');
    expect(panePlay(UNIT, UNIT, VIEW, UNIT)).toBe('play'); // (the lower of the two)
    expect(panePlay(1 - UNIT, UNIT, VIEW, UNIT)).toBe('play'); // (a pixel of it left at the top)
    expect(panePlay(VIEW - 1, UNIT, VIEW, UNIT)).toBe('play'); // (a pixel in from below: it starts as it enters)
    expect(panePlay(VIEW, UNIT, VIEW, UNIT)).toBe('rest'); // (the next to come in: loaded, paused)
    expect(panePlay(-UNIT, UNIT, VIEW, UNIT)).toBe('rest'); // (the one that has just left)
    expect(panePlay(VIEW + UNIT - 1, UNIT, VIEW, UNIT)).toBe('rest');
    expect(panePlay(VIEW + UNIT, UNIT, VIEW, UNIT)).toBe('free');
    expect(panePlay(-2 * UNIT, UNIT, VIEW, UNIT)).toBe('free');
    expect(panePlay(0, VIEW, VIEW, UNIT)).toBe('play'); // (the tall pane, square in the screen)
    expect(panePlay(VIEW, VIEW, VIEW, UNIT)).toBe('rest');
    expect(panePlay(-VIEW - UNIT, VIEW, VIEW, UNIT)).toBe('free');
    expect(panePlay(390, 390, 390, 390)).toBe('rest'); // (on its side a unit is the screen)
    expect(panePlay(780, 390, 390, 390)).toBe('free');
  });

  it('never plays more than three loops, nor loads more than five, wherever the strip stands', () => {
    for (const tall of CHAPTERS) for (const side of [false, true]) {
      const { units, at, total, unit, view } = lay(tall, side);
      for (let off = -total * unit; off <= 2 * total * unit; off += 13) {
        const want = units.map((u, i) => panePlay(paneTop(at[i], u, off, unit, total), u * unit, view, unit));
        const playing = want.filter((w) => w === 'play').length;
        expect(playing, `${units} at ${off}`).toBeGreaterThanOrEqual(1);
        expect(playing, `${units} at ${off}`).toBeLessThanOrEqual(3);
        expect(want.filter((w) => w !== 'free').length, `${units} at ${off}`).toBeLessThanOrEqual(5);
      }
    }
  });
});

// (owner, 2026-11-24: "the panes are too long in length and should be shorten. we should be able to see two panes on
// the phone screen at the same time instead")
describe('the strip, measured in units: two panes on an upright screen', () => {
  const unitsOf = (cat: string, side: boolean) => films.filter((p) => p.category === cat).map((p) => paneUnits(aspectRatio(p.aspect) < 1, side));

  it("upright a pane is half the screen and a vertical film's is the whole of it; on its side every pane is the screen", () => {
    expect(screenUnits(false)).toBe(2);
    expect(screenUnits(true)).toBe(1);
    expect(paneUnits(false, false)).toBe(1);
    expect(paneUnits(true, false)).toBe(2); // (vertical footage is never cropped wide: its pane is two panes high)
    expect(paneUnits(true, true)).toBe(1); // (on a sideways screen it stands whole in the middle of one pane)
    expect(paneUnits(false, true)).toBe(1);
    expect(SIDE_QUERY).toBe('(max-height: 500px)'); // (the styles' sideways block asks the same line: tests/floor-ways.test.ts)
    expect(REEL_QUERY).toContain(SIDE_QUERY); // (the short screen the page asks about is the sideways one)
  });

  it("a pane's place is the units before it, and a lap is all of them: the two chapters hold 14 and 6", () => {
    expect(places([1, 1, 1, 1, 2])).toEqual([0, 1, 2, 3, 4]);
    expect(places([2, 1, 1])).toEqual([0, 2, 3]);
    expect(places([])).toEqual([]);
    expect(lapUnits([1, 1, 1, 1, 2])).toBe(6);
    expect(lapUnits([])).toBe(0);
    expect(lapUnits(unitsOf('human', false))).toBe(14); // (fourteen films since THE LOVERS and XIÊU LÒNG, 2026-11-24)
    expect(unitsOf('machine', false)).toEqual([1, 1, 1, 1, 2]); // (GALAXY Z FOLD 8 ULTRA, 9:16, stands last)
    expect(lapUnits(unitsOf('machine', true))).toBe(5); // (on its side every pane is one unit)
  });

  it("the pace is one screen's height every 18 seconds, whatever a pane's height", () => {
    expect(rollPace(844)).toBeCloseTo(844 / ROLL_SECONDS, 9); // (47 px a second on an 844-px phone, as before)
    expect(lapSeconds(1, 422, 844)).toBeCloseTo(9, 9); // (a unit pane passes a line in 9 seconds)
    expect(lapSeconds(12, 422, 844)).toBeCloseTo(108, 9);
    expect(lapSeconds(6, 422, 844)).toBeCloseTo(54, 9);
    expect(lapSeconds(12, 390, 390)).toBeCloseTo(216, 9); // (on its side a pane is the screen: 18 seconds a pane)
    for (const [total, unit, view] of [[12, 422, 844], [6, 320, 640], [5, 390, 390], [4, 457.5, 915]]) {
      expect((total * unit) / lapSeconds(total, unit, view)).toBeCloseTo(rollPace(view), 9); // (a lap's length over its time)
    }
    expect(lapSeconds(12, 422, 0)).toBe(0);
  });

  it("the rail has one tick a film, at its middle along the lap: the vertical film's stretch is twice as long", () => {
    const close = (got: number[], want: number[]) => { expect(got).toHaveLength(want.length); got.forEach((g, i) => expect(g).toBeCloseTo(want[i], 9)); };
    close(railTicks([1, 1, 1, 1, 2]), [0.5 / 6, 1.5 / 6, 2.5 / 6, 3.5 / 6, 5 / 6]);
    close(railTicks([1, 1, 1, 1, 1]), [0.1, 0.3, 0.5, 0.7, 0.9]); // (on its side: evenly, as before)
    close(railTicks(Array.from({ length: 12 }, () => 1)), Array.from({ length: 12 }, (_, i) => (i + 0.5) / 12));
    expect(railTicks([])).toEqual([]);
  });

  it("the strip's place is the pane under the screen's middle; it holds through a turn of the phone", () => {
    const up = [1, 1, 1, 1, 2], side = [1, 1, 1, 1, 1];
    expect(stripPlace(0, 422, 844, up)).toEqual([1, 0]); // (at offset 0 two panes fill the screen: its middle is the second one's top)
    expect(stripPlace(-211, 422, 844, up)).toEqual([0, 0.5]);
    expect(stripPlace(4 * 422, 422, 844, up)).toEqual([4, 0.5]); // (the tall pane square in the screen)
    expect(stripPlace(100, 0, 844, up)).toEqual([0, 0]);
    expect(stripPlace(100, 422, 844, [])).toEqual([0, 0]);
    // turned on its side, the same film stands under the middle: the vertical film whole in the screen
    expect(offsetForPlace(4, 0.5, 390, 390, side)).toBeCloseTo(4 * 390, 9);
    expect(offsetForPlace(9, 0.5, 390, 390, side)).toBe(0); // (no such pane)
    for (const units of [up, side, [2, 1, 1], Array.from({ length: 12 }, () => 1)]) {
      for (const [unit, view] of [[422, 844], [390, 390], [320, 640]]) for (const off of [0, 1, 333, 5 * unit + 17, -3 * unit - 5, 1e6]) {
        const [pane, part] = stripPlace(off, unit, view, units);
        expect(part).toBeGreaterThanOrEqual(0);
        expect(part).toBeLessThanOrEqual(1);
        const lap = lapUnits(units) * unit, back = offsetForPlace(pane, part, unit, view, units);
        const d = (((back - off) % lap) + lap) % lap;
        expect(Math.min(d, lap - d), `${units} ${unit} ${view} ${off}`).toBeCloseTo(0, 6); // (the same place, whole laps apart)
      }
    }
  });

  it("a keyboard's focus brings its pane to the middle of the screen, on the lap the strip is on", () => {
    expect(offsetForPane(3, 1, 422, 844, 12, 0)).toBeCloseTo(3 * 422 - 211, 9); // (a quarter of the screen clear above it, and below)
    expect(offsetForPane(0, 1, 422, 844, 12, 0)).toBeCloseTo(-211, 9);
    expect(offsetForPane(4, 2, 422, 844, 6, 0)).toBeCloseTo(-2 * 422, 9); // (the tall pane square in the screen, the short way round)
    expect(offsetForPane(4, 1, 390, 390, 5, 0)).toBeCloseTo(-390, 9); // (on its side a pane stands square, as before)
    const far = 40 * 12 * 422;
    expect(Math.abs(offsetForPane(3, 1, 422, 844, 12, far) - far)).toBeLessThanOrEqual(6 * 422);
    expect(offsetForPane(3, 1, 0, 844, 12, 50)).toBeCloseTo(-422, 9); // (no height yet: no lap to choose)
  });

  // (owner, 2026-11-24, shown film 1's name going under the header the moment the strip arrived: "Film 1 in the lower
  // half") the strip arrives with film 1's bottom edge at the screen's bottom: the screen's units less film 1's units
  // before the lap's start
  it("the strip arrives with film 1 in the lower half and the chapter's last film above it; on its side film 1 fills the screen", () => {
    const twelve = Array.from({ length: 12 }, () => 1);
    expect(arrivalOffset(twelve, 422, 844)).toBe(-422); // (upright: one pane early in its lap)
    expect(arrivalOffset([1, 1, 1, 1, 1], 390, 390)).toBe(0); // (on its side: film 1 fills the screen, as before)
    expect(arrivalOffset([2, 1, 1], 422, 844)).toBe(0); // (a vertical first film fills the upright screen)
    expect(arrivalOffset([1, 1, 1], 422, 844)).toBe(-422); // (a chapter of one film, laid again three times)
    expect(arrivalOffset([], 422, 844)).toBe(0);
    const cases: [number[], number, number][] = [
      [twelve, 422, 844], [twelve, 332, 664], [twelve, 320, 640], [[1, 1, 1, 1, 2], 422, 844], [[1, 1, 1, 1, 1], 390, 390],
      [[2, 1, 1], 422, 844], [[1, 1, 1], 422, 844], [[2, 2, 2], 422, 844], [[1, 1, 1], 390, 390],
    ];
    for (const [units, unit, view] of cases) {
      const off = arrivalOffset(units, unit, view), total = lapUnits(units), at = places(units), n = units.length;
      expect(off).toBeLessThanOrEqual(0);
      expect(paneTop(0, units[0], off, unit, total) + units[0] * unit, `${units} ${view}`).toBeCloseTo(view, 9); // (film 1's bottom edge at the screen's bottom)
      // above film 1, the strip's last pane: its bottom edge on film 1's top (a vertical film 1, or a sideways screen: above the screen)
      expect(paneTop(at[n - 1], units[n - 1], off, unit, total) + units[n - 1] * unit).toBeCloseTo(view - units[0] * unit, 9);
      // on the screen, film 1 and (upright, film 1 a half pane) the last pane play; the next to come in rests at the screen's foot
      const play = units.map((u, i) => panePlay(paneTop(at[i], u, off, unit, total), u * unit, view, unit));
      expect(play.flatMap((p, i) => (p === 'play' ? [i] : []))).toEqual(off < 0 ? [0, n - 1] : [0]);
      const next = paneTop(at[1], units[1], off, unit, total); // (at the screen's foot; in a strip of three that same place a lap round, where it comes in)
      expect([view, view - total * unit].some((y) => Math.abs(next - y) < 1e-9), `${units} ${view}: ${next}`).toBe(true);
      expect(play[1]).toBe('rest');
    }
  });

  it("at arrival the screen's middle is the seam between the last film and film 1: the film in view is film 1, the playhead at the rail's top, moving down", () => {
    const twelve = Array.from({ length: 12 }, () => 1), off = arrivalOffset(twelve, 422, 844);
    expect(stripPlace(off, 422, 844, twelve)).toEqual([0, 0]);
    expect(paneInView(off, 422, 844, twelve)).toBe(0);
    expect(railProgress(off, 422, 844, 12)).toBe(0);
    expect(railProgress(off + 1, 422, 844, 12)).toBeCloseTo(1 / (12 * 422), 9); // (a pixel on, a pixel down the rail: no wrap from its end)
    expect(railProgress(off + 1, 422, 844, 12)).toBeLessThan(railTicks(twelve)[0]); // (above film 1's tick, coming to it)
    const galaxy = [1, 1, 1, 1, 2], o2 = arrivalOffset(galaxy, 422, 844); // (chapter two: the tall last film's lower half above film 1)
    expect(paneTop(4, 2, o2, 422, 6)).toBeCloseTo(-422, 9);
    expect(stripPlace(o2, 422, 844, galaxy)).toEqual([0, 0]);
    expect(railProgress(o2, 422, 844, 6)).toBe(0);
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
