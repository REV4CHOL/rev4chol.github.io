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
const SOFTWARE_GPU = /swiftshader|llvmpipe|software|microsoft basic render/i;
/** An integrated part: Intel HD/UHD/Iris, an AMD APU. Strong enough for BALANCED; the governor may still climb. */
const INTEGRATED_GPU = /\bintel\b.*\b(hd|uhd|iris)\b.*\bgraphics\b|radeon\(tm\) graphics|vega \d+ graphics/i;

/** FULL by default on a desktop. BALANCED at most on a coarse pointer, on fewer than four cores or less than 4 GB, on a
 *  3g line, or on an integrated GPU. LITE on saveData, a 2g line, or a software renderer. A fast line never
 *  promotes (it says nothing about the GPU). */
export function startTier(dev: Device): Tier {
  let t: Tier = 2;
  const cap = (m: Tier) => { if (m < t) t = m; };
  if (dev.coarse) cap(1);
  if ((dev.hardwareConcurrency ?? 8) < 4 || (dev.deviceMemory ?? 8) < 4) cap(1);
  const c = dev.connection;
  if (c && (c.saveData || c.effectiveType === '2g' || c.effectiveType === 'slow-2g')) cap(0);
  else if (c && c.effectiveType === '3g') cap(1);
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

/* ------------------------------------------------------------------------- the knobs -- */

/** Live loops on the floor: 10 · 6 · 3 on a desktop, 4 · 3 · 2 on a phone. */
export function videoCapFor(tier: Tier, phone: boolean): number {
  return [[3, 2], [6, 3], [10, 4]][tier][phone ? 1 : 0];
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

  tier(): Tier { return this.t; }
  label(): TierLabel { return TIER_LABELS[this.t]; }

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
    const st = restoreState(this.session, this.local, Date.now(), startTier(readDevice()));
    this.g = newGovernor(pinned ?? st.tier, pinned ?? st.ceiling, now, st.downs);
    this.apply(this.g.tier);
    saveState(this.session, this.local, this.g, Date.now());
    const g = this.g;
    (window as unknown as { rvlQuality: unknown }).rvlQuality = {
      tier: () => this.t,
      label: () => this.label(),
      set: (t: Tier) => this.set(t),
      state: () => ({ tier: g.tier, label: TIER_LABELS[g.tier], ceiling: g.ceiling, downs: [...g.downs], governed: this.governed, pinned }),
    };
    if (opts.govern !== false && pinned === null) this.sample();
  }

  private apply(t: Tier): void {
    this.t = t;
    const root = document.documentElement;
    for (const l of TIER_LABELS) root.classList.remove(`rvl-${l}`);
    root.classList.add(`rvl-${TIER_LABELS[t]}`);
    for (const cb of this.listeners) cb(t);
  }

  /** The sampler: frame intervals, a verdict every WINDOW frames, the governor's move applied live. Hidden tabs and
   *  frames over 250 ms (a tab switch, the boot screen's work) do not count. */
  private sample(): void {
    this.governed = true;
    const iv: number[] = [];
    let last = performance.now();
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      if (document.hidden || dt > 250) return;
      iv.push(dt);
      if (iv.length < WINDOW) return;
      const v = judge(iv);
      iv.length = 0;
      const g = this.g!;
      const before = g.tier;
      if (steer(g, v, now) && g.tier !== before) {
        this.apply(g.tier);
        saveState(this.session, this.local, g, Date.now());
      }
    };
    requestAnimationFrame(loop);
  }
}

export const quality = new Quality();
