import { Application, ColorMatrixFilter, Container } from 'pixi.js';
import gsap from 'gsap';
import { GlitchFilter, RGBSplitFilter } from 'pixi-filters';
import type { Project } from '../lib/content';
import { projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { dprCap, finePointer, reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { leaveTo } from '../lib/transitions';
import { setCursorLabel } from '../shell/cursor';
import { CARD_H, CARD_W, ISO, WORLD_PAD } from './constants';
import { buildDebris } from './debris';
import { buildFields } from './fields';
import { PanController } from './input';
import { layoutProjects } from './layout';
import { PlaybackManager } from './playback';
import type { ViewRect } from './priority';
import { ProjectTile } from './tile';

export interface WorldHooks { onCoords(x: number, y: number): void }

export class WorksWorld {
  tiles = new Map<string, ProjectTile>();
  protected app!: Application;
  protected worldC = new Container();
  protected tilesLayer = new Container();
  protected fxLayer = new Container();
  protected pan!: PanController;
  protected hooks!: WorldHooks;
  hoveredSlug: string | null = null;
  playback!: PlaybackManager;
  private desat = new ColorMatrixFilter();
  private labelEl = document.getElementById('tile-label');
  private entering = false;

  static async create(host: HTMLElement, projects: Project[], hooks: WorldHooks): Promise<WorksWorld> {
    const w = new WorksWorld();
    w.hooks = hooks;

    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      resolution: dprCap(),
      autoDensity: true,
      resizeTo: host,
    });
    host.append(app.canvas);
    w.app = app;

    const posterCanvases = await Promise.all(projects.map((p) => loadPosterCanvas(p)));
    const placed = layoutProjects(
      projects.map((p) => ({ slug: p.slug, tileSize: p.tileSize, position: p.position })),
    );
    const placedBySlug = new Map(placed.map((pl) => [pl.slug, pl]));

    w.tilesLayer.sortableChildren = true;
    projects.forEach((p, i) => {
      const tile = new ProjectTile(p, placedBySlug.get(p.slug)!, posterCanvases[i]);
      w.tiles.set(p.slug, tile);
      w.tilesLayer.addChild(tile);
    });
    w.playback = new PlaybackManager(w.tiles);

    w.desat.saturate(-0.35, false);
    for (const tile of w.tiles.values()) {
      const slug = tile.project.slug;
      tile.on('pointerover', () => {
        if (finePointer() && !w.pan.dragging) w.hover(slug);
      });
      tile.on('pointerout', () => {
        if (finePointer() && w.hoveredSlug === slug) w.unhover();
      });
      tile.on('pointertap', () => {
        if (w.pan.lastGestureDist > 8) return; // that was a drag, not a tap
        if (finePointer()) { w.enter(slug); return; }
        if (w.hoveredSlug === slug) w.enter(slug);
        else w.hover(slug);
      });
    }
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.renderer.on('resize', () => { app.stage.hitArea = app.screen; });
    app.stage.on('pointertap', (e) => {
      if (e.target === app.stage && w.pan.lastGestureDist <= 8) w.unhover();
    });

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const t of w.tiles.values()) {
      minX = Math.min(minX, t.x - t.extentX());
      maxX = Math.max(maxX, t.x + t.extentX());
      minY = Math.min(minY, t.y - t.extentY());
      maxY = Math.max(maxY, t.y + t.extentY());
    }
    const carpet = { minX, maxX, minY, maxY };
    // the graphic furniture rings the carpet, so the pannable region has to reach
    // past it — but only far enough to frame it, never far enough to get lost in
    // black
    const halo = Math.max(WORLD_PAD, (maxX - minX) * 0.3, (maxY - minY) * 0.45);
    minX -= halo; maxX += halo; minY -= halo; maxY += halo;

    w.worldC.addChild(buildFields(carpet), buildDebris(placed), w.tilesLayer, w.fxLayer);
    app.stage.addChild(w.worldC);

    w.pan = new PanController(
      host,
      { minX: -maxX, maxX: -minX, minY: -maxY, maxY: -minY },
      !reducedMotion(),
    );

    let coordsClock = 0;
    app.ticker.add((tk) => {
      w.pan.tick(tk.deltaMS);
      w.worldC.position.set(app.screen.width / 2 + w.pan.pos.x, app.screen.height / 2 + w.pan.pos.y);
      coordsClock += tk.deltaMS;
      if (coordsClock > 100) {
        coordsClock = 0;
        w.hooks.onCoords(-w.pan.pos.x, -w.pan.pos.y);
      }
      w.afterTick(tk.deltaMS);
    });
    return w;
  }

  private playClock = 0;
  private shimmerClock = 0;
  private lastPlayPos = { x: NaN, y: NaN };

  protected afterTick(dtMs: number): void {
    this.playClock += dtMs;
    const moved = Math.hypot(this.pan.pos.x - this.lastPlayPos.x, this.pan.pos.y - this.lastPlayPos.y);
    if (this.playClock > 300 || moved > 60 || Number.isNaN(moved)) {
      this.playClock = 0;
      this.lastPlayPos = { x: this.pan.pos.x, y: this.pan.pos.y };
      this.playback.update(this.viewRect(), this.hoveredSlug);
    }
    // sleeping posters get occasional glitch ticks — the floor never looks frozen
    this.shimmerClock += dtMs;
    if (this.shimmerClock > 380 && !reducedMotion()) {
      this.shimmerClock = 0;
      const sleeping = [...this.tiles.values()].filter((t) => t.mode === 'sleep');
      if (sleeping.length) {
        sleeping[Math.floor(Math.random() * sleeping.length)].shimmer();
      }
    }
  }

  viewRect(): ViewRect {
    return {
      x: -this.pan.pos.x - this.app.screen.width / 2,
      y: -this.pan.pos.y - this.app.screen.height / 2,
      w: this.app.screen.width,
      h: this.app.screen.height,
    };
  }

  panBy(dx: number, dy: number): void {
    this.pan.panBy(dx, dy);
  }

  hover(slug: string): void {
    if (this.entering) return;
    if (this.hoveredSlug === slug) return;
    this.unhover();
    const tile = this.tiles.get(slug);
    if (!tile) return;
    this.hoveredSlug = slug;
    sound.hover();
    this.fxLayer.addChild(tile); // lift out of the dimmed/desaturated layer
    this.tilesLayer.filters = [this.desat];
    gsap.killTweensOf(this.tilesLayer);
    gsap.to(this.tilesLayer, { alpha: 0.62, duration: 0.35 });
    tile.wake();
    tile.swapToMontage();
    tile.enterHover();
    setCursorLabel('ENTER ▸');
    this.showLabel(tile);
    this.playback.update(this.viewRect(), this.hoveredSlug);
  }

  unhover(): void {
    if (this.entering) return;
    const slug = this.hoveredSlug;
    if (!slug) return;
    this.hoveredSlug = null;
    const tile = this.tiles.get(slug);
    setCursorLabel(null);
    this.hideLabel();
    this.tilesLayer.filters = [];
    gsap.killTweensOf(this.tilesLayer);
    gsap.to(this.tilesLayer, { alpha: 1, duration: 0.3 });
    if (tile) {
      tile.restorePreview();
      tile.exitHover();
      this.tilesLayer.addChild(tile);
    }
    this.playback.update(this.viewRect(), null);
  }

  /** Arm a one-shot bfcache-restore listener. Fires only for a `persisted` pageshow (a Back
   *  restore of this exact tab) and self-removes before running `restore`, so a restore that
   *  itself triggers navigation can never leave a stale listener behind. */
  private armRestore(restore: () => void): void {
    const onShow = (e: PageTransitionEvent) => {
      window.removeEventListener('pageshow', onShow);
      if (e.persisted) restore();
    };
    window.addEventListener('pageshow', onShow);
  }

  enter(slug: string): void {
    if (this.entering) return;
    const tile = this.tiles.get(slug);
    if (!tile) return;
    this.entering = true;
    sound.click();
    const dest = `/project.html?p=${encodeURIComponent(slug)}`;
    if (reducedMotion()) {
      // no burst runs on this path, but `entering` still must not survive a bfcache
      // Back-restore — otherwise hover/unhover/focusProject stay guarded off forever.
      this.armRestore(() => { this.entering = false; this.unhover(); });
      leaveTo(dest);
      return;
    }
    setCursorLabel(null);
    this.hideLabel();
    const glitch = new GlitchFilter({ slices: 12, offset: 60 });
    const rgb = new RGBSplitFilter({ red: { x: 4, y: 0 }, green: { x: 0, y: 0 }, blue: { x: -4, y: 0 } });
    this.worldC.filters = [glitch, rgb];
    this.fxLayer.addChild(tile);
    const cover =
      (Math.max(this.app.screen.width / CARD_W, this.app.screen.height / CARD_H) * 1.12) / tile.sizeMul;
    gsap.killTweensOf(tile.m);
    gsap.killTweensOf(this.pan.pos);
    gsap.to(this.pan.pos, { x: -tile.x, y: -tile.y, duration: 0.42, ease: 'power2.in' });
    gsap.to(tile.m, {
      a: cover, b: 0, c: 0, d: cover,
      duration: 0.46, ease: 'power3.in',
      onUpdate: () => tile.applyMatrix(),
    });
    gsap.to(this.tilesLayer, { alpha: 0, duration: 0.3 });
    const jitter = () => {
      glitch.seed = Math.random();
      glitch.offset = 30 + Math.random() * 90;
    };
    this.app.ticker.add(jitter);
    // bfcache restore (Back from the project page) resumes this exact tab with `entering`
    // still true and the burst never torn down — undo it so the floor comes back sane.
    this.armRestore(() => this.resetBurst(tile, jitter));
    window.setTimeout(() => leaveTo(dest), 500);
  }

  /** Undo enter()'s burst (filters, jitter ticker, camera/tile/layer tweens, reparent) and
   *  any pre-burst hover residue (desat filter, hovered slug, glow, montage src) — only
   *  reachable via bfcache restore, since a fresh load never has a burst in flight. */
  private resetBurst(tile: ProjectTile, jitter: () => void): void {
    this.app.ticker.remove(jitter);
    this.worldC.filters = [];
    gsap.killTweensOf(this.pan.pos);
    gsap.killTweensOf(tile.m);
    gsap.killTweensOf(this.tilesLayer);
    // force the erupted tile home even if it was entered without a preceding hover
    Object.assign(tile.m, ISO);
    tile.applyMatrix();
    this.tilesLayer.addChild(tile);
    tile.zIndex = tile.placed.col + tile.placed.row;
    this.tilesLayer.alpha = 1;
    this.entering = false;
    this.unhover(); // clears desat filter, hoveredSlug, label, cursor, glow, montage src
  }

  focusProject(slug: string): void {
    if (this.entering) return;
    const tile = this.tiles.get(slug);
    if (!tile) return;
    const mySlug = slug;
    gsap.killTweensOf(this.pan.pos);
    gsap.to(this.pan.pos, {
      x: -tile.x, y: -tile.y,
      duration: reducedMotion() ? 0 : 0.5, ease: 'power2.out',
      onComplete: () => { if (!this.entering) this.hover(mySlug); },
    });
  }

  enterHovered(): void {
    if (this.hoveredSlug) this.enter(this.hoveredSlug);
  }

  private showLabel(tile: ProjectTile): void {
    if (!this.labelEl) return;
    const p = tile.project;
    const global = this.worldC.toGlobal({ x: tile.x, y: tile.y });
    this.labelEl.hidden = false;
    this.labelEl.style.left = `${Math.max(16, Math.min(window.innerWidth - 360, global.x + tile.extentX() * 0.7))}px`;
    this.labelEl.style.top = `${Math.min(window.innerHeight - 120, Math.max(70, global.y - 40))}px`;
    const title = this.labelEl.querySelector('.tl-title') as HTMLElement;
    const meta = this.labelEl.querySelector('.tl-meta') as HTMLElement;
    meta.textContent = [p.year, p.role, p.runtime].filter(Boolean).join(' · ').toUpperCase();
    meta.style.color = p.accent;
    void scrambleEl(title, p.title.toUpperCase(), 420);
  }

  private hideLabel(): void {
    if (this.labelEl) this.labelEl.hidden = true;
  }
}

/** Deterministic per-slug treatment. A third of the floor stays hard 1-bit
 *  duotone; the rest keeps progressively more of the original image, so the
 *  carpet has rhythm instead of one uniform texture. Featured larges always
 *  read photographic — the richest material sits at the centre. */
function posterMix(p: Project): number {
  if (p.tileSize === 'large') return 0.72;
  let h = 0;
  for (let i = 0; i < p.slug.length; i++) h = (h * 31 + p.slug.charCodeAt(i)) >>> 0;
  return [0, 0, 0.5, 0.72][h % 4];
}

async function loadPosterCanvas(p: Project): Promise<HTMLCanvasElement> {
  const url = projectAssetUrl(p.slug, 'poster.jpg');
  try {
    const img = await loadImage(url);
    // 640 wide: a 400pt card at ~1.6x, so the Bayer pattern stays a fine screen
    // instead of upscaling into a visible mosaic
    return ditherImageToCanvas(img, img.naturalWidth, img.naturalHeight, 640, '#060606', p.accent, posterMix(p));
  } catch {
    console.warn(`[revachol] missing media: ${url} — using generated fallback poster`);
    return fallbackPoster(p);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

function fallbackPoster(p: Project): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 135;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0A0A12';
  ctx.fillRect(0, 0, 240, 135);
  const rand = mulberry32(p.slug.length * 7919);
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 260; i++) {
    ctx.fillRect(Math.floor(rand() * 240), Math.floor(rand() * 135), 2, 2);
  }
  return c;
}
