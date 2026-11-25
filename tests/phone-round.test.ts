import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fxOff, hitchLine, reelLine } from '../src/lib/readout';
import { loopsPin, onePlays } from '../src/works/reel';

const read = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const css = read('src/styles/components.css');
const view = read('src/works/reel-view.ts');
const stats = read('src/shell/stats.ts');
const statsCss = read('src/styles/stats.css');

// The owner, 2026-11-25, on a phone: "Remove the camera frame viewfinder in the WORK section scroll".
describe("WORK's phone strip carries no viewfinder (owner)", () => {
  it('a pane is its picture and its words: no corner marks are built or styled', () => {
    expect(view).not.toContain('rl-marks');
    expect(css).not.toContain('rl-marks');
    expect(view).toContain('a.append(pane, cap);');
  });
  it('the rest of the pane stands as it was: the scan lines, the sprockets, the dark the words stand on', () => {
    expect(view).toContain("pane.append(img, el('i', 'rl-scan'));");
    expect(css).toContain('\n.rl-frame::before {');
    expect(css).toMatch(/\n\.rl-pane::after \{[^}]*height: max\(48%, calc\(var\(--reel-foot\) \+ env\(safe-area-inset-bottom\) \+ 226px\)\);/);
  });
});

// The owner, 2026-11-25, of the homepage on a phone: "The titles and sub-titles are way too big. Make them smaller".
// The day before, of the same poster on a tablet, shown 75%, 60% and 50%, they chose 60%: the phone takes that factor.
describe("a phone's poster: the homepage's statement at 60% of its size (owner)", () => {
  const PHONE = '@media (max-width: 640px) and (pointer: coarse) {';
  const at = css.indexOf('  .hk-ticks { display: none; }');
  const block = at < 0 ? '' : css.slice(css.lastIndexOf(PHONE, at), css.indexOf('\n}\n', at) + 2);

  it('the phone block carries the one factor', () => {
    expect(block.startsWith(PHONE)).toBe(true);
    expect(block).toContain('.home-statement { --ph-k: 0.6; }');
  });
  it('the headline, the plate and the & ride it; the gaps close with them', () => {
    expect(block).toContain('.st-clash { font-size: calc(clamp(2.8rem, 16.5vw, 4rem) * var(--ph-k)); }');
    expect(block).toContain('.st-outline { -webkit-text-stroke-width: 1.5px; }');
    expect(block).toContain('.st-plate { font-size: max(12px, calc(1.1rem * var(--ph-k))); padding: 6px 12px 7px 10px; }');
    expect(block).toContain('.amp-bg { right: 0; font-size: calc(10rem * var(--ph-k)); }');
    expect(block).toContain('.st-row { gap: 6px; }');
    expect(block).toContain('.st-row-2 { margin-left: 12px; }');
    expect(block).toContain('.st-row-3 { margin-top: 9px; }');
  });
  it('in numbers, on a 430 px phone: the headline 38.4 px (was 64), the plate 12 (was 17.6), the roles line 11 as before', () => {
    expect(Math.min(64, Math.max(44.8, 0.165 * 430)) * 0.6).toBeCloseTo(38.4, 5);
    expect(Math.max(12, 17.6 * 0.6)).toBe(12);
    expect(css).toContain('  .home-data { font-size: 11px; }');
  });
  it("a tablet's poster and a PC's stand as they were, and a phone on its side keeps its own line", () => {
    expect(css).toContain('.st-clash { font-size: max(4rem, calc(clamp(4rem, calc(12.5 * var(--zw)), 10.5rem) * var(--tab-k))); }');
    expect(css).toContain('font-size: clamp(4rem, calc(12.5 * var(--zw)), 10.5rem); line-height: 0.84;');
    expect(css).toContain('  .st-clash { font-size: 13svh; }');
    // (the sideways block comes after the phone block: on a phone on its side its line wins)
    expect(css.indexOf('  .st-clash { font-size: 13svh; }')).toBeGreaterThan(css.indexOf(block));
  });
});

// The owner, 2026-11-25, on an iPhone: WORK's strip lags, with and without Low Power Mode, "with some videos
// frozen for a time". Nothing here runs Safari, so the phone itself is the instrument: `?stats=1` names what the strip is
// doing and counts the page's hitches, and three switches take one suspect away at a time.
describe('the readings a phone hands back (the readout, ?stats=1)', () => {
  it('`?loops=` pins what the strip does with its loops; anything else leaves it alone', () => {
    expect(loopsPin('?loops=off')).toBe('off');
    expect(loopsPin('?stats=1&loops=one')).toBe('one');
    expect(loopsPin('?loops=video')).toBe('video');
    expect(loopsPin('?loops=image')).toBe('image');
    expect(loopsPin('?loops=1')).toBeNull();
    expect(loopsPin('?loops')).toBeNull();
    expect(loopsPin('')).toBeNull();
  });
  it('pinned to one, only the pane nearest the middle of the screen plays; the others on it rest', () => {
    // three panes on a screen 800 px high, their middles at 100, 420 and 700
    expect(onePlays(['play', 'play', 'play', 'rest', 'free'], [100, 420, 700, 1100, 1500], 800)).toEqual(['rest', 'play', 'rest', 'rest', 'free']);
    expect(onePlays(['rest', 'play', 'free'], [-200, 300, 900], 800)).toEqual(['rest', 'play', 'free']);
    expect(onePlays(['rest', 'free'], [900, 1300], 800)).toEqual(['rest', 'free']);
  });
  it('the view obeys the pin: no loop at all, one, or its kind', () => {
    expect(view).toContain('const pin = loopsPin(location.search);');
    expect(view).toContain("const allowed = pin !== 'off' && loopsAllowed(");
    expect(view).toContain("const asImages = (): boolean => (pin === 'video' ? false : pin === 'image' ? imageLoopsWork() !== false : loopsAsImages());");
    expect(view).not.toMatch(/[^.]loopsAsImages\(\) \?/); // (every choice of kind goes through asImages)
    expect(view).toContain("if (pin === 'one') want = onePlays(want, mids, view);");
  });
  it('the strip says what it is doing, in one line', () => {
    expect(reelLine(null)).toBeNull(); // (no strip on this page: no line)
    expect(reelLine({ mode: 'video', loaded: 3, playing: 2, rolling: true, pin: null })).toBe('REEL       VIDEO LOOPS · 3 LOADED · 2 PLAYING · ROLLING');
    expect(reelLine({ mode: 'image', loaded: 2, playing: 2, rolling: false, pin: null })).toBe('REEL       PICTURE LOOPS · 2 LOADED · 2 PLAYING · BY HAND');
    expect(reelLine({ mode: 'posters', loaded: 0, playing: 0, rolling: true, pin: 'off' })).toBe('REEL       POSTERS ONLY · 0 LOADED · 0 PLAYING · ROLLING · LOOPS PINNED OFF');
    expect(reelLine({ mode: 'video', loaded: 3, playing: 1, rolling: true, pin: 'one' })).toBe('REEL       VIDEO LOOPS · 3 LOADED · 1 PLAYING · ROLLING · LOOPS PINNED ONE');
  });
  it('the page counts its own hitches: frames that came later than 50 ms, the longest, the slowest second', () => {
    expect(hitchLine({ hitches: 0, longest: 0, lowest: null, seconds: 0 })).toBe('HITCHES    COUNTING');
    expect(hitchLine({ hitches: 0, longest: 17, lowest: 60, seconds: 12 })).toBe('HITCHES    0 OVER 50 MS IN 12 S · LONGEST FRAME 17 MS · SLOWEST SECOND 60 FPS');
    expect(hitchLine({ hitches: 14, longest: 216.4, lowest: 22.6, seconds: 31 })).toBe('HITCHES    14 OVER 50 MS IN 31 S · LONGEST FRAME 216 MS · SLOWEST SECOND 23 FPS');
  });
  it('`?fx=off` beside `?stats=1` takes the grain and the scan lines away, and only then', () => {
    expect(fxOff('?stats=1&fx=off')).toBe(true);
    expect(fxOff('?fx=off')).toBe(true);
    expect(fxOff('?fx=on')).toBe(false);
    expect(fxOff('')).toBe(false);
    expect(stats).toContain("if (fxOff(location.search)) document.documentElement.classList.add('rvl-nofx');");
    expect(statsCss).toContain('.rvl-nofx #grain, .rvl-nofx .scan-layer, .rvl-nofx .rl-scan { display: none; }');
    // (the panel and its sheet load only with ?stats=1: without it the switch does nothing and no rule exists)
    expect(css).not.toContain('rvl-nofx');
  });
  it('the panel shows the two lines after its nine', () => {
    expect(stats).toContain('playerLine(playerRecords())');
    expect(stats).toContain('hitchLine(');
    expect(stats).toContain('reelLine(');
  });
});
