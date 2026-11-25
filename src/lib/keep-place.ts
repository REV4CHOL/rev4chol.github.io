/** THE VISITOR'S PLACE (the review's walkthroughs, 2026-11-25: a film page scrolled to 2600 and reloaded came back at 961,
 *  the synopsis and the top of the player; ABOUT scrolled to 1600 came back at 1180 and stayed there). These pages build
 *  themselves from JSON after the load, so the browser puts the scroll back while the page is still short, clamps it,
 *  and stops trying. The page keeps the place itself, in its own history entry (so a reload and Back or Forward find it,
 *  and a fresh visit to the same address, a new entry, starts at the top), and puts it back once the page is tall
 *  enough. A visitor who moves the page first (a wheel, a finger, a key, a press: the hero's press-to-play scroll is
 *  one) wins at once, and an address with a #hash is left to its hash.
 *
 *  The place is kept in PLATE px (the scroll divided by the poster lock's zoom, lib/poster-lock.ts), and put back at the
 *  zoom the page has when it is restored. A page restored whole from the back cache keeps its own scroll: nothing to do. */

const KEY = 'rvlPlace';
/** Once there, the place is held this long: anything late that moves the page (a face landing, the browser's own late
 *  try) is put right. */
export const HOLD_MS = 900;
/** The whole wait for the page to grow tall enough, from the arming. */
export const WAIT_MS = 8000;
const TICK_MS = 80;
const SAVE_MS = 250;

export interface Place { y: number }

/** The place a history entry's state holds (plate px), or null. */
export function placeIn(state: unknown): Place | null {
  if (!state || typeof state !== 'object') return null;
  const p = (state as Record<string, unknown>)[KEY];
  if (!p || typeof p !== 'object') return null;
  const y = (p as Record<string, unknown>).y;
  return typeof y === 'number' && Number.isFinite(y) && y > 0 ? { y } : null;
}

/** The entry's state with the place written in (`scrollY` in screen px at the page's `zoom`), beside what it held. */
export function withPlace(state: unknown, scrollY: number, zoom: number): Record<string, unknown> {
  const own = state && typeof state === 'object' ? (state as Record<string, unknown>) : {};
  return { ...own, [KEY]: { y: Math.round((scrollY / (zoom || 1)) * 10) / 10 } };
}

/** Put the place back only after a reload or Back / Forward, never for an address with a hash, never without a place. */
export function shouldRestore(navType: string | undefined, hash: string, place: Place | null): boolean {
  return place !== null && !hash && (navType === 'reload' || navType === 'back_forward');
}

/** The screen px to scroll to for a plate place at the page's zoom now. */
export function targetY(place: Place, zoom: number): number {
  return Math.round(place.y * (zoom || 1));
}

/** One step of putting the place back: `max` is how far the page can scroll now, `y` where it stands. Waits while the
 *  page is too short; goes as soon as it is tall enough; holds the place HOLD_MS; gives up at `deadline`. */
export function restoreStep(o: { target: number; max: number; y: number; reachedAt: number | null; now: number; deadline: number }): { to: number | null; reachedAt: number | null; done: boolean } {
  if (o.reachedAt === null) {
    if (o.now > o.deadline) return { to: null, reachedAt: null, done: true };
    if (o.max + 1 < o.target) return { to: null, reachedAt: null, done: false };
    return { to: o.target, reachedAt: o.now, done: false };
  }
  const done = o.now - o.reachedAt >= HOLD_MS;
  return { to: !done && Math.abs(o.y - o.target) > 1 ? o.target : null, reachedAt: o.reachedAt, done };
}

/* ------------------------------------------------------------------------------------------------- the page -- */

const zoomNow = () => parseFloat(document.body?.style.getPropertyValue('zoom') ?? '') || 1;

/** Arm it, before the page's boot. */
export function keepPlace(): void {
  if (typeof history === 'undefined') return;
  const nav = (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
  const place = placeIn(history.state);
  let restoring = shouldRestore(nav, location.hash, place);

  // THE KEEPING: the place is written into the entry a moment after the page stops moving, and as the page goes (not on
  // every scroll event: a browser throttles a page that rewrites its history too often)
  let saveTimer = 0;
  const save = () => {
    clearTimeout(saveTimer);
    if (restoring) return; // (the place being put back stands until it is back)
    try { history.replaceState(withPlace(history.state, window.scrollY, zoomNow()), ''); } catch { /* no keeping */ }
  };
  window.addEventListener('scroll', () => { clearTimeout(saveTimer); saveTimer = window.setTimeout(save, SAVE_MS); }, { passive: true });
  window.addEventListener('pagehide', save);

  if (!restoring || !place) return;
  // THE PUTTING BACK: the browser's own try stops here (it is what left the page at 961)
  try { history.scrollRestoration = 'manual'; } catch { /* the page's own try is enough */ }
  const t0 = performance.now();
  let reachedAt: number | null = null;
  let timer = 0;
  const stop = () => {
    restoring = false;
    clearInterval(timer);
    for (const ev of GIVE_WAY) window.removeEventListener(ev, stop, true);
  };
  // the visitor moves the page first: theirs at once
  const GIVE_WAY = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  for (const ev of GIVE_WAY) window.addEventListener(ev, stop, { capture: true, passive: true });
  const step = () => {
    if (!restoring) return;
    const se = document.scrollingElement ?? document.documentElement;
    const s = restoreStep({
      target: targetY(place, zoomNow()),
      max: se.scrollHeight - window.innerHeight,
      y: window.scrollY,
      reachedAt,
      now: performance.now(),
      deadline: t0 + WAIT_MS,
    });
    reachedAt = s.reachedAt;
    if (s.to !== null) window.scrollTo({ top: s.to, behavior: 'instant' });
    if (s.done) stop();
  };
  timer = window.setInterval(step, TICK_MS);
  step();
}
