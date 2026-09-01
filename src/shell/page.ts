import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import { loadSite, SiteContent } from '../lib/content';
import { BootTask, runBoot } from './boot';
import { Hud } from './hud';
import { mountShell, PageKey } from './shell';

export interface PageCtx { site: SiteContent; hud: Hud }

// STALE-DEPLOY SELF-HEAL. Every deploy renames the hashed chunks; a device
// holding cached HTML (Pages caches everything ~10 min) then 404s its
// modules and the page dies half-mounted — the visitor sees black + chrome
// and leaves. Reaching this line proves the module graph loaded, so flag it
// for the inline watchdog in each page's <head>; if boot still fails (a
// flaky first fetch, a stale dynamic chunk), reload ONCE for fresh HTML —
// the sessionStorage guard stops any loop, and a successful boot clears it.
(window as unknown as { rvlBooted?: boolean }).rvlBooted = true;

function heal(): void {
  try {
    if (sessionStorage.getItem('rvl-heal')) return; // one attempt per break
    sessionStorage.setItem('rvl-heal', '1');
  } catch {
    return; // no storage = no loop guard = no auto-reload
  }
  location.reload();
}

// vite emits this when a dynamically imported chunk 404s (the homepage's
// hero module is one) — same disease, same cure
window.addEventListener('vite:preloadError', heal);

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
      try { sessionStorage.removeItem('rvl-heal'); } catch { /* ok */ }
    })
    .catch((e: unknown) => {
      console.error('[revachol] boot failed', e);
      heal(); // a failed loader stays memoized-rejected — only fresh HTML heals
    });
}
