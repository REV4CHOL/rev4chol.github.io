import { Cache, Texture } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';

// WHY A POSTER'S TEXTURE IS DESTROYED BY HAND (spec 2026-11-24-work-wall-video-design, §4.7). The floor is torn down
// with app.destroy(true, { children: true }), which destroys every sprite and leaves every texture. A poster's texture
// comes from Texture.from(canvas), and Pixi keeps such a texture in its cache, keyed by the canvas, until the texture
// itself is destroyed. So each chapter flip left a chapter's poster canvases and textures behind. This test holds the
// two facts the fix stands on, so an upgrade of Pixi that changes either is seen here.

/** enough of a canvas for Pixi to take it as one (no DOM in the tests) */
class FakeCanvas {
  width = 400;
  height = 225;
}

const g = globalThis as unknown as { HTMLCanvasElement?: unknown };
const before = g.HTMLCanvasElement;

afterEach(() => {
  g.HTMLCanvasElement = before;
});

describe("a poster's texture and Pixi's cache", () => {
  it('Texture.from(canvas) keeps the texture, keyed by the canvas, for as long as the texture lives', () => {
    g.HTMLCanvasElement = FakeCanvas;
    const canvas = new FakeCanvas();
    const tex = Texture.from(canvas as unknown as HTMLCanvasElement);
    expect(Cache.has(canvas)).toBe(true);
    expect(Texture.from(canvas as unknown as HTMLCanvasElement)).toBe(tex);
    tex.destroy(true);
  });

  it('destroying the texture with its source lets the canvas go', () => {
    g.HTMLCanvasElement = FakeCanvas;
    const canvas = new FakeCanvas();
    const tex = Texture.from(canvas as unknown as HTMLCanvasElement);
    const source = tex.source;
    tex.destroy(true);
    expect(Cache.has(canvas)).toBe(false);
    expect(source.destroyed).toBe(true);
  });
});
