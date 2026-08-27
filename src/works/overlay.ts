/** The orthogonal layer.
 *
 *  The floor is one continuous 45° shear; on its own that reads as an Escher
 *  carpet, because nothing disagrees with it. Everything here is hard-square and
 *  screen-fixed, so the composition has two axes fighting — which is what the
 *  reference posters actually do. Type-forward, dense, technical, no atmosphere. */

const CHEVRONS = Array.from({ length: 9 }, (_, i) =>
  `<path d="M${i * 22} 0 L${i * 22 + 13} 8 L${i * 22} 16 L${i * 22 + 5} 8 Z"/>`,
).join('');

const CHECKERS = Array.from({ length: 24 }, (_, i) =>
  (i % 2 ? '' : `<rect x="${i * 9}" y="0" width="9" height="9"/><rect x="${i * 9 + 9}" y="9" width="9" height="9"/>`),
).join('');

function telemetry(n: number): string {
  const rows: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = String((i * 1237 + 4021) % 9000 + 1000);
    const b = ['OK', 'RDY', 'SYNC', 'IDLE', '+++'][i % 5];
    rows.push(`<span>ASC-${a}<b>${b}</b></span>`);
  }
  return rows.join('');
}

export function mountWorksOverlay(count: number): void {
  const o = document.createElement('div');
  o.className = 'wk-overlay';
  o.setAttribute('aria-hidden', 'true');
  o.innerHTML = `
    <div class="wk-masthead">
      <p class="wk-kicker">REVACHOL ／ INDEX 2020—2026</p>
      <h1 class="wk-title" data-text="WORK">WORK</h1>
      <div class="wk-pills">
        <span class="pill pill-signal">${String(count).padStart(2, '0')} ENTRIES</span>
        <span class="pill pill-alert">DRAG ／ SCROLL</span>
        <span class="pill pill-ghost">A0032∷004</span>
      </div>
    </div>

    <div class="wk-spine">SELECTED WORK</div>

    <div class="wk-telemetry">${telemetry(9)}</div>

    <svg class="wk-chev" viewBox="0 0 190 16" preserveAspectRatio="none">${CHEVRONS}</svg>
    <svg class="wk-check" viewBox="0 0 216 18" preserveAspectRatio="none">${CHECKERS}</svg>

    <span class="wk-reg wk-reg-tl"></span>
    <span class="wk-reg wk-reg-tr"></span>
    <span class="wk-reg wk-reg-bl"></span>
    <span class="wk-reg wk-reg-br"></span>
  `;
  document.body.append(o);
}
