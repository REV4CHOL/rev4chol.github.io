import { BlurFilter, Sprite, Texture } from 'pixi.js';
import gsap from 'gsap';

/** A pane's underglow: an accent rectangle, blurred, behind the card.
 *
 *  The blur is eight filter passes, and Pixi runs a visible object's filters every frame — alpha 0 still counts as
 *  visible. A glow faded out after a hover used to keep blurring nothing: every pane the pointer had crossed added
 *  its passes to every frame for the rest of the visit, so the floor grew heavier the longer anyone looked around
 *  (+38 % GPU work per frame after crossing every pane once; owner 2026-09-27, "every video loop … lagging"). So
 *  the glow stands hidden whenever it is fully faded, and shows the moment it starts to rise. */
export class PaneGlow {
  readonly sprite = new Sprite(Texture.WHITE);

  /** `rest` is the alpha it idles at: a featured pane keeps a faint glow, the others none. */
  constructor(accent: number, w: number, h: number, readonly rest = 0) {
    const g = this.sprite;
    g.anchor.set(0.5);
    g.width = w;
    g.height = h;
    g.tint = accent;
    g.alpha = rest;
    g.visible = rest > 0;
    g.filters = [new BlurFilter({ strength: 18 })];
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
