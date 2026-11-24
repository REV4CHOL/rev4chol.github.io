/** A film's players talk to the page (owner 2026-11-24: "I want to abolish the WATCH button. Instead, I want the video
 *  to be already there ready to play"): the press that plays a film now lands INSIDE its frame, where the page hears
 *  nothing, so the page listens to the player itself. A YouTube player (built with enablejsapi and this page's origin)
 *  says when it plays over its postMessage interface; a frame that never talks is known to have been pressed when the
 *  window hands it the focus. A film in parts (owner 2026-09-28, GALAXY Z FOLD 8 ULTRA: "one watch will spawn two embed
 *  YouTube videos at once, on the same row together") is one programme: a part that starts pauses the others, and a
 *  part that ends starts the next. A player that never answers still plays by hand. */

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
const YT_FROM = /^https:\/\/www\.youtube(-nocookie)?\.com$/;

/** The player's state in one of its messages (1 playing, 2 paused, 0 ended, and so on), or null. */
export function ytState(data: unknown): number | null {
  let d: unknown = data;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch {
      return null;
    }
  }
  if (typeof d !== 'object' || d === null) return null;
  const m = d as { event?: unknown; info?: unknown };
  if (m.event === 'onStateChange' && typeof m.info === 'number') return m.info;
  if (m.event === 'infoDelivery' && typeof m.info === 'object' && m.info !== null) {
    const s = (m.info as { playerState?: unknown }).playerState;
    if (typeof s === 'number') return s;
  }
  return null;
}

/** The film has started: playing (1), or buffering on its way to it (3). */
export function startsPlay(state: number | null): boolean {
  return state === 1 || state === 3;
}

/** A command, as the player's postMessage interface takes it. */
export function ytCommand(func: string, id: number, args: unknown[] = []): string {
  return JSON.stringify({ event: 'command', func, args, id, channel: 'widget' });
}

/** The window lost its focus: was it to one of the film's frames, pressed, that does not say for itself when it plays?
 *  (A frame that talks is left to its own state: a press on it may only pause it.) */
export function startedByFocus<T>(active: T | null, frames: readonly T[], talks: (frame: T) => boolean): boolean {
  return active !== null && frames.includes(active) && !talks(active);
}

/** The page's hold on a film's YouTube players, in order. */
export interface Programme {
  /** Start the first part: at once when its player has answered, else as soon as it does (a lazy frame may still be
   *  loading), within fifteen seconds of the ask. A platform may refuse a start the page asks for; then the visitor's
   *  own press on the player plays it. */
  play(): void;
  /** Whether this frame's player has answered (and so says for itself when it plays). */
  talks(frame: HTMLIFrameElement): boolean;
  unwire(): void;
}

/** Wires the YouTube players (built with enablejsapi and this page's origin) into one programme, in order. `onPlay`
 *  hears every start. */
export function linkParts(frames: HTMLIFrameElement[], opts: { onPlay?: () => void } = {}): Programme {
  const heard = frames.map(() => false);
  let askedAt = -Infinity;
  const post = (i: number, msg: string) => frames[i].contentWindow?.postMessage(msg, YT_ORIGIN);
  const onMessage = (e: MessageEvent) => {
    const i = frames.findIndex((f) => f.contentWindow !== null && f.contentWindow === e.source);
    if (i < 0 || !YT_FROM.test(e.origin)) return;
    if (!heard[i]) {
      heard[i] = true;
      post(i, ytCommand('addEventListener', i + 1, ['onStateChange']));
      if (i === 0 && performance.now() - askedAt < 15000) {
        askedAt = -Infinity;
        post(0, ytCommand('playVideo', 1));
      }
    }
    const state = ytState(e.data);
    if (startsPlay(state)) opts.onPlay?.();
    if (state === 1) {
      frames.forEach((_, k) => {
        if (k !== i) post(k, ytCommand('pauseVideo', k + 1));
      });
    } else if (state === 0 && i + 1 < frames.length) post(i + 1, ytCommand('playVideo', i + 2));
  };
  window.addEventListener('message', onMessage);
  const timers: number[] = [];
  frames.forEach((f, i) => {
    // a player speaks once spoken to: say listening until it answers, ten seconds at most
    let tries = 0;
    const hello = () => {
      if (heard[i] || tries++ >= 40) return;
      post(i, JSON.stringify({ event: 'listening', id: i + 1, channel: 'widget' }));
      timers.push(window.setTimeout(hello, 250));
    };
    f.addEventListener('load', hello);
  });
  return {
    play: () => {
      if (!frames.length) return;
      if (heard[0]) post(0, ytCommand('playVideo', 1));
      else askedAt = performance.now();
    },
    talks: (f) => heard[frames.indexOf(f)] === true,
    unwire: () => {
      window.removeEventListener('message', onMessage);
      timers.forEach((t) => clearTimeout(t));
    },
  };
}
