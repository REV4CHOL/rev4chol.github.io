import { describe, expect, it } from 'vitest';
import {
  atlasCell, atlasSize, bladeAt, blinkAt, bobAt, CALLOUTS, cueAt, CUE_EVERY, CUT_EVERY, ditherRGB, dot, driftAt, fillCallout, fitAspect,
  FRAME_H, FRAME_W, ISO, LIGHT, lookAt, lutColor, OPEN_HELD, OPEN_MIN, openAt, orbitAt, project, pulseAt, RAMPS, scanAt, sheepAt, snap,
  unproject, type Vec,
} from '../src/works/machines';

// THE LIST's machines (owner, 2026-10-13, with an exploded isometric drawing: "mix between 3D and pixel arts like this.
// They have to feel like they are floating around in the space"; "highly customised to our overall art direction";
// "more crazy"). The view, the light, the inks, the clock and the screens are pure; works/list-machines.ts draws them.
describe('the list\'s machines', () => {
  it('sees them at the 2:1 pixel isometric angle, and steps them a whole pixel at a time', () => {
    for (const [a, b] of [[ISO.right, ISO.up], [ISO.right, ISO.forward], [ISO.up, ISO.forward]] as const) expect(dot(a, b)).toBeCloseTo(0, 9);
    for (const v of [ISO.right, ISO.up, ISO.forward]) expect(Math.hypot(...v)).toBeCloseTo(1, 9);
    for (const axis of [[1, 0, 0], [0, 0, 1]] as Vec[]) { const [x, y] = project(axis); expect(Math.abs(y / x), 'an edge climbs one pixel in two').toBeCloseTo(0.5, 9); }
    for (const p of [[0.3, 1.7, -2.2], [10.49, -3.1, 7.77], [-5.5, 0, 0.5]] as Vec[]) {
      const q = snap(p), [qx, qy] = project(q);
      expect(Math.abs(qx - Math.round(qx))).toBeLessThan(1e-9);
      expect(Math.abs(qy - Math.round(qy))).toBeLessThan(1e-9);
      expect(dot(q, ISO.forward), 'its depth kept').toBeCloseTo(dot(p, ISO.forward), 9);
    }
    const [ux, uy] = project(unproject(12, 7));
    expect(ux).toBeCloseTo(12, 9); expect(uy).toBeCloseTo(-7, 9);
  });

  it('lights every part from one sun (CR-301): tops light, faces to the screen\'s left the side tone, to its right the dark', () => {
    expect(dot(LIGHT, [0, 1, 0])).toBeGreaterThan(0.7); // past the second seam (0.56–0.70): the light tone, undithered
    const left = dot(LIGHT, [0, 0, 1]);
    expect(left).toBeGreaterThan(0.36); expect(left).toBeLessThan(0.56); // between the seams: the side tone, undithered
    expect(dot(LIGHT, [1, 0, 0])).toBeLessThan(0.22); // short of the first seam: the dark tone
    expect(project([0, 0, 1])[0], '+z faces the screen\'s left').toBeLessThan(0);
    expect(project([1, 0, 0])[0], '+x faces its right').toBeGreaterThan(0);
  });

  it('inks them in the site\'s palette, three tones an ink, each darker than the next', () => {
    const lum = (h: string) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    for (const tones of Object.values(RAMPS)) {
      expect(tones).toHaveLength(3);
      for (const t of tones) expect(t).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(lum(tones[0])).toBeLessThan(lum(tones[1]));
      expect(lum(tones[1])).toBeLessThan(lum(tones[2]));
    }
    const all = Object.values(RAMPS).flat().map((c) => c.toUpperCase());
    for (const c of ['#2418FF', '#C8FF00', '#FF2E63', '#B79CFF', '#EDEDE6']) expect(all, `the site's ${c}`).toContain(c);
  });

  it('breathes, floats and turns on the 12-step clock', () => {
    for (let t = 0; t < 30; t += 0.37) {
      const o = openAt(t, 10, 0);
      expect(o).toBeGreaterThanOrEqual(OPEN_MIN - 1e-9); expect(o).toBeLessThanOrEqual(1 + 1e-9);
      const b = bobAt(t, 7, 1);
      expect(Number.isInteger(b)).toBe(true); expect(Math.abs(b)).toBeLessThanOrEqual(2);
    }
    expect(OPEN_HELD, 'pointing at a film closes them up').toBeLessThan(OPEN_MIN);
    expect(orbitAt(0, 1) - orbitAt(0, 0)).toBeCloseTo((2 * Math.PI) / 3, 9);
    expect(orbitAt(60, 0) - orbitAt(0, 0), 'a turn a minute').toBeCloseTo(2 * Math.PI, 9);
    expect(bladeAt(0)).toBe(0); expect(bladeAt(CUT_EVERY)).toBe(0); expect(bladeAt(3)).toBeGreaterThan(0); expect(bladeAt(8)).toBe(1);
    for (let t = 0; t < 50; t += 0.9) {
      expect(scanAt(t)).toBeGreaterThanOrEqual(0); expect(scanAt(t)).toBeLessThan(1);
      for (let i = 0; i < 5; i++) { const q = pulseAt(t, i, 5); expect(q).toBeGreaterThanOrEqual(0); expect(q).toBeLessThan(1); }
      const [dx, dy] = driftAt(t, 4, 9, 2);
      expect(Math.abs(dx)).toBeLessThanOrEqual(4); expect(Math.abs(dy)).toBeLessThanOrEqual(2);
      const sh = sheepAt(t);
      expect(sh.u).toBeGreaterThanOrEqual(0); expect(sh.u).toBeLessThanOrEqual(1);
    }
    expect(sheepAt(10).facing).toBe(1); expect(sheepAt(50).facing).toBe(-1);
    expect(lookAt(0, 0, 3)).toEqual([0, 0]);
    const [lx, ly] = lookAt(-500, 10, 3);
    expect(lx, 'the eye turns toward the film').toBeLessThan(0); expect(Math.hypot(lx, ly)).toBeLessThanOrEqual(3.5);
    const blinks = Array.from({ length: 600 }, (_, f) => blinkAt(f)).filter(Boolean).length;
    expect(blinks).toBeGreaterThan(0); expect(blinks).toBeLessThan(60);
    expect(cueAt(0, 17)).toBe(0); expect(cueAt(CUE_EVERY, 17)).toBe(1); expect(cueAt(CUE_EVERY * 17, 17)).toBe(0); expect(cueAt(5, 0)).toBe(0);
  });

  it('grades the LUT cube as the site grades: shadows lifted into the field blue, highlights toward the film\'s own accent', () => {
    const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    for (const accent of ['#EFC468', '#4FB3FF', '#FFFFFF', '#8FCC6B']) {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) expect(lutColor(i, j, k, 4, accent)).toMatch(/^#[0-9a-f]{6}$/);
      const black = ch(lutColor(0, 0, 0, 4, accent)), white = ch(lutColor(3, 3, 3, 4, accent));
      expect(black[2], 'the shadows go blue').toBeGreaterThan(black[0]);
      expect(white.reduce((a, b) => a + b)).toBeGreaterThan(black.reduce((a, b) => a + b) + 300);
    }
    const warm = ch(lutColor(3, 3, 3, 4, '#FFA84D')), cool = ch(lutColor(3, 3, 3, 4, '#4FB3FF'));
    expect(warm[0] - warm[2]).toBeGreaterThan(cool[0] - cool[2]);
  });

  it('stands a film on a screen in its own shape, never cropped, in 8-bit colour', () => {
    expect(fitAspect('16:9', 32, 18)).toEqual({ x: 0, y: 0, w: 32, h: 18 });
    const scope = fitAspect('2.39:1', 32, 18);
    expect(scope.w).toBe(32); expect(scope.h).toBeLessThan(18); expect(scope.y).toBeGreaterThan(0);
    const tall = fitAspect('9:16', 32, 18);
    expect(tall.h).toBe(18); expect(tall.w).toBeLessThan(18); expect(tall.x).toBeGreaterThan(0);
    expect(fitAspect('4:3', 32, 18)).toEqual({ x: 4, y: 0, w: 24, h: 18 });
    const d = new Uint8ClampedArray(4 * 16 * 4).map((_, i) => (i * 37) % 256);
    ditherRGB(d, 4, 16);
    for (let i = 0; i < d.length; i++) expect(i % 4 === 3 ? d[i] === 255 : [0, 85, 170, 255].includes(d[i])).toBe(true);
    const n = 17, size = atlasSize(n);
    for (let i = 0; i <= n; i++) { const c = atlasCell(i); expect(c.x + FRAME_W).toBeLessThanOrEqual(size.w); expect(c.y + FRAME_H).toBeLessThanOrEqual(size.h); }
  });

  it('writes its callouts in the site\'s readout grammar', () => {
    for (const t of Object.values(CALLOUTS).flat()) expect(t).toMatch(/^[A-Z&_][A-Z0-9_&]* (::|▸|▮)/);
    expect(fillCallout('SPLICE ▸ {slug}', { slug: 'far-east' }, 'RVL-0000')).toBe('SPLICE ▸ FAR-EAST');
    expect(fillCallout('SPLICE ▸ {slug}', null, 'RVL-0000')).toBe('SPLICE ▸ NO SIGNAL');
  });
});
