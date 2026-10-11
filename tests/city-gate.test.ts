import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cityGate, LIVE_ANYWAY, LOADING_LINE, NO_3D_LINE, STILL_LINE, STILL_SRC } from '../src/about/city-gate';

/** A JPEG's width and height, from its first start-of-frame marker. */
function jpegSize(b: Buffer): [number, number] {
  expect(b.readUInt16BE(0)).toBe(0xffd8);
  for (let at = 2; at + 9 < b.length; ) {
    const marker = b.readUInt16BE(at);
    const len = b.readUInt16BE(at + 2);
    if (marker >= 0xffc0 && marker <= 0xffc2) return [b.readUInt16BE(at + 7), b.readUInt16BE(at + 5)];
    at += 2 + len;
  }
  throw new Error('no start-of-frame marker');
}

describe("STORY's gate", () => {
  it('flies the live city on a graphics chip, and where the browser keeps its renderer\'s name to itself', () => {
    for (const renderer of [
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
      'Apple GPU',
      'Adreno (TM) 740',
      'Mali-G78 MC14',
    ]) expect(cityGate({ webgl: true, renderer, caveat: false }), renderer).toBe('live');
    expect(cityGate({ webgl: true, caveat: false })).toBe('live');
  });

  it('shows the still on a software renderer, by its name or by the browser\'s own performance caveat', () => {
    for (const renderer of [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
      'Google SwiftShader',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
      'Microsoft Basic Render Driver',
    ]) expect(cityGate({ webgl: true, renderer, caveat: false }), renderer).toBe('still');
    expect(cityGate({ webgl: true, renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)', caveat: true })).toBe('still');
  });

  it('shows the still, with nothing to load, where there is no WebGL at all', () => {
    expect(cityGate({ webgl: false, caveat: false })).toBe('no-3d');
    expect(cityGate({ webgl: false, renderer: 'whatever', caveat: true })).toBe('no-3d');
  });

  it('says so in plain words', () => {
    expect(STILL_LINE).toBe('THIS BROWSER HAS NO GRAPHICS ACCELERATION, SO THE LIVE CITY WOULD FREEZE IT ▪ HERE IS A STILL OF THE CITY');
    expect(NO_3D_LINE).toBe('THIS BROWSER CANNOT DRAW 3D ▪ HERE IS A STILL OF THE CITY');
    expect(LIVE_ANYWAY).toBe('LOAD THE LIVE CITY ANYWAY');
    expect(LOADING_LINE).toBe('LOADING THE LIVE CITY ▪ ON THIS BROWSER IT WILL BE VERY SLOW');
  });

  it('has its still on disk: a full-HD frame, light enough for a slow line', () => {
    const jpg = readFileSync('public' + STILL_SRC);
    expect(jpegSize(jpg)).toEqual([1920, 1080]);
    expect(jpg.length).toBeLessThan(450_000);
  });

  it('is asked before the lock arms, and the still is exempt from the lock with the canvas', () => {
    const s = readFileSync('src/pages/story.ts', 'utf8');
    expect(s.indexOf('cityGate(probeGpu())')).toBeGreaterThan(-1);
    expect(s.indexOf('cityGate(probeGpu())')).toBeLessThan(s.indexOf('armPosterLock('));
    expect(s).toContain("armPosterLock({ exempt: '#a3c, .a3-still' })");
    expect(s).toMatch(/canvas\.after\(img\);\s*filmLayersOff\(\);/); // the still is the city's glass: no grain, no scanlines over it
  });
});
