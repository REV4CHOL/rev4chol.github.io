import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { bigFrame, bigFrameWanted, frameTarget, fullscreenApi, isAndroid, plainReason, TARGET_PX } from '../src/project/frame-size';

// The owner, 2026-11-24: "force all video players on the website to start at 2160p when watch". No address parameter or
// player command does it (measured headless: vq=, hd=1, setPlaybackQuality, setPlaybackQualityRange, loadVideoById's
// suggestedQuality, all ignored). A YouTube player picks its level from its own size in DEVICE pixels, so the frame is
// laid out until the picture in it stands 2160 device px on its short side (or 3840 on its long) and scaled down.

describe('the big frame: 2160 device px on its short side, scaled down into the box', () => {
  it('a 1184 x 666 box at dpr 1 lays the frame out 3840 x 2160 and shows it at 0.3083', () => {
    const f = bigFrame({ width: 1184, height: 666 }, 1)!;
    expect(f.width).toBe(3840);
    expect(f.rows).toBe(2160);
    expect(Math.ceil(f.height)).toBe(2160);
    expect(f.scale).toBeCloseTo(0.3083, 4);
    expect(TARGET_PX).toBe(2160);
  });

  it('at dpr 2 half as many CSS px reach 2160 device px', () => {
    const f = bigFrame({ width: 1235, height: 695 }, 2)!;
    expect(f.rows).toBe(2160);
    expect(Math.ceil(f.height)).toBe(1080);
    expect(Math.round(f.width)).toBe(1919);
    expect(f.scale).toBeCloseTo(1235 / 1919, 3);
  });

  // measured: a GALAXY part (9:16) laid out 1215 x 2160 stopped at hd1440; 2160 x 3840 reached hd2160 (decoded 2160 x 3840)
  it('a vertical box is sized on its width, the short side', () => {
    const f = bigFrame({ width: 364, height: 648 }, 1, 1, 9 / 16)!;
    expect(Math.round(f.width)).toBe(2160);
    expect(f.rows).toBe(3846); // (3845 by the picture alone: the frame's rows are even, see the thin line below)
    expect(f.scale).toBeCloseTo(364 / 2160, 3);
  });

  // measured: under the poster lock's zoom 0.75 a frame laid out 2160 tall reported devicePixelRatio 0.75 inside (1620
  // device px): the lock's zoom counts like the screen's ratio
  it("the poster lock's zoom counts with the pixel ratio", () => {
    const f = bigFrame({ width: 888, height: 500 }, 1, 0.75)!;
    expect(Math.ceil(f.height)).toBe(2880);
    expect(f.rows).toBe(2160);
  });

  // a 9:16 part in a landscape box (fullscreen on a landscape screen) stands 1215 px wide in a 2160-tall frame: 1440p
  // (measured); its frame is laid out until the picture itself is 2160 wide
  it('the picture decides, not the box: a vertical film fullscreen on a landscape screen', () => {
    const f = bigFrame({ width: 1440, height: 900 }, 1, 1, 9 / 16)!;
    expect(f.rows).toBe(3840);
    expect(Math.round(f.rows * 9 / 16)).toBe(2160);
    expect(f.width).toBe(6144);
  });

  it('a scope or 3:2 film in the 16:9 player: a 3840 x 2160 frame (measured: 2160p for both)', () => {
    expect(bigFrame({ width: 1184, height: 666 }, 1, 1, 2.39)).toMatchObject({ width: 3840, rows: 2160 });
    expect(bigFrame({ width: 1184, height: 666 }, 1, 1, 3 / 2)).toMatchObject({ width: 3840, rows: 2160 });
  });

  it('a box already 2160 device px on its short side stays plain', () => {
    expect(bigFrame({ width: 3840, height: 2160 }, 1)).toBeNull();
    expect(bigFrame({ width: 1920, height: 1080 }, 2)).toBeNull();
    expect(bigFrame({ width: 1600, height: 1081 }, 2)).toBeNull();
  });

  it('a box with no size yet is not sized', () => {
    expect(bigFrame({ width: 0, height: 0 }, 1)).toBeNull();
    expect(bigFrame({ width: 800, height: 0 }, 1)).toBeNull();
  });
});

// THE THIN LINE (owner, 2026-11-25, of a hairline across the exact middle of the playing picture in a film's first
// seconds). Measured headless on the live site at the owner's screen (window 2560 x 1300 at a true scale 1.5, the
// poster lock's zoom 1.7625): YouTube's controls overlay lays a dark shade over the TOP HALF of its frame (a gradient
// tile half the frame high, repeated across), whenever the overlay shows: after a start, after a seek, on pause. Chrome
// draws the overlay at the scale the page shows the frame at, and when the shade's foot (half the frame's own rows x
// that scale) is not on a whole row of the screen, that row takes a share of the tile's dark head. Over a white ground
// with the video hidden: the foot at row 635.95 (the old fit, 855 / 1452) darkened that row by 6.8 levels of 255; at
// 636.5, by 37; at 636 exactly, by none. So the frame's own rows are even and it is shown on an even count of the
// screen's rows: the foot is then half of that, a whole row.
describe("the frame's rows are even, its own and the screen's (the thin line at the picture's middle)", () => {
  /** the frame the rule before this one laid out (the 2160p measurements were all made with it) */
  const before = (width: number, height: number, px: number, picture?: number) => {
    const r = picture ?? width / height;
    const pw = Math.min(width, height * r), ph = Math.min(height, width / r);
    const k = Math.min(2160 / px / Math.min(pw, ph), 3840 / px / Math.max(pw, ph));
    return { width: Math.round(width * k), rows: Math.ceil(Math.round(height * k) * px - 1e-6) };
  };

  it("the owner's screen: 2160 rows shown on 1272, at 1272 / 2160", () => {
    const f = bigFrame({ width: 855, height: 481 }, 1.5, 1.7625, 16 / 9)!;
    expect(f.rows).toBe(2160);
    expect(f.shown).toBe(1272);
    expect(f.scale).toBe(1272 / 2160);
    expect(f.width).toBe(1452);
    // the shade's foot: row 636, where the fit before this one put it on 635.95
    expect((f.rows / 2) * f.scale).toBeCloseTo(636, 9);
    expect(1080 * (855 / 1452)).toBeCloseTo(635.95, 2);
  });

  // measured: a frame 816.265 px high at 2.64375 device px to the px (2158.0006 rows) was 2159 rows inside: the browser
  // rounds a frame's height UP. A quarter row under, rounding up and rounding to the nearest agree.
  it('the frame is laid out a quarter row under its rows', () => {
    const f = bigFrame({ width: 855, height: 481 }, 1.5, 1.7625, 16 / 9)!;
    expect(f.height * 1.5 * 1.7625).toBeCloseTo(2159.75, 6);
  });

  it('on any screen: even rows in the frame and on the screen, the foot on a whole row, never a smaller frame', () => {
    let seen = 0;
    for (const width of [320, 414, 768, 855, 1024, 1184, 1235, 1366, 1440, 1507, 1707, 1920, 2560]) {
      for (const shape of [16 / 9, 3 / 2, 4 / 3, 9 / 16]) {
        for (const dpr of [1, 1.25, 1.5, 1.75, 2, 2.625, 3]) {
          for (const zoom of [1, 0.75, 1.1, 1.7625]) {
            for (const picture of [undefined, 16 / 9, 3 / 2, 2.39, 9 / 16]) {
              const height = Math.round(width / shape), px = dpr * zoom;
              const f = bigFrame({ width, height }, dpr, zoom, picture);
              if (!f) continue;
              seen++;
              const was = before(width, height, px, picture);
              expect(f.rows % 2).toBe(0);
              expect(f.shown % 2).toBe(0);
              const foot = (f.rows / 2) * f.scale;
              expect(Math.abs(foot - Math.round(foot))).toBeLessThan(1e-9);
              expect(Math.ceil(f.height * px)).toBe(f.rows);
              expect(Math.round(f.height * px)).toBe(f.rows);
              // never smaller than the frame the 2160p measurements were made with, and at most one row taller
              expect(f.rows).toBeGreaterThanOrEqual(was.rows);
              expect(f.rows - was.rows).toBeLessThanOrEqual(1);
              expect(f.width).toBeGreaterThanOrEqual(was.width);
              // shown within a row of the box's own height, across all of its width, and not past it by a few px
              expect(Math.abs(f.shown - height * px)).toBeLessThanOrEqual(1);
              expect(f.width * f.scale).toBeGreaterThanOrEqual(width - 1e-9);
              expect((f.width * f.scale - width) * px).toBeLessThan(6);
              expect(f.scale).toBeLessThanOrEqual(1);
              expect(f.scale).toBeGreaterThan(0);
            }
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(3000);
  });

  it('the bar fits the frame with what the rule gives: its height and its scale, unrounded', () => {
    const src = readFileSync('src/project/player-bar.ts', 'utf8');
    expect(src).toMatch(/frame\.style\.height = `\$\{f \? f\.height : h\}px`/);
    expect(src).toMatch(/frame\.style\.transform = f \? `scale\(\$\{f\.scale\}\)` : ''/);
    // the readout's words keep whole px (the height is a fraction now)
    expect(src).toMatch(/FRAME \$\{Math\.round\(f\.width\)\} × \$\{Math\.round\(f\.height\)\} AT/);
  });
});

describe('when the big frame is used', () => {
  const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
  const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const ANDROID_PHONE = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36';
  const ok = { youtube: true, fullscreen: true, userAgent: PC };

  it('a YouTube film, on a screen that can take an element fullscreen', () => {
    expect(bigFrameWanted(ok)).toBe(true);
    expect(bigFrameWanted({ ...ok, userAgent: IPAD })).toBe(true);
  });

  it('a platform other than YouTube keeps its own player', () => {
    expect(bigFrameWanted({ ...ok, youtube: false })).toBe(false);
  });

  it('no fullscreen for elements (an iPhone): YouTube keeps its own player and its own fullscreen', () => {
    expect(bigFrameWanted({ ...ok, fullscreen: false })).toBe(false);
  });

  // (owner, 2026-11-25: "also why can't our custom Player go to Phone? Like the other platforms?"; told the reasons,
  //  they chose "Android only". An iPhone has no element fullscreen and keeps YouTube's own player, above.)
  it("Android gets the site's player too, a phone and a tablet alike", () => {
    expect(isAndroid(ANDROID)).toBe(true);
    expect(isAndroid(ANDROID_PHONE)).toBe(true);
    expect(isAndroid(PC)).toBe(false);
    expect(isAndroid(IPAD)).toBe(false);
    expect(bigFrameWanted({ ...ok, userAgent: ANDROID })).toBe(true);
    expect(bigFrameWanted({ ...ok, userAgent: ANDROID_PHONE })).toBe(true);
    // (an Android browser without element fullscreen keeps YouTube's own, like an iPhone)
    expect(plainReason({ ...ok, userAgent: ANDROID_PHONE, fullscreen: false })).toBe('NO ELEMENT FULLSCREEN HERE');
  });

  // Android's player stayed at 480p whatever the big frame's size (measured on the tablet profile, 2160 laid out): a
  // frame of 3840 px there costs a phone memory and data for nothing, so its frame stands at the box's own size
  it("Android's frame stands at the box's own size; every other screen keeps the big frame", () => {
    expect(frameTarget(ANDROID)).toBe('box');
    expect(frameTarget(ANDROID_PHONE)).toBe('box');
    expect(frameTarget(PC)).toBe('big');
    expect(frameTarget(IPAD)).toBe('big');
  });

  // (owner, 2026-11-24: "I saw the player on PC for a time, and now it dissapeared, and YouTube player is appearing
  //  now ... Also right now on iPad I cant even see the new player at all". Measured on the live site: a page whose
  //  remembered quality tier was LITE mounted YouTube's own player. The tier moves with the machine's load and is
  //  remembered for the session; the player is the film, not an effect, and no longer reads it.)
  it('the quality tier is no gate: the gates are the film and the browser alone', () => {
    expect(Object.keys(ok).sort()).toEqual(['fullscreen', 'userAgent', 'youtube']);
    expect(readFileSync('src/project/frame-size.ts', 'utf8')).not.toMatch(/\blite\b\s*[:?]/);
  });

  it('says why a film keeps the platform\'s own player, for the readout', () => {
    expect(plainReason(ok)).toBeNull();
    expect(plainReason({ ...ok, youtube: false })).toBe('NOT A YOUTUBE FILM');
    expect(plainReason({ ...ok, fullscreen: false })).toBe('NO ELEMENT FULLSCREEN HERE');
    expect(plainReason({ ...ok, userAgent: ANDROID })).toBeNull();
    for (const g of [ok, { ...ok, youtube: false }, { ...ok, fullscreen: false }, { ...ok, userAgent: ANDROID }]) {
      expect(bigFrameWanted(g)).toBe(plainReason(g) === null);
    }
  });

  it('the fullscreen API, standard or webkit', () => {
    expect(fullscreenApi({ fullscreenEnabled: true })).toBe(true);
    expect(fullscreenApi({ webkitFullscreenEnabled: true })).toBe(true);
    expect(fullscreenApi({ fullscreenEnabled: false })).toBe(false);
    expect(fullscreenApi({})).toBe(false);
  });
});
