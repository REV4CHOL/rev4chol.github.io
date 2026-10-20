/** WORK ON A PHONE: THE REEL (owner, 2026-10-20: "Work main section's overall design only works on PC and tablet. But on
 *  Phone, its completely overwhelming and disorienting … I want a complete redesign of the interface of the Work
 *  section, still keeping the fundamental art direction, but changing the UI/UX specifically for Phones").
 *
 *  On a phone the section is a rolling strip of films, endless: each pane is the whole screen, its loop covering it,
 *  and on it only the film's name and its roles (owner, the same day, with two screenshots of antiantiart.com on a
 *  phone: "I would prefer the sizing of all panes on Phone in the work section to be like this website" — "only the
 *  Project name, and the Role names are enough"). It rolls on its own from arrival, and a finger takes it ("The moment
 *  we enter the work section, we can see the already continously scrolling down to the next film in a continuous
 *  strips. And we can slide our finger up and down to scroll through the strip"). Pure: which screens get it, the
 *  strip's arithmetic, its words, the loops' rule; works/reel-view.ts builds it. */

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

/* ---------------------------------------------------------------------- the rolling strip -- */

/** The strip's pace: one screen every ROLL_SECONDS. */
export const ROLL_SECONDS = 7;
/** After a finger lets go, the strip coasts to rest and waits this long before it rolls on. */
export const REST_AFTER_TOUCH_MS = 2500;
/** The coast's time constant, s: the strip's speed closes on its target by a factor e every COAST_TAU. */
export const COAST_TAU = 0.45;
/** A press that travels less than this, px, is a tap: it opens the film under it. */
export const TAP_SLOP = 8;
/** The fastest throw, px/s. */
export const MAX_THROW = 6000;

const mod = (a: number, m: number): number => ((a % m) + m) % m;

/** The film behind each pane of the strip: the chapter in order, laid twice or thrice when it holds one or two films,
 *  so the endless strip never shows a gap. */
export function stripOrder(films: number): number[] {
  if (films <= 0) return [];
  const laps = films >= 3 ? 1 : Math.ceil(3 / films);
  return Array.from({ length: films * laps }, (_, i) => i % films);
}

/** A pane's top on the screen, px: pane `i` of `n`, each `h` tall, the strip moved `offset` px on. Endless: every pane
 *  stands once in a lap, from one pane above the screen down to the lap's end. */
export function paneTop(i: number, offset: number, h: number, n: number): number {
  return mod(i * h - offset + h, n * h) - h;
}

/** The pane most in view: the one standing nearest square in the screen. */
export function paneInView(offset: number, h: number, n: number): number {
  return n > 0 && h > 0 ? mod(Math.round(offset / h), n) : 0;
}

/** The rail's playhead, 0..1 down the rail: on a pane's tick when that pane stands square in the screen. */
export function railProgress(offset: number, h: number, n: number): number {
  return n > 0 && h > 0 ? mod(offset + h / 2, n * h) / (n * h) : 0;
}

/** Where a touch `p` (0..1) down the rail moves the strip: that point of the lap square in the screen, on the lap the
 *  strip is already on (a scrub never spins it through a whole lap). */
export function offsetForRail(p: number, h: number, n: number, current: number): number {
  const lap = n * h;
  const target = Math.max(0, Math.min(1, p)) * lap - h / 2;
  return target + Math.round((current - target) / lap) * lap;
}

/** The strip's speed, px/s, eased toward `target` over `dt` s: a throw slows to rest, a rest swells into the roll. */
export function coast(v: number, target: number, dt: number, tau = COAST_TAU): number {
  return target + (v - target) * Math.exp(-Math.max(0, dt) / tau);
}

/** The finger's speed as it lets go, px/s along the strip (a finger moving up moves the strip on): its travel over the
 *  last 100 ms of moves, so a finger held still before it lifts throws nothing. `moves` are [ms, y px], oldest first. */
export function releaseSpeed(moves: readonly (readonly [number, number])[], now: number): number {
  const recent = moves.filter(([t]) => now - t <= 100);
  if (recent.length < 2) return 0;
  const [t0, y0] = recent[0], [t1, y1] = recent[recent.length - 1];
  if (t1 - t0 <= 0) return 0;
  const v = -((y1 - y0) / (t1 - t0)) * 1000;
  return Math.max(-MAX_THROW, Math.min(MAX_THROW, v));
}

/** A pane's words, standing `top`..`bottom` px on the screen as their pane passes, against the clear band between the
 *  header and the foot: whole inside it, fading out over `fade` px as they near either edge, gone under the chrome. */
export function capOpacity(top: number, bottom: number, bandTop: number, bandBottom: number, fade = 28): number {
  if (bandBottom <= bandTop) return 1;
  const below = (bandBottom - bottom) / fade, above = (top - bandTop) / fade;
  return Math.max(0, Math.min(1, below, above));
}

export type PanePlay = 'play' | 'rest' | 'free';
/** What a pane at `top` (px, `h` tall, on a screen `view` tall) does with its loop while the strip moves `dir`: on the
 *  screen, or the next to come in, it plays; within two screens it rests, loaded; further off it gives the video back. */
export function panePlay(top: number, h: number, view: number, dir: number): PanePlay {
  const bottom = top + h;
  if (bottom > 0 && top < view) return 'play';
  if (dir >= 0 && top >= view && top < view + h) return 'play';
  if (dir < 0 && bottom <= 0 && bottom > -h) return 'play';
  if (top < view + 2 * h && bottom > -2 * h) return 'rest';
  return 'free';
}

const films = (n: number) => `${n} ${n === 1 ? 'FILM' : 'FILMS'}`;
/** The reel's words: its controls in plain sentences, the house's codes as they are. None of them stands on a pane. */
export const REEL_WORDS = {
  all: 'LIST ▸',
  allLabel: (total: number): string => `List all ${total} ${total === 1 ? 'film' : 'films'}`,
  /** a chapter's small line in the foot: its index and its count */
  chapterLine: (index: string, count: number): string => `${index} ▪ ${films(count)}`,
  back: '◂ BACK TO THE REEL',
};
