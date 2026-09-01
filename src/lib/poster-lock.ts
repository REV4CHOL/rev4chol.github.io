/** POSTER LOCK — a page that arms this renders on a fixed-width plate, and
 *  browser zoom changes NOTHING about it: not size, not placement, not
 *  layout — in EITHER direction (owner decree: benchmark at 100%, the
 *  render must be pixel-identical at every zoom level).
 *
 *  THE PLATE IS THE MONITOR — stateless, so nothing can ever stick:
 *  plate = max(1440, screen.width). screen.width is measured in
 *  zoom-independent units and always describes the display the window is
 *  on, so k = clientWidth / plate is a PURE FUNCTION of the current
 *  moment: k = 1 at 100% on every monitor (the classic fluid layout at
 *  native width — a wide monitor is NOT a magnified 1440, that balloon
 *  was rejected); browser zoom moves clientWidth but not the plate, so
 *  zoom-in gives k < 1, zoom-out k > 1, and k times the browser's own
 *  factor is identity in BOTH directions — the render never moves, and a
 *  visitor who arrives pre-zoomed still sees the 100% benchmark. Monitor
 *  hops update screen.width and the very next fit is correct.
 *
 *  Every EVENT-BASELINE version of this died in production: dpr-only
 *  tells hold the wrong plate on monitor hops, and dpr+width prediction
 *  cannot work at all — two monitors of equal physical resolution at
 *  different OS scales produce EXACTLY the zoom signature (width scales
 *  by the inverse dpr ratio), so hop and zoom are indistinguishable from
 *  events. Only a zoom-immune anchor read fresh each time survives; do
 *  not reintroduce state or heuristics here. A window narrower than the
 *  monitor renders the monitor's composition scaled down — that is the
 *  poster model, not a bug.
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
  const fit = () => {
    const w = document.documentElement.clientWidth;
    if (w <= 0) return; // a hidden/collapsing viewport reads 0 — never apply it
    // stateless: the plate is the CURRENT monitor, read fresh every time
    const plate = Math.max(floor, window.screen?.width || w);
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
  // Re-assert on every re-entry, then once more after the window settles —
  // a mid-restore read can be transiently wrong, and with no follow-up
  // event a bad k would stick until refresh. fit() is idempotent and cheap.
  const refit = () => {
    fit();
    setTimeout(fit, 280);
  };
  window.addEventListener('pageshow', refit);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refit();
  });
}

/** Effective poster zoom (1 wherever no lock is armed). JS that positions a
 *  fixed element from clientX/clientY must divide by this: pointer coords
 *  arrive in viewport px, but a fixed element inside the zoomed body lays
 *  out in the plate's own px. */
export function posterZoom(): number {
  return parseFloat(document.body.style.getPropertyValue('zoom')) || 1;
}
