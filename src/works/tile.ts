import { BlurFilter, Container, Graphics, Matrix, Sprite, Text, Texture, VideoSource } from 'pixi.js';
import gsap from 'gsap';
import type { Project } from '../lib/content';
import { loopSrcChain, projectAssetUrl } from '../lib/content';
import { reducedMotion } from '../lib/env';
import { CARD_H, CARD_W, HOVER_M, ISO, SIZE_MUL_LARGE, cellToWorld } from './constants';
import type { Placed } from './layout';
import { loadPosterCanvas, type PosterResult } from './poster';

export type TileMode = 'sleep' | 'live' | 'hover';

export class ProjectTile extends Container {
  readonly project: Project;
  readonly placed: Placed;
  readonly card = new Container();
  readonly m = { ...ISO }; // live matrix state — tweened for hover/enter
  readonly sizeMul: number;
  /** this tile's card dimensions — 400×225 for 16:9, 300×225 for a 4:3
   *  specimen, which sits centered in its lattice cell with air at its
   *  sides: a different-format monitor racked into the same floor */
  readonly cw: number;
  readonly ch: number;
  mode: TileMode = 'sleep';
  posterSprite: Sprite;

  video?: HTMLVideoElement;
  videoSprite?: Sprite;
  private mediaFailed = false;
  private posterDegraded: boolean;
  private healAt = 0;
  private healingPoster = false;
  /** true once the CURRENT source has actually presented a frame — the video
   *  sprite stays hidden (poster showing) until then, so a stalled decoder
   *  can never park a black rectangle over a good poster. */
  private frameSeen = false;
  /** hover.mp4 confirmed absent — stop re-attempting it on every hover, which
   *  restarted the loop (404 → fallback → reload → first-frame wait) and read
   *  as a stall each time the pointer touched the tile. */
  private hoverMissing = false;
  private glow?: Sprite;
  /** Featured tiles keep a faint resting underglow; hover raises it, exit returns here. */
  private baseGlowAlpha = 0;

  /** Accepted loop names in probe order; the resolved winner is remembered
   *  so hover-restores never re-walk the misses. */
  private srcChain: string[];
  private baseSrc: string | null = null;
  private hoverUrl(): string { return projectAssetUrl(this.project.slug, 'hover.mp4'); }

  wake(): void {
    if (this.mode !== 'sleep') return;
    this.healMedia();
    if (!this.video) this.createVideo();
    if (!this.video) return; // creation failed
    this.mode = 'live';
    if (this.videoSprite) this.videoSprite.visible = this.frameSeen;
    void this.video.play().catch(() => { /* poster remains visible underneath */ });
  }

  /** Transient failures must not latch for the life of the page: a floor
   *  session lives long, and one blip (server restart mid-dev, a flaky
   *  network on the road) used to blacken a tile forever. The playback
   *  budget wakes tiles again and again, so each wake retries whatever is
   *  degraded — behind a cooldown, never a storm. */
  private healMedia(): void {
    const now = performance.now();
    if (now < this.healAt || (!this.mediaFailed && !this.posterDegraded)) return;
    this.healAt = now + 30000;
    if (this.mediaFailed) {
      this.mediaFailed = false; // createVideo() walks the loop chain again
      this.baseSrc = null; // the file may have changed since the failure
    }
    if (this.posterDegraded && !this.healingPoster) {
      this.healingPoster = true;
      void loadPosterCanvas(this.project).then((r) => {
        this.healingPoster = false;
        if (r.degraded || this.destroyed) return;
        const old = this.posterSprite.texture;
        this.posterSprite.texture = Texture.from(r.canvas);
        this.posterSprite.width = this.cw;
        this.posterSprite.height = this.ch;
        old.destroy(true);
        this.posterDegraded = false;
      });
    }
  }

  sleep(): void {
    if (this.mode === 'sleep') return;
    this.mode = 'sleep';
    this.video?.pause();
    if (this.videoSprite) this.videoSprite.visible = false;
  }

  hasVideo(): boolean {
    return !!this.video;
  }

  releaseVideo(): void {
    this.sleep();
    if (this.videoSprite) {
      // element is being discarded — safe to also tear down the TextureSource here;
      // VideoSource.destroy() will itself pause/src=''/load() the same element, and
      // TextureSource.destroy() calls removeAllListeners(), so the 'resize' subscription
      // from attachVideoSprite() is dropped with it — no explicit off() needed.
      this.videoSprite.destroy({ texture: true, textureSource: true });
      this.videoSprite = undefined;
    }
    if (this.video) {
      this.video.src = '';
      this.video.load();
      this.video = undefined;
    }
  }

  swapToMontage(): void {
    if (this.hoverMissing) return; // keep the loop rolling — no montage exists
    if (!this.video) this.createVideo();
    const v = this.video;
    if (!v) return;
    if (!v.src.endsWith('hover.mp4')) {
      v.src = this.hoverUrl(); // the error handler falls back to the loop
      void v.play().catch(() => {});
    }
  }

  restorePreview(): void {
    const v = this.video;
    if (!v) return;
    const base = this.baseSrc ?? this.srcChain[0];
    if (v.src === base || v.src.endsWith(base)) return;
    v.src = base;
    if (this.mode !== 'sleep') void v.play().catch(() => {});
  }

  /** One brief glitch tick on the dithered poster — sleeping tiles stay alive. */
  shimmer(): void {
    const s = this.posterSprite;
    const ox = (Math.random() - 0.5) * 10;
    s.position.x += ox;
    s.alpha = 0.72;
    setTimeout(() => {
      if (s.destroyed) return; // the world may have been torn down mid-tick (channel flip)
      s.position.x -= ox;
      s.alpha = 1;
    }, 70);
  }

  /** Arm the first-frame gate for the element's CURRENT source: the sprite
   *  goes visible only once a frame has really been presented. Browsers
   *  without requestVideoFrameCallback keep the old optimistic behavior. */
  private armFrameGate(v: HTMLVideoElement): void {
    this.frameSeen = false;
    if (this.videoSprite) this.videoSprite.visible = false;
    if (!('requestVideoFrameCallback' in v)) {
      this.frameSeen = true;
      return;
    }
    v.requestVideoFrameCallback(() => {
      if (this.video !== v) return; // stale element
      this.frameSeen = true;
      if (this.videoSprite) this.videoSprite.visible = this.mode !== 'sleep';
    });
  }

  private createVideo(): void {
    if (this.mediaFailed) return;
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    // every new resource (initial, chain walk, hover swap) re-arms the gate
    v.addEventListener('loadstart', () => {
      if (this.video === v) this.armFrameGate(v);
    });
    v.addEventListener('error', () => {
      if (this.video !== v) return; // stale element — releaseVideo() already moved on
      if (v.src.endsWith('hover.mp4')) {
        // failed montage — remember, and back to the tile's resolved loop
        this.hoverMissing = true;
        v.src = this.baseSrc ?? this.srcChain[0];
        if (this.mode !== 'sleep') void v.play().catch(() => {});
        return;
      }
      if (this.baseSrc && v.src === this.baseSrc) this.baseSrc = null; // remembered winner vanished
      // walk the accepted loop names before giving up
      const cur = this.srcChain.findIndex((u) => v.src.endsWith(u));
      const next = cur < 0 ? this.srcChain.length : cur + 1;
      if (next < this.srcChain.length) {
        v.src = this.srcChain[next];
        if (this.mode !== 'sleep') void v.play().catch(() => {});
        return;
      }
      this.mediaFailed = true;
      console.warn(`[revachol] missing media for "${this.project.slug}" (${v.src}) — tile stays on its poster`);
      this.releaseVideo();
    });
    this.video = v;
    v.addEventListener('loadedmetadata', () => {
      if (this.video !== v) return; // stale element — releaseVideo() already moved on
      if (!v.src.endsWith('hover.mp4')) this.baseSrc = v.src; // the chain's winner
      this.attachVideoSprite();
    });
    this.armFrameGate(v);
    v.src = this.baseSrc ?? this.srcChain[0];
  }

  private attachVideoSprite(): void {
    if (!this.video) return;
    if (this.videoSprite) {
      this.videoSprite.visible = this.mode !== 'sleep' && this.frameSeen;
      return;
    }
    const s = new Sprite(Texture.from(this.video));
    s.anchor.set(0.5);
    // upload at content rate, not render rate — a 24fps clip gains nothing
    // from 60Hz texture uploads, and the floor plays several at once
    if (s.texture.source instanceof VideoSource) s.texture.source.updateFPS = 30;
    const fit = () => {
      const tex = s.texture;
      s.texture = Texture.EMPTY; // force the texture setter to re-run —
      s.texture = tex;           // a source resize alone never rebuilds the sprite's quad
      s.width = this.cw;
      s.height = this.ch;
    };
    fit();
    s.texture.source.on('resize', fit); // montage swaps change resolution; re-fit when it lands
    this.videoSprite = s;
    this.card.addChildAt(s, this.card.getChildIndex(this.posterSprite) + 1); // above poster, below labels
    s.visible = this.mode !== 'sleep' && this.frameSeen;
  }

  private ensureGlow(): Sprite {
    if (!this.glow) {
      const g = new Sprite(Texture.WHITE);
      g.anchor.set(0.5);
      g.width = this.cw * 1.18;
      g.height = this.ch * 1.3;
      g.tint = parseInt(this.project.accent.slice(1), 16);
      g.alpha = 0;
      g.filters = [new BlurFilter({ strength: 18 })];
      this.card.addChildAt(g, 0); // behind the poster
      this.glow = g;
    }
    return this.glow;
  }

  enterHover(): void {
    gsap.killTweensOf(this.m);
    gsap.killTweensOf(this.card);
    const d = reducedMotion() ? 0.05 : 0.5;
    gsap.to(this.m, { ...HOVER_M, duration: d, ease: 'expo.out', onUpdate: () => this.applyMatrix() });
    gsap.to(this.card, { y: -26, duration: d, ease: 'expo.out' });
    const glow = this.ensureGlow();
    gsap.killTweensOf(glow);
    gsap.to(glow, { alpha: 0.4, duration: d });
    this.zIndex = 10000;
  }

  exitHover(): void {
    gsap.killTweensOf(this.m);
    gsap.killTweensOf(this.card);
    const d = reducedMotion() ? 0.05 : 0.4;
    gsap.to(this.m, { ...ISO, duration: d, ease: 'expo.out', onUpdate: () => this.applyMatrix() });
    gsap.to(this.card, { y: 0, duration: d, ease: 'expo.out' });
    if (this.glow) { gsap.killTweensOf(this.glow); gsap.to(this.glow, { alpha: this.baseGlowAlpha, duration: d }); }
    this.zIndex = this.placed.col + this.placed.row;
  }

  constructor(project: Project, placed: Placed, poster: PosterResult) {
    super();
    this.project = project;
    this.placed = placed;
    this.ch = CARD_H;
    this.cw = project.aspect === '4:3' ? Math.round((CARD_H * 4) / 3) : CARD_W;
    this.srcChain = loopSrcChain(project.slug);
    this.posterDegraded = poster.degraded;
    this.sizeMul = placed.span === 2 ? SIZE_MUL_LARGE : 1;
    // a span-2 tile is centered over its 2×2 cell block so the carpet stays seamless
    const off = (placed.span - 1) / 2;
    const { x, y } = cellToWorld(placed.col + off, placed.row + off);
    this.position.set(x, y);
    this.zIndex = placed.col + placed.row;

    this.posterSprite = new Sprite(Texture.from(poster.canvas));
    this.posterSprite.anchor.set(0.5);
    this.posterSprite.width = this.cw;
    this.posterSprite.height = this.ch;
    this.card.addChild(this.posterSprite);

    // --- panel furniture. without a hard edge a tile is a swatch, not a screen.
    const featured = project.tileSize === 'large';
    const hw = this.cw / 2;
    const hh = this.ch / 2;
    const acc = parseInt(project.accent.slice(1), 16);
    const frame = new Graphics();
    frame.rect(-hw, -hh, this.cw, this.ch).stroke({ color: acc, alpha: 0.42, width: 1 });
    const L = featured ? 38 : 30;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      frame.moveTo(sx * hw, sy * hh).lineTo(sx * hw - sx * L, sy * hh);
      frame.moveTo(sx * hw, sy * hh).lineTo(sx * hw, sy * hh - sy * L);
    }
    frame.stroke({ color: acc, alpha: 0.95, width: 2 });
    if (featured) {
      // the featured dress: a second inset rule — print-language "selected",
      // not a badge shout
      frame
        .rect(-hw + 7, -hh + 7, this.cw - 14, this.ch - 14)
        .stroke({ color: acc, alpha: 0.5, width: 1 });
    }
    // slug plate + index tab, so the mono type has something to sit on
    frame.rect(-hw, hh - 20, this.cw, 20).fill({ color: 0x060606, alpha: 0.6 });
    frame.rect(-hw, hh - 20, 4, 20).fill({ color: acc, alpha: 1 });
    frame.rect(-hw + 8, -hh + 8, 30, 8).fill({ color: acc, alpha: 0.9 });
    this.card.addChild(frame);

    if (featured) {
      // micro tag riding the top-right edge, inverted on the accent
      const tag = new Text({
        text: 'FEATURED',
        style: { fontFamily: 'Martian Mono', fontSize: 7, fill: 0x060606, letterSpacing: 2 },
      });
      const tagW = tag.width + 12;
      frame.rect(hw - tagW - 8, -hh + 8, tagW, 12).fill({ color: acc, alpha: 0.95 });
      tag.position.set(hw - tagW - 2, -hh + 10.5);
      this.card.addChild(tag);
    }

    const id = new Text({
      text: `${project.year} · ${project.slug}`.toUpperCase(),
      style: { fontFamily: 'Martian Mono', fontSize: 10, fill: project.accent, letterSpacing: 2 },
    });
    id.alpha = 0.92;
    // inside the card's bottom edge — on a contiguous carpet there is no floor
    // between tiles for a label to sit on
    id.position.set(-this.cw / 2 + 12, this.ch / 2 - 18);
    this.card.addChild(id);

    const code = new Text({
      text: `RVL/${String(Math.abs(placed.col * 7 + placed.row * 13) % 9000 + 1000)}`,
      style: { fontFamily: 'Martian Mono', fontSize: 8, fill: 0xedede6, letterSpacing: 1.5 },
    });
    code.alpha = 0.5;
    code.position.set(-this.cw / 2 + 44, -this.ch / 2 + 6);
    this.card.addChild(code);

    this.addChild(this.card);
    if (featured) {
      this.baseGlowAlpha = 0.14;
      this.ensureGlow().alpha = this.baseGlowAlpha;
    }
    this.applyMatrix();
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  applyMatrix(): void {
    const s = this.sizeMul;
    this.card.setFromMatrix(new Matrix(this.m.a * s, this.m.b * s, this.m.c * s, this.m.d * s, 0, 0));
  }

  extentX(): number {
    return ((Math.abs(this.m.a) * this.cw + Math.abs(this.m.c) * this.ch) / 2) * this.sizeMul;
  }

  extentY(): number {
    return ((Math.abs(this.m.b) * this.cw + Math.abs(this.m.d) * this.ch) / 2) * this.sizeMul;
  }
}
