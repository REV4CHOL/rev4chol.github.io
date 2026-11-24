/** QUALITY — one governor for the whole site (owner, 2026-09-28: "on weaker PCs and laptops and phones, the website
 *  is downright unplayable and laggy. Develop a system where the website automatically adapts to any computer
 *  strength"). Three tiers — LITE, BALANCED, FULL — an opening guess from the device, then a verdict from the
 *  measured frame on every page, remembered across the site's pages (each page is its own document). Every surface
 *  reads `quality.tier()` and subscribes to changes; nothing reloads.
 *
 *  The pure parts come first and are tested (tests/quality.test.ts); the live singleton is at the end. The STORY
 *  city keeps its own governor (about/city-governor.ts) and reads this one's tier only to open: the shell samples
 *  nothing there. */

export type Tier = 0 | 1 | 2;
export const TIER_LABELS = ['lite', 'balanced', 'full'] as const;
export type TierLabel = (typeof TIER_LABELS)[number];

/* ------------------------------------------------------------------ the opening tier -- */

export interface Device {
  /** `(pointer: coarse)`: a phone or a tablet */
  coarse: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { effectiveType?: string; saveData?: boolean };
  /** the WebGL renderer string (WEBGL_debug_renderer_info), when the browser gives it */
  gpu?: string;
}

/** A software rasteriser: nothing full-screen will ever be smooth. */
export const SOFTWARE_GPU = /swiftshader|llvmpipe|software|microsoft basic render/i;
/** An integrated part: Intel HD/UHD/Iris, an AMD APU. Strong enough for BALANCED; the governor may still climb. */
const INTEGRATED_GPU = /\bintel\b.*\b(hd|uhd|iris)\b.*\bgraphics\b|radeon\(tm\) graphics|vega \d+ graphics/i;

/** FULL by default on a desktop. BALANCED at most on a coarse pointer, on four threads or fewer or 4 GB or less
 *  (hardwareCeiling: `<= 4` since 2026-11-24, `< 4` let a 4 GB, four-thread laptop open at FULL), or on an
 *  integrated GPU. LITE on saveData or a 2g line (a visitor's own ask, or a line where nothing streams), or on
 *  a software renderer. A line's speed otherwise says nothing about the GPU and never moves the tier: Chrome's
 *  `effectiveType` estimate read "3g" on this very PC against the live site (2026-09-28) while dev read "4g" — a
 *  rule on it opened the owner's own machine BALANCED. The loops are already rationed by the play set. */
export function startTier(dev: Device): Tier {
  let t: Tier = 2;
  const cap = (m: Tier) => { if (m < t) t = m; };
  if (dev.coarse) cap(1);
  if (hardwareCeiling(dev) < 2) cap(1);
  if (dataSaver(dev)) cap(0);
  if (dev.gpu) {
    if (SOFTWARE_GPU.test(dev.gpu)) cap(0);
    else if (INTEGRATED_GPU.test(dev.gpu)) cap(1);
  }
  return t;
}

/** `?gfx=lite|balanced|full` (or 0|1|2) pins a tier — the owner's and the testers' switch. */
export function pinnedTier(search: string): Tier | null {
  const v = new URLSearchParams(search).get('gfx');
  if (v === null) return null;
  const i = TIER_LABELS.indexOf(v.toLowerCase() as TierLabel);
  if (i >= 0) return i as Tier;
  return v === '0' || v === '1' || v === '2' ? (Number(v) as Tier) : null;
}

/* ------------------------------------------------------------------ the machine's class -- */

/** The highest tier a device may ever reach: BALANCED for a machine that reports 4 GB of memory or less, or 4 threads
 *  or fewer (owner 2026-11-24, of the old 4 GB laptop: "never pushed up to the heavy level"); FULL for any other. A
 *  value the browser does not report says nothing. Worked out from the device at every start, never from storage. */
export function hardwareCeiling(dev: Device): Tier {
  const small =
    (dev.deviceMemory !== undefined && dev.deviceMemory <= 4) ||
    (dev.hardwareConcurrency !== undefined && dev.hardwareConcurrency <= 4);
  return small ? 1 : 2;
}

/** THE WEAK CLASS (owner 2026-11-24: the combined video "for weak machines only", "8 GB or less"). A machine is weak
 *  when it reports 8 GB of memory or less, or 4 threads or fewer, or its main pointer is coarse (a tablet; a phone
 *  has its reel). The answer names the line that gave it. The class chooses the WORK floor's video (floorMode) and
 *  caps no tier. Memory is read only where it is reported: Firefox and Safari report none, and a default of 8 would
 *  make every one of their visitors weak. An old Chrome reports no value above 8, so a larger machine reads as weak
 *  there. Worked out from the device at every start, never from storage. */
export type WeakBy = 'memory' | 'threads' | 'pointer';
export function weakBy(dev: Device): WeakBy | null {
  if (dev.deviceMemory !== undefined && dev.deviceMemory <= 8) return 'memory';
  if (dev.hardwareConcurrency !== undefined && dev.hardwareConcurrency <= 4) return 'threads';
  if (dev.coarse) return 'pointer';
  return null;
}

/** Save-Data, or a 2g line: the visitor asked for less data, or nothing streams. Opens LITE (startTier) and never
 *  starts a wall video (floorMode). */
export function dataSaver(dev: Device): boolean {
  const c = dev.connection;
  return !!c && (c.saveData === true || c.effectiveType === '2g' || c.effectiveType === 'slow-2g');
}

/* ---------------------------------------------------------------- the window's verdict -- */

/** A window is WINDOW frames. The display's own interval is the window's 10th-percentile interval, capped at 60 Hz
 *  (a 120 Hz display holding 60 is fine; a 60 Hz display holding 30 is not "a 30 Hz display"). A frame over
 *  LONG_FRAME × that is long. SLOW: the mean over SLOW_MEAN × the interval, or more than LONG_SHARE_SLOW of the frames
 *  long. FAST: the mean under FAST_MEAN × and fewer than LONG_SHARE_FAST long. Between the two the governor holds. */
export const WINDOW = 60;
export const LONG_FRAME = 1.6;
export const SLOW_MEAN = 1.4;
export const LONG_SHARE_SLOW = 0.25;
export const FAST_MEAN = 1.1;
export const LONG_SHARE_FAST = 0.05;
const REFRESH_CAP = 1000 / 60;

export interface Verdict { mean: number; refresh: number; long: number; slow: boolean; fast: boolean }

export function judge(intervals: number[]): Verdict {
  const a = [...intervals].sort((x, y) => x - y);
  if (a.length < 10) return { mean: 0, refresh: REFRESH_CAP, long: 0, slow: false, fast: false };
  const mean = a.reduce((s, x) => s + x, 0) / a.length;
  const refresh = Math.min(a[Math.floor(a.length * 0.1)], REFRESH_CAP);
  const long = a.filter((x) => x > refresh * LONG_FRAME).length / a.length;
  return {
    mean,
    refresh,
    long,
    slow: mean > refresh * SLOW_MEAN || long > LONG_SHARE_SLOW,
    fast: mean < refresh * FAST_MEAN && long < LONG_SHARE_FAST,
  };
}

/* --------------------------------------------------------------------------- steering -- */

/** The first HOLD_MS hold (boot residue). A step down has a 3 s cooldown and closes the tier left: it becomes the
 *  ceiling. A closed ceiling reopens one step REOPEN_MS after the step down that closed it — unless that tier has been
 *  left twice this session, which closes it for good (a transient hiccup gets one way back; a machine that is really
 *  too weak does not oscillate). Fast frames step up one tier, UP_AFTER_MS after the last step down, to the ceiling. */
export const HOLD_MS = 2500;
export const DOWN_COOLDOWN_MS = 3000;
export const UP_COOLDOWN_MS = 3000;
export const REOPEN_MS = 60000;
export const UP_AFTER_MS = 12000;

export interface Governor {
  tier: Tier;
  ceiling: Tier;
  /** how many times each tier has been LEFT by a step down this session */
  downs: number[];
  /** no move before this time */
  until: number;
  lastDown: number;
  /** when the ceiling last closed; null once it has had its chance to reopen */
  closedAt: number | null;
}

export function newGovernor(tier: Tier, ceiling: Tier, now: number, downs: number[] = [0, 0, 0]): Governor {
  return { tier, ceiling, downs: [...downs], until: now + HOLD_MS, lastDown: now, closedAt: null };
}

export type Steer = 'down' | 'up' | null;

/** Mutates `g`; returns what moved. */
export function steer(g: Governor, v: Verdict, now: number): Steer {
  if (now < g.until) return null;
  if (g.closedAt !== null && now - g.closedAt >= REOPEN_MS) {
    g.closedAt = null;
    if (g.ceiling < 2 && (g.downs[g.ceiling + 1] ?? 0) < 2) g.ceiling = (g.ceiling + 1) as Tier;
  }
  if (v.slow) {
    if (g.tier === 0) return null;
    g.downs[g.tier] = (g.downs[g.tier] ?? 0) + 1;
    g.tier = (g.tier - 1) as Tier;
    g.ceiling = g.tier;
    g.closedAt = now;
    g.until = now + DOWN_COOLDOWN_MS;
    g.lastDown = now;
    return 'down';
  }
  if (v.fast && g.tier < g.ceiling && now - g.lastDown >= UP_AFTER_MS) {
    g.tier = (g.tier + 1) as Tier;
    g.until = now + UP_COOLDOWN_MS;
    return 'up';
  }
  return null;
}

/* ------------------------------------------------------------ what the ladder also reads -- */

/** SHIP A COUNTS, SHIP B ACTS (spec 2026-11-24-work-wall-video-design, §3.1). What follows is measured and shown on
 *  the readout (`?stats=1`, lib/readout.ts) and decides nothing: each of these can lower a machine for a day, on
 *  numbers that cannot be proved on the development PC. The old laptop's reading comes first.
 *
 *  A STALL is a frame longer than STALL_MS. The sampler has always thrown such frames away, and still does (they
 *  never reach a window's verdict); now it counts them too. Not counted: frames inside the opening hold (HOLD_MS,
 *  boot residue), frames in the FLOOR_QUIET_MS after a floor is built (a load, a chapter flip, the return from THE
 *  LIST: the build's own work), the first frame after the tab was hidden, and gaps over STALL_GAP_MS (the machine
 *  slept). */
export const STALL_MS = 250;
export const STALL_GAP_MS = 5000;
export const FLOOR_QUIET_MS = 4000;

export class StallCounter {
  count = 0;
  private quietUntil: number;

  constructor(openedAt: number) {
    this.quietUntil = openedAt + HOLD_MS;
  }

  /** Nothing is counted for `ms` from `now`. A later call never shortens a spell that is running. */
  quiet(now: number, ms: number = FLOOR_QUIET_MS): void {
    this.quietUntil = Math.max(this.quietUntil, now + ms);
  }

  /** One frame of `dt` ms that ended at `now`. True when it was counted. */
  note(now: number, dt: number, afterHidden: boolean): boolean {
    if (dt <= STALL_MS || dt > STALL_GAP_MS || afterHidden || now < this.quietUntil) return false;
    this.count++;
    return true;
  }
}

/** The name of the signal behind a governor's move, as the readout shows it. */
export function signalOf(moved: Steer): string | null {
  return moved === 'down' ? 'slow frames' : moved === 'up' ? 'fast frames' : null;
}

/** THE FLOOR'S MEMORY BUDGET in MB, for what the site itself holds (lib/meter.ts: Pixi's textures and the
 *  JavaScript heap; never the machine's memory, which no browser tells a page). 96 for a machine that reports 4 GB
 *  or less, 144 for the rest of the weak class, 256 for any other, on a canvas of 1366×768. A filter's render target
 *  is sized by the canvas, so 45% of the budget grows with the canvas's pixel count. Shown on the readout, and over
 *  it nothing is shed until ship B. */
export const BUDGET_CANVAS_PX = 1366 * 768;
export function budgetFor(dev: Device, canvasPixels: number): number {
  const base = dev.deviceMemory !== undefined && dev.deviceMemory <= 4 ? 96 : weakBy(dev) !== null ? 144 : 256;
  return base * (0.55 + (0.45 * canvasPixels) / BUDGET_CANVAS_PX);
}

/** What `window.rvlQuality.state()` returns and the readout shows. */
export interface QualityReport {
  tier: Tier;
  label: TierLabel;
  ceiling: Tier;
  /** the highest tier this device may reach (hardwareCeiling) */
  hardwareCeiling: Tier;
  /** the tier this page opened at */
  opened: Tier;
  downs: number[];
  /** the sampler steers this page: false on a pinned page and on a page that governs itself (STORY) */
  governed: boolean;
  pinned: Tier | null;
  /** the weak class, by the line that gave it */
  weak: WeakBy | null;
  /** the signal that last changed the level, with the page clock's time (performance.now) */
  lastSignal: { name: string; at: number } | null;
  /** frames over STALL_MS since the page opened; null on a page that is not sampled */
  stalls: number | null;
  /** Chrome threw this tab away in the background and loaded it again (document.wasDiscarded) */
  discarded: boolean;
  device: { memory: number | null; threads: number | null; coarse: boolean; gpu: string | null; dataSaver: boolean };
}

/* ---------------------------------------------------------------- the verdict travels -- */

export interface KeyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
export interface State { tier: Tier; ceiling: Tier; downs: number[] }

/** sessionStorage: the session's state — tier, ceiling, the downs; the next page opens exactly here. */
export const SESSION_KEY = 'rvl-gfx-session';
/** localStorage: the tier the last visit settled at, valid a day — the opening tier of a new visit, ceiling FULL. */
export const DAY_KEY = 'rvl-gfx';
export const DAY_MS = 86400000;

const isTier = (v: unknown): v is Tier => v === 0 || v === 1 || v === 2;

function read(store: KeyStore | null, key: string): unknown {
  try {
    const raw = store?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function restoreState(session: KeyStore | null, local: KeyStore | null, now: number, fallback: Tier): State {
  const s = read(session, SESSION_KEY) as Partial<State> | null;
  if (
    s && isTier(s.tier) && isTier(s.ceiling) &&
    Array.isArray(s.downs) && s.downs.length === 3 && s.downs.every((n) => typeof n === 'number')
  ) {
    return { tier: s.tier, ceiling: s.ceiling, downs: [...s.downs] };
  }
  const d = read(local, DAY_KEY) as { tier?: unknown; at?: unknown } | null;
  if (d && isTier(d.tier) && typeof d.at === 'number' && now - d.at <= DAY_MS) return { tier: d.tier, ceiling: 2, downs: [0, 0, 0] };
  return { tier: fallback, ceiling: 2, downs: [0, 0, 0] };
}

export function saveState(session: KeyStore | null, local: KeyStore | null, g: Governor, now: number): void {
  try { session?.setItem(SESSION_KEY, JSON.stringify({ tier: g.tier, ceiling: g.ceiling, downs: g.downs })); } catch { /* private mode */ }
  try { local?.setItem(DAY_KEY, JSON.stringify({ tier: g.tier, at: now })); } catch { /* private mode */ }
}

/** Where a page opens: the remembered tier and ceiling, both lowered to the device's hardware ceiling (`max`), so
 *  what an earlier visit remembered cannot lift a small machine. A pin (`?gfx=`) wins over both. The governor never
 *  raises a ceiling past the one it opened with (a closed ceiling reopens one step, back to where it was), so
 *  lowering it here holds for the page's life. */
export function openAt(st: State, max: Tier, pinned: Tier | null): { tier: Tier; ceiling: Tier } {
  if (pinned !== null) return { tier: pinned, ceiling: pinned };
  return { tier: Math.min(st.tier, max) as Tier, ceiling: Math.min(st.ceiling, max) as Tier };
}

/* ------------------------------------------------------------------------- the knobs -- */

/** Live loops on the floor: 14 · 14 · 3 on a desktop, 4 · 3 · 2 on a tablet or a window under 820 px (a phone has its
 *  strip, works/reel.ts). A desktop's 14 is a whole chapter (12 while CH·01 held 12; 14 since THE LOVERS and XIÊU LÒNG
 *  joined it, 2026-11-24: it grows with the largest chapter), so at FULL and BALANCED every pane in the view plays and
 *  only the far ones, past the window's margin (works/priority.ts), keep their posters until the view comes near —
 *  owner 2026-11-08: "almost all panes to load at once", the old 10 · 6 left five posters on a BALANCED screen. The
 *  loops were never the floor's cost (the 09-27 lag: uploads, blurs, sleeping decodes; 09-28: the resting glows), and
 *  LITE keeps 3 for a machine that can't keep up. */
export function videoCapFor(tier: Tier, phone: boolean): number {
  return [[3, 2], [14, 3], [14, 4]][tier][phone ? 1 : 0];
}

/** The Pixi canvas's resolution: FULL as before (DPR ≤ 2, a phone ≤ 1.5); BALANCED ≤ 1.5 (a phone 1); LITE 1. */
export function resolutionFor(tier: Tier, dpr: number, phone: boolean): number {
  const d = dpr > 0 ? dpr : 1;
  if (tier === 0) return 1;
  if (tier === 1) return phone ? 1 : Math.min(d, 1.5);
  return Math.min(d, phone ? 1.5 : 2);
}

/** The Pixi ticker's cap: the display's own rate (0), 60, 30. */
export function maxFpsFor(tier: Tier): number {
  return [30, 60, 0][tier];
}

/** The grain's re-deal interval in ms; 0 = the layer is hidden. */
export function grainIntervalFor(tier: Tier): number {
  return [0, 180, 90][tier];
}

/* -------------------------------------------------------------------- the floor's video -- */

/** What the WORK floor plays (spec 2026-11-24-work-wall-video-design, §4.1):
 *  - `own`: each pane its own loop, as since 2026-11-08;
 *  - `wall`: every pane a tile of the chapter's one wall video (works/wall.ts);
 *  - `wall-small`: the same from the half-size copy;
 *  - `posters`: a wall is due and cannot play; the panes nearest the middle play their own loops;
 *  - `starved`: the half-size copy cannot keep up either; only the pointed pane plays. */
export type FloorMode = 'own' | 'wall' | 'wall-small' | 'posters' | 'starved';

/** What the wall's own watch has found this session (works/wall-watch.ts): the full-size video keeps up (`ok`), only
 *  the half-size copy may be tried (`small`), or neither does (`starved`). */
export type WallVerdict = 'ok' | 'small' | 'starved';

export interface FloorFacts {
  tier: Tier;
  /** the weak class (weakBy), before the pin is read */
  weak: boolean;
  pinned: Tier | null;
  /** Save-Data or a 2g line (dataSaver) */
  dataSaver: boolean;
  /** the chapter has a wall video that may be tried: listed in the manifest, and not failed this session */
  wall: boolean;
  /** …and a half-size copy of it */
  small: boolean;
  /** the panes' own loops failed their health watch, in this visit or within a day. Ship B sets it; until then false */
  loopsFailed: boolean;
  /** the floor lost its WebGL context in this visit. Ship B sets it; until then false */
  contextLost: boolean;
  verdict: WallVerdict;
}

/** The floor's mode, in the spec's four steps. A pinned page takes step 1 from the pinned tier, where a pin of FULL
 *  also sets the class aside (the owner's switch for the floor as it was: every pane's own loop on any machine); it keeps
 *  step 3 and skips steps 2 and 4, so it obeys neither watch and ignores what an earlier visit remembered. */
export function floorMode(f: FloorFacts): FloorMode {
  const pinned = f.pinned !== null;
  const tier = f.pinned ?? f.tier;
  // 1. the class and the tier: a weak machine plays the wall at every tier, any other at LITE
  let due = (f.weak && f.pinned !== 2) || tier === 0;
  // 2. own loops that starved, or a lost context, make the wall due
  if (!pinned && (f.loopsFailed || f.contextLost)) due = true;
  if (!due) return 'own';
  // 3. a wall that is due and cannot play
  if (f.dataSaver || !f.wall) return 'posters';
  // 4. a wall that plays follows its own watch
  const verdict = pinned ? 'ok' : f.verdict;
  if (verdict === 'starved') return 'starved';
  if (verdict === 'small') return f.small ? 'wall-small' : 'posters';
  return 'wall';
}

/** The mode after the tier moved under a standing floor. A step up changes no video until the floor is next built,
 *  so no machine downloads the wall and then a chapter of loops in one view; a step down switches at once. `f` holds
 *  the new tier. */
export function modeAfterTierChange(current: FloorMode, before: Tier, after: Tier, f: FloorFacts): FloorMode {
  return after > before ? current : floorMode(f);
}

/** How many panes may decode their own loop: `own` takes videoCapFor as it is; beside a wall, and in `posters`, the
 *  smaller of it and 3; `starved` leaves the pointed pane alone. */
export function ownLoopCap(mode: FloorMode, tier: Tier, narrow: boolean): number {
  if (mode === 'starved') return 1;
  const cap = videoCapFor(tier, narrow);
  return mode === 'own' ? cap : Math.min(cap, 3);
}

/* ------------------------------------------------------------------- the live governor -- */

type Listener = (tier: Tier) => void;

function storeOr(get: () => Storage): KeyStore | null {
  try {
    const s = get();
    return s ? { getItem: (k) => s.getItem(k), setItem: (k, v) => s.setItem(k, v), removeItem: (k) => s.removeItem(k) } : null;
  } catch {
    return null;
  }
}

function readDevice(): Device {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; saveData?: boolean } };
  let gpu: string | undefined;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* no WebGL here: the renderers will say so themselves */ }
  return {
    coarse: window.matchMedia('(pointer: coarse)').matches,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    connection: nav.connection,
    gpu,
  };
}

class Quality {
  private t: Tier = 2;
  private g: Governor | null = null;
  private listeners = new Set<Listener>();
  private started = false;
  private governed = false;
  private session: KeyStore | null = null;
  private local: KeyStore | null = null;
  /** the device as read at start(); before it, a machine that reports nothing */
  private dev: Device = { coarse: false };
  private pin: Tier | null = null;
  private hardMax: Tier = 2;
  private opened: Tier = 2;
  private stalls: StallCounter | null = null;
  private signal: { name: string; at: number } | null = null;
  private discarded = false;

  tier(): Tier { return this.t; }
  label(): TierLabel { return TIER_LABELS[this.t]; }
  /** the address's pin (`?gfx=`), or null: a pinned page is measured and obeys no watch */
  pinned(): Tier | null { return this.pin; }

  /** The ladder's half of the floor's facts; the floor adds the wall's (works/world.ts). The health flag and a lost
   *  context arrive with ship B: until then neither is ever set. */
  floorFacts(wall: Pick<FloorFacts, 'wall' | 'small' | 'verdict'>): FloorFacts {
    return {
      tier: this.t, weak: weakBy(this.dev) !== null, pinned: this.pin, dataSaver: dataSaver(this.dev),
      loopsFailed: false, contextLost: false, ...wall,
    };
  }

  /** A floor is being built, or has just been (a load, a chapter flip, the return from THE LIST): the long frames of
   *  the next 4 s are the build's own work and are not counted as stalls. */
  floorBuilt(): void {
    this.stalls?.quiet(performance.now());
  }

  /** The floor's memory budget in MB for a canvas of `canvasPixels` (budgetFor). */
  budget(canvasPixels: number): number {
    return budgetFor(this.dev, canvasPixels);
  }

  /** What the readout and `rvlQuality.state()` show. */
  report(): QualityReport {
    const g = this.g;
    const d = this.dev;
    return {
      tier: this.t,
      label: TIER_LABELS[this.t],
      ceiling: g ? g.ceiling : this.t,
      hardwareCeiling: this.hardMax,
      opened: this.opened,
      downs: g ? [...g.downs] : [0, 0, 0],
      governed: this.governed,
      pinned: this.pin,
      weak: weakBy(d),
      lastSignal: this.signal,
      stalls: this.stalls ? this.stalls.count : null,
      discarded: this.discarded,
      device: {
        memory: d.deviceMemory ?? null, threads: d.hardwareConcurrency ?? null, coarse: d.coarse, gpu: d.gpu ?? null,
        dataSaver: dataSaver(d),
      },
    };
  }

  /** Hear every change; returns the unsubscribe. */
  on(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  /** Force a tier (the address's pin, the debug handle): the ceiling closes on it for the session. */
  set(t: Tier): void {
    if (!isTier(t)) return;
    if (this.g) {
      this.g.tier = t;
      this.g.ceiling = t;
      this.g.until = performance.now() + HOLD_MS;
      saveState(this.session, this.local, this.g, Date.now());
    }
    this.apply(t);
  }

  /** Called once by the shell, before the atmosphere and the page mount. `govern: false` opens at the remembered or
   *  device tier and samples nothing (the STORY city governs itself). A pinned page is never governed either. */
  start(opts: { govern?: boolean } = {}): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.session = storeOr(() => sessionStorage);
    this.local = storeOr(() => localStorage);
    const now = performance.now();
    const pinned = pinnedTier(location.search);
    this.pin = pinned;
    this.dev = readDevice();
    const st = restoreState(this.session, this.local, Date.now(), startTier(this.dev));
    // (the hardware ceiling and the class are read from the device here, at every start, and never from storage)
    this.hardMax = hardwareCeiling(this.dev);
    const open = openAt(st, this.hardMax, pinned);
    this.opened = open.tier;
    this.discarded = (document as Document & { wasDiscarded?: boolean }).wasDiscarded === true;
    this.g = newGovernor(open.tier, open.ceiling, now, st.downs);
    this.apply(this.g.tier);
    saveState(this.session, this.local, this.g, Date.now());
    (window as unknown as { rvlQuality: unknown }).rvlQuality = {
      tier: () => this.t,
      label: () => this.label(),
      set: (t: Tier) => this.set(t),
      state: () => this.report(),
    };
    // a pinned page is measured (its stalls show on the readout) and never moved; a page that governs itself is not
    // sampled at all (the STORY city)
    if (opts.govern !== false) this.sample(pinned === null);
  }

  private apply(t: Tier): void {
    this.t = t;
    const root = document.documentElement;
    for (const l of TIER_LABELS) root.classList.remove(`rvl-${l}`);
    root.classList.add(`rvl-${TIER_LABELS[t]}`);
    for (const cb of this.listeners) cb(t);
  }

  /** The sampler: frame intervals, a verdict every WINDOW frames, the governor's move applied live. Hidden tabs and
   *  frames over 250 ms (a tab switch, the boot screen's work) do not count toward a verdict. Such a long frame is
   *  counted as a stall and shown on the readout (StallCounter); it decides nothing until ship B. With `steering`
   *  false (a pinned page) the frames are measured and the tier never moves. */
  private sample(steering: boolean): void {
    this.governed = steering;
    const stalls = new StallCounter(performance.now());
    this.stalls = stalls;
    const iv: number[] = [];
    let last = performance.now();
    let afterHidden = document.hidden;
    document.addEventListener('visibilitychange', () => { if (document.hidden) afterHidden = true; });
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      stalls.note(now, dt, afterHidden);
      afterHidden = false;
      if (document.hidden || dt > 250) return;
      if (!steering) return;
      iv.push(dt);
      if (iv.length < WINDOW) return;
      const v = judge(iv);
      iv.length = 0;
      const g = this.g!;
      const before = g.tier;
      const moved = steer(g, v, now);
      if (moved && g.tier !== before) {
        this.signal = { name: signalOf(moved)!, at: now };
        this.apply(g.tier);
        saveState(this.session, this.local, g, Date.now());
      }
    };
    requestAnimationFrame(loop);
  }
}

export const quality = new Quality();
