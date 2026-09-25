import gsap from 'gsap';
import { loadLoopManifest, loadProjects, projectAssetUrl, type Project } from '../lib/content';
import { reducedMotion } from '../lib/env';
import { armPosterLock, posterZoom } from '../lib/poster-lock';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { startPage } from '../shell/page';
import { CHANNELS, ChannelKey, channelFromSearch, channelProjects, nameScale } from '../works/channels';
import { mountWorksOverlay } from '../works/overlay';
import { WorksWorld } from '../works/world';

startPage(
  'work',
  async ({ hud }) => {
    // the DOM chrome (nav, HUD, switcher, ident, label, corner marks) is a
    // fixed 1440px plate; the FLOOR is exempt — panes and background keep
    // their true full-viewport world, untouched by the lock
    armPosterLock({ exempt: '#floor' });
    const projects = await loadProjects();
    await loadLoopManifest(); // tiles build their loop chains synchronously
    mountWorksOverlay();
    const host = document.getElementById('floor')!;

    let world: WorksWorld | null = null;
    let active: ChannelKey = channelFromSearch(location.search);
    let flipping = false;
    (window as unknown as { rvlGsap: typeof gsap }).rvlGsap = gsap; // debug handle for verification

    const mount = async (key: ChannelKey) => {
      const list = channelProjects(projects, key);
      hud.setCount(list.length);
      world = await WorksWorld.create(host, list, {
        onCoords: (x, y) => hud.setCoords(x, y),
      });
      (window as unknown as { rvlWorld: WorksWorld }).rvlWorld = world; // debug handle for verification
      buildSemanticList(list, world);
    };

    // the channel switcher — two names, one floor at a time
    const sw = document.getElementById('ch-switch')!;
    const paint = () => {
      for (const b of sw.querySelectorAll<HTMLButtonElement>('button')) {
        const on = b.dataset.ch === active;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
        const mark = b.querySelector('.ch-mark') as HTMLElement;
        mark.textContent = on ? '▸ ' : '';
      }
    };
    for (const ch of CHANNELS) {
      const b = document.createElement('button');
      b.dataset.ch = ch.key;
      b.innerHTML = `<span class="ch-idx micro">${ch.index}</span><span class="ch-name"><span class="ch-mark"></span><span class="ch-word">${ch.name}</span></span>`;
      b.addEventListener('click', () => void flip(ch.key));
      sw.append(b);
    }
    // every chapter name reads BIGGER than its CH·NN label (owner: "the AI must be bigger than ch02 on top.
    // Same goes for COLORIST"): measured at scale 1 — the word alone, the ▸ mark outside the measure — and
    // grown together, so the names stay one size; again when the fonts land and on every resize
    const sizeDial = () => {
      sw.style.setProperty('--ch-scale', '1');
      const pairs = [...sw.querySelectorAll('button')].map((b) => ({
        name: b.querySelector('.ch-word')!.getBoundingClientRect().width,
        index: b.querySelector('.ch-idx')!.getBoundingClientRect().width,
      }));
      sw.style.setProperty('--ch-scale', nameScale(pairs).toFixed(4));
    };
    sizeDial();
    void document.fonts?.ready?.then(sizeDial);
    window.addEventListener('resize', sizeDial);

    const staticEl = document.getElementById('ch-static')!;
    const flip = async (key: ChannelKey) => {
      if (flipping || key === active) return;
      flipping = true;
      active = key;
      paint();
      history.replaceState(null, '', `?ch=${key}`);
      // the channel ident stamps over the static while the floor swaps —
      // the words scramble in while the plate copies (data-text) show the
      // tuned-in name underneath; scrambleEl self-gates on calm mode
      const ch = CHANNELS.find((c) => c.key === key)!;
      const nameEl = document.getElementById('ch-ident-name')!;
      const idxEl = document.getElementById('ch-ident-idx')!;
      const tuning = `${ch.index} ▸ TUNING`;
      nameEl.dataset.text = ch.name;
      // the ident name never leaves the screen: measure the full name at its
      // CSS size and cap the font so the nowrap type fits 92% of any viewport
      // (the same fit-to-measure move as the dossier titles)
      nameEl.textContent = ch.name;
      nameEl.style.fontSize = '';
      // …and never reads smaller than the label over it (owner: a short name like AI came out narrower than its
      // CH·02 ▸ TUNING): the label's final text goes in before its scramble, both are measured, the name grows
      idxEl.textContent = tuning;
      const grow = nameScale([{ name: nameEl.getBoundingClientRect().width, index: idxEl.getBoundingClientRect().width }]);
      if (grow > 1) nameEl.style.fontSize = `${parseFloat(getComputedStyle(nameEl).fontSize) * grow}px`;
      // the ident lives on the plate: fit against plate width, not viewport
      const fitW = (window.innerWidth / posterZoom()) * 0.92;
      if (nameEl.scrollWidth > fitW) {
        const base = parseFloat(getComputedStyle(nameEl).fontSize);
        nameEl.style.fontSize = `${Math.floor(base * (fitW / nameEl.scrollWidth) * 98) / 100}px`;
      }
      void scrambleEl(idxEl, tuning, 320);
      void scrambleEl(nameEl, ch.name, 480);
      sound.chime();
      staticEl.classList.add('on');
      // the whole world leaves physically — panes, furniture and lattice
      // tearing off along the floor's grain under the misregistration rig
      world?.unhover();
      await world?.exit();
      world?.destroy();
      world = null;
      await mount(key);
      world!.arrive();
      await new Promise((r) => setTimeout(r, reducedMotion() ? 80 : 380));
      staticEl.classList.remove('on');
      flipping = false;
    };

    paint();
    await mount(active);

    window.addEventListener('keydown', (e) => {
      if (!world) return;
      const step = 140;
      const onInteractive = (e.target as Element | null)?.closest?.('a, button') != null;
      if (e.key === 'ArrowLeft') { e.preventDefault(); world.panBy(step, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); world.panBy(-step, 0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); world.panBy(0, step); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); world.panBy(0, -step); }
      else if (e.key === 'Enter' && !onInteractive) world.enterHovered();
    });
  },
  [
    { label: 'LOAD PROJECT INDEX', run: () => loadProjects() },
    {
      label: 'CACHE FLOOR POSTERS',
      run: async () => {
        const ps = await loadProjects();
        await Promise.allSettled(
          ps.slice(0, 4).map(
            (p) =>
              new Promise((res) => {
                const im = new Image();
                im.onload = im.onerror = () => res(null);
                im.src = projectAssetUrl(p.slug, 'poster.jpg');
              }),
          ),
        );
      },
    },
  ],
);

function buildSemanticList(projects: Project[], world: WorksWorld): void {
  const ul = document.getElementById('sr-projects');
  if (!ul) return;
  ul.replaceChildren();
  for (const p of projects) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/project.html?p=${p.slug}`;
    a.textContent = `${p.title} (${p.year})`;
    a.addEventListener('focus', () => world.focusProject(p.slug));
    li.append(a);
    ul.append(li);
  }
}
