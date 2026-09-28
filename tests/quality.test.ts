import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DAY_MS, FAST_MEAN, HOLD_MS, LONG_FRAME, LONG_SHARE_FAST, LONG_SHARE_SLOW, REOPEN_MS, SLOW_MEAN, UP_AFTER_MS, WINDOW,
  grainIntervalFor, judge, maxFpsFor, newGovernor, pinnedTier, resolutionFor, restoreState, saveState, startTier, steer,
  videoCapFor, type Governor, type KeyStore, type Tier,
} from '../src/lib/quality';

/** A window of frame intervals: `n` frames at `ms`, or a pattern repeated. */
const frames = (n: number, ms: number | number[]) => Array.from({ length: n }, (_, i) => (Array.isArray(ms) ? ms[i % ms.length] : ms));
const store = (init: Record<string, string> = {}): KeyStore & { m: Map<string, string> } => {
  const m = new Map(Object.entries(init));
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const broken: KeyStore = {
  getItem: () => { throw new Error('private mode'); },
  setItem: () => { throw new Error('private mode'); },
  removeItem: () => { throw new Error('private mode'); },
};

describe('the opening tier (owner 2026-09-28: "weaker PCs and laptops and phones … downright unplayable")', () => {
  it('a desktop opens FULL; a phone, a small device, a 3g line or an integrated GPU open BALANCED at most', () => {
    expect(startTier({ coarse: false })).toBe(2);
    expect(startTier({ coarse: false, hardwareConcurrency: 16, deviceMemory: 8, gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(2);
    expect(startTier({ coarse: false, gpu: 'Apple M2' })).toBe(2);
    expect(startTier({ coarse: true })).toBe(1);
    expect(startTier({ coarse: false, hardwareConcurrency: 2 })).toBe(1);
    expect(startTier({ coarse: false, deviceMemory: 2 })).toBe(1);
    expect(startTier({ coarse: false, connection: { effectiveType: '3g' } })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (Intel, Intel(R) HD Graphics 4000, OpenGL 4.1)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' }), 'a real Radeon card').toBe(2);
  });

  it('a starved line or a software renderer opens LITE; a fast line never promotes', () => {
    expect(startTier({ coarse: false, connection: { saveData: true } })).toBe(0);
    expect(startTier({ coarse: false, connection: { effectiveType: '2g' } })).toBe(0);
    expect(startTier({ coarse: true, connection: { effectiveType: 'slow-2g' } })).toBe(0);
    expect(startTier({ coarse: false, gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)' })).toBe(0);
    expect(startTier({ coarse: false, gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).toBe(0);
    expect(startTier({ coarse: false, gpu: 'Microsoft Basic Render Driver' })).toBe(0);
    expect(startTier({ coarse: false, connection: { effectiveType: '4g' } })).toBe(2);
  });

  it('the address can pin a tier: ?gfx=lite|balanced|full (or 0|1|2); anything else pins nothing', () => {
    expect(pinnedTier('?gfx=lite')).toBe(0);
    expect(pinnedTier('?ch=machine&gfx=balanced')).toBe(1);
    expect(pinnedTier('?gfx=full')).toBe(2);
    expect(pinnedTier('?gfx=2')).toBe(2);
    expect(pinnedTier('?gfx=ultra')).toBeNull();
    expect(pinnedTier('?p=katara')).toBeNull();
    expect(pinnedTier('')).toBeNull();
  });
});

describe("the window's verdict: the display's own interval is the yardstick, capped at 60 Hz", () => {
  it('a clean 60 Hz window is fast; a clean 120 Hz window is fast; 120 Hz holding 60 is fast too', () => {
    expect(judge(frames(60, 16.7))).toMatchObject({ slow: false, fast: true });
    expect(judge(frames(60, 8.33))).toMatchObject({ slow: false, fast: true });
    expect(judge(frames(60, 8.33)).refresh).toBeCloseTo(8.33, 2);
    expect(judge(frames(60, 16.7)).refresh).toBeCloseTo(16.7, 1);
  });

  it('every other frame doubled is slow; a steady 30 fps on a 60 Hz display is slow, not "a 30 Hz display"', () => {
    const v = judge(frames(60, [16.7, 33.3]));
    expect(v.slow).toBe(true);
    expect(v.mean).toBeCloseTo(25, 0);
    const s = judge(frames(60, 33.3));
    expect(s.refresh).toBeCloseTo(1000 / 60, 1);
    expect(s.slow).toBe(true);
  });

  it('a frame dropped now and then is neither slow nor fast: the governor holds', () => {
    const v = judge(frames(60, [16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 33.3]));
    expect(v.slow).toBe(false);
    expect(v.fast).toBe(false);
    expect(v.long).toBeCloseTo(1 / 12, 2);
  });

  it('too few frames say nothing', () => {
    expect(judge(frames(5, 40))).toMatchObject({ slow: false, fast: false });
  });

  it('the lines', () => {
    expect([WINDOW, LONG_FRAME, SLOW_MEAN, LONG_SHARE_SLOW, FAST_MEAN, LONG_SHARE_FAST]).toEqual([60, 1.6, 1.4, 0.25, 1.1, 0.05]);
    expect([HOLD_MS, REOPEN_MS, UP_AFTER_MS, DAY_MS]).toEqual([2500, 60000, 12000, 86400000]);
  });
});

describe('steering: down on slow, a ceiling that reopens once, up on fast', () => {
  const SLOW = judge(frames(60, [16.7, 33.3]));
  const FAST = judge(frames(60, 16.7));
  const HOLD = judge(frames(60, [16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 16.7, 33.3]));

  it('the first seconds hold; then slow frames step down, with a cooldown, and close the tier left', () => {
    const g = newGovernor(2, 2, 0);
    expect(steer(g, SLOW, 1000)).toBeNull();
    expect(steer(g, SLOW, 2500)).toBe('down');
    expect(g.tier).toBe(1);
    expect(g.ceiling).toBe(1);
    expect(steer(g, SLOW, 4000), 'the cooldown').toBeNull();
    expect(steer(g, SLOW, 5500)).toBe('down');
    expect(g.tier).toBe(0);
    expect(steer(g, SLOW, 9000), 'nothing below LITE').toBeNull();
    expect(g.tier).toBe(0);
  });

  it('fast frames step up, twelve seconds after the last step down, never past the ceiling', () => {
    const g = newGovernor(1, 2, 0);
    expect(steer(g, FAST, 3000), 'too soon after the start').toBeNull();
    expect(steer(g, FAST, 12000)).toBe('up');
    expect(g.tier).toBe(2);
    expect(steer(g, FAST, 20000), 'the ceiling').toBeNull();
    const h = newGovernor(2, 2, 0);
    steer(h, SLOW, 2500); // to 1, ceiling 1
    expect(steer(h, FAST, 6000), 'cooling').toBeNull();
    expect(steer(h, FAST, 14000), 'twelve seconds since the step down have not passed').toBeNull();
    expect(steer(h, FAST, 14600), 'the ceiling is closed').toBeNull();
    expect(h.tier).toBe(1);
  });

  it('a closed ceiling reopens one step sixty seconds later — once; a tier left twice stays closed for the session', () => {
    const g = newGovernor(2, 2, 0);
    steer(g, SLOW, 2500); // 2 → 1
    expect(g.ceiling).toBe(1);
    expect(steer(g, HOLD, 63000), 'the reopen is a bookkeeping step, not a move').toBeNull();
    expect(g.ceiling).toBe(2);
    expect(steer(g, FAST, 65000)).toBe('up');
    expect(g.tier).toBe(2);
    expect(steer(g, SLOW, 70000)).toBe('down'); // left FULL a second time
    expect(g.ceiling).toBe(1);
    steer(g, HOLD, 140000);
    expect(g.ceiling, 'closed for good').toBe(1);
    expect(steer(g, FAST, 150000)).toBeNull();
    expect(g.downs[2]).toBe(2);
  });

  it('holding frames move nothing', () => {
    const g = newGovernor(2, 2, 0);
    for (let t = 3000; t < 60000; t += 1000) expect(steer(g, HOLD, t)).toBeNull();
    expect(g.tier).toBe(2);
  });
});

describe('the verdict travels: the session carries the state, the day carries the opening tier', () => {
  it('a fresh visit opens at the device tier with the ceiling FULL', () => {
    expect(restoreState(store(), store(), 1000, 1)).toEqual({ tier: 1, ceiling: 2, downs: [0, 0, 0] });
  });

  it('the session record wins and restores the ceiling and the downs; the day record only sets the opening tier', () => {
    const s = store({ 'rvl-gfx-session': JSON.stringify({ tier: 0, ceiling: 1, downs: [0, 1, 2] }) });
    expect(restoreState(s, store(), 1000, 2)).toEqual({ tier: 0, ceiling: 1, downs: [0, 1, 2] });
    const l = store({ 'rvl-gfx': JSON.stringify({ tier: 0, at: 1000 }) });
    expect(restoreState(store(), l, 1000 + DAY_MS - 1, 2)).toEqual({ tier: 0, ceiling: 2, downs: [0, 0, 0] });
    expect(restoreState(store(), l, 1000 + DAY_MS + 1, 2), 'a day later it is forgotten').toEqual({ tier: 2, ceiling: 2, downs: [0, 0, 0] });
  });

  it('garbage and throwing storages read as a fresh visit; saving into a throwing storage is quiet', () => {
    expect(restoreState(store({ 'rvl-gfx-session': '{oops' }), store({ 'rvl-gfx': 'no' }), 0, 2)).toEqual({ tier: 2, ceiling: 2, downs: [0, 0, 0] });
    expect(restoreState(store({ 'rvl-gfx-session': JSON.stringify({ tier: 7, ceiling: -1, downs: 'x' }) }), null, 0, 2)).toEqual({ tier: 2, ceiling: 2, downs: [0, 0, 0] });
    expect(restoreState(broken, broken, 0, 1)).toEqual({ tier: 1, ceiling: 2, downs: [0, 0, 0] });
    const g: Governor = newGovernor(1, 1, 0);
    expect(() => saveState(broken, broken, g, 5)).not.toThrow();
  });

  it('saving writes both records, and a later restore reads them back', () => {
    const s = store(), l = store();
    const g = newGovernor(2, 2, 0);
    steer(g, judge(frames(60, [16.7, 33.3])), 2500);
    saveState(s, l, g, 9000);
    expect(JSON.parse(s.m.get('rvl-gfx-session')!)).toEqual({ tier: 1, ceiling: 1, downs: [0, 0, 1] });
    expect(JSON.parse(l.m.get('rvl-gfx')!)).toEqual({ tier: 1, at: 9000 });
    expect(restoreState(s, l, 9000, 2)).toEqual({ tier: 1, ceiling: 1, downs: [0, 0, 1] });
  });
});

const TIERS: Tier[] = [2, 1, 0];

describe('the knobs by tier', () => {
  it('live loops: 10 · 6 · 3 on a desktop, 4 · 3 · 2 on a phone', () => {
    expect(TIERS.map((t) => videoCapFor(t, false))).toEqual([10, 6, 3]);
    expect(TIERS.map((t) => videoCapFor(t, true))).toEqual([4, 3, 2]);
  });

  it('the canvas resolution: FULL as today (DPR ≤ 2, a phone ≤ 1.5), BALANCED ≤ 1.5 (a phone 1), LITE 1', () => {
    expect(resolutionFor(2, 3, false)).toBe(2);
    expect(resolutionFor(2, 1.25, false)).toBe(1.25);
    expect(resolutionFor(2, 3, true)).toBe(1.5);
    expect(resolutionFor(1, 2, false)).toBe(1.5);
    expect(resolutionFor(1, 1.25, false)).toBe(1.25);
    expect(resolutionFor(1, 3, true)).toBe(1);
    expect(resolutionFor(0, 2, false)).toBe(1);
    expect(resolutionFor(0, 3, true)).toBe(1);
    expect(resolutionFor(2, 0, false), 'a missing ratio reads as 1').toBe(1);
  });

  it("the ticker: the display's rate, then 60, then 30; the grain: 90 ms, 180 ms, hidden", () => {
    expect(TIERS.map(maxFpsFor)).toEqual([0, 60, 30]);
    expect(TIERS.map(grainIntervalFor)).toEqual([90, 180, 0]);
  });
});

describe('the governor is wired (pins)', () => {
  const pins: Array<[string, string]> = [
    ['src/shell/shell.ts', 'quality.start('],
    ['src/shell/shell.ts', 'mountAtmosphere()'],
    ['src/lib/env.ts', 'videoCapFor(quality.tier(), isMobile())'],
    ['src/lib/env.ts', 'resolutionFor(quality.tier(), window.devicePixelRatio || 1, isMobile())'],
    ['src/shell/grain.ts', 'grainIntervalFor('],
    ['src/shell/grain.ts', 'quality.on('],
    ['src/home/hero.ts', 'quality.on('],
    ['src/home/hero.ts', 'maxFpsFor('],
    ['src/works/world.ts', 'quality.on('],
    ['src/works/world.ts', 'maxFpsFor('],
    ['src/works/world.ts', 'quality.tier() > 0 ? [this.desat] : []'],
    ['src/works/tile.ts', 'quality.tier() > 0'],
    ['src/works/playback.ts', 'get cap()'],
    ['src/about/city3d.ts', 'quality.tier()'],
    ['src/pages/story.ts', 'govern: false'],
    ['src/shell/page.ts', 'mountShell(site, active, opts)'],
    ['src/styles/components.css', '.rvl-lite #grain { display: none; }'],
    ['src/styles/components.css', '.rvl-lite .scan-sweep'],
    ['src/styles/project.css', '.rvl-lite'],
    ['src/styles/about.css', '.rvl-lite'],
  ];
  for (const [file, needle] of pins) {
    it(`${file} carries ${needle}`, () => {
      expect(readFileSync(file, 'utf8')).toContain(needle);
    });
  }

  it('the two device caps no longer know only "phone or not"', () => {
    const env = readFileSync('src/lib/env.ts', 'utf8');
    expect(env).not.toContain('isMobile() ? 4 : 10');
    expect(env).not.toContain('isMobile() ? 1.5 : 2');
  });

  it('the story page keeps its own governor: the shell samples nothing there', () => {
    expect(readFileSync('src/pages/story.ts', 'utf8')).toMatch(/startPage\(\s*'story'[\s\S]*\{ govern: false \}/);
  });
});
