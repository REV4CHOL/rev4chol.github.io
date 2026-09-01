import { finePointer, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';

let labelEl: HTMLSpanElement | null = null;

export function setCursorLabel(text: string | null): void {
  if (!labelEl) return;
  labelEl.textContent = text ?? '';
  labelEl.parentElement?.classList.toggle('has-label', !!text);
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
    const t = (e.target as Element).closest?.('[data-cursor]');
    setCursorLabel(t ? (t as HTMLElement).dataset.cursor || null : null);
  });
}
