import { describe, expect, it } from 'vitest';
import {
  BAYER, bayer, carAt, carCount, cityScale, flyerAt, flyerCount, frameAt, INK, INKS, planCity, signOn, skyTone, STEPS, trainAt,
  TRAIN_EVERY, TRAIN_LEN, windowLit,
} from '../src/works/pixel-city';

// THE LIST's city (owner, 2026-10-13: "an animated 8bit city in the black background too" — "keep all the projects all
// perfectly readable in the middle"). The plan and the clock are pure; list-deco.ts paints them under the list's black
// column.
describe('the list\'s 8-bit city', () => {
  const W = 427, H = 240, band: [number, number] = [114, 313]; // a 2,560-wide plate at six screen pixels a city pixel
  const plan = planCity(7, W, H, band);

  it('is the same city for a seed, and another for another', () => {
    expect(JSON.stringify(planCity(7, W, H, band).buildings)).toBe(JSON.stringify(plan.buildings));
    expect(JSON.stringify(planCity(8, W, H, band).buildings)).not.toBe(JSON.stringify(plan.buildings));
  });

  it('runs every skyline across the whole width, with nothing in the header\'s rows (the top fifth)', () => {
    for (const layer of [0, 1, 2] as const) {
      const cover = new Uint8Array(W);
      for (const b of plan.buildings.filter((q) => q.layer === layer)) for (let x = Math.max(0, b.x); x < Math.min(W, b.x + b.w); x++) cover[x] = 1;
      const gaps = cover.reduce((n, c) => n + (c ? 0 : 1), 0);
      expect(gaps / W, `layer ${layer}: open columns`).toBeLessThan(layer === 1 ? 0.2 : 0.12);
    }
    for (const b of plan.buildings) {
      const tops = [b.top, ...b.roof.map((q) => q.y), ...b.signs.map((s) => s.y), ...b.masts.map((m) => m.y)];
      expect(Math.min(...tops), `a building at ${b.x}`).toBeGreaterThanOrEqual(H * 0.2);
    }
  });

  it('keeps windows and neon inside their buildings, and the moon and the beams in the margins', () => {
    for (const b of plan.buildings) {
      for (const w of b.wins) expect(w.x >= b.x && w.x < b.x + b.w && w.y >= b.top && w.y < b.base, `window ${w.x},${w.y}`).toBe(true);
      for (const s of b.signs.filter((q) => q.w <= 3)) expect(s.x >= b.x && s.x + s.w <= b.x + b.w && s.y >= b.top && s.y + s.h <= b.base).toBe(true);
    }
    const inMargin = (x: number) => x < band[0] || x >= band[1];
    expect(plan.moon.x, 'the moon in the left margin: the machines\' one light comes from it').toBeLessThan(band[0]);
    expect(plan.moon.y).toBeLessThan(H * 0.2);
    expect(plan.beams.length).toBe(2);
    for (const b of plan.beams) expect(inMargin(b.x)).toBe(true);
    const boards = plan.buildings.flatMap((b) => b.signs.filter((s) => s.w > 3));
    expect(boards.length).toBeGreaterThan(0);
    for (const s of boards) expect(inMargin(s.x) && inMargin(s.x + s.w - 1), 'a billboard where it is seen').toBe(true);
  });

  it('shows its stars only where the sky is open, and paints only the palette', () => {
    expect(plan.stars.length).toBeGreaterThan(50);
    for (const s of plan.stars) expect(s.y, `star ${s.x}`).toBeLessThan(plan.skyTop[s.x] - 1);
    const used = new Set<string>([...plan.stars.map((s) => s.c), ...plan.buildings.flatMap((b) => [...b.wins.map((w) => w.c), ...b.signs.map((s) => s.c)])]);
    for (const c of used) expect(INKS, c).toContain(c);
    for (const c of ['#C8FF00', '#FF2E63', '#B79CFF', '#EDEDE6']) expect(INKS).toContain(c); // the site's accents and its bone
  });

  it('bands the sky from the void at the top to the glow on the horizon, dithered by a 4 × 4 Bayer matrix', () => {
    expect(skyTone(0, H)).toBe(0);
    expect(skyTone(H * 0.25, H), 'the header\'s rows: the void').toBe(0);
    expect(skyTone(H * 0.82, H)).toBeCloseTo(INK.sky.length - 1, 6);
    for (let y = 1; y < H; y++) expect(skyTone(y, H)).toBeGreaterThanOrEqual(skyTone(y - 1, H));
    expect([...BAYER].sort((a, b) => a - b)).toEqual([...Array(16).keys()]);
    expect(bayer(0, 0)).toBeGreaterThan(0); expect(bayer(3, 3)).toBeLessThan(1);
  });

  it('blows up by whole screen pixels to about 290 rows', () => {
    for (const dh of [900, 1080, 1290, 1440, 1600, 2160]) {
      const s = cityScale(dh);
      expect(Number.isInteger(s)).toBe(true);
      expect(dh / s).toBeGreaterThan(220); expect(dh / s).toBeLessThanOrEqual(330);
    }
    expect(cityScale(300)).toBe(2);
  });

  it('runs its traffic on the 8-bit clock: a train each way in turn, cars and craft wrapping, signs stuttering', () => {
    expect(STEPS).toBe(12);
    expect(frameAt(1)).toBe(12);
    const a = trainAt(1, W)!, b = trainAt(TRAIN_EVERY + 1, W)!;
    expect(a.dir).toBe(1); expect(b.dir).toBe(-1);
    expect(trainAt(2, W)!.x).toBeGreaterThan(a.x);
    expect(trainAt(TRAIN_EVERY - 0.5, W), 'a gap between trains').toBeNull();
    expect(trainAt(0, W)!.x).toBe(-TRAIN_LEN);
    const n = carCount(W);
    expect(n).toBeGreaterThan(20);
    for (let i = 0; i < n; i++) for (const t of [0, 7.3, 1000]) { const c = carAt(i, t, W); expect(c.x).toBeGreaterThanOrEqual(-8); expect(c.x).toBeLessThanOrEqual(W + 8); }
    expect(carAt(0, 1, W).x).not.toBe(carAt(0, 2, W).x);
    for (let i = 0; i < flyerCount(W); i++) { const f = flyerAt(i, 33, W, H); expect(f.y).toBeGreaterThan(H * 0.19); expect(f.y).toBeLessThan(H * 0.51); }
    const sign = plan.buildings.flatMap((q) => q.signs)[0];
    const frames = Array.from({ length: sign.period }, (_, f) => signOn(sign, f));
    expect(frames.filter((on) => !on).length, 'a stutter of a few frames a beat').toBeGreaterThan(0);
    expect(frames.filter(Boolean).length).toBeGreaterThan(frames.length / 2);
    const flipper = plan.buildings.flatMap((q) => q.wins).find((w) => w.flip > 0)!;
    expect(windowLit(flipper, 0)).not.toBe(windowLit(flipper, flipper.flip));
  });
});
