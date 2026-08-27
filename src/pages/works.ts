import { loadProjects, projectAssetUrl } from '../lib/content';
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
