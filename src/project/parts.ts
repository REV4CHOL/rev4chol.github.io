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

/** What a part's player has said of itself so far (the site's own bar reads it: project/player-bar.ts). */
export interface PartInfo {
  /** the player's state: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued; null before it says */
  state: number | null;
  /** seconds; `at` is when `time` was said (performance.now) */
  time: number;
  at: number;
  duration: number;
  muted: boolean;
  /** 0..100, the player's own level (kept while muted) */
  volume: number;
  /** the level YouTube plays at ('hd2160', 'large', …), or null */
  level: string | null;
  /** it has played (or buffered towards playing) at least once */
  started: boolean;
  /** the language of a captions track the player has offered (once offered, kept: the page's own off empties it) */
  captions: string | null;
  /** how many times the player's captions module has said it loaded (the page answers each with the visitor's choice) */
  captionLoads: number;
  /** 0..1: how far the film is loaded (`videoLoadedFraction`: the end of what is loaded around the playhead, as a
   *  fraction of the film); null while the player has not said, or said null (measured in the middle of a seek) */
  loaded: number | null;
}

export const NO_INFO: PartInfo = {
  state: null, time: 0, at: 0, duration: 0, muted: false, volume: 100, level: null, started: false, captions: null, captionLoads: 0,
  loaded: null,
};

type InfoNews = Partial<Pick<PartInfo, 'state' | 'time' | 'duration' | 'muted' | 'volume' | 'level' | 'captions' | 'loaded'>>;

/** The language of the track a captions delivery offers: the one on now, else the first listed; null for none. */
function offeredTrack(c: Record<string, unknown>): string | null {
  const lang = (t: unknown) => (typeof t === 'object' && t !== null && typeof (t as { languageCode?: unknown }).languageCode === 'string'
    ? (t as { languageCode: string }).languageCode || null : null);
  return lang(c.track) ?? (Array.isArray(c.tracklist) ? lang(c.tracklist[0]) : null);
}

/** The news in one of the player's messages: a delivery carries only what changed (measured: currentTime about every
 *  270 ms while playing; duration, muted, volume, playerState, playbackQuality as they change; videoLoadedFraction with
 *  nearly every one), a state change its
 *  state, a level change its level, the captions module's load the track it offers (`apiInfoDelivery`, measured about
 *  0.65 s after the start: GALAXY part 1 offered its auto-generated English, XIÊU LÒNG nothing). Null for anything else. */
export function ytInfo(data: unknown): InfoNews | null {
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
  if (m.event === 'onStateChange' && typeof m.info === 'number') return { state: m.info };
  if (m.event === 'onPlaybackQualityChange' && typeof m.info === 'string') return { level: m.info };
  if ((m.event === 'infoDelivery' || m.event === 'initialDelivery') && typeof m.info === 'object' && m.info !== null) {
    const i = m.info as Record<string, unknown>;
    const out: InfoNews = {};
    if (typeof i.playerState === 'number') out.state = i.playerState;
    if (typeof i.currentTime === 'number') out.time = i.currentTime;
    if (typeof i.duration === 'number') out.duration = i.duration;
    if (typeof i.muted === 'boolean') out.muted = i.muted;
    if (typeof i.volume === 'number') out.volume = i.volume;
    if (typeof i.playbackQuality === 'string') out.level = i.playbackQuality;
    // (measured: with nearly every delivery, about every 270 ms; null once in the middle of a seek)
    if (typeof i.videoLoadedFraction === 'number' && Number.isFinite(i.videoLoadedFraction)) out.loaded = Math.min(1, Math.max(0, i.videoLoadedFraction));
    else if (i.videoLoadedFraction === null) out.loaded = null;
    return Object.keys(out).length ? out : null;
  }
  if (m.event === 'apiInfoDelivery' && typeof m.info === 'object' && m.info !== null) {
    const c = (m.info as { captions?: unknown }).captions;
    if (typeof c === 'object' && c !== null) return { captions: offeredTrack(c as Record<string, unknown>) };
  }
  return null;
}

/** A part's info with the news in it (`now`: when it was heard, for the time's age). */
export function mergeInfo(prev: PartInfo, news: InfoNews, now = 0): PartInfo {
  const next = { ...prev, ...news };
  if (news.time !== undefined) next.at = now;
  if (news.captions !== undefined) {
    next.captions = news.captions ?? prev.captions;
    next.captionLoads = prev.captionLoads + 1;
  }
  if (startsPlay(news.state ?? null)) next.started = true;
  return next;
}

/** The page's hold on a film's YouTube players, in order. */
export interface Programme {
  /** Start the first part: at once when its player has answered, else as soon as it does (a lazy frame may still be
   *  loading), within fifteen seconds of the ask. A platform may refuse a start the page asks for; then the visitor's
   *  own press on the player plays it. */
  play(): void;
  /** Whether this frame's player has answered (and so says for itself when it plays). */
  talks(frame: HTMLIFrameElement): boolean;
  /** What this frame's player has said of itself (NO_INFO for a frame not in the programme). */
  info(frame: HTMLIFrameElement): PartInfo;
  /** Send this frame's player a command (playVideo, pauseVideo, seekTo, mute, unMute, setVolume, setOption). */
  send(frame: HTMLIFrameElement, func: string, args?: unknown[]): void;
  /** Hear every change of this frame's info, and its first answer; returns the unsubscribe. */
  watch(frame: HTMLIFrameElement, cb: (info: PartInfo, talks: boolean) => void): () => void;
  unwire(): void;
}

/** A silent player is greeted every GREETING_MS after each load of its frame, GREETINGS times, counted only while the
 *  page is seen: thirty seconds, twice the wait of the site's bar (player-bar.ts, HANDSHAKE_MS), so the greeting never
 *  stops before that wait ends (ten seconds of clock time until 2026-11-24: a tab loaded in the background spent
 *  them unseen). */
export const GREETING_MS = 250;
export const GREETINGS = 120;

/** Wires the YouTube players (built with enablejsapi and this page's origin) into one programme, in order. `onPlay`
 *  hears every start. */
export function linkParts(frames: HTMLIFrameElement[], opts: { onPlay?: () => void } = {}): Programme {
  const heard = frames.map(() => false);
  const infos = frames.map(() => NO_INFO);
  const watchers = frames.map(() => new Set<(info: PartInfo, talks: boolean) => void>());
  const tell = (i: number) => watchers[i].forEach((cb) => cb(infos[i], heard[i]));
  let askedAt = -Infinity;
  const post = (i: number, msg: string) => frames[i].contentWindow?.postMessage(msg, YT_ORIGIN);
  const onMessage = (e: MessageEvent) => {
    const i = frames.findIndex((f) => f.contentWindow !== null && f.contentWindow === e.source);
    if (i < 0 || !YT_FROM.test(e.origin)) return;
    if (!heard[i]) {
      heard[i] = true;
      post(i, ytCommand('addEventListener', i + 1, ['onStateChange']));
      post(i, ytCommand('addEventListener', i + 1, ['onPlaybackQualityChange']));
      if (i === 0 && performance.now() - askedAt < 15000) {
        askedAt = -Infinity;
        post(0, ytCommand('playVideo', 1));
      }
    }
    const news = ytInfo(e.data);
    if (news) infos[i] = mergeInfo(infos[i], news, performance.now());
    tell(i);
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
    // a player speaks once spoken to: say listening until it answers, GREETINGS times at most while the page is seen
    // (counted afresh at each load: a frame whose address is held loads an empty page first)
    let tries = 0;
    let greeting = 0;
    const hello = () => {
      if (heard[i]) return;
      if (!document.hidden && tries++ >= GREETINGS) return;
      post(i, JSON.stringify({ event: 'listening', id: i + 1, channel: 'widget' }));
      greeting = window.setTimeout(hello, GREETING_MS);
      timers.push(greeting);
    };
    f.addEventListener('load', () => {
      // a new document in the frame (the held address arriving, or the plain player swapped in: player-bar.ts) is a
      // new player: it is greeted afresh and knows nothing yet
      heard[i] = false;
      infos[i] = NO_INFO;
      tell(i);
      tries = 0;
      clearTimeout(greeting); // (one chain of greetings a frame)
      hello();
    });
  });
  const at = (f: HTMLIFrameElement) => frames.indexOf(f);
  return {
    play: () => {
      if (!frames.length) return;
      if (heard[0]) post(0, ytCommand('playVideo', 1));
      else askedAt = performance.now();
    },
    talks: (f) => heard[at(f)] === true,
    info: (f) => infos[at(f)] ?? NO_INFO,
    send: (f, func, args = []) => {
      const i = at(f);
      if (i >= 0) post(i, ytCommand(func, i + 1, args));
    },
    watch: (f, cb) => {
      const i = at(f);
      if (i < 0) return () => {};
      watchers[i].add(cb);
      return () => { watchers[i].delete(cb); };
    },
    unwire: () => {
      window.removeEventListener('message', onMessage);
      timers.forEach((t) => clearTimeout(t));
    },
  };
}
