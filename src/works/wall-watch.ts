import type { KeyStore, WallVerdict } from '../lib/quality';

/** THE WALL'S OWN WATCH (spec 2026-11-24-work-wall-video-design, §4.5). One 1920×1080 video is light for most
 *  machines and too much for some: an old laptop's video chip may not hold it at 24 frames a second. So the wall unit
 *  (works/wall.ts) reads, every WATCH_EVERY_MS, how many frames its video has presented. Under its line for
 *  WATCH_FOR_MS, the video gives way: the full-size wall (WALL_MIN_FPS) to its half-size copy, the copy
 *  (SMALL_MIN_FPS) to `starved`. The first WATCH_GRACE_MS after a video starts are not judged, and nor is a hidden
 *  page. A move down is remembered for the session, so the next page does not try again.
 *
 *  Pure, and tested (tests/wall-watch.test.ts). */
export const WATCH_EVERY_MS = 2000;
export const WATCH_GRACE_MS = 4000;
export const WATCH_FOR_MS = 6000;
export const WALL_MIN_FPS = 18;
export const SMALL_MIN_FPS = 12;
/** a wall video that has presented no frame after this long has failed */
export const NO_FRAME_MS = 8000;

export class WallWatch {
  /** frames presented a second over the last reading; null until two readings stand */
  fps: number | null = null;
  private last: { at: number; presented: number } | null = null;
  private underSince: number | null = null;

  constructor(private readonly minFps: number, private readonly startedAt: number) {}

  /** One reading: the frames the video has presented so far (decoded, less dropped). True when it has been under
   *  its line for WATCH_FOR_MS. */
  read(now: number, presented: number, hidden: boolean): boolean {
    if (hidden || now - this.startedAt < WATCH_GRACE_MS) {
      // not judged, and the next reading starts afresh: a hidden page presents nothing
      this.last = null;
      this.underSince = null;
      return false;
    }
    const prev = this.last;
    this.last = { at: now, presented };
    if (!prev || now <= prev.at) return false;
    this.fps = ((presented - prev.presented) * 1000) / (now - prev.at);
    if (this.fps >= this.minFps) {
      this.underSince = null;
      return false;
    }
    this.underSince ??= prev.at;
    return now - this.underSince >= WATCH_FOR_MS;
  }
}

/** What the watch has found this session, and the wall files that failed to play in it. */
export interface WallMemory { verdict: WallVerdict; failed: string[] }

/** sessionStorage: the wall's memory. It lasts the tab's session and no longer: a new visit tries the wall again. */
export const WALL_KEY = 'rvl-wall';

export function readWallMemory(store: KeyStore | null): WallMemory {
  try {
    const m = JSON.parse(store?.getItem(WALL_KEY) ?? 'null') as Partial<WallMemory> | null;
    if (m && (m.verdict === 'ok' || m.verdict === 'small' || m.verdict === 'starved') && Array.isArray(m.failed)) {
      return { verdict: m.verdict, failed: m.failed.filter((f): f is string => typeof f === 'string') };
    }
  } catch { /* private mode, or not ours */ }
  return { verdict: 'ok', failed: [] };
}

export function writeWallMemory(store: KeyStore | null, m: WallMemory): void {
  try { store?.setItem(WALL_KEY, JSON.stringify(m)); } catch { /* private mode */ }
}

/** The tab's sessionStorage, or null where it is refused. */
export function sessionStore(): KeyStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
