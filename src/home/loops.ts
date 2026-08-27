/** The homepage reel contract, pure and testable. The owner drops up to
 *  LOOP_SLOTS short clips at /content/home/loop-N.(mp4|webm|gif); whatever
 *  exists becomes the reel, in slot order — no manifest, no rebuild.
 *  hero.ts owns the WebGL side. */

export const LOOP_SLOTS = 8;
export const LOOP_EXTS = ['mp4', 'webm', 'gif'] as const;

/** How long each clip holds the screen before a datamosh cut. */
export const CLIP_MS = 3000;

export interface LoopCandidate { slot: number; ext: string; url: string }

/** Probe order: per slot, the first extension that exists claims it. */
export function loopCandidates(base = '/content/home'): LoopCandidate[][] {
  const slots: LoopCandidate[][] = [];
  for (let slot = 1; slot <= LOOP_SLOTS; slot++) {
    slots.push(LOOP_EXTS.map((ext) => ({ slot, ext, url: `${base}/loop-${slot}.${ext}` })));
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
