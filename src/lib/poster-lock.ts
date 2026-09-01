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
 *  THE ZOOM TELL (two-factor): browser zoom scales devicePixelRatio AND
 *  shrinks the viewport by exactly the inverse ratio. Only when BOTH agree
 *  (dpr shifted, width ≈ lastW·lastDpr/dpr) does the plate HOLD — zoom-in
 *  gives k < 1, zoom-out k > 1, and in both cases k times the browser's
 *  own factor is identity: the render never moves. A dpr shift whose width
 *  does NOT match the prediction is a monitor hop or an OS-scale change —
 *  re-baseline, or the old monitor's plate sticks and everything renders
 *  miniature until a refresh (the bug that shipped first). A same-dpr
 *  width change is a true window resize — re-baseline, fluid again. And
 *  when NOTHING changed, fit is a no-op — tab switches and bfcache
 *  restores must never disturb a held zoom. (No outer/innerWidth zoom
 *  probe anywhere — that machinery was retired for lying.)
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
  let lastW = 0;
  let lastDpr = 0;
  const fit = () => {
    const w = document.documentElement.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    if (w <= 0) return; // a hidden/collapsing viewport reads 0 — never bake it
    if (!plate) {
      plate = Math.max(w, floor);
    } else if (dpr !== lastDpr) {
      // dpr moved: zoom if the width moved by exactly the inverse ratio
      // (scrollbar slack allowed) — otherwise a monitor hop / OS-scale
      // change, which is a NEW baseline, not a zoom to counter
      const predicted = lastW * (lastDpr / dpr);
      if (Math.abs(w - predicted) > Math.max(32, predicted * 0.03)) plate = Math.max(w, floor);
    } else if (w !== lastW) {
      plate = Math.max(w, floor); // true window resize: fluid re-baseline
    }
    // nothing changed → plate untouched: tab switches are no-ops
    lastW = w;
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
