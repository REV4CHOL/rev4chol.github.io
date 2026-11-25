import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The owner, 2026-11-24, of the homepage on an iPad (13-inch, 1,366 wide): "All the text titles and subtitles are too
// damn big. it need to be much smaller". Shown the poster on that screen as it stood and at 75%, 60% and 50%, they
// chose "B: 60%". So a touch screen wider than the phone block's draws the statement at 0.6 of its fluid size; a fine
// pointer (a PC) and the phone keep theirs.
const css = readFileSync('src/styles/components.css', 'utf8').replace(/\r\n/g, '\n');
const HEAD = '@media (min-width: 641px) and (pointer: coarse) {';
const block = (() => {
  const i = css.indexOf(HEAD);
  return i < 0 ? '' : css.slice(i, css.indexOf('\n}\n', i) + 2);
})();
/** A fluid size as the stylesheet clamps it: `per` px per 1% of the screen's width, between `min` and `max`. */
const fluid = (min: number, per: number, max: number, w: number) => Math.min(max, Math.max(min, (per * w) / 100));

describe("a tablet's poster: the homepage's statement at 60% of its size (owner)", () => {
  it('one block, for a touch screen wider than the phone block, carries the one factor', () => {
    expect(css.split(HEAD).length - 1).toBe(1);
    expect(block).toContain('.home-statement { --tab-k: 0.6; }');
  });

  it("the headline, the second row's inset, the plate and the & ride that factor on their own fluid sizes", () => {
    expect(block).toContain('.st-clash { font-size: max(4rem, calc(clamp(4rem, calc(12.5 * var(--zw)), 10.5rem) * var(--tab-k))); }');
    expect(block).toContain('.st-row-2 { margin-left: calc(clamp(56px, calc(11 * var(--zw)), 210px) * var(--tab-k)); }');
    expect(block).toContain('.st-plate { font-size: max(1.1rem, calc(clamp(1.1rem, calc(2.6 * var(--zw)), 2rem) * var(--tab-k)));');
    expect(block).toContain('.amp-bg { font-size: calc(clamp(16rem, calc(38 * var(--zw)), 30rem) * var(--tab-k)); }');
    expect(block).toContain('.home-data { font-size: 12px; }');
  });

  it('what the owner chose from, on a 1,366 screen: the headline 100.8 px (was 168), the plate 19.2 (was 32), the roles line 12 (was 13)', () => {
    expect(fluid(64, 12.5, 168, 1366)).toBe(168);
    expect(Math.max(64, fluid(64, 12.5, 168, 1366) * 0.6)).toBeCloseTo(100.8, 5);
    expect(fluid(17.6, 2.6, 32, 1366)).toBe(32);
    expect(Math.max(17.6, fluid(17.6, 2.6, 32, 1366) * 0.6)).toBeCloseTo(19.2, 5);
  });

  it("never under a phone's own: a small tablet's headline stays 4rem, its plate 1.1rem", () => {
    // (at 800 wide 60% of the fluid 100 px is 60: under the 64 a phone drew that day; the floor holds it)
    expect(Math.max(64, fluid(64, 12.5, 168, 800) * 0.6)).toBe(64);
    expect(Math.max(17.6, fluid(17.6, 2.6, 32, 800) * 0.6)).toBe(17.6);
    expect(block).toMatch(/\.st-clash \{ font-size: max\(4rem,/);
    expect(block).toMatch(/\.st-plate \{ font-size: max\(1\.1rem,/);
  });

  it("a PC's rules and the phone block stand as they were", () => {
    expect(css).toContain('font-size: clamp(4rem, calc(12.5 * var(--zw)), 10.5rem); line-height: 0.84;');
    expect(css).toContain('font-size: clamp(1.1rem, calc(2.6 * var(--zw)), 2rem); letter-spacing: 0.08em;');
    // (the phone's own factor came a day later: tests/phone-round.test.ts)
    expect(css).toContain('  .st-clash { font-size: calc(clamp(2.8rem, 16.5vw, 4rem) * var(--ph-k)); }');
    // (the tablet block comes after the rules it adjusts and after the phone block: equal specificity, later wins)
    expect(css.indexOf(HEAD)).toBeGreaterThan(css.indexOf('  .st-clash { font-size: calc(clamp(2.8rem, 16.5vw, 4rem) * var(--ph-k)); }'));
    expect(css.indexOf(HEAD)).toBeLessThan(css.lastIndexOf('body { visibility: visible; }'));
  });
});
