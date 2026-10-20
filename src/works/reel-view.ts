/** WORK ON A PHONE: THE REEL, built (works/reel.ts says what it is and holds its rules).
 *
 *  - A strip per chapter: one film to a screen, a swipe per film (the panes snap one at a time), an EOF slate at the end
 *    that tunes to the other chapter.
 *  - A pane is the whole screen (owner, 2026-10-20, with antiantiart.com on a phone): the film's poster, then its loop,
 *    covering it. A vertical film on a phone held on its side stands whole in the middle, never cropped wide. On the
 *    pane only the film's name and its roles, and the house's hardware without words: the accent tab, the viewfinder's
 *    corners in the film's accent, the scan lines, the sprockets down the left edge. The header and the foot lie over
 *    the picture.
 *  - Down the right, the scrub rail: a tick per film and a lime playhead, to tap or drag along. At the foot, the
 *    chapters and LIST.
 *  - The pane in the gate plays its loop on every tier and the next one waits warm; a pane two away gives its video
 *    back. Save-Data or a 2g line shows posters. A touch re-offers the loop (battery savers). The page (pages/works.ts)
 *    runs the channel change and the list. */
import { aspectRatio, loopSrcChain, projectAssetUrl, type Project } from '../lib/content';
import { reducedMotion } from '../lib/env';
import { softBreaks } from '../lib/escape';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { CHANNELS, type Channel, type ChannelKey, channelProjects } from './channels';
import { gateIndex, loopsAllowed, oneLineSize, railIndex, REEL_WORDS, roleLine, TITLE_MAX, TITLE_MIN, wrapStart } from './reel';

export interface Reel {
  /** show a chapter's strip from its first film */
  tune(key: ChannelKey): void;
  /** the list stands over it (true): the loop rests; false: back */
  park(parked: boolean): void;
}
export interface ReelOptions {
  active: ChannelKey;
  /** a chapter is asked for (the page runs the channel change, then calls tune) */
  onTune(key: ChannelKey): void;
  /** the list is asked for */
  onAll(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function mountReel(main: HTMLElement, projects: Project[], o: ReelOptions): Reel {
  const total = projects.length;
  const root = el('section', 'reel');
  root.setAttribute('aria-label', 'The films, one at a time');
  const rail = el('div', 'rl-rail');
  rail.setAttribute('aria-hidden', 'true');
  const foot = el('nav', 'rl-foot');
  foot.setAttribute('aria-label', 'Chapters');
  main.append(root, rail, foot);

  /* ------------------------------------------------------------ the strips -- */

  // a pane: the picture over the whole screen, and on it the film's name and its roles — nothing else (owner,
  // 2026-10-20: "only the Project name, and the Role names are enough. Do not clog this section up with texts")
  const frameOf = (p: Project, i: number): HTMLLIElement => {
    const li = el('li', 'rl-frame');
    li.dataset.slug = p.slug;
    li.style.setProperty('--acc', p.accent);
    const a = el('a', 'rl-link');
    a.href = `/project.html?p=${p.slug}`;
    a.dataset.internal = '';
    a.setAttribute('aria-label', `${p.title}. ${p.role}. Open this film.`);
    const pane = el('span', `rl-pane${aspectRatio(p.aspect) < 1 ? ' is-vertical' : ''}`);
    const img = el('img', 'rl-poster');
    img.alt = '';
    img.decoding = 'async';
    img.loading = i < 2 ? 'eager' : 'lazy';
    img.src = projectAssetUrl(p.slug, 'poster.jpg');
    pane.append(img, el('i', 'rl-scan'));
    const marks = el('i', 'rl-marks');
    const cap = el('span', 'rl-cap');
    cap.append(el('i', 'rl-bar'), el('span', 'rl-title', softBreaks(p.title)), el('span', 'rl-role micro', roleLine(p.role))); // (a long name breaks at its _)
    a.append(pane, marks, cap);
    li.append(a);
    return li;
  };

  const slateOf = (ch: Channel, n: number): HTMLLIElement => {
    const other = CHANNELS.find((c) => c.key !== ch.key)!;
    const li = el('li', 'rl-frame rl-eof');
    const edge = el('span', 'rl-edge micro', `RVL ▸ EOF ▸ ${ch.index}`);
    edge.setAttribute('aria-hidden', 'true');
    const next = el('p', 'rl-eof-next', other.name);
    next.setAttribute('aria-hidden', 'true');
    const tune = el('button', 'rl-tune micro', REEL_WORDS.tune(other.index, other.name, channelProjects(projects, other.key).length));
    tune.type = 'button';
    tune.addEventListener('click', () => o.onTune(other.key));
    const all = el('button', 'rl-all micro', REEL_WORDS.list(total));
    all.type = 'button';
    all.addEventListener('click', () => o.onAll());
    li.append(edge, el('p', 'rl-eof-line micro', REEL_WORDS.eof(ch.index, n)), next, tune, all);
    return li;
  };

  const strips = new Map<ChannelKey, HTMLOListElement>();
  for (const ch of CHANNELS) {
    const films = channelProjects(projects, ch.key);
    const ol = el('ol', 'rl-strip');
    ol.dataset.ch = ch.key;
    ol.hidden = true;
    ol.setAttribute('aria-label', `${ch.index} ${ch.name}`);
    films.forEach((p, i) => ol.append(frameOf(p, i)));
    ol.append(slateOf(ch, films.length));
    root.append(ol);
    strips.set(ch.key, ol);
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

  // the header's bottom (the menu and the switches, measured): the viewfinder, the rail and the slate start under it
  const measureTop = () => {
    let bottom = 0;
    for (const sel of ['.brand', '.nav-links', '.hud-tr']) {
      const e = document.querySelector(sel);
      if (e) bottom = Math.max(bottom, e.getBoundingClientRect().bottom);
    }
    main.style.setProperty('--reel-top', `${Math.ceil(bottom + 8)}px`);
  };
  /** a name at its size in its caption (works/reel.ts), measured in its own face with its ▸ */
  const fitTitle = (t: HTMLElement, room: number) => {
    const s = t.style;
    s.whiteSpace = 'nowrap';
    s.fontSize = `${TITLE_MAX}px`;
    const one = oneLineSize(t.scrollWidth, room);
    s.whiteSpace = '';
    if (one !== null) { s.fontSize = `${one}px`; return; }
    s.overflowWrap = 'normal'; // (whole words while it measures: a word too wide widens the name instead of breaking)
    let size = wrapStart([...(t.textContent ?? '').replace(/\u200b/g, '')].length); // (letters, not its break marks)
    s.fontSize = `${size}px`;
    while (size > TITLE_MIN && t.scrollWidth > room + 0.5) s.fontSize = `${--size}px`;
    s.overflowWrap = '';
  };
  /** each name at its size in its caption; the end slate's name as big as the column holds it */
  const fit = (strip: HTMLOListElement) => {
    const slate = strip.querySelector<HTMLElement>('.rl-eof-next');
    if (slate) slate.style.fontSize = `${Math.min(88, Math.floor((slate.parentElement!.clientWidth - 80) / (Math.max(2, (slate.textContent ?? '').length) * 0.74)))}px`;
    for (const cap of strip.querySelectorAll<HTMLElement>('.rl-cap')) fitTitle(cap.querySelector<HTMLElement>('.rl-title')!, cap.clientWidth);
  };

  /* ------------------------------------------------------------ the gate -- */

  let active: ChannelKey = o.active;
  let strip = strips.get(active)!;
  let gate = -1, parked = false, scrubbing = false, raf = 0;
  const videos = new Map<HTMLLIElement, HTMLVideoElement>();
  const loops = loopsAllowed((navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection);
  const framesOf = (s: HTMLOListElement) => [...s.querySelectorAll<HTMLLIElement>('.rl-frame')];
  const filmCount = () => channelProjects(projects, active).length;

  const ensureVideo = (li: HTMLLIElement | undefined): HTMLVideoElement | null => {
    if (!li || !loops || li.classList.contains('rl-eof')) return null; // (Save-Data or a 2g line: the posters)
    let v = videos.get(li);
    if (v) return v;
    const chain = loopSrcChain(li.dataset.slug!);
    let k = 0;
    v = el('video', 'rl-loop');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    const vid = v;
    v.addEventListener('error', () => { // (the next name the folder may hold)
      if (++k >= chain.length) return;
      vid.src = chain[k];
      vid.load();
      if (framesOf(strip)[gate] === li && !parked) void vid.play().catch(() => { /* the poster stands */ });
    });
    v.addEventListener('playing', () => vid.classList.add('is-live')); // (the poster until the loop has a picture)
    v.src = chain[0];
    li.querySelector('.rl-pane')!.insertBefore(v, li.querySelector('.rl-scan'));
    videos.set(li, v);
    return v;
  };
  const release = (li: HTMLLIElement) => {
    const v = videos.get(li);
    if (!v) return;
    v.pause();
    v.removeAttribute('src');
    v.load();
    v.remove();
    videos.delete(li);
  };
  /** the next pane's loop, warmed: played until it has a picture, then held, so a swipe lands on it rolling (a phone
   *  ignores preload: a muted play() is the one lever every engine obeys) */
  const warm = (li: HTMLLIElement | undefined) => {
    const v = ensureVideo(li);
    if (!v || v.readyState >= 2 || !v.paused) return;
    v.addEventListener('playing', () => { if (framesOf(strip)[gate] !== li) v.pause(); }, { once: true });
    void v.play().catch(() => { /* a later touch re-offers it */ });
  };
  const playGate = () => {
    const frames = framesOf(strip);
    frames.forEach((li, j) => {
      if (Math.abs(j - gate) > 1) release(li);
      else if (j !== gate) videos.get(li)?.pause();
    });
    for (const [li] of videos) if (li.closest('.rl-strip') !== strip) release(li);
    if (parked || document.hidden || gate < 0) { videos.get(frames[gate])?.pause(); return; }
    const here = frames[gate], next = frames[gate + 1];
    const v = ensureVideo(here);
    if (!v) return;
    void v.play().catch(() => { /* (a battery saver: the poster stands until a touch) */ });
    if (v.readyState >= 3) warm(next);
    else v.addEventListener('playing', () => { if (framesOf(strip)[gate] === here) warm(next); }, { once: true });
  };

  const setGate = (i: number, quiet = false) => {
    if (i === gate) return;
    gate = i;
    const frames = framesOf(strip);
    frames.forEach((li, j) => li.classList.toggle('is-gate', j === i));
    const n = filmCount();
    const play = rail.querySelector<HTMLElement>('.rl-play');
    if (play) play.style.top = `${i < n ? ((i + 0.5) / n) * 100 : 100}%`;
    playGate();
    if (quiet) return;
    sound.hover(); // (the gate's tick: the reel advances)
    const li = frames[i];
    if (!li || reducedMotion()) return;
    li.classList.remove('is-flick');
    void li.offsetWidth; // (restart the flick)
    li.classList.add('is-flick');
    const role = li.querySelector<HTMLElement>('.rl-role');
    if (role) void scrambleEl(role, role.textContent ?? '', 320);
  };
  const step = () => framesOf(strip)[0]?.offsetHeight || 1;
  const onScroll = () => {
    raf = 0;
    setGate(gateIndex(strip.scrollTop, step(), framesOf(strip).length));
  };
  for (const s of strips.values()) s.addEventListener('scroll', () => { if (s === strip && !raf) raf = requestAnimationFrame(onScroll); }, { passive: true });

  /* ------------------------------------------------------------- the rail -- */

  const paintRail = () => {
    rail.replaceChildren();
    const films = channelProjects(projects, active);
    films.forEach((p, i) => {
      const t = el('i', 'rl-tick');
      t.style.top = `${((i + 0.5) / films.length) * 100}%`;
      t.style.setProperty('--acc', p.accent);
      rail.append(t);
    });
    rail.append(el('b', 'rl-play'));
  };
  const scrubTo = (clientY: number) => {
    const r = rail.getBoundingClientRect();
    const i = railIndex(clientY - r.top, r.height, filmCount());
    if (i !== gate) strip.scrollTo({ top: i * step(), behavior: 'instant' as ScrollBehavior });
  };
  rail.addEventListener('pointerdown', (e) => { scrubbing = true; rail.setPointerCapture(e.pointerId); scrubTo(e.clientY); });
  rail.addEventListener('pointermove', (e) => { if (scrubbing) scrubTo(e.clientY); });
  const endScrub = () => { scrubbing = false; };
  rail.addEventListener('pointerup', endScrub);
  rail.addEventListener('pointercancel', endScrub);

  /* ------------------------------------------------------------ the rest -- */

  const show = (key: ChannelKey) => {
    active = key;
    for (const [k, s] of strips) s.hidden = k !== key;
    strip = strips.get(key)!;
    paintFoot();
    paintRail();
    measureTop();
    fit(strip);
    strip.scrollTop = 0;
    gate = -1;
    setGate(0, true);
  };
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      measureTop();
      fit(strip);
      strip.scrollTop = Math.max(0, gate) * step();
    }, 120);
  });
  document.addEventListener('visibilitychange', () => playGate());
  window.addEventListener('pageshow', (e) => { if (e.persisted) playGate(); });
  // battery savers (iOS Low Power Mode and kin) refuse a play() no touch asked for: every touch re-offers the loop in
  // the gate, as on the homepage — a no-op while it rolls, the heal when it does not
  const kick = () => { if (!parked && !document.hidden) playGate(); };
  window.addEventListener('pointerdown', kick, { passive: true });
  window.addEventListener('touchend', kick, { passive: true });
  void document.fonts?.ready.then(() => fit(strip));
  document.fonts?.addEventListener('loadingdone', () => fit(strip)); // (a face that loads late, as the Vietnamese ones)

  show(active);
  if (!reducedMotion()) {
    main.classList.add('is-arriving');
    window.setTimeout(() => main.classList.remove('is-arriving'), 900);
  }
  (window as unknown as { rvlWorkReel: unknown }).rvlWorkReel = { // a debug handle for verification (rvlReel is the homepage's)
    gate: () => gate,
    chapter: () => active,
    playing: () => [...videos].filter(([, v]) => !v.paused).map(([li]) => li.dataset.slug),
    videos: () => videos.size,
  };

  return {
    tune: (key) => show(key),
    park(p) {
      parked = p;
      if (!p) { measureTop(); fit(strip); strip.scrollTop = Math.max(0, gate) * step(); }
      playGate();
    },
  };
}
