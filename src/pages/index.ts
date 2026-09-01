import { reducedMotion } from '../lib/env';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { armGlideNav, navNeighbors } from '../lib/swipe-nav';
import { colorWord, parseHsl } from '../home/loops';
import { startPage } from '../shell/page';

let heroBurst: () => void = () => {};

startPage('home', async ({ site }) => {
  // hero first: the accent it samples from the image must land before the type reveals
  const host = document.getElementById('hero-host');
  if (host) {
    const m = await import('../home/hero');
    heroBurst = m.triggerBurst;
    await m.mountHero(host);
  }

  // the roles bar: tagline is comma-separated roles, underscored internally
  const data = document.getElementById('tagline');
  if (data) {
    data.textContent = site.tagline
      .toUpperCase()
      .split(/,\s*/)
      .map((r) => r.trim().replace(/ /g, '_'))
      .filter(Boolean)
      .join(' · ');
  }

  // touch visitors physically glide the page with their thumb — up = onward
  // to the page after HOMEPAGE in the nav. Armed BEFORE the type reveal below:
  // navigation must never wait on decoration.
  armGlideNav({
    ...navNeighbors(site.nav, location.pathname),
    onCommit: () => heroBurst(),
  });

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

  // the first word of the statement is the footage's color: every clip the
  // reel lands on re-samples an accent, and the word physically scrambles
  // into the hue's name — PURPLE was only ever the fish
  const colorRow = lines[0];
  if (colorRow) {
    const leaf = colorRow.querySelector<HTMLElement>('.gl') ?? colorRow;
    let currentWord = leaf.textContent ?? 'PURPLE';
    window.addEventListener('rvl:accent', (e) => {
      const hsl = parseHsl(String((e as CustomEvent).detail ?? ''));
      if (!hsl) return;
      const word = colorWord(hsl.h, hsl.s);
      if (word === currentWord || colorRow.dataset.busy) return;
      currentWord = word;
      colorRow.dataset.busy = '1';
      colorRow.classList.add('rip');
      void scrambleEl(leaf, word, 340).then(() => {
        colorRow.dataset.text = word; // the ghost slices follow
        delete colorRow.dataset.busy;
        setTimeout(() => colorRow.classList.remove('rip'), 140);
      });
    });
  }
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
    sound.hover();
    const clash = t.classList.contains('st-clash') ? t : null;
    clash?.classList.add('rip');
    void scrambleEl(leaf, leaf.textContent, 260).then(() => {
      delete t.dataset.busy;
      setTimeout(() => clash?.classList.remove('rip'), 140);
    });
  });

  if (reducedMotion()) return;

  // the pointer shifts the whole poster in depth — a slow chase (the CSS
  // transition is the ease), never a rotation
  let queued = false;
  window.addEventListener('pointermove', (e) => {
    if (queued) return;
    queued = true;
    const { clientX, clientY } = e;
    requestAnimationFrame(() => {
      queued = false;
      const nx = clientX / innerWidth - 0.5;
      const ny = clientY / innerHeight - 0.5;
      const s = document.body.style;
      s.setProperty('--px', `${(nx * -14).toFixed(1)}px`);
      s.setProperty('--py', `${(ny * -10).toFixed(1)}px`);
    });
  });

  // ambient jolts still hit everything — statement, chrome, nav, hud — but as
  // punctuation now, seconds apart, not a metronome
  const glitchables = [
    ...document.querySelectorAll<HTMLElement>(
      '[data-glitch], .nav-links a, .brand, .hud-bl, .hud-br, .hud-tr, .home-data, .hk-spine, .hk-ticks, .cta-prompt',
    ),
  ];
  const scheduleJolt = () => {
    setTimeout(() => {
      scheduleJolt();
      if (document.hidden || glitchables.length === 0) return;
      const el = glitchables[(Math.random() * glitchables.length) | 0];
      el.classList.add('jolt');
      if (el.classList.contains('st-clash')) el.classList.add('rip');
      setTimeout(() => { el.classList.remove('jolt'); el.classList.remove('rip'); }, 240);
    }, 4200 + Math.random() * 3600);
  };
  scheduleJolt();

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // middle/right clicks (autoscroll, menus) stay silent
    if ((e.target as Element).closest?.('a, button')) return;
    heroBurst();
    sound.drop(); // the burst stays loud on screen — the sound answers softly
  });
}
