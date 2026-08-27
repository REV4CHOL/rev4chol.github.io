import type { SiteContent } from '../lib/content';
import { isMobile } from '../lib/env';
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

  // zoom-fixed chrome: browser zoom shrinks/grows CSS pixels, so the shell UI
  // counter-scales to hold its apparent size (--uiz feeds the CSS calcs).
  // outerWidth is in OS pixels and zoom-invariant; innerWidth is CSS pixels.
  const applyUiScale = () => {
    if (isMobile()) {
      // phones pinch the visual viewport, never the CSS pixel — and their
      // outer/innerWidth ratio is unreliable; the chrome stays 1:1
      document.documentElement.style.setProperty('--uiz', '1');
      return;
    }
    const z = window.outerWidth > 0 && window.innerWidth > 0
      ? window.outerWidth / window.innerWidth
      : 1;
    let m = 1 / z;
    if (Math.abs(m - 1) < 0.08) m = 1; // window borders jitter the ratio at 100%
    m = Math.min(4, Math.max(0.25, m)); // covers Chrome's full 25%–400% zoom range
    document.documentElement.style.setProperty('--uiz', String(+m.toFixed(3)));
  };
  applyUiScale();
  window.addEventListener('resize', applyUiScale);

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
