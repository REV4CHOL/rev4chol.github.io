import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../src/lib/rng';
import { GLYPHS, scrambleEl, scrambleFrame, stopScramble } from '../src/lib/scramble';

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

describe('a scramble gives way (the floor caption: a quick pass from a one-part pane onto TEMPTATION kept the old name)', () => {
  const frames: ((t: number) => void)[] = [];
  let now = 0;
  const run = (ms: number) => { const end = now + ms; while (now < end) { now += 16; frames.splice(0).forEach((f) => f(now)); } };
  const setup = () => {
    frames.length = 0;
    now = 0;
    vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => { frames.push(f); return frames.length; });
    vi.stubGlobal('performance', { now: () => now });
  };

  it('a stopped scramble never writes again', () => {
    setup();
    const el = { textContent: '' } as unknown as HTMLElement;
    void scrambleEl(el, 'OLD NAME', 100);
    run(32);
    stopScramble(el);
    el.textContent = 'NEW';
    run(400);
    expect(el.textContent).toBe('NEW');
    vi.unstubAllGlobals();
  });

  it('a newer scramble on the same element is the last writer', () => {
    setup();
    const el = { textContent: '' } as unknown as HTMLElement;
    void scrambleEl(el, 'FIRST', 300);
    run(32);
    void scrambleEl(el, 'SECOND', 100);
    run(600);
    expect(el.textContent).toBe('SECOND');
    vi.unstubAllGlobals();
  });

  it('writing a title stops any scramble running on it (lib/title.ts)', () => {
    expect(readFileSync('src/lib/title.ts', 'utf8')).toMatch(/export function fillTitle[\s\S]*?stopScramble\(el\);/);
  });
});
