import { getSlugFromSearch, loadProjects, Project, projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { embedSrc } from '../lib/embeds';
import { mulberry32 } from '../lib/rng';
import { escapeHtml } from '../lib/escape';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { barcodeSvg, hashSlug, specimenCodes, wallRhythm } from '../project/dossier';
import { armStamps } from '../lib/stamps';
import { startPage } from '../shell/page';
import '../styles/project.css';

startPage(
  'project',
  async ({ hud }) => {
    const projects = await loadProjects();
    hud.setCount(projects.length);
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
  // property of the specimen: the dither veils and the HUE chip below.
  const codes = specimenCodes(p.slug);
  const stamp = `P·${pad2(idx + 1)}/${pad2(all.length)}`;

  mountHero(p, codes, stamp);
  mountSpec(p, codes);
  mountSynopsis(p);
  mountTicker(p, codes, stamp);
  mountWall(p);
  mountCredits(p);
  mountConfirm(all, idx);

  document.getElementById('p-eof')!.innerHTML =
    `<span>EOF ▪ ${stamp} ▪ REVACHOL — ${p.year}</span>${barcodeSvg(codes.bars)}`;

  armStamps();
}

/* ---------------------------------------------------------------- hero -- */

function mountHero(p: Project, codes: { code: string; sig: string; bars: number[] }, stamp: string): void {
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

  hero.src = projectAssetUrl(p.slug, 'preview.mp4');
  hero.addEventListener('canplay', () => { videoReady = true; maybeReveal(); }, { once: true });
  hero.addEventListener('error', () => {
    heroDead = true;
    console.warn(`[revachol] missing media: ${hero.src} — hero stays on the dithered poster`);
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

  document.getElementById('p-index')!.innerHTML =
    `<span>${stamp}</span>${barcodeSvg(codes.bars, 16)}`;

  const rows: [string, string][] = [
    ['ROLE', p.role],
    ['YR', String(p.year)],
    ['RT', p.runtime],
    ['CODE', codes.code],
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

function mountSpec(p: Project, codes: { code: string; sig: string }): void {
  const rows: [string, string][] = [];
  rows.push(['YEAR', `<span>${p.year}</span>`]);
  if (p.role) rows.push(['ROLE', `<span>${escapeHtml(p.role.toUpperCase())}</span>`]);
  if (p.runtime) rows.push(['RUNTIME', `<span>${escapeHtml(p.runtime)}</span>`]);
  if (p.tags.length)
    rows.push(['TAGS', p.tags.map((t) => `<span class="p-pill">${escapeHtml(t.toUpperCase())}</span>`).join('')]);
  rows.push([
    'HUE',
    `<span class="p-swatch" style="background:${p.accent}"></span><span>${p.accent.toUpperCase()}</span>`,
  ]);
  rows.push(['CODE', `<span>${codes.code}</span>`]);
  rows.push(['SIG', `<span>${codes.sig}</span>`]);
  rows.push(['STATUS', `<span class="p-ok">ONLINE ▸ VERIFIED<span class="p-caret" aria-hidden="true">▮</span></span>`]);

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

function mountTicker(p: Project, codes: { code: string }, stamp: string): void {
  const items = [p.title, ...p.tags, 'REVACHOL', codes.code, stamp, 'ONLINE'];
  const half = items
    .map(
      (t, i) =>
        `<span class="tk tk-${(i % 4) + 1}">${escapeHtml(t.toUpperCase())}</span><span class="tk-sep">${i % 2 ? '▪' : '✚'}</span>`,
    )
    .join('');
  document.getElementById('p-ticker-track')!.innerHTML =
    `<span class="p-ticker-half">${half}</span><span class="p-ticker-half">${half}</span>`;
}

/* -------------------------------------------------------- footage wall -- */

function mountWall(p: Project): void {
  const sec = document.getElementById('p-rec-sec')!;
  if (p.stills.length === 0) {
    sec.hidden = true;
    return;
  }
  const wall = document.getElementById('p-stills')!;
  const lightbox = document.getElementById('lightbox') as HTMLDialogElement;
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  document.getElementById('lightbox-close')!.addEventListener('click', () => lightbox.close());

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
  const figureFor = (s: string, n: number): HTMLElement => {
    const wrap = document.createElement('figure');
    wrap.className = 'p-still';
    wrap.dataset.cursor = 'VIEW +';
    const im = new Image();
    im.loading = 'lazy';
    im.alt = `${p.title} — still ${n}`;
    im.src = projectAssetUrl(p.slug, `stills/${s}`);
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
    wrap.addEventListener('click', () => {
      lightboxImg.src = im.src;
      lightbox.showModal();
    });
    io.observe(wrap);
    return wrap;
  };

  for (const kind of wallRhythm(p.stills.length)) {
    const row = document.createElement('div');
    row.className = `p-row p-row-${kind}`;
    const take = kind === 'pair' ? 2 : 1;
    for (let i = 0; i < take && cursor < p.stills.length; i++, cursor++) {
      row.append(figureFor(p.stills[cursor], cursor + 1));
    }
    wall.append(row);
  }
}

/* ------------------------------------------------------------- credits -- */

function mountCredits(p: Project): void {
  if (!p.credits.length) return;
  const sec = document.getElementById('p-credits-sec')!;
  sec.hidden = false;
  document.getElementById('p-credits')!.innerHTML = p.credits
    .map(
      (c) =>
        `<div class="p-credit" data-stamp><span class="p-credit-role micro">${escapeHtml(c.role.toUpperCase())}</span><span class="p-credit-name">${escapeHtml(c.name)}</span></div>`,
    )
    .join('');
}

/* ------------------------------------------------- confirm? yes / no -- */

function mountConfirm(all: Project[], idx: number): void {
  const prev = all[(idx - 1 + all.length) % all.length];
  const next = all[(idx + 1) % all.length];
  const solo = all.length < 2;
  document.getElementById('p-confirm')!.innerHTML = `
    ${solo ? '' : `<p class="p-prev micro" data-stamp>◂ PREV :: <a href="/project.html?p=${prev.slug}" data-internal>${escapeHtml(prev.title.toUpperCase())}</a></p>`}
    <h2 class="p-confirm-q" data-stamp>NEXT PROCEDURE?</h2>
    <div class="p-yesno" data-stamp>
      ${solo ? '' : `<a class="p-yes" href="/project.html?p=${next.slug}" data-internal data-cursor="NEXT ▸">YES ▸ ${escapeHtml(next.title.toUpperCase())}</a>`}
      <a class="p-no" href="/works.html" data-internal data-cursor="FLOOR ◂">NO ▸ RETURN TO FLOOR</a>
    </div>`;
}
