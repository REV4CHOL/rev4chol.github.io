import { reducedMotion } from './env';

export const GLYPHS = '░▒▓█<>/|\\=+*#@$%&0123456789';

export function scrambleFrame(target: string, progress: number, rand: () => number): string {
  const p = Math.min(1, Math.max(0, progress));
  const reveal = Math.floor(target.length * p);
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (ch === ' ' || ch === '\n') { out += ch; continue; }
    out += i < reveal ? ch : GLYPHS[Math.floor(rand() * GLYPHS.length)];
  }
  return out;
}

export function scrambleEl(el: HTMLElement, text?: string, durationMs = 700): Promise<void> {
  const target = text ?? el.textContent ?? '';
  if (reducedMotion() || durationMs <= 0) {
    el.textContent = target;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const p = (now - t0) / durationMs;
      if (p >= 1) { el.textContent = target; resolve(); return; }
      el.textContent = scrambleFrame(target, p, Math.random);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
