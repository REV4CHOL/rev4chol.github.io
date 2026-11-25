import { describe, expect, it } from 'vitest';
import { THREAD_INK, planBand, planSide, type Pic } from '../src/project/thread-plan';
import { threadSvg } from '../src/project/thread-draw';

const film = { name: 'Philia', year: 2026, place: 'P·14/20' };
const pics: Pic[] = ['01', '09', '18', '26', '35', '43'].map((code) => ({ code, w: 192, h: 102 }));
const href = (code: string) => `/content/projects/philia/thread/${code}.jpg`;
const ACC = '#8FCC6B';
const opacities = (svg: string) => [...svg.matchAll(/opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
const allowed = new Set<number>([...Object.values(THREAD_INK)].flat() as number[]);

describe('the thread as markup', () => {
  const side = { x: 1267, y: 120, w: 417, h: 795 };
  const band = planBand({ w: 1684, rail: 164, side, pics, film });
  const sideRun = planSide({ side, exit: band.exit!, player: { x: 0, y: 176, w: 1243, h: 739 }, pics: pics.slice(4), film });
  const alone = planBand({ w: 1130, rail: 164, side: null, pics, film });
  const phone = planBand({ w: 394, rail: 0, side: null, pics, film });
  const all = [band, sideRun, alone, phone].map((p) => threadSvg(p, { accent: ACC, href }));

  it('an svg in the plan\'s own box, hidden from a screen reader, taking no focus', () => {
    const svg = threadSvg(band, { accent: ACC, href });
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('viewBox="-164 0 1848 120"');
    expect(svg).toContain('width="1848" height="120"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
  });

  it('every opacity comes from the ink table: nothing brighter can be drawn', () => {
    for (const svg of all) {
      expect(opacities(svg).length).toBeGreaterThan(5);
      for (const o of opacities(svg)) expect(allowed.has(o), String(o)).toBe(true);
    }
  });

  it('no filter, no mask, no animation, no style block, no script', () => {
    for (const svg of all) expect(svg).not.toMatch(/filter|<mask|<animate|<style|<script|transition|href="javascript/i);
  });

  it("the film's accent stands on the gate's hairline and the take-up reel's dot, nowhere else", () => {
    const count = (svg: string) => svg.split(ACC).length - 1;
    expect(count(threadSvg(band, { accent: ACC, href }))).toBe(0); // (the gate and the reel are beside the player)
    expect(count(threadSvg(sideRun, { accent: ACC, href }))).toBe(2);
    expect(count(threadSvg(alone, { accent: ACC, href }))).toBe(2);
    expect(count(threadSvg(phone, { accent: ACC, href }))).toBe(1); // (a phone has no reel)
  });

  it('a frame is its picture over black, dimmed by opacity, in a hairline, with its code', () => {
    const svg = threadSvg(alone, { accent: ACC, href });
    expect(svg.split('<image ').length - 1).toBe(5);
    expect(svg).toContain(`href="/content/projects/philia/thread/01.jpg"`);
    expect(svg).toMatch(new RegExp(`<image [^>]*opacity="${THREAD_INK.still}"`));
    expect(svg).toContain('>01</text>');
    expect(svg).toContain('preserveAspectRatio="none"');
  });

  it('a picture the page cannot name is not drawn: no empty frame stands', () => {
    const svg = threadSvg(alone, { accent: ACC, href: (c) => (c === '09' ? null : href(c)) });
    expect(svg.split('<image ').length - 1).toBe(4);
    expect(svg).not.toContain('>09</text>');
  });

  it('words are escaped', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics, film: { ...film, name: 'Soft Hours & Lonely Lands' } });
    expect(threadSvg(p, { accent: ACC, href })).toContain('SOFT HOURS &amp; LONELY');
  });
});
