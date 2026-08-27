import { getSlugFromSearch, loadProjects, Project, projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { embedSrc } from '../lib/embeds';
import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';
import '../styles/project.css';

startPage(
  'project',
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

function renderNotFound(): void {
  document.title = 'SIGNAL LOST — REVACHOL';
  document.getElementById('app')!.innerHTML = `
    <div class="p-notfound">
      <h1 class="statement">SIGNAL LOST</h1>
      <p class="micro">PROJECT NOT FOUND IN THE INDEX</p>
      <p><a class="btn" href="/works.html" data-internal>BACK TO THE FLOOR ▸</a></p>
    </div>`;
}

function render(p: Project, all: Project[], idx: number): void {
  document.title = `${p.title.toUpperCase()} — REVACHOL`;
  document.documentElement.style.setProperty('--accent', p.accent);

  const hero = document.getElementById('p-hero-video') as HTMLVideoElement;
  hero.src = projectAssetUrl(p.slug, 'preview.mp4');
  hero.addEventListener('error', () => hero.remove());
  void hero.play().catch(() => {});

  const veil = document.getElementById('p-hero-veil') as HTMLCanvasElement;
  const posterImg = new Image();
  posterImg.onload = () => {
    const d = ditherImageToCanvas(posterImg, posterImg.naturalWidth, posterImg.naturalHeight, 320, '#060606', p.accent);
    veil.width = d.width;
    veil.height = d.height;
    veil.getContext('2d')?.drawImage(d, 0, 0);
    setTimeout(() => {
      veil.style.transition = 'opacity 1.1s';
      veil.style.opacity = '0';
    }, 350);
  };
  posterImg.onerror = () => veil.remove();
  posterImg.src = projectAssetUrl(p.slug, 'poster.jpg');

  void scrambleEl(document.getElementById('p-title')!, p.title.toUpperCase(), 650);

  document.getElementById('p-meta')!.innerHTML = [String(p.year), p.role, p.runtime, ...p.tags]
    .filter(Boolean)
    .map((t) => `<span>${t.toUpperCase()}</span>`)
    .join('');

  document.getElementById('p-synopsis')!.textContent = p.synopsis;

  const watch = document.getElementById('p-watch-btn') as HTMLButtonElement;
  const player = document.getElementById('p-player') as HTMLDivElement;
  if (p.film) {
    watch.hidden = false;
    watch.dataset.cursor = 'PLAY ▸';
    watch.addEventListener('click', () => {
      watch.hidden = true;
      player.hidden = false;
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

  const stills = document.getElementById('p-stills')!;
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
  for (const s of p.stills) {
    const wrap = document.createElement('figure');
    wrap.className = 'p-still';
    wrap.dataset.cursor = 'VIEW +';
    const im = new Image();
    im.loading = 'lazy';
    im.alt = `${p.title} — still`;
    im.src = projectAssetUrl(p.slug, `stills/${s}`);
    const veilC = document.createElement('canvas');
    im.addEventListener('load', () => {
      const d = ditherImageToCanvas(im, im.naturalWidth, im.naturalHeight, 200, '#060606', p.accent);
      veilC.width = d.width;
      veilC.height = d.height;
      veilC.getContext('2d')?.drawImage(d, 0, 0);
    });
    im.addEventListener('error', () => wrap.remove());
    wrap.append(im, veilC);
    wrap.addEventListener('click', () => {
      lightboxImg.src = im.src;
      lightbox.showModal();
    });
    stills.append(wrap);
    io.observe(wrap);
  }

  if (p.credits.length) {
    document.getElementById('p-credits')!.innerHTML =
      `<table>${p.credits.map((c) => `<tr><td>${c.role}</td><td>${c.name}</td></tr>`).join('')}</table>`;
  }

  const prev = all[(idx - 1 + all.length) % all.length];
  const next = all[(idx + 1) % all.length];
  document.getElementById('p-pager')!.innerHTML = `
    <a class="btn" href="/project.html?p=${prev.slug}" data-internal>◂ ${prev.title.toUpperCase()}</a>
    <a class="btn" href="/project.html?p=${next.slug}" data-internal>${next.title.toUpperCase()} ▸</a>`;
}
