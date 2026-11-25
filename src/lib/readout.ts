import type { PressureState } from './pressure';
import { TIER_LABELS, type FloorMode, type QualityReport, type Tier, type WallVerdict } from './quality';

/** THE READOUT (spec 2026-11-24-work-wall-video-design, §4.8; owner 2026-11-24: the site should "detect if the
 *  machine … have sufficient RAM", and say what it found). `?stats=1` on any page shows eight lines, refreshed once a
 *  second, with a COPY button: what the ladder decided and from what, and every reading of ship A and ship B. Ship
 *  B's readings (stalls, the loops' health, the meter against its budget, pressure, a discarded tab) are shown and
 *  decide nothing yet. Nothing is sent anywhere: the panel reads what the page already knows.
 *
 *  This file is the pure part: the lines as text (tested, tests/readout.test.ts), and the floor's hand-over of its
 *  readings. The panel itself is shell/stats.ts. */

/** What the WORK floor hands the readout (works/world.ts). Other pages have no floor. */
export interface FloorReadings {
  mode: FloorMode;
  /** the wall video, when one is playing or starting (works/wall.ts WallReading) */
  wall: {
    file: string; ready: boolean; fps: number | null; dropped: number; decoded: number;
    paused: boolean; readyState: number; time: number; restarts: number; lastEvent: { name: string; at: number } | null;
    counts: boolean; pictures: number | null;
  } | null;
  /** how many of the panes' own videos are playing */
  playing: number;
  /** the loops' health reading (works/loop-health.ts) */
  health: { counted: number; presented: number | null; due: number | null; judged: boolean; failed: boolean };
  /** bytes of the textures Pixi holds for the floor (lib/meter.ts) */
  textures: number;
  /** every live video element's picture size, the wall's first and then the panes' own: the meter lists them and
   *  never adds them up (it cannot see a decoder's memory). Not one of the eight lines: read at
   *  `rvlWorld.readings().videos`. */
  videos: string[];
  /** the floor's budget in MB (lib/quality.ts budgetFor) */
  budget: number;
  /** the page's last lifecycle event the floor heard (`hidden`, `shown`, `shown from the back cache`, …) */
  page: { name: string; at: number } | null;
  /** what the wall's watch has found this session (works/wall-watch.ts) */
  verdict: WallVerdict;
  /** the floor's WebGL context is lost right now */
  contextLost: boolean;
}

let floor: (() => FloorReadings) | null = null;

/** The floor offers its readings while it stands (`null` when it is destroyed). */
export function offerFloorReadings(read: (() => FloorReadings) | null): void {
  floor = read;
}

export function floorReadings(): FloorReadings | null {
  return floor ? floor() : null;
}

/** `?stats=1` asks for the readout; nothing else does. */
export function statsWanted(search: string): boolean {
  return new URLSearchParams(search).get('stats') === '1';
}

const MB = 1024 * 1024;
const tier = (t: Tier): string => TIER_LABELS[t].toUpperCase();
const mb = (bytes: number): string => `${Math.round(bytes / MB)} MB`;
const NO_FLOOR = 'NO FLOOR ON THIS PAGE';
const ago = (e: { name: string; at: number }, now: number): string =>
  `${e.name.toUpperCase()} ${Math.max(0, Math.round((now - e.at) / 1000))} S AGO`;

/** THE PLAYBACK LINE (owner, on the iPad: "after a while on tablet, the work section got frozen (no panes playing
 *  stuff)"): the wall video as it stands (paused or playing, its readyState, its play position, the pictures that
 *  reached the panes' texture), how often the page played it again, the video's and the page's last events, what the
 *  watch remembers, and the WebGL context. */
function playbackLine(f: FloorReadings | null, now: number): string {
  if (!f) return `PLAYBACK   ${NO_FLOOR}`;
  const w = f.wall;
  const video = w
    ? `${w.paused ? 'PAUSED' : 'PLAYING'} · READY ${w.readyState} · AT ${w.time.toFixed(1)} S · ` +
      `${w.pictures === null ? 'PICTURES NOT COUNTED' : `PICTURES ${w.pictures}`} · RESTARTED ${w.restarts} · ` +
      `${w.lastEvent ? `LAST VIDEO EVENT ${ago(w.lastEvent, now)}` : 'NO VIDEO EVENT YET'}`
    : 'NO WALL VIDEO';
  const page = f.page ? `LAST PAGE EVENT ${ago(f.page, now)}` : 'NO PAGE EVENT YET';
  return `PLAYBACK   ${video} · ${page} · VERDICT ${f.verdict.toUpperCase()} · WEBGL ${f.contextLost ? 'LOST' : 'OK'}`;
}

/** The eight lines. `fps`: frames a second over the last second (null before the first second is in). `heap`: the
 *  JavaScript heap in bytes, or null where the browser does not report it. `now`: the page's clock
 *  (performance.now), the same clock as the report's last signal. */
export function readoutLines(
  q: QualityReport, fps: number | null, f: FloorReadings | null, heap: number | null, pressure: PressureState, now: number,
): string[] {
  const signal = q.lastSignal
    ? `LAST SIGNAL ${q.lastSignal.name.toUpperCase()} ${Math.max(0, Math.round((now - q.lastSignal.at) / 1000))} S AGO`
    : 'NO SIGNAL YET';
  const held = q.pinned !== null ? ' · PINNED BY THE ADDRESS' : q.governed ? '' : ' · NOT STEERED ON THIS PAGE';
  const level =
    `LEVEL      ${tier(q.tier)} · CEILING ${tier(q.ceiling)} · HARDWARE CEILING ${tier(q.hardwareCeiling)} · ` +
    `OPENED ${tier(q.opened)} · ${signal}${held}`;

  const stalls = q.stalls === null ? 'STALLS NOT COUNTED ON THIS PAGE' : `${q.stalls} ${q.stalls === 1 ? 'STALL' : 'STALLS'}`;
  const frames = `FRAMES     ${fps === null ? 'COUNTING' : `${Math.round(fps)} FPS`} · ${stalls}`;

  let wall = `WALL       ${NO_FLOOR}`;
  let own = `OWN LOOPS  ${NO_FLOOR}`;
  let memory = `MEMORY     MACHINE ${q.device.memory === null ? 'NOT REPORTED' : `${q.device.memory} GB`} · ${heap === null ? 'HEAP NOT REPORTED' : `HEAP ${mb(heap)}`} · ${NO_FLOOR}`;
  if (f) {
    const w = f.wall;
    const video = !w
      ? 'NO WALL VIDEO'
      : !w.ready
        ? `${w.file.toUpperCase()} · STARTING`
        : !w.counts
          ? `${w.file.toUpperCase()} · FRAME COUNTS NOT REPORTED`
          : `${w.file.toUpperCase()} · ${w.fps === null ? 'COUNTING' : `${Math.round(w.fps)} FPS PRESENTED`} · ${w.dropped} DROPPED OF ${w.decoded} DECODED`;
    wall = `WALL       MODE ${f.mode.toUpperCase()} · ${video}`;

    const h = f.health;
    const share = h.counted === 0
      ? 'NO LOOP COUNTED'
      : h.presented === null || h.due === null
        ? 'NO READING YET'
        : `${Math.round(h.presented)} OF ${Math.round(h.due)} FRAMES OVER 5 S · ${!h.judged ? 'NOT JUDGED' : h.failed ? 'STARVING' : 'KEEPING UP'}`;
    own = `OWN LOOPS  ${f.playing} PLAYING · ${share}`;

    const held = f.textures + (heap ?? 0);
    memory =
      `MEMORY     MACHINE ${q.device.memory === null ? 'NOT REPORTED' : `${q.device.memory} GB`} · TEXTURES ${mb(f.textures)} · ` +
      `${heap === null ? 'HEAP NOT REPORTED' : `HEAP ${mb(heap)}`} · BUDGET ${Math.round(f.budget)} MB${held > f.budget * MB ? ' · OVER' : ''}`;
  }

  const d = q.device;
  const device =
    `DEVICE     ${d.threads === null ? 'THREADS NOT REPORTED' : `${d.threads} THREADS`} · ${d.coarse ? 'COARSE' : 'FINE'} POINTER · ` +
    `${q.weak ? `WEAK BY ITS ${q.weak.toUpperCase()}` : 'NOT WEAK'} · ${d.gpu ?? 'GPU NOT NAMED'}` +
    `${d.dataSaver ? ' · SAVE-DATA OR 2G' : ''}${q.discarded ? ' · THIS TAB WAS DISCARDED AND LOADED AGAIN' : ''}`;

  return [level, frames, wall, own, memory, `PRESSURE   ${pressure.toUpperCase()}`, device, playbackLine(f, now)];
}

/** `?fx=off` (beside `?stats=1`, whose panel reads it): the grain and the scan lines leave the page, for a reading on a
 *  real device of what they cost. */
export function fxOff(search: string): boolean {
  return new URLSearchParams(search).get('fx') === 'off';
}

/** What WORK's phone strip hands the readout (works/reel-view.ts: rvlWorkReel). Other pages have no strip. */
export interface ReelReading {
  mode: 'video' | 'image' | 'posters';
  loaded: number;
  playing: number;
  rolling: boolean;
  pin: string | null;
}
/** The strip's line: its loops' kind, how many are loaded and playing, whether the clock or a hand moves it, and the
 *  address's pin (`?loops=`). null where there is no strip: the panel shows no line. */
export function reelLine(r: ReelReading | null): string | null {
  if (!r) return null;
  const kind = r.mode === 'video' ? 'VIDEO LOOPS' : r.mode === 'image' ? 'PICTURE LOOPS' : 'POSTERS ONLY';
  return `REEL       ${kind} · ${r.loaded} LOADED · ${r.playing} PLAYING · ${r.rolling ? 'ROLLING' : 'BY HAND'}${r.pin ? ` · LOOPS PINNED ${r.pin.toUpperCase()}` : ''}`;
}

/** The page's own hitches since the panel opened (shell/stats.ts counts them on its frames, after the page's first
 *  three seconds): frames that came more than 50 ms after the one before, the longest such wait, and the slowest
 *  whole second. `lowest` is null until a first second is in. */
export interface Hitches { hitches: number; longest: number; lowest: number | null; seconds: number }
export function hitchLine(h: Hitches): string {
  if (h.lowest === null) return 'HITCHES    COUNTING';
  return `HITCHES    ${h.hitches} OVER 50 MS IN ${h.seconds} S · LONGEST FRAME ${Math.round(h.longest)} MS · SLOWEST SECOND ${Math.round(h.lowest)} FPS`;
}
