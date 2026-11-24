/** THE LOOPS' HEALTH READING (spec 2026-11-24-work-wall-video-design, §4.5). Smooth frames on the page say nothing
 *  about starving video decoders: a chapter of loops can freeze while the floor still draws at 60. So the floor reads the
 *  videos themselves: once a second, for each of the panes' own loops that is playing, the frames it has presented
 *  against the frames it should have.
 *
 *  SHIP A MEASURES, SHIP B ACTS (§3.1): the reading goes to the readout (`?stats=1`) and decides nothing. Its numbers
 *  are set for good after the old laptop has been read; from ship B a failed reading switches the floor to the wall.
 *
 *  - A loop is counted once it has been told to play for HEALTH_AFTER_MS and its data reaches a second past the play
 *    position, or the file's end. A loop still downloading is not counted: a slow line is not a slow machine.
 *  - A counted loop that presents nothing counts as none of its frames: that is the frozen pane.
 *  - The counted loops together are judged over HEALTH_OVER_MS: under HEALTH_SHARE of the frames due, they fail.
 *  - Not judged: a hidden page or a paused floor, the first HEALTH_RESUME_MS after either, and fewer than
 *    HEALTH_MIN_LOOPS counted loops.
 *
 *  Pure, and tested on made-up readings (tests/loop-health.test.ts). */
export const HEALTH_AFTER_MS = 3000;
export const HEALTH_OVER_MS = 5000;
export const HEALTH_SHARE = 0.5;
export const HEALTH_RESUME_MS = 4000;
export const HEALTH_MIN_LOOPS = 2;
/** readings further apart than this had a hidden page or a stopped ticker between them */
export const HEALTH_GAP_MS = 2500;

/** One of the panes' own loops at one reading. */
export interface LoopSample {
  slug: string;
  /** ms since the pane was told to play */
  playingFor: number;
  /** frames presented so far: the element's own totals, decoded less dropped */
  presented: number;
  /** its data reaches a second past the play position, or the file's end */
  buffered: boolean;
  /** the loop's frame rate as the manifest lists it; 24 where it lists none */
  fps: number;
}

export interface HealthReading {
  /** loops counted over the whole of the last 5 s */
  counted: number;
  /** the frames those loops presented in the last 5 s, and the frames due; null until 5 s of readings stand */
  presented: number | null;
  due: number | null;
  judged: boolean;
  /** judged, and under half of the frames due */
  failed: boolean;
}

const NOTHING: HealthReading = { counted: 0, presented: null, due: null, judged: false, failed: false };

export class LoopHealth {
  private readings: Array<{ at: number; loops: Map<string, { presented: number; fps: number }> }> = [];
  private lastAt: number | null = null;
  /** when the page last showed again, or the floor last resumed */
  private resumedAt = -Infinity;

  /** One reading. `quiet`: the page is hidden or the floor is paused. */
  read(now: number, samples: LoopSample[], quiet: boolean): HealthReading {
    const gap = this.lastAt !== null && now - this.lastAt > HEALTH_GAP_MS;
    this.lastAt = now;
    if (quiet || gap) {
      this.readings = [];
      this.resumedAt = now;
      if (quiet) return NOTHING;
    }
    const loops = new Map<string, { presented: number; fps: number }>();
    for (const s of samples) {
      if (s.playingFor >= HEALTH_AFTER_MS && s.buffered) loops.set(s.slug, { presented: s.presented, fps: s.fps });
    }
    this.readings.push({ at: now, loops });
    // keep the newest reading that is at least 5 s old as the window's start, and nothing before it
    while (this.readings.length > 1 && this.readings[1].at <= now - HEALTH_OVER_MS) this.readings.shift();
    const first = this.readings[0];
    if (first.at > now - HEALTH_OVER_MS) return { ...NOTHING, counted: loops.size };

    let counted = 0;
    let presented = 0;
    let due = 0;
    for (const [slug, cur] of loops) {
      const was = first.loops.get(slug);
      // counted at both ends of the window; a counter that fell is a new video element, counted from its next window
      if (!was || cur.presented < was.presented) continue;
      counted++;
      presented += cur.presented - was.presented;
      due += (cur.fps * (now - first.at)) / 1000;
    }
    const judged = counted >= HEALTH_MIN_LOOPS && now - this.resumedAt >= HEALTH_RESUME_MS;
    return { counted, presented, due, judged, failed: judged && presented < due * HEALTH_SHARE };
  }
}
