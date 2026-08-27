import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import { loadSite, SiteContent } from '../lib/content';
import { BootTask, runBoot } from './boot';
import { Hud } from './hud';
import { mountShell, PageKey } from './shell';

export interface PageCtx { site: SiteContent; hud: Hud }

export function startPage(
  active: PageKey,
  main: (ctx: PageCtx) => void | Promise<void>,
  extraTasks: BootTask[] = [],
): void {
  const tasks: BootTask[] = [
    { label: 'LOAD SITE MANIFEST', run: () => loadSite() },
    {
      label: 'MOUNT TYPEFACES',
      run: () =>
        Promise.allSettled([
          document.fonts.load('700 1rem "Clash Display"'),
          document.fonts.load('400 1rem "Bodoni Moda"'),
          document.fonts.load('400 1rem "Geist Mono"'),
          document.fonts.load('400 1rem "Martian Mono"'),
        ]),
    },
    ...extraTasks,
  ];
  runBoot(tasks)
    .then(async () => {
      const site = await loadSite();
      const { hud } = mountShell(site, active);
      await main({ site, hud });
    })
    .catch((e: unknown) => console.error('[revachol] boot failed', e));
}
