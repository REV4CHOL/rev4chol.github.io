import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// THE LIGHTS IN THE FOG (owner, 2026-10-11: "Why the hell that highway afar lights up? ... all the streets afar have
// weird depth of field. All these happens on all sides beyond the boundaries"). Read off city3d.ts: every light added
// to the frame dims in the fog (three's fog mixes a colour TOWARD the fog's, and an added glow then adds the horizon's
// colour once a glow — a far street's lamps, a pixel each, summed to a lit line), and every see-through material keeps
// the frame's alpha, the distance blur's amount.
const city = readFileSync('src/about/city3d.ts', 'utf8');

/** Every `new …Material(…)` call in the source: where it starts, its argument text, and what stands just before it. */
function materials(src: string): { at: number; end: number; kind: string; args: string; before: string }[] {
  const out: { at: number; end: number; kind: string; args: string; before: string }[] = [];
  for (const m of src.matchAll(/new (\w*Material)\(/g)) {
    const open = m.index! + m[0].length - 1;
    let depth = 0, i = open;
    for (; i < src.length; i++) { if (src[i] === '(') depth++; else if (src[i] === ')' && --depth === 0) break; }
    out.push({ at: m.index!, end: i, kind: m[1], args: src.slice(open + 1, i), before: src.slice(Math.max(0, m.index! - 40), m.index!) });
  }
  return out;
}

describe('the lights beyond the fence', () => {
  it('fog every light added to the frame by dimming it, never by tinting it toward the horizon (the far highway lit up)', () => {
    const mats = materials(city);
    const added = mats.filter((m) => /blending: AdditiveBlending/.test(m.args));
    expect(added.length, 'the scan finds the additive materials').toBeGreaterThanOrEqual(15);
    for (const m of added) {
      const inner = mats.filter((o) => o !== m && o.at > m.at && o.end < m.end); // (a material inside another's arguments is its own)
      if (inner.some((o) => /AdditiveBlending/.test(o.args))) continue;
      const line = city.slice(0, m.at).split('\n').length;
      const unfogged = /fog: false/.test(m.args), dimmed = /additiveFog\(\s*$/.test(m.before), shader = m.kind === 'ShaderMaterial' && /FOG_ADD/.test(m.args);
      expect(unfogged || dimmed || shader, `city3d.ts:${line} ${m.kind}: fog: false, additiveFog(…), or FOG_ADD in its shader`).toBe(true);
    }
  });

  it('dims the glows of every lamp — the city\'s, the endless city\'s and the endless highway\'s — in the fog', () => {
    expect(city).toMatch(/const glowPoints = [\s\S]{0,400}dim\(additiveFog\(new PointsMaterial\(/);
    expect(city).toMatch(/tileGlow\(heads, /);
    expect(city).toMatch(/glowPoints\(farHeads, /);
  });

  it('keeps the distance blur\'s amount under every see-through material in the scene', () => {
    expect(city).toMatch(/import \{[^}]*\bkeepAmount\b[^}]*\} from '\.\/city-post'/);
    expect(city).toMatch(/for \(const c of scene\.children\) if \(c !== sky\) c\.traverse\(\(o\) => \{ const mat = \(o as Mesh\)\.material[^\n]*keepAmount\(m\)/);
    const traverse = city.indexOf('keepAmount(m)'), merge = city.indexOf('mergeStatic(scene, scene.children'), fit = city.indexOf('new ResizeObserver(fit)');
    expect(traverse, 'after the static merge, the last of the scene built').toBeGreaterThan(merge);
    expect(traverse, 'before the first frames').toBeLessThan(fit);
  });
});
