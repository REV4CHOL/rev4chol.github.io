import '../styles/stats.css';
import { heapBytes } from '../lib/meter';
import { watchPressure } from '../lib/pressure';
import { quality } from '../lib/quality';
import { floorReadings, readoutLines } from '../lib/readout';

/** THE READOUT'S PANEL (`?stats=1` on any page; the shell loads this file only then). Eight lines in the house's mono
 *  type at the left edge, refreshed once a second, and a COPY button that puts them on the clipboard as text. It
 *  reads what the page already knows and sends nothing anywhere. The lines themselves are lib/readout.ts. */
export function mountStats(): void {
  if (document.getElementById('rvl-stats')) return;
  const panel = document.createElement('aside');
  panel.id = 'rvl-stats';
  panel.setAttribute('aria-label', 'Performance readout');
  const lines = document.createElement('pre');
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'COPY';
  panel.append(lines, copy);
  document.body.append(panel);

  const pressure = watchPressure();
  // frames a second over the last second, counted here: a page that is not sampled by the ladder still has a number
  let frames = 0;
  let since = performance.now();
  const count = (): void => {
    frames++;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);

  let text = '';
  let first = true;
  const refresh = (): void => {
    const now = performance.now();
    const fps = first || now <= since ? null : (frames * 1000) / (now - since);
    first = false;
    frames = 0;
    since = now;
    text = readoutLines(quality.report(), fps, floorReadings(), heapBytes(), pressure(), now).join('\n');
    lines.textContent = text;
  };
  refresh();
  window.setInterval(refresh, 1000);

  copy.addEventListener('click', () => {
    const done = navigator.clipboard?.writeText(text);
    if (!done) return; // (no clipboard here: the lines are read off the screen)
    void done.then(() => {
      copy.textContent = 'COPIED';
      window.setTimeout(() => { copy.textContent = 'COPY'; }, 1200);
    }).catch(() => { /* refused: the lines are read off the screen */ });
  });
}
