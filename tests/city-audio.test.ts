import { describe, expect, it } from 'vitest';
import { BEDS, mixFor, seamless } from '../src/about/city-audio';

const still = { speed: 0, dStadium: 400, dMarket: 400, fireworks: 0, dFireworks: 400 };

describe('The city\'s sound', () => {
  it('modulates every bed by a fraction of its level, never by more than the level itself', () => {
    // the tremolo is MULTIPLIED into the bed (owner: the mix was a jumble — LFOs added to the gain with
    // depths far above the levels played every "silent" bed at full chop); a depth is a fraction, under 1
    expect(BEDS.length).toBeGreaterThanOrEqual(6);
    for (const b of BEDS) {
      expect(b.tremolo[0]).toBeGreaterThan(0);
      expect(b.tremolo[1]).toBeGreaterThan(0);
      expect(b.tremolo[1]).toBeLessThan(0.7);
    }
  });

  it('mixes for the camera: the streets roar, the heights blow, the stadium and the market only nearby', () => {
    const street = mixFor({ y: 3, ...still });
    const heights = mixFor({ y: 150, ...still, speed: 1.2 });
    const stadium = mixFor({ y: 8, ...still, dStadium: 0 });
    const market = mixFor({ y: 3, ...still, dMarket: 0 });
    for (const m of [street, heights, stadium, market]) for (const v of Object.values(m)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(0.3); }
    expect(street.traffic).toBeGreaterThan(street.wind);
    expect(street.traffic).toBeGreaterThan(heights.traffic * 2);
    expect(heights.wind).toBeGreaterThan(street.wind * 3);
    expect(street.neon).toBeGreaterThan(0); expect(heights.neon).toBe(0);
    expect(street.crowd).toBeLessThan(0.002); expect(street.market).toBeLessThan(0.001); // far from both: as good as silent
    expect(stadium.crowd).toBeGreaterThan(0.2); expect(stadium.crowd).toBeGreaterThan(stadium.traffic);
    expect(market.market).toBeGreaterThan(0.05);
    // headroom: the whole bed mix never sums past the bus's comfort
    for (const m of [street, heights, stadium, market]) expect(Object.values(m).reduce((s, v) => s + v, 0)).toBeLessThan(0.6);
  });

  it('makes a noise loop seamless: the head begins as the tail\'s continuation and fades into its own', () => {
    const k = 400, len = 4000;
    const x = new Float32Array(len + k); // k samples more than the loop needs
    let last = 0;
    for (let i = 0; i < x.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; x[i] = last * 3.5; }
    x[len - 1] = 0.8; x[len] = 0.79; x[0] = -0.8; // the naive loop would jump 1.6 at its seam
    const o = seamless(x, k);
    expect(o.length).toBe(len);
    expect(Math.abs(o[len - 1] - o[0])).toBeLessThan(0.05); // the loop point joins: the tail runs on into the head
    expect(Array.from(o.slice(k))).toEqual(Array.from(x.slice(k, len))); // the body is untouched
    expect(Math.abs(o[k - 1] - x[k - 1])).toBeLessThan(0.02); // by the end of the fade the head is its own again
  });
});
