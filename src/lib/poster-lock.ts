/** POSTER LOCK — a page that arms this renders as a fixed 1440px plate scaled
 *  to the viewport, like a printed poster: one composition, benchmarked at
 *  100% zoom, that no zoom level or window width can reflow.
 *
 *  The lever is CSS `zoom` on <body>, set to clientWidth/1440. Browser zoom
 *  shrinks the CSS viewport by exactly the factor it magnifies pixels, so the
 *  product (clientWidth/1440 · zoom) is a constant — zooming in or out
 *  changes NOTHING on a locked page. `zoom` (never transform) because it
 *  participates in layout (scrollbars stay honest, no height fix-ups) and
 *  does not become a containing block for position:fixed — nav, HUD and
 *  cursor stay viewport-pinned. With body zoomed, body's own coordinate space
 *  is exactly 1440px wide, so every %, fr and px inside resolves identically
 *  forever.
 *
 *  Two leaks the factor cannot catch, owed by the locked page's stylesheet:
 *  viewport units (vw/vh bypass element zoom — pin them to their 1440 values
 *  under `@media (pointer: fine)`), and viewport media queries (gate phone
 *  blocks on `pointer: coarse` — a zoomed-in desktop viewport is not a
 *  phone). Coarse pointers never lock: phones and tablets keep their
 *  responsive layout untouched.
 *
 *  `exempt` opts a full-viewport CANVAS layer out of the lock (the works
 *  floor, the home reel): the element is counter-zoomed by 1/k so its inner
 *  coordinate space is true viewport px again — Pixi's resizeTo, pointer
 *  clientX math and world framing all stay 1:1 while the DOM chrome around
 *  it sits on the plate.
 */
export const POSTER_W = 1440;

export function armPosterLock(opts: { designW?: number; exempt?: string } = {}): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const designW = opts.designW ?? POSTER_W;
  const fit = () => {
    const k = document.documentElement.clientWidth / designW;
    document.body.style.setProperty('zoom', String(k));
    // viewport units inside the zoomed body get premultiplied by k (measured:
    // 100svh rendered k-short) — full-viewport intents divide by --plate to
    // cancel it: calc(100vh / var(--plate, 1)) always fills the real screen
    document.body.style.setProperty('--plate', String(k));
    if (opts.exempt) {
      for (const el of document.querySelectorAll<HTMLElement>(opts.exempt))
        el.style.setProperty('zoom', String(1 / k));
    }
  };
  fit();
  window.addEventListener('resize', fit); // browser zoom fires resize too
  // Back/Forward restores the page from bfcache with the OLD factor baked in
  // and no resize event; a background tab can also miss the zoom's resize.
  // Re-assert on every re-entry — fit() is idempotent and cheap.
  window.addEventListener('pageshow', fit);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fit();
  });
}

/** Effective poster zoom (1 wherever no lock is armed). JS that positions a
 *  fixed element from clientX/clientY must divide by this: pointer coords
 *  arrive in viewport px, but a fixed element inside the zoomed body lays
 *  out in the plate's own px. */
export function posterZoom(): number {
  return parseFloat(document.body.style.getPropertyValue('zoom')) || 1;
}
