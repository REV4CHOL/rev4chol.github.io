/** THE HERO'S LOOP WHERE PLAY() IS REFUSED (owner, 2026-11-25, an iPhone in Safari with Low Power Mode on: "I dont like
 *  the play button on the top previewer in the film's page. Remove it. I want the preview loop to automatically already
 *  play at the start"). iOS refused the hero video's play() and drew its own start glyph on the still frame. As the
 *  homepage and WORK's phone strip do (lib/autoplay.ts), the loop then stands as an MP4 inside an <img>, which Safari
 *  plays as a silent looping picture outside the video rules. Pure decisions only; the page wires them
 *  (mountHero in pages/project.ts). */

/** What carries the hero's loop: the video, the MP4 as an image, or the dithered poster alone. */
export type HeroMode = 'video' | 'image' | 'poster';

export interface HeroFacts {
  /** the video has said `playing` (and not paused since) */
  playing: boolean;
  /** a play() was refused on this page or earlier in the visit */
  refused: boolean;
  /** can an MP4 stand in an <img> here: null until one has loaded or failed */
  imageLoops: boolean | null;
}

/** A playing video always carries the loop (a touch started it, or the rule was lifted); a video nobody has refused is
 *  on its way; after a refusal, the image, unless this browser has shown it cannot draw one: then the poster stands
 *  and the visitor's first touch starts the video. */
export function heroMode(f: HeroFacts): HeroMode {
  if (f.playing || !f.refused) return 'video';
  return f.imageLoops === false ? 'poster' : 'image';
}

export interface VeilFacts {
  mode: HeroMode;
  /** the poster has been dithered onto the veil (and its short dwell is over) */
  poster: boolean;
  /** every loop name failed: the dithered poster is the hero for good */
  dead: boolean;
  /** the video can play (`canplay`) */
  videoReady: boolean;
  /** the image is in the page with a frame of its own (loaded, not let go) */
  imageShown: boolean;
}

/** Is the dither veil lifted off the loop? Only once the poster is drawn, and only onto a moving picture: the video at
 *  `canplay` as before, the image at its first frame. In the poster's mode a refused video's still frame is not shown. */
export function veilLifted(f: VeilFacts): boolean {
  if (f.dead || !f.poster) return false;
  if (f.mode === 'video') return f.videoReady;
  if (f.mode === 'image') return f.imageShown;
  return false;
}

/** An image failed on loop name `at` of `length`: the next name to try, or null when this browser shows no MP4 in an
 *  image. A name the video has already loaded from is a real file, so its failure is the browser's answer at once. */
export function imageNext(at: number, length: number, videoHasIt: boolean): number | null {
  if (videoHasIt) return null;
  return at + 1 < length ? at + 1 : null;
}
