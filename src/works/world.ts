// PixiJS without eval, before any renderer starts: the site's Content-Security-Policy allows none (src/lib/csp.ts)
import 'pixi.js/unsafe-eval';
import { Application, ColorMatrixFilter, Container } from 'pixi.js';
import gsap from 'gsap';
import { GlitchFilter, RGBSplitFilter } from 'pixi-filters';
import type { FloorItem, Project } from '../lib/content';
import { aspectRatio, isBlank } from '../lib/content';
import { dprCap, finePointer, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';
import { maxFpsFor, quality } from '../lib/quality';
import { softBreaks } from '../lib/escape';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { leaveTo } from '../lib/transitions';
import { setCursorLabel } from '../shell/cursor';
import { captionSpot } from './caption';
import { captionMeta, markFloorOpened } from './legend';
import { openingFrame } from './opening';
import {
  CARD_W, HOVER_LIFT, HOVER_M, ISO, SEAM, STEP_W, WORLD_PAD, cardSize, hoverFit, hoverFitIn, previewBox, rowAxisWorld,
} from './constants';
import { buildDebris } from './debris';
import { buildFields } from './fields';
import { GRAIN, joltCamera, misregister, streakBurst, type Burst, type Misreg } from './flipfx';
import { paneToWake } from './hover';
import { PanController } from './input';
import { BlankPane } from './blank';
import { layoutProjects, packRows, paneBand, rowsOf, type Placed } from './layout';
import { PlaybackManager } from './playback';
import { loadPosterCanvas } from './poster';
import type { TileRect, ViewRect } from './priority';
import { nearestPane, strayed } from './stray';
import { ProjectTile } from './tile';

export interface WorldHooks { onCoords(x: number, y: number): void }

export class WorksWorld {
  tiles = new Map<string, ProjectTile>();
  protected app!: Application;
  protected worldC = new Container();
  protected tilesLayer = new Container();
  protected fxLayer = new Container();
  protected fieldsC!: Container;
  protected debrisC!: Container;
  private misreg: Misreg | null = null;
  private bursts: Burst[] = [];
  private exiting = false;
  protected pan!: PanController;
  protected hooks!: WorldHooks;
  hoveredSlug: string | null = null;
  playback!: PlaybackManager;
  private desat = new ColorMatrixFilter();
  private labelEl = document.getElementById('tile-label');
  private entering = false;
  /** the quality subscription (lib/quality.ts) — dropped in destroy(), or a dead world would keep re-tuning */
  private offQuality: (() => void) | null = null;

  /** the floor stands still while the page shows its list of films (pause/resume) */
  private paused = false;
  /** the awake pane's lift: the scale its preview stands at (hoverFit, hoverFitIn) */
  private lift = 1;
  /** where the awake pane's caption stands from its card's centre (plate px), and the zoom it was placed at */
  private caption: { dx: number; dy: number; zs: number; left: number; top: number } | null = null;
  /** ms before the floor may be judged strayed (a chapter's panes are still flying in) */
  private strayHold = 0;

  /** the floor's held places — unlit screens keeping spots for films to come */
  protected blanks: BlankPane[] = [];
  /** the floor's open gaps — measured like held places, never put on the floor: nothing drawn, nothing to hover */
  protected gaps: BlankPane[] = [];

  /** every pane on the floor, lit or not — what the flights and the bounds move over */
  protected panes(): Array<Container & { placed: Placed; extentX(): number; extentY(): number }> {
    return [...this.tiles.values(), ...this.blanks];
  }

  static async create(host: HTMLElement, stream: FloorItem[], hooks: WorldHooks): Promise<WorksWorld> {
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
    app.ticker.maxFPS = maxFpsFor(quality.tier()); // (lib/quality.ts: the display's rate at FULL, 60 at BALANCED, 30 at LITE)

    // the layout runs on the whole stream (held places and open gaps keep their spots); only films get posters
    const projects = stream.filter((it): it is Project => !isBlank(it));
    const posters = await Promise.all(projects.map((p) => loadPosterCanvas(p)));
    // a vertical film's pane stands tall, two pane rows high (owner 2026-09-28: "The verticle pane must be bigger and
    // larger, as they are allowed to run irregular sizing")
    const placed = layoutProjects(
      stream.map((it) => ({
        slug: it.slug, tileSize: it.tileSize, position: it.position, tall: !isBlank(it) && aspectRatio(it.aspect) < 1,
      })),
    );
    const placedBySlug = new Map(placed.map((pl) => [pl.slug, pl]));
    // the lego pass: pack each row by the panes' REAL widths, so a 4:3 card
    // sits brick-tight against its 16:9 neighbors instead of on fixed columns
    const widthBySlug = new Map(
      stream.map((it) => [it.slug, isBlank(it) ? CARD_W : cardSize(aspectRatio(it.aspect), placedBySlug.get(it.slug)!.tall === true).cw]),
    );
    const packedU = packRows(placed, (pl) => widthBySlug.get(pl.slug) ?? CARD_W, SEAM, STEP_W);
    const at = (pl: Placed) => rowAxisWorld(packedU.get(pl.slug)!, pl.row + (rowsOf(pl) - 1) / 2);

    w.tilesLayer.sortableChildren = true;
    projects.forEach((p, i) => {
      const pl = placedBySlug.get(p.slug)!;
      const tile = new ProjectTile(p, pl, posters[i]);
      const pos = at(pl);
      tile.position.set(pos.x, pos.y);
      w.tiles.set(p.slug, tile);
      w.tilesLayer.addChild(tile);
    });
    for (const it of stream) {
      if (!isBlank(it)) continue;
      const pane = new BlankPane(placedBySlug.get(it.slug)!);
      const pos = at(pane.placed);
      pane.position.set(pos.x, pos.y);
      // an open gap (owner 2026-09-27: "remove the pane where MISTCHILD once stood") is measured but never put on the
      // floor — the cell grid shows through, as all around the carpet; measured, because a corner of the band is an
      // extreme of the carpet: unmeasured, the carpet shrank and the furniture ringing it slid in toward the corner
      if (it.gap) { w.gaps.push(pane); continue; }
      w.blanks.push(pane);
      w.tilesLayer.addChild(pane);
    }
    w.playback = new PlaybackManager(w.tiles);

    // THE TIER, LIVE (lib/quality.ts; owner 2026-09-28: "the website automatically adapts to any computer strength"):
    // on a change the canvas re-sizes at the tier's resolution, the ticker takes its cap, the carpet's hover filter
    // comes or goes, the glows follow, and the loops re-count on the next playback pass. Nothing reloads.
    w.offQuality = quality.on((t) => {
      app.renderer.resize(app.screen.width, app.screen.height, dprCap());
      app.ticker.maxFPS = maxFpsFor(t);
      if (w.hoveredSlug) w.tilesLayer.filters = t > 0 ? [w.desat] : [];
      for (const tile of w.tiles.values()) tile.retune();
      w.playback.update(w.viewRect(), w.hoveredSlug);
    });

    w.desat.saturate(-0.35, false);
    for (const tile of w.tiles.values()) {
      const slug = tile.project.slug;
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
    // hover follows the pointer: on every move, the pane under it is the one awake (paneToWake says why the panes'
    // own pointerover/pointerout could not be trusted)
    app.stage.on('globalpointermove', (e) => {
      if (!finePointer()) return;
      let hit: string | null = null;
      for (let o = e.target as Container | null; o; o = o.parent) if (o instanceof ProjectTile) { hit = o.project.slug; break; }
      // only the floor itself wakes a pane: Pixi hit-tests every pointer move on the whole document, so a pane lying
      // under the page's chrome woke — lifted, looped, and took the cursor's label as ENTER ▸ — while the pointer was
      // on a chapter tab (found fixing the owner's stuck SWITCH ▸, 2026-09-27)
      const onFloor = hit !== null && document.elementFromPoint(e.clientX, e.clientY) === app.canvas;
      const next = paneToWake(hit, onFloor, w.hoveredSlug, w.pan.dragging);
      if (next === w.hoveredSlug) return;
      if (next) w.hover(next);
      else w.unhover();
    });
    // the pointer left the floor's canvas, for the page's chrome or out of the window: no pane stays awake
    app.canvas.addEventListener('pointerleave', () => { if (finePointer()) w.unhover(); });

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const t of [...w.panes(), ...w.gaps]) {
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

    w.fieldsC = buildFields(carpet);
    w.debrisC = buildDebris(placed);
    w.worldC.addChild(w.fieldsC, w.debrisC, w.tilesLayer, w.fxLayer);
    app.stage.addChild(w.worldC);

    // full pinch-out on any device reveals what a ~1920px desktop sees —
    // a phone reaches ~0.2, a tablet ~0.4, a wide screen keeps 0.5
    const minZoom = () => Math.max(0.16, Math.min(0.5, app.screen.width / 1920));
    w.pan = new PanController(
      host,
      { minX: -maxX, maxX: -minX, minY: -maxY, maxY: -minY },
      !reducedMotion(),
      // pinch-to-zoom drives the world container's scale; the controller keeps the
      // point under the fingers fixed and scales the pan bounds to match
      {
        get: () => w.worldC.scale.x || 1,
        set: (s) => w.worldC.scale.set(s),
        center: () => ({ x: app.screen.width / 2, y: app.screen.height / 2 }),
        min: minZoom,
      },
    );

    // THE PHONE'S FIRST FRAME (owner's testers, 2026-09-27): a touch screen opens on one whole featured pane, fitted
    // and centred, not on the seam between two (works/opening.ts); a fine pointer keeps the cluster
    if (!finePointer()) {
      const frame = openingFrame(
        [...w.tiles.values()].map((t) => ({ x: t.x, y: t.y, halfW: t.extentX(), featured: t.project.tileSize === 'large' })),
        app.screen.width,
        minZoom(),
      );
      if (frame) {
        w.worldC.scale.set(frame.scale);
        w.pan.panTo(frame.x, frame.y);
      }
    }

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
  private strayClock = 0;
  private lastPlayPos = { x: NaN, y: NaN };
  private lastRestPos = { x: NaN, y: NaN };

  protected afterTick(dtMs: number): void {
    // a world on its way out must not churn: no playback wakes (each one can
    // spin up a fresh video decoder mid-flip), no shimmer ticks
    if (this.exiting) return;
    this.followCaption();
    this.returnIfStrayed(dtMs);
    this.playClock += dtMs;
    const moved = Math.hypot(this.pan.pos.x - this.lastPlayPos.x, this.pan.pos.y - this.lastPlayPos.y);
    if (this.playClock > 300 || moved > 60 || Number.isNaN(moved)) {
      this.playClock = 0;
      this.lastPlayPos = { x: this.pan.pos.x, y: this.pan.pos.y };
      this.playback.update(this.viewRect(), this.hoveredSlug);
    }
    // sleeping posters get occasional glitch ticks — the floor never looks frozen
    this.shimmerClock += dtMs;
    if (this.shimmerClock > 380 && !reducedMotion() && quality.tier() > 0) { // (LITE: the loops are the life)
      this.shimmerClock = 0;
      const sleeping = [...this.tiles.values()].filter((t) => t.mode === 'sleep');
      if (sleeping.length) {
        sleeping[Math.floor(Math.random() * sleeping.length)].shimmer();
      }
    }
  }

  /** NEVER LOST IN EMPTY FLOOR (stray.ts; the review's walkthroughs, 2026-09-30): four times a second, once the floor has come
   *  to rest, if the middle of the screen holds no film the floor glides back to the nearest one. Nothing moves under
   *  a finger or a drag, during a fling, or while another glide runs. */
  private returnIfStrayed(dtMs: number): void {
    if (this.strayHold > 0) this.strayHold -= dtMs;
    this.strayClock += dtMs;
    if (this.strayClock < 250) return;
    this.strayClock = 0;
    const still = Math.hypot(this.pan.pos.x - this.lastRestPos.x, this.pan.pos.y - this.lastRestPos.y) < 1;
    this.lastRestPos = { x: this.pan.pos.x, y: this.pan.pos.y };
    if (!still || this.strayHold > 0 || this.entering || this.pan.dragging || this.pan.coasting) return;
    if (gsap.isTweening(this.pan.pos)) return;
    const rects: TileRect[] = [...this.tiles.values()].map((t) => ({
      slug: t.project.slug, cx: t.x, cy: t.y, hw: t.extentX(), hh: t.extentY(),
    }));
    if (!strayed(this.viewRect(), rects)) return;
    const home = nearestPane(this.viewRect(), rects);
    if (!home) return;
    const zs = this.worldC.scale.x || 1;
    gsap.to(this.pan.pos, { x: -home.cx * zs, y: -home.cy * zs, duration: reducedMotion() ? 0 : 0.7, ease: 'power2.out' });
  }

  /** The floor stands still while the page shows its list: no pane awake, every loop asleep, the ticker stopped. */
  pause(): void {
    if (this.paused) return;
    this.unhover();
    this.paused = true;
    for (const t of this.tiles.values()) t.sleep();
    this.app.stop();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.app.start();
    this.playback.update(this.viewRect(), this.hoveredSlug);
  }

  viewRect(): ViewRect {
    // pan.pos is a screen offset; the visible WORLD rect shrinks as the pinch zooms in
    const s = this.worldC.scale.x || 1;
    return {
      x: (-this.pan.pos.x - this.app.screen.width / 2) / s,
      y: (-this.pan.pos.y - this.app.screen.height / 2) / s,
      w: this.app.screen.width / s,
      h: this.app.screen.height / s,
    };
  }

  panBy(dx: number, dy: number): void {
    this.pan.panBy(dx, dy);
  }

  hover(slug: string): void {
    if (this.entering || this.exiting || this.paused) return; // panes flying out under a still pointer must not wake
    if (this.hoveredSlug === slug) return;
    this.unhover();
    const tile = this.tiles.get(slug);
    if (!tile) return;
    this.hoveredSlug = slug;
    sound.hover();
    this.fxLayer.addChild(tile); // lift out of the dimmed/desaturated layer
    // LITE (lib/quality.ts): the alpha dim below is the whole cue — a colour-matrix pass over the carpet is a
    // full-screen filter a weak GPU pays for on every frame of the hover
    this.tilesLayer.filters = quality.tier() > 0 ? [this.desat] : [];
    gsap.killTweensOf(this.tilesLayer);
    gsap.to(this.tilesLayer, { alpha: 0.62, duration: 0.35 });
    tile.wake();
    tile.swapToMontage();
    // THE PREVIEW FITS THE SCREEN. A tall pane (a vertical film's) stands up twice a landscape pane's height: its hover
    // fits the screen's height at the floor's zoom, so the whole frame shows. And no preview is wider or taller than
    // its box (constants.previewBox; the review's walkthroughs, 2026-09-30: pinched in, a phone's preview stood wider than its
    // screen): at the floor's own zoom a landscape pane keeps the plain lift.
    const zs = this.worldC.scale.x || 1;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const coarse = !finePointer();
    const box = previewBox(sw, sh, coarse);
    this.lift = this.liftAt(tile, zs, box);
    tile.enterHover(this.lift);
    // where the lifted card's centre will stand on the screen: where the pane lies…
    let cx = sw / 2 + this.pan.pos.x + tile.x * zs;
    let cy = sh / 2 + this.pan.pos.y + (tile.y - HOVER_LIFT) * zs;
    if (coarse) {
      // …but a touch screen has no pointer to follow, and a tapped pane stood up where it lay: half off the screen, or
      // a sliver at its edge (the review's walkthroughs). The first tap now brings the pane to the middle of its box.
      cx = box.x + box.w / 2;
      cy = box.y + box.h / 2;
      gsap.killTweensOf(this.pan.pos);
      gsap.to(this.pan.pos, {
        x: cx - sw / 2 - tile.x * zs, y: cy - sh / 2 - (tile.y - HOVER_LIFT) * zs,
        duration: reducedMotion() ? 0 : 0.45, ease: 'power2.out',
      });
    }
    document.getElementById('app')?.classList.add('is-awake'); // (a phone's legend stands down: components.css)
    setCursorLabel('OPEN ▸'); // (the legend says "click it to open": the cursor says the same word)
    this.showLabel(tile, cx, cy);
    this.playback.update(this.viewRect(), this.hoveredSlug);
  }

  /** The scale a pane's preview stands at, at the floor's zoom `zs`, inside its box. */
  private liftAt(tile: ProjectTile, zs: number, box: { w: number; h: number }): number {
    return Math.min(
      tile.placed.tall ? hoverFit(tile.ch, tile.sizeMul, zs, this.app.screen.height) : 1,
      hoverFitIn(tile.cw, tile.ch, tile.sizeMul, zs, box.w, box.h),
    );
  }

  unhover(): void {
    if (this.entering) return;
    const slug = this.hoveredSlug;
    if (!slug) return;
    this.hoveredSlug = null;
    const tile = this.tiles.get(slug);
    document.getElementById('app')?.classList.remove('is-awake');
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
    // the legend has done its first job (owner's testers, 2026-09-27): remembered, and dimmed from here on
    try { markFloorOpened(localStorage); } catch { /* no storage */ }
    document.getElementById('floor-hint')?.classList.remove('is-fresh');
    const dest = `/project.html?p=${encodeURIComponent(slug)}`;
    // failsafe: if navigation stalls (dev-server hiccup, network), a latched
    // `entering` would deaden every hover until a manual reload — self-heal
    const armFailsafe = (reset: () => void) => {
      const t = window.setTimeout(() => { if (!document.hidden) reset(); }, 4000);
      window.addEventListener('pagehide', () => clearTimeout(t), { once: true });
    };
    if (reducedMotion()) {
      // no burst runs on this path, but `entering` still must not survive a bfcache
      // Back-restore — otherwise hover/unhover/focusProject stay guarded off forever.
      this.armRestore(() => { this.entering = false; this.unhover(); });
      armFailsafe(() => { this.entering = false; this.unhover(); });
      leaveTo(dest);
      return;
    }
    setCursorLabel(null);
    this.hideLabel();
    const glitch = new GlitchFilter({ slices: 12, offset: 60 });
    const rgb = new RGBSplitFilter({ red: { x: 4, y: 0 }, green: { x: 0, y: 0 }, blue: { x: -4, y: 0 } });
    this.worldC.filters = [glitch, rgb];
    this.fxLayer.addChild(tile);
    // under pinch zoom the tile is already rendered zs times larger and sits at a
    // zs-scaled screen offset — both the cover target and the camera target follow
    const zs = this.worldC.scale.x || 1;
    const cover =
      (Math.max(this.app.screen.width / (tile.cw * zs), this.app.screen.height / (tile.ch * zs)) * 1.12) /
      tile.sizeMul;
    gsap.killTweensOf(tile.m);
    gsap.killTweensOf(this.pan.pos);
    gsap.to(this.pan.pos, { x: -tile.x * zs, y: -tile.y * zs, duration: 0.42, ease: 'power2.in' });
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
    armFailsafe(() => this.resetBurst(tile, jitter));
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
    if (this.entering || this.paused) return;
    const tile = this.tiles.get(slug);
    if (!tile) return;
    const mySlug = slug;
    const zs = this.worldC.scale.x || 1; // (the pane's screen offset scales with the floor's zoom: unscaled, the focus missed)
    gsap.killTweensOf(this.pan.pos);
    gsap.to(this.pan.pos, {
      x: -tile.x * zs, y: -tile.y * zs,
      duration: reducedMotion() ? 0 : 0.5, ease: 'power2.out',
      onComplete: () => { if (!this.entering) this.hover(mySlug); },
    });
  }

  enterHovered(): void {
    if (this.hoveredSlug) this.enter(this.hoveredSlug);
  }

  /** Channel flip, phase out: the whole world pulls itself apart — alternating
   *  lattice rows jolt then slide off along the floor's own iso grain, the
   *  furniture and the lattice tear away in opposite directions, speed lines
   *  rip through the void and the signal misregisters harder the faster it
   *  all moves. A third of the panes leave on stepped frames. Resolves once
   *  every mover has left the frame. */
  exit(): Promise<void> {
    this.exiting = true;
    if (reducedMotion()) return Promise.resolve();
    // world-unit travel: divide by the pinch scale so the screen distance covered
    // stays the same however far the visitor is zoomed in or out
    const span = (Math.max(this.app.screen.width, this.app.screen.height) * 1.7) / (this.worldC.scale.x || 1);
    if (quality.tier() > 0) { // LITE (lib/quality.ts): the panes slide, nothing else — no kick, no misregistration, no streaks
      joltCamera(this.app.stage, 1.3);
      this.misreg?.dispose();
      // ramps for longer than the exit lasts — destroy() disposes it mid-climb
      this.misreg = misregister(this.app, this.worldC, 3, 30, 0.7);
      this.bursts.push(streakBurst(this.worldC, 2, this.viewRect(), 1));
    }
    const pull = (o: Container, dir: number, delay: number, ease: string, dist: number) =>
      new Promise<void>((res) => {
        gsap.killTweensOf(o);
        gsap
          .timeline({ onComplete: res, delay })
          .to(o, { x: o.x + dir * 16, duration: 0.05, ease: 'steps(1)' })
          .to(o, { x: o.x - dir * 12, duration: 0.05, ease: 'steps(1)' })
          .to(o, { x: o.x + dir * dist * GRAIN.x, y: o.y + dir * dist * GRAIN.y, duration: 0.34, ease });
      });
    const tweens: Promise<void>[] = [];
    for (const tile of this.panes()) {
      const band = paneBand(tile.placed); // alternate by the pane's row on the band, not the lattice's
      const dir = band % 2 === 0 ? 1 : -1;
      const ease = Math.random() < 0.35 ? 'steps(6)' : 'power2.in'; // some panes leave "on 2s"
      tweens.push(pull(tile, dir, (Math.abs(band) % 3) * 0.035 + Math.random() * 0.04, ease, span));
    }
    tweens.push(pull(this.fieldsC, 1, 0.02, 'power2.in', span * 1.9));
    tweens.push(pull(this.debrisC, -1, 0.05, 'power2.in', span * 1.9));
    return Promise.all(tweens).then(() => undefined);
  }

  /** Channel flip, phase in: the new world flies in along the same grain,
   *  mirrored — panes, furniture and lattice together — arriving misregistered
   *  and snapping into register as everything lands. */
  arrive(): void {
    this.strayHold = 1200; // (the panes are in flight: the floor is judged once they have landed)
    if (reducedMotion()) return;
    const span = Math.max(this.app.screen.width, this.app.screen.height) * 1.5;
    if (quality.tier() > 0) { // (LITE: the plain slide, as in exit())
      this.misreg?.dispose();
      this.misreg = misregister(this.app, this.worldC, 24, 0, 0.6, () => joltCamera(this.app.stage, 0.6));
      this.bursts.push(streakBurst(this.worldC, 2, this.viewRect(), -1));
    }
    const drop = (o: Container, dir: number, delay: number, ease: string, dist: number) => {
      const hx = o.x;
      const hy = o.y;
      o.x = hx + dir * dist * GRAIN.x;
      o.y = hy + dir * dist * GRAIN.y;
      gsap.to(o, { x: hx, y: hy, duration: 0.44, ease, delay });
    };
    for (const tile of this.panes()) {
      const band = paneBand(tile.placed);
      const dir = band % 2 === 0 ? -1 : 1;
      const ease = Math.random() < 0.25 ? 'steps(5)' : 'power3.out'; // a few land in chunks
      drop(tile, dir, (Math.abs(band) % 3) * 0.045 + Math.random() * 0.05, ease, span);
    }
    drop(this.fieldsC, -1, 0.03, 'power3.out', span * 1.6);
    drop(this.debrisC, 1, 0.06, 'power3.out', span * 1.6);
  }

  /** Full teardown so another world can mount on the same host (channel flip):
   *  release every tile's video element, drop the pan listeners, hide the
   *  floating label, then let Pixi destroy the app, canvas and scene graph. */
  destroy(): void {
    this.offQuality?.();
    this.offQuality = null;
    this.misreg?.dispose();
    for (const b of this.bursts) b.kill();
    this.bursts = [];
    gsap.killTweensOf(this.pan.pos);
    gsap.killTweensOf(this.app.stage.position);
    gsap.killTweensOf([this.tilesLayer, this.fieldsC, this.debrisC, ...this.blanks]);
    for (const tile of this.tiles.values()) {
      tile.killTweens(); // no tween may outlive the scene graph it writes into
      tile.releaseVideo();
    }
    this.pan.dispose();
    this.hideLabel();
    document.getElementById('app')?.classList.remove('is-awake');
    for (const g of this.gaps) g.destroy({ children: true }); // (never on the scene graph, so the app's teardown misses them)
    this.app.destroy(true, { children: true });
  }

  /** The awake pane's caption: its words, then its place (`cx`, `cy`: where the lifted card's centre will stand on the
   *  screen; on a touch screen the floor is still travelling there). */
  private showLabel(tile: ProjectTile, cx: number, cy: number): void {
    const el = this.labelEl;
    if (!el) return;
    const p = tile.project;
    const title = el.querySelector('.tl-title') as HTMLElement;
    const meta = el.querySelector('.tl-meta') as HTMLElement;
    const name = softBreaks((p.short || p.title).toUpperCase());
    meta.textContent = captionMeta(p, finePointer()); // …ending with the verb that opens the pane
    meta.style.color = p.accent;
    title.textContent = name; // (placed by its real words; the scramble then runs over them)
    el.hidden = false;
    this.placeCaption(tile, cx, cy);
    this.followCaption(); // (a touch screen: the card has yet to travel to where its caption was placed)
    void scrambleEl(title, name, 420);
  }

  /** The caption stands by the lifted card, never on the picture while there is room, never off the screen
   *  (caption.ts). Canvas coords are viewport px (the floor is lock-exempt); the label is plate chrome: the card's box
   *  and the screen are converted into plate px. */
  private placeCaption(tile: ProjectTile, cx: number, cy: number): void {
    const el = this.labelEl;
    if (!el) return;
    const z = posterZoom();
    const zs = this.worldC.scale.x || 1;
    const coarse = !finePointer();
    const w = (tile.cw * tile.sizeMul * HOVER_M.a * this.lift * zs) / z;
    const h = (tile.ch * tile.sizeMul * HOVER_M.d * this.lift * zs) / z;
    const pw = window.innerWidth / z;
    const ph = window.innerHeight / z;
    // the room captions may use: under the header, the legend and the list button; over the chapter tabs
    const head = coarse ? 132 : 172;
    const view = { x: 16, y: head, w: pw - 32, h: ph - head - (coarse ? 104 : 96) };
    const spot = captionSpot({ x: cx / z - w / 2, y: cy / z - h / 2, w, h }, view, (max) => {
      el.style.maxWidth = `${max}px`;
      return { w: el.offsetWidth, h: el.offsetHeight };
    });
    el.style.maxWidth = `${spot.maxWidth}px`;
    const left = Math.round(spot.left);
    const top = Math.round(spot.top);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    this.caption = { dx: left - cx / z, dy: top - cy / z, zs, left, top };
  }

  /** The caption travels with its card: while a touch screen brings the pane to the middle, while a wheel moves the
   *  floor under a still pointer; and it is placed afresh when the zoom changes the card's size. */
  private followCaption(): void {
    const c = this.caption;
    const el = this.labelEl;
    if (!c || !el || !this.hoveredSlug) return;
    const tile = this.tiles.get(this.hoveredSlug);
    if (!tile) return;
    const zs = this.worldC.scale.x || 1;
    const cx = this.app.screen.width / 2 + this.pan.pos.x + tile.x * zs;
    const cy = this.app.screen.height / 2 + this.pan.pos.y + (tile.y - HOVER_LIFT) * zs;
    if (zs !== c.zs) {
      // the zoom changed under the awake pane: its preview is fitted afresh (it grew with the zoom, past the screen),
      // then its caption
      const lift = this.liftAt(tile, zs, previewBox(this.app.screen.width, this.app.screen.height, !finePointer()));
      if (Math.abs(lift - this.lift) > 0.001) {
        this.lift = lift;
        tile.enterHover(lift);
      }
      this.placeCaption(tile, cx, cy);
      return;
    }
    const z = posterZoom();
    const left = Math.round(cx / z + c.dx);
    const top = Math.round(cy / z + c.dy);
    if (left === c.left && top === c.top) return;
    c.left = left;
    c.top = top;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  private hideLabel(): void {
    this.caption = null;
    if (this.labelEl) this.labelEl.hidden = true;
  }
}

// poster loading + fallback live in ./poster — shared with the tile's
// self-heal path, which retries degraded posters on wake
