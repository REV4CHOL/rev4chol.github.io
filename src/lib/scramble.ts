import { reducedMotion } from './env';

export const GLYPHS = '░▒▓█<>/|\\=+*#@$%&0123456789';

export function scrambleFrame(target: string, progress: number, rand: () => number): string {
  const p = Math.min(1, Math.max(0, progress));
  const reveal = Math.floor(target.length * p);
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (ch === ' ' || ch === '\n' || ch === '\u200b') { out += ch; continue; } // (a soft break stays a soft break)
    out += i < reveal ? ch : GLYPHS[Math.floor(rand() * GLYPHS.length)];
  }
  return out;
}

/** The run each element's scramble is on: a newer run, or stopScramble, ends the one before it (a caption written
 *  anew mid-scramble kept the old name: the old run wrote over it to its last frame). */
const runs = new WeakMap<HTMLElement, number>();
let lastRun = 0;

/** End any scramble running on `el`: it writes nothing more. */
export function stopScramble(el: HTMLElement): void {
  runs.delete(el);
}

export function scrambleEl(el: HTMLElement, text?: string, durationMs = 700): Promise<void> {
  const target = text ?? el.textContent ?? '';
  if (reducedMotion() || durationMs <= 0) {
    runs.delete(el);
    el.textContent = target;
    return Promise.resolve();
  }
  const run = ++lastRun;
  runs.set(el, run);
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      if (runs.get(el) !== run) { resolve(); return; } // (given way)
      const p = (now - t0) / durationMs;
      if (p >= 1) { el.textContent = target; runs.delete(el); resolve(); return; }
      el.textContent = scrambleFrame(target, p, Math.random);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
