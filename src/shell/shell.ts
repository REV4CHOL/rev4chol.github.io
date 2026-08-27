import type { SiteContent } from '../lib/content';
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
  brand.innerHTML = `${site.name}<em>.</em>`;

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

  // First-gesture unlock for WebAudio; hover blips on interactives.
  const unlock = () => {
    sound.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('pointerover', (e) => {
    if ((e.target as Element).closest?.('a, button')) sound.hover();
  });

  return { hud };
}
