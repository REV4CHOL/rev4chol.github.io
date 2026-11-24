import { describe, expect, it } from 'vitest';
import { bigFrame, bigFrameWanted, fullscreenApi, isAndroid, TARGET_PX } from '../src/project/frame-size';

// The owner, 2026-11-24: "force all video players on the website to start at 2160p when watch". No address parameter or
// player command does it (measured headless: vq=, hd=1, setPlaybackQuality, setPlaybackQualityRange, loadVideoById's
// suggestedQuality, all ignored). A YouTube player picks its level from its own size in DEVICE pixels, so the frame is
// laid out until the picture in it stands 2160 device px on its short side (or 3840 on its long) and scaled down.

describe('the big frame: 2160 device px on its short side, scaled down into the box', () => {
  it('a 1184 x 666 box at dpr 1 lays the frame out 3840 x 2160 and shows it at 0.3083', () => {
    const f = bigFrame({ width: 1184, height: 666 }, 1)!;
    expect(f.width).toBe(3840);
    expect(f.height).toBe(2160);
    expect(f.scale).toBeCloseTo(0.3083, 4);
    expect(TARGET_PX).toBe(2160);
  });

  it('at dpr 2 half as many CSS px reach 2160 device px', () => {
    const f = bigFrame({ width: 1235, height: 695 }, 2)!;
    expect(f.height).toBe(1080);
    expect(f.width).toBe(1919);
    expect(f.scale).toBeCloseTo(1235 / 1919, 6);
  });

  // measured: a GALAXY part (9:16) laid out 1215 x 2160 stopped at hd1440; 2160 x 3840 reached hd2160 (decoded 2160 x 3840)
  it('a vertical box is sized on its width, the short side', () => {
    const f = bigFrame({ width: 364, height: 648 }, 1, 1, 9 / 16)!;
    expect(f.width).toBe(2160);
    expect(f.height).toBe(3845);
    expect(f.scale).toBeCloseTo(364 / 2160, 6);
  });

  // measured: under the poster lock's zoom 0.75 a frame laid out 2160 tall reported devicePixelRatio 0.75 inside (1620
  // device px): the lock's zoom counts like the screen's ratio
  it("the poster lock's zoom counts with the pixel ratio", () => {
    const f = bigFrame({ width: 888, height: 500 }, 1, 0.75)!;
    expect(f.height).toBe(2880);
    expect(f.height * 0.75).toBe(2160);
  });

  // a 9:16 part in a landscape box (fullscreen on a landscape screen) stands 1215 px wide in a 2160-tall frame: 1440p
  // (measured); its frame is laid out until the picture itself is 2160 wide
  it('the picture decides, not the box: a vertical film fullscreen on a landscape screen', () => {
    const f = bigFrame({ width: 1440, height: 900 }, 1, 1, 9 / 16)!;
    expect(f.height).toBe(3840);
    expect(Math.round(f.height * 9 / 16)).toBe(2160);
    expect(f.width).toBe(6144);
  });

  it('a scope or 3:2 film in the 16:9 player: a 3840 x 2160 frame (measured: 2160p for both)', () => {
    expect(bigFrame({ width: 1184, height: 666 }, 1, 1, 2.39)).toMatchObject({ width: 3840, height: 2160 });
    expect(bigFrame({ width: 1184, height: 666 }, 1, 1, 3 / 2)).toMatchObject({ width: 3840, height: 2160 });
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

describe('when the big frame is used', () => {
  const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
  const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const ok = { youtube: true, fullscreen: true, userAgent: PC, lite: false };

  it('a YouTube film, on a screen that can take an element fullscreen, not Android, not LITE', () => {
    expect(bigFrameWanted(ok)).toBe(true);
    expect(bigFrameWanted({ ...ok, userAgent: IPAD })).toBe(true);
  });

  it('a platform other than YouTube keeps its own player', () => {
    expect(bigFrameWanted({ ...ok, youtube: false })).toBe(false);
  });

  it('no fullscreen for elements (an iPhone): YouTube keeps its own player and its own fullscreen', () => {
    expect(bigFrameWanted({ ...ok, fullscreen: false })).toBe(false);
  });

  it('Android gains nothing (its player stayed at 480p whatever the size, measured)', () => {
    expect(isAndroid(ANDROID)).toBe(true);
    expect(isAndroid(PC)).toBe(false);
    expect(bigFrameWanted({ ...ok, userAgent: ANDROID })).toBe(false);
  });

  it('a machine measured slow (LITE) keeps the plain player', () => {
    expect(bigFrameWanted({ ...ok, lite: true })).toBe(false);
  });

  it('the fullscreen API, standard or webkit', () => {
    expect(fullscreenApi({ fullscreenEnabled: true })).toBe(true);
    expect(fullscreenApi({ webkitFullscreenEnabled: true })).toBe(true);
    expect(fullscreenApi({ fullscreenEnabled: false })).toBe(false);
    expect(fullscreenApi({})).toBe(false);
  });
});
