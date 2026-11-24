/** THE SITE'S OWN PLAYER BAR (owner, 2026-11-24: "force all video players on the website to start at 2160p when watch";
 *  shown the choice as a picture, they chose "2160p + site's own controls"). A YouTube film's frame is laid out 2160
 *  device px on its short side and scaled down into the page's box (project/frame-size.ts), which shrinks everything
 *  YouTube draws (to 0.31 on a 1440-wide PC); so the frame asks for no controls (`controls=0`) and the site draws its
 *  own at normal size: play, time, seek, sound, the level the player reports, fullscreen. It speaks to the player over
 *  the postMessage link the page already has (project/parts.ts).
 *
 *  - At rest nothing of the site's catches a press over the picture: the visitor's first press lands INSIDE the frame
 *    (a real gesture inside the frame is what lets Safari start with sound). The site's play mark over the resting
 *    picture is a picture only.
 *  - Once the player says it has started, a clear catcher covers the picture: a press plays or pauses, a double press
 *    goes fullscreen. Paused, nothing of the site's is drawn over the picture.
 *  - The bar stands under the picture in the page; in fullscreen it lies over the picture's foot and hides when idle.
 *  - The bar is trusted only once the player has answered the page; a player silent HANDSHAKE_MS after its load,
 *    counted only while the page is seen, is swapped for the plain frame with YouTube's own controls (Safari and
 *    every browser that could not be tested). That swap is the ONLY way a film that got this player loses it, and it
 *    writes its reason into the player's record (lib/player-record.ts: the readout's PLAYER line). */

import type { PartInfo, Programme } from './parts';
import { bigFrame } from './frame-size';
import type { PlayerRecord } from '../lib/player-record';
import { posterZoom } from '../lib/poster-lock';

/* ----------------------------------------------------------------------------------------------------- the words -- */

const LEVELS: Record<string, string> = {
  hd2880: '2880P', hd2160: '2160P', hd1440: '1440P', hd1080: '1080P', hd720: '720P',
  large: '480P', medium: '360P', small: '240P', tiny: '144P',
};

/** The level YouTube reports, as the readout writes it; null until it is known. */
export function levelLabel(q: string | null | undefined): string | null {
  return (q && LEVELS[q]) || null;
}

/** Seconds as the bar writes them: 0:07, 4:20, 1:02:03. */
export function timeText(s: number): string {
  const t = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/* ------------------------------------------------------------------------------------------------- the states -- */

export type Phase = 'waiting' | 'resting' | 'playing' | 'paused' | 'ended';

/** waiting: the player has not answered (nothing of the bar is trusted yet); resting: answered, never started;
 *  then playing (or buffering), paused, ended. */
export function phaseOf(talks: boolean, info: PartInfo): Phase {
  if (!talks) return 'waiting';
  if (!info.started) return 'resting';
  if (info.state === 0) return 'ended';
  if (info.state === 1 || info.state === 3) return 'playing';
  return 'paused';
}

export interface BarView {
  phase: Phase;
  play: { label: string; aria: string };
  /** null before the film has started: the site shows no running time before a film plays */
  time: { elapsed: string; total: string } | null;
  /** 0..1 along the seek track */
  progress: number;
  seekable: boolean;
  sound: { label: string; aria: string; pressed: boolean };
  /** the volume slider's place (0 while muted) and its words */
  volume: { value: number; text: string };
  /** the CC switch: null where the film's player has offered no track, or before the film has started */
  cc: { label: string; aria: string; pressed: boolean } | null;
  level: string | null;
  /** the site's play mark over the resting picture (a picture: it takes no press) */
  mark: boolean;
  /** the clear catcher over the picture */
  catcher: boolean;
}

/** Where the film stands in seconds: the last time said, run on while it plays (`now`: performance.now). */
export function elapsed(info: PartInfo, now?: number): number {
  let t = info.state === 0 && info.duration > 0 ? info.duration : info.time;
  if (now !== undefined && info.state === 1) t += Math.max(0, now - info.at) / 1000;
  return info.duration > 0 ? Math.min(t, info.duration) : t;
}

/** `captions.track`: the language of a track this film's player has offered (as the page knows it, see knownTrack);
 *  `captions.cc`: the visitor turned captions on (the player echoes no captions change: the page's own word). */
export function barView(talks: boolean, info: PartInfo, now?: number, captions: { track?: string | null; cc?: boolean } = {}): BarView {
  const phase = phaseOf(talks, info);
  const live = phase === 'playing' || phase === 'paused' || phase === 'ended';
  const dur = info.duration > 0 ? info.duration : 0;
  const t = elapsed(info, now);
  const vol = info.muted ? 0 : Math.round(Math.min(100, Math.max(0, info.volume)));
  const ccOn = captions.cc === true;
  return {
    phase,
    play:
      phase === 'playing' ? { label: 'PAUSE', aria: 'Pause' }
      : phase === 'ended' ? { label: 'AGAIN', aria: 'Play again' }
      : { label: 'PLAY', aria: 'Play' },
    time: live && dur ? { elapsed: timeText(t), total: timeText(dur) } : null,
    progress: dur ? Math.min(1, Math.max(0, t / dur)) : 0,
    seekable: live && dur > 0,
    sound: info.muted ? { label: 'SOUND OFF', aria: 'Unmute', pressed: false } : { label: 'SOUND ON', aria: 'Mute', pressed: true },
    volume: { value: vol, text: info.muted ? 'muted' : `${vol}%` },
    cc: live && captions.track
      ? (ccOn ? { label: 'CC ON', aria: 'Turn captions off', pressed: true } : { label: 'CC OFF', aria: 'Turn captions on', pressed: false })
      : null,
    level: live ? levelLabel(info.level) : null,
    mark: phase === 'resting',
    catcher: live,
  };
}

/* ------------------------------------------------------------------------------------- volume and captions -- */

/** The volume slider's keys: the arrows step VOLUME_STEP, Home and End go to the ends; null for any other key. */
export const VOLUME_STEP = 5;
export function volumeKey(key: string, v: number): number | null {
  const clamp = (x: number) => Math.min(100, Math.max(0, x));
  if (key === 'ArrowRight' || key === 'ArrowUp') return clamp(v + VOLUME_STEP);
  if (key === 'ArrowLeft' || key === 'ArrowDown') return clamp(v - VOLUME_STEP);
  if (key === 'Home') return 0;
  if (key === 'End') return 100;
  return null;
}

/** What the slider asks of the player at `v` (owner, 2026-11-24, ticked "A volume slider: A slider beside SOUND ON / OFF
 *  on PCs"): above 0 the volume, and the sound back on if it was off; at 0 the sound off, the volume left where it
 *  was, so SOUND ON brings back the level the visitor last heard (YouTube's own slider does the same). */
export function volumeCommands(v: number, muted: boolean): [string, unknown[]][] {
  const n = Math.round(Math.min(100, Math.max(0, v)));
  if (n <= 0) return muted ? [] : [['mute', []]];
  return muted ? [['setVolume', [n]], ['unMute', []]] : [['setVolume', [n]]];
}

/** The captions command (owner, 2026-11-24, ticked "Captions always off" and "A captions switch"). Measured on GALAXY
 *  part 1 over the postMessage link: `setOption('captions', 'track', {})` sent at the captions module's load kept the
 *  box away for the whole film (64 reads, every 400 ms, none showed one), and `{ languageCode }` brought it back.
 *  (`unloadModule('captions')` sent at the load did nothing: the box showed 24 times of 64.) */
export function captionCommand(on: boolean, track: string | null): [string, unknown[]] {
  return ['setOption', ['captions', 'track', on && track ? { languageCode: track } : {}]];
}

/** THE CAPTIONS MEMORY: the track a film's player once offered in this browser. Measured: the player may remember the
 *  page's off across loads and then offers no track at all (after `setOption('captions', 'track', {})`, a reload offered
 *  `track: {}` on GALAXY part 1 in the one run measured), so without this the switch would vanish for a returning
 *  visitor. A store that throws is no memory. */
const CC_KEY = 'rvl-cc-v1';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export function knownTrack(store: Store | null, id: string, offered: string | null): string | null {
  let all: Record<string, string> = {};
  try {
    const raw = store?.getItem(CC_KEY);
    if (raw) all = JSON.parse(raw) as Record<string, string>;
  } catch { /* no memory */ }
  if (offered) {
    if (all[id] !== offered) {
      all[id] = offered;
      try { store?.setItem(CC_KEY, JSON.stringify(all)); } catch { /* no memory */ }
    }
    return offered;
  }
  return typeof all[id] === 'string' ? all[id] : null;
}

/** The seek track's keys: the arrows step SEEK_STEP s, Home and End go to the ends; null for any other key. */
export const SEEK_STEP = 5;
export function seekTo(key: string, time: number, duration: number): number | null {
  const clamp = (v: number) => Math.min(duration, Math.max(0, v));
  if (key === 'ArrowRight' || key === 'ArrowUp') return clamp(time + SEEK_STEP);
  if (key === 'ArrowLeft' || key === 'ArrowDown') return clamp(time - SEEK_STEP);
  if (key === 'Home') return 0;
  if (key === 'End') return duration;
  return null;
}

/** THE HANDSHAKE: `loaded()` at each load of the frame's real address starts a count of `wait` ms, which runs only
 *  while the page is seen (`visible`); a player still silent at its end calls `fail` with the time counted (once,
 *  ever). An answer ends it for good: a player that has spoken is never swapped.
 *  (6 s of clock time until the owner's "YouTube player is appearing now wtf", 2026-11-24: a tab loaded in the
 *  background, a slow line or a busy machine must not cost the film its player.) */
export const HANDSHAKE_MS = 15000;
const HANDSHAKE_TICK = 250;
export function handshake(o: { talks: () => boolean; fail: (silent: number) => void; wait?: number; visible?: () => boolean }): { loaded(): void; stop(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  let counted = 0;
  const wait = o.wait ?? HANDSHAKE_MS;
  const step = () => {
    if (done) return;
    if (o.talks()) { done = true; return; }
    if (!o.visible || o.visible()) counted += HANDSHAKE_TICK;
    if (counted >= wait) {
      done = true;
      o.fail(counted);
      return;
    }
    timer = setTimeout(step, HANDSHAKE_TICK);
  };
  return {
    loaded() {
      if (done) return;
      clearTimeout(timer);
      counted = 0;
      timer = setTimeout(step, HANDSHAKE_TICK);
    },
    stop() {
      done = true;
      clearTimeout(timer);
    },
  };
}

/* ---------------------------------------------------------------------------------------------------- the page -- */

/** The bar's glyphs, drawn in the text's own colour (16 px grid). */
const ICON: Record<string, string> = {
  play: '<path d="M4 2.5v11l9.5-5.5z"/>',
  pause: '<path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/>',
  again: '<path d="M2.5 2.5h2v11h-2zM6 8l8-5.5v11z"/>',
  on: '<path d="M1.5 5.5h3l4-3.5v12l-4-3.5h-3z"/><path d="M11 5a4 4 0 0 1 0 6M12.8 3a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  off: '<path d="M1.5 5.5h3l4-3.5v12l-4-3.5h-3z"/><path d="M10.5 5.5l5 5M15.5 5.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  full: '<path d="M1.5 6V1.5H6M10 1.5h4.5V6M14.5 10v4.5H10M6 14.5H1.5V10" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  exit: '<path d="M6 1.5V6H1.5M14.5 6H10V1.5M10 14.5V10h4.5M1.5 10H6v4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  cc: '<path d="M1.5 3h13v10h-13z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.2 6.2H5v3.6h2.2M11.7 6.2H9.5v3.6h2.2" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  ccoff: '<path d="M1.5 3h13v10h-13z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.2 6.2H5v3.6h2.2M11.7 6.2H9.5v3.6h2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1 15L15 1" fill="none" stroke="currentColor" stroke-width="1.5"/>',
};
const svg = (name: string) => `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor">${ICON[name]}</svg>`;

/** A YouTube film in the big frame: `root` is what goes fullscreen (the picture and the bar together), `pic` keeps the
 *  page's box, `frame` is laid out large inside it. */
export interface BigFilm {
  root: HTMLElement;
  pic: HTMLElement;
  frame: HTMLIFrameElement;
  mark: HTMLElement;
  catcher: HTMLElement;
  bar: HTMLElement;
  /** the address of the plain player, with YouTube's own controls (the handshake's fallback) */
  plainSrc: string;
  /** the film's own picture ratio (width over height): the frame is sized on the picture inside it */
  ratio: number;
  /** the player's record (lib/player-record.ts): its state and its frame, for the readout */
  record: PlayerRecord | null;
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
const fsElement = (): Element | null => document.fullscreenElement ?? (document as FsDoc).webkitFullscreenElement ?? null;

/** Lay the frame out for the box as it stands now: large and scaled down while the box is under 2160 device px on its
 *  short side, at the box's own size once it is not (a box grown that far: a fullscreen on a 4K screen). A box
 *  without a size is left alone (a tab not laid out yet, a hidden section): the box is watched, and the frame is
 *  fitted the moment it has one. Returns the layout in the readout's words, null for a box without a size. */
function fitFrame(pic: HTMLElement, frame: HTMLIFrameElement, ratio: number): string | null {
  // plate px (clientWidth): under the poster lock a box's own px hold still while the window zooms the plate
  const w = pic.clientWidth, h = pic.clientHeight;
  if (!w || !h) return null;
  const f = bigFrame({ width: w, height: h }, window.devicePixelRatio || 1, posterZoom(), ratio);
  frame.style.width = `${f ? f.width : w}px`;
  frame.style.height = `${f ? f.height : h}px`;
  frame.style.transform = f ? `scale(${f.scale})` : '';
  return f ? `FRAME ${f.width} × ${f.height} AT ${f.scale.toFixed(2)}` : `FRAME ${w} × ${h} AT ITS OWN SIZE`;
}
const NO_SIZE = 'ITS BOX HAS NO SIZE YET';

/** Build the big player around `frame` (made with the big address, `controls=0`) at the end of `host`. It always
 *  stands: a box without a size yet, or one that needs no larger frame, keeps the site's player all the same (until
 *  2026-11-24 it gave the film YouTube's own player for the whole visit: measured, a page loaded in a tab that was
 *  not laid out yet). */
export function mountBig(host: HTMLElement, frame: HTMLIFrameElement, opts: { plainSrc: string; accent: string; ratio: number; record?: PlayerRecord | null }): BigFilm {
  const root = document.createElement('div');
  root.className = 'p-film';
  root.dataset.phase = 'waiting';
  root.style.setProperty('--film-acc', opts.accent);
  const pic = document.createElement('div');
  pic.className = 'p-film-pic';
  frame.classList.add('p-frame--big');
  const mark = document.createElement('span');
  mark.className = 'p-film-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = `${svg('play')}<span>PLAY</span>`;
  const catcher = document.createElement('div');
  catcher.className = 'p-film-catch';
  catcher.tabIndex = -1;
  catcher.hidden = true;
  pic.append(frame, mark, catcher);
  const bar = document.createElement('div');
  bar.className = 'p-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', `${frame.title}: player controls`);
  bar.innerHTML =
    `<button type="button" class="p-bar-btn p-bar-play" aria-label="Play">${svg('play')}<span class="p-bar-word">PLAY</span></button>` +
    `<span class="p-bar-time" hidden><span class="p-bar-el">0:00</span><span class="p-bar-sep"> / </span><span class="p-bar-tot">0:00</span></span>` +
    `<div class="p-bar-seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00" aria-disabled="true"><span class="p-bar-rail"><span class="p-bar-fill"></span><span class="p-bar-knob"></span></span></div>` +
    `<span class="p-bar-level" hidden></span>` +
    `<button type="button" class="p-bar-btn p-bar-cc" aria-label="Turn captions on" aria-pressed="false" hidden>${svg('ccoff')}<span class="p-bar-word">CC OFF</span></button>` +
    `<button type="button" class="p-bar-btn p-bar-sound" aria-label="Mute" aria-pressed="true">${svg('on')}<span class="p-bar-word">SOUND ON</span></button>` +
    `<div class="p-bar-vol" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-valuetext="100%"><span class="p-bar-vrail"><span class="p-bar-vfill"></span><span class="p-bar-vknob"></span></span></div>` +
    `<button type="button" class="p-bar-btn p-bar-full" aria-label="Full screen">${svg('full')}<span class="p-bar-word">FULL SCREEN</span></button>`;
  root.append(pic, bar);
  host.append(root);
  const record = opts.record ?? null;
  const said = fitFrame(pic, frame, opts.ratio);
  if (record) record.frame = said ?? NO_SIZE;
  return { root, pic, frame, mark, catcher, bar, plainSrc: opts.plainSrc, ratio: opts.ratio, record };
}

/** Wire a big film's bar to the programme: the frame's fit, the handshake, the presses, the keys, fullscreen. */
export function armBar(film: BigFilm, programme: Programme): void {
  const { root, pic, frame, mark, catcher, bar, record } = film;
  const q = <T extends HTMLElement>(s: string) => bar.querySelector<T>(s)!;
  const playBtn = q<HTMLButtonElement>('.p-bar-play'), soundBtn = q<HTMLButtonElement>('.p-bar-sound'), fullBtn = q<HTMLButtonElement>('.p-bar-full');
  const timeEl = q('.p-bar-time'), elEl = q('.p-bar-el'), totEl = q('.p-bar-tot'), seek = q('.p-bar-seek'), levelEl = q('.p-bar-level');
  const ccBtn = q<HTMLButtonElement>('.p-bar-cc'), vol = q('.p-bar-vol');

  // THE FIT: the box is watched (the page's reflows, fullscreen) and so is the window (the poster lock's zoom, a move
  // to a screen of another pixel ratio, which leave the box's own px as they were)
  const fit = () => {
    const said = fitFrame(pic, frame, film.ratio);
    if (record && record.kind === 'site') record.frame = said ?? NO_SIZE;
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
  ro?.observe(pic);
  window.addEventListener('resize', fit);

  let plain = false;
  let view: BarView = barView(false, programme.info(frame));
  let drag: number | null = null; // the seek track's place while a finger or the mouse holds it (0..1)
  let shown: { t: number; until: number } | null = null; // a seek just asked for: shown until the player catches up
  let ticker = 0;
  // CAPTIONS: off unless the visitor turns them on (the page's own word: the player echoes no captions change);
  // `track` is what this film's player has offered, as the captions memory knows it
  let ccOn = false;
  let track: string | null = null;
  let ccLoads = 0;
  // the volume slider's place while the mouse holds it, and a level just asked for, shown until the player says it
  let volDrag: number | null = null;
  let volShown: { v: number; until: number } | null = null;

  const now = () => performance.now();
  const info = () => programme.info(frame);
  const send = (func: string, args: unknown[] = []) => programme.send(frame, func, args);
  const fs = () => fsElement() === root;

  // a button is written only when what it says changes: rewritten under a press (the time runs four times a second),
  // the press's target left the page between its down and its up, and the click was lost (measured)
  const put = (btn: HTMLButtonElement, aria: string, icon: string, word: string) => {
    const key = `${aria}|${icon}|${word}`;
    if (btn.dataset.said === key) return;
    btn.dataset.said = key;
    btn.setAttribute('aria-label', aria);
    btn.innerHTML = `${svg(icon)}<span class="p-bar-word">${word}</span>`;
  };
  const paint = () => {
    if (plain) return;
    const i = info();
    view = barView(programme.talks(frame), i, now(), { track, cc: ccOn });
    root.dataset.phase = view.phase;
    mark.hidden = !view.mark;
    catcher.hidden = !view.catcher;
    // the site's own cursor stands over the catcher (shell/cursor.ts steps aside only from a frame nothing covers)
    frame.toggleAttribute('data-covered', view.catcher);
    put(playBtn, view.play.aria, view.phase === 'playing' ? 'pause' : view.phase === 'ended' ? 'again' : 'play', view.play.label);
    const dur = i.duration > 0 ? i.duration : 0;
    let t = elapsed(i, now());
    if (shown && now() < shown.until && Math.abs(t - shown.t) > 1.5) t = shown.t;
    else shown = null;
    const p = drag ?? (dur ? Math.min(1, t / dur) : 0);
    timeEl.hidden = !view.time;
    if (view.time) {
      elEl.textContent = timeText(drag !== null ? drag * dur : t);
      totEl.textContent = view.time.total;
    }
    seek.style.setProperty('--p', String(p));
    seek.setAttribute('aria-disabled', String(!view.seekable));
    seek.setAttribute('aria-valuemax', String(Math.round(dur)));
    seek.setAttribute('aria-valuenow', String(Math.round(p * dur)));
    seek.setAttribute('aria-valuetext', view.time ? `${timeText(p * dur)} of ${view.time.total}` : 'not started');
    levelEl.hidden = !view.level;
    levelEl.textContent = view.level ?? '';
    soundBtn.setAttribute('aria-pressed', String(view.sound.pressed));
    put(soundBtn, view.sound.aria, view.sound.pressed ? 'on' : 'off', view.sound.label);
    let v = view.volume.value;
    if (volShown && now() < volShown.until && Math.abs(v - volShown.v) > 1) v = volShown.v;
    else volShown = null;
    if (volDrag !== null) v = volDrag;
    vol.style.setProperty('--v', String(v / 100));
    vol.setAttribute('aria-valuenow', String(v));
    vol.setAttribute('aria-valuetext', v === view.volume.value ? view.volume.text : `${v}%`);
    ccBtn.hidden = !view.cc;
    if (view.cc) {
      ccBtn.setAttribute('aria-pressed', String(view.cc.pressed));
      put(ccBtn, view.cc.aria, view.cc.pressed ? 'cc' : 'ccoff', view.cc.label);
    }
    const on = fs();
    put(fullBtn, on ? 'Exit full screen' : 'Full screen', on ? 'exit' : 'full', on ? 'EXIT' : 'FULL SCREEN');
    // the time runs on between the player's deliveries while it plays
    if (view.phase === 'playing' && !ticker) ticker = window.setInterval(paint, 250);
    if (view.phase !== 'playing' && ticker) { clearInterval(ticker); ticker = 0; }
  };

  // THE FIRST START: the press was inside the frame, where the page hears no keys; the keys come to the catcher
  let wasStarted = false;
  let loadedAt = 0;
  let answered = false;
  const unwatch = programme.watch(frame, (i, talks) => {
    // the record: how long after its frame's load the player first answered the page
    if (talks && !answered && record) record.why = `ANSWERED ${Math.round(now() - loadedAt)} MS AFTER ITS LOAD`;
    answered = talks;
    if (i.started && !wasStarted && document.activeElement === frame) catcher.focus({ preventScroll: true });
    wasStarted = i.started;
    // each load of the player's captions module (the start, a replay, a new document) is answered with the visitor's
    // choice: off unless they turned them on (owner, 2026-11-24: "Turn YouTube's captions off on every film, so no
    // caption box ever appears over the picture")
    if (i.captionLoads > 0 && i.captionLoads !== ccLoads) {
      ccLoads = i.captionLoads;
      const id = /\/embed\/([^?/#]+)/.exec(frame.src)?.[1] ?? '';
      let store: Storage | null = null;
      try { store = window.localStorage; } catch { /* no memory */ }
      track = id ? knownTrack(store, id, i.captions) : i.captions;
      send(...captionCommand(ccOn, track));
    } else if (i.captionLoads === 0) ccLoads = 0;
    const before = view.phase;
    paint();
    if (view.phase !== before) wake();
  });

  const toggle = () => {
    const ph = view.phase;
    if (ph === 'playing') send('pauseVideo');
    else if (ph === 'ended') { send('seekTo', [0, true]); send('playVideo'); }
    else if (ph !== 'waiting') send('playVideo');
  };
  const toggleSound = () => send(info().muted ? 'unMute' : 'mute');
  const toggleCc = () => {
    if (!track) return;
    ccOn = !ccOn;
    send(...captionCommand(ccOn, track));
    paint();
  };
  const setVolume = (v: number) => {
    for (const [func, args] of volumeCommands(v, info().muted)) send(func, args);
    volShown = { v: Math.round(v), until: now() + 1500 };
    paint();
  };
  const seekAt = (t: number) => {
    send('seekTo', [t, true]);
    shown = { t, until: now() + 1500 };
    paint();
  };
  const toggleFull = () => {
    if (fs()) {
      const d = document as FsDoc;
      if (d.exitFullscreen) void d.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
    } else {
      const el = root as FsEl;
      if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
      else el.webkitRequestFullscreen?.();
    }
  };

  // IN FULLSCREEN the bar lies over the picture's foot and goes after IDLE_MS without movement while the film plays;
  // movement, a press, a pause or the keyboard's focus brings it back
  const IDLE_MS = 2500;
  let idleTimer = 0;
  const wake = () => {
    root.classList.remove('p-film--idle');
    clearTimeout(idleTimer);
    if (!fs() || view.phase !== 'playing') return;
    idleTimer = window.setTimeout(() => {
      // (the keyboard's focus holds it: a button pressed by mouse keeps the focus too, and must not)
      if (fs() && view.phase === 'playing' && !bar.querySelector(':focus-visible')) root.classList.add('p-film--idle');
    }, IDLE_MS);
  };
  const onFs = () => {
    root.classList.toggle('p-film--fs', fs());
    fit();
    paint();
    wake();
  };
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
  root.addEventListener('pointermove', wake);
  bar.addEventListener('focusin', wake);

  // THE CATCHER: a press plays or pauses (held a moment, so a double press only goes fullscreen); on a touch screen in
  // fullscreen, a tap while the bar is away only brings it back
  let pressTimer = 0;
  let wakeOnly = false;
  catcher.addEventListener('pointerdown', (e) => {
    wakeOnly = e.pointerType === 'touch' && root.classList.contains('p-film--idle');
    wake();
  });
  catcher.addEventListener('click', (e) => {
    if (wakeOnly) { wakeOnly = false; return; }
    if (e.detail > 1) return;
    clearTimeout(pressTimer);
    pressTimer = window.setTimeout(toggle, 250);
  });
  catcher.addEventListener('dblclick', (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    toggleFull();
  });
  catcher.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === ' ' || k === 'k' || k === 'K' || k === 'Enter') toggle();
    else if (k === 'f' || k === 'F') toggleFull();
    else if (k === 'm' || k === 'M') toggleSound();
    else if ((k === 'c' || k === 'C') && view.cc) toggleCc();
    else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const i = info();
      const to = view.seekable ? seekTo(k, elapsed(i, now()), i.duration) : null;
      if (to === null) return;
      seekAt(to);
    } else return;
    e.preventDefault();
    wake();
  });

  playBtn.addEventListener('click', toggle);
  soundBtn.addEventListener('click', toggleSound);
  ccBtn.addEventListener('click', toggleCc);
  fullBtn.addEventListener('click', toggleFull);

  // THE VOLUME SLIDER (a fine pointer only: a touch screen keeps its own volume keys; the CSS hides it there): press or
  // drag along it, or its keys. Each move is sent, so the visitor hears the level as they go
  const volAt = (x: number) => {
    const r = vol.querySelector('.p-bar-vrail')!.getBoundingClientRect();
    return r.width ? Math.round(Math.min(1, Math.max(0, (x - r.left) / r.width)) * 100) : 0;
  };
  vol.addEventListener('pointerdown', (e) => {
    vol.setPointerCapture(e.pointerId);
    volDrag = volAt(e.clientX);
    setVolume(volDrag);
  });
  vol.addEventListener('pointermove', (e) => {
    if (volDrag === null) return;
    const v = volAt(e.clientX);
    if (v === volDrag) return;
    volDrag = v;
    setVolume(v);
  });
  const volRelease = () => {
    if (volDrag === null) return;
    volDrag = null;
    paint();
  };
  vol.addEventListener('pointerup', volRelease);
  vol.addEventListener('pointercancel', volRelease);
  vol.addEventListener('keydown', (e) => {
    const to = volumeKey(e.key, view.volume.value);
    if (to === null) return;
    e.preventDefault();
    setVolume(to);
  });

  // THE SEEK TRACK: press or drag along it, or its keys
  const fracAt = (x: number) => {
    const r = seek.querySelector('.p-bar-rail')!.getBoundingClientRect();
    return r.width ? Math.min(1, Math.max(0, (x - r.left) / r.width)) : 0;
  };
  seek.addEventListener('pointerdown', (e) => {
    if (!view.seekable) return;
    seek.setPointerCapture(e.pointerId);
    drag = fracAt(e.clientX);
    paint();
  });
  seek.addEventListener('pointermove', (e) => {
    if (drag === null) return;
    drag = fracAt(e.clientX);
    paint();
  });
  const release = (e: PointerEvent) => {
    if (drag === null) return;
    const f = fracAt(e.clientX);
    drag = null;
    if (e.type === 'pointerup') seekAt(f * info().duration);
    else paint();
  };
  seek.addEventListener('pointerup', release);
  seek.addEventListener('pointercancel', release);
  seek.addEventListener('keydown', (e) => {
    if (!view.seekable) return;
    const i = info();
    const to = seekTo(e.key, elapsed(i, now()), i.duration);
    if (to === null) return;
    e.preventDefault();
    seekAt(to);
  });

  // THE HANDSHAKE (Safari, and every browser that could not be tested): counted from each load of the real address
  // (a frame whose address is held loads an empty page first), only while the page is seen; a silent player gets the
  // plain frame, for good, and the record says so
  const hs = handshake({ talks: () => programme.talks(frame), fail: (silent) => fallBack(silent), visible: () => !document.hidden });
  frame.addEventListener('load', () => {
    if (!frame.getAttribute('src')) return;
    loadedAt = now();
    if (record && !plain && !answered) record.why = 'ITS FRAME LOADED · WAITING FOR ITS ANSWER';
    hs.loaded();
  });
  const fallBack = (silent: number) => {
    plain = true;
    if (record) {
      record.kind = 'platform';
      record.why = `ITS PLAYER STAYED SILENT ${Math.round(silent / 1000)} S AFTER ITS LOAD · YOUTUBE'S OWN PLAYER TOOK ITS PLACE`;
      record.frame = null;
    }
    unwatch();
    ro?.disconnect();
    window.removeEventListener('resize', fit);
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('webkitfullscreenchange', onFs);
    clearInterval(ticker);
    clearTimeout(idleTimer);
    if (fs()) toggleFull();
    frame.classList.remove('p-frame--big');
    frame.removeAttribute('style');
    frame.removeAttribute('data-covered');
    // out of the page first, then the plain address, then back in its place: an iframe put back in the page navigates
    // to the address it holds (moved first, measured: it asked for the big address again and the plain one never came)
    frame.remove();
    frame.src = film.plainSrc;
    root.replaceWith(frame);
  };

  paint();
}
