import gsap from 'gsap';
import { isPlaceholder, loadFloor, loadLoopManifest, loadProjects, projectAssetUrl, type Project } from '../lib/content';
import { finePointer, reducedMotion } from '../lib/env';
import { softBreaks } from '../lib/escape';
import { armPosterLock, posterZoom } from '../lib/poster-lock';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { startPage } from '../shell/page';
import { CHANNELS, ChannelKey, channelFromSearch, channelProjects } from '../works/channels';
import { chapterTabLabel, listGroups, searchForView, toggleText, viewFromSearch, type WorkView } from '../works/index-list';
import { floorOpened, legendText } from '../works/legend';
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
    const floor = await loadFloor(); // the films AND the held places, in json order
    await loadLoopManifest(); // tiles build their loop chains synchronously
    mountWorksOverlay();
    // THE LEGEND (owner's testers, 2026-09-27: "not knowing what to do … what to click on"): the floor's controls in
    // one line, lit until the visitor has opened a pane once (world.enter dims it), then a quiet reminder
    const hint = document.getElementById('floor-hint');
    // …and under its words the control that turns the floor into a plain list of every film (works/index-list.ts;
    // owner's testers, 2026-09-30: "they dont know how to navigate … they feel lost")
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'view-toggle';
    if (hint) {
      const words = document.createElement('span');
      words.className = 'fh-text';
      words.textContent = legendText(finePointer());
      hint.replaceChildren(words, toggle);
      let opened = false;
      try { opened = floorOpened(localStorage); } catch { /* no storage: stays lit */ }
      hint.classList.toggle('is-fresh', !opened);
    }
    const host = document.getElementById('floor')!;

    let world: WorksWorld | null = null;
    let active: ChannelKey = channelFromSearch(location.search);
    let flipping = false;

    // THE TWO VIEWS: the floor, or the list. The address decides first, then what this visit chose.
    const VIEW_KEY = 'rvl-work-view';
    let remembered: string | null = null;
    try { remembered = sessionStorage.getItem(VIEW_KEY); } catch { /* no storage: the address alone decides */ }
    let view: WorkView = viewFromSearch(location.search, remembered);
    const main = document.getElementById('app')!;
    const listEl = document.getElementById('film-list')!;
    buildFilmList(listEl, projects);
    const setView = (v: WorkView, byHand = false) => {
      view = v;
      main.classList.toggle('is-list', v === 'list');
      listEl.hidden = v !== 'list';
      document.getElementById('sr-projects')?.toggleAttribute('hidden', v === 'list'); // (the list says it all)
      toggle.textContent = toggleText(v, projects.length);
      toggle.dataset.cursor = v === 'list' ? 'FILM WALL ◂' : 'LIST ▸';
      if (v === 'list') world?.pause();
      else world?.resume();
      hud.setCount(v === 'list' ? projects.length : channelProjects(projects, active).length);
      try { sessionStorage.setItem(VIEW_KEY, v); } catch { /* no storage */ }
      if (!byHand) return;
      history.replaceState(null, '', searchForView(location.search, v) || location.pathname);
      sound.click();
      if (v === 'list') {
        listEl.scrollTop = 0;
        listEl.focus({ preventScroll: true }); // (the arrow keys and the space bar scroll the list from here)
      }
    };
    toggle.addEventListener('click', () => setView(view === 'list' ? 'floor' : 'list', true));
    (window as unknown as { rvlGsap: typeof gsap }).rvlGsap = gsap; // debug handle for verification

    const mount = async (key: ChannelKey) => {
      const list = channelProjects(projects, key);
      hud.setCount(list.length); // films only — a held place is not a project
      world = await WorksWorld.create(host, channelProjects(floor, key), {
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
        // the small line counts the films behind the tab: the chapter not showing says how many MORE (the tab read
        // as a caption, and five of the seventeen films stood behind it unseen; the review's walkthroughs, 2026-09-30)
        const ch = CHANNELS.find((c) => c.key === b.dataset.ch)!;
        (b.querySelector('.ch-idx') as HTMLElement).textContent = chapterTabLabel(ch.index, channelProjects(projects, ch.key).length, on);
      }
    };
    for (const ch of CHANNELS) {
      const b = document.createElement('button');
      b.dataset.ch = ch.key;
      b.dataset.cursor = 'SWITCH CHAPTER ▸'; // the cursor names the tab's job, in full (owner's testers, 2026-09-27; plain words 09-28)
      b.innerHTML = `<span class="ch-idx micro"></span><span class="ch-name"><span class="ch-mark"></span>${ch.name}</span>`;
      b.addEventListener('click', () => void flip(ch.key));
      sw.append(b);
    }

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
      nameEl.dataset.text = ch.name;
      // the ident name never leaves the screen: measure the full name at its
      // CSS size and cap the font so the nowrap type fits 92% of any viewport
      // (the same fit-to-measure move as the dossier titles)
      nameEl.textContent = ch.name;
      nameEl.style.fontSize = '';
      // the ident lives on the plate: fit against plate width, not viewport
      const fitW = (window.innerWidth / posterZoom()) * 0.92;
      if (nameEl.scrollWidth > fitW) {
        const base = parseFloat(getComputedStyle(nameEl).fontSize);
        nameEl.style.fontSize = `${Math.floor(base * (fitW / nameEl.scrollWidth) * 98) / 100}px`;
      }
      void scrambleEl(document.getElementById('ch-ident-idx')!, `${ch.index} ▸ TUNING`, 320);
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
    setView(view);

    window.addEventListener('keydown', (e) => {
      if (!world || view === 'list') return; // (in the list the keys scroll the list)
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

/** The list view: every film of both chapters as a page of links (works/index-list.ts has its words and its order).
 *  Built once, hidden until asked for; its thumbnails load only when it shows. */
function buildFilmList(host: HTMLElement, projects: Project[]): void {
  const span = (cls: string, text: string) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  };
  host.replaceChildren();
  for (const g of listGroups(projects)) {
    const sec = document.createElement('section');
    sec.className = 'fl-group';
    const head = document.createElement('h2');
    head.className = 'fl-head micro';
    head.textContent = g.heading;
    const rows = document.createElement('ul');
    rows.className = 'fl-rows';
    for (const r of g.rows) {
      const a = document.createElement('a');
      a.className = 'fl-row';
      a.href = r.href;
      a.dataset.internal = '';
      a.dataset.cursor = 'OPEN ▸';
      a.style.setProperty('--row-accent', r.accent);
      const thumb = document.createElement('span');
      thumb.className = 'fl-thumb';
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = r.thumb.w;
      img.height = r.thumb.h;
      img.src = projectAssetUrl(r.slug, 'poster.jpg');
      thumb.append(img);
      a.append(thumb, span('fl-title', softBreaks(r.title)), span('fl-meta micro', r.meta), span('fl-open micro', 'OPEN ▸'));
      const li = document.createElement('li');
      li.append(a);
      rows.append(li);
    }
    sec.append(head, rows);
    host.append(sec);
  }
}

function buildSemanticList(projects: Project[], world: WorksWorld): void {
  const ul = document.getElementById('sr-projects');
  if (!ul) return;
  ul.replaceChildren();
  for (const p of projects) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/project.html?p=${p.slug}`;
    a.textContent = `${p.title} (${p.year})${isPlaceholder(p) ? ' — placeholder' : ''}`;
    a.addEventListener('focus', () => world.focusProject(p.slug));
    li.append(a);
    ul.append(li);
  }
}
