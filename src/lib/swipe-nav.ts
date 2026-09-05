/**
 * Physical swipe navigation: touch visitors scroll through the site as if the
 * pages were stacked — the page follows the thumb (a glide), the destination's
 * station card shows through behind it, and releasing past the threshold
 * commits the move. Finger up = onward through the nav, finger down = back.
 *
 * Pure math lives up top (`classifySwipe`, `glideCommit`, `navNeighbors` — all
 * unit-tested); `armGlideNav` is the one DOM armer, called per page.
 */
import { reducedMotion } from './env';
import { sound } from './sound';
import { leaveTo } from './transitions';

export interface NavStop { label: string; href: string }

const MIN_SWIPE = 70; // px of net rise for an unhurried swipe (calm-mode path)
const MIN_FLICK = 45; // px floor for the fast-flick path
const MAX_MS = 900; // slower than this is a drift, not a swipe
const FLICK_V = 0.35; // px/ms — flick speed threshold
const INTENT = 1.5; // travel must beat |cross-axis| by this ratio

/** Does this net pointer travel read as a deliberate vertical swipe up? */
export function classifySwipe(dx: number, dy: number, dtMs: number): boolean {
  if (dy >= 0) return false; // downward or flat
  const rise = -dy;
  if (rise < Math.abs(dx) * INTENT) return false; // sideways intent
  if (rise >= MIN_SWIPE && dtMs <= MAX_MS) return true;
  return rise >= MIN_FLICK && dtMs > 0 && rise / dtMs >= FLICK_V;
}

/** Release decision for a glide: deep enough drag, or a genuine flick. */
export function glideCommit(dragPx: number, vh: number, vel: number): boolean {
  if (dragPx >= vh * 0.22) return true;
  return dragPx >= 40 && vel >= 0.5;
}

/** The page before and after `path` in the nav — the chain IS the menu order. */
export function navNeighbors(
  nav: NavStop[],
  path: string,
): { prev: NavStop | null; next: NavStop | null } {
  const norm = (p: string) => (p === '/' || p === '' ? '/index.html' : p);
  const here = norm(path);
  const i = nav.findIndex((n) => norm(n.href) === here);
  if (i < 0) return { prev: null, next: null };
  return { prev: nav[i - 1] ?? null, next: nav[i + 1] ?? null };
}

export interface GlideOptions {
  next: NavStop | null;
  prev: NavStop | null;
  /** May this direction start right now? Scroll pages pass their boundary check. */
  allow?: (dir: 1 | -1) => boolean;
  /** Page-specific garnish on commit (the homepage bursts its hero). */
  onCommit?: (dir: 1 | -1) => void;
  /** Whether the page is in a state to leave at all (the about page's solo flight is not). */
  enabled?: () => boolean;
}

/** Drag depth where resistance kicks in / hard cap, as viewport fractions. */
const EASE_AT = 0.35;
const CAP_AT = 0.6;

export function armGlideNav(opts: GlideOptions): void {
  const { next, prev } = opts;
  if (!next && !prev) return;

  // ---- the cue: the onward page's name over a dipping chevron, tap-able ----
  if (next) {
    const cue = document.createElement('a');
    cue.className = 'swipe-cue';
    cue.href = next.href;
    cue.setAttribute('data-internal', '');
    const kicker = document.createElement('span');
    kicker.className = 'swc-kicker';
    kicker.textContent = 'SCROLL ▾';
    kicker.setAttribute('aria-hidden', 'true');
    cue.append(kicker);
    const label = document.createElement('span');
    label.className = 'swc-label';
    label.textContent = next.label;
    const chevron = document.createElement('span');
    chevron.className = 'swc-chevron';
    chevron.textContent = '⌄';
    chevron.setAttribute('aria-hidden', 'true');
    cue.append(label, chevron);
    document.body.append(cue);
  }

  // ---- the station card behind the page: painted between the root background
  // and the body (z −1 on a child of <html>), so it exists exactly where the
  // gliding body has vacated ----
  const panel = document.createElement('div');
  panel.className = 'glide-panel';
  panel.setAttribute('aria-hidden', 'true');
  const kicker = document.createElement('span');
  kicker.className = 'gp-kicker';
  const name = document.createElement('span');
  name.className = 'gp-name';
  panel.append(kicker, name);
  document.documentElement.append(panel);

  const calm = reducedMotion();
  let id: number | null = null;
  let sx = 0;
  let sy = 0;
  let t0 = 0;
  let poisoned = false;
  let engaged: 1 | -1 | 0 = 0; // direction of the live glide, 0 = none
  let inert = false; // gesture judged not-ours (scrolling, no neighbor) — stand down
  let lastY = 0;
  let lastT = 0;
  let prevY = 0;
  let prevT = 0;
  let committed = false;

  const stopFor = (dir: 1 | -1) => (dir > 0 ? next : prev);
  const may = (dir: 1 | -1) => !!stopFor(dir) && (!opts.enabled || opts.enabled()) && (opts.allow ? opts.allow(dir) : true);

  const setDrag = (px: number, dir: 1 | -1) => {
    const vh = window.innerHeight;
    const ease = vh * EASE_AT;
    const shown = Math.min(px <= ease ? px : ease + (px - ease) * 0.4, vh * CAP_AT);
    document.body.style.transform = `translateY(${(-shown * dir).toFixed(1)}px)`;
    panel.style.opacity = Math.min(1, px / (vh * 0.18)).toFixed(2);
  };

  const engage = (dir: 1 | -1) => {
    engaged = dir;
    const stop = stopFor(dir)!;
    kicker.textContent = dir > 0 ? 'TUNING ▸ NEXT' : 'TUNING ▸ BACK';
    name.textContent = stop.label;
    panel.classList.toggle('glide-panel--above', dir < 0);
    panel.classList.add('on');
    document.body.style.willChange = 'transform';
    document.body.style.transition = 'none';
  };

  const settleBack = () => {
    engaged = 0;
    document.body.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    document.body.style.transform = 'translateY(0)';
    panel.style.opacity = '0';
    window.setTimeout(() => {
      if (engaged === 0 && !committed) {
        document.body.style.transition = '';
        document.body.style.transform = '';
        document.body.style.willChange = '';
        panel.classList.remove('on');
      }
    }, 330);
  };

  const commit = (dir: 1 | -1) => {
    const stop = stopFor(dir);
    if (!stop || committed) return;
    committed = true;
    engaged = 0;
    sound.whoosh();
    opts.onCommit?.(dir);
    panel.classList.add('commit');
    panel.style.opacity = '1';
    document.body.style.transition = 'transform 0.26s cubic-bezier(0.5, 0, 0.9, 0.6)';
    document.body.style.transform = `translateY(${dir > 0 ? '-108vh' : '108vh'})`;
    // the slide IS the page transition — navigate as it completes (a timeout,
    // not transitionend: throttled tabs must still leave)
    window.setTimeout(() => { location.href = stop.href; }, 250);
  };

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (committed || e.pointerType !== 'touch') return;
      if (id !== null) {
        // second finger: pinch wins — poison this gesture and let go of the page
        poisoned = true;
        if (engaged) settleBack();
        return;
      }
      if ((e.target as Element).closest?.('a, button')) return;
      id = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      t0 = e.timeStamp;
      lastY = prevY = e.clientY;
      lastT = prevT = e.timeStamp;
      poisoned = false;
      inert = false;
    },
    { passive: true },
  );

  document.addEventListener(
    'pointermove',
    (e) => {
      if (committed || e.pointerType !== 'touch' || e.pointerId !== id || poisoned || inert) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      prevY = lastY;
      prevT = lastT;
      lastY = e.clientY;
      lastT = e.timeStamp;
      let dir = engaged;
      if (dir === 0) {
        if (Math.abs(dy) < 10) return; // not yet a gesture
        if (Math.abs(dy) < Math.abs(dx) * INTENT) { inert = true; return; } // sideways
        dir = dy < 0 ? 1 : -1;
        if (calm || !may(dir)) { inert = true; return; } // scrolling / nowhere to go
        engage(dir);
      }
      setDrag(Math.max(0, -dy * dir), dir);
    },
    { passive: true },
  );

  // while a glide owns the touch, the browser must not scroll or pull-to-refresh under it
  document.addEventListener(
    'touchmove',
    (e) => { if (engaged) e.preventDefault(); },
    { passive: false },
  );

  const release = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || e.pointerId !== id) return;
    id = null;
    if (committed || poisoned) return;
    if (engaged !== 0) {
      const dir: 1 | -1 = engaged;
      const drag = Math.max(0, (sy - e.clientY) * dir);
      const dt = Math.max(1, e.timeStamp - prevT);
      const vel = ((prevY - e.clientY) * dir) / dt;
      if (glideCommit(drag, window.innerHeight, vel)) commit(dir);
      else settleBack();
      return;
    }
    // calm mode still navigates — the completed gesture takes the standard wipe
    if (calm && !inert) {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const dir: 1 | -1 = dy < 0 ? 1 : -1;
      const stop = stopFor(dir);
      if (stop && may(dir) && classifySwipe(dx, -Math.abs(dy), e.timeStamp - t0)) {
        leaveTo(stop.href);
      }
    }
  };
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener(
    'pointercancel',
    (e) => {
      if (e.pointerId !== id) return;
      id = null;
      if (engaged && !committed) settleBack();
    },
    { passive: true },
  );

  // ---- the wheel (owner: scroll down to each section, on to the next): on a page that cannot scroll, or one
  // scrolled to its end, a deliberate scroll on — a few notches, after the page has come to rest — goes to
  // the next stop; from the top, back. The same slide as a swipe.
  let wheelSum = 0;
  let wheelAt = 0;
  let restAt = 0;
  let lastTop = -1;
  window.addEventListener('scroll', () => {
    const top = (document.scrollingElement ?? document.documentElement).scrollTop;
    if (top !== lastTop) { lastTop = top; restAt = performance.now(); }
  }, { passive: true });
  window.addEventListener('wheel', (e) => {
    if (committed || calm) return;
    const now = performance.now();
    if (now - wheelAt > 700 || now - restAt < 450) wheelSum = 0; // a fresh gesture; nothing while the page still moves
    wheelAt = now;
    const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
    if (!may(dir) || now - restAt < 450) return;
    wheelSum = Math.sign(wheelSum) === dir ? wheelSum + e.deltaY : e.deltaY;
    if (Math.abs(wheelSum) >= 360) { wheelSum = 0; commit(dir); }
  }, { passive: true });

  // debug handle for verification
  (window as unknown as { rvlGlide: unknown }).rvlGlide = {
    commit,
    engagedDir: () => engaged,
    committed: () => committed,
  };
}
