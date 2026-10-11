import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { blendLooks, ease, hexToRgb, horizonColor, lerpHex, LOOKS, nextTime, paintSky, parseTime, SKY_DEPTH, TIMES } from '../src/about/city-sky';
import { TIERS } from '../src/about/city-governor';
import { G } from '../src/about/city-plan';

const HEX = /^#[0-9a-f]{6}$/;

describe('Time of day', () => {
  it('has a complete, sane look for every time', () => {
    expect(TIMES).toEqual(['dawn', 'day', 'haze', 'dusk', 'night']);
    for (const t of TIMES) {
      const L = LOOKS[t];
      expect(L.label.length).toBeGreaterThan(2);
      for (const c of [L.key.color, L.hemi.sky, L.hemi.ground, L.fog.color, L.sun.color, L.clouds.high, L.clouds.low, L.water, L.sky.lobe.color, L.bleach.color, L.glass]) expect(c).toMatch(HEX);
      for (const [p, c] of L.sky.stops) { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); expect(c).toMatch(HEX); }
      for (const v of [L.windows, L.lamps, L.walls, L.bleach.amount, L.stars, L.moon, L.horizon, L.sun.opacity, L.reflect]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(L.groundGlow).toBeGreaterThan(0); expect(L.groundGlow).toBeLessThan(3);
      expect(L.groundLift).toBeGreaterThanOrEqual(1); expect(L.groundLift).toBeLessThan(2);
      expect(L.exposure).toBeGreaterThan(0.5); expect(L.exposure).toBeLessThan(2);
      expect(L.key.intensity).toBeGreaterThan(0); expect(L.hemi.intensity).toBeGreaterThan(0);
      expect(L.fog.density).toBeGreaterThan(0.5);
      expect(L.key.dir[1]).toBeGreaterThan(0); // the key is always above the horizon (even at dusk, a hair)
    }
    // the night is lit by its lamps and its windows; the day is not
    expect(LOOKS.night.lamps).toBe(1); expect(LOOKS.day.lamps).toBe(0);
    expect(LOOKS.night.windows).toBe(1); expect(LOOKS.day.windows).toBeLessThan(0.2);
    expect(LOOKS.night.stars).toBe(1); expect(LOOKS.day.stars).toBe(0);
    expect(LOOKS.night.groundGlow).toBeGreaterThan(LOOKS.day.groundGlow * 4); // the streets glow by night (owner: lit like a city)
    expect(LOOKS.night.groundLift).toBeGreaterThan(LOOKS.day.groundLift);
    // the hazy morning is the thickest air, the day the clearest
    expect(LOOKS.haze.fog.density).toBeGreaterThan(LOOKS.dawn.fog.density);
    expect(LOOKS.day.walls).toBeLessThan(LOOKS.night.walls); // a sun needs far less lift than the lamps
    expect(LOOKS.day.bleach.amount).toBeGreaterThanOrEqual(LOOKS.night.bleach.amount); // a sun's pale wash — light, the skins' own colours kept (owner: no generic buildings)
    for (const t of TIMES) expect(LOOKS[t].bleach.amount).toBeLessThan(0.5);
    expect(LOOKS.night.shadows).toBe(false); expect(LOOKS.dusk.shadows).toBe(false); expect(LOOKS.day.shadows).toBe(true); // no patches of shadow by night
    expect(hexToRgb(LOOKS.night.bleach.color)[2]).toBeGreaterThan(hexToRgb(LOOKS.night.bleach.color)[0] + 40); // and blue by night, never black
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
    expect(m.reflect).toBeCloseTo((a.reflect + b.reflect) / 2, 6);
    expect(m.groundLift).toBeCloseTo((a.groundLift + b.groundLift) / 2, 6);
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
    expect(nextTime('night')).toBe('dawn');
    expect(nextTime('day')).toBe('haze');
  });
});

describe("The beyond's colour (owner: the far horizon always in view)", () => {
  it("is the dome's own colour at the horizon band, the gradient alone, for every look", () => {
    for (const t of TIMES) {
      const L = LOOKS[t];
      const c = horizonColor(L);
      expect(c).toMatch(HEX);
      const plain = { ...L, sky: { ...L.sky, lobe: { ...L.sky.lobe, strength: 0 } } };
      const px = paintSky(plain, 201); // row 103 is v = 0.515 exactly
      const o = 103 * 201 * 4, [r, g, b] = hexToRgb(c);
      expect(Math.abs(px[o] - r) + Math.abs(px[o + 1] - g) + Math.abs(px[o + 2] - b), t).toBeLessThanOrEqual(3);
    }
    expect(horizonColor(LOOKS.night)).not.toBe(LOOKS.night.fog.color);
  });
});

// The domes ride the eye at 640 and write no depth; drawn after the floor (the painted floor's turns, order −30), the
// opaque one covered the floor wherever it lay past 640 — every open street of the far city showed the sky's horizon
// band, sharp (owner, 2026-10-11: "Why the hell that highway afar lights up? ... all the streets afar have weird depth
// of field"). On the far plane, everything drawn lies in front of them.
describe('the sky behind everything', () => {
  const city = readFileSync('src/about/city3d.ts', 'utf8');
  const near = Number(city.match(/new PerspectiveCamera\(fov24\(1\), 1, ([\d.]+), TIERS\[tier\]\.far\)/)?.[1]);
  const ground = Number(city.match(/const GROUND = (\d+) \* G;/)?.[1]) * G;
  const windowDepth = (d: number, far: number) => (far / (far - near)) * (1 - near / d); // [0, 1], three's perspective, depth range 0–1

  it('lies past the window depth of the farthest thing the city draws, at every tier, in a 24-bit depth buffer', () => {
    expect(near, "the camera's near plane, read off city3d.ts").toBe(0.5);
    expect(ground / 2, "the ground's far edge, read off city3d.ts").toBeGreaterThan(15000);
    for (const t of TIERS) {
      const edge = Math.round(windowDepth(ground / 2, t.far) * (2 ** 24 - 1)), sky = Math.round(((1 + SKY_DEPTH) / 2) * (2 ** 24 - 1)); // (clip z/w −1…1 to the window's 0…1)
      expect(sky - edge, `${t.label}: the sky's quantised depth behind the ground's edge, with room`).toBeGreaterThan(80);
      expect(sky, `${t.label}: in front of the cleared depth, so the sky draws where nothing else did`).toBeLessThan(2 ** 24 - 1);
    }
    expect(SKY_DEPTH, 'inside the clip volume: never clipped at the far plane').toBeLessThan(1);
  });

  it('draws both domes on the far plane, and the opaque one first of all', () => {
    expect(city).toMatch(/gl_Position\.z = gl_Position\.w \* \$\{SKY_DEPTH\}/);
    expect(city.match(/new Mesh\(domeGeo, onFarPlane\(new MeshBasicMaterial\(/g)?.length).toBe(2);
    expect(city).toMatch(/domeA\.renderOrder = PAINT\.order\.sky;/);
  });
});
