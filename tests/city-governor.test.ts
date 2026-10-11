import { describe, expect, it } from 'vitest';
import { BUSY, FAST, frameSize, newGovernor, PHONE, SLOW, startTier, steer, TIERS } from '../src/about/city-governor';

describe("The governor (owner: other people's PCs stutter; the phone lags)", () => {
  it('opens at high on a desktop, mid on a phone or a small device, low on a starved connection — a fast connection never promotes', () => {
    expect(startTier({}, false)).toBe(2);
    expect(startTier({ connection: { downlink: 50, effectiveType: '4g' } }, false)).toBe(2);
    expect(startTier({}, true)).toBe(1);
    expect(startTier({ hardwareConcurrency: 2 }, false)).toBe(1);
    expect(startTier({ deviceMemory: 2 }, false)).toBe(1);
    expect(startTier({ connection: { effectiveType: '3g' } }, false)).toBe(1);
    expect(startTier({ connection: { saveData: true } }, false)).toBe(0);
    expect(startTier({ connection: { effectiveType: '2g' } }, true)).toBe(0);
  });
  it('the tiers: lights and the far rings grow with the tier; a phone takes 20 and 40', () => {
    expect(TIERS.map((t) => t.label)).toEqual(['low', 'mid', 'high', 'ultra']);
    expect(TIERS.map((t) => t.lights)).toEqual([0, 8, 14, 18]);
    expect(TIERS.map((t) => t.lod)).toEqual([[24, 40], [24, 40], [12, 24], [12, 24]]);
    expect(TIERS.map((t) => t.pix)).toEqual([3, 2, 1, 1]);
    expect(TIERS.map((t) => t.shadows)).toEqual([false, false, true, true]);
    expect(PHONE.lod).toEqual([20, 40]); expect(PHONE.lights).toEqual([0, 4]); expect(PHONE.floor).toBe(0.6);
  });
  it('long frames shrink the scale by a fifth to the floor, then step the tier down and close it; the first seconds hold', () => {
    const g = newGovernor(2, 0);
    expect(steer(g, 30, 20, 1000)).toBe(null);
    expect(steer(g, 30, 20, 3000)).toBe('scale-down'); expect(g.scale).toBeCloseTo(0.8, 9);
    expect(steer(g, 30, 20, 4000), 'the cooldown').toBe(null);
    expect(steer(g, 30, 20, 5000)).toBe('scale-down'); expect(g.scale).toBeCloseTo(0.64, 9);
    expect(steer(g, 30, 20, 7000)).toBe('scale-down'); expect(g.scale).toBe(0.6);
    expect(steer(g, 30, 20, 9000)).toBe('down'); expect(g.tier).toBe(1); expect(g.scale).toBe(1); expect(g.ceiling).toBe(1);
    expect(steer(g, 30, 20, 12000), 'four seconds after a tier down').toBe(null);
    expect(steer(g, 30, 20, 13000)).toBe('scale-down');
    expect(steer(g, SLOW, 20, 15000), 'at the line it holds').toBe(null);
  });
  it('short frames with headroom, twelve seconds after the last step down, grow the scale back and then the tier — never past the ceiling', () => {
    const g = newGovernor(2, 0);
    steer(g, 30, 20, 3000); steer(g, 30, 20, 5000); steer(g, 30, 20, 7000); steer(g, 30, 20, 9000); // to mid, closed
    expect(g.ceiling).toBe(1);
    expect(steer(g, 16, 5, 15000), 'too soon after the step down').toBe(null);
    expect(steer(g, 16, 5, 21100), 'the scale is whole and the tier at its ceiling').toBe(null);
    expect(steer(g, 30, 20, 21200)).toBe('scale-down');
    expect(steer(g, 16, 5, 23300), 'twelve seconds since the last shrink have not passed').toBe(null);
    expect(steer(g, 16, 5, 33300)).toBe('scale-up'); expect(g.scale).toBeCloseTo(0.92, 9);
    expect(steer(g, 16, 5, 35400)).toBe('scale-up'); expect(g.scale).toBe(1);
    expect(steer(g, 16, 5, 37500), 'the ceiling').toBe(null);
    const h = newGovernor(1, 0);
    expect(steer(h, 16, 5, 13000)).toBe('up'); expect(h.tier).toBe(2);
    expect(steer(h, 16, BUSY, 16000), 'no headroom on the CPU').toBe(null);
    expect(steer(h, FAST, 5, 16000), 'at the line it holds').toBe(null);
    expect(steer(h, 16, 5, 16000)).toBe('up'); expect(h.tier).toBe(3);
  });
  it('a phone keeps its floor and never climbs past mid', () => {
    const g = newGovernor(1, 0, PHONE.floor, 1);
    for (let t = 3000; t < 20000; t += 2100) steer(g, 40, 30, t);
    expect(g.tier).toBe(0); expect(g.scale).toBeGreaterThanOrEqual(0.6);
    const h = newGovernor(1, 0, PHONE.floor, 1);
    expect(steer(h, 8, 3, 13000), 'a 120 Hz phone with headroom').toBe(null); expect(h.tier).toBe(1);
  });
  it('blows the frame up by a whole number of screen pixels, or smooth — never a fraction, nearest-neighbour (owner: the roads flickered across the whole city as the camera moved)', () => {
    // the screen's own pixels at 1:1, at any ratio the scale meets
    expect(frameSize(1440, 900, 1, 1, false)).toEqual({ w: 1440, h: 900, smooth: false });
    expect(frameSize(1536, 864, 1.25, 1.25, false)).toEqual({ w: 1920, h: 1080, smooth: false }); // a 1920 screen at 125 %
    expect(frameSize(1440, 900, 1, 1 / 3, true)).toEqual({ w: 480, h: 300, smooth: false }); // low: three a pixel
    expect(frameSize(1280, 720, 1.5, 0.75, true)).toEqual({ w: 960, h: 540, smooth: false }); // mid at 150 %: two a pixel
    // the governor's fifths: high is smoothed at the asked size; a pixel tier steps to the next whole number up
    expect(frameSize(1440, 900, 1, 0.8, false)).toEqual({ w: 1152, h: 720, smooth: true });
    expect(frameSize(1440, 900, 1, 0.8 / 3, true)).toEqual({ w: 360, h: 225, smooth: false }); // 3.75 → 4
    expect(frameSize(390, 844, 3, 1.25, true)).toEqual({ w: 390, h: 844, smooth: false }); // a phone's 2.4 → 3
    // the rule, everywhere the governor and the screens go
    const scales = [1, 0.8, 0.64, 0.6, 0.92, 0.736];
    for (const ratio of [0.8, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]) for (const pix of [1, 2, 3]) for (const g of scales) {
      const scale = (Math.min(ratio, 2) / pix) * g, look = pix >= 2;
      const f = frameSize(1440, 900, ratio, scale, look);
      if (f.smooth) { expect(look, `smooth only off the pixel look (ratio ${ratio}, pix ${pix}, scale ${g})`).toBe(false); continue; }
      const k = (1440 * ratio) / f.w;
      expect(Math.abs(k - Math.round(k)), `a whole blow-up (ratio ${ratio}, pix ${pix}, scale ${g}): ${k}`).toBeLessThan(0.02 * k);
      expect(f.w, 'never more pixels than the governor allows (a scale within 2 % of whole snaps to it)').toBeLessThanOrEqual(Math.ceil(1440 * scale * 1.025) + 1);
    }
  });
});
