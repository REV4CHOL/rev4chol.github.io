import { BlurFilter } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { PaneGlow } from '../src/works/glow';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ACC = 0xb79cff;

beforeAll(() => {
  // the blur's shader setup probes a canvas for float precision; in node it gets one with no context
  (globalThis as Record<string, unknown>).document = { createElement: () => ({ getContext: () => null }) };
});

describe('a pane glow runs its blur only while it can be seen (Pixi blurs alpha-0 objects every frame)', () => {
  it('faded to nothing, it stands hidden', () => {
    const g = new PaneGlow(ACC, 472, 292);
    expect(g.sprite.visible).toBe(false); // a plain pane rests with no glow
    g.fadeTo(0.4, 0);
    expect(g.sprite.visible).toBe(true);
    expect(g.sprite.alpha).toBeCloseTo(0.4);
    g.fadeTo(0, 0);
    expect(g.sprite.alpha).toBe(0);
    expect(g.sprite.visible).toBe(false);
  });

  it('rising from nothing, it shows from the first frame of its fade', () => {
    const g = new PaneGlow(ACC, 472, 292);
    g.fadeTo(0.4, 0.5);
    expect(g.sprite.visible).toBe(true);
    g.kill();
  });

  it('hides once a real fade-out lands, not before', async () => {
    const g = new PaneGlow(ACC, 472, 292);
    g.fadeTo(0.4, 0);
    g.fadeTo(0, 0.08);
    expect(g.sprite.visible).toBe(true);
    await wait(250);
    expect(g.sprite.visible).toBe(false);
  });

  it('a fade-out cut short by a new hover leaves it shown', async () => {
    const g = new PaneGlow(ACC, 472, 292);
    g.fadeTo(0.4, 0);
    g.fadeTo(0, 0.08);
    g.fadeTo(0.4, 0.08);
    await wait(250);
    expect(g.sprite.visible).toBe(true);
    expect(g.sprite.alpha).toBeCloseTo(0.4);
  });

  it('a featured glow rests lit, before and after a hover', () => {
    const g = new PaneGlow(ACC, 472, 292, 0.14);
    expect(g.sprite.visible).toBe(true);
    expect(g.sprite.alpha).toBeCloseTo(0.14);
    g.fadeTo(0.4, 0);
    g.fadeTo(g.rest, 0);
    expect(g.sprite.visible).toBe(true);
    expect(g.sprite.alpha).toBeCloseTo(0.14);
  });

  it('keeps its look: the accent, the size it is given, one blur of strength 18', () => {
    const g = new PaneGlow(ACC, 472, 292, 0.14);
    expect(g.sprite.tint).toBe(ACC);
    expect(g.sprite.width).toBeCloseTo(472);
    expect(g.sprite.height).toBeCloseTo(292);
    expect(g.sprite.filters).toHaveLength(1);
    const blur = (g.sprite.filters as BlurFilter[])[0];
    expect(blur).toBeInstanceOf(BlurFilter);
    expect(blur.strength).toBe(18);
  });
});
