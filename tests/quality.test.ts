import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DAY_MS, FAST_MEAN, HOLD_MS, LONG_FRAME, LONG_SHARE_FAST, LONG_SHARE_SLOW, REOPEN_MS, SLOW_MEAN, UP_AFTER_MS, WINDOW,
  dataSaver, floorMode, grainIntervalFor, hardwareCeiling, judge, maxFpsFor, modeAfterTierChange, newGovernor, openAt,
  ownLoopCap, pinnedTier, resolutionFor, restoreState, saveState, startTier, steer, videoCapFor, weakBy,
  type FloorFacts, type FloorMode, type Governor, type KeyStore, type Tier,
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
  it('a desktop opens FULL; a phone, a small device or an integrated GPU open BALANCED at most', () => {
    expect(startTier({ coarse: false })).toBe(2);
    expect(startTier({ coarse: false, hardwareConcurrency: 16, deviceMemory: 8, gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(2);
    expect(startTier({ coarse: false, gpu: 'Apple M2' })).toBe(2);
    expect(startTier({ coarse: true })).toBe(1);
    expect(startTier({ coarse: false, hardwareConcurrency: 2 })).toBe(1);
    expect(startTier({ coarse: false, deviceMemory: 2 })).toBe(1);
    // a line's speed never moves the tier: Chrome's estimate read "3g" on the owner's own PC against the live site
    expect(startTier({ coarse: false, connection: { effectiveType: '3g' } })).toBe(2);
    expect(startTier({ coarse: false, gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (Intel, Intel(R) HD Graphics 4000, OpenGL 4.1)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' })).toBe(1);
    expect(startTier({ coarse: false, gpu: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' }), 'a real Radeon card').toBe(2);
  });

  it('saveData, a 2g line or a software renderer opens LITE; a fast line never promotes', () => {
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
  // (owner 2026-11-08: "I want almost all panes to load at once. Only panes at the far end not loaded until I drag the
  //  view over them": a desktop's FULL and BALANCED play a whole chapter, the window rule leaves the far ones; 12 while
  //  CH·01 held 12, 14 since THE LOVERS and XIÊU LÒNG joined it, 2026-11-24)
  it('live loops: 14 · 14 · 3 on a desktop (a whole chapter), 4 · 3 · 2 on a tablet or a narrow window', () => {
    expect(TIERS.map((t) => videoCapFor(t, false))).toEqual([14, 14, 3]);
    expect(TIERS.map((t) => videoCapFor(t, true))).toEqual([4, 3, 2]);
  });

  it("a desktop's FULL and BALANCED cap holds the largest chapter whole: it grows when a chapter does", () => {
    const films = JSON.parse(readFileSync('public/content/projects.json', 'utf8')) as { category?: string }[];
    const largest = Math.max(...['human', 'machine'].map((c) => films.filter((f) => (f.category ?? 'human') === c).length));
    for (const t of [2, 1] as const) expect(videoCapFor(t, false)).toBeGreaterThanOrEqual(largest);
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

// THE WEAK CLASS AND THE FLOOR'S VIDEO (owner 2026-11-24: "the wall for weak machines only … 8 GB or less"; the first
// approval: a 4 GB, four-thread laptop "never pushed up to the heavy level"). Spec 2026-11-24-work-wall-video-design,
// §4.1 and §4.6.
describe('the weak class and the hardware ceiling', () => {
  it('8 GB or less, 4 threads or fewer, or a coarse pointer is weak; a value not reported makes nothing weak', () => {
    expect(weakBy({ coarse: false, deviceMemory: 8, hardwareConcurrency: 8 })).toBe('memory');
    expect(weakBy({ coarse: false, deviceMemory: 4, hardwareConcurrency: 16 })).toBe('memory');
    expect(weakBy({ coarse: false, deviceMemory: 16, hardwareConcurrency: 8 })).toBeNull();
    expect(weakBy({ coarse: false, hardwareConcurrency: 8 }), 'Firefox and Safari report no memory').toBeNull();
    expect(weakBy({ coarse: false, deviceMemory: 16, hardwareConcurrency: 4 })).toBe('threads');
    expect(weakBy({ coarse: false, hardwareConcurrency: 4 })).toBe('threads');
    expect(weakBy({ coarse: false })).toBeNull();
    expect(weakBy({ coarse: true })).toBe('pointer');
    expect(weakBy({ coarse: true, deviceMemory: 16, hardwareConcurrency: 8 })).toBe('pointer');
  });

  it('4 GB or less, or 4 threads or fewer, opens BALANCED and may never reach FULL', () => {
    for (const dev of [
      { coarse: false, deviceMemory: 4, hardwareConcurrency: 8 },
      { coarse: false, deviceMemory: 16, hardwareConcurrency: 4 },
      { coarse: false, deviceMemory: 4, hardwareConcurrency: 4 }, // the laptop profile, which `< 4` let open at FULL
      { coarse: false, deviceMemory: 2 },
      { coarse: false, hardwareConcurrency: 2 },
    ]) {
      expect(startTier(dev), JSON.stringify(dev)).toBe(1);
      expect(hardwareCeiling(dev), JSON.stringify(dev)).toBe(1);
    }
  });

  it('8 GB with 8 threads is weak for the floor, opens as before and keeps a FULL ceiling', () => {
    const dev = { coarse: false, deviceMemory: 8, hardwareConcurrency: 8 };
    expect(weakBy(dev)).toBe('memory');
    expect(startTier(dev)).toBe(2);
    expect(hardwareCeiling(dev)).toBe(2);
    expect(hardwareCeiling({ coarse: true }), 'a phone or a tablet may still climb').toBe(2);
    expect(hardwareCeiling({ coarse: false }), 'nothing reported').toBe(2);
  });

  it('a page opens no higher than the hardware ceiling, whatever an earlier visit remembered; the pin wins', () => {
    expect(openAt({ tier: 2, ceiling: 2, downs: [0, 0, 0] }, 1, null)).toEqual({ tier: 1, ceiling: 1 });
    expect(openAt({ tier: 0, ceiling: 1, downs: [0, 1, 1] }, 1, null)).toEqual({ tier: 0, ceiling: 1 });
    expect(openAt({ tier: 1, ceiling: 2, downs: [0, 0, 0] }, 2, null)).toEqual({ tier: 1, ceiling: 2 });
    expect(openAt({ tier: 0, ceiling: 0, downs: [0, 1, 1] }, 1, 2), '?gfx=full on any machine').toEqual({ tier: 2, ceiling: 2 });
    expect(openAt({ tier: 2, ceiling: 2, downs: [0, 0, 0] }, 2, 0)).toEqual({ tier: 0, ceiling: 0 });
  });

  it('a governor opened at the hardware ceiling never climbs past it, through a step down and its reopening too', () => {
    const SLOW = judge(frames(60, [16.7, 33.3]));
    const FAST = judge(frames(60, 16.7));
    const g = newGovernor(1, 1, 0);
    for (let t = 3000; t < 30000; t += 1000) steer(g, FAST, t);
    expect(g.tier).toBe(1);
    steer(g, SLOW, 30000); // BALANCED → LITE: the ceiling closes on LITE
    expect([g.tier, g.ceiling]).toEqual([0, 0]);
    for (let t = 34000; t < 200000; t += 1000) steer(g, FAST, t); // it reopens once, a minute later, and climbs back
    expect([g.tier, g.ceiling]).toEqual([1, 1]);
  });

  it('Save-Data or a 2g line: the visitor asked for less data, or nothing streams', () => {
    expect(dataSaver({ coarse: false, connection: { saveData: true } })).toBe(true);
    expect(dataSaver({ coarse: false, connection: { effectiveType: '2g' } })).toBe(true);
    expect(dataSaver({ coarse: true, connection: { effectiveType: 'slow-2g' } })).toBe(true);
    expect(dataSaver({ coarse: false, connection: { effectiveType: '3g' } })).toBe(false);
    expect(dataSaver({ coarse: false })).toBe(false);
  });
});

/** The floor's facts for a machine that is not weak, at FULL, with both wall files there and nothing remembered. */
const facts = (over: Partial<FloorFacts> = {}): FloorFacts => ({
  tier: 2, weak: false, pinned: null, dataSaver: false, wall: true, small: true,
  loopsFailed: false, contextLost: false, verdict: 'ok', ...over,
});

describe("the floor's mode: the class and the tier choose the video", () => {
  it('step 1: a weak machine plays the wall at every tier; any other its own loops at FULL and BALANCED, the wall at LITE', () => {
    for (const tier of TIERS) expect(floorMode(facts({ tier, weak: true })), `weak, tier ${tier}`).toBe('wall');
    expect(TIERS.map((tier) => floorMode(facts({ tier })))).toEqual(['own', 'own', 'wall']);
  });

  it('the pin: FULL sets the class aside; BALANCED and LITE keep it', () => {
    expect(floorMode(facts({ tier: 2, pinned: 2, weak: true }))).toBe('own');
    expect(floorMode(facts({ tier: 1, pinned: 1, weak: true }))).toBe('wall');
    expect(floorMode(facts({ tier: 1, pinned: 1 }))).toBe('own');
    expect(floorMode(facts({ tier: 0, pinned: 0 }))).toBe('wall');
  });

  it('step 2 (ship B hands these in): own loops that failed their watch, or a context lost in the visit, give the wall', () => {
    expect(floorMode(facts({ loopsFailed: true }))).toBe('wall');
    expect(floorMode(facts({ contextLost: true }))).toBe('wall');
    expect(floorMode(facts({ loopsFailed: true, wall: false })), 'no wall can play').toBe('posters');
    expect(floorMode(facts({ contextLost: true, dataSaver: true }))).toBe('posters');
  });

  it('step 3: a wall that is due and cannot play gives posters: no file, Save-Data, a 2g line', () => {
    expect(floorMode(facts({ weak: true, wall: false }))).toBe('posters');
    expect(floorMode(facts({ weak: true, dataSaver: true }))).toBe('posters');
    expect(floorMode(facts({ tier: 0, dataSaver: true })), "exactly today's LITE").toBe('posters');
    expect(floorMode(facts({ wall: false })), 'own loops need no wall').toBe('own');
  });

  it("step 4: a wall that plays follows its own watch; with no half-size file, posters stand in for it", () => {
    expect(floorMode(facts({ weak: true, verdict: 'small' }))).toBe('wall-small');
    expect(floorMode(facts({ weak: true, verdict: 'small', small: false }))).toBe('posters');
    expect(floorMode(facts({ weak: true, verdict: 'starved' }))).toBe('starved');
    expect(floorMode(facts({ weak: true, verdict: 'starved', small: false }))).toBe('starved');
    expect(floorMode(facts({ verdict: 'starved' })), "the verdict is the wall's: own loops are untouched").toBe('own');
  });

  it('a pinned page obeys neither watch and ignores what an earlier visit remembered', () => {
    expect(floorMode(facts({ tier: 2, pinned: 2, loopsFailed: true, contextLost: true }))).toBe('own');
    expect(floorMode(facts({ tier: 1, pinned: 1, weak: true, verdict: 'starved' }))).toBe('wall');
    expect(floorMode(facts({ tier: 0, pinned: 0, verdict: 'small' }))).toBe('wall');
    expect(floorMode(facts({ tier: 0, pinned: 0, wall: false })), 'step 3 stands').toBe('posters');
    expect(floorMode(facts({ tier: 0, pinned: 0, dataSaver: true })), 'step 3 stands').toBe('posters');
  });

  it('a step up changes no video until the floor is next built; a step down switches at once', () => {
    expect(modeAfterTierChange('wall', 0, 1, facts({ tier: 1 })), 'LITE → BALANCED: the wall stays').toBe('wall');
    expect(modeAfterTierChange('own', 1, 0, facts({ tier: 0 })), 'BALANCED → LITE, not weak').toBe('wall');
    expect(modeAfterTierChange('wall', 1, 0, facts({ tier: 0, weak: true })), 'BALANCED → LITE, weak').toBe('wall');
    expect(modeAfterTierChange('own', 2, 1, facts({ tier: 1 })), 'FULL → BALANCED, not weak').toBe('own');
  });

  it('how many panes may decode their own loop: every cell of the table', () => {
    const MODES: FloorMode[] = ['own', 'wall', 'wall-small', 'posters', 'starved'];
    // `own` takes videoCapFor as it stands (a whole chapter on a desktop, whatever that number is: this test never
    // writes it); beside a wall and in `posters`, the smaller of it and 3; `starved`, the pointed pane alone
    for (const narrow of [false, true]) {
      const own = TIERS.map((t) => videoCapFor(t, narrow));
      const beside = own.map((c) => Math.min(c, 3));
      const where = narrow ? 'a tablet, or a window under 820 px' : 'a desktop or a laptop';
      expect(MODES.map((m) => TIERS.map((t) => ownLoopCap(m, t, narrow))), where).toEqual([own, beside, beside, beside, [1, 1, 1]]);
    }
    // no machine decodes more than three loops beside a wall, and a floor of own loops keeps its whole chapter
    expect(ownLoopCap('wall', 2, false)).toBe(3);
    expect(ownLoopCap('own', 2, false)).toBe(videoCapFor(2, false));
    expect(ownLoopCap('own', 2, false)).toBeGreaterThan(3);
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
