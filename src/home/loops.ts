/** The homepage reel contract, pure and testable. The owner drops up to
 *  LOOP_SLOTS short clips at /content/home/loop-N.(mp4|webm|gif); whatever
 *  exists becomes the reel, in slot order — no manifest, no rebuild.
 *  hero.ts owns the WebGL side. */

export const LOOP_SLOTS = 8;
export const LOOP_EXTS = ['mp4', 'webm', 'gif'] as const;

/** How long each clip holds the screen before a datamosh cut. */
export const CLIP_MS = 3000;

export interface LoopCandidate { slot: number; ext: string; url: string }

/** Probe order: per slot, the first candidate that exists claims it —
 *  extensions in LOOP_EXTS order, and both spellings of each (loop-N and
 *  loop_N), so an underscore-named drop still joins the reel. */
export function loopCandidates(base = '/content/home'): LoopCandidate[][] {
  const slots: LoopCandidate[][] = [];
  for (let slot = 1; slot <= LOOP_SLOTS; slot++) {
    slots.push(
      LOOP_EXTS.flatMap((ext) => [
        { slot, ext, url: `${base}/loop-${slot}.${ext}` },
        { slot, ext, url: `${base}/loop_${slot}.${ext}` },
      ]),
    );
  }
  return slots;
}

/** Cover-fit scale for media of (mw, mh) filling (vw, vh), with the same
 *  slight overscan the image hero uses to hide split/displacement edges. */
export function coverScale(mw: number, mh: number, vw: number, vh: number, overscan = 1.04): number {
  if (mw <= 0 || mh <= 0) return 1;
  return Math.max(vw / mw, vh / mh) * overscan;
}

/** Next clip index; single-clip reels never advance. */
export function nextClip(current: number, count: number): number {
  if (count <= 1) return current;
  return (current + 1) % count;
}

/** Parse the accent strings setAccent() writes: `hsl(H S% L%)`. */
export function parseHsl(accent: string): { h: number; s: number; l: number } | null {
  const m = accent.match(/hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)/i);
  if (!m) return null;
  return { h: parseFloat(m[1]) % 360, s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

/** The statement's first word follows the footage: the sampled accent's hue
 *  names the dream. Washed-out clips dream in SILVER. */
export function colorWord(h: number, s: number): string {
  if (s < 14) return 'SILVER';
  const hue = ((h % 360) + 360) % 360;
  if (hue < 15 || hue >= 345) return 'CRIMSON';
  if (hue < 45) return 'AMBER';
  if (hue < 72) return 'GOLDEN';
  if (hue < 160) return 'VERDANT';
  if (hue < 200) return 'TEAL';
  if (hue < 252) return 'COBALT';
  if (hue < 292) return 'PURPLE';
  return 'MAGENTA';
}
