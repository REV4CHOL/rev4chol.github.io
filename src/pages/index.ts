import { reducedMotion } from '../lib/env';
import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

let heroBurst: () => void = () => {};

startPage('home', async ({ site }) => {
  // hero first: the accent it samples from the image must land before the type reveals
  const host = document.getElementById('hero-host');
  let heroSrc: string | null = null;
  let heroAccent: string | null = null;
  if (host) {
    const m = await import('../home/hero');
    heroBurst = m.triggerBurst;
    const info = await m.mountHero(host);
    if (info) { heroSrc = info.src; heroAccent = info.accent; }
  }

  // live data readout: the adaptive contract, printed on the page
  const data = document.getElementById('tagline');
  if (data) {
    data.textContent = [
      site.tagline.toUpperCase().replace(/ /g, '_'),
      `IMG//${heroSrc ? heroSrc.split('/').pop() : 'NONE'}`,
      `ACC//${heroAccent ?? 'DEFAULT'}`,
    ].join(' · ');
  }

  // the Clash layers scramble in; each ghost (::after reads data-text) arms
  // only once its line has resolved
  const lines = [...document.querySelectorAll<HTMLElement>('.st-clash')];
  await Promise.all(
    lines.map(async (el, i) => {
      const g = el.querySelector<HTMLElement>('.gl') ?? el;
      const target = g.textContent ?? '';
      await new Promise((r) => setTimeout(r, i * 150));
      await scrambleEl(g, target, 520);
      el.dataset.text = target;
    }),
  );
  document.querySelector('.home-main')?.classList.add('is-revealed');
  initHomeEffects();
});

/** Every text reacts, the room reacts: hover scrambles any [data-glitch],
 *  ambient jolts keep the chrome alive, clicking the void fires a datamosh
 *  burst on the hero. All of it stands down under reduced motion. */
function initHomeEffects(): void {
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest?.('[data-glitch]') as HTMLElement | null;
    if (!t || t.dataset.busy) return;
    const leaf = t.querySelector<HTMLElement>('.gl') ?? t;
    if (!leaf.textContent) return;
    t.dataset.busy = '1';
    const clash = t.classList.contains('st-clash') ? t : null;
    clash?.classList.add('rip');
    void scrambleEl(leaf, leaf.textContent, 260).then(() => {
      delete t.dataset.busy;
      setTimeout(() => clash?.classList.remove('rip'), 140);
    });
  });

  if (reducedMotion()) return;

  // the pointer steers the whole poster in 3D
  let tiltQueued = false;
  window.addEventListener('pointermove', (e) => {
    if (tiltQueued) return;
    tiltQueued = true;
    const { clientX, clientY } = e;
    requestAnimationFrame(() => {
      tiltQueued = false;
      const nx = clientX / innerWidth - 0.5;
      const ny = clientY / innerHeight - 0.5;
      const s = document.body.style;
      s.setProperty('--rx', `${(nx * 7).toFixed(2)}deg`);
      s.setProperty('--ry', `${(-ny * 5).toFixed(2)}deg`);
    });
  });

  // ambient jolts hit EVERYTHING — statement, chrome, nav, hud
  const glitchables = [
    ...document.querySelectorAll<HTMLElement>(
      '[data-glitch], .nav-links a, .brand, .hud-bl, .hud-br, .hud-tr, .home-data, .hk-spine, .hk-ticks, .cta-prompt',
    ),
  ];
  setInterval(() => {
    if (document.hidden || glitchables.length === 0) return;
    const el = glitchables[(Math.random() * glitchables.length) | 0];
    el.classList.add('jolt');
    if (el.classList.contains('st-clash')) el.classList.add('rip');
    setTimeout(() => { el.classList.remove('jolt'); el.classList.remove('rip'); }, 240);
  }, 1600);

  document.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest?.('a, button')) return;
    heroBurst();
  });
}
