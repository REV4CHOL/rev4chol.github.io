import { loadProjects } from '../lib/content';
import { startPage } from '../shell/page';

startPage(
  'work',
  async ({ hud }) => {
    const projects = await loadProjects();
    hud.setCount(projects.length);
  },
  [{ label: 'LOAD PROJECT INDEX', run: () => loadProjects() }],
);
