/** The orthogonal layer.
 *
 *  The floor is one continuous 45° shear; everything here is hard-square and
 *  screen-fixed so a second axis exists against it. Pared back to the four
 *  corner registration marks — the masthead, pills, spine, chevrons,
 *  checkerboard and telemetry were removed as redundant (owner direction,
 *  2026-08-27): the carpet and the HUD already carry that information. */

export function mountWorksOverlay(): void {
  const o = document.createElement('div');
  o.className = 'wk-overlay';
  o.setAttribute('aria-hidden', 'true');
  o.innerHTML = `
    <span class="wk-reg wk-reg-tl"></span>
    <span class="wk-reg wk-reg-tr"></span>
    <span class="wk-reg wk-reg-bl"></span>
    <span class="wk-reg wk-reg-br"></span>
  `;
  document.body.append(o);
}
