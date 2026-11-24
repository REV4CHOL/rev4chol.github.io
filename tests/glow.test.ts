import { beforeAll, describe, expect, it } from 'vitest';
import { GLOW_BAKE, GLOW_PAD, GLOW_SOFT, PaneGlow } from '../src/works/glow';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ACC = 0xb79cff;

beforeAll(() => {
  // in node the glow's bake gets a canvas with no 2D context: it falls back to a plain rectangle of the size given
  (globalThis as Record<string, unknown>).document = { createElement: () => ({ getContext: () => null }) };
});

describe('a pane glow shows only while it can be seen (its rule since 2026-09-27, kept through the bake)', () => {
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

  it('keeps its accent and the size it is given, and runs no filter', () => {
    const g = new PaneGlow(ACC, 472, 292, 0.14);
    expect(g.sprite.tint).toBe(ACC);
    expect(g.sprite.width).toBeCloseTo(472);
    expect(g.sprite.height).toBeCloseTo(292);
    expect(g.sprite.filters ?? []).toHaveLength(0);
  });
});

describe('the glow is one soft rectangle, drawn once per pane size on a 2D canvas (no blur runs: spec §4.7)', () => {
  /** a canvas that records what is drawn on it */
  class FakeCanvas {
    width = 0;
    height = 0;
    readonly ctx = { shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, fillStyle: '', rects: [] as number[][] };
    getContext(kind: string) {
      if (kind !== '2d') return null;
      return Object.assign(this.ctx, {
        fillRect: (x: number, y: number, w: number, h: number) => { this.ctx.rects.push([x, y, w, h]); },
      });
    }
  }

  function withCanvas<T>(run: (made: FakeCanvas[]) => T): T {
    const g = globalThis as Record<string, unknown>;
    const keep = { doc: g.document, canvas: g.HTMLCanvasElement };
    const made: FakeCanvas[] = [];
    g.HTMLCanvasElement = FakeCanvas;
    g.document = { createElement: () => { const c = new FakeCanvas(); made.push(c); return c; } };
    try {
      return run(made);
    } finally {
      g.document = keep.doc;
      g.HTMLCanvasElement = keep.canvas;
    }
  }

  it('the canvas is the pane and its soft margin at half size; only the shadow of the rectangle lands on it', () => {
    withCanvas((made) => {
      const g = new PaneGlow(ACC, 300, 200);
      expect(made).toHaveLength(1);
      const c = made[0]!;
      expect([c.width, c.height]).toEqual([(300 + 2 * GLOW_PAD) * GLOW_BAKE, (200 + 2 * GLOW_PAD) * GLOW_BAKE]);
      expect([c.width, c.height]).toEqual([186, 136]);
      // a canvas shadow's blur is twice its sigma: the glow's softness, at the bake's scale
      expect(c.ctx.shadowBlur).toBe(2 * GLOW_SOFT * GLOW_BAKE);
      expect(c.ctx.shadowColor).toBe('#fff');
      // the rectangle itself is drawn off the canvas, one canvas width to the left; its shadow is thrown back on
      const off = c.ctx.shadowOffsetX;
      expect(off).toBeGreaterThanOrEqual(c.width);
      expect(c.ctx.rects).toEqual([[GLOW_PAD * GLOW_BAKE - off, GLOW_PAD * GLOW_BAKE, 150, 100]]);
      // the sprite is as large as the rectangle and its margin: the soft edge falls where the blur used to put it
      expect(g.sprite.width).toBeCloseTo(300 + 2 * GLOW_PAD);
      expect(g.sprite.height).toBeCloseTo(200 + 2 * GLOW_PAD);
      expect(g.sprite.tint).toBe(ACC);
      expect(g.sprite.filters ?? []).toHaveLength(0);
    });
  });

  it('panes of one size share one picture; another size gets its own', () => {
    withCanvas((made) => {
      const a = new PaneGlow(ACC, 310, 210);
      const b = new PaneGlow(0xff5f1f, 310, 210, 0.14);
      const c = new PaneGlow(ACC, 520, 210);
      expect(made).toHaveLength(2);
      expect(b.sprite.texture).toBe(a.sprite.texture);
      expect(c.sprite.texture).not.toBe(a.sprite.texture);
      expect(b.sprite.tint).toBe(0xff5f1f); // the colour is the sprite's tint, never baked in
    });
  });
});
