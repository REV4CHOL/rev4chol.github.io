import { finePointer, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';

let labelEl: HTMLSpanElement | null = null;
/** Who wrote the label on show: the page's chrome (a `data-cursor` under the pointer) — or a canvas's own code. */
let chromeWrote = false;

function paint(text: string | null): void {
  if (!labelEl) return;
  labelEl.textContent = text ?? '';
  labelEl.parentElement?.classList.toggle('has-label', !!text);
}

/** A canvas's own code names the label (the works floor: ENTER ▸ over a pane, nothing once the pane lets go). */
export function setCursorLabel(text: string | null): void {
  chromeWrote = false;
  paint(text);
}

/** What the label becomes as the pointer comes over `target`: the nearest `data-cursor`'s text, `null` when nothing
 *  there is labelled. Over a canvas, which names its own labels: `undefined` (leave it) while the label on show is
 *  the canvas's own, `null` when the page's chrome left it there.
 *  - Leave it: the DOM `pointerover` of the pointer entering the canvas bubbles here AFTER the floor has set ENTER ▸;
 *    wiping it hid ENTER ▸ on the first pane hovered (owner's testers, 2026-09-27: "what to click on").
 *  - Clear it: a chapter tab's SWITCH ▸ rode the pointer out onto the floor's bare ground and stuck there — the
 *    floor only writes the label as a pane wakes or lets go (owner, 2026-09-27: "that "Switch" still stick"). */
export function cursorLabelFor(
  target: { closest?: (selector: string) => unknown } | null | undefined,
  labelFromChrome: boolean,
): string | null | undefined {
  if (target?.closest?.('canvas')) return labelFromChrome ? null : undefined;
  const t = target?.closest?.('[data-cursor]') as { dataset?: Record<string, string | undefined> } | null | undefined;
  return t ? t.dataset?.cursor || null : null;
}

/** Whether any of the cursor's parts (the cross, its label, its readout: viewport boxes) meets any of a film's frames.
 *  Inside a frame the page hears no pointer at all (Chrome sends it neither a move nor a pointerover nor a pointerout:
 *  measured), so the cross would stand parked on the picture's edge, its readout over the film: it steps aside as soon
 *  as any part of it would touch a frame, while the page can still see it coming. */
export function meetsAny(parts: readonly Rect[], frames: readonly Rect[]): boolean {
  return parts.some((a) => frames.some((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
}
interface Rect { left: number; top: number; right: number; bottom: number }

/** The readout beside the crosshair: whole pixels, four digits each. Pointer coordinates come fractional under
 *  display scaling and on precision touchpads, and printed raw they read "258.3125 434.5597755859375". */
export function cursorCoords(x: number, y: number): string {
  return `${String(Math.round(x)).padStart(4, '0')} ${String(Math.round(y)).padStart(4, '0')}`;
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
      coordsEl.textContent = cursorCoords(clientX, clientY);
      // the cross, its label and its readout step aside wherever they would stand on a film's frame; a frame the site's
      // own player covers (its catcher, project/player-bar.ts: `data-covered`) is the page's again, and the cross stays
      const frames = [...document.getElementsByTagName('iframe')].filter((f) => !f.hasAttribute('data-covered'));
      c.classList.toggle('in-frame', frames.length > 0 && meetsAny(
        [...c.children].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0),
        [...frames].map((f) => f.getBoundingClientRect()),
      ));
    });
  });
  document.addEventListener('pointerover', (e) => {
    // the cross boxes itself over everything that can be pressed, labelled or not (the native hand is hidden)
    c.classList.toggle('on-link', !!(e.target as Element).closest?.('a, button'));
    const label = cursorLabelFor(e.target as Element, chromeWrote);
    if (label === undefined) return;
    paint(label);
    chromeWrote = true;
  });
}
