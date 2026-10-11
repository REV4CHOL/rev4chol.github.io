import { describe, expect, it } from 'vitest';
import { AddEquation, AdditiveBlending, CustomBlending, MeshBasicMaterial, MeshLambertMaterial, MultiplyBlending, NormalBlending, OneFactor, OneMinusSrcAlphaFactor, PointsMaterial, SrcAlphaFactor, ZeroFactor } from 'three';
import { fov24, keepAmount, LensPass } from '../src/about/city-post';

type Defined = { mat: { defines: Record<string, number>; fragmentShader: string } };

describe("A phone's lens (owner: mobile is very laggy — three full-screen passes at the phone's pixels)", () => {
  it('compiles without its four softness fetches when cheap, with them by default', () => {
    const cheap = new LensPass({ cheap: true }) as unknown as Defined, full = new LensPass() as unknown as Defined;
    expect(cheap.mat.defines.SOFT).toBe(0);
    expect(full.mat.defines.SOFT).toBe(1);
    expect(full.mat.fragmentShader).toContain('#if SOFT');
  });
  it('a 24mm across the long edge', () => {
    expect(fov24(16 / 9)).toBeCloseTo((2 * Math.atan(Math.tan(Math.atan(18 / 24)) / (16 / 9)) * 180) / Math.PI, 6);
    expect(fov24(0.5)).toBeCloseTo((2 * Math.atan(18 / 24) * 180) / Math.PI, 6);
  });
});

// The distance blur reads the fog of war's amount from the frame's alpha; a see-through material blended its own alpha
// in, and the far streets under their lamps and traffic read as sharp as the city inside the fence (owner, 2026-10-11:
// "all the streets afar have weird depth of field").
describe('a see-through material keeps the frame\'s alpha (the distance blur\'s amount)', () => {
  it('blends its colour over as three\'s normal blending does, and its alpha not at all', () => {
    const m = new MeshBasicMaterial({ transparent: true, opacity: 0.5 });
    keepAmount(m);
    expect(m.blending).toBe(CustomBlending);
    expect([m.blendEquation, m.blendSrc, m.blendDst]).toEqual([AddEquation, SrcAlphaFactor, OneMinusSrcAlphaFactor]);
    expect([m.blendEquationAlpha, m.blendSrcAlpha, m.blendDstAlpha], 'destination alpha × 1 + nothing of its own').toEqual([AddEquation, ZeroFactor, OneFactor]);
  });
  it('adds its colour as three\'s additive blending does, and its alpha not at all', () => {
    const m = new PointsMaterial({ transparent: true, blending: AdditiveBlending });
    keepAmount(m);
    expect(m.blending).toBe(CustomBlending);
    expect([m.blendEquation, m.blendSrc, m.blendDst]).toEqual([AddEquation, SrcAlphaFactor, OneFactor]);
    expect([m.blendEquationAlpha, m.blendSrcAlpha, m.blendDstAlpha]).toEqual([AddEquation, ZeroFactor, OneFactor]);
  });
  it('leaves a solid, and a blend of its own, as they are', () => {
    const solid = new MeshLambertMaterial();
    keepAmount(solid);
    expect(solid.blending, 'a solid writes the amount itself (the fog chunk)').toBe(NormalBlending);
    const mul = new MeshBasicMaterial({ transparent: true, blending: MultiplyBlending });
    keepAmount(mul);
    expect(mul.blending).toBe(MultiplyBlending);
  });
  it('is the same blend twice over (a material shared by two meshes is met twice)', () => {
    const m = new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending });
    keepAmount(m); keepAmount(m);
    expect([m.blending, m.blendDst, m.blendDstAlpha]).toEqual([CustomBlending, OneFactor, OneFactor]);
  });
});
