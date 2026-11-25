import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import { loadSite, SiteContent } from '../lib/content';
import { BootTask, runBoot } from './boot';
import { Hud } from './hud';
import { music } from '../lib/music';
import { mountShell, PageKey, ShellOptions } from './shell';

export interface PageCtx { site: SiteContent; hud: Hud }

// The running text's face (Source Serif 4, owner 2026-11-25) stands on these pages' first screen or close under it,
// so their boot waits for its Latin file as it waits for the others: the text is never drawn in a stand-in face first
// and never reflows when the face arrives. Other pages never fetch it. (A film page was one of them until its
// synopsis left, owner 2026-11-25: nothing on it is set in this face now.)
const TEXT_FACE_PAGES: PageKey[] = ['about', 'contact'];

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
  opts: ShellOptions = {},
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
          ...(TEXT_FACE_PAGES.includes(active) ? [document.fonts.load('400 1rem "Source Serif 4"')] : []),
        ]),
    },
    ...extraTasks,
  ];
  // MUSIC (owner: one track on every page, continuous, never restarting; a loading screen never cuts it): it starts
  // here, before the boot screen, where the last page left it; its place is saved as the page goes
  music.init();
  window.addEventListener('pagehide', () => music.save());
  runBoot(tasks)
    .then(async () => {
      const site = await loadSite();
      const { hud } = mountShell(site, active, opts);
      await main({ site, hud });
      try { sessionStorage.removeItem('rvl-heal'); } catch { /* ok */ }
    })
    .catch((e: unknown) => {
      console.error('[revachol] boot failed', e);
      heal(); // a failed loader stays memoized-rejected — only fresh HTML heals
    });
}
