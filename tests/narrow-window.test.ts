import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NARROW_CLASS, NARROW_SHARE, narrowFloor, narrowWindow, winPin } from '../src/lib/window-fit';

// A NARROW PC WINDOW GETS THE TABLET LAYOUT (owner, 2026-11-25: "Tablet layout: below a floor width the window gets the
// layout a tablet gets, with readable words. Wide windows keep your poster lock exactly as now."; of where: "Under 3/4
// of the screen: any half-snapped window switches, yours included. A window 1440 px or wider never switches.")
const POSTER = 1440;

describe('the floor: three quarters of the screen, and never at 1440 or wider', () => {
  it('is 3/4 of the plate the poster would use, capped at the poster width', () => {
    expect(NARROW_SHARE).toBe(0.75);
    expect(narrowFloor(1366, POSTER)).toBe(1080); // a small laptop: its plate is 1440
    expect(narrowFloor(1536, POSTER)).toBe(1152); // a 1920 laptop at 125 %
    expect(narrowFloor(1920, POSTER)).toBe(1440);
    expect(narrowFloor(2560, POSTER)).toBe(1440); // the owner's screen (4K at 150 %)
    expect(narrowFloor(0, POSTER)).toBe(1080); // no screen reading: the poster's own plate
  });

  it('a half-snapped window is narrow on every screen, the owner\'s included', () => {
    expect(narrowWindow(683, 1366, POSTER)).toBe(true);
    expect(narrowWindow(768, 1536, POSTER)).toBe(true);
    expect(narrowWindow(960, 1920, POSTER)).toBe(true);
    expect(narrowWindow(1280, 2560, POSTER)).toBe(true);
  });

  it('a full-screen window is never narrow', () => {
    for (const s of [1366, 1440, 1536, 1707, 1920, 2560, 3840]) expect(narrowWindow(s, s, POSTER)).toBe(false);
  });

  it('a window 1440 px or wider never switches, on any screen', () => {
    expect(narrowWindow(1440, 2560, POSTER)).toBe(false);
    expect(narrowWindow(1439, 2560, POSTER)).toBe(true);
    expect(narrowWindow(1440, 5120, POSTER)).toBe(false);
  });

  it('the floor itself is wide (strictly under it is narrow)', () => {
    expect(narrowWindow(1080, 1366, POSTER)).toBe(false);
    expect(narrowWindow(1079, 1366, POSTER)).toBe(true);
  });

  it('a window that reports no width (0) is never narrow', () => {
    expect(narrowWindow(0, 1920, POSTER)).toBe(false);
    expect(narrowWindow(Number.NaN, 1920, POSTER)).toBe(false);
  });
});

describe('the signal is the window, never the zoom', () => {
  const src = readFileSync('src/lib/window-fit.ts', 'utf8');
  it('reads the outer width and the screen, never innerWidth, clientWidth or the pixel ratio', () => {
    expect(src).not.toMatch(/innerWidth|clientWidth|devicePixelRatio/);
  });
});

describe('`?win=` pins the mode for checks, like `?gfx=`', () => {
  it('narrow or poster; anything else is no pin', () => {
    expect(winPin('?win=narrow')).toBe('narrow');
    expect(winPin('?gfx=lite&win=poster')).toBe('poster');
    expect(winPin('?win=wide')).toBeNull();
    expect(winPin('')).toBeNull();
  });
  it('the pin wins over the window', () => {
    expect(narrowWindow(1920, 1920, POSTER, 'narrow')).toBe(true);
    expect(narrowWindow(700, 1920, POSTER, 'poster')).toBe(false);
  });
  it('the class on <html> is rvl-narrow', () => {
    expect(NARROW_CLASS).toBe('rvl-narrow');
  });
});
