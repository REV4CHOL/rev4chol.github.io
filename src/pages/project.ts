import { getSlugFromSearch, loadProjects, loopSrcChain, Project, projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { embedSrc } from '../lib/embeds';
import { mulberry32 } from '../lib/rng';
import { escapeHtml } from '../lib/escape';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { hashSlug, stillSlotUrls, wallRhythm } from '../project/dossier';
import { armStamps } from '../lib/stamps';
import { startPage } from '../shell/page';
import '../styles/project.css';

startPage(
  'project',
  // no count in the HUD here — the dossier's own P·NN/NN stamp carries it,
  // and two counters in the same corner read as clutter
  async () => {
    const projects = await loadProjects();
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
      <p><a class="btn" href="/works.html" data-internal>BACK TO THE FLOOR ▸</a></p>
    </div>`;
}

function render(p: Project, all: Project[], idx: number): void {
  document.title = `${p.title.toUpperCase()} — REVACHOL`;
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

  void scrambleEl(document.getElementById('p-status-line')!, `PROCEDURE :: ${p.slug.toUpperCase()} // ONLINE`, 900);

  document.getElementById('p-index')!.innerHTML = `<span>${stamp}</span>`;

  const rows: [string, string][] = [
    ['ROLE', p.role],
    ['YR', String(p.year)],
    ['RT', p.runtime],
  ];
  document.getElementById('p-callouts')!.innerHTML = rows
    .filter(([, v]) => v)
    .map(
      ([k, v], i) =>
        `<div class="p-callout" style="--d:${i * 90}ms"><span class="pc-line"></span><span>${k} :: ${escapeHtml(v.toUpperCase())}</span></div>`,
    )
    .join('');

  const title = p.title.toUpperCase();
  document.getElementById('p-title-ghost')!.textContent = title;
  void scrambleEl(document.getElementById('p-title')!, title, 650);
}

/* ---------------------------------------------------------- spec sheet -- */

function mountSpec(p: Project): void {
  const rows: [string, string][] = [];
  rows.push(['YEAR', `<span>${p.year}</span>`]);
  if (p.role) rows.push(['ROLE', `<span>${escapeHtml(p.role.toUpperCase())}</span>`]);
  if (p.runtime) rows.push(['RUNTIME', `<span>${escapeHtml(p.runtime)}</span>`]);
  if (p.tags.length)
    rows.push(['GENRE', p.tags.map((t) => `<span class="p-pill">${escapeHtml(t.toUpperCase())}</span>`).join('')]);

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

  const watch = document.getElementById('p-watch-btn') as HTMLButtonElement;
  const player = document.getElementById('p-player') as HTMLDivElement;
  if (!p.film) return;
  watch.hidden = false;
  watch.dataset.cursor = 'PLAY ▸';
  watch.addEventListener('click', () => {
    watch.hidden = true;
    player.hidden = false;
    sound.zap();
    if (p.film!.type === 'local') {
      const v = document.createElement('video');
      v.controls = true;
      v.src = projectAssetUrl(p.slug, p.film!.src);
      player.append(v);
      void v.play().catch(() => {});
    } else {
      const src = embedSrc(p.film!);
      if (src) {
        const f = document.createElement('iframe');
        f.src = src;
        f.allow = 'autoplay; fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        player.append(f);
      }
    }
  });
}

/* -------------------------------------------------------------- ticker -- */

function mountTicker(p: Project, stamp: string): void {
  const items = [p.title, ...p.tags, 'REVACHOL', stamp];
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

/** The wall's frames: an explicit `stills` list in projects.json wins;
 *  otherwise numbered files dropped in stills/ (01.jpg, 02.gif, …) are
 *  discovered automatically — any count, contiguous from 01, capped at 60.
 *  The layout adapts to whatever is found. */
async function resolveStills(p: Project): Promise<string[]> {
  if (p.stills.length) return p.stills.map((s) => projectAssetUrl(p.slug, `stills/${s}`));
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
  const figureFor = (url: string, n: number): HTMLElement => {
    const wrap = document.createElement('figure');
    wrap.className = 'p-still';
    const im = new Image();
    im.loading = 'lazy';
    im.alt = `${p.title} — still ${n}`;
    im.src = url;
    const veilC = document.createElement('canvas');
    im.addEventListener('load', () => {
      const d = ditherImageToCanvas(im, im.naturalWidth, im.naturalHeight, 200, '#060606', p.accent);
      veilC.width = d.width;
      veilC.height = d.height;
      veilC.getContext('2d')?.drawImage(d, 0, 0);
    });
    im.addEventListener('error', () => {
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
    cap.textContent = `STL·${pad2(n)} // ${p.slug.toUpperCase()}`;
    wrap.append(im, veilC, num, cap);
    io.observe(wrap);
    return wrap;
  };

  for (const kind of wallRhythm(urls.length)) {
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
      <a class="p-back" href="/works.html" data-internal data-cursor="FLOOR ◂">◂ RETURN</a>
      ${solo ? '' : `<a class="p-nextlink" href="/project.html?p=${next.slug}" data-internal data-cursor="NEXT ▸">${escapeHtml(next.title.toUpperCase())} ▸</a>`}
    </div>`;
}
