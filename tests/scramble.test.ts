import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/lib/rng';
import { GLYPHS, scrambleFrame } from '../src/lib/scramble';

describe('scrambleFrame', () => {
  it('returns the target at progress 1', () => {
    expect(scrambleFrame('NEON DREAM', 1, mulberry32(1))).toBe('NEON DREAM');
  });

  it('preserves spaces and length at progress 0, with no real characters', () => {
    const out = scrambleFrame('AB CD', 0, mulberry32(2));
    expect(out).toHaveLength(5);
    expect(out[2]).toBe(' ');
    for (const ch of out.replace(' ', '')) expect(GLYPHS).toContain(ch);
  });

  it('reveals a prefix proportional to progress', () => {
    const out = scrambleFrame('ABCDEFGHIJ', 0.5, mulberry32(3));
    expect(out.slice(0, 5)).toBe('ABCDE');
  });

  it('is deterministic for a given rand', () => {
    expect(scrambleFrame('SIGNAL', 0.2, mulberry32(9))).toBe(scrambleFrame('SIGNAL', 0.2, mulberry32(9)));
  });
});

describe('mulberry32', () => {
  it('is deterministic and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
