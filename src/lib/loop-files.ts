/** Pure rules for which files in a project folder count as its loop clip —
 *  shared by the dev/build manifest scanner (node side) and the tests. */

export const LOOP_VIDEO_RE = /\.(mp4|webm|mov|m4v)$/i;

/** Names that are never the pane loop, whatever else the folder holds. */
export const RESERVED_VIDEO_NAMES = ['hover.mp4', 'film.mp4'];

const CANON = ['preview.mp4', 'loop.mp4', 'loop_1.mp4', 'loop-1.mp4'];

/** Canonical names first (explicit owner intent), then the rest A→Z. */
export function sortLoopFiles(files: string[]): string[] {
  const rank = (f: string) => {
    const i = CANON.indexOf(f.toLowerCase());
    return i < 0 ? CANON.length : i;
  };
  return [...files].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Filter a folder listing down to loop candidates: video files, minus the
 *  reserved names and (when given) this project's self-hosted film file. */
export function pickLoopFiles(files: string[], alsoReserved: string[] = []): string[] {
  const reserved = new Set([...RESERVED_VIDEO_NAMES, ...alsoReserved].map((r) => r.toLowerCase()));
  return sortLoopFiles(files.filter((f) => LOOP_VIDEO_RE.test(f) && !reserved.has(f.toLowerCase())));
}
