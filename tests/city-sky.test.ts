import { describe, expect, it } from 'vitest';
import { blendLooks, ease, hexToRgb, lerpHex, LOOKS, nextTime, paintSky, parseTime, TIMES } from '../src/about/city-sky';

const HEX = /^#[0-9a-f]{6}$/;

describe('Time of day', () => {
  it('has a complete, sane look for every time', () => {
    expect(TIMES).toEqual(['night', 'dusk', 'dawn', 'haze', 'day']);
    for (const t of TIMES) {
      const L = LOOKS[t];
      expect(L.label.length).toBeGreaterThan(2);
      for (const c of [L.key.color, L.hemi.sky, L.hemi.ground, L.fog.color, L.sun.color, L.clouds.high, L.clouds.low, L.water, L.sky.lobe.color]) expect(c).toMatch(HEX);
      for (const [p, c] of L.sky.stops) { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); expect(c).toMatch(HEX); }
      for (const v of [L.windows, L.lamps, L.walls, L.stars, L.moon, L.horizon, L.sun.opacity]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(L.exposure).toBeGreaterThan(0.5); expect(L.exposure).toBeLessThan(2);
      expect(L.key.intensity).toBeGreaterThan(0); expect(L.hemi.intensity).toBeGreaterThan(0);
      expect(L.fog.density).toBeGreaterThan(0.5);
      expect(L.key.dir[1]).toBeGreaterThan(0); // the key is always above the horizon (even at dusk, a hair)
    }
    // the night is lit by its lamps and its windows; the day is not
    expect(LOOKS.night.lamps).toBe(1); expect(LOOKS.day.lamps).toBe(0);
    expect(LOOKS.night.windows).toBe(1); expect(LOOKS.day.windows).toBeLessThan(0.2);
    expect(LOOKS.night.stars).toBe(1); expect(LOOKS.day.stars).toBe(0);
    // the hazy morning is the thickest air, the day the clearest
    expect(LOOKS.haze.fog.density).toBeGreaterThan(LOOKS.dawn.fog.density);
    expect(LOOKS.day.walls).toBeLessThan(LOOKS.night.walls); // a sun needs far less lift than the lamps
    expect(LOOKS.day.fog.density).toBeLessThan(LOOKS.dawn.fog.density);
  });

  it('blends every value between two looks and returns the endpoints exactly', () => {
    const a = LOOKS.night, b = LOOKS.day;
    expect(blendLooks(a, b, 0)).toBe(a);
    expect(blendLooks(a, b, 1)).toBe(b);
    const m = blendLooks(a, b, 0.5);
    expect(m.exposure).toBeCloseTo((a.exposure + b.exposure) / 2, 6);
    expect(m.lamps).toBeCloseTo(0.5, 6);
    expect(m.key.dir[1]).toBeCloseTo((a.key.dir[1] + b.key.dir[1]) / 2, 6);
    expect(m.grade.contrast).toBeCloseTo((a.grade.contrast + b.grade.contrast) / 2, 6);
    expect(m.water).toMatch(HEX);
    expect(m.sky).toBe(b.sky); // the dome crossfades separately: the target's gradient is carried
    expect(lerpHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(ease(0)).toBe(0); expect(ease(1)).toBe(1); expect(ease(0.5)).toBeCloseTo(0.5, 6);
    expect(ease(0.25)).toBeLessThan(0.25); // slow in
  });

  it('paints a dome: the zenith is the first stop, the horizon glows toward the key and not away from it', () => {
    const size = 64;
    const px = paintSky(LOOKS.dusk, size);
    expect(px.length).toBe(size * size * 4);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
    const [r, g, b] = hexToRgb(LOOKS.dusk.sky.stops[0][1]);
    expect(Math.abs(px[0] - r) + Math.abs(px[1] - g) + Math.abs(px[2] - b)).toBeLessThan(6);
    // the horizon row: the column under the sun is warmer than the column opposite
    const [dx, , dz] = LOOKS.dusk.key.dir;
    const u0 = ((Math.atan2(dz, -dx) / (Math.PI * 2)) % 1 + 1) % 1;
    const row = Math.round(0.5 * (size - 1));
    const at = (u: number) => { const o = (row * size + Math.floor(((u % 1) + 1) % 1 * size)) * 4; return px[o] + px[o + 1] + px[o + 2]; };
    expect(at(u0)).toBeGreaterThan(at(u0 + 0.5) + 60);
    // the night has no lobe: the horizon row is even all round
    const night = paintSky(LOOKS.night, size);
    const o1 = (row * size) * 4, o2 = (row * size + size / 2) * 4;
    expect(night[o1]).toBe(night[o2]); expect(night[o1 + 2]).toBe(night[o2 + 2]);
  });

  it('parses stored times safely and cycles them', () => {
    expect(parseTime('dawn')).toBe('dawn');
    expect(parseTime('noon')).toBe('night');
    expect(parseTime(null)).toBe('night');
    expect(nextTime('night')).toBe('dusk');
    expect(nextTime('day')).toBe('night');
  });
});
