import type { SiteContent } from '../lib/content';
import { escapeHtml } from '../lib/escape';
import { sound } from '../lib/sound';
import { initTransitions } from '../lib/transitions';
import { initCursor } from './cursor';
import { mountAtmosphere } from './grain';
import { Hud, mountHud } from './hud';

export type PageKey = 'home' | 'work' | 'about' | 'contact' | 'project';
export interface ShellRefs { hud: Hud }

const HREF_FOR: Record<PageKey, string> = {
  home: '/index.html',
  work: '/works.html',
  about: '/about.html',
  contact: '/contact.html',
  project: '/works.html', // project pages highlight WORK
};

export function mountShell(site: SiteContent, active: PageKey): ShellRefs {
  const header = document.createElement('header');
  header.className = 'nav';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = '/index.html';
  brand.dataset.internal = '';
  brand.innerHTML = `${escapeHtml(site.name)}<em>.</em>`;

  const links = document.createElement('nav');
  links.className = 'nav-links';
  links.setAttribute('aria-label', 'Main');
  for (const item of site.nav) {
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    a.dataset.internal = '';
    if (item.href === HREF_FOR[active]) a.classList.add('is-active');
    links.append(a);
  }
  header.append(brand, links);
  document.body.prepend(header);

  mountAtmosphere();
  initTransitions();
  initCursor();
  const hud = mountHud();

  // Zoom compensation RETIRED by owner decree: the outer/innerWidth probe was
  // unreliable (devtools, OS scaling, browser chrome all skew it) and the
  // per-surface counter-scaling it fed tore layouts apart at any zoom other
  // than 100%. The site now zooms like any normal page — a uniform magnification
  // of the 100% design. --uiz stays pinned at 1 so every calc(... * var(--uiz))
  // in the stylesheets degrades to its base value, and --zw becomes plain 1vw.
  document.documentElement.style.setProperty('--uiz', '1');

  // WebAudio: the engine handles activation itself (same-origin navigations
  // propagate the gesture, so sound flows page to page); hover blips on
  // interactives.
  sound.init();
  // the room tone runs site-wide: the site is audible from the earliest
  // moment the browser permits (first gesture, or activation carried over
  // from a same-origin navigation)
  sound.onUnlock(() => sound.startHum());
  document.addEventListener('pointerover', (e) => {
    if ((e.target as Element).closest?.('a, button')) sound.hover();
  });

  return { hud };
}
