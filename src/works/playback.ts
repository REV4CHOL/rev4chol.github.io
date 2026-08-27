import { liveVideoCap } from '../lib/env';
import { computePlaySet, TileRect, ViewRect } from './priority';
import type { ProjectTile } from './tile';

/** Applies the pure play-set to the stateful tiles + caps total video elements. */
export class PlaybackManager {
  readonly cap = liveVideoCap();
  readonly maxElements = this.cap * 2;
  private lastSet = new Set<string>();
  private lru: string[] = []; // slugs with a created video element, oldest first

  constructor(private tiles: Map<string, ProjectTile>) {}

  update(view: ViewRect, hovered: string | null): void {
    const rects: TileRect[] = [];
    for (const t of this.tiles.values()) {
      rects.push({ slug: t.project.slug, cx: t.x, cy: t.y, hw: t.extentX(), hh: t.extentY() });
    }
    const set = computePlaySet(rects, view, hovered, this.cap);

    for (const slug of this.lastSet) {
      if (!set.has(slug)) this.tiles.get(slug)?.sleep();
    }
    for (const slug of set) {
      const tile = this.tiles.get(slug);
      if (!tile || tile.mode !== 'sleep') { this.touch(slug); continue; }
      const hadVideo = tile.hasVideo();
      tile.wake();
      if (!hadVideo && tile.hasVideo()) this.lru.push(slug);
      else this.touch(slug);
    }
    while (this.lru.length > this.maxElements) {
      const victim = this.lru.find((s) => !set.has(s));
      if (!victim) break;
      this.lru = this.lru.filter((s) => s !== victim);
      this.tiles.get(victim)?.releaseVideo();
    }
    this.lastSet = set;
  }

  private touch(slug: string): void {
    const i = this.lru.indexOf(slug);
    if (i >= 0) {
      this.lru.splice(i, 1);
      this.lru.push(slug);
    }
  }
}
