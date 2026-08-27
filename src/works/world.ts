import { Application, ColorMatrixFilter, Container } from 'pixi.js';
import gsap from 'gsap';
import type { Project } from '../lib/content';
import { projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { dprCap, finePointer, reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { leaveTo } from '../lib/transitions';
import { setCursorLabel } from '../shell/cursor';
import { WORLD_PAD } from './constants';
import { buildDebris } from './debris';
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

    w.desat.saturate(-0.55, false);
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
    minX -= WORLD_PAD; maxX += WORLD_PAD; minY -= WORLD_PAD; maxY += WORLD_PAD;

    w.worldC.addChild(buildDebris(placed), w.tilesLayer, w.fxLayer);
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
    if (this.hoveredSlug === slug) return;
    this.unhover();
    const tile = this.tiles.get(slug);
    if (!tile) return;
    this.hoveredSlug = slug;
    sound.hover();
    this.fxLayer.addChild(tile); // lift out of the dimmed/desaturated layer
    this.tilesLayer.filters = [this.desat];
    gsap.killTweensOf(this.tilesLayer);
    gsap.to(this.tilesLayer, { alpha: 0.55, duration: 0.35 });
    tile.wake();
    tile.swapToMontage();
    tile.enterHover();
    setCursorLabel('ENTER ▸');
    this.showLabel(tile);
    this.playback.update(this.viewRect(), this.hoveredSlug);
  }

  unhover(): void {
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

  enter(slug: string): void {
    // Task 15 replaces this with the datamosh burst.
    leaveTo(`/project.html?p=${slug}`);
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

async function loadPosterCanvas(p: Project): Promise<HTMLCanvasElement> {
  const url = projectAssetUrl(p.slug, 'poster.jpg');
  try {
    const img = await loadImage(url);
    return ditherImageToCanvas(img, img.naturalWidth, img.naturalHeight, 240, '#060606', p.accent);
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
