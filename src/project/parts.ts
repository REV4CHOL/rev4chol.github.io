/** A film in parts plays from one WATCH (owner 2026-09-28, GALAXY Z FOLD 8 ULTRA: "one watch will spawn two embed
 *  YouTube videos at once, on the same row together"). The parts hear each other over the YouTube player's
 *  postMessage interface: a part that starts pauses the others, and a part that ends starts the next. A player that
 *  never answers still plays by hand. */

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

/** A command, as the player's postMessage interface takes it. */
export function ytCommand(func: string, id: number, args: unknown[] = []): string {
  return JSON.stringify({ event: 'command', func, args, id, channel: 'widget' });
}

/** Wires the parts' YouTube players (built with enablejsapi and this page's origin) into one programme, in order.
 *  Returns the unwiring. */
export function linkParts(frames: HTMLIFrameElement[]): () => void {
  const heard = frames.map(() => false);
  const post = (i: number, msg: string) => frames[i].contentWindow?.postMessage(msg, YT_ORIGIN);
  const onMessage = (e: MessageEvent) => {
    const i = frames.findIndex((f) => f.contentWindow !== null && f.contentWindow === e.source);
    if (i < 0 || !YT_FROM.test(e.origin)) return;
    if (!heard[i]) {
      heard[i] = true;
      post(i, ytCommand('addEventListener', i + 1, ['onStateChange']));
    }
    const state = ytState(e.data);
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
  return () => {
    window.removeEventListener('message', onMessage);
    timers.forEach((t) => clearTimeout(t));
  };
}
