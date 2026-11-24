/** MUSIC (owner: one track on every page and every section, continuous, never restarting; its own MUS button between
 *  SFX and MTN; WATCH on a film page stops it until the next section or page; a loading screen never interrupts it).
 *  The site's pages are separate documents, so the track's place is carried across each navigation in
 *  sessionStorage — the time it was at and the clock then — and the next page seeks to where the track would be
 *  now, wrapped by its length, and plays on; a page reached by a click may play at once (Chrome carries the activation
 *  over), a cold load waits for the first gesture. The choice (on / off) lives in localStorage. OFF BY DEFAULT (owner,
 *  2026-11-24: "I also want MUSIC off by default for the website"): it plays only for a visitor who pressed the switch
 *  on, and until then the track is not even fetched. The key is -v2: under -v1 no stored choice meant on. Pure except
 *  for the element and the stores handed in: tested with stand-ins. */
export const TRACK = '/content/music/night-road.mp3';
/** The track's volume. 0.3 since the owner's "Music too loud too" (2026-11-24); it stood at 0.55. The music boot in
 *  every page's head ramps to the same number: change both together (tests/sound-levels.test.ts holds them). */
export const VOLUME = 0.3;
const CHOICE = 'rvl-music-v2', POS = 'rvl-music-pos';

export interface Saved { t: number; at: number; held: boolean }
export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }
/** What the music plays through: what an <audio> offers, so a test can stand one in. */
export interface Deck {
  src: string; loop: boolean; preload: string; volume: number; currentTime: number; duration: number; paused: boolean;
  play(): Promise<void> | undefined; pause(): void; addEventListener(type: string, cb: () => void): void;
}

/** Where the track should be now: on from where it was by the clock — or, held (WATCH), exactly where it stopped —
 *  wrapped by the track's length. Nothing saved, or no length yet: the start. */
export function resumeAt(saved: Saved | null, now: number, duration: number): number {
  if (!saved || !(duration > 0)) return 0;
  const t = saved.held ? saved.t : saved.t + Math.max(0, (now - saved.at) / 1000);
  return ((t % duration) + duration) % duration;
}

export function readSaved(store: Store): Saved | null {
  try {
    const raw = store.getItem(POS);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Saved>;
    if (typeof s.t !== 'number' || typeof s.at !== 'number') return null;
    return { t: s.t, at: s.at, held: !!s.held };
  } catch { return null; }
}

export class Music {
  enabled = false;
  /** WATCH's hold: stopped, and staying stopped, until the next section or page (or MUS pressed on). */
  held = false;
  private fader: ReturnType<typeof setInterval> | null = null;
  private blocked = false; // refused by the browser (no activation yet): waiting for a gesture
  private waiting: (() => void)[] = [];
  private playingCbs: (() => void)[] = [];

  constructor(
    private deck: Deck, private local: Store, private session: Store,
    private now: () => number = () => Date.now(),
    private timers: { set: (fn: () => void, ms: number) => ReturnType<typeof setInterval>; clear: (h: ReturnType<typeof setInterval>) => void } = { set: (fn, ms) => setInterval(fn, ms), clear: (h) => clearInterval(h) }, // (wrapped: a bare window function called as a method is an "illegal invocation")
  ) {
    try { this.enabled = local.getItem(CHOICE) === 'on'; } catch { /* private mode: off, the default */ }
  }

  /** A page starts: the track set up, seeked to where it would be now and played if it may be. A hold from the last
   *  page ends here — the owner's "until moving to another section or page". */
  init(): void {
    const d = this.deck;
    const adopted = !!d.src; // the page head's MUSIC BOOT made it: seeked to the last page's place and playing (or refused) before any chunk loaded
    if (!adopted) {
      const saved = readSaved(this.session);
      d.loop = true; d.preload = this.enabled ? 'auto' : 'none'; d.volume = 0; // (off: nothing fetched until the switch asks)
      d.addEventListener('loadedmetadata', () => { d.currentTime = resumeAt(saved, this.now(), d.duration); });
    }
    d.addEventListener('timeupdate', () => this.save());
    d.addEventListener('pause', () => this.save());
    d.addEventListener('playing', () => { const cbs = this.playingCbs; this.playingCbs = []; for (const cb of cbs) cb(); });
    if (!adopted) d.src = TRACK;
    if (!this.enabled) return;
    if (!d.paused) this.fade(VOLUME, 120); // adopted and on: to the volume (the boot ramps too; the same target)
    else this.start(); // refused so far (no activation yet), or the module's own element
  }

  time(): number { return this.deck.currentTime; }

  /** The track's place, for the next page: its time and the clock now (held: exactly there, no clock). */
  save(): void {
    if (!this.enabled) return; // (off: no clock to carry; switched on later it starts at the top, or runs on from its last place)
    try { this.session.setItem(POS, JSON.stringify({ t: this.deck.currentTime, at: this.now(), held: this.held })); } catch { /* ok */ }
  }

  /** Play, fading in; refused (a cold load, no activation yet) it waits for the page's next gesture. */
  private start(): void {
    const p = this.deck.play();
    this.fade(VOLUME, 300);
    if (p && typeof p.catch === 'function') p.catch(() => { this.deck.volume = 0; this.blocked = true; this.waiting.push(() => { if (this.enabled && !this.held && this.deck.paused) this.start(); }); });
  }

  /** A gesture on the page (the shell wires pointerdown, pointerup, click, keydown, touchend — iOS grants sound inside
   *  a pointerup, click or touchend, never a pointerdown): a cold load's chance to play. */
  gesture(): void { this.blocked = false; const cbs = this.waiting; this.waiting = []; for (const cb of cbs) cb(); }

  /** Resolves when the track is audibly playing, or after `ms` — a page with heavy work ahead (the About city's build
   *  holds the main thread) starts the music first, so a loading screen never cuts it. */
  ready(ms = 600): Promise<void> {
    if (!this.enabled || this.held || this.blocked || !this.deck.paused) return Promise.resolve(); // (blocked: nothing to wait for)
    return new Promise((resolve) => { let done = false; const fin = () => { if (!done) { done = true; resolve(); } }; this.playingCbs.push(fin); setTimeout(fin, ms); });
  }

  private fade(to: number, ms: number, then?: () => void): void {
    if (this.fader) this.timers.clear(this.fader);
    const from = this.deck.volume, steps = Math.max(1, Math.round(ms / 40));
    let k = 0;
    this.fader = this.timers.set(() => {
      k += 1;
      this.deck.volume = from + (to - from) * Math.min(1, k / steps);
      if (k >= steps) { this.timers.clear(this.fader!); this.fader = null; then?.(); }
    }, 40);
  }

  /** WATCH (owner): the music stops and stays stopped until the next section or page. */
  hold(): void {
    if (this.held) return;
    this.held = true;
    this.fade(0, 400, () => { this.deck.pause(); this.save(); });
  }

  /** The MUS button. On lifts a hold; off stops and remembers. On but silent — refused so far (a phone's cold load:
   *  iOS grants no sound before a gesture on the document) — the press IS the gesture: it plays, and stays on (owner:
   *  on a phone the music stopped at every section and had to be re-enabled by hand). */
  toggle(): boolean {
    if (this.enabled && !this.held && this.deck.paused) { this.blocked = false; this.waiting = []; this.start(); return true; }
    this.enabled = !this.enabled;
    try { this.local.setItem(CHOICE, this.enabled ? 'on' : 'off'); } catch { /* ok */ }
    if (this.enabled) { this.held = false; this.start(); } else this.fade(0, 300, () => { this.deck.pause(); this.save(); });
    return this.enabled;
  }

  /** Leaving the page (the wipe): its place saved; no fade — the track runs to the page's last moment and the next
   *  page's head boot picks it up where it is. */
  leave(): void { this.save(); }

  playing(): boolean { return !this.deck.paused; }
}

const noStore: Store = { getItem: () => null, setItem: () => { /* nothing */ } };
const storeOr = (get: () => Store): Store => { try { return get(); } catch { return noStore; } };
export const music: Music = typeof window !== 'undefined'
  ? new Music((window as unknown as { rvlMusicBoot?: HTMLAudioElement }).rvlMusicBoot ?? document.createElement('audio'), storeOr(() => localStorage), storeOr(() => sessionStorage))
  : new Music({ src: '', loop: false, preload: '', volume: 0, currentTime: 0, duration: 0, paused: true, play: () => undefined, pause: () => { /* nothing */ }, addEventListener: () => { /* nothing */ } }, noStore, noStore);

if (typeof window !== 'undefined') {
  (window as unknown as { rvlMusic: unknown }).rvlMusic = { playing: () => music.playing(), enabled: () => music.enabled, held: () => music.held, time: () => music.time(), toggle: () => music.toggle(), hold: () => music.hold() };
}
