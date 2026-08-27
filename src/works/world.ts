import { Application, Container } from 'pixi.js';
import type { Project } from '../lib/content';
import { projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { dprCap, reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import { WORLD_PAD } from './constants';
import { buildDebris } from './debris';
import { PanController } from './input';
import { layoutProjects } from './layout';
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
      w.pan.tick();
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

  /** Extension point — playback (Task 13), rain (Task 15) hook in here. */
  protected afterTick(_dtMs: number): void {}

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
