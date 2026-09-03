import { describe, expect, it } from 'vitest';
import { ATLAS, CELLS, FAMILIES, FLOOR, familyOf, heightToNormal, PX, SHOP, skinFor, tintJitter, UPPER, VARIANTS } from '../src/about/city-skins';
import { planCity } from '../src/about/city-plan';

const HEX = /^#[0-9a-f]{6}$/;

describe('Building skins', () => {
  it('fills an atlas of six families by eight variants at one physical scale', () => {
    expect(FAMILIES.length * VARIANTS).toBe(CELLS);
    expect(CELLS).toBe(ATLAS.cols * ATLAS.rows);
    expect(UPPER % FLOOR).toBe(0); // whole floors above the shop strip
    expect(SHOP / PX).toBe(4); // a 4-unit ground floor
    expect(FLOOR / PX).toBe(3); // 3-unit floors
    expect(new Set(FAMILIES.map((f) => f.win)).size).toBe(6);
    for (const f of FAMILIES) {
      expect(f.variants.length).toBe(VARIANTS);
      expect(ATLAS.w % f.bay).toBe(0); // bays tile the 16-unit cell
      expect(f.wx + f.ww).toBeLessThanOrEqual(f.bay);
      expect(f.wy + f.wh).toBeLessThanOrEqual(FLOOR);
      for (const v of f.variants) {
        for (const c of [v.wall, v.joint, v.frame, v.glass]) expect(c).toMatch(HEX);
        expect(v.lit).toBeGreaterThan(0); expect(v.lit).toBeLessThanOrEqual(1);
        expect(v.warm).toBeGreaterThanOrEqual(0); expect(v.warm).toBeLessThanOrEqual(1);
      }
    }
  });

  it("dresses every building of the plan in a cell of its style's family, the specials in theirs", () => {
    const plan = planCity(7);
    const solids = [...plan.core, ...plan.outer, ...plan.sprawl].filter((s) => s.kind === 'facade' || s.kind === 'cyl');
    expect(solids.length).toBeGreaterThan(400);
    const cells = new Set<number>();
    for (const s of solids) {
      const h = ((s.x * 0.37 + s.z * 0.91) % 1 + 1) % 1;
      const cell = skinFor(s.tex, plan.styles[s.tex], h);
      expect(cell).toBeGreaterThanOrEqual(0); expect(cell).toBeLessThan(CELLS);
      const fam = s.tex === 20 ? familyOf('grid') : s.tex === 21 ? familyOf('curtain') : s.tex === 22 || s.tex === 23 ? familyOf('tiny') : familyOf(plan.styles[s.tex].win);
      expect(Math.floor(cell / VARIANTS)).toBe(fam);
      cells.add(cell);
    }
    expect(cells.size).toBeGreaterThan(30); // the whole wardrobe gets worn
    expect(skinFor(20, plan.styles[20], 0.3)).toBe(familyOf('grid') * VARIANTS + 7);
    expect(skinFor(21, plan.styles[21], 0.3)).toBe(familyOf('curtain') * VARIANTS + 7);
    // an ordinary grid or curtain building never wears the special eighth
    for (let h = 0; h < 1; h += 0.05) {
      expect(skinFor(0, { ...plan.styles[0], win: 'grid' }, h) % VARIANTS).toBeLessThan(7);
      expect(skinFor(0, { ...plan.styles[0], win: 'curtain' }, h) % VARIANTS).toBeLessThan(7);
    }
    const [r, g, b] = tintJitter(0.5, 0.5);
    expect(r).toBeCloseTo(1, 6); expect(g).toBeCloseTo(1, 6); expect(b).toBeCloseTo(1, 6);
    expect(tintJitter(0, 1)[0]).toBeGreaterThan(tintJitter(0, 1)[2]); // warm nudge: more red than blue
  });

  it('turns a height field into a normal map that leans away from a step, with the mask in alpha', () => {
    const w = 8, h = 4;
    const flat = new Float32Array(w * h);
    const mask = new Uint8Array(w * h); mask[5] = 255;
    const n = heightToNormal(flat, w, h, mask, 1);
    expect([n[0], n[1], n[2]]).toEqual([128, 128, 255]); // straight out
    expect(n[5 * 4 + 3]).toBe(255); expect(n[3]).toBe(0);
    const step = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 4; x < w; x++) step[y * w + x] = 1; // higher to the right
    const s = heightToNormal(step, w, h, mask, 1);
    const o = (1 * w + 3) * 4; // the texel just left of the step: the slope rises to +x, the normal leans to −x
    expect(s[o]).toBeLessThan(128);
    expect(s[o + 1]).toBe(128);
    expect(s[o + 2]).toBeLessThan(255);
    const rise = new Float32Array(w * h);
    for (let y = 0; y < 2; y++) for (let x = 0; x < w; x++) rise[y * w + x] = 1; // higher toward the top rows (up the wall)
    const r = heightToNormal(rise, w, h, mask, 1);
    expect(r[(2 * w + 2) * 4 + 1]).toBeLessThan(128); // leans down, away from the rise
  });
});
