/** THE BIG FRAME (owner, 2026-11-24: "force all video players on the website to start at 2160p when watch"). No address
 *  parameter or player command makes a YouTube embed start at 2160p (measured headless: vq=, hd=1, setPlaybackQuality,
 *  setPlaybackQualityRange and loadVideoById's suggestedQuality are all ignored). The player picks about the level
 *  nearest its own size in DEVICE pixels (666 tall -> 720p, 1081 -> 1080p, 2160 -> 2160p), so the frame is laid out
 *  TARGET_PX device px on its short side and scaled down into the page's box from its top left. A vertical film is
 *  sized on its width: a 9:16 part laid out 2160 tall stopped at 1440p, laid out 2160 wide it reached 2160p.
 *  Everything YouTube draws shrinks with the frame, so the site draws its own bar (project/player-bar.ts). */

export const TARGET_PX = 2160;

export interface FrameFit {
  /** the frame's own layout, in the box's CSS px */
  width: number;
  height: number;
  /** what the frame is shown at: box width / frame width */
  scale: number;
}

/** The frame for a box (its CSS px: under the poster lock, plate px), or null when the box needs none: it has no size
 *  yet, or its short side already stands TARGET_PX device px. `zoom` is the poster lock's: measured, a frame inside the
 *  locked body at zoom 0.75 reports devicePixelRatio 0.75 within, so it counts like the screen's own ratio. */
export function bigFrame(box: { width: number; height: number }, dpr = 1, zoom = 1, target = TARGET_PX): FrameFit | null {
  const { width, height } = box;
  if (!(width > 0 && height > 0)) return null;
  const short = Math.min(width, height);
  const need = Math.ceil(target / ((dpr || 1) * (zoom || 1)));
  if (short >= need) return null;
  const w = Math.round((width * need) / short);
  const h = Math.round((height * need) / short);
  return { width: w, height: h, scale: width / w };
}

export interface BigGates {
  /** the film plays from YouTube (another platform, or the owner's own file, keeps its own player) */
  youtube: boolean;
  /** an element can go fullscreen (an iPhone has no such thing: it keeps YouTube's own player and its fullscreen) */
  fullscreen: boolean;
  userAgent: string;
  /** the site's quality tier is LITE at the page's opening (a machine measured slow keeps the plain player) */
  lite: boolean;
}

/** Whether a film gets the big frame and the site's bar, decided once as its player mounts. The box's own size is the
 *  last gate (bigFrame: a box already TARGET_PX tall stays plain). */
export function bigFrameWanted(g: BigGates): boolean {
  return g.youtube && g.fullscreen && !isAndroid(g.userAgent) && !g.lite;
}

/** Android: its YouTube player stayed at 480p whatever the frame's size (measured on the tablet profile, 2160 laid out). */
export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

/** The Fullscreen API for elements, standard or webkit's (an iPad's Safari). */
export function fullscreenApi(doc: { fullscreenEnabled?: boolean; webkitFullscreenEnabled?: boolean }): boolean {
  return doc.fullscreenEnabled === true || doc.webkitFullscreenEnabled === true;
}
