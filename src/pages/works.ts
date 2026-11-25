import gsap from 'gsap';
import { isPlaceholder, loadFloor, loadLoopManifest, loadProjects, projectAssetUrl, type Project } from '../lib/content';
import { finePointer, reducedMotion, touchLayout } from '../lib/env';
import { fillCrossed } from '../lib/cross';
import { softBreaks } from '../lib/escape';
import { settleAll, titleSpan } from '../lib/title';
import { armPosterLock, NARROW_EVENT, posterZoom } from '../lib/poster-lock';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { startPage } from '../shell/page';
import { CHANNELS, ChannelKey, channelFromSearch, channelProjects } from '../works/channels';
import { entryOf, listStartTop, restoredTop, returning, viewOnLoad, wallByBack } from '../works/back-state';
import { chapterTabLabel, listGroups, searchForView, toggleText, type WorkView } from '../works/index-list';
import { floorOpened, legendText } from '../works/legend';
import { listPointer, listTight } from '../works/list-art';
import { mountWorksOverlay } from '../works/overlay';
import { REEL_QUERY } from '../works/reel';
import { mountReel, type Reel } from '../works/reel-view';
import { WorksWorld } from '../works/world';

startPage(
  'work',
  async ({ hud }) => {
    // the DOM chrome (nav, HUD, switcher, ident, label, corner marks) is a
    // fixed 1440px plate; the FLOOR is exempt — panes and background keep
    // their true full-viewport world, untouched by the lock
    armPosterLock({ exempt: '#floor', narrow: true });
    // WORK ON A PHONE (owner, 2026-10-20: "on Phone, its completely overwhelming and disorienting … a complete redesign
    // … specifically for Phones"): the reel (works/reel.ts), decided once as the page loads; a phone builds no floor
    const reelOn = window.matchMedia(REEL_QUERY).matches;
    // (and it sounds only when something is pressed, never as a finger swipes: owner, 2026-10-20, "I prefer the only SFX
    // is when pressing any text or buttons in the work section. No SFX when scrolling pls its too much", then "that
    // quiet only go with PHONE" — the floor on a tablet or a desktop keeps its blips)
    if (reelOn) document.body.dataset.sfx = 'press';
    // A LAPTOP'S LIST (owner, 2026-11-24; works/list-art.ts columnFor): under a 1,792 plate THE LIST's column narrows,
    // each row its name over its details, so the side machines fit. Set here, the plate and the pointer known and the
    // list not yet drawn, from the plate alone (never the tier: one device, one layout); a monitor hop sets it again.
    // A TABLET'S LIST (owner, of THE LIST on an iPad: "The film list does not have the animations appear"): a touch
    // screen held on its side narrows the same way on its own screen, down to a narrower column (`rvl-list-touch`)
    const tight = () => {
      const pointer = listPointer(!touchLayout(), reelOn); // (a narrow PC window lays THE LIST out as a tablet does)
      const on = listTight(window.innerWidth / posterZoom(), pointer);
      document.documentElement.classList.toggle('rvl-list-tight', on);
      document.documentElement.classList.toggle('rvl-list-touch', on && pointer === 'touch');
    };
    tight();
    window.addEventListener('resize', tight);
    const projects = await loadProjects();
    const floor = reelOn ? [] : await loadFloor(); // the films AND the held places, in json order
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
      // a touch screen's legend is set in pieces (one per ▪, which stays with the piece before it) so a tablet too
      // narrow for one line breaks between them (components.css); the pieces and the spaces between join back to the
      // same words. A fine pointer's legend stays one text (its measure is the lock's, to the pixel). A narrow PC window
      // (owner, 2026-11-25: "Tablet layout") takes a tablet's pieces with a mouse's words, again whenever it crosses the
      // floor (lib/window-fit.ts)
      const fillLegend = () => {
        const legend = legendText(finePointer());
        if (!touchLayout()) { words.textContent = legend; return; }
        words.replaceChildren();
        const pieces = legend.split(' ▪ ');
        pieces.forEach((s, i) => {
          const seg = document.createElement('span');
          seg.className = 'fh-seg';
          seg.textContent = i < pieces.length - 1 ? s + ' ▪' : s;
          words.append(seg, i < pieces.length - 1 ? ' ' : '');
        });
      };
      fillLegend();
      window.addEventListener(NARROW_EVENT, fillLegend);
      hint.replaceChildren(words, toggle);
      let opened = false;
      try { opened = floorOpened(localStorage); } catch { /* no storage: stays lit */ }
      hint.classList.toggle('is-fresh', !opened);
    }
    const host = document.getElementById('floor')!;

    let world: WorksWorld | null = null;
    let reel: Reel | null = null;
    let active: ChannelKey = channelFromSearch(location.search);
    let flipping = false;

    // THE TWO VIEWS: the floor, or the list. The address decides first, then what this history entry showed, then what
    // this visit chose (works/back-state.ts: the list has an entry of its own, so the browser's Back returns to the wall)
    const VIEW_KEY = 'rvl-work-view';
    let remembered: string | null = null;
    try { remembered = sessionStorage.getItem(VIEW_KEY); } catch { /* no storage: the address alone decides */ }
    /** this entry's state, the patch merged in; its address kept unless given */
    const stamp = (patch: Record<string, unknown>, url: string = location.href) => {
      const s = history.state && typeof history.state === 'object' ? history.state as Record<string, unknown> : {};
      try { history.replaceState({ ...s, ...patch }, '', url); } catch { /* (a browser that refuses: the address alone) */ }
    };
    let view: WorkView = viewOnLoad(location.search, entryOf(history.state), remembered);
    stamp({ view });
    const main = document.getElementById('app')!;
    main.classList.toggle('is-reel', reelOn);
    document.documentElement.classList.toggle('rvl-reel', reelOn);
    const listEl = document.getElementById('film-list')!;
    buildFilmList(listEl, projects);
    // THE LIST'S CITY AND ITS MACHINES (works/list-deco.ts): loaded the first time the list opens, painted while it shows
    let deco: { start(): void; stop(): void } | null = null, decoWanted = false, decoLoading = false;
    const listDeco = (on: boolean) => {
      decoWanted = on;
      if (deco) { if (on) deco.start(); else deco.stop(); return; }
      if (!on || decoLoading) return;
      decoLoading = true;
      import('../works/list-deco').then(({ mountListDeco }) => {
        const films = [...listEl.querySelectorAll('.fl-row')]
          .map((a) => projects.find((p) => p.slug === a.getAttribute('href')?.match(/[?&]p=([a-z0-9-]+)/)?.[1]))
          .filter((p): p is Project => !!p)
          .map((p) => ({ slug: p.slug, title: p.title, accent: p.accent, aspect: p.aspect }));
        deco = mountListDeco(listEl, films);
        if (decoWanted) deco.start();
      }).catch(() => { /* the list stands on its own black */ });
    };
    const setView = (v: WorkView, byHand = false) => {
      view = v;
      main.classList.toggle('is-list', v === 'list');
      listEl.hidden = v !== 'list';
      if (v === 'list') settleAll(listEl); // (a two-language name's lockup measures itself once it shows: lib/title.ts)
      listDeco(v === 'list');
      document.getElementById('sr-projects')?.toggleAttribute('hidden', v === 'list'); // (the list says it all)
      toggle.textContent = toggleText(v, projects.length, reelOn);
      toggle.dataset.cursor = v === 'list' ? 'FILM WALL ◂' : 'LIST ▸';
      if (v === 'list') world?.pause();
      else world?.resume();
      reel?.park(v === 'list');
      hud.setCount(v === 'list' ? projects.length : channelProjects(projects, active).length);
      try { sessionStorage.setItem(VIEW_KEY, v); } catch { /* no storage */ }
      if (!byHand) return;
      const url = searchForView(location.search, v) || location.pathname;
      if (v === 'list') {
        // the list by hand: an entry of its own, the wall's entry left behind it as the wall
        stamp({ view: 'floor' });
        try { history.pushState({ view: 'list', pushed: true }, '', url); } catch { stamp({ view: v }, url); }
      } else stamp({ view: v, pushed: false }, url);
      sound.click();
      if (v === 'list') {
        // by hand: at the top, or from a later chapter at that chapter's heading (works/back-state.ts)
        listEl.scrollTop = listStartTop(active, [...listEl.querySelectorAll<HTMLElement>('.fl-group')]
          .map((g) => ({ key: g.dataset.ch as ChannelKey, top: g.offsetTop })));
        listEl.focus({ preventScroll: true }); // (the arrow keys and the space bar scroll the list from here)
      }
    };
    // THE LIST'S PLACE (works/back-state.ts): the row opened (or the first in view once the scroll rests) and its height
    // in the list's view, kept in this entry, so a Back from a film finds the list where it was left
    /** a row's top in the list's content, in the scroller's own px (its offsets up to the list, which is positioned) */
    const rowTopIn = (row: HTMLElement): number => {
      let y = 0, e: HTMLElement | null = row;
      while (e && e !== listEl) { y += e.offsetTop; e = e.offsetParent as HTMLElement | null; }
      return e === listEl ? y : Number.NaN;
    };
    const rows = () => [...listEl.querySelectorAll<HTMLElement>('.fl-row')];
    let placeT = 0;
    const keepPlace = (row?: HTMLElement) => {
      clearTimeout(placeT);
      if (view !== 'list') return;
      const top = listEl.scrollTop;
      const r = row ?? rows().find((a) => rowTopIn(a) + a.offsetHeight > top);
      const href = r?.getAttribute('href');
      if (r && href) stamp({ row: href, rowAt: rowTopIn(r) - top });
    };
    listEl.addEventListener('click', (e) => {
      const row = (e.target as Element).closest?.<HTMLElement>('.fl-row');
      if (row) keepPlace(row);
    });
    listEl.addEventListener('scroll', () => {
      clearTimeout(placeT);
      placeT = window.setTimeout(() => keepPlace(), 250);
    }, { passive: true });
    /** the list stood where this entry left it: true when a place was found and set */
    const placeBack = (): boolean => {
      const e = entryOf(history.state);
      if (!e.row || e.rowAt === undefined) return false;
      const row = rows().find((a) => a.getAttribute('href') === e.row);
      if (!row) return false;
      listEl.scrollTop = restoredTop(rowTopIn(row), e.rowAt, listEl.scrollHeight - listEl.clientHeight);
      return true;
    };

    // "back to the wall" from a list the toggle opened goes back in history (one Back later must not show the list
    // again); the browser's own Back and Forward come here as popstate, the entry saying which view it shows
    let goingBack = false;
    toggle.addEventListener('click', () => {
      if (view === 'list' && wallByBack(entryOf(history.state))) {
        if (goingBack) return; // (a second press before the first lands would leave WORK)
        goingBack = true;
        window.setTimeout(() => { goingBack = false; }, 1500);
        sound.click();
        history.back();
        return;
      }
      setView(view === 'list' ? 'floor' : 'list', true);
    });
    window.addEventListener('popstate', () => {
      goingBack = false;
      const v = viewOnLoad(location.search, entryOf(history.state), null);
      if (v !== view) setView(v); // (and the visit's memory follows: setView writes it)
    });
    (window as unknown as { rvlGsap: typeof gsap }).rvlGsap = gsap; // debug handle for verification

    const mount = async (key: ChannelKey) => {
      const list = channelProjects(projects, key);
      hud.setCount(list.length); // films only — a held place is not a project
      world = await WorksWorld.create(host, channelProjects(floor, key), {
        onCoords: (x, y) => hud.setCoords(x, y),
      }, key);
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
      history.replaceState(history.state, '', `?ch=${key}`); // (the entry keeps what it shows: works/back-state.ts)
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
      if (reel) {
        // the reel: the other chapter's strip under the static, from its first film
        await new Promise((r) => setTimeout(r, reducedMotion() ? 60 : 240));
        reel.tune(key);
        hud.setCount(channelProjects(projects, key).length);
      } else {
        // the whole world leaves physically — panes, furniture and lattice
        // tearing off along the floor's grain under the misregistration rig
        world?.unhover();
        await world?.exit();
        world?.destroy();
        world = null;
        await mount(key);
        world!.arrive();
      }
      await new Promise((r) => setTimeout(r, reducedMotion() ? 80 : 380));
      staticEl.classList.remove('on');
      flipping = false;
    };

    paint();
    // a Back to the strip: the place it was left on (works/back-state.ts); a fresh visit arrives at film 1 as designed
    const navType = (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
    const reelBack = returning(navType) ? entryOf(history.state).reel : null;
    if (reelOn) {
      reel = mountReel(main, projects, { active, onTune: (key) => void flip(key), onAll: () => setView('list', true), start: reelBack, onOpen: (place) => stamp({ reel: place }) });
      hud.setCount(channelProjects(projects, active).length);
    } else await mount(active);
    setView(view);
    // a Back (or Forward) to the list: the place it was left; set again once the faces have laid it out, unless the
    // visitor has moved it meanwhile. A fresh visit or a reload starts at the top.
    if (view === 'list' && returning(navType) && placeBack()) {
      let set = listEl.scrollTop;
      const again = () => { if (listEl.scrollTop === set && placeBack()) set = listEl.scrollTop; };
      requestAnimationFrame(() => requestAnimationFrame(again));
      void document.fonts?.ready.then(again);
    }

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
    sec.dataset.ch = g.key;
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
      a.append(thumb, titleSpan('fl-title', r.title, softBreaks), fillCrossed(span('fl-meta micro', ''), r.meta), span('fl-open micro', 'OPEN ▸'));
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
