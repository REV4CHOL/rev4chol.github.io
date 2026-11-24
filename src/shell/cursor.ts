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

/** What of the cursor shows (the review's walkthroughs, 2026-11-25: a keyboard user's Tab to a pane on WORK wrote OPEN ▸
 *  and its box on a cursor that had never moved, in the screen's top-left corner):
 *  - nothing until the pointer has moved once: the cursor stands only where the pointer has been;
 *  - while the keyboard drives (a key pressed since the pointer last moved), the cross stays where the mouse rests, but
 *    without a tag: a tag names what is under the pointer, and a pane the keyboard brought forward is not; its box
 *    stays only over a link really under it. The next move of the mouse gives it all back. */
export function cursorParts(s: { moved: boolean; keyed: boolean; onLink: boolean }): { shown: boolean; tag: boolean; box: boolean } {
  return { shown: s.moved, tag: !s.keyed, box: s.onLink || !s.keyed };
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
  let moved = false, keyed = false, onLink = false;
  const shape = () => {
    const p = cursorParts({ moved, keyed, onLink });
    c.classList.toggle('is-unmoved', !p.shown);
    c.classList.toggle('no-tag', !p.tag);
    c.classList.toggle('no-box', !p.box);
  };
  shape();
  window.addEventListener('keydown', () => { if (!keyed) { keyed = true; shape(); } }, true);
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    const { clientX, clientY } = e;
    const mouse = e.pointerType === 'mouse' || e.pointerType === 'pen';
    if (mouse && keyed && moved) { keyed = false; shape(); } // (the mouse takes over again: its tag back)
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      // pointer coords are viewport px; on a poster-locked page the cursor
      // element lays out in the zoomed plate's px — divide or it drifts
      const z = posterZoom();
      c.style.transform = `translate3d(${clientX / z}px, ${clientY / z}px, 0)`;
      coordsEl.textContent = cursorCoords(clientX, clientY);
      if (mouse && !moved) { moved = true; keyed = false; shape(); } // (shown once it stands where the pointer is)
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
    onLink = c.classList.contains('on-link');
    if (keyed) shape();
    const label = cursorLabelFor(e.target as Element, chromeWrote);
    if (label === undefined) return;
    paint(label);
    chromeWrote = true;
  });
}
