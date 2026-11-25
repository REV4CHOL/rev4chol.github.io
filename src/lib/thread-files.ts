/** THE THREAD'S PICTURES (owner, 2026-11-25: the film's thread stands where the synopsis stood). Pure rules shared by
 *  scripts/make-threads.mjs, the build's manifest, the film page and the tests: which stills a thread shows, what a
 *  still is called, and how small its copy is. */
export const THREAD_FRAMES = 6;
export const THREAD_LONG_SIDE = 192;
export const THREAD_SATURATION = 0.15;
export const THREAD_DIR = 'thread';
export type ThreadEntry = [code: string, w: number, h: number];

const PART_NAME = /^(\d+)-\d+\.\w+$/; // (a still named by part: src/project/pillars.ts)
const pad2 = (n: number) => String(n).padStart(2, '0');

export function wallOrder(files: readonly string[]): string[] {
  return [...files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function threadPicks(count: number, want = THREAD_FRAMES): number[] {
  if (count <= 0) return [];
  if (count <= want) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: want }, (_, i) => Math.round((i * (count - 1)) / (want - 1)));
}

export function stillCode(part: number, place: number): string {
  return part > 0 ? `${part}-${pad2(place)}` : pad2(place);
}

export function wallCodes(files: readonly string[], vertical: boolean): string[] {
  const parts = files.map((f) => { const m = PART_NAME.exec(f); return m ? Number(m[1]) : 0; });
  const pillars = vertical && parts.every((n) => n > 0) && new Set(parts).size > 1;
  if (!pillars) return files.map((_, i) => stillCode(0, i + 1));
  const seen = new Map<number, number>();
  return parts.map((part) => { const place = (seen.get(part) ?? 0) + 1; seen.set(part, place); return stillCode(part, place); });
}
