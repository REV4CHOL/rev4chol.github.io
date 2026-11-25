import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fxOff, hitchLine, reelLine, touchLine } from '../src/lib/readout';
import { loopKind, loopsPin, onePlays, type LoopFacts } from '../src/works/reel';

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
    expect(view).toContain('const kind = (onScreen: boolean): LoopKind => loopKind({');
    expect(view).toContain("l = kind(onScreen) === 'image' ? imageLoop(li, chain) : videoLoop(chain);"); // (every choice of kind goes through loopKind: works/reel.ts)
    expect(view).toContain("if (pin === 'one') want = onePlays(want, mids, view);");
  });
  it("a touch's re-offer plays what the plan asked for, the pin included (the first reading of `one` showed three playing)", () => {
    expect(view).toContain('wants = want;');
    expect(view).toContain("if (l instanceof HTMLVideoElement && l.paused && wants[i] === 'play') tryPlay(li, l);");
    expect(view).not.toMatch(/l\.paused && panePlay\(/); // (the re-offer no longer judges a pane by its place alone)
  });
  // The owner, 2026-11-25: in Low Power Mode "THE LIST lags too". A picture loop (an MP4 in an image) cannot pause, so
  // under the LIST the strip's pictures kept running behind it.
  it('where the strip stands still (under the LIST, on a hidden page) a picture loop is let go; a video only pauses', () => {
    expect(view).toContain('if (l instanceof HTMLVideoElement) l.pause();');
    expect(view).toContain('else if (l && still) release(li);');
    expect(view).toContain("return still && p === 'play' ? 'rest' : p;"); // (still: every pane on the screen rests)
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

// The owner, 2026-11-25, Low Power Mode on, `works.html?stats=1&loops=video`, after a ten-second drag: "VIDEO LOOPS ·
// 4 LOADED · 2 PLAYING · BY HAND", with 13 late frames in 14 s where the picture loops had given 57 in 13 s. So a touch
// starts real videos on that phone. From the first touch the strip's loops are real videos; a player a touch has
// started is kept and given the next film, since a new player made with no touch is refused. Nothing changes before
// the first touch, and nothing at all in a visit where no play() was refused.
describe('in a visit where a play() was refused, a touch starts the real videos (owner)', () => {
  const base: LoopFacts = { pin: null, pictures: true, imageLoops: true, onScreen: true, touch: false, touched: false, spare: 0, off: false };

  it('where nothing was refused, a video, as always: on the screen and beside it', () => {
    expect(loopKind({ ...base, pictures: false })).toBe('video');
    expect(loopKind({ ...base, pictures: false, onScreen: false })).toBe('video');
    expect(loopKind({ ...base, pictures: false, imageLoops: null })).toBe('video');
  });
  it('refused, before any touch: the picture, as before', () => {
    expect(loopKind(base)).toBe('image');
    expect(loopKind({ ...base, onScreen: false })).toBe('image');
  });
  it('inside a touch, a pane on the screen gets a video; a pane waiting beside it does not (no touch would have started it)', () => {
    expect(loopKind({ ...base, touch: true })).toBe('video');
    expect(loopKind({ ...base, touch: true, onScreen: false })).toBe('image');
  });
  it('a player a touch has started carries the next film, on the screen or beside it; with none at hand, the picture', () => {
    expect(loopKind({ ...base, touched: true, spare: 2 })).toBe('video');
    expect(loopKind({ ...base, touched: true, spare: 1, onScreen: false })).toBe('video');
    expect(loopKind({ ...base, touched: true, spare: 0 })).toBe('image');
  });
  it("once the swap is off (a started player was refused, or no touch started one), it is today's pictures, even inside a touch", () => {
    expect(loopKind({ ...base, off: true, touch: true, touched: true, spare: 3 })).toBe('image');
    expect(loopKind({ ...base, off: true })).toBe('image');
  });
  it('the address still pins the kind: video always; image always, unless this browser draws none', () => {
    expect(loopKind({ ...base, pin: 'video' })).toBe('video');
    expect(loopKind({ ...base, pin: 'video', off: true })).toBe('video');
    expect(loopKind({ ...base, pin: 'image', touch: true, touched: true, spare: 3 })).toBe('image');
    expect(loopKind({ ...base, pin: 'image', pictures: false })).toBe('image'); // (the old way, for a before and after)
    expect(loopKind({ ...base, pin: 'image', imageLoops: false })).toBe('video');
    expect(loopKind({ ...base, pin: 'one', touch: true })).toBe('video'); // (one loop is a count, not a kind)
  });

  it('the view: a player is kept only once a touch has started it, and only in such a visit', () => {
    expect(view).toContain('if (!autoplayRefused()) return; // (nothing was ever refused here: no count, no player kept)');
    expect(view).toContain('if (started.has(l) && !off && spare.length < POOL) {');
    expect(view).toContain('const kept = off ? undefined : spare.pop();');
  });
  it('the view: inside a touch, a picture on the screen steps under its video, and goes once the video is seen', () => {
    expect(view).toContain("if (wants[i] === 'play' && l instanceof HTMLImageElement) { l.classList.add('is-ghost'); loops.delete(li); any = true; }");
    expect(view).toContain('dropGhosts(vid.parentElement, GHOST_MS);');
    expect(view).toContain("if (!im.isConnected || im.classList.contains('is-ghost')) return;"); // (a picture let go, or stepping aside, decides nothing)
  });
  it('the view: every pane let go gives its player back before any pane asks for one (the lap wraps: the first pane asks first)', () => {
    const at = (s: string): number => view.indexOf(s);
    expect(at("strip.panes.forEach((li, i) => { if (want[i] === 'free') release(li); });")).toBeGreaterThan(0);
    expect(at("strip.panes.forEach((li, i) => { if (want[i] === 'free') release(li); });")).toBeLessThan(at("if (want[i] !== 'play') return;"));
    expect(at("if (want[i] !== 'play') return;")).toBeLessThan(at("if (want[i] !== 'rest') return;"));
  });
  it("the view: a started player refused with no touch ends the swap for the page: today's pictures, no further swaps", () => {
    expect(view).toContain("if (vid.paused && loops.get(li) === vid) giveUp(f?.reused ? 'A REUSED PLAYER WAS REFUSED' : 'A STARTED PLAYER WAS REFUSED AGAIN');");
    expect(view).toContain("if (!touched && lost >= GIVE_UP_AFTER) giveUp('NO TOUCH STARTED A VIDEO');");
    expect(view).toMatch(/const giveUp = \(why: string\) => \{\s+if \(off\) return;\s+off = why;\s+spare\.length = 0;/);
  });
  it('the view: the pictures still stand under the LIST nowhere, a video only pauses; a picture under a video no touch started goes too', () => {
    expect(view).toContain("if (still && li.querySelector('img.rl-loop.is-ghost')) { release(li); return; }");
    expect(view).toContain('else if (l && still) release(li);');
  });

  it('the readout counts what the touches started, since the page opened (one paste then says whether the reuse works)', () => {
    expect(touchLine(null)).toBeNull(); // (no strip, or no play() refused in this visit: no line)
    expect(touchLine({ started: {}, tried: {}, reused: 0, reusedRefused: 0, off: null })).toBe('TOUCH      NO TOUCH HAS TRIED A VIDEO YET');
    expect(touchLine({ started: { touchend: 3 }, tried: { touchend: 3, pointerdown: 3 }, reused: 12, reusedRefused: 0, off: null }))
      .toBe('TOUCH      VIDEOS STARTED BY POINTERDOWN 0 OF 3 · BY TOUCHEND 3 OF 3 · REUSED WITH NO TOUCH 12 · REUSED AND REFUSED 0');
    expect(touchLine({ started: { touchend: 2 }, tried: { touchend: 2 }, reused: 0, reusedRefused: 1, off: 'A REUSED PLAYER WAS REFUSED' }))
      .toBe('TOUCH      VIDEOS STARTED BY TOUCHEND 2 OF 2 · REUSED WITH NO TOUCH 0 · REUSED AND REFUSED 1 · STOPPED: A REUSED PLAYER WAS REFUSED');
  });
  it('the strip line says how many loops still stand as pictures beside the videos', () => {
    expect(reelLine({ mode: 'video', loaded: 4, playing: 3, rolling: true, pin: null, pictures: 1 })).toBe('REEL       VIDEO LOOPS · 4 LOADED · 3 PLAYING · 1 AS PICTURES · ROLLING');
    expect(reelLine({ mode: 'video', loaded: 4, playing: 3, rolling: true, pin: null, pictures: 0 })).toBe('REEL       VIDEO LOOPS · 4 LOADED · 3 PLAYING · ROLLING');
    expect(reelLine({ mode: 'image', loaded: 3, playing: 3, rolling: true, pin: null, pictures: 3 })).toBe('REEL       PICTURE LOOPS · 3 LOADED · 3 PLAYING · ROLLING');
  });
  it('the panel shows the line, and a second that held a hidden page is never the slowest second', () => {
    expect(stats).toContain('touchLine(');
    expect(stats).toContain('if (away || document.hidden) away = false; // (a second that held a hidden tab says nothing)');
  });
});
