/** POSTER LOCK — a page that arms this renders on a fixed-width plate, and
 *  browser zoom changes NOTHING about it: not size, not placement, not
 *  layout — in EITHER direction (owner decree: benchmark at 100%, the
 *  render must be pixel-identical at every zoom level).
 *
 *  THE BASELINE: the plate is the viewport width at the last TRUE window
 *  size — captured at load and on real window resizes, floored at 1440 so
 *  a narrow window still gets the whole composition scaled down as one
 *  poster, never a crushed layout. At 100% on any monitor k = 1 and the
 *  layout is the classic fluid design at native width (a wide monitor is
 *  NOT a magnified 1440 — that balloon was rejected).
 *
 *  THE ZOOM TELL: browser zoom scales devicePixelRatio; window drags do
 *  not. So on a dpr shift the plate HOLDS and only k moves — zoom-in gives
 *  k < 1, zoom-out k > 1, and in both cases k times the browser's own
 *  factor is identity: the render never moves. On a same-dpr resize the
 *  plate re-baselines and the layout is fluid again. (No outer/innerWidth
 *  zoom probe anywhere — that machinery was retired for lying.)
 *
 *  The lever is CSS `zoom` on <body> (never transform: it participates in
 *  layout, keeps scrollbars honest, and does not become a containing block
 *  for position:fixed — nav, HUD and cursor stay viewport-pinned). With
 *  body zoomed, body's own coordinate space is exactly `plate` px wide, so
 *  everything inside resolves on the plate forever.
 *
 *  Leaks the factor cannot catch, owed by the locked pages' stylesheets:
 *  viewport units (vw/vh get premultiplied by element zoom — pin fluid
 *  values under `@media (pointer: fine)`, or divide full-viewport intents
 *  by --plate: calc(100svh / var(--plate, 1)) always fills the real
 *  screen), and viewport media queries (gate phone blocks on `pointer:
 *  coarse` — a zoomed-in desktop viewport is not a phone). Coarse pointers
 *  never lock: phones and tablets keep their responsive layout untouched.
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
  const floor = opts.designW ?? POSTER_W;
  let plate = 0; // the locked canvas width (baseline viewport)
  let lastDpr = 0;
  const fit = () => {
    const w = document.documentElement.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    // same dpr = a true window resize (or first run): re-baseline.
    // dpr shifted = browser zoom: HOLD the plate — that is the whole lock.
    if (!plate || dpr === lastDpr) plate = Math.max(w, floor);
    lastDpr = dpr;
    const k = w / plate;
    document.body.style.setProperty('zoom', String(k));
    // viewport units inside the zoomed body get premultiplied by k (measured:
    // 100svh rendered k-short) — full-viewport intents divide by --plate
    document.body.style.setProperty('--plate', String(k));
    // --zw = 1% of the plate: every fluid clamp evaluates at the baseline
    // width and therefore never moves under zoom
    document.body.style.setProperty('--zw', `${plate / 100}px`);
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
