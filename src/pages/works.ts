import { loadProjects, projectAssetUrl, type Project } from '../lib/content';
import { reducedMotion } from '../lib/env';
import { sound } from '../lib/sound';
import { startPage } from '../shell/page';
import { CHANNELS, ChannelKey, channelFromSearch, channelProjects } from '../works/channels';
import { mountWorksOverlay } from '../works/overlay';
import { WorksWorld } from '../works/world';

startPage(
  'work',
  async ({ hud }) => {
    const projects = await loadProjects();
    mountWorksOverlay();
    const host = document.getElementById('floor')!;

    let world: WorksWorld | null = null;
    let active: ChannelKey = channelFromSearch(location.search);
    let flipping = false;

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
      b.innerHTML = `<span class="ch-idx micro">${ch.index}</span><span class="ch-name"><span class="ch-mark"></span>${ch.name}</span>`;
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
      sound.zap();
      staticEl.classList.add('on');
      // let the static cover the swap: destroy behind it, mount, then lift
      await new Promise((r) => setTimeout(r, reducedMotion() ? 60 : 160));
      world?.destroy();
      world = null;
      await mount(key);
      await new Promise((r) => setTimeout(r, reducedMotion() ? 60 : 200));
      staticEl.classList.remove('on');
      flipping = false;
    };

    paint();
    await mount(active);
    sound.onUnlock(() => sound.startHum());

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
