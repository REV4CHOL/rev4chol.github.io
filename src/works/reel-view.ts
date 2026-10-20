/** WORK ON A PHONE: THE REEL, built (works/reel.ts says what it is and holds its rules).
 *
 *  - A strip per chapter: one film to a frame, a swipe per film (the frames snap one at a time), an EOF slate at the end
 *    that tunes to the other chapter.
 *  - A frame wears the floor's pane in HTML: the accent frame and crop marks, the bar, the code, FEATURED, the strip
 *    (a spine on a vertical film), in the film's own shape; its loop plays while it stands in the gate.
 *  - Down the left, the film's edge: sprockets and an edge code. Down the right, the scrub rail: a tick per film and a
 *    lime playhead, to tap or drag along. At the foot, the chapters and ALL FILMS.
 *  - Only the frame in the gate plays; a frame two away gives its video back; LITE shows posters only. The page (pages/
 *    works.ts) runs the channel change and the list. */
import { aspectRatio, loopSrcChain, manifestStills, projectAssetUrl, type Project } from '../lib/content';
import { reducedMotion } from '../lib/env';
import { softBreaks } from '../lib/escape';
import { quality } from '../lib/quality';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { CHANNELS, type Channel, type ChannelKey, channelProjects } from './channels';
import { rowMeta } from './index-list';
import { stripName } from './legend';
import { contactCount, edgeCode, frameCode, frameNumber, gateIndex, paneShare, paneSize, railIndex, REEL_WORDS, teaser, titleSize } from './reel';

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

/** What gives way on a short screen, in turn (components.css): the contact strip, the synopsis to two lines, the
 *  synopsis, the tags. The title, the meta and the door always stand. */
const GIVE_WAY = ['is-tight', 'is-tighter', 'is-tightest', 'is-bare'];

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

  const frameOf = (p: Project, i: number, n: number, ch: Channel): HTMLLIElement => {
    const ratio = aspectRatio(p.aspect);
    const li = el('li', 'rl-frame');
    li.dataset.slug = p.slug;
    li.style.setProperty('--acc', p.accent);
    const edge = el('span', 'rl-edge micro', edgeCode(i, ch.index));
    edge.setAttribute('aria-hidden', 'true');
    const head = el('p', 'rl-head');
    head.setAttribute('aria-hidden', 'true');
    head.append(el('span', 'rl-num', frameNumber(i)), el('span', 'rl-of micro', `/ ${String(n).padStart(2, '0')}`), el('span', 'rl-ch micro', REEL_WORDS.chapter(ch.index, ch.name)));
    const a = el('a', 'rl-link');
    a.href = `/project.html?p=${p.slug}`;
    a.dataset.internal = '';
    a.setAttribute('aria-label', `${p.title}. ${rowMeta(p)}. Open this film.`);
    const pane = el('span', `rl-pane${p.tileSize === 'large' ? ' is-featured' : ''}${ratio < 1 ? ' is-vertical' : ''}`);
    pane.dataset.ratio = String(ratio);
    const img = el('img', 'rl-poster');
    img.alt = '';
    img.decoding = 'async';
    img.loading = i < 2 ? 'eager' : 'lazy';
    img.src = projectAssetUrl(p.slug, 'poster.jpg');
    pane.append(img, el('i', 'rl-scan'), el('i', 'rl-bar'), el('span', 'rl-code micro', frameCode(p.slug)));
    if (p.tileSize === 'large') pane.append(el('span', 'rl-tag micro', 'FEATURED'));
    pane.append(el('span', 'rl-id micro', stripName(p)));
    // the contact strip: a few of the film's stills under its pane, in its own shape (STL·NN, as on its page)
    const stills = manifestStills(p.slug) ?? [];
    const strip = el('span', 'rl-stills');
    strip.style.setProperty('--ar', String(ratio));
    for (const src of stills.slice(0, contactCount(ratio, stills.length))) {
      const im = el('img', '');
      im.alt = '';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.src = src;
      strip.append(im);
    }
    const words = el('span', 'rl-words');
    words.append(el('span', 'rl-title', softBreaks(p.title)), el('span', 'rl-meta micro', rowMeta(p))); // (a long name breaks at its _)
    if (p.tags.length) {
      const tags = el('span', 'rl-tags');
      for (const t of p.tags.slice(0, 3)) tags.append(el('i', 'micro', t.toUpperCase()));
      words.append(tags);
    }
    const syn = teaser(p.synopsis);
    if (syn) words.append(el('span', 'rl-syn', syn));
    words.append(el('span', 'rl-door micro', REEL_WORDS.open));
    a.append(pane);
    if (strip.childElementCount) a.append(strip);
    a.append(words);
    li.append(edge, head, a);
    if (i === 0 && n > 1) { li.classList.add('has-cue'); li.append(el('p', 'rl-cue micro', REEL_WORDS.cue(n - 1))); }
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
    films.forEach((p, i) => ol.append(frameOf(p, i, films.length, ch)));
    ol.append(slateOf(ch, films.length));
    const end = el('li', 'rl-end');
    end.setAttribute('aria-hidden', 'true');
    ol.append(end);
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

  // the reel stands between the header (the menu and the switches, measured) and the foot
  const measureTop = () => {
    let bottom = 0;
    for (const sel of ['.brand', '.nav-links', '.hud-tr']) {
      const e = document.querySelector(sel);
      if (e) bottom = Math.max(bottom, e.getBoundingClientRect().bottom);
    }
    main.style.setProperty('--reel-top', `${Math.ceil(bottom + 8)}px`);
  };
  const landscape = () => window.innerWidth > window.innerHeight;
  /** each frame's pane in its own shape, the title at its size, and what gives way on a short screen */
  const fit = (strip: HTMLOListElement) => {
    const land = landscape();
    // the end slate: the other chapter's name as big as the column holds it
    const slate = strip.querySelector<HTMLElement>('.rl-eof-next');
    if (slate) slate.style.fontSize = `${Math.min(88, Math.floor((slate.parentElement!.clientWidth - 80) / (Math.max(2, (slate.textContent ?? '').length) * 0.74)))}px`;
    for (const li of strip.querySelectorAll<HTMLLIElement>('.rl-frame:not(.rl-eof)')) {
      const pane = li.querySelector<HTMLElement>('.rl-pane')!, link = li.querySelector<HTMLElement>('.rl-link')!;
      const title = li.querySelector<HTMLElement>('.rl-title')!;
      const parts = li.querySelectorAll<HTMLElement>('.rl-pane, .rl-stills, .rl-door');
      const cs = getComputedStyle(li);
      const colW = li.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      // nothing crosses the frame's floor: its bottom padding stays clear above the frame line (a frame's own scroll
      // height misses words that spill into that padding)
      const over = () => {
        const floor = li.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) + 0.5;
        for (const e of parts) if (e.getBoundingClientRect().bottom > floor) return true;
        return false;
      };
      const linkH = link.clientHeight; // (the room under the head, whatever the link holds)
      const ratio = Number(pane.dataset.ratio) || 16 / 9;
      let share = land ? 1 : paneShare(ratio);
      for (let pass = 0; pass < 4; pass++) {
        li.classList.remove(...GIVE_WAY); // (a smaller picture may give the words their room back)
        const box = paneSize(ratio, land ? colW * 0.5 : colW, Math.max(60, linkH * share));
        pane.style.width = `${box.w}px`;
        pane.style.height = `${box.h}px`;
        title.style.fontSize = `${titleSize(title.textContent ?? '', land ? colW - box.w - 18 : colW)}px`;
        // what gives way on a short screen, in turn: the contact strip, half the synopsis, the synopsis, the tags
        for (const cls of GIVE_WAY) if (over()) li.classList.add(cls);
        if (!over()) break;
        share *= 0.82; // (still over: the picture gives a little too)
      }
    }
  };

  /* ------------------------------------------------------------ the gate -- */

  let active: ChannelKey = o.active;
  let strip = strips.get(active)!;
  let gate = -1, parked = false, scrubbing = false, raf = 0;
  const videos = new Map<HTMLLIElement, HTMLVideoElement>();
  const framesOf = (s: HTMLOListElement) => [...s.querySelectorAll<HTMLLIElement>('.rl-frame')];
  const filmCount = () => channelProjects(projects, active).length;

  const ensureVideo = (li: HTMLLIElement): HTMLVideoElement | null => {
    if (quality.tier() === 0 || li.classList.contains('rl-eof')) return null; // (LITE: the posters)
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
      if (videos.get(li) === vid && !parked) void vid.play().catch(() => { /* the poster stands */ });
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
  const playGate = () => {
    const frames = framesOf(strip);
    frames.forEach((li, j) => {
      if (Math.abs(j - gate) > 1 || li.closest('.rl-strip') !== strip) release(li);
      else if (j !== gate) videos.get(li)?.pause();
    });
    for (const [li] of videos) if (li.closest('.rl-strip') !== strip) release(li);
    if (parked || document.hidden || gate < 0) { videos.get(frames[gate])?.pause(); return; }
    const v = ensureVideo(frames[gate]);
    if (v) void v.play().catch(() => { /* (a phone in low power: the poster stands) */ });
  };

  const setGate = (i: number, quiet = false) => {
    if (i === gate) return;
    gate = i;
    const frames = framesOf(strip);
    frames.forEach((li, j) => li.classList.toggle('is-gate', j === i));
    const n = filmCount();
    const play = rail.querySelector<HTMLElement>('.rl-play');
    if (play) play.style.top = `${i < n ? ((i + 0.5) / n) * 100 : 100}%`;
    if (i > 0) strip.classList.add('is-moved');
    playGate();
    if (quiet) return;
    sound.hover(); // (the gate's tick: the frame advances)
    const li = frames[i];
    if (!li || reducedMotion()) return;
    li.classList.remove('is-flick');
    void li.offsetWidth; // (restart the flick)
    li.classList.add('is-flick');
    const meta = li.querySelector<HTMLElement>('.rl-meta');
    if (meta) void scrambleEl(meta, meta.textContent ?? '', 320);
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
    strip.classList.remove('is-moved');
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
    refit: () => { const t = performance.now(); fit(strip); return performance.now() - t; }, // (ms)
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
