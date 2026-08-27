import { loadProjects, projectAssetUrl, type Project } from '../lib/content';
import { sound } from '../lib/sound';
import { startPage } from '../shell/page';
import { WorksWorld } from '../works/world';

startPage(
  'work',
  async ({ hud }) => {
    const projects = await loadProjects();
    hud.setCount(projects.length);
    const host = document.getElementById('floor')!;
    const world = await WorksWorld.create(host, projects, {
      onCoords: (x, y) => hud.setCoords(x, y),
    });
    sound.onUnlock(() => sound.startHum());
    (window as unknown as { rvlWorld: WorksWorld }).rvlWorld = world; // debug handle for verification

    buildSemanticList(projects, world);
    window.addEventListener('keydown', (e) => {
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
