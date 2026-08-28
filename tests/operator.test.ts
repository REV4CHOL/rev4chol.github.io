import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/lib/rng';
import {
  burstLength,
  capabilitiesFromTagline,
  nextBurstDelay,
  PHOTO_EXTS,
  portraitCandidates,
  SHEET_SLOTS,
  sheetCandidates,
  slicePlan,
} from '../src/about/operator';

describe('operator photo contract', () => {
  it('probes the portrait in every format, jpg first', () => {
    expect(portraitCandidates()).toEqual([
      '/content/about/portrait.jpg',
      '/content/about/portrait.jpeg',
      '/content/about/portrait.png',
      '/content/about/portrait.webp',
    ]);
  });

  it('probes 8 zero-padded sheet slots × every extension', () => {
    const slots = sheetCandidates();
    expect(slots).toHaveLength(SHEET_SLOTS);
    expect(slots[0][0]).toBe('/content/about/01.jpg');
    expect(slots[7][3]).toBe('/content/about/08.webp');
    for (const slot of slots) expect(slot).toHaveLength(PHOTO_EXTS.length);
  });
});

describe('capabilities fallback', () => {
  it('splits the tagline into uppercase capabilities', () => {
    expect(capabilitiesFromTagline('colorist, editor, ai generalist')).toEqual([
      'COLORIST',
      'EDITOR',
      'AI GENERALIST',
    ]);
  });

  it('survives stray commas and spacing', () => {
    expect(capabilitiesFromTagline(' color,, grade ,')).toEqual(['COLOR', 'GRADE']);
  });
});

describe('glitch geometry', () => {
  it('is deterministic per seed', () => {
    expect(slicePlan(mulberry32(7), 900, 60)).toEqual(slicePlan(mulberry32(7), 900, 60));
  });

  it('keeps every slice inside the frame and inside the shift budget', () => {
    const rand = mulberry32(1234);
    for (let round = 0; round < 50; round++) {
      const plan = slicePlan(rand, 900, 60);
      expect(plan.length).toBeGreaterThanOrEqual(3);
      expect(plan.length).toBeLessThanOrEqual(7);
      for (const s of plan) {
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y + s.h).toBeLessThanOrEqual(900);
        expect(Math.abs(s.dx)).toBeLessThanOrEqual(60);
        expect(s.h).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('keeps burst timing in the designed windows', () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const d = nextBurstDelay(rand);
      const l = burstLength(rand);
      expect(d).toBeGreaterThanOrEqual(4000);
      expect(d).toBeLessThan(9000);
      expect(l).toBeGreaterThanOrEqual(180);
      expect(l).toBeLessThan(320);
    }
  });
});
