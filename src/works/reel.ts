/** WORK ON A PHONE: THE REEL (owner, 2026-10-20: "Work main section's overall design only works on PC and tablet. But on
 *  Phone, its completely overwhelming and disorienting … I want a complete redesign of the interface of the Work
 *  section, still keeping the fundamental art direction, but changing the UI/UX specifically for Phones").
 *
 *  On a phone the section is a showreel: one film to a frame, a swipe per film, the floor's pane dress on each, a scrub
 *  rail down the edge and the chapters at the thumb's reach. Pure: which screens get it, a frame's sizes and words, the
 *  rail's scrub; works/reel-view.ts builds it. */

/** A phone: touch, and narrow (portrait) or short (landscape). A tablet and a desktop keep the floor. */
export function reelMode(m: { coarse: boolean; width: number; height: number }): boolean {
  return m.coarse && (m.width <= 640 || m.height <= 500);
}
/** The same test as a media query, for the page's one look at the screen when it loads. */
export const REEL_QUERY = '(pointer: coarse) and (max-width: 640px), (pointer: coarse) and (max-height: 500px)';

/** The share of a frame's height the pane may take, by the film's shape: a vertical film stands tall, a scope film
 *  leaves the most room for its words. */
export function paneShare(ratio: number): number {
  if (ratio < 1) return 0.62;
  if (ratio > 2) return 0.4;
  if (ratio < 1.5) return 0.5;
  return 0.46;
}

/** The pane's box in `maxW` × `maxH`, px: the film's own shape, as wide as it can stand, never taller than `maxH` —
 *  never cropped to another shape (a vertical film stands vertical). */
export function paneSize(ratio: number, maxW: number, maxH: number): { w: number; h: number } {
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  return { w: Math.round(w), h: Math.round(h) };
}

/** The title's size, px: as big as the column allows its longest word (Clash Display 700, upper case, runs about
 *  0.7 em a letter with its tracking), between 22 and 52, a longer title a step smaller. One unbreakable name
 *  (MR_PURPLE_DREAMS_IN_ELECTRIC_FISH) stays at the floor and breaks where it must. */
export function titleSize(title: string, width: number): number {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  const longest = Math.max(1, ...words.map((w) => [...w].length));
  const byWord = width / (longest * 0.7);
  const n = title.length;
  const byLength = n > 36 ? 26 : n > 22 ? 32 : n > 12 ? 40 : 52;
  return Math.floor(Math.max(22, Math.min(52, byWord, byLength)));
}

/** How many of a film's stills stand in its contact strip under the pane: four of a vertical film's, three of
 *  another's, each in the film's own shape. */
export const contactCount = (ratio: number, have: number): number => Math.min(have, ratio < 1 ? 4 : 3);

/** The synopsis's first sentence, cut at a whole word by `max` characters (the film page holds the rest). */
export function teaser(synopsis: string, max = 140): string {
  const s = synopsis.trim().replace(/\s+/g, ' ');
  if (!s) return '';
  const first = /^(.+?[.!?])(?:\s|$)/.exec(s)?.[1] ?? s;
  if (first.length <= max) return first;
  const cut = first.slice(0, max + 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > 0 ? cut.slice(0, at) : cut.slice(0, max)).replace(/[\s,;:—–-]+$/, '')}…`;
}

/** A frame's number in its reel, two digits: 01, 02 … */
export const frameNumber = (i: number): string => String(i + 1).padStart(2, '0');

/** A film's code on its pane (the floor's `RVL/xxxx`), the same for a film on every visit. */
export function frameCode(slug: string): string {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `RVL/${1000 + (h % 9000)}`;
}

/** The film's edge code beside the sprockets: `RVL ▸ 07 ▸ CH·01`. */
export const edgeCode = (i: number, chapterIndex: string): string => `RVL ▸ ${frameNumber(i)} ▸ ${chapterIndex}`;

/** Scrubbing the rail: the film under a thumb at `y` on a rail `h` tall holding `n` films. */
export function railIndex(y: number, h: number, n: number): number {
  if (n <= 0 || h <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.floor((y / h) * n)));
}

/** Which frame stands in the gate when the reel has scrolled `top` px with frames `step` px apart. */
export function gateIndex(top: number, step: number, frames: number): number {
  if (frames <= 0 || step <= 0) return 0;
  return Math.max(0, Math.min(frames - 1, Math.round(top / step)));
}

const films = (n: number) => `${n} ${n === 1 ? 'FILM' : 'FILMS'}`;
/** The reel's words: its controls in plain sentences, the house's codes as they are. */
export const REEL_WORDS = {
  open: 'OPEN THIS FILM ▸',
  all: 'LIST ▸',
  allLabel: (total: number): string => `List all ${total} ${total === 1 ? 'film' : 'films'}`,
  /** a chapter's small line in the foot: its index and its count */
  chapterLine: (index: string, count: number): string => `${index} ▪ ${films(count)}`,
  back: '◂ BACK TO THE REEL',
  cue: (more: number): string => `SCROLL DOWN FOR ${more} MORE ${more === 1 ? 'FILM' : 'FILMS'} ▾`,
  eof: (index: string, n: number): string => `EOF ▪ ${index} ▪ ${films(n)}`,
  tune: (index: string, name: string, more: number): string => `TUNE TO ${index} ▸ ${name} — ${more} MORE ${more === 1 ? 'FILM' : 'FILMS'}`,
  list: (total: number): string => `SEE ALL ${films(total)} IN A LIST ▸`,
  chapter: (index: string, name: string): string => `${index} ▸ ${name}`,
};
