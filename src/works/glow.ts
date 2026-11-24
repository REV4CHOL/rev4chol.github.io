import { Sprite, Texture } from 'pixi.js';
import gsap from 'gsap';

/** How soft the glow's edge is: the sigma of its blur, in the pane's own pixels. (The blur filter it replaces ran
 *  strength 18 in four passes a side, which spreads about as far.) */
export const GLOW_SOFT = 12;
/** the margin the soft edge needs around the rectangle: past three sigmas nothing is left to see */
export const GLOW_PAD = 3 * GLOW_SOFT;
/** the picture is drawn at half size: nothing in it is sharper than the blur */
export const GLOW_BAKE = 0.5;

/** one picture per pane size, kept for the visit and shared by every pane of that size and by every floor */
const baked = new Map<string, Texture | null>();

/** A white rectangle of w × h with a blurred edge, on a canvas GLOW_PAD larger on every side. Only the rectangle's
 *  shadow is drawn: the rectangle itself stands off the canvas, and a canvas shadow is a true blur of its shape (its
 *  `shadowBlur` is twice the sigma). Null where no 2D canvas is to be had. */
function softRect(w: number, h: number): Texture | null {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  const kept = baked.get(key);
  if (kept !== undefined) return kept;
  let tex: Texture | null = null;
  const c = document.createElement('canvas');
  c.width = Math.ceil((w + 2 * GLOW_PAD) * GLOW_BAKE);
  c.height = Math.ceil((h + 2 * GLOW_PAD) * GLOW_BAKE);
  const ctx = c.getContext('2d');
  if (ctx) {
    const off = c.width;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 2 * GLOW_SOFT * GLOW_BAKE;
    ctx.shadowOffsetX = off;
    ctx.fillStyle = '#fff';
    ctx.fillRect(GLOW_PAD * GLOW_BAKE - off, GLOW_PAD * GLOW_BAKE, w * GLOW_BAKE, h * GLOW_BAKE);
    tex = Texture.from(c);
  }
  baked.set(key, tex);
  return tex;
}

/** A pane's underglow: a soft accent rectangle behind the card.
 *
 *  It used to be a white sprite under a blur filter of eight passes, which Pixi ran every frame the glow showed, on
 *  every featured pane at rest and on every hovered one; the weak-GPU floor's cost was those glows (2026-09-28). Now
 *  the soft rectangle is drawn once per pane size on a 2D canvas (softRect) and the sprite only tints it: no filter
 *  runs. Its rule stays: it stands hidden whenever it is fully faded, and shows the moment it starts to rise. */
export class PaneGlow {
  readonly sprite: Sprite;

  /** `rest` is the alpha it idles at: a featured pane keeps a faint glow, the others none. */
  constructor(accent: number, w: number, h: number, readonly rest = 0) {
    const soft = softRect(w, h);
    const g = new Sprite(soft ?? Texture.WHITE);
    this.sprite = g;
    g.anchor.set(0.5);
    // (the picture carries its soft margin; without a 2D canvas the glow is a plain rectangle of the size given)
    g.width = soft ? w + 2 * GLOW_PAD : w;
    g.height = soft ? h + 2 * GLOW_PAD : h;
    g.tint = accent;
    g.alpha = rest;
    g.visible = rest > 0;
  }

  /** Fade to `alpha` over `d` seconds — up for a hover, back to rest after it. */
  fadeTo(alpha: number, d: number): void {
    const g = this.sprite;
    gsap.killTweensOf(g);
    g.visible = true;
    gsap.to(g, { alpha, duration: d, onComplete: () => { g.visible = g.alpha > 0; } });
  }

  kill(): void {
    gsap.killTweensOf(this.sprite);
  }
}
