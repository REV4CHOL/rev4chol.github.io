/** WORK ON A PHONE: THE REEL (owner, 2026-10-20: "Work main section's overall design only works on PC and tablet. But on
 *  Phone, its completely overwhelming and disorienting … I want a complete redesign of the interface of the Work
 *  section, still keeping the fundamental art direction, but changing the UI/UX specifically for Phones").
 *
 *  On a phone the section is a showreel: one film to a screen, a swipe per film. Each pane is the whole screen, its loop
 *  covering it, and on it only the film's name and its roles (owner, the same day, with two screenshots of
 *  antiantiart.com on a phone: "I would prefer the sizing of all panes on Phone in the work section to be like this
 *  website" — "only the Project name, and the Role names are enough. Do not clog this section up with texts"). Pure:
 *  which screens get it, its words, the loops' rule, the rail's scrub; works/reel-view.ts builds it. */

/** A phone: touch, and narrow (portrait) or short (landscape). A tablet and a desktop keep the floor. */
export function reelMode(m: { coarse: boolean; width: number; height: number }): boolean {
  return m.coarse && (m.width <= 640 || m.height <= 500);
}
/** The same test as a media query, for the page's one look at the screen when it loads. */
export const REEL_QUERY = '(pointer: coarse) and (max-width: 640px), (pointer: coarse) and (max-height: 500px)';

/** Loops play on every tier: a phone decodes an HTML video in its own hardware (the floor's tiers ration texture
 *  uploads, which the reel has none of). Only a visitor's Save-Data, or a 2g line where nothing streams, keeps the
 *  posters (owner, 2026-10-20: "I want the videos to play continuously on the pane via its loop … no loop play at all"). */
export function loopsAllowed(conn?: { saveData?: boolean; effectiveType?: string } | null): boolean {
  return !(conn && (conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g'));
}

/** A name's size, px, in Clash Display 700 (the display voice). It stands on one line when it can at ONE_LINE_MIN px
 *  or more, up to TITLE_MAX: one line reads quieter than two (PHILIA, MIEN VIEN, SODA COAST). A longer name wraps at
 *  its words from wrapStart(its length) down, never under TITLE_MIN, until its longest word fits. The view measures
 *  each name in its own face with its ▸ (works/reel-view.ts): a per-letter guess left KATARA's ▸ on a line alone. */
export const TITLE_MAX = 52;
export const ONE_LINE_MIN = 34;
export const TITLE_MIN = 22;

/** The one-line size of a name `widthAtMax` px wide at TITLE_MAX in a caption `room` px wide; null when one line would
 *  stand it under ONE_LINE_MIN. */
export function oneLineSize(widthAtMax: number, room: number): number | null {
  if (widthAtMax <= 0 || room <= 0) return null;
  const s = Math.floor((TITLE_MAX * room) / widthAtMax);
  return s >= ONE_LINE_MIN ? Math.min(TITLE_MAX, s) : null;
}

/** Where a wrapping name starts, by its length in letters: a longer name a step smaller. */
export const wrapStart = (n: number): number => (n > 36 ? 24 : n > 22 ? 28 : ONE_LINE_MIN);

/** A film's roles on its pane, as its record has them: upper case, joined by " / ", a role never broken inside (SOUND
 *  DESIGNER stays whole) and no line opening on a slash. */
export function roleLine(role: string): string {
  return role
    .split('/')
    .map((r) => r.trim().toUpperCase().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(' / ');
}

/** Scrubbing the rail: the film under a thumb at `y` on a rail `h` tall holding `n` films. */
export function railIndex(y: number, h: number, n: number): number {
  if (n <= 0 || h <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.floor((y / h) * n)));
}

/** Which pane stands in the gate when the reel has scrolled `top` px with panes `step` px apart. */
export function gateIndex(top: number, step: number, frames: number): number {
  if (frames <= 0 || step <= 0) return 0;
  return Math.max(0, Math.min(frames - 1, Math.round(top / step)));
}

const films = (n: number) => `${n} ${n === 1 ? 'FILM' : 'FILMS'}`;
/** The reel's words: its controls in plain sentences, the house's codes as they are. None of them stands on a pane. */
export const REEL_WORDS = {
  all: 'LIST ▸',
  allLabel: (total: number): string => `List all ${total} ${total === 1 ? 'film' : 'films'}`,
  /** a chapter's small line in the foot: its index and its count */
  chapterLine: (index: string, count: number): string => `${index} ▪ ${films(count)}`,
  back: '◂ BACK TO THE REEL',
  eof: (index: string, n: number): string => `EOF ▪ ${index} ▪ ${films(n)}`,
  tune: (index: string, name: string, more: number): string => `TUNE TO ${index} ▸ ${name} — ${more} MORE ${more === 1 ? 'FILM' : 'FILMS'}`,
  list: (total: number): string => `SEE ALL ${films(total)} IN A LIST ▸`,
};
