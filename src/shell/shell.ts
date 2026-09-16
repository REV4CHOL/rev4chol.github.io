import type { SiteContent } from '../lib/content';
import { escapeHtml } from '../lib/escape';
import { music } from '../lib/music';
import { sound } from '../lib/sound';
import { initTransitions } from '../lib/transitions';
import { initCursor } from './cursor';
import { mountAtmosphere } from './grain';
import { Hud, mountHud } from './hud';

export type PageKey = 'home' | 'work' | 'about' | 'contact' | 'story' | 'project';
export interface ShellRefs { hud: Hud }

const HREF_FOR: Record<PageKey, string> = {
  home: '/index.html',
  work: '/works.html',
  about: '/about.html',
  contact: '/contact.html',
  story: '/story.html',
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
  // MUSIC (owner): started in page.ts ahead of the boot screen; a cold load plays at the first gesture, wired here.
  // (The ambient room tone is gone: owner.)
  for (const ev of ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend']) document.addEventListener(ev, () => music.gesture(), { passive: true }); // (pointerup, click: iOS grants sound inside these, not a pointerdown)
  document.addEventListener('pointerover', (e) => {
    if ((e.target as Element).closest?.('a, button')) sound.hover();
  });

  return { hud };
}
