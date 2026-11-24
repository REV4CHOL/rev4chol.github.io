import { aspectRatio, FilmRef, getSlugFromSearch, isPlaceholder, loadLoopManifest, loadProjects, loopSrcChain, manifestStills, Project, projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { embedSrc } from '../lib/embeds';
import { mulberry32 } from '../lib/rng';
import { crossedHtml } from '../lib/cross';
import { escapeHtml, softBreaks } from '../lib/escape';
import { reducedMotion } from '../lib/env';
import { armPosterLock, posterZoom } from '../lib/poster-lock';
import { scrambleEl } from '../lib/scramble';
import { baselineOf, fillTitle, heroLockupSize, lockupHtml, runningTitle, settleLockup, splitTitle, zoomOf } from '../lib/title';
import { music } from '../lib/music';
import { sound } from '../lib/sound';
import { hashSlug, stillSlotUrls, wallRows } from '../project/dossier';
import { fullscreenApi, plainReason } from '../project/frame-size';
import { linkParts, startedByFocus } from '../project/parts';
import { armBar, BigFilm, mountBig } from '../project/player-bar';
import { playerRecords, recordPlayer } from '../lib/player-record';
import { stillParts } from '../project/pillars';
import { meets, playerRatio, watchKind } from '../project/watch';
import { armStamps } from '../lib/stamps';
import { startPage } from '../shell/page';
import '../styles/project.css';

startPage(
  'project',
  // no count in the HUD here — the dossier's own P·NN/NN stamp carries it,
  // and two counters in the same corner read as clutter
  async () => {
    // the dossier is a fixed 1440px plate like the rest of the site — zoom
    // and window width scale it as one document, they never reflow it
    armPosterLock();
    const projects = await loadProjects();
    await loadLoopManifest(); // the hero walks the manifest-led chain
    const slug = getSlugFromSearch(location.search);
    const idx = projects.findIndex((p) => p.slug === slug);
    if (idx < 0) {
      renderNotFound();
      return;
    }
    render(projects[idx], projects, idx);
  },
  [{ label: 'LOAD PROJECT INDEX', run: () => loadProjects() }],
);

const pad2 = (n: number) => String(n).padStart(2, '0');

function renderNotFound(): void {
  document.title = 'SIGNAL LOST — REVACHOL';
  document.getElementById('app')!.innerHTML = `
    <div class="p-notfound">
      <h1 class="statement">SIGNAL LOST</h1>
      <p class="micro">SPECIMEN NOT IN THE INDEX</p>
      <p><a class="btn" href="/works.html" data-internal>BACK TO ALL FILMS ▸</a></p>
    </div>`;
}

function render(p: Project, all: Project[], idx: number): void {
  document.title = `${runningTitle(p.title).toUpperCase()} — REVACHOL`; // (a two-language name with its dot: lib/title.ts)
  if (p.aspect !== '16:9') {
    // the whole dossier presents in the film's own ratio: the hero fits the
    // picture as a centered band/column, the stills wall matches. --pratio
    // is the one number everything derives from.
    const ratio = aspectRatio(p.aspect);
    const heroSec = document.getElementById('p-hero')!;
    heroSec.classList.add('p-hero--fit');
    heroSec.style.setProperty('--pratio', String(ratio));
    // side rack panels + ring; a 3:2 picture is pillarboxed too, only narrower (owner 2026-11-24: "Keep 3:2, add that
    // pane"), so its ring is the right panel's instrument the same way rather than the 16:9 hero's, across the picture
    if (p.aspect === '4:3' || p.aspect === '3:2') heroSec.classList.add('p-hero--43');
    (document.querySelector('.project-main') as HTMLElement).style.setProperty('--pratio', String(ratio));
  }
  // The page chrome commits to the fixed acid quartet (--signal/--alert/
  // --field/--flourish). The project's own accent survives as a recorded
  // property of the specimen: the dither veils.
  const stamp = `P·${pad2(idx + 1)}/${pad2(all.length)}`;

  mountHero(p, stamp);
  mountSpec(p);
  mountSynopsis(p);
  mountTicker(p, stamp);
  void mountWall(p);
  mountEndNav(all, idx);

  document.getElementById('p-eof')!.innerHTML =
    `<span>EOF ▪ ${stamp} ▪ REVACHOL — ${p.year}</span>`;

  armStamps();
}

/* ---------------------------------------------------------------- hero -- */

function mountHero(p: Project, stamp: string): void {
  const hero = document.getElementById('p-hero-video') as HTMLVideoElement;
  const veil = document.getElementById('p-hero-veil') as HTMLCanvasElement;

  if (p.aspect !== '16:9') {
    // no dead space around an odd-ratio picture: the side fields are rack
    // panels (gate hairline, inner-edge rail, vertical format stamp, hazard
    // strip) and the letterbox strips are film-gate bands (sprockets, an
    // outlined ratio stamp, a timecode ruler). Whichever leftover exists at
    // the current viewport gets dressed; the other collapses to zero.
    const heroSec = document.getElementById('p-hero')!;
    for (const [side, label] of [
      ['l', `FMT :: ${p.aspect} ▪ ${p.slug.toUpperCase()}`],
      ['r', `MONITOR ▸ ${stamp} ▪ REVACHOL`],
    ] as const) {
      const d = document.createElement('div');
      d.className = `p-pillar p-pillar-${side}`;
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = `<span class="p-pillar-tag micro">${escapeHtml(label)}</span>`;
      heroSec.append(d);
    }
    for (const side of ['t', 'b'] as const) {
      const b = document.createElement('div');
      b.className = `p-band p-band-${side}`;
      b.dataset.ratio = p.aspect;
      b.setAttribute('aria-hidden', 'true');
      heroSec.append(b);
    }
  }

  // The dither veil only lifts once BOTH the poster has loaded (with its
  // 350ms minimum dwell) AND the hero video can actually play. If the hero
  // video errors out, the veil must never lift — the dithered poster is the
  // correct degraded hero, not a blank element underneath a hidden canvas.
  let posterReady = false;
  let videoReady = false;
  let heroDead = false;
  const maybeReveal = () => {
    if (heroDead || !posterReady || !videoReady) return;
    veil.style.transition = 'opacity 1.1s';
    veil.style.opacity = '0';
  };

  // the hero walks the same accepted loop names as the floor pane, so one
  // clip drives both — swap the file in the project folder, refresh, done
  const chain = loopSrcChain(p.slug);
  let chainIdx = 0;
  hero.src = chain[0];
  // the early play() below can fire before data exists and its rejection is
  // swallowed — canplay is the moment playback is actually possible, so nudge
  // again here or the hero can sit frozen on its first frame
  hero.addEventListener('canplay', () => {
    videoReady = true;
    void hero.play().catch(() => {});
    maybeReveal();
  }, { once: true });
  hero.addEventListener('error', () => {
    chainIdx += 1;
    if (chainIdx < chain.length) {
      hero.src = chain[chainIdx];
      void hero.play().catch(() => {});
      return;
    }
    heroDead = true;
    console.warn(`[revachol] missing media: ${chain[0]} (or an accepted loop name) — hero stays on the dithered poster`);
    hero.remove();
  });
  void hero.play().catch(() => {});

  const posterImg = new Image();
  posterImg.onload = () => {
    const d = ditherImageToCanvas(posterImg, posterImg.naturalWidth, posterImg.naturalHeight, 320, '#060606', p.accent);
    veil.width = d.width;
    veil.height = d.height;
    veil.getContext('2d')?.drawImage(d, 0, 0);
    setTimeout(() => {
      posterReady = true;
      maybeReveal();
    }, 350);
  };
  posterImg.onerror = () => veil.remove();
  posterImg.src = projectAssetUrl(p.slug, 'poster.jpg');

  // a stand-in's dossier says so from its first line (owner's testers, 2026-09-27)
  void scrambleEl(document.getElementById('p-status-line')!, `PROCEDURE :: ${p.slug.toUpperCase()} // ${isPlaceholder(p) ? 'PLACEHOLDER' : 'ONLINE'}`, 900);

  document.getElementById('p-index')!.innerHTML = `<span>${stamp}</span>`;

  const rows: [string, string][] = [
    ['ROLE', p.role],
    ['YR', String(p.year)],
  ]; // (no running time: owner, 2026-11-24, "Remove runtime from all sections on the website")
  document.getElementById('p-callouts')!.innerHTML = rows
    .filter(([, v]) => v)
    .map(
      ([k, v], i) =>
        `<div class="p-callout" style="--d:${i * 90}ms"><span class="pc-line"></span><span>${k} :: ${crossedHtml(v.toUpperCase())}</span></div>`, // (a list's slashes stand as the red cross: lib/cross.ts)
    )
    .join('');

  const title = p.title.toUpperCase();
  const stack = document.querySelector<HTMLElement>('.p-title-stack')!;
  const ghost = document.getElementById('p-title-ghost')!;
  const titleEl = document.getElementById('p-title')!;
  const shout = (s: string) => s.toUpperCase();
  fillTitle(ghost, p.title, shout);
  const two = splitTitle(p.title).alt !== null;
  // the title never breaks: measure the name (via the ghost — it carries the
  // full text at once, the visible copy is still scrambling in) and scale the
  // shared font-size so any length holds exactly one line at any viewport
  const fitTitle = () => {
    stack.style.removeProperty('--tfs');
    const w = stack.clientWidth;
    const sw = ghost.scrollWidth;
    if (sw > w && w > 0) {
      const base = parseFloat(getComputedStyle(ghost).fontSize);
      stack.style.setProperty('--tfs', `${Math.max(12, Math.floor(base * (w / sw) * 98) / 100)}px`);
    }
  };
  // A TWO-LANGUAGE TITLE (lib/title.ts) stands as two lines, one column: fitted on each line's width (the English sets
  // it), and on a share of the hero's height. The viewfinder is an overlay and yields: its bottom edge rises to stand
  // FRAME_GAP clear of line 1's ink, never lower than its own (a one-part page never sets it)
  const heroSec = document.getElementById('p-hero')!;
  const FRAME_GAP = 18;
  const fitLockup = () => {
    stack.style.removeProperty('--tfs');
    heroSec.style.removeProperty('--p-frame-b');
    const a = ghost.querySelector<HTMLElement>('.tt-main')!, b = ghost.querySelector<HTMLElement>('.tt-alt')!;
    const z = zoomOf(heroSec); // (screen px to the hero's own: the poster lock zooms the page)
    const width = (e: HTMLElement) => { e.style.display = 'inline-block'; const r = e.getBoundingClientRect().width / z; e.style.display = ''; return r; };
    const base = parseFloat(getComputedStyle(ghost).fontSize);
    const c = document.createElement('canvas').getContext('2d');
    let cap = 0.67;
    if (c) { c.font = `700 1000px ${getComputedStyle(ghost).fontFamily}`; cap = c.measureText('H').actualBoundingBoxAscent / 1000 || cap; }
    stack.style.setProperty('--tfs', `${heroLockupSize(base, stack.clientWidth, width(a), width(b), heroSec.clientHeight, cap)}px`);
    for (const e of [ghost, titleEl]) settleLockup(e);
    const frame = heroSec.querySelector<HTMLElement>('.p-scanframe');
    if (!frame) return;
    const own = (heroSec.getBoundingClientRect().bottom - frame.getBoundingClientRect().bottom) / z;
    const main = titleEl.querySelector<HTMLElement>('.tt-main')!;
    const capTop = baselineOf(main) / z - cap * parseFloat(getComputedStyle(main).fontSize); // (line 1's cap top: its ink)
    const need = heroSec.getBoundingClientRect().bottom / z - capTop + FRAME_GAP;
    if (need > own) heroSec.style.setProperty('--p-frame-b', `${Math.ceil(need)}px`);
  };
  const fit = two ? fitLockup : fitTitle;
  if (two) stack.style.setProperty('--tt-acc', p.accent);
  if (two) fillTitle(titleEl, p.title, shout); // (its words in place for the measure; the scramble then runs over them)
  fit();
  // a fallback-font measurement lies — refit once the display face is in
  void document.fonts?.ready?.then(fit);
  window.addEventListener('resize', fit);
  if (!two) { void scrambleEl(titleEl, title, 650); return; }
  void scrambleEl(titleEl.querySelector<HTMLElement>('.tt-main')!, shout(splitTitle(p.title).main), 650);
  void scrambleEl(titleEl.querySelector<HTMLElement>('.tt-alt')!, shout(splitTitle(p.title).alt!), 650);
}

/* ---------------------------------------------------------- spec sheet -- */

// The rows stand in the owner's order (2026-11-24: "the order shouldve been ARTIST - DIRECTOR - PRODUCTION HOUSE - GENRE -
// ROLE", then "Website-wide: YEAR go under ROLE, Genre go above ROLE"), each only when its film carries it; CLIENT, which
// they did not name, keeps the top. No running time stands here, nor anywhere on the site ("Remove runtime from all
// sections on the website").
function mountSpec(p: Project): void {
  const rows: [string, string][] = [];
  if (p.client) rows.push(['CLIENT', `<span>${crossedHtml(p.client.toUpperCase())}</span>`]);
  if (p.artist) rows.push(['ARTIST', `<span>${crossedHtml(p.artist.toUpperCase())}</span>`]);
  if (p.director) rows.push(['DIRECTOR', `<span>${crossedHtml(p.director.toUpperCase())}</span>`]);
  if (p.productionHouse) rows.push(['PRODUCTION HOUSE', `<span>${crossedHtml(p.productionHouse.toUpperCase())}</span>`]);
  if (p.tags.length)
    rows.push(['GENRE', p.tags.map((t) => `<span class="p-pill">${escapeHtml(t.toUpperCase())}</span>`).join('')]);
  if (p.role) rows.push(['ROLE', `<span>${crossedHtml(p.role.toUpperCase())}</span>`]);
  rows.push(['YEAR', `<span>${p.year}</span>`]);

  document.getElementById('p-spec')!.innerHTML = rows
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join('');
}

/* ------------------------------------------------------------ synopsis -- */

function mountSynopsis(p: Project): void {
  document.getElementById('p-synopsis')!.textContent = p.synopsis;

  // two plus-glyphs seeded off the slug — same film, same constellation
  const rand = mulberry32(hashSlug(p.slug) ^ 0x9e3779b9);
  const body = document.querySelector('.p-syn-sec .p-sec-body')!;
  for (const tone of ['sig', 'alr'] as const) {
    const s = document.createElement('span');
    s.className = `p-plus p-plus-${tone}`;
    s.textContent = '✚';
    s.setAttribute('aria-hidden', 'true');
    s.style.left = `${52 + Math.floor(rand() * 40)}%`;
    s.style.top = `${8 + Math.floor(rand() * 70)}%`;
    body.append(s);
  }

  const player = document.getElementById('p-player') as HTMLDivElement;
  const kind = watchKind(p);
  if (kind !== 'watch') {
    const note = document.createElement('p');
    if (kind === 'private') {
      // PRIVATE (owner 2026-09-28, MIEN VIEN: the link "will never arrive"): no player, and where it would stand, what
      // a visitor can and cannot do in one line, in the placeholder line's quiet style (the reason stays off the site)
      note.className = 'p-private micro';
      note.textContent = 'PRIVATE FILM ▪ NOT AVAILABLE TO WATCH ONLINE';
    } else if (kind === 'pending') {
      // the film exists but isn't linkable yet: one quiet line where the player will stand (it was a greyed WATCH
      // button until the owner abolished the button, 2026-11-24)
      note.className = 'p-pending micro';
      note.textContent = 'FILM LINK COMING SOON';
    } else {
      // PLACEHOLDER (owner's testers, 2026-09-27: a full dossier for a film that does not exist read as a broken
      // site): where the player would stand, the truth in one line
      note.className = 'p-placeholder micro';
      note.textContent = 'PLACEHOLDER ▪ NO FILM HERE YET';
    }
    player.after(note);
    return;
  }
  // THE FILM STANDS READY (owner 2026-11-24: "I want to abolish the WATCH button. Instead, I want the video to be
  // already there ready to play, with its thumbnail displaying"): the real player stands under the synopsis from the
  // start, not started, showing the platform's own thumbnail and play control, so ONE press plays it everywhere (a
  // frame made by a press cannot start with sound on an iPhone or an iPad: a second tap). It is as wide as the page
  // allows, in its own shape (vertical footage stands vertical: the review's walkthroughs, 2026-09-30, had it open
  // 245 x 138 px), its place kept from the first paint by that shape; the frame itself loads lazily, after the hero.
  player.style.setProperty('--player-ratio', String(playerRatio(aspectRatio(p.aspect))));
  player.hidden = false;
  const multi = p.films.length > 1;
  const { frames, talking, videos, bigs } = multi ? mountParts(p, player) : mountFilm(p, player);
  armEffectHole('player', multi ? player.querySelector<HTMLElement>('.p-parts') ?? player : player);

  // THE MUSIC GIVES WAY when the film starts, and stays stopped until the next section or page, as WATCH had it. The
  // press lands inside the frame, where the page hears nothing: the player says when it plays (YouTube's messages), a
  // file says so itself, and a frame that never talks is known pressed when the window hands it the focus.
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    music.hold();
  };
  const programme = linkParts(talking, { onPlay: start });
  for (const b of bigs) armBar(b, programme); // (the site's own bar speaks to its player over the programme's link)
  // which player stands and why, for a check (the readout's PLAYER line reads the same records: `?stats=1`)
  (window as unknown as { rvlPlayer: unknown }).rvlPlayer = { state: () => playerRecords().map((r) => ({ ...r })) };
  // THE HERO FIRST: the frames' place stands from the start, but a platform's player (a megabyte of its own script) is
  // sent for only once the hero's loop shows its first frame (or fails), the player nears the screen, the hero is
  // pressed, or four seconds have passed. Measured: with the browser's own lazy loading alone, the frames were asked
  // for 150-250 ms BEFORE the hero's first frame on every screen (the row stands within the browser's lazy distance).
  const wake = () => wakeFrames(frames);
  const heroVideo = document.getElementById('p-hero-video') as HTMLVideoElement | null;
  if (!heroVideo || heroVideo.readyState >= 3) wake();
  else for (const ev of ['playing', 'error']) heroVideo.addEventListener(ev, wake, { once: true });
  setTimeout(wake, 4000);
  if (typeof IntersectionObserver !== 'undefined') {
    const near = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { wake(); near.disconnect(); } }, { rootMargin: '25% 0px' });
    near.observe(player);
  }
  for (const v of videos) v.addEventListener('play', start);
  window.addEventListener('blur', () => {
    setTimeout(() => {
      if (startedByFocus(document.activeElement as HTMLIFrameElement | null, frames, programme.talks)) start();
    }, 0);
  });

  // THE PICTURE PLAYS THE FILM: a framed moving picture with a ruler under it reads as a player, and both walkthroughs
  // pressed it first and got nothing. A click or a tap on it brings the player into view and asks it to play (its links
  // keep their own jobs; never a button over the picture: owner, 2026-09-30, "remove the WATCH on this"). Where the
  // platform refuses a start the page asks for, the visitor's press on the player itself plays it.
  const open = () => {
    sound.zap();
    for (const f of frames) f.loading = 'eager'; // (a lazy frame not yet near the screen starts loading now)
    wake();
    player.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    if (videos[0]) void videos[0].play().catch(() => {});
    else programme.play();
  };
  const hero = document.getElementById('p-hero')!;
  hero.classList.add('p-hero--plays');
  hero.dataset.cursor = 'PLAY ▸';
  hero.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('a, button')) open();
  });
}

/** What a film's player is made of: every frame, the frames whose player talks (YouTube), the owner's own files, and the
 *  YouTube films in the big frame with the site's own bar (project/player-bar.ts). */
interface Mounted {
  frames: HTMLIFrameElement[];
  talking: HTMLIFrameElement[];
  videos: HTMLVideoElement[];
  bigs: BigFilm[];
}

/** THE BIG FRAME (owner, 2026-11-24: "force all video players on the website to start at 2160p when watch"; of the
 *  ways shown, "2160p + site's own controls"): a YouTube film, on a screen that can take an element fullscreen (an
 *  iPhone keeps YouTube's own player and its own fullscreen), not Android (its player stayed at 480p whatever the
 *  frame's size). Nothing else decides it: not the site's quality tier, not the box's size (frame-size.ts,
 *  plainReason). Returns why a film keeps its platform's own player, with what the browser said of fullscreen; null
 *  when it gets the site's. */
function plainWhy(film: FilmRef): string | null {
  const d = document as Document & { webkitFullscreenEnabled?: boolean };
  const why = plainReason({
    youtube: film.type === 'youtube',
    fullscreen: fullscreenApi(d),
    userAgent: navigator.userAgent,
  });
  return why === 'NO ELEMENT FULLSCREEN HERE'
    ? `${why} (FULLSCREEN ${String(d.fullscreenEnabled).toUpperCase()}, WEBKIT ${String(d.webkitFullscreenEnabled).toUpperCase()})`
    : why;
}

/** A YouTube film's player in `host`: the big frame with the site's bar, or, where the gates say so, the plain frame
 *  with YouTube's own controls. Either way it leaves its record (`name`: FILM, PART 1 …; lib/player-record.ts). */
function youTubeIn(host: HTMLElement, film: FilmRef, title: string, p: Project, out: Mounted, name: string): HTMLIFrameElement {
  const plainSrc = embedSrc(film, { autoplay: false, origin: location.origin })!;
  const why = plainWhy(film);
  if (why === null) {
    const record = recordPlayer(name, 'site', 'WAITING FOR ITS FRAME');
    const big = mountBig(host, frameFor(embedSrc(film, { autoplay: false, origin: location.origin, controls: false })!, title), { plainSrc, accent: p.accent, ratio: aspectRatio(p.aspect), record });
    out.bigs.push(big);
    return big.frame;
  }
  recordPlayer(name, 'platform', why);
  const f = frameFor(plainSrc, title);
  host.append(f);
  return f;
}

/** A platform's player, not started: its place in the row at once, its address held until wakeFrames. */
function frameFor(src: string, title: string): HTMLIFrameElement {
  const f = document.createElement('iframe');
  f.title = title;
  f.allow = 'autoplay; fullscreen; picture-in-picture';
  f.allowFullscreen = true;
  f.dataset.src = src;
  return f;
}

/** The frames are sent for, lazily: `loading` goes before `src` (a frame given its src first starts loading at once),
 *  so one still far below the screen waits for it. */
function wakeFrames(frames: HTMLIFrameElement[]): void {
  for (const f of frames) {
    const src = f.dataset.src;
    if (!src) continue;
    delete f.dataset.src;
    if (f.loading !== 'eager') f.loading = 'lazy';
    f.src = src;
  }
}

/** The owner's own file: its poster showing, its controls ready, not started. */
function videoFor(p: Project, src: string, label: string): HTMLVideoElement {
  const v = document.createElement('video');
  v.controls = true;
  v.playsInline = true;
  v.preload = 'metadata';
  v.poster = projectAssetUrl(p.slug, 'poster.jpg');
  v.src = projectAssetUrl(p.slug, src);
  v.setAttribute('aria-label', label);
  return v;
}

/** A film in one part: its player, in the row. */
function mountFilm(p: Project, player: HTMLElement): Mounted {
  const film = p.film!;
  if (film.type === 'local') {
    const v = videoFor(p, film.src, p.title);
    player.append(v);
    recordPlayer('FILM', 'platform', "THE OWNER'S OWN FILE");
    return { frames: [], talking: [], videos: [v], bigs: [] };
  }
  const out: Mounted = { frames: [], talking: [], videos: [], bigs: [] };
  if (film.type === 'youtube' && embedSrc(film)) {
    const f = youTubeIn(player, film, p.title, p, out, 'FILM');
    return { ...out, frames: [f], talking: [f] };
  }
  const src = embedSrc(film, { autoplay: false, origin: location.origin });
  if (!src) return out;
  const f = frameFor(src, p.title);
  player.append(f);
  recordPlayer('FILM', 'platform', 'NOT A YOUTUBE FILM');
  return { ...out, frames: [f] };
}

/** A film in parts (owner 2026-09-28, GALAXY Z FOLD 8 ULTRA: "one watch will spawn two embed YouTube videos at once,
 *  on the same row together. So make special design for this"): one stage, every part at once, left to right in the
 *  project's own shape, a hinge between two, each numbered and labeled underneath. None starts by itself; one plays at
 *  a time, and the next starts when one ends (project/parts.ts). */
function mountParts(p: Project, player: HTMLElement): Mounted {
  player.classList.add('p-player--multi');
  const parts = p.films.filter((f) => f.type === 'local' || embedSrc(f) !== null);
  const stage = document.createElement('div');
  stage.className = 'p-parts';
  stage.dataset.uplink = `UPLINK ▸ ${parts.length} TRANSMISSIONS`;
  stage.style.setProperty('--parts', String(parts.length));
  // vertical footage stands vertical; any other film's parts stand 16:9, like its single player
  const ratio = aspectRatio(p.aspect);
  stage.style.setProperty('--part-ratio', String(ratio < 1 ? ratio : 16 / 9));
  const out: Mounted = { frames: [], talking: [], videos: [], bigs: [] };
  player.append(stage); // (in the page first: a part's big frame is sized on its box as it mounts)
  parts.forEach((film, i) => {
    if (i > 0) {
      const hinge = document.createElement('span');
      hinge.className = 'p-hinge';
      hinge.setAttribute('aria-hidden', 'true');
      stage.append(hinge);
    }
    const label = (film.label ?? `PART ${i + 1}`).toUpperCase();
    const fig = document.createElement('figure');
    fig.className = 'p-part';
    stage.append(fig);
    if (film.type === 'local') {
      const v = videoFor(p, film.src, `${p.title}: ${label}`);
      fig.append(v);
      out.videos.push(v);
      recordPlayer(`PART ${i + 1}`, 'platform', "THE OWNER'S OWN FILE");
    } else if (film.type === 'youtube') {
      // each part has its own player and its own bar
      const f = youTubeIn(fig, film, `${p.title}: ${label}`, p, out, `PART ${i + 1}`);
      out.frames.push(f);
      out.talking.push(f);
    } else {
      const f = frameFor(embedSrc(film, { autoplay: false, origin: location.origin })!, `${p.title}: ${label}`);
      fig.append(f);
      out.frames.push(f);
      recordPlayer(`PART ${i + 1}`, 'platform', 'NOT A YOUTUBE FILM');
    }
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<span class="p-part-num" aria-hidden="true">${pad2(i + 1)}</span><span class="p-part-label micro">${escapeHtml(label)}</span>`;
    fig.append(cap);
  });
  return out;
}

/** The site's film layers (grain + scanlines) must never land on an open
 *  player or on the footage wall: punch a hole per region in both layers,
 *  tracking each rect on scroll and resize. The rest of the page keeps its
 *  texture. Two named slots ('player', 'wall') map to the two mask holes. */
const holeTargets: { player?: HTMLElement; wall?: HTMLElement } = {};
let holesWired = false;

function syncHoles(): void {
  const layers = [
    document.getElementById('grain'),
    document.querySelector<HTMLElement>('.scan-layer'),
  ].filter((el): el is HTMLElement => el !== null);
  // rects arrive in viewport px; the mask vars land on the zoomed film
  // layers, which lay out in plate px — divide or the holes drift off
  // their windows under the poster lock
  const z = posterZoom();
  const put = (el: HTMLElement, prefix: string, t?: HTMLElement) => {
    if (t && t.isConnected) {
      const r = t.getBoundingClientRect();
      el.style.setProperty(`${prefix}-x`, `${r.left / z}px`);
      el.style.setProperty(`${prefix}-y`, `${r.top / z}px`);
      el.style.setProperty(`${prefix}-w`, `${r.width / z}px`);
      el.style.setProperty(`${prefix}-h`, `${r.height / z}px`);
    }
  };
  for (const el of layers) {
    el.classList.add('has-hole');
    put(el, '--hole', holeTargets.player);
    put(el, '--hole2', holeTargets.wall);
  }
  // the HUD's foot readouts (fixed, above the page) step aside while they meet the player: on a short screen a centred
  // player reaches the screen's foot, and the timecode stood over the picture's corner (measured, Android 1280 x 672)
  const pl = holeTargets.player?.isConnected ? holeTargets.player.getBoundingClientRect() : null;
  for (const h of document.querySelectorAll<HTMLElement>('.hud-bl, .hud-br')) {
    h.classList.toggle('hud-yield', meets(pl ?? { left: 0, top: 0, right: 0, bottom: 0 }, h.getBoundingClientRect()));
  }
}

let holesRO: ResizeObserver | null = null;

function armEffectHole(slot: 'player' | 'wall', target: HTMLElement): void {
  holeTargets[slot] = target;
  syncHoles();
  if (!holesWired) {
    holesWired = true;
    window.addEventListener('scroll', syncHoles, { passive: true });
    window.addEventListener('resize', syncHoles);
    // scroll/resize can't see a region GROWING — the wall gains height with
    // every still that finishes loading — so the regions watch themselves
    holesRO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => syncHoles()) : null;
    // …nor one MOVING without a scroll: the display face landing reflows the sections above the player
    void document.fonts?.ready?.then(syncHoles);
    window.addEventListener('load', syncHoles);
  }
  holesRO?.observe(target);
}

/* -------------------------------------------------------------- ticker -- */

function mountTicker(p: Project, stamp: string): void {
  const items = [runningTitle(p.title), ...p.tags, 'REVACHOL', stamp];
  const spanFor = (t: string, i: number) =>
    `<span class="tk tk-${(i % 4) + 1}">${escapeHtml(t.toUpperCase())}</span><span class="tk-sep">${i % 2 ? '▪' : '✚'}</span>`;
  const track = document.getElementById('p-ticker-track')!;
  const half = (reps: number) => {
    let out = '';
    for (let k = 0; k < reps * items.length; k++) out += spanFor(items[k % items.length], k);
    return out;
  };
  const mount = (reps: number) => {
    const h = half(reps);
    track.innerHTML = `<span class="p-ticker-half">${h}</span><span class="p-ticker-half">${h}</span>`;
  };
  // the pipe must never show blank: repeat the sequence until one half
  // outspans the widest this screen can get, then pin the scroll speed so a
  // longer track doesn't play back faster (the keyframe travels -50% of it)
  mount(1);
  const w1 = (track.querySelector('.p-ticker-half') as HTMLElement).getBoundingClientRect().width;
  if (w1 > 0) {
    const target = Math.max(window.innerWidth, screen.width) * 1.2;
    const reps = Math.max(1, Math.ceil(target / w1));
    if (reps > 1) mount(reps);
    const halfW = (track.querySelector('.p-ticker-half') as HTMLElement).getBoundingClientRect().width;
    track.style.animationDuration = `${Math.round(halfW / 44)}s`;
  }
}

/* -------------------------------------------------------- footage wall -- */

/** HEAD-probe a list of urls; first real hit wins. Dev servers answer missing
 *  files with the SPA's index.html, so a text/html body is a miss. */
async function probeFirst(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok && !(res.headers.get('content-type') ?? '').includes('text/html')) return url;
    } catch { /* next */ }
  }
  return null;
}

const STILL_CAP = 60;

/** The wall's frames: an explicit `stills` list in projects.json wins, then
 *  the build manifest's listing (zero network probes — a flaky phone
 *  connection used to drop one HEAD, read as "numbering gap", and strand
 *  the wall at a single still until a refresh); the probe walk over
 *  numbered files (01.jpg, 02.gif, … contiguous from 01, capped at 60) is
 *  only the no-manifest fallback. The layout adapts to whatever is found. */
async function resolveStills(p: Project): Promise<string[]> {
  if (p.stills.length) return p.stills.map((s) => projectAssetUrl(p.slug, `stills/${s}`));
  const listed = manifestStills(p.slug);
  if (listed) return listed.slice(0, STILL_CAP);
  const found: string[] = [];
  for (let base = 1; base <= STILL_CAP; base += 6) {
    const chunk = await Promise.all(
      Array.from({ length: Math.min(6, STILL_CAP - base + 1) }, (_, k) =>
        probeFirst(stillSlotUrls(p.slug, base + k)),
      ),
    );
    for (const url of chunk) {
      if (!url) return found; // a numbering gap ends the reel
      found.push(url);
    }
  }
  return found;
}

async function mountWall(p: Project): Promise<void> {
  const sec = document.getElementById('p-rec-sec')!;
  sec.hidden = true; // no empty REC: rail while the reel is still resolving
  const urls = await resolveStills(p);
  if (urls.length === 0) return;
  sec.hidden = false;
  const wall = document.getElementById('p-stills')!;
  // the footage itself is raw glass: the film layers carve the wall out, so
  // no grain or scanlines ever land on the stills
  armEffectHole('wall', wall);

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.25 },
  );

  let cursor = 0;
  const figureFor = (
    url: string,
    n: number,
    caption = `STL·${pad2(n)} // ${p.slug.toUpperCase()}`,
    alt = `${p.title} — still ${n}`,
  ): HTMLElement => {
    const wrap = document.createElement('figure');
    wrap.className = 'p-still';
    const im = new Image();
    im.loading = 'lazy';
    im.alt = alt;
    im.src = url;
    const veilC = document.createElement('canvas');
    im.addEventListener('load', () => {
      const d = ditherImageToCanvas(im, im.naturalWidth, im.naturalHeight, 200, '#060606', p.accent);
      veilC.width = d.width;
      veilC.height = d.height;
      veilC.getContext('2d')?.drawImage(d, 0, 0);
    });
    im.addEventListener('error', () => {
      // one honest retry first: transient drops are routine on phone
      // networks, and a removed still never comes back without a refresh
      if (!im.dataset.retried) {
        im.dataset.retried = '1';
        setTimeout(() => { im.removeAttribute('src'); im.src = url; }, 900);
        return;
      }
      console.warn(`[revachol] missing media: ${im.src} — still removed from the gallery`);
      wrap.remove();
      // a wall of dead frames must not leave empty rhythm rows behind
      for (const row of wall.querySelectorAll('.p-row')) {
        if (!row.querySelector('.p-still')) row.remove();
      }
      if (!wall.querySelector('.p-still')) sec.hidden = true;
    });
    const num = document.createElement('span');
    num.className = 'p-still-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = pad2(n);
    const cap = document.createElement('figcaption');
    cap.className = 'micro';
    cap.textContent = caption;
    wrap.append(im, veilC, num, cap);
    io.observe(wrap);
    return wrap;
  };

  if (aspectRatio(p.aspect) < 1) {
    // a vertical film's wall (owner 2026-09-28: "design vertical stills for all vertical projects"): portrait cells,
    // 4 across (3 on a tablet, 2 on a phone), gapless and full-bleed like every wall. Stills named by part (1-01,
    // 2-01, …) stand in pillars, part 1 on the left: "left pillar being ad #1, and right pillar being ad #2"
    wall.classList.add('p-wall--vertical');
    const parts = stillParts(urls);
    if (parts.length > 1 && parts.every((g) => g.part > 0)) {
      // one column count for every pillar (project.css; owner 2026-09-28, of pillars 2 and 3 across: "the two columns
      // must be equal-sized, not mismatch like this"), so every still is the same size: the shorter pillar ends in the
      // hatch, and each pillar's first empty cell carries its end mark
      const pillars = document.createElement('div');
      pillars.className = 'p-pillars';
      parts.forEach((g) => {
        const label = (p.films[g.part - 1]?.label ?? `PART ${g.part}`).toUpperCase();
        const col = document.createElement('div');
        col.className = 'p-stillcol';
        col.innerHTML =
          `<div class="p-stillcol-head"><span class="p-stillcol-num" aria-hidden="true">${pad2(g.part)}</span>` +
          `<span class="p-stillcol-label micro">${escapeHtml(label)}</span>` +
          `<span class="p-stillcol-count micro">${pad2(g.urls.length)} STILLS</span></div>`;
        const grid = document.createElement('div');
        grid.className = 'p-vgrid';
        grid.dataset.eof = `EOF ▪ ${label}`;
        g.urls.forEach((url, i) =>
          grid.append(figureFor(url, i + 1, `STL·${g.part}-${pad2(i + 1)}`, `${p.title}: ${label}, still ${i + 1}`)),
        );
        col.append(grid);
        pillars.append(col);
      });
      wall.append(pillars);
    } else {
      const grid = document.createElement('div');
      grid.className = 'p-vgrid';
      urls.forEach((url, i) => grid.append(figureFor(url, i + 1, `STL·${pad2(i + 1)}`)));
      wall.append(grid);
    }
    return;
  }

  for (const kind of wallRows(urls.length, p.bigStills)) {
    const row = document.createElement('div');
    row.className = `p-row p-row-${kind}`;
    const take = kind === 'pair' ? 2 : 1;
    for (let i = 0; i < take && cursor < urls.length; i++, cursor++) {
      row.append(figureFor(urls[cursor], cursor + 1));
    }
    wall.append(row);
  }
}

/* ------------------------------------------------------------ end nav -- */

function mountEndNav(all: Project[], idx: number): void {
  const next = all[(idx + 1) % all.length];
  const solo = all.length < 2;
  document.getElementById('p-confirm')!.innerHTML = `
    <div class="p-endnav" data-stamp>
      <a class="p-back" href="/works.html" data-internal data-cursor="BACK ◂">◂ BACK TO ALL FILMS</a>
      ${solo ? '' : `<a class="p-nextlink" href="/project.html?p=${next.slug}" data-internal data-cursor="NEXT ▸" style="--tt-acc: ${escapeHtml(next.accent)}">NEXT FILM ▸ ${lockupHtml(next.title.toUpperCase(), softBreaks)}</a>`}
    </div>`;
  // (a two-language name stands as its lockup, lib/title.ts: settled now and once the display face is in)
  const lock = document.querySelector<HTMLElement>('.p-nextlink .tt-lock');
  if (lock) { settleLockup(lock); void document.fonts?.ready?.then(() => settleLockup(lock)); }
}
