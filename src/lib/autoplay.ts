/** AUTOPLAY, REFUSED (owner, 2026-10-20: "i dont care which power mode iphone is on, but I want all the sections in both
 *  the homepage and work section to play all video right away").
 *
 *  iOS Low Power Mode refuses every video play() no touch asked for, muted or not, and nothing on a page can lift it:
 *  the refused promise's NotAllowedError is its only sign. Safari shows an MP4 inside an <img> as a silent looping
 *  picture, outside the video rules — so on a refusal the loops stand as such images, at once, from the same files.
 *  The visit remembers the refusal (sessionStorage), so its next page starts on images straight away. A browser that
 *  cannot show an MP4 in an <img> says so with the image's error: it keeps its posters, and a touch starts its loops
 *  as before. */

export const SESSION_KEY = 'rvl-autoplay-refused';

/** A play() refused for want of a gesture — not a bad file, not a load cut short by a pause. */
export function isRefusal(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'NotAllowedError';
}

type Store = Pick<Storage, 'getItem' | 'setItem'> | null;
const sessionStore = (): Store => {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
};

let refused: boolean | null = null;
let imageLoops: boolean | null = null;
const listeners = new Set<() => void>();

/** Has this visit had a play() refused? */
export function autoplayRefused(store: Store = sessionStore()): boolean {
  if (refused === null) {
    try { refused = store?.getItem(SESSION_KEY) === '1'; } catch { refused = false; }
  }
  return refused;
}

/** A play() was refused: the visit remembers it, and whoever waits hears it — once. */
export function noteRefusal(store: Store = sessionStore()): void {
  if (autoplayRefused(store)) return;
  refused = true;
  try { store?.setItem(SESSION_KEY, '1'); } catch { /* private mode: this page alone */ }
  for (const f of [...listeners]) f();
}

/** Hear the first refusal; returns the unsubscribe. */
export function onRefusal(f: () => void): () => void {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

/** Can an MP4 stand in an <img> here? null until a first image has loaded (yes) or failed (no); a no is final. */
export const imageLoopsWork = (): boolean | null => imageLoops;
export function noteImageLoops(ok: boolean): void {
  if (imageLoops !== false) imageLoops = ok;
}

/** Loops as images: after a refusal, unless this browser has shown it cannot. */
export const loopsAsImages = (): boolean => autoplayRefused() && imageLoops !== false;

/** Forget everything (the tests' fresh visit). */
export function resetAutoplay(): void {
  refused = null;
  imageLoops = null;
  listeners.clear();
}
