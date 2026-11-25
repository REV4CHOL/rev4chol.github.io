import '../styles/stats.css';
import { heapBytes } from '../lib/meter';
import { watchPressure } from '../lib/pressure';
import { quality } from '../lib/quality';
import { playerLine, playerRecords } from '../lib/player-record';
import { floorReadings, fxOff, hitchLine, readoutLines, reelLine, type ReelReading, touchLine, type TouchReading } from '../lib/readout';

/** THE READOUT'S PANEL (`?stats=1` on any page; the shell loads this file only then). Nine lines in the house's mono
 *  type at the left edge, refreshed once a second, and a COPY button that puts them on the clipboard as text. It
 *  reads what the page already knows and sends nothing anywhere. The first eight lines are lib/readout.ts; the
 *  ninth, PLAYER, says which player a film page gave its film and why (lib/player-record.ts). After them, HITCHES:
 *  the page's own late frames since the panel opened; and on WORK's phone strip, REEL: what the strip's loops are doing.
 *  `?fx=off` beside it takes the grain and the scan lines away (a reading of what they cost on a real device). */
export function mountStats(): void {
  if (document.getElementById('rvl-stats')) return;
  if (fxOff(location.search)) document.documentElement.classList.add('rvl-nofx');
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
  // the page's hitches since the panel opened: a frame more than 50 ms after the one before. The first three seconds
  // (the page's own arrival) are not counted, nor the wait across a hidden tab.
  const opened = performance.now();
  let lastFrame = 0, hitches = 0, longest = 0, lowest: number | null = null, away = false;
  const count = (t: number): void => {
    frames++;
    if (lastFrame && t - opened > 3000) {
      const gap = t - lastFrame;
      if (gap > longest) longest = gap;
      if (gap > 50) hitches++;
    }
    lastFrame = t;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
  document.addEventListener('visibilitychange', () => { lastFrame = 0; away = true; });
  /** WORK's phone strip, as it stands (works/reel-view.ts hands it over); null on every other page */
  const reel = (): ReelReading | null => {
    const r = (window as unknown as { rvlWorkReel?: { mode(): ReelReading['mode']; loops(): number; playing(): unknown[]; rolling(): boolean; pin(): string | null; pictures(): number } }).rvlWorkReel;
    return r ? { mode: r.mode(), loaded: r.loops(), playing: r.playing().length, rolling: r.rolling(), pin: r.pin(), pictures: r.pictures() } : null;
  };
  /** what the strip's touches started (null where no play() was refused, and on every other page) */
  const touch = (): TouchReading | null => (window as unknown as { rvlWorkReel?: { touch(): TouchReading | null } }).rvlWorkReel?.touch() ?? null;

  let text = '';
  let first = true;
  const refresh = (): void => {
    const now = performance.now();
    const fps = first || now <= since ? null : (frames * 1000) / (now - since);
    first = false;
    frames = 0;
    since = now;
    if (away || document.hidden) away = false; // (a second that held a hidden tab says nothing)
    else if (fps !== null && now - opened > 4000) lowest = lowest === null ? fps : Math.min(lowest, fps);
    const seconds = Math.max(0, Math.round((now - opened - 3000) / 1000));
    text = [
      ...readoutLines(quality.report(), fps, floorReadings(), heapBytes(), pressure(), now), playerLine(playerRecords()),
      hitchLine({ hitches, longest, lowest, seconds }), reelLine(reel()), touchLine(touch()),
    ].filter((l): l is string => l !== null).join('\n');
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
