import type { KeyStore, WallVerdict } from '../lib/quality';

/** THE WALL'S OWN WATCH (spec 2026-11-24-work-wall-video-design, §4.5). One 1920×1080 video is light for most
 *  machines and too much for some: an old laptop's video chip may not hold it at 24 frames a second. So the wall unit
 *  (works/wall.ts) reads, every WATCH_EVERY_MS, how many frames its video has presented. Under its line for
 *  WATCH_FOR_MS, the video gives way: the full-size wall (WALL_MIN_FPS) to its half-size copy, the copy
 *  (SMALL_MIN_FPS) to `starved`. The first WATCH_GRACE_MS after a video starts are not judged, and nor is a hidden
 *  page. A move down is remembered for the session, so the next page does not try again.
 *
 *  It judges a wall that is PLAYING, and nothing else (owner, on the iPad: "after a while on tablet, the work section
 *  got frozen (no panes playing stuff)"). A wall the browser paused presents no frames, and nor does one across a
 *  stretch in which the page's timers stood still; the watch took both for a slow machine, and two such moments (Back
 *  from two film pages, two app switches) took the floor to `starved`, where no pane plays, for the rest of the
 *  session. So a paused wall is not judged (`unjudged`), readings further apart than WATCH_GAP_MS start afresh, and the
 *  page plays a wall the browser paused again once the page shows (`replayWanted`; works/wall.ts).
 *
 *  Pure, and tested (tests/wall-watch.test.ts). */
export const WATCH_EVERY_MS = 2000;
export const WATCH_GRACE_MS = 4000;
export const WATCH_FOR_MS = 6000;
/** readings further apart than this had a hidden page or stopped timers between them: the count starts afresh */
export const WATCH_GAP_MS = 5000;
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
   *  its line for WATCH_FOR_MS. `quiet`: the page is hidden or the wall stands paused (`unjudged`). */
  read(now: number, presented: number, quiet: boolean): boolean {
    if (quiet || now - this.startedAt < WATCH_GRACE_MS) {
      // not judged, and the next reading starts afresh: a hidden page presents nothing, and nor does a paused wall
      this.last = null;
      this.underSince = null;
      return false;
    }
    const prev = this.last;
    this.last = { at: now, presented };
    if (prev && now - prev.at > WATCH_GAP_MS) {
      // the timers stood still between the two (an app switch, a page frozen in the browser's back cache): the frames
      // not presented meanwhile say nothing of the machine
      this.underSince = null;
      return false;
    }
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

/** Not judged: the page is hidden, or the wall stands paused (the page never pauses a standing wall: the browser
 *  did). */
export function unjudged(hidden: boolean, v: { paused: boolean }): boolean {
  return hidden || v.paused;
}

/** The page plays its wall again: it stands paused while the page shows. The page pauses a wall only to destroy it
 *  (works/wall.ts), so a standing wall that is paused was paused by the browser: Back from a film page restores the
 *  floor with its videos paused (Chrome's back cache, measured), and a browser may pause a hidden page's video. */
export function replayWanted(hidden: boolean, v: { paused: boolean }): boolean {
  return !hidden && v.paused;
}

/** Frame totals the browser does not keep: still at zero once the wall's frame gate has opened (the gate opens on a
 *  presented frame, so a browser that counts has counted it). Read by the wall only after its gate has opened. */
export function countsMissing(totalVideoFrames: number): boolean {
  return totalVideoFrames === 0;
}

/** What the watch has found this session, and the wall files that failed to play in it. */
export interface WallMemory { verdict: WallVerdict; failed: string[] }

/** sessionStorage: the wall's memory. It lasts the tab's session and no longer: a new visit tries the wall again.
 *  (`rvl-wall` held verdicts the old watch gave a paused wall; a tablet's tab lives for weeks, so the key moved and
 *  those verdicts are forgotten.) */
export const WALL_KEY = 'rvl-wall-2';

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
