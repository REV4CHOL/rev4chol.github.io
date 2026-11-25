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
 *  - At a film's first start, in Chrome's engine, the film is held (project/hold.ts): silenced and covered while the
 *    player moves up to its level, then loaded again and uncovered, sharp from its first frame. The one time the page
 *    paints over the player (owner, 2026-11-25: "Wait, then start sharp").
 *  - The bar is trusted only once the player has answered the page; a player silent HANDSHAKE_MS after its load,
 *    counted only while the page is seen, is swapped for the plain frame with YouTube's own controls (Safari and
 *    every browser that could not be tested). That swap is the ONLY way a film that got this player loses it, and it
 *    writes its reason into the player's record (lib/player-record.ts: the readout's PLAYER line).
 *  - ANDROID (owner, 2026-11-25: "also why can't our custom Player go to Phone? Like the other platforms?"; told the
 *    reasons, they chose "Android only"): the same bar, over a frame laid out by the same rule to Android's smaller
 *    target and scaled down (frame-size.ts, frameTarget, ANDROID_PX), and no hold. */

import type { PartInfo, Programme } from './parts';
import { bigFrame, FrameFit, FrameTarget, isAndroid, targetPx } from './frame-size';
import { Hold, holdAsked, holdCommands, holdNext, holdSaid, holdSee, holdStart, holdWanted, silenceLeft, silenceNote } from './hold';
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

export type Phase = 'waiting' | 'resting' | 'holding' | 'playing' | 'paused' | 'ended';

/** waiting: the player has not answered (nothing of the bar is trusted yet); resting: answered, never started;
 *  holding: started, and held under the cover until it starts over at its level (project/hold.ts);
 *  then playing (or buffering), paused, ended. */
export function phaseOf(talks: boolean, info: PartInfo, holding = false): Phase {
  if (!talks) return 'waiting';
  if (!info.started) return 'resting';
  if (holding) return 'holding';
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
  /** 0..1 along the seek track: how far the film is loaded, as the player says; null before the film has started or
   *  while it is not known */
  loaded: number | null;
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
  /** the hold's cover over the picture (project/hold.ts) */
  hold: boolean;
}

/** Where the film stands in seconds: the last time said, run on while it plays (`now`: performance.now). */
export function elapsed(info: PartInfo, now?: number): number {
  let t = info.state === 0 && info.duration > 0 ? info.duration : info.time;
  if (now !== undefined && info.state === 1) t += Math.max(0, now - info.at) / 1000;
  return info.duration > 0 ? Math.min(t, info.duration) : t;
}

/** `captions.track`: the language of a track this film's player has offered (as the page knows it, see knownTrack);
 *  `captions.cc`: the visitor turned captions on (the player echoes no captions change: the page's own word). */
export function barView(talks: boolean, info: PartInfo, now?: number, captions: { track?: string | null; cc?: boolean } = {}, holding = false): BarView {
  const phase = phaseOf(talks, info, holding);
  const live = phase === 'playing' || phase === 'paused' || phase === 'ended';
  const dur = info.duration > 0 ? info.duration : 0;
  const t = elapsed(info, now);
  const vol = info.muted ? 0 : Math.round(Math.min(100, Math.max(0, info.volume)));
  const ccOn = captions.cc === true;
  return {
    phase,
    play:
      phase === 'playing' ? { label: 'PAUSE', aria: 'Pause' }
      : phase === 'holding' ? { label: 'LOADING', aria: 'Loading the film' }
      : phase === 'ended' ? { label: 'AGAIN', aria: 'Play again' }
      : { label: 'PLAY', aria: 'Play' },
    time: live && dur ? { elapsed: timeText(t), total: timeText(dur) } : null,
    progress: dur && phase !== 'holding' ? Math.min(1, Math.max(0, t / dur)) : 0,
    loaded: live && dur && info.loaded !== null ? Math.min(1, Math.max(0, info.loaded)) : null,
    seekable: live && dur > 0,
    sound: info.muted ? { label: 'SOUND OFF', aria: 'Unmute', pressed: false } : { label: 'SOUND ON', aria: 'Mute', pressed: true },
    volume: { value: vol, text: info.muted ? 'muted' : `${vol}%` },
    cc: live && captions.track
      ? (ccOn ? { label: 'CC ON', aria: 'Turn captions off', pressed: true } : { label: 'CC OFF', aria: 'Turn captions on', pressed: false })
      : null,
    level: live ? levelLabel(info.level) : null,
    mark: phase === 'resting',
    catcher: live,
    hold: phase === 'holding',
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

/** THE LOADED BAND (owner, 2026-11-25: "Player: Should've a preload indicator like YouTube, so user can know and not try
 *  to skip the playhead past it and ended up lagging themselves"): a lighter band on the seek rail from where the film
 *  stands to where the player says it is loaded. The fraction says only where the run around the playhead ENDS, not
 *  where it starts (measured: 0.748 just after a seek to 70 %, the stretch from 0.12 to 0.70 never loaded), so the band
 *  starts at the playhead: under the played part that looks like YouTube's band from the start, and while the rail is
 *  held (the fill drawn back to the held place) it claims nothing behind the playhead.
 *  A seek BACK moves the playhead at once, but the fraction the player last said was the end of the run around the OLD
 *  playhead, and it stands until the player's next word; so, while a seek back is unanswered (`stale`), no band.
 *  (A seek forward inside the run keeps it true: the run is one piece from the old playhead to its end. Past it, the
 *  end lies behind the playhead: no band.) */
export function loadedBand(loaded: number | null, played: number, stale: boolean): { from: number; to: number } | null {
  if (loaded === null || stale || loaded <= played) return null;
  return { from: played, to: loaded };
}

/** How long a seek back may hold the band at the playhead without a new word from the player. */
export const STALE_MS = 3000;
export interface Stale { was: number | null; until: number }
/** A seek from `from` s to `to` s, with the player's last fraction `was`, sent at `now`: stale only backward. */
export function staleAfterSeek(was: number | null, from: number, to: number, now: number): Stale | null {
  return to < from ? { was, until: now + STALE_MS } : null;
}
/** Still stale: the player has said no new fraction (a null in the middle of a seek is no new word) and STALE_MS have
 *  not passed. */
export function stillStale(s: Stale | null, loaded: number | null, now: number): boolean {
  if (!s || now > s.until) return false;
  return loaded === null || loaded === s.was;
}

/** The fullscreen button's words (owner, 2026-11-25: "Player: FULL SCREEN should be FULLSCREEN"): one word, in what it
 *  shows and what it says; in fullscreen it reads EXIT. The markup and the repaint both take them from here. */
export function fullWords(on: boolean): { aria: string; icon: string; word: string } {
  return on ? { aria: 'Exit fullscreen', icon: 'exit', word: 'EXIT' } : { aria: 'Fullscreen', icon: 'full', word: 'FULLSCREEN' };
}

/** The orientation a film in fullscreen asks of a touch screen (a design call, 2026-11-25): its own shape, a vertical
 *  film upright, every other on its side; null with a mouse (a desktop has no turn to ask for). */
export function lockFor(ratio: number, coarse: boolean): 'landscape' | 'portrait' | null {
  if (!coarse) return null;
  return ratio < 1 ? 'portrait' : 'landscape';
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
  /** the hold's cover (project/hold.ts) */
  hold: HTMLElement;
  bar: HTMLElement;
  /** the address of the plain player, with YouTube's own controls (the handshake's fallback) */
  plainSrc: string;
  /** the film's own picture ratio (width over height): the frame is sized on the picture inside it */
  ratio: number;
  /** the player's record (lib/player-record.ts): its state and its frame, for the readout */
  record: PlayerRecord | null;
  /** the target the frame is fitted to: the big frame's, or Android's smaller one (frame-size.ts, frameTarget) */
  target: FrameTarget;
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
const fsElement = (): Element | null => document.fullscreenElement ?? (document as FsDoc).webkitFullscreenElement ?? null;

/** Lay the frame out for the box as it stands now: large and scaled down while the box is under 2160 device px on its
 *  short side (its rows even, its own and the screen's: frame-size.ts, THE THIN LINE; the height is a fraction of a px
 *  and the scale is the rule's, both written as the rule gives them), at the box's own size once it is not (a box grown that far: a
 *  fullscreen on a 4K screen). A box
 *  without a size is left alone (a tab not laid out yet, a hidden section): the box is watched, and the frame is
 *  fitted the moment it has one. Returns the layout in the readout's words, null for a box without a size. */
function fitFrame(pic: HTMLElement, frame: HTMLIFrameElement, ratio: number, target: FrameTarget): string | null {
  // plate px (clientWidth): under the poster lock a box's own px hold still while the window zooms the plate
  const w = pic.clientWidth, h = pic.clientHeight;
  if (!w || !h) return null;
  // (Android: the same rule to its own, smaller target: frame-size.ts, ANDROID_PX)
  const f = bigFrame({ width: w, height: h }, window.devicePixelRatio || 1, posterZoom(), ratio, targetPx(target));
  frame.style.width = `${f ? f.width : w}px`;
  frame.style.height = `${f ? f.height : h}px`;
  frame.style.transform = f ? `scale(${f.scale})` : '';
  return fitSaid(f, w, h);
}
/** The frame's layout in the record's words, the same on every platform: the frame and its scale, or its own size (a
 *  box grown past its target's rule). */
export function fitSaid(f: FrameFit | null, w: number, h: number): string {
  if (f) return `FRAME ${Math.round(f.width)} × ${Math.round(f.height)} AT ${f.scale.toFixed(2)}`;
  return `FRAME ${w} × ${h} AT ITS OWN SIZE`;
}
const NO_SIZE = 'ITS BOX HAS NO SIZE YET';

/** Build the big player around `frame` (made with the big address, `controls=0`) at the end of `host`. It always
 *  stands: a box without a size yet, or one that needs no larger frame, keeps the site's player all the same (until
 *  2026-11-24 it gave the film YouTube's own player for the whole visit: measured, a page loaded in a tab that was
 *  not laid out yet). */
export function mountBig(host: HTMLElement, frame: HTMLIFrameElement, opts: { plainSrc: string; accent: string; ratio: number; record?: PlayerRecord | null; poster?: string; target?: FrameTarget }): BigFilm {
  const target = opts.target ?? 'big';
  const root = document.createElement('div');
  root.className = 'p-film';
  // (Android: its frame's own target, and the narrow bar's own rules in project.css)
  if (target === 'android') root.classList.add('p-film--android');
  root.dataset.phase = 'waiting';
  root.style.setProperty('--film-acc', opts.accent);
  const pic = document.createElement('div');
  pic.className = 'p-film-pic';
  frame.classList.add('p-frame--big');
  // THE KEYBOARD'S WAY GOES BY THE SITE'S BAR (the review's walkthroughs: Tab went from ALL FILMS into the frame's
  // insides, seven presses with no ring, and Space there started nothing): the bar stands for the film, so the frame is
  // out of the Tab order, its insides with it; a press inside it with the mouse or a finger still lands there. The
  // handshake's fallback gives it back (fallBack below): YouTube's own player is then the only way to play.
  frame.tabIndex = -1;
  const mark = document.createElement('span');
  mark.className = 'p-film-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = `${svg('play')}<span>PLAY</span>`;
  const catcher = document.createElement('div');
  catcher.className = 'p-film-catch';
  catcher.tabIndex = -1;
  catcher.hidden = true;
  // THE HOLD'S COVER: the film's own poster, dimmed, and a mark that says the film is loading (hidden until a hold)
  const hold = document.createElement('div');
  hold.className = 'p-film-hold';
  hold.hidden = true;
  hold.setAttribute('role', 'status');
  if (opts.poster) hold.style.setProperty('--hold-pic', `url("${opts.poster}")`);
  hold.innerHTML = '<span class="p-film-hold-mark"><span>LOADING</span><span class="p-film-hold-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>';
  pic.append(frame, mark, catcher, hold);
  const bar = document.createElement('div');
  bar.className = 'p-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', `${frame.title}: player controls`);
  const fullOff = fullWords(false);
  bar.innerHTML =
    `<button type="button" class="p-bar-btn p-bar-play" aria-label="Play">${svg('play')}<span class="p-bar-word">PLAY</span></button>` +
    `<span class="p-bar-time" hidden><span class="p-bar-el">0:00</span><span class="p-bar-sep"> / </span><span class="p-bar-tot">0:00</span></span>` +
    `<div class="p-bar-seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00" aria-disabled="true"><span class="p-bar-rail"><span class="p-bar-load" hidden></span><span class="p-bar-fill"></span><span class="p-bar-knob"></span></span></div>` +
    `<span class="p-bar-level" hidden></span>` +
    `<button type="button" class="p-bar-btn p-bar-cc" aria-label="Turn captions on" aria-pressed="false" hidden>${svg('ccoff')}<span class="p-bar-word">CC OFF</span></button>` +
    `<button type="button" class="p-bar-btn p-bar-sound" aria-label="Mute" aria-pressed="true">${svg('on')}<span class="p-bar-word">SOUND ON</span></button>` +
    `<div class="p-bar-vol" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-valuetext="100%"><span class="p-bar-vrail"><span class="p-bar-vfill"></span><span class="p-bar-vknob"></span></span></div>` +
    `<button type="button" class="p-bar-btn p-bar-full" aria-label="${fullOff.aria}">${svg(fullOff.icon)}<span class="p-bar-word">${fullOff.word}</span></button>`;
  root.append(pic, bar);
  host.append(root);
  const record = opts.record ?? null;
  const said = fitFrame(pic, frame, opts.ratio, target);
  if (record) record.frame = said ?? NO_SIZE;
  return { root, pic, frame, mark, catcher, hold, bar, plainSrc: opts.plainSrc, ratio: opts.ratio, record, target };
}

/** Wire a big film's bar to the programme: the frame's fit, the handshake, the presses, the keys, fullscreen. */
export function armBar(film: BigFilm, programme: Programme): void {
  const { root, pic, frame, mark, catcher, hold: cover, bar, record } = film;
  const q = <T extends HTMLElement>(s: string) => bar.querySelector<T>(s)!;
  const playBtn = q<HTMLButtonElement>('.p-bar-play'), soundBtn = q<HTMLButtonElement>('.p-bar-sound'), fullBtn = q<HTMLButtonElement>('.p-bar-full');
  const timeEl = q('.p-bar-time'), elEl = q('.p-bar-el'), totEl = q('.p-bar-tot'), seek = q('.p-bar-seek'), levelEl = q('.p-bar-level');
  const ccBtn = q<HTMLButtonElement>('.p-bar-cc'), vol = q('.p-bar-vol'), loadEl = q('.p-bar-load');

  // THE FIT: the box is watched (the page's reflows, fullscreen) and so is the window (the poster lock's zoom, a move
  // to a screen of another pixel ratio, which leave the box's own px as they were)
  const fit = () => {
    const said = fitFrame(pic, frame, film.ratio, film.target);
    if (record && record.kind === 'site') record.frame = said ?? NO_SIZE;
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
  ro?.observe(pic);
  window.addEventListener('resize', fit);

  let plain = false;
  let view: BarView = barView(false, programme.info(frame));
  let drag: number | null = null; // the seek track's place while a finger or the mouse holds it (0..1)
  let shown: { t: number; until: number } | null = null; // a seek just asked for: shown until the player catches up
  let stale: Stale | null = null; // a seek back the player has not answered with a new loaded fraction (loadedBand)
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

  // THE HOLD (project/hold.ts): `held` while the film waits under the cover; `holds`: this browser holds at all
  const holds = holdWanted(navigator.userAgent, location.search);
  let held: Hold | null = null;
  let heldAt = 0;
  let holdTimer = 0;
  let soundDue = 0; // the page has given the sound back: the bar says so until the player does, or this time passes
  let notes: Storage | null = null;
  try { notes = window.localStorage; } catch { /* no note */ }
  // a hold of an earlier visit that ended without giving the sound back: given back as this player answers
  let soundOwed = holds && silenceLeft(notes);
  if (record && record.kind === 'site') {
    record.hold = holds ? 'HOLDS ITS FIRST START' : isAndroid(navigator.userAgent) ? 'NO HOLD ON ANDROID' : 'NO HOLD IN THIS BROWSER';
  }

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
    // (while the film is held, and for a moment after its sound is given back, the bar shows the sound as the visitor
    // left it, not the page's own silence)
    const i = (held && held.silenced) || now() < soundDue ? { ...info(), muted: false } : info();
    view = barView(programme.talks(frame), i, now(), { track, cc: ccOn }, held !== null);
    root.dataset.phase = view.phase;
    mark.hidden = !view.mark;
    catcher.hidden = !view.catcher;
    cover.hidden = !view.hold;
    // the site's own cursor stands over the catcher and the cover (shell/cursor.ts steps aside only from a frame
    // nothing covers)
    frame.toggleAttribute('data-covered', view.catcher || view.hold);
    put(playBtn, view.play.aria, view.phase === 'playing' ? 'pause' : view.phase === 'ended' ? 'again' : 'play', view.play.label);
    const dur = i.duration > 0 ? i.duration : 0;
    let t = elapsed(i, now());
    if (shown && now() < shown.until && Math.abs(t - shown.t) > 1.5) t = shown.t;
    else shown = null;
    const p = view.hold ? 0 : drag ?? (dur ? Math.min(1, t / dur) : 0); // (held: the rail stands at the start)
    timeEl.hidden = !view.time;
    if (view.time) {
      elEl.textContent = timeText(drag !== null ? drag * dur : t);
      totEl.textContent = view.time.total;
    }
    seek.style.setProperty('--p', String(p));
    // the loaded band: measured against where the film stands (not the place a finger is dragging)
    if (!stillStale(stale, i.loaded, now())) stale = null;
    const band = loadedBand(view.loaded, dur ? Math.min(1, t / dur) : 0, stale !== null);
    loadEl.hidden = band === null;
    seek.style.setProperty('--ls', String(band ? band.from : 0));
    seek.style.setProperty('--l', String(band ? band.to : 0));
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
    const fw = fullWords(on);
    put(fullBtn, fw.aria, fw.icon, fw.word);
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
    // the sound a hold of an earlier visit left taken (the visitor left in the middle of the wait)
    if (soundOwed && talks && !i.started && i.muted) {
      soundOwed = false;
      send('unMute');
      silenceNote(notes, false);
    }
    if (i.started && !wasStarted) beginHold(i);
    if (i.started && !wasStarted && !held && document.activeElement === frame) catcher.focus({ preventScroll: true });
    wasStarted = i.started;
    if (held) stepHold();
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

  // THE HOLD, step by step: the wait begins at the film's first start (silenced, covered), the player's every word
  // and a clock move it on, and it ends with the film uncovered as it starts over
  const filmId = () => /\/embed\/([^?/#]+)/.exec(frame.src)?.[1] ?? '';
  let pressedOn = false; // the visitor pressed the cover: the keys are theirs once it lifts
  const endHold = () => {
    held = null;
    clearInterval(holdTimer);
    holdTimer = 0;
    silenceNote(notes, false);
    paint(); // (the catcher stands again)
    // the keys come to the catcher from here on (the press that started the film was inside the frame)
    if (pressedOn || document.activeElement === frame) catcher.focus({ preventScroll: true });
    pressedOn = false;
  };
  const askAgain = (ask: 'reload' | 'restart', how: 'reload' | 'restart' | 'skip') => {
    if (!held) return;
    if (record && record.kind === 'site') record.hold = holdSaid(how, now() - heldAt, held.level);
    for (const [func, args] of holdCommands(ask, filmId(), held.silenced)) send(func, args);
    silenceNote(notes, false);
    if (held.silenced) soundDue = now() + 1500;
    held = holdAsked(held, now());
  };
  function stepHold(): void {
    if (!held) return;
    held = holdSee(held, info(), now());
    const ask = holdNext(held, info(), now());
    if (ask === 'reload' || ask === 'restart') askAgain(ask, ask);
    else if (ask === 'release') endHold();
    paint();
  }
  function beginHold(i: PartInfo): void {
    if (plain || !holds) return;
    held = holdStart(i, now());
    heldAt = now();
    // (a player still muted by a hold the visitor left: that silence is the page's too)
    if (soundOwed && i.muted) held = { ...held, silenced: true };
    soundOwed = false;
    if (held.silenced) {
      silenceNote(notes, true);
      send('mute');
    }
    holdTimer = window.setInterval(stepHold, 150);
  }
  // a press on the cover, or on the bar's button, does not wait: the film starts over now, from what is loaded
  const skipHold = () => {
    if (!held) return;
    if (held.step === 'waiting') askAgain('restart', 'skip');
    else endHold();
    paint();
  };
  cover.addEventListener('click', () => {
    pressedOn = true;
    skipHold();
  });

  // a seek back makes the loaded fraction the player last said stale (loadedBand); one forward leaves an earlier one
  const markSeek = (t: number) => {
    const i = info();
    const s = staleAfterSeek(i.loaded, elapsed(i, now()), t, now());
    if (!s) return;
    stale = s;
    window.setTimeout(paint, STALE_MS + 50); // (a paused film has no ticker to draw the band back when the wait ends)
  };
  const toggle = () => {
    const ph = view.phase;
    if (ph === 'holding') skipHold();
    else if (ph === 'playing') send('pauseVideo');
    else if (ph === 'ended') { markSeek(0); send('seekTo', [0, true]); send('playVideo'); }
    else if (ph !== 'waiting') send('playVideo');
  };
  // (while the film is held its sound is the page's: the switch and the slider wait)
  const toggleSound = () => { if (!held) send(info().muted ? 'unMute' : 'mute'); };
  const toggleCc = () => {
    if (!track) return;
    ccOn = !ccOn;
    send(...captionCommand(ccOn, track));
    paint();
  };
  const setVolume = (v: number) => {
    if (held) return;
    for (const [func, args] of volumeCommands(v, info().muted)) send(func, args);
    volShown = { v: Math.round(v), until: now() + 1500 };
    paint();
  };
  const seekAt = (t: number) => {
    markSeek(t);
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
  // THE DEVICE TURNS WITH THE FILM: on a touch screen, a film gone fullscreen asks for its own orientation (lockFor),
  // and gives it back on the way out; a browser that refuses (an iPad, most desktops) is never asked twice for an answer
  let locked = false;
  const turnFor = (on: boolean) => {
    type Orient = { lock?: (o: string) => Promise<void>; unlock?: () => void };
    const o = (typeof screen !== 'undefined' ? screen.orientation : undefined) as Orient | undefined;
    try {
      if (on) {
        const want = lockFor(film.ratio, typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
        if (!want || !o?.lock) return;
        locked = true;
        void Promise.resolve(o.lock(want)).catch(() => {});
      } else if (locked) {
        locked = false;
        o?.unlock?.();
      }
    } catch { /* refused: the device stays as the visitor holds it */ }
  };
  const onFs = () => {
    root.classList.toggle('p-film--fs', fs());
    turnFor(fs());
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
    clearInterval(holdTimer);
    held = null;
    cover.hidden = true;
    if (record) record.hold = null;
    ro?.disconnect();
    window.removeEventListener('resize', fit);
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('webkitfullscreenchange', onFs);
    clearInterval(ticker);
    clearTimeout(idleTimer);
    if (fs()) toggleFull();
    turnFor(false);
    frame.classList.remove('p-frame--big');
    frame.removeAttribute('style');
    frame.removeAttribute('data-covered');
    frame.removeAttribute('tabindex'); // (no bar now: the keyboard reaches YouTube's own controls again)
    // out of the page first, then the plain address, then back in its place: an iframe put back in the page navigates
    // to the address it holds (moved first, measured: it asked for the big address again and the plain one never came)
    frame.remove();
    frame.src = film.plainSrc;
    root.replaceWith(frame);
  };

  paint();
}
