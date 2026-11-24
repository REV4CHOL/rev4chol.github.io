import { Rectangle, Texture } from 'pixi.js';
import { wallAssetUrl } from '../lib/content';
import { videoTexture } from '../lib/video-texture';
import type { WallEntry } from '../lib/wall-files';
import { NO_FRAME_MS, SMALL_MIN_FPS, WALL_MIN_FPS, WATCH_EVERY_MS, WallWatch } from './wall-watch';

/** What the world hears from its wall. */
export interface WallHooks {
  /** the video has presented a frame: the tiles' textures exist from now on */
  onReady(): void;
  /** the file did not load, will not decode, or presented no frame in NO_FRAME_MS */
  onFail(): void;
  /** the wall's own watch (works/wall-watch.ts): this file cannot hold its frame rate */
  onVerdict(): void;
}

/** What the readout shows of the wall (lib/readout.ts). */
export interface WallReading { file: string; ready: boolean; fps: number | null; dropped: number; decoded: number }

/** THE WALL VIDEO (owner 2026-11-24: one combined video per chapter "for weak machines only"; spec
 *  2026-11-24-work-wall-video-design, §4.5). One muted, looping video plays every pane's loop as a tile; each pane
 *  gets a texture over the ONE shared source, framed on its tile. One decoder where the floor held one for every pane.
 *
 *  The house laws for video in Pixi hold here as for a pane's own loop (lib/video-texture.ts): the texture comes from
 *  videoTexture(), so it uploads only on a new frame and the page owns play and pause; and nothing of the wall shows
 *  before its video has presented a frame. Two more are this unit's own:
 *  - a tile's texture is made only after that first frame, when the source has the video's size (a sprite does not
 *    follow a source that changes size under it);
 *  - the shared source is destroyed here and nowhere else. A pane destroys its own sprite, never the texture.
 *
 *  A change of file (full-size to half-size) is always a new unit; nothing is resized in place. */
export class WallVideo {
  readonly file: string;
  /** the frame gate has opened */
  ready = false;
  private video: HTMLVideoElement | null;
  private shared: Texture | null = null;
  private tiles = new Map<string, Texture>();
  private watch: WallWatch;
  private watchTimer = 0;
  private failTimer = 0;
  private decoded = 0;
  private dropped = 0;
  private done = false;

  constructor(private readonly entry: WallEntry, readonly which: 'full' | 'small', private readonly hooks: WallHooks) {
    this.file = which === 'small' && entry.small ? entry.small : entry.file;
    this.watch = this.newWatch();
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    this.video = v;
    v.addEventListener('error', () => this.fail());
    this.failTimer = window.setTimeout(() => { if (!this.ready) this.fail(); }, NO_FRAME_MS);
    // THE FRAME GATE: the first presented frame. (A browser without requestVideoFrameCallback opens it when the first
    // frame's data is in, as a pane does for its own loop.)
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(() => this.open(v));
    else v.addEventListener('loadeddata', () => this.open(v), { once: true });
    v.src = wallAssetUrl(this.file);
    void v.play().catch(() => { /* the posters stay up; the gate or the timer decides */ });
  }

  private newWatch(): WallWatch {
    return new WallWatch(this.which === 'small' ? SMALL_MIN_FPS : WALL_MIN_FPS, performance.now());
  }

  private open(v: HTMLVideoElement): void {
    if (this.done || this.video !== v) return;
    window.clearTimeout(this.failTimer);
    if (!v.videoWidth || !v.videoHeight) {
      this.fail();
      return;
    }
    const shared = videoTexture(v);
    // (made after the first frame, the source takes the video's size as it is built; made sure of here)
    if (shared.source.width !== v.videoWidth || shared.source.height !== v.videoHeight) {
      shared.source.resize(v.videoWidth, v.videoHeight);
    }
    this.shared = shared;
    // one map serves both files: the half-size copy's rectangles are the map's, scaled by the file's own width
    const k = v.videoWidth / this.entry.width;
    for (const [slug, t] of Object.entries(this.entry.tiles)) {
      // half a pixel inside the picture; with the 4 px of the tile's own edge around it, no neighbour's picture and
      // no compression at the edge can show in a pane
      const frame = new Rectangle(t.x * k + 0.5, t.y * k + 0.5, t.w * k - 1, t.h * k - 1);
      this.tiles.set(slug, new Texture({ source: shared.source, frame }));
    }
    this.ready = true;
    this.watch = this.newWatch(); // (the watch's 4 s of grace run from the first frame)
    this.watchTimer = window.setInterval(() => this.read(), WATCH_EVERY_MS);
    this.hooks.onReady();
  }

  /** The watch's reading: the frames presented so far are the element's own totals, decoded less dropped. Where the
   *  browser gives no such totals, the watch does nothing. */
  private read(): void {
    const v = this.video;
    if (this.done || !v || typeof v.getVideoPlaybackQuality !== 'function') return;
    const q = v.getVideoPlaybackQuality();
    this.decoded = q.totalVideoFrames;
    this.dropped = q.droppedVideoFrames;
    if (this.watch.read(performance.now(), q.totalVideoFrames - q.droppedVideoFrames, document.hidden)) this.hooks.onVerdict();
  }

  private fail(): void {
    if (this.done) return;
    this.hooks.onFail();
  }

  /** The pane's tile, or null: the gate has not opened, or the manifest lists no tile for this film (its loop
   *  changed after the wall was built: the pane plays its own loop). */
  textureFor(slug: string): Texture | null {
    return this.tiles.get(slug) ?? null;
  }

  reading(): WallReading {
    return { file: this.file, ready: this.ready, fps: this.watch.fps, dropped: this.dropped, decoded: this.decoded };
  }

  /** Stop for good: THE LIST, a chapter flip, a change of file. The panes must have given their tiles back first
   *  (ProjectTile.setWall(null)). The video is paused and emptied, and its source destroyed: the decoder is given
   *  back. */
  destroy(): void {
    if (this.done) return;
    this.done = true;
    window.clearInterval(this.watchTimer);
    window.clearTimeout(this.failTimer);
    for (const t of this.tiles.values()) t.destroy(false); // (the texture alone: the source is shared)
    this.tiles.clear();
    const v = this.video;
    this.video = null;
    if (this.shared) {
      this.shared.destroy(true); // (VideoSource.destroy pauses the video, sets src = '' and loads)
      this.shared = null;
    } else if (v) {
      v.pause();
      v.src = '';
      v.load();
    }
  }
}
