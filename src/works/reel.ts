/** WORK ON A PHONE: THE REEL (owner, 2026-10-20: "Work main section's overall design only works on PC and tablet. But on
 *  Phone, its completely overwhelming and disorienting … I want a complete redesign of the interface of the Work
 *  section, still keeping the fundamental art direction, but changing the UI/UX specifically for Phones").
 *
 *  On a phone the section is a rolling strip of films, endless: each pane has its loop covering it, and on it only the
 *  film's name and its roles (owner, the same day, with two screenshots of antiantiart.com on a phone: "I would prefer
 *  the sizing of all panes on Phone in the work section to be like this website" — "only the Project name, and the Role
 *  names are enough"). A pane was the whole screen then; it is half of it since 2026-11-24 (owner: "the panes are too
 *  long in length and should be shorten. we should be able to see two panes on the phone screen at the same time
 *  instead"), a vertical film's the whole of it. It rolls on its own from arrival, and a finger takes it ("The moment
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

/** The strip's pace: one screen every ROLL_SECONDS (owner, 2026-10-20, on the first roll at 7: "I want the auto
 *  scrolling to happen instantly, but slower and smoother"; then, at 12: "Even slower"). It rolls at this pace from the
 *  first frame, and a throw eases straight back into it. */
export const ROLL_SECONDS = 18;
/** The coast's time constant, s: the strip's speed closes on its target by a factor e every COAST_TAU. */
export const COAST_TAU = 0.45;
/** A press that travels less than this, px, is a tap: it opens the film under it. */
export const TAP_SLOP = 8;
/** The fastest throw, px/s. */
export const MAX_THROW = 6000;

const mod = (a: number, m: number): number => ((a % m) + m) % m;

/* ------------------------------------------------------ the strip, measured in units -- */
// (owner, 2026-11-24: "the panes are too long in length and should be shorten. we should be able to see two panes on
// the phone screen at the same time instead") Upright, a unit is half the screen's height: a pane is 1 unit, and a
// vertical film's is 2, the whole screen (vertical footage is never cropped wide). On its side, a unit is the screen's
// height and every pane is 1 unit. So the strip's rules take two heights, apart: the unit's and the screen's.

/** A phone held on its side: a short screen. The styles' sideways block asks the same line. */
export const SIDE_QUERY = '(max-height: 500px)';
/** The screen's height in units: two panes on an upright screen, one on a phone held on its side. */
export const screenUnits = (side: boolean): number => (side ? 1 : 2);
/** A pane's height in units: 1; a vertical film's is 2 on an upright screen. */
export const paneUnits = (vertical: boolean, side: boolean): number => (vertical && !side ? 2 : 1);
/** Each pane's place in the strip: the units before it. */
export function places(units: readonly number[]): number[] {
  let at = 0;
  return units.map((u) => { const here = at; at += u; return here; });
}
/** A lap of the strip, in units. */
export const lapUnits = (units: readonly number[]): number => units.reduce((a, u) => a + u, 0);

/** The strip's pace, px/s: one screen's height every ROLL_SECONDS, whatever a pane's height. */
export const rollPace = (view: number): number => view / ROLL_SECONDS;
/** How long a lap of `total` units takes at that pace, s. */
export const lapSeconds = (total: number, unit: number, view: number): number => (view > 0 ? ((total * unit) / view) * ROLL_SECONDS : 0);

/** The rail's ticks, 0..1 down the rail: one a film, at its middle along the chapter's lap, so a tall pane's stretch
 *  is twice as long. `units` are the chapter's films', in order. */
export function railTicks(units: readonly number[]): number[] {
  const total = lapUnits(units), at = places(units);
  return units.map((u, i) => (total > 0 ? (at[i] + u / 2) / total : 0));
}

/** Where the strip stands: the pane under the screen's middle, and how far down that pane the middle falls (0..1). It
 *  holds through a turn of the phone, when both heights change and a tall pane becomes one unit. */
export function stripPlace(offset: number, unit: number, view: number, units: readonly number[]): [pane: number, part: number] {
  const total = lapUnits(units);
  if (total <= 0 || unit <= 0) return [0, 0];
  const c = mod(offset + view / 2, total * unit) / unit; // (the lap's point under the screen's middle, in units)
  const at = places(units);
  let i = units.length - 1;
  while (i > 0 && at[i] > c) i--;
  return [i, (c - at[i]) / units[i]];
}
/** The offset that stands the strip at that place: `part` of pane `pane` under the screen's middle. */
export function offsetForPlace(pane: number, part: number, unit: number, view: number, units: readonly number[]): number {
  if (pane < 0 || pane >= units.length) return 0;
  return (places(units)[pane] + part * units[pane]) * unit - view / 2;
}
/** The offset that brings a pane (at `place`, `u` units tall) to the middle of the screen, on the lap nearest `current`:
 *  a pane as tall as the screen stands square in it. */
export function offsetForPane(place: number, u: number, unit: number, view: number, total: number, current: number): number {
  const lap = total * unit;
  const target = place * unit - (view - u * unit) / 2;
  return lap > 0 ? target + Math.round((current - target) / lap) * lap : target;
}

/** The film behind each pane of the strip: the chapter in order, laid again while it is too short for an endless
 *  strip. A pane leaves the top whole before it comes in again below the screen, so a lap must hold the screen and the
 *  tallest pane; and a strip is never fewer than three panes. `units` are the chapter's films', in order; `screen` is
 *  the screen's height in units. */
export function stripOrder(units: readonly number[], screen: number): number[] {
  const films = units.length;
  if (films <= 0) return [];
  const laps = Math.max(Math.ceil((screen + Math.max(...units)) / lapUnits(units)), Math.ceil(3 / films));
  return Array.from({ length: films * laps }, (_, i) => i % films);
}

/** A pane's top on the screen, px: the pane at `place` (the units before it), `u` units tall, in a strip of `total`
 *  units of `unit` px each, moved `offset` px on. Endless: every pane stands once in a lap, from its own height above
 *  the screen's top down to the lap's end. */
export function paneTop(place: number, u: number, offset: number, unit: number, total: number): number {
  return mod(place * unit - offset + u * unit, total * unit) - u * unit;
}

/** The film in view: the pane under the screen's middle. */
export function paneInView(offset: number, unit: number, view: number, units: readonly number[]): number {
  return stripPlace(offset, unit, view, units)[0];
}

/** The rail's playhead, 0..1 down the rail: the point of the chapter's lap (`total` units) under the screen's middle.
 *  It sits on a film's tick when that film's middle is on the screen's. */
export function railProgress(offset: number, unit: number, view: number, total: number): number {
  return total > 0 && unit > 0 ? mod(offset + view / 2, total * unit) / (total * unit) : 0;
}

/** Where a touch `p` (0..1) down the rail moves the strip: that point of the chapter's lap to the screen's middle, on
 *  the lap the strip is already on (a scrub never spins it through a whole lap). */
export function offsetForRail(p: number, unit: number, view: number, total: number, current: number): number {
  const lap = total * unit;
  const target = Math.max(0, Math.min(1, p)) * lap - view / 2;
  return lap > 0 ? target + Math.round((current - target) / lap) * lap : target;
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

/** How far a pane's words fade, px, as they near the header or the foot (they rest 22 px or more above the foot). */
export const CAP_FADE = 20;

/** A pane's words, standing `top`..`bottom` px on the screen as their pane passes, against the clear band between the
 *  header and the foot: whole inside it, fading out over `fade` px as they near either edge, gone under the chrome. */
export function capOpacity(top: number, bottom: number, bandTop: number, bandBottom: number, fade = CAP_FADE): number {
  if (bandBottom <= bandTop) return 1;
  const below = (bandBottom - bottom) / fade, above = (top - bandTop) / fade;
  return Math.max(0, Math.min(1, below, above));
}

/* ------------------------------------------------------- the roll on the compositor -- */
// Each pane, its words and the rail's playhead run one linear animation a lap, phased by where they stand: the screen's
// own clock moves them, so a busy page never stutters the strip. A finger takes the timelines by hand.

/** Where a pane stands in its lap, 0..1: the pane at `place`, `u` units tall, the strip (`total` units of `unit` px)
 *  moved `offset` px. Its lap runs from the lap less its own height below the screen's top (0) up to its own height
 *  above it (1). */
export function lapProgress(place: number, u: number, offset: number, unit: number, total: number): number {
  return mod(((total - u) * unit - paneTop(place, u, offset, unit, total)) / (total * unit), 1);
}

/** The strip's offset, px, from the first pane's place in its lap (`u0` is that pane's units) — the one nearest `near`
 *  (the strip's offset runs on through laps; a lap is `total` units). */
export function offsetFromLap(p0: number, u0: number, unit: number, total: number, near: number): number {
  const lap = total * unit;
  const base = p0 * lap - (total - u0) * unit; // (it stands at (total − u0)·unit − p0·lap, and the offset is minus where it stands)
  return base + Math.round((near - base) / lap) * lap;
}

/** A pane's lap as keyframes, in its own height: from the lap less its own units below the screen's top to one of
 *  itself above it. A tall pane's keyframes differ from a unit pane's only by that ratio. */
export const paneKeyframes = (u: number, total: number): Keyframe[] => [
  { transform: `translate3d(0, ${((total - u) / u) * 100}%, 0)` },
  { transform: 'translate3d(0, -100%, 0)' },
];

/** A pane's words over its lap: dark until they rise clear of the foot, whole across the clear band, dark again as they
 *  near the header — capOpacity laid out on the pane's lap. `span` is where they stand in the pane, px from its top;
 *  `band` the clear band on the screen. */
export function capKeyframes(u: number, unit: number, total: number, span: readonly [number, number], band: readonly [number, number], fade = CAP_FADE): Keyframe[] {
  const [a, b] = span, [top, bottom] = band;
  const at = (y: number) => Math.max(0, Math.min(1, ((total - u) * unit - y) / (total * unit))); // (the lap's point where the pane stands at y)
  const marks = [at(bottom - b), at(bottom - b - fade), at(top + fade - a), at(top - a)];
  for (let k = 1; k < marks.length; k++) marks[k] = Math.max(marks[k], marks[k - 1]); // (a tall name in a short band)
  return [
    { offset: 0, opacity: 0 },
    { offset: marks[0], opacity: 0 },
    { offset: marks[1], opacity: 1 },
    { offset: marks[2], opacity: 1 },
    { offset: marks[3], opacity: 0 },
    { offset: 1, opacity: 0 },
  ];
}

export type PanePlay = 'play' | 'rest' | 'free';
/** What a pane does with its loop: `top` px down the screen and `height` px tall, on a screen `view` px tall, in a strip
 *  whose unit is `unit` px. On the screen it plays. Within one unit of the screen it rests, loaded and paused, so the
 *  next pane to come in starts the moment it enters (owner, 2026-11-24, on the design: three loops decode at most).
 *  Further off it gives its video back. */
export function panePlay(top: number, height: number, view: number, unit: number): PanePlay {
  const bottom = top + height;
  if (bottom > 0 && top < view) return 'play';
  if (top < view + unit && bottom > -unit) return 'rest';
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
