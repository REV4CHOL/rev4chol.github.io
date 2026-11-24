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
  /** the frame's own layout, in the box's CSS px */
  width: number;
  height: number;
  /** what the frame is shown at: box width / frame width */
  scale: number;
}

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
  const w = Math.round(width * k);
  return { width: w, height: Math.round(height * k), scale: width / w };
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
