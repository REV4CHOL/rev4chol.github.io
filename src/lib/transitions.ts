import gsap from 'gsap';
import { reducedMotion } from './env';
import { sound } from './sound';

const SLICES = 7;
let wipeEl: HTMLDivElement | null = null;
let leaving = false;

function ensureWipe(): HTMLDivElement {
  if (wipeEl) return wipeEl;
  wipeEl = document.createElement('div');
  wipeEl.id = 'wipe';
  for (let i = 0; i < SLICES; i++) {
    const s = document.createElement('div');
    s.className = 'wipe-slice';
    s.style.top = `${(i * 100) / SLICES}%`;
    s.style.height = `${100 / SLICES + 0.5}%`;
    wipeEl.append(s);
  }
  document.body.append(wipeEl);
  gsap.set(wipeEl.querySelectorAll('.wipe-slice'), { xPercent: -101 });
  return wipeEl;
}

export function leaveTo(href: string): void {
  if (leaving) return;
  leaving = true;
  const wipe = ensureWipe();
  const slices = wipe.querySelectorAll('.wipe-slice');
  sound.whoosh();
  if (reducedMotion()) {
    gsap.set(slices, { xPercent: 0 });
    gsap.fromTo(wipe, { opacity: 0 }, { opacity: 1, duration: 0.2, onComplete: () => { location.href = href; } });
    return;
  }
  gsap.to(slices, {
    xPercent: 0,
    duration: 0.3,
    stagger: 0.035,
    ease: 'power3.in',
    onComplete: () => { location.href = href; },
  });
}

export function initTransitions(): void {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a[data-internal]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    e.preventDefault();
    sound.click();
    leaveTo(href);
  });
  // Back/forward cache restore: uncover the page again.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && wipeEl) {
      leaving = false;
      wipeEl.style.opacity = '';
      gsap.set(wipeEl.querySelectorAll('.wipe-slice'), { xPercent: -101 });
    }
  });
}
