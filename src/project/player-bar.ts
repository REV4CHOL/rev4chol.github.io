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
 *  - The bar is trusted only once the player has answered the page; a player silent 6 s after its load is swapped for
 *    the plain frame with YouTube's own controls (Safari and every browser that could not be tested). */

import type { PartInfo, Programme } from './parts';
import { bigFrame } from './frame-size';
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

export function barView(talks: boolean, info: PartInfo, now?: number): BarView {
  const phase = phaseOf(talks, info);
  const live = phase === 'playing' || phase === 'paused' || phase === 'ended';
  const dur = info.duration > 0 ? info.duration : 0;
  const t = elapsed(info, now);
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
    level: live ? levelLabel(info.level) : null,
    mark: phase === 'resting',
    catcher: live,
  };
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

/** THE HANDSHAKE: `loaded()` at each load of the frame's real address starts a count of `wait` ms; a player still
 *  silent at its end calls `fail` (once, ever). The answer at the count's end latches it either way. */
export const HANDSHAKE_MS = 6000;
export function handshake(o: { talks: () => boolean; fail: () => void; wait?: number }): { loaded(): void; stop(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  return {
    loaded() {
      if (done) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (done) return;
        done = true;
        if (!o.talks()) o.fail();
      }, o.wait ?? HANDSHAKE_MS);
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
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
const fsElement = (): Element | null => document.fullscreenElement ?? (document as FsDoc).webkitFullscreenElement ?? null;

/** Lay the frame out for the box as it stands now: large and scaled down while the box is under 2160 device px on its
 *  short side, at the box's own size once it is not (a box grown that far: a fullscreen on a 4K screen). */
function fitFrame(pic: HTMLElement, frame: HTMLIFrameElement, ratio: number): void {
  // plate px (clientWidth): under the poster lock a box's own px hold still while the window zooms the plate
  const w = pic.clientWidth, h = pic.clientHeight;
  if (!w || !h) return;
  const f = bigFrame({ width: w, height: h }, window.devicePixelRatio || 1, posterZoom(), ratio);
  frame.style.width = `${f ? f.width : w}px`;
  frame.style.height = `${f ? f.height : h}px`;
  frame.style.transform = f ? `scale(${f.scale})` : '';
}

/** Build the big player around `frame` (made with the big address, `controls=0`) at the end of `host`. Returns null,
 *  and leaves nothing in the page, when the box needs no big frame (its short side already stands 2160 device px). */
export function mountBig(host: HTMLElement, frame: HTMLIFrameElement, opts: { plainSrc: string; accent: string; ratio: number }): BigFilm | null {
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
    `<button type="button" class="p-bar-btn p-bar-sound" aria-label="Mute" aria-pressed="true">${svg('on')}<span class="p-bar-word">SOUND ON</span></button>` +
    `<button type="button" class="p-bar-btn p-bar-full" aria-label="Full screen">${svg('full')}<span class="p-bar-word">FULL SCREEN</span></button>`;
  root.append(pic, bar);
  host.append(root);
  if (!bigFrame({ width: pic.clientWidth, height: pic.clientHeight }, window.devicePixelRatio || 1, posterZoom(), opts.ratio)) {
    frame.classList.remove('p-frame--big');
    root.remove();
    return null;
  }
  fitFrame(pic, frame, opts.ratio);
  return { root, pic, frame, mark, catcher, bar, plainSrc: opts.plainSrc, ratio: opts.ratio };
}

/** Wire a big film's bar to the programme: the frame's fit, the handshake, the presses, the keys, fullscreen. */
export function armBar(film: BigFilm, programme: Programme): void {
  const { root, pic, frame, mark, catcher, bar } = film;
  const q = <T extends HTMLElement>(s: string) => bar.querySelector<T>(s)!;
  const playBtn = q<HTMLButtonElement>('.p-bar-play'), soundBtn = q<HTMLButtonElement>('.p-bar-sound'), fullBtn = q<HTMLButtonElement>('.p-bar-full');
  const timeEl = q('.p-bar-time'), elEl = q('.p-bar-el'), totEl = q('.p-bar-tot'), seek = q('.p-bar-seek'), levelEl = q('.p-bar-level');

  // THE FIT: the box is watched (the page's reflows, fullscreen) and so is the window (the poster lock's zoom, a move
  // to a screen of another pixel ratio, which leave the box's own px as they were)
  const fit = () => fitFrame(pic, frame, film.ratio);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
  ro?.observe(pic);
  window.addEventListener('resize', fit);

  let plain = false;
  let view: BarView = barView(false, programme.info(frame));
  let drag: number | null = null; // the seek track's place while a finger or the mouse holds it (0..1)
  let shown: { t: number; until: number } | null = null; // a seek just asked for: shown until the player catches up
  let ticker = 0;

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
    view = barView(programme.talks(frame), i, now());
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
    const on = fs();
    put(fullBtn, on ? 'Exit full screen' : 'Full screen', on ? 'exit' : 'full', on ? 'EXIT' : 'FULL SCREEN');
    // the time runs on between the player's deliveries while it plays
    if (view.phase === 'playing' && !ticker) ticker = window.setInterval(paint, 250);
    if (view.phase !== 'playing' && ticker) { clearInterval(ticker); ticker = 0; }
  };

  // THE FIRST START: the press was inside the frame, where the page hears no keys; the keys come to the catcher
  let wasStarted = false;
  const unwatch = programme.watch(frame, (i) => {
    if (i.started && !wasStarted && document.activeElement === frame) catcher.focus({ preventScroll: true });
    wasStarted = i.started;
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
  fullBtn.addEventListener('click', toggleFull);

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
  // (a frame whose address is held loads an empty page first); a silent player gets the plain frame, for good
  const hs = handshake({ talks: () => programme.talks(frame), fail: () => fallBack() });
  frame.addEventListener('load', () => { if (frame.getAttribute('src')) hs.loaded(); });
  const fallBack = () => {
    plain = true;
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
