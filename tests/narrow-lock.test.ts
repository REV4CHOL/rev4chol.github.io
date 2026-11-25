import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { armPosterLock, NARROW_EVENT, posterZoom } from '../src/lib/poster-lock';
import { touchLayout } from '../src/lib/env';
import { desktopOpening, DESKTOP_VIEW_W, openingFor } from '../src/works/opening';

// THE LOCK STANDS DOWN IN A NARROW WINDOW (owner, 2026-11-25: "Tablet layout: below a floor width the window gets the
// layout a tablet gets, with readable words. Wide windows keep your poster lock exactly as now."; of browser zoom in a
// narrow window: "Zoom like any website: in a narrow window only, Ctrl + makes the words bigger.")

/** A stand-in window, enough for the lock: a fine pointer, a screen, an outer and a client width. */
function fakeWindow(o: { outer: number; client: number; screen: number; search?: string }) {
  const listeners: Record<string, (() => void)[]> = {};
  const props = new Map<string, string>();
  const classes = new Set<string>();
  const body = { style: { setProperty: (k: string, v: string) => props.set(k, v), removeProperty: (k: string) => props.delete(k), getPropertyValue: (k: string) => props.get(k) ?? '' } };
  const root = { clientWidth: o.client, classList: { contains: (c: string) => classes.has(c), add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } };
  const win = {
    outerWidth: o.outer,
    screen: { width: o.screen },
    matchMedia: (q: string) => ({ matches: q === '(pointer: fine)' }),
    addEventListener: (t: string, f: () => void) => { (listeners[t] ??= []).push(f); },
    dispatchEvent: (e: Event) => { for (const f of listeners[e.type] ?? []) f(); return true; },
  };
  const g = globalThis as Record<string, unknown>;
  g.window = win;
  g.location = { search: o.search ?? '' };
  g.document = { documentElement: root, body, querySelectorAll: () => [], addEventListener: () => {}, hidden: false };
  return { win, root, props, classes, fire: (t: string) => { for (const f of listeners[t] ?? []) f(); } };
}
afterEach(() => { for (const k of ['window', 'location', 'document']) delete (globalThis as Record<string, unknown>)[k]; });

describe('the lock in a narrow window', () => {
  it('a wide window keeps the poster exactly as before: zoom, --plate, --zw, no class', () => {
    const w = fakeWindow({ outer: 1920, client: 1920, screen: 1920 });
    armPosterLock({ narrow: true });
    expect(w.props.get('zoom')).toBe('1');
    expect(w.props.get('--plate')).toBe('1');
    expect(w.props.get('--zw')).toBe('19.2px');
    expect(w.classes.has('rvl-narrow')).toBe(false);
  });

  it('browser zoom in a wide window still only moves the factor, never the mode (outerWidth does not move)', () => {
    const w = fakeWindow({ outer: 1920, client: 960, screen: 1920 }); // 200 %
    armPosterLock({ narrow: true });
    expect(w.props.get('zoom')).toBe('0.5');
    expect(w.classes.has('rvl-narrow')).toBe(false);
  });

  it('a half-snapped window: no zoom, no --plate, no --zw, and the class', () => {
    const w = fakeWindow({ outer: 1280, client: 1280, screen: 2560 });
    armPosterLock({ narrow: true });
    expect([...w.props.keys()]).toEqual([]);
    expect(w.classes.has('rvl-narrow')).toBe(true);
    expect(posterZoom()).toBe(1);
    expect(touchLayout()).toBe(true);
  });

  it('crossing the floor in both directions sets the poster again, and says so once each way', () => {
    const w = fakeWindow({ outer: 1920, client: 1920, screen: 1920 });
    let told = 0;
    w.win.addEventListener(NARROW_EVENT, () => told++);
    armPosterLock({ narrow: true });
    w.win.outerWidth = 960; w.root.clientWidth = 945; w.fire('resize');
    expect(w.classes.has('rvl-narrow')).toBe(true);
    expect([...w.props.keys()]).toEqual([]);
    w.fire('resize'); // (no change: no word)
    w.win.outerWidth = 1920; w.root.clientWidth = 1905; w.fire('resize');
    expect(w.classes.has('rvl-narrow')).toBe(false);
    expect(w.props.get('zoom')).toBe(String(1905 / 1920));
    expect(w.props.get('--zw')).toBe('19.2px');
    expect(told).toBe(2);
  });

  it('a page that does not opt in (the archived ABOUT) keeps the poster in any window', () => {
    const w = fakeWindow({ outer: 700, client: 700, screen: 1920 });
    armPosterLock();
    expect(w.classes.has('rvl-narrow')).toBe(false);
    expect(w.props.get('zoom')).toBe(String(700 / 1920));
  });

  it('`?win=` pins it', () => {
    const w = fakeWindow({ outer: 1920, client: 1920, screen: 1920, search: '?win=narrow' });
    armPosterLock({ narrow: true });
    expect(w.classes.has('rvl-narrow')).toBe(true);
  });
});

describe('the pages that opt in', () => {
  const page = (p: string) => readFileSync(`src/pages/${p}.ts`, 'utf8');
  it('all seven of the site, with their exempt canvases', () => {
    expect(page('index')).toContain("armPosterLock({ exempt: '#hero-host', narrow: true });");
    expect(page('works')).toContain("armPosterLock({ exempt: '#floor', narrow: true });");
    expect(page('story')).toContain("armPosterLock({ exempt: '#a3c, .a3-still', narrow: true });");
    for (const p of ['about', 'contact', 'project', 'lost']) expect(page(p), p).toContain('armPosterLock({ narrow: true });');
  });
  it('the archived ABOUT never does: it keeps today\'s poster', () => {
    expect(page('about-old')).toContain('armPosterLock();');
    expect(page('about-old')).not.toContain('narrow');
  });
  it('the lock reads the window from outerWidth', () => {
    expect(readFileSync('src/lib/poster-lock.ts', 'utf8')).toContain('narrowWindow(window.outerWidth, window.screen?.width || 0, POSTER_W, pin)');
  });
});

// (Until 2026-11-25 night a narrow PC window took this opening too. The owner then asked for a PC's wall to open
// fully zoomed out, so a mouse has one opening in every window: tests/opening.test.ts.)
describe("WORK on a tablet opens on the desktop's cluster", () => {
  it('the desktop cluster at w / 1920, between the pinch floor and 1', () => {
    expect(desktopOpening(960, 0.5)).toEqual({ x: 0, y: 0, scale: 0.5 });
    expect(desktopOpening(1100, 0.2).scale).toBeCloseTo(1100 / DESKTOP_VIEW_W, 9);
    expect(desktopOpening(600, 0.16).scale).toBeCloseTo(600 / DESKTOP_VIEW_W, 9); // under 641: still the cluster
  });
  it('a tablet takes the same opening', () => {
    expect(openingFor([], { w: 1366, h: 939 }, false, 0.5)).toEqual(desktopOpening(1366, 0.5));
  });
  it('a narrow fine pointer never takes the phone frame: it opens as every PC does', () => {
    expect(openingFor([{ x: 300, y: 200, halfW: 460, featured: true }], { w: 600, h: 900 }, true, 0.3125)).toEqual({ x: 0, y: 0, scale: 0.3125 });
  });
});
