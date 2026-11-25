/** THE BIG FRAME (owner, 2026-11-24: "force all video players on the website to start at 2160p when watch"). No address
 *  parameter or player command makes a YouTube embed start at 2160p (measured headless: vq=, hd=1, setPlaybackQuality,
 *  setPlaybackQualityRange and loadVideoById's suggestedQuality are all ignored). The player picks its level from its
 *  own size in DEVICE pixels, so the frame is laid out large and scaled down into the page's box from its top left.
 *  How large, measured: the PICTURE as the player shows it inside the frame must reach 2160 device px on its short
 *  side or 3840 on its long side (a 3:2 film in a 3840 x 2160 frame: 2160p; a 2.39:1 film in it: 2160p; a 9:16 part
 *  laid out 1215 x 2160: 1440p, laid out 2160 x 3840: 2160p). Everything YouTube draws shrinks with the frame, so the
 *  site draws its own bar (project/player-bar.ts). */

export const TARGET_PX = 2160;
export const TARGET_LONG_PX = 3840;

export interface FrameFit {
  /** the frame's own layout, in the box's CSS px (the height a quarter row under `rows`: see THE THIN LINE) */
  width: number;
  height: number;
  /** what the frame is shown at: `shown` / `rows` */
  scale: number;
  /** the frame's own height in device rows as the browser lays it out: whole and even */
  rows: number;
  /** the rows of the screen it is shown on: whole and even, within a row of the box's own height */
  shown: number;
}

/** THE THIN LINE (owner, 2026-11-25, of a hairline across the exact middle of the playing picture in a film's first
 *  seconds). It is YouTube's own: its controls overlay lays a dark shade over the TOP HALF of its frame (a gradient tile
 *  half the frame high, repeated across), whenever the overlay shows: after a start, after a seek, on pause. Chrome
 *  draws the overlay at the scale the page shows the frame at, and when the shade's foot (half the frame's own rows x
 *  that scale) is not on a whole row of the screen, that row takes a share of the tile's dark head. Measured over a
 *  white ground with the video hidden, on every film alike: the foot at row 635.95 darkened that row by 6.8 levels of
 *  255, at 636.5 by 37, at 636 by none (a frame at its own size, scale 1, never showed it).
 *  So the frame's own rows are EVEN and it is shown on an EVEN count of the screen's rows: the foot is half of that, a
 *  whole row. The browser rounds a frame's height UP to whole rows (measured: 2158.0006 rows laid out were 2159
 *  inside), so the frame is laid out a quarter row under: rounding up and rounding to the nearest then agree. */
const UNDER = 0.25;
/** the smallest even whole number not under x (a hair of float noise forgiven) */
const evenUp = (x: number) => 2 * Math.ceil(x / 2 - 1e-9);

/** The frame for a box (its CSS px: under the poster lock, plate px) showing a picture of ratio `picture` (width over
 *  height; the box's own when not given), or null when the box needs none: it has no size yet, or the picture already
 *  stands that large in it. `zoom` is the poster lock's: measured, a frame inside the locked body at zoom 0.75 reports
 *  devicePixelRatio 0.75 within, so it counts like the screen's own ratio. */
export function bigFrame(box: { width: number; height: number }, dpr = 1, zoom = 1, picture?: number): FrameFit | null {
  const { width, height } = box;
  if (!(width > 0 && height > 0)) return null;
  const r = picture && picture > 0 ? picture : width / height;
  // the picture as the player fits it in the box (letterboxed or pillarboxed)
  const pw = Math.min(width, height * r), ph = Math.min(height, width / r);
  const px = (dpr || 1) * (zoom || 1);
  const k = Math.min(TARGET_PX / px / Math.min(pw, ph), TARGET_LONG_PX / px / Math.max(pw, ph));
  if (!(k > 1)) return null;
  // the frame's own rows: even, and never fewer than the picture's rule gives
  const rows = evenUp(Math.round(height * k) * px);
  // the screen's rows it is shown on: the even count nearest the box's own, never more than the frame has
  const shown = Math.min(rows, Math.max(2, 2 * Math.round((height * px) / 2)));
  // wide enough for the picture's rule, and to reach across the box at that scale (the box cuts what stands past it)
  const w = Math.max(Math.round(width * k), (width * rows) / shown);
  return { width: w, height: (rows - UNDER) / px, scale: shown / rows, rows, shown };
}

export interface BigGates {
  /** the film plays from YouTube (another platform, or the owner's own file, keeps its own player) */
  youtube: boolean;
  /** an element can go fullscreen (an iPhone has no such thing: it keeps YouTube's own player and its fullscreen; an
   *  Android phone has it, and gets the site's player: frameTarget) */
  fullscreen: boolean;
  userAgent: string;
}

/** Why a film keeps its platform's own player, in the readout's words (lib/player-record.ts); null when it gets the
 *  big frame and the site's bar. Decided once as its player mounts, from the film and the browser alone.
 *  NOT from the site's quality tier (owner, 2026-11-24: "I saw the player on PC for a time, and now it dissapeared,
 *  and YouTube player is appearing now ... on iPad I cant even see the new player at all"): until then a page that
 *  opened at LITE kept YouTube's own player, and the tier moves with the machine's load and is remembered for the
 *  session, so the player came and went (measured on the live site: a remembered LITE mounted the plain player).
 *  NOT from the box's size either: a box that has no size yet, or needs no larger frame, still gets the site's
 *  player, its frame fitted as the box stands (player-bar.ts, fitFrame). */
export function plainReason(g: BigGates): string | null {
  if (!g.youtube) return 'NOT A YOUTUBE FILM';
  if (!g.fullscreen) return 'NO ELEMENT FULLSCREEN HERE';
  return null;
}

export function bigFrameWanted(g: BigGates): boolean {
  return plainReason(g) === null;
}

/** What the site's player's frame is fitted to: `big`, the big frame above (laid out 2160 device px on its short side
 *  and scaled down into the box), or `box`, the box's own size at scale 1. ANDROID gets the site's player at the box's
 *  own size (owner, 2026-11-25: "also why can't our custom Player go to Phone? Like the other platforms?"; told the
 *  reasons, they chose "Android only"): its YouTube player stayed at 480p whatever the big frame's size (measured on the
 *  tablet profile, 2160 laid out), so a frame of 3840 px would cost a phone memory and data for nothing. Decided once
 *  as the player mounts, from the browser alone. Every other screen keeps the big frame exactly as it was. */
export type FrameTarget = 'big' | 'box';
export function frameTarget(ua: string): FrameTarget {
  return isAndroid(ua) ? 'box' : 'big';
}

/** Android, a phone or a tablet, in any of its browsers. */
export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

/** The Fullscreen API for elements, standard or webkit's (an iPad's Safari). */
export function fullscreenApi(doc: { fullscreenEnabled?: boolean; webkitFullscreenEnabled?: boolean }): boolean {
  return doc.fullscreenEnabled === true || doc.webkitFullscreenEnabled === true;
}
