/** WORK ON A PHONE: THE REEL, built — a rolling strip (works/reel.ts says what it is and holds its rules).
 *
 *  - A strip per chapter: its films' panes, endless (no scrolling: the strip never ends and never jumps). A pane is half
 *    the screen, so two show at once (owner, 2026-11-24: "we should be able to see two panes on the phone screen at the
 *    same time"); a vertical film's is the whole screen; on a phone held on its side every pane is the screen. It arrives
 *    with film 1 at the screen's bottom (owner, 2026-11-24: "Film 1 in the lower half"), and from the first frame it
 *    rolls on, one screen's height every ROLL_SECONDS.
 *  - The roll runs on the compositor: each pane, its words and the rail's playhead run one linear animation a lap,
 *    phased by where they stand, so the screen's own clock moves them and a busy page (a film's video starting) never
 *    stutters the strip (owner, 2026-10-20: "I want the auto scrolling to happen instantly, but slower and smoother").
 *  - A finger takes it: the timelines pause and follow the finger; a release throws the strip, and the throw eases
 *    straight back into the roll, where the clock takes it again. A tap opens the film under it; a drag opens none.
 *    Under CALM it never rolls by itself.
 *  - A pane: the film's poster, then its loop, covering it around the film's focus point; on it only the film's name
 *    and its roles, and the house's hardware without words (the accent tab, the scan lines, the sprockets; no
 *    viewfinder: owner, 2026-11-25, "Remove the camera frame viewfinder in the WORK section scroll"). The words fade as they pass under the header and the foot. A vertical film on a phone held on its
 *    side stands whole in the middle.
 *  - Down the right, the scrub rail: a tick per film, the lime playhead travelling with the strip; a touch along it moves
 *    the strip there. At the foot, the chapters and LIST.
 *  - Every pane on the screen plays its loop. The panes within one unit of the screen rest, loaded and paused, so the
 *    next to come in starts the moment it enters (owner, 2026-11-24: three loops decode at most); further off they give
 *    their video back. A refused play() (iOS Low Power Mode) turns the loops into MP4 images (lib/autoplay.ts).
 *    Save-Data or a 2g line shows posters. `?loops=` pins them for a reading on a real phone (works/reel.ts:
 *    loopsPin). The page (pages/works.ts) runs the channel change and the list. */
import { aspectRatio, loopSrcChain, projectAssetUrl, type Project } from '../lib/content';
import { autoplayRefused, imageLoopsWork, isRefusal, loopsAsImages, noteImageLoops, noteRefusal, onRefusal } from '../lib/autoplay';
import { reducedMotion } from '../lib/env';
import { fillCrossed } from '../lib/cross';
import { softBreaks } from '../lib/escape';
import { fillTitle, settleLockup } from '../lib/title';
import { reelReturn, type ReelPlace } from './back-state';
import { CHANNELS, type ChannelKey, channelProjects } from './channels';
import {
  arrivalOffset, capKeyframes, coast, lanesToRetime, lapProgress, lapSeconds, lapUnits, loopKind, loopsAllowed, loopsPin, offsetForPane, offsetForPlace, offsetForRail, offsetFromLap,
  onePlays, oneLineSize, paneInView, paneKeyframes, panePlay, paneTop, paneUnits, places, railProgress, railTicks, REEL_WORDS, releaseSpeed,
  roleLine, rollPace, screenUnits, shownSize, SIDE_QUERY, stripFilms, stripOrder, stripPlace, TAP_SLOP, TITLE_MAX, TITLE_MIN, wrapStart,
  type LoopKind, type PanePlay,
} from './reel';

export interface Reel {
  /** show a chapter's strip from its first film */
  tune(key: ChannelKey): void;
  /** the list stands over it (true): the strip stops and its loops rest; false: back */
  park(parked: boolean): void;
}
export interface ReelOptions {
  active: ChannelKey;
  /** a chapter is asked for (the page runs the channel change, then calls tune) */
  onTune(key: ChannelKey): void;
  /** the list is asked for */
  onAll(): void;
  /** a return by Back: the place the strip was left on (works/back-state.ts); its first show starts there instead of
   *  arriving at film 1 */
  start?: ReelPlace | null;
  /** a film is opened: the strip's place as it stands, for the history entry */
  onOpen?(place: ReelPlace): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

type Loop = HTMLVideoElement | HTMLImageElement;
interface Strip {
  ol: HTMLOListElement;
  panes: HTMLLIElement[];
  /** each pane's words, and where they stand in it (px from its top: measured by fit) */
  caps: HTMLElement[];
  spans: [number, number][];
  films: number;
  /** the film behind each pane, and which films are vertical (works/reel.ts: stripOrder, paneUnits) */
  order: number[];
  tall: boolean[];
  /** as the screen stands (measure): each pane's height in units and its place, the strip's lap and the chapter's */
  units: number[];
  at: number[];
  total: number;
  chapter: number;
}

export function mountReel(main: HTMLElement, projects: Project[], o: ReelOptions): Reel {
  const total = projects.length;
  const root = el('section', 'reel');
  root.setAttribute('aria-label', 'The films, rolling');
  const rail = el('div', 'rl-rail');
  rail.setAttribute('aria-hidden', 'true');
  const foot = el('nav', 'rl-foot');
  foot.setAttribute('aria-label', 'Chapters');
  main.append(root, rail, foot);

  /* ------------------------------------------------------------ the strips -- */

  // a pane: the picture over half the screen, and on it the film's name and its roles — nothing else (owner,
  // 2026-10-20: "only the Project name, and the Role names are enough. Do not clog this section up with texts"). A
  // vertical film's pane is tall, two panes high: the whole screen (the styles size both; works/reel.ts counts them)
  const frameOf = (p: Project, eager: boolean): HTMLLIElement => {
    const li = el('li', `rl-frame${aspectRatio(p.aspect) < 1 ? ' is-tall' : ''}`);
    li.dataset.slug = p.slug;
    li.style.setProperty('--acc', p.accent);
    const a = el('a', 'rl-link');
    a.href = `/project.html?p=${p.slug}`;
    a.dataset.internal = '';
    a.draggable = false;
    a.setAttribute('aria-label', `${p.title}. ${p.role}. Open this film.`);
    const pane = el('span', `rl-pane${aspectRatio(p.aspect) < 1 ? ' is-vertical' : ''}`);
    pane.style.setProperty('--focus', p.focus); // (the crop keeps the film's subject: its focus point)
    const img = el('img', 'rl-poster');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.loading = eager ? 'eager' : 'lazy'; // (the panes on the screen at arrival, and the next to come in)
    img.src = projectAssetUrl(p.slug, 'poster.jpg');
    pane.append(img, el('i', 'rl-scan'));
    const cap = el('span', 'rl-cap');
    cap.append(el('i', 'rl-bar'), fillTitle(el('span', 'rl-title'), p.title, softBreaks), fillCrossed(el('span', 'rl-role micro'), roleLine(p.role))); // (a long name breaks at its _; a two-language name stands as two lines, lib/title.ts)
    a.append(pane, cap);
    li.append(a);
    return li;
  };

  // a chapter's films as the strip shows them: the owner's own first films, then the rest (works/reel.ts stripFilms).
  // The panes and the rail's ticks read this one list; the foot's count, the floor and THE LIST keep the file's order
  const filmsOf = (key: ChannelKey) => stripFilms(channelProjects(projects, key));
  const strips = new Map<ChannelKey, Strip>();
  for (const ch of CHANNELS) {
    const films = filmsOf(ch.key);
    const ol = el('ol', 'rl-strip');
    ol.dataset.ch = ch.key;
    ol.hidden = true;
    ol.setAttribute('aria-label', `${ch.index} ${ch.name}`);
    const tall = films.map((p) => aspectRatio(p.aspect) < 1);
    // laid for the upright screen, the longer need of the two: a turn of the phone never rebuilds a strip
    const order = stripOrder(tall.map((t) => paneUnits(t, false)), screenUnits(false));
    const panes = order.map((f, i) => {
      const li = frameOf(films[f], i < 2 || i === order.length - 1); // (film 1, the next to come in, and the last film above film 1)
      if (i >= films.length) { // (a short chapter laid again: the repeats are for the eye only)
        li.setAttribute('aria-hidden', 'true');
        li.querySelector('a')!.tabIndex = -1;
      }
      return li;
    });
    ol.append(...panes);
    root.append(ol);
    const caps = panes.map((li) => li.querySelector<HTMLElement>('.rl-cap')!);
    strips.set(ch.key, { ol, panes, caps, spans: caps.map(() => [0, 0]), films: films.length, order, tall, units: [], at: [], total: 0, chapter: 0 });
  }

  /* --------------------------------------------------------------- the foot -- */

  const chapterButtons = CHANNELS.map((ch) => {
    const b = el('button', 'rl-chap');
    b.type = 'button';
    b.dataset.ch = ch.key;
    const name = el('span', 'rl-chap-name');
    name.append(el('span', 'rl-chap-mark'), document.createTextNode(ch.name));
    b.append(el('span', 'rl-chap-idx micro'), name);
    b.addEventListener('click', () => { if (ch.key !== active) o.onTune(ch.key); });
    foot.append(b);
    return b;
  });
  const allBtn = el('button', 'rl-allbtn micro', REEL_WORDS.all);
  allBtn.type = 'button';
  allBtn.setAttribute('aria-label', REEL_WORDS.allLabel(total));
  allBtn.addEventListener('click', () => o.onAll());
  foot.append(allBtn);
  const paintFoot = () => {
    for (const b of chapterButtons) {
      const ch = CHANNELS.find((c) => c.key === b.dataset.ch)!;
      const on = ch.key === active;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      (b.querySelector('.rl-chap-mark') as HTMLElement).textContent = on ? '▸ ' : '';
      (b.querySelector('.rl-chap-idx') as HTMLElement).textContent = REEL_WORDS.chapterLine(ch.index, channelProjects(projects, ch.key).length);
    }
  };

  /* ------------------------------------------------------------- the fit -- */

  // the header's bottom (the menu and the switches, measured): the rail starts under it; between it
  // and the foot's top lies the clear band a pane's words stand in (the foot by its box: its arrival rise moves it)
  let bandTop = 0, bandBottom = 0;
  const measureTop = () => {
    let bottom = 0;
    for (const sel of ['.brand', '.nav-links', '.hud-tr']) {
      const e = document.querySelector(sel);
      if (e) bottom = Math.max(bottom, e.getBoundingClientRect().bottom);
    }
    main.style.setProperty('--reel-top', `${Math.ceil(bottom + 8)}px`);
    bandTop = bottom;
    bandBottom = window.innerHeight - foot.offsetHeight;
  };
  /** a name at its size in its caption (works/reel.ts), measured in its own face with its ▸ */
  const fitTitle = (t: HTMLElement, room: number) => {
    // a two-language name (lib/title.ts) fits on its English line alone, with its ▸; its second line then stands at
    // --tt-ratio of the SHOWN size, wrapping only if it must
    const main = t.querySelector<HTMLElement>('.tt-main');
    const alt = t.querySelector<HTMLElement>('.tt-alt');
    if (alt) alt.style.display = 'none';
    const s = t.style;
    s.whiteSpace = 'nowrap';
    s.fontSize = `${TITLE_MAX}px`;
    const one = oneLineSize(t.scrollWidth, room);
    s.whiteSpace = '';
    if (one !== null) s.fontSize = `${shownSize(one)}px`;
    else {
      s.overflowWrap = 'normal'; // (whole words while it measures: a word too wide widens the name instead of breaking)
      let size = wrapStart([...(main ?? t).textContent!.replace(/​/g, '')].length); // (letters, not its break marks)
      s.fontSize = `${size}px`;
      while (size > TITLE_MIN && t.scrollWidth > room + 0.5) s.fontSize = `${--size}px`;
      s.overflowWrap = '';
      s.fontSize = `${shownSize(size)}px`; // (the fit settled: the name shown smaller, wrapping as it will)
    }
    if (alt) { alt.style.display = ''; settleLockup(t); }
  };
  const fit = (s: Strip) => {
    s.caps.forEach((cap, i) => {
      fitTitle(cap.querySelector<HTMLElement>('.rl-title')!, cap.clientWidth);
      s.spans[i] = [cap.offsetTop, cap.offsetTop + cap.offsetHeight];
    });
  };

  /* ------------------------------------------------------------ the strip -- */

  let active: ChannelKey = o.active;
  let strip = strips.get(active)!;
  // two heights (works/reel.ts): the screen's, and a unit's — the height of a pane of one unit
  let offset = 0, v = 0, view = 1, unit = 1, side = false, raf = 0, last = 0;
  let parked = false, pinned = false, touching = false, pointer: number | null = null, startY = 0, startOffset = 0, moved = false, dragged = false;
  const moves: [number, number][] = [];
  const rollSpeed = () => (reducedMotion() ? 0 : rollPace(view)); // (CALM: it never rolls by itself)
  /** the two heights, and every pane's units and place as the screen stands */
  const measure = () => {
    view = strip.ol.clientHeight || window.innerHeight; // (no height yet under the LIST: the window's)
    side = window.matchMedia(SIDE_QUERY).matches; // (the styles' own line: on its side every pane is the screen)
    unit = view / screenUnits(side);
    strip.units = strip.order.map((f) => paneUnits(strip.tall[f], side));
    strip.at = places(strip.units);
    strip.total = lapUnits(strip.units);
    strip.chapter = lapUnits(strip.units.slice(0, strip.films));
  };
  /** the heights measured anew, the strip keeping its place: the same film under the screen's middle. A strip still
   *  standing where it arrived (CALM, or under the LIST) arrives again: turned on its side, film 1 fills the screen */
  const remeasure = () => {
    const arrived = offset === arrivalOffset(strip.units, unit, view);
    const [pane, part] = stripPlace(offset, unit, view, strip.units);
    measureTop();
    measure();
    offset = offsetForPlace(pane, part, unit, view, strip.units);
    if (arrived) offset = arrivalOffset(strip.units, unit, view);
  };

  /* ---------------------------------------------- the roll, on the compositor -- */

  // Each pane, its words and the rail's playhead run one linear animation a lap (works/reel.ts), phased by where they
  // stand. Rolling, the screen's clock moves them; by hand (a finger, a coast, a hold), they pause and their times are
  // set from the strip's offset.
  let lanes: { pane: Animation; cap: Animation }[] = [];
  let head: Animation | null = null;
  let rolling = false;
  // a lap's time is its length at the roll's pace: the strip's, and the chapter's for the rail's playhead
  const lapMs = () => lapSeconds(strip.total, unit, view) * 1000;
  const headMs = () => lapSeconds(strip.chapter, unit, view) * 1000;
  const timelines = (): Animation[] => [...lanes.flatMap((l) => [l.pane, l.cap]), ...(head ? [head] : [])];
  // the offset each pane's timelines were last set from (NaN: not since they last ran or were built)
  let shown: number[] = [];
  /** the timelines set from the strip's offset: every one (`all`), or by hand only the panes near the screen
   *  (works/reel.ts: lanesToRetime): a pane off it keeps its time, unseen, and each re-timing costs a style pass */
  const setTimes = (all = false) => {
    const lap = lapMs();
    if (shown.length !== lanes.length) shown = lanes.map(() => Number.NaN);
    const which = all ? lanes.map((_, i) => i) : lanesToRetime(strip.at, strip.units, offset, shown, unit, view, strip.total);
    for (const i of which) {
      const l = lanes[i], t = lapProgress(strip.at[i], strip.units[i], offset, unit, strip.total) * lap;
      l.pane.currentTime = t;
      l.cap.currentTime = t;
      shown[i] = offset;
    }
    if (head) head.currentTime = railProgress(offset, unit, view, strip.chapter) * headMs();
  };
  /** the strip's offset now: its own by hand; read from the clock while it rolls */
  const offsetNow = (): number => {
    if (rolling && lanes.length) {
      const lap = lapMs(), t = Number(lanes[0].pane.currentTime ?? 0);
      offset = offsetFromLap((((t % lap) + lap) % lap) / lap, strip.units[0], unit, strip.total, offset);
    }
    return offset;
  };
  /** the words' fades laid on their panes' laps (the band, the names or the screen's height changed) */
  const capFrames = () => {
    lanes.forEach((l, i) => (l.cap.effect as KeyframeEffect).setKeyframes(capKeyframes(strip.units[i], unit, strip.total, strip.spans[i], [bandTop, bandBottom])));
  };
  /** the animations anew for the strip shown, paused where it stands */
  const build = () => {
    for (const a of timelines()) a.cancel();
    const lane = { duration: lapMs(), iterations: Infinity, easing: 'linear' };
    lanes = strip.panes.map((li, i) => ({
      pane: li.animate(paneKeyframes(strip.units[i], strip.total), lane),
      cap: strip.caps[i].animate(capKeyframes(strip.units[i], unit, strip.total, strip.spans[i], [bandTop, bandBottom]), lane),
    }));
    const ph = rail.querySelector<HTMLElement>('.rl-play');
    head = ph ? ph.animate([{ transform: 'translate3d(0, 0%, 0)' }, { transform: 'translate3d(0, 100%, 0)' }], { duration: headMs(), iterations: Infinity, easing: 'linear' }) : null;
    for (const a of timelines()) a.pause();
    rolling = false;
    setTimes(true);
  };
  /** the clock takes the strip, from where it stands — at once, at the roll's pace */
  const roll = () => {
    if (rolling || parked || pinned || touching || document.hidden || reducedMotion() || !lanes.length) return;
    sleep();
    v = rollSpeed();
    setTimes(true);
    for (const a of timelines()) a.play();
    shown = lanes.map(() => Number.NaN); // (the clock moves them all now)
    rolling = true;
  };
  /** the strip by hand, where it stands */
  const hold = () => {
    if (!rolling) return;
    offsetNow();
    for (const a of timelines()) a.pause();
    rolling = false;
    setTimes(true); // (all on the one frame they stopped on)
  };

  /* ------------------------------------------------------------ the loops -- */

  const loops = new Map<HTMLLIElement, Loop>();
  const pin = loopsPin(location.search); // (the testers' switch: works/reel.ts)
  const allowed = pin !== 'off' && loopsAllowed((navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection);
  // A TOUCH STARTS THE REAL VIDEOS (owner, 2026-11-25, an iPhone in Low Power Mode; works/reel.ts loopKind). In a visit
  // where a play() was refused the loops stand as pictures until the first touch. Inside a touch every picture on the
  // screen steps under a video which that touch starts, and goes once the video is seen. A player a touch has started
  // is kept when its pane lets it go and carries the next film: a new player made with no touch would be refused. If a
  // started player is refused all the same, or no touch starts one, the page goes back to the pictures and stays there.
  // None of it runs where nothing was refused.
  const POOL = 6; // (the players kept: two panes on the screen, one entering, one beside it each way, one to spare)
  const GHOST_MS = 300; // (a picture stays this long under the video that takes over: the loops' fade is 0.25 s)
  const GIVE_UP_AFTER = 2; // (touches whose lift started no video, before the swap stops)
  const spare: HTMLVideoElement[] = [];
  const started = new WeakSet<HTMLVideoElement>();
  const film = new WeakMap<HTMLVideoElement, { chain: string[]; k: number; reused: boolean }>();
  const tally = { tried: {} as Record<string, number>, started: {} as Record<string, number>, reused: 0, reusedRefused: 0 };
  let touch: string | null = null; // (the event whose dispatch this is)
  let offered = new Set<HTMLVideoElement>(); // (the players already asked in this dispatch)
  let touched = false;
  let lifts = 0, lost = 0, lostAt = -1;
  let off: string | null = null;
  /** the loop's kind for a pane: works/reel.ts */
  const kind = (onScreen: boolean): LoopKind => loopKind({
    pin, pictures: loopsAsImages(), imageLoops: imageLoopsWork(), onScreen, touch: touch !== null, touched, spare: spare.length, off: off !== null,
  });
  const dropGhosts = (pane: Element | null, after = 0) => {
    const ghosts = pane ? [...pane.querySelectorAll<HTMLImageElement>('img.rl-loop.is-ghost')] : [];
    if (!ghosts.length) return;
    const go = () => { for (const g of ghosts) { g.removeAttribute('src'); g.remove(); } };
    if (after) window.setTimeout(go, after); else go();
  };
  const release = (li: HTMLLIElement) => {
    dropGhosts(li);
    const l = loops.get(li);
    if (!l) return;
    if (l instanceof HTMLVideoElement) {
      l.pause(); l.removeAttribute('src'); l.load();
      l.remove();
      if (started.has(l) && !off && spare.length < POOL) { // (a player a touch has started: kept for the next film)
        l.classList.remove('is-live');
        spare.push(l);
      }
    } else {
      l.removeAttribute('src');
      l.remove();
    }
    loops.delete(li);
  };
  let planned = '';
  let wants: PanePlay[] = []; // (what each pane was last asked to do: a touch's re-offer reads it)
  const replan = () => { planned = ''; plan(); };
  /** back to the pictures for the rest of the page: exactly what stood before a touch started anything */
  const giveUp = (why: string) => {
    if (off) return;
    off = why;
    spare.length = 0;
    if (pin === 'video' || !loopsAsImages()) return; // (no pictures to go back to: only the keeping stops)
    for (const [li, l] of [...loops]) if (l instanceof HTMLVideoElement) release(li);
    replan();
  };
  const tryPlay = (li: HTMLLIElement, vid: HTMLVideoElement) => {
    const by = touch, f = film.get(vid);
    if (by) {
      if (offered.has(vid)) return;
      offered.add(vid);
      if (autoplayRefused()) tally.tried[by] = (tally.tried[by] ?? 0) + 1;
    }
    void vid.play().then(() => {
      if (!autoplayRefused()) return; // (nothing was ever refused here: no count, no player kept)
      if (by) { touched = true; tally.started[by] = (tally.started[by] ?? 0) + 1; }
      else if (f?.reused) tally.reused += 1;
      if (f) f.reused = false;
      started.add(vid);
    }, (e) => {
      if (!isRefusal(e)) return; // (a load cut short: the poster stands, and the plan offers it again)
      noteRefusal();
      if (by) { if (by === 'touchend' && !touched && lostAt !== lifts) { lostAt = lifts; lost += 1; } return; } // (the next touch tries it)
      if (!started.has(vid)) return; // (a player no touch has started: a touch starts it)
      if (f?.reused) tally.reusedRefused += 1;
      // (a refusal from an earlier offer can arrive after a touch has started the same player: only one that still
      //  stands refused, on its own pane, ends the swap)
      if (vid.paused && loops.get(li) === vid) giveUp(f?.reused ? 'A REUSED PLAYER WAS REFUSED' : 'A STARTED PLAYER WAS REFUSED AGAIN');
    });
  };
  const newVideo = (): HTMLVideoElement => {
    const vid = el('video', 'rl-loop');
    vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = 'auto';
    vid.setAttribute('muted', ''); vid.setAttribute('playsinline', ''); vid.setAttribute('aria-hidden', 'true');
    vid.addEventListener('error', () => { // (the next name the folder may hold)
      const f = film.get(vid);
      if (!f || !vid.getAttribute('src') || ++f.k >= f.chain.length) return;
      vid.src = f.chain[f.k];
      vid.load();
      replan(); // (it plays if its pane is on the screen; a resting pane's waits, paused)
    });
    vid.addEventListener('playing', () => {
      vid.classList.add('is-live'); // (the poster until the loop has a picture)
      dropGhosts(vid.parentElement, GHOST_MS); // (the picture it takes over from, once the video is seen)
    });
    return vid;
  };
  const videoLoop = (chain: string[]): HTMLVideoElement => {
    const kept = off ? undefined : spare.pop();
    const vid = kept ?? newVideo();
    film.set(vid, { chain, k: 0, reused: !!kept });
    vid.src = chain[0];
    return vid;
  };
  // Safari plays an MP4 inside an image like a silent looping picture, outside the rules that refuse a video's play()
  const imageLoop = (li: HTMLLIElement, chain: string[]): HTMLImageElement => {
    let k = 0;
    const im = el('img', 'rl-loop');
    im.alt = '';
    im.decoding = 'async';
    im.draggable = false;
    im.setAttribute('aria-hidden', 'true');
    im.addEventListener('load', () => { noteImageLoops(true); im.classList.add('is-live'); });
    im.addEventListener('error', () => {
      if (!im.isConnected || im.classList.contains('is-ghost')) return; // (let go on purpose, or stepping aside for its video)
      if (++k < chain.length) { im.src = chain[k]; return; }
      noteImageLoops(false); // (no MP4 in an image here: back to video, which a touch starts)
      release(li);
      replan();
    });
    im.src = chain[0];
    return im;
  };
  const ensureLoop = (li: HTMLLIElement, onScreen: boolean): Loop | null => {
    if (!allowed) return null; // (Save-Data or a 2g line: the posters)
    let l = loops.get(li);
    if (l) return l;
    const chain = loopSrcChain(li.dataset.slug!);
    l = kind(onScreen) === 'image' ? imageLoop(li, chain) : videoLoop(chain);
    li.querySelector('.rl-pane')!.insertBefore(l, li.querySelector('.rl-scan'));
    loops.set(li, l);
    return l;
  };
  /** every pane's loop as the strip stands: on the screen, playing; within one unit of it, loaded and resting (the next
   *  to come in starts the moment it enters); further off, let go */
  const plan = () => {
    const at = offsetNow(), still = parked || document.hidden;
    const tops = strip.panes.map((_, i) => paneTop(strip.at[i], strip.units[i], at, unit, strip.total));
    let want: PanePlay[] = tops.map((top, i) => {
      const p = panePlay(top, strip.units[i] * unit, view, unit);
      return still && p === 'play' ? 'rest' : p;
    });
    const mids = pin === 'one' ? tops.map((top, i) => top + (strip.units[i] * unit) / 2) : [];
    if (pin === 'one') want = onePlays(want, mids, view);
    const key = want.join(',');
    if (key === planned) return;
    planned = key;
    wants = want;
    // every pane let go first, so a player handed back is at hand for the pane that asks next (where the lap wraps,
    // the first pane asks before the last one has given its player back)
    strip.panes.forEach((li, i) => { if (want[i] === 'free') release(li); });
    strip.panes.forEach((li, i) => {
      if (want[i] !== 'play') return;
      const l = ensureLoop(li, true);
      if (l instanceof HTMLVideoElement && l.paused) tryPlay(li, l);
    });
    strip.panes.forEach((li, i) => {
      if (want[i] !== 'rest') return;
      if (still && li.querySelector('img.rl-loop.is-ghost')) { release(li); return; } // (a picture under a video no touch has started cannot pause either)
      // (a video waits paused beside the screen; a picture cannot, and nothing loads under the LIST)
      const l = !still && kind(false) === 'video' ? ensureLoop(li, false) : loops.get(li);
      if (l instanceof HTMLVideoElement) l.pause();
      else if (l && still) release(li); // (a picture loop cannot pause: under the LIST, or on a hidden page, it is let go and comes back with the strip)
    });
  };
  window.setInterval(() => { if (rolling) plan(); }, 150); // (rolling, the clock moves the strip: the loops follow it)
  // a refused play(): from now on the loops stand as images (lib/autoplay.ts)
  onRefusal(() => {
    if (pin === 'video' || imageLoopsWork() === false) return;
    for (const [li, l] of [...loops]) if (l instanceof HTMLVideoElement) release(li);
    replan();
  });
  // a touch is the moment a refusing browser allows a video: the pictures on the screen step under videos made and
  // started here, inside the touch, and every paused video in view is offered again
  const kick = (e: Event) => {
    if (parked || document.hidden) return;
    touch = e.type;
    try { offer(e); } finally { touch = null; } // (whatever happens in it, nothing after the touch counts as inside it)
  };
  const offer = (e: Event) => {
    offered = new Set();
    if (e.type === 'touchend') lifts += 1;
    plan(); // (the strip as it stands now)
    if (pin !== 'image' && pin !== 'video' && loopsAsImages() && !off) {
      if (!touched && lost >= GIVE_UP_AFTER) giveUp('NO TOUCH STARTED A VIDEO');
      else {
        let any = false;
        strip.panes.forEach((li, i) => {
          const l = loops.get(li);
          if (wants[i] === 'play' && l instanceof HTMLImageElement) { l.classList.add('is-ghost'); loops.delete(li); any = true; }
        });
        if (any) replan(); // (each such pane's video is made and started now, in this touch)
      }
    }
    strip.panes.forEach((li, i) => {
      const l = loops.get(li);
      if (l instanceof HTMLVideoElement && l.paused && wants[i] === 'play') tryPlay(li, l); // (what the plan asked: the address's pin included)
    });
  };
  window.addEventListener('pointerdown', kick, { passive: true });
  window.addEventListener('touchend', kick, { passive: true });

  /* -------------------------------------------------------- by hand: the coast -- */

  // let go, the strip coasts at the finger's speed and eases straight into the roll's pace, where the clock takes it
  const frame = (now: number) => {
    raf = 0;
    if (touching || rolling) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const target = pinned ? 0 : rollSpeed();
    v = coast(v, target, dt);
    offset += v * dt;
    setTimes();
    plan();
    if (target > 0 && Math.abs(v - target) < 2) { roll(); return; }
    if (target === 0 && Math.abs(v) < 1) { v = 0; return; } // (CALM, or held: at rest)
    wake(now); // (the next step is timed from this frame's time, not from when this frame's work ended: so each step is
    // the whole time between two frames, however long the work took)
  };
  /** the coast on the screen's clock, from `since` (a frame's time); by default from the frame on the screen now: the
   *  animations' own clock, the time the frame being drawn was given. (From performance.now(), the moment this line ran,
   *  each step was short of a frame by however long the frame's work had taken, and the first after a release short
   *  by a third: the strip faltered as the finger let go, the more the busier the phone.) */
  const wake = (since?: number) => {
    if (raf || rolling || parked || document.hidden) return;
    last = since ?? (Number(document.timeline?.currentTime ?? Number.NaN) || performance.now());
    raf = requestAnimationFrame(frame);
  };
  const sleep = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  // the MOTION switch: CALM stops the roll where it stands; off again, the strip eases back into it
  new MutationObserver(() => {
    if (reducedMotion()) { hold(); v = 0; } else wake();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ------------------------------------------------------------ the finger -- */

  for (const s of strips.values()) {
    s.ol.addEventListener('pointerdown', (e) => {
      if (pointer !== null || !e.isPrimary) return;
      hold();
      sleep();
      pointer = e.pointerId;
      startY = e.clientY;
      startOffset = offset;
      moved = false;
      dragged = false;
      touching = true;
      v = 0;
      moves.length = 0;
      moves.push([e.timeStamp, e.clientY]);
    });
    s.ol.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointer) return;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) > TAP_SLOP) moved = true;
      if (moved) { offset = startOffset - dy; setTimes(); plan(); }
      moves.push([e.timeStamp, e.clientY]);
      if (moves.length > 16) moves.shift();
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      touching = false;
      dragged = moved;
      v = moved ? releaseSpeed(moves, e.timeStamp) : 0;
      wake();
    };
    s.ol.addEventListener('pointerup', up);
    s.ol.addEventListener('pointercancel', up);
  }
  // a drag never opens a film; a tap does (the link's own click, with the house wipe)
  // a film opened (a tap, not a drag): the place the strip stands on, so Back comes back to it (works/back-state.ts;
  // before the drag's own listener, which clears `dragged`)
  root.addEventListener('click', (e) => {
    if (dragged || !(e.target as Element).closest?.('.rl-link')) return;
    const [pane, part] = stripPlace(offsetNow(), unit, view, strip.units);
    o.onOpen?.({ ch: active, pane, part });
  }, true);
  root.addEventListener('click', (e) => {
    if (!dragged) return;
    dragged = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  // a keyboard's focus brings its pane to the middle of the screen and holds the strip there until it leaves
  root.addEventListener('focusin', (e) => {
    const li = (e.target as Element).closest<HTMLLIElement>('.rl-frame');
    const i = li ? strip.panes.indexOf(li) : -1;
    if (i < 0) return;
    hold();
    sleep();
    pinned = true;
    offset = offsetForPane(strip.at[i], strip.units[i], unit, view, strip.total, offset);
    v = 0;
    setTimes();
    plan();
  });
  root.addEventListener('focusout', (e) => {
    if (root.contains(e.relatedTarget as Node | null)) return;
    pinned = false;
    wake();
  });

  /* ------------------------------------------------------------- the rail -- */

  // (after measure: a film's tick stands at its middle along the lap, and a tall pane's stretch is twice as long)
  const paintRail = () => {
    rail.replaceChildren();
    const films = filmsOf(active), ticks = railTicks(strip.units.slice(0, strip.films));
    films.forEach((p, i) => {
      const t = el('i', 'rl-tick');
      t.style.top = `${ticks[i] * 100}%`;
      t.style.setProperty('--acc', p.accent);
      rail.append(t);
    });
    rail.append(el('b', 'rl-play'));
  };
  let scrubbing = false;
  const scrubTo = (clientY: number) => {
    const r = rail.getBoundingClientRect();
    offset = offsetForRail((clientY - r.top) / Math.max(1, r.height), unit, view, strip.chapter, offset);
    v = 0;
    setTimes();
    plan();
  };
  rail.addEventListener('pointerdown', (e) => {
    hold();
    sleep();
    scrubbing = true;
    touching = true;
    rail.setPointerCapture(e.pointerId);
    scrubTo(e.clientY);
  });
  rail.addEventListener('pointermove', (e) => { if (scrubbing) scrubTo(e.clientY); });
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    touching = false;
    wake();
  };
  rail.addEventListener('pointerup', endScrub);
  rail.addEventListener('pointercancel', endScrub);

  /* ------------------------------------------------------------ the rest -- */

  let returnTo: ReelPlace | null = o.start ?? null;
  const show = (key: ChannelKey) => {
    for (const a of timelines()) a.cancel();
    lanes = [];
    head = null;
    rolling = false;
    sleep();
    for (const li of [...loops.keys()]) release(li);
    active = key;
    strip = strips.get(key)!;
    for (const [k, s] of strips) s.ol.hidden = k !== key;
    paintFoot();
    measureTop();
    measure();
    paintRail();
    fit(strip);
    offset = arrivalOffset(strip.units, unit, view); // (film 1's bottom edge at the screen's bottom: upright, the chapter's last film above it)
    // a return by Back, the first show only: the place the strip was left on (works/back-state.ts)
    const back = returnTo ? reelReturn({ reel: returnTo }, key, strip.panes.length) : null;
    returnTo = null;
    if (back) offset = offsetForPlace(back[0], back[1], unit, view, strip.units);
    v = 0;
    // the panes on the screen as it arrives come up through the gate (the styles' arrival wipe): upright, the last film and film 1
    strip.panes.forEach((li, i) => li.classList.toggle('is-gate', panePlay(paneTop(strip.at[i], strip.units[i], offset, unit, strip.total), strip.units[i] * unit, view, unit) === 'play'));
    build();
    replan();
    roll(); // (from the first frame, at its pace)
  };
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      const wasRolling = rolling;
      hold();
      remeasure(); // (the same film stays in view through a turn of the phone)
      paintRail();
      fit(strip);
      build();
      replan();
      if (wasRolling) roll(); else wake();
    }, 120);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hold(); sleep(); replan(); } else { replan(); roll(); wake(); }
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) { replan(); roll(); wake(); } });
  const refit = () => { fit(strip); capFrames(); };
  void document.fonts?.ready.then(refit);
  document.fonts?.addEventListener('loadingdone', refit); // (a face that loads late, as the Vietnamese ones)

  show(active);
  if (!reducedMotion()) {
    main.classList.add('is-arriving');
    window.setTimeout(() => main.classList.remove('is-arriving'), 900);
  }
  (window as unknown as { rvlWorkReel: unknown }).rvlWorkReel = { // a debug handle for verification (rvlReel is the homepage's)
    offset: () => offsetNow(),
    speed: () => (rolling ? rollSpeed() : v),
    rolling: () => rolling,
    inView: () => strip.panes[paneInView(offsetNow(), unit, view, strip.units)]?.dataset.slug,
    sizes: () => ({ view, unit, side, units: [...strip.units] }),
    chapter: () => active,
    playing: () => [...loops].filter(([, l]) => (l instanceof HTMLVideoElement ? !l.paused : l.classList.contains('is-live'))).map(([li]) => li.dataset.slug),
    loops: () => loops.size,
    mode: () => (!allowed ? 'posters' : [...loops.values()].some((l) => l instanceof HTMLVideoElement) || kind(true) === 'video' ? 'video' : 'image'),
    /** the loops that stand as pictures now, a picture under a video not yet seen included */
    pictures: () => strip.panes.reduce((n, li) => n + li.querySelectorAll('img.rl-loop').length, 0),
    /** what the touches started since the page opened (null where no play() was refused): lib/readout.ts touchLine */
    touch: () => (autoplayRefused() ? { tried: { ...tally.tried }, started: { ...tally.started }, reused: tally.reused, reusedRefused: tally.reusedRefused, off } : null),
    pin: () => pin,
    refused: () => autoplayRefused(),
    /** hold the strip at `px` (a screenshot's still frame); null lets it roll again */
    hold: (px: number | null) => {
      if (px === null) { pinned = false; roll(); wake(); return; }
      hold();
      sleep();
      pinned = true;
      offset = px;
      v = 0;
      setTimes();
      replan();
    },
  };

  return {
    tune: (key) => show(key),
    park(p) {
      parked = p;
      if (p) { hold(); sleep(); replan(); return; }
      remeasure();
      fit(strip);
      capFrames();
      setTimes(true); // (the heights measured anew: every pane)
      replan();
      roll();
      wake();
    },
  };
}
