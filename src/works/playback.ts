import { liveVideoCap } from '../lib/env';
import type { FloorMode } from '../lib/quality';
import { computePlaySet, TileRect, ViewRect } from './priority';
import type { ProjectTile } from './tile';

/** A sleeping pane gives its video back after this long, so only panes in or near the view hold a decoder. (Before,
 *  a paused video kept its element, its decoder and its texture for the whole visit: only a count over 24 elements
 *  released one, and no chapter has that many films.) */
export const SLEEP_RELEASE_MS = 20000;
/** …and after this long beside a wall, where the only own loops are the pointed pane's and a pane's with no tile */
export const POINTED_RELEASE_MS = 5000;

export function releaseAfterMs(mode: FloorMode): number {
  return mode === 'own' || mode === 'posters' ? SLEEP_RELEASE_MS : POINTED_RELEASE_MS;
}

/** What the floor's mode asks of the manager. The world builds it (works/world.ts); the rules are lib/quality.ts's
 *  (floorMode, ownLoopCap). */
export interface PlaybackPolicy {
  /** how many panes may decode their own loop right now */
  cap(): number;
  /** whether this pane may play its own loop without being pointed at: beside a wall, only a pane with no tile */
  mayPlay(slug: string): boolean;
  /** the floor is paused (THE LIST shows): nothing wakes */
  paused(): boolean;
  /** how long a sleeping pane keeps its video, in ms */
  releaseAfter(): number;
}

/** A floor of own loops at the tier's cap, never paused: the manager as it was before the modes. */
const OWN_LOOPS: PlaybackPolicy = {
  cap: liveVideoCap,
  mayPlay: () => true,
  paused: () => false,
  releaseAfter: () => SLEEP_RELEASE_MS,
};

/** Applies the pure play-set to the stateful tiles + caps total video elements. */
export class PlaybackManager {
  /** Live loops right now: the floor's mode and the site's tier decide (lib/quality.ts ownLoopCap), read on every
   *  update — a step down sleeps the excess at the next pass, a step up wakes more. On a floor of own loops a
   *  desktop's cap covers a whole chapter: every pane in the view plays. Beside a wall at most 3 panes decode a loop. */
  get cap(): number { return this.policy.cap(); }
  get maxElements(): number { return this.cap * 2; }
  private lastSet = new Set<string>();
  private lru: string[] = []; // slugs with a created video element, oldest first
  /** when each pane that holds a video was first seen out of the play set */
  private asleepSince = new Map<string, number>();

  constructor(private tiles: Map<string, ProjectTile>, private policy: PlaybackPolicy = OWN_LOOPS) {}

  update(view: ViewRect, hovered: string | null, now: number = performance.now()): void {
    // THE ONE GUARD: every playback pass comes through here, and none wakes a pane while the floor is paused. (A tier
    // change under THE LIST used to wake every loop behind it.)
    if (this.policy.paused()) return;
    const rects: TileRect[] = [];
    for (const t of this.tiles.values()) {
      const slug = t.project.slug;
      if (slug !== hovered && !this.policy.mayPlay(slug)) continue;
      rects.push({ slug, cx: t.x, cy: t.y, hw: t.extentX(), hh: t.extentY() });
    }
    const set = computePlaySet(rects, view, hovered, this.cap);

    for (const slug of this.lastSet) {
      if (!set.has(slug)) this.tiles.get(slug)?.sleep();
    }
    for (const slug of set) {
      const tile = this.tiles.get(slug);
      if (!tile) continue;
      if (tile.mode === 'sleep') tile.wake();
      if (tile.hasVideo()) {
        if (this.lru.includes(slug)) this.touch(slug);
        else this.lru.push(slug);
      }
    }
    while (this.lru.length > this.maxElements) {
      const victim = this.lru.find((s) => !set.has(s));
      if (!victim) break;
      this.release(victim);
    }
    // A SLEEPING PANE GIVES ITS VIDEO BACK once it has slept the policy's wait
    const wait = this.policy.releaseAfter();
    for (const slug of [...this.lru]) {
      if (set.has(slug)) {
        this.asleepSince.delete(slug);
        continue;
      }
      const since = this.asleepSince.get(slug);
      if (since === undefined) this.asleepSince.set(slug, now);
      else if (now - since >= wait) this.release(slug);
    }
    this.lastSet = set;
  }

  /** Give back every own video (the floor pauses for THE LIST), or every one but `except`'s. Each pane rests on its
   *  poster, or on its tile of the wall. */
  releaseAll(except: string | null = null): void {
    for (const [slug, t] of this.tiles) {
      if (slug !== except && t.hasVideo()) t.releaseVideo();
    }
    this.lru = this.lru.filter((s) => s === except);
    this.lastSet = new Set([...this.lastSet].filter((s) => s === except));
    this.asleepSince.clear();
  }

  /** Give back at once every video that is not playing. A change of mode happens under the posters: the loops that
   *  are leaving do not wait out their sleep beside the video that is coming. */
  releaseIdle(): void {
    for (const slug of [...this.lru]) {
      if (!this.lastSet.has(slug)) this.release(slug);
    }
  }

  private release(slug: string): void {
    this.lru = this.lru.filter((s) => s !== slug);
    this.asleepSince.delete(slug);
    this.tiles.get(slug)?.releaseVideo();
  }

  private touch(slug: string): void {
    const i = this.lru.indexOf(slug);
    if (i >= 0) {
      this.lru.splice(i, 1);
      this.lru.push(slug);
    }
  }
}
