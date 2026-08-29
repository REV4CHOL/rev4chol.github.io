/**
 * The homepage's swipe-onward gesture: touch visitors scroll down expecting to
 * move deeper into the site, so a deliberate upward swipe navigates to the next
 * page. Pure math here (`classifySwipe`) + one thin DOM armer (`armSwipeNav`).
 */

const MIN_SWIPE = 70; // px of net rise for an unhurried swipe
const MIN_FLICK = 45; // px floor for the fast-flick path
const MAX_MS = 900; // slower than this is a drift, not a swipe
const FLICK_V = 0.35; // px/ms — flick speed threshold
const INTENT = 1.5; // rise must beat |dx| by this ratio: vertical means vertical

/** Does this net pointer travel read as "scroll down into the site"? */
export function classifySwipe(dx: number, dy: number, dtMs: number): boolean {
  if (dy >= 0) return false; // downward or flat — pull-to-refresh territory
  const rise = -dy;
  if (rise < Math.abs(dx) * INTENT) return false; // sideways intent
  if (rise >= MIN_SWIPE && dtMs <= MAX_MS) return true;
  return rise >= MIN_FLICK && dtMs > 0 && rise / dtMs >= FLICK_V;
}

/**
 * Watch touch gestures document-wide and call onCommit when one classifies.
 * Touch pointers only (mouse drags select text, pens draw); a second finger
 * poisons the gesture so pinch zoom can never navigate; gestures that begin
 * on a link or button belong to that control.
 */
export function armSwipeNav(onCommit: () => void): void {
  let id: number | null = null;
  let sx = 0;
  let sy = 0;
  let t0 = 0;
  let poisoned = false;
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'touch') return;
      if (id !== null) {
        poisoned = true; // pinch in progress — this gesture will never commit
        return;
      }
      if ((e.target as Element).closest?.('a, button')) return;
      id = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      t0 = e.timeStamp;
      poisoned = false;
    },
    { passive: true },
  );
  document.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerType !== 'touch' || e.pointerId !== id) return;
      id = null;
      if (poisoned) return;
      if (classifySwipe(e.clientX - sx, e.clientY - sy, e.timeStamp - t0)) onCommit();
    },
    { passive: true },
  );
  document.addEventListener(
    'pointercancel',
    (e) => {
      if (e.pointerId === id) id = null;
    },
    { passive: true },
  );
}
