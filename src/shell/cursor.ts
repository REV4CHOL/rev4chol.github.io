import { finePointer, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';

let labelEl: HTMLSpanElement | null = null;

export function setCursorLabel(text: string | null): void {
  if (!labelEl) return;
  labelEl.textContent = text ?? '';
  labelEl.parentElement?.classList.toggle('has-label', !!text);
}

/** What the pointer's target says the label should be: the nearest `data-cursor`'s text, `null` when nothing is
 *  labelled — and `undefined` over a canvas, which owns its own label (the works floor sets ENTER ▸ per pane).
 *  Before this, the DOM `pointerover` of the pointer entering the canvas bubbled here, found no `data-cursor` and
 *  wiped the label the floor had just set: the first pane hovered never showed ENTER ▸ (owner's testers,
 *  2026-09-27: "what to click on"). */
export function cursorLabelFor(
  target: { closest?: (selector: string) => unknown } | null | undefined,
): string | null | undefined {
  if (target?.closest?.('canvas')) return undefined;
  const t = target?.closest?.('[data-cursor]') as { dataset?: Record<string, string | undefined> } | null | undefined;
  return t ? t.dataset?.cursor || null : null;
}

export function initCursor(): void {
  if (!finePointer() || reducedMotion()) return;
  const c = document.createElement('div');
  c.id = 'cursor';
  c.innerHTML = `<div class="x"></div><span class="cursor-label"></span><span class="cursor-coords"></span>`;
  document.body.append(c);
  document.body.classList.add('cursor-live');
  labelEl = c.querySelector('.cursor-label');
  const coordsEl = c.querySelector('.cursor-coords') as HTMLSpanElement;
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    const { clientX, clientY } = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      // pointer coords are viewport px; on a poster-locked page the cursor
      // element lays out in the zoomed plate's px — divide or it drifts
      const z = posterZoom();
      c.style.transform = `translate3d(${clientX / z}px, ${clientY / z}px, 0)`;
      coordsEl.textContent = `${String(clientX).padStart(4, '0')} ${String(clientY).padStart(4, '0')}`;
    });
  });
  document.addEventListener('pointerover', (e) => {
    const label = cursorLabelFor(e.target as Element);
    if (label !== undefined) setCursorLabel(label);
  });
}
