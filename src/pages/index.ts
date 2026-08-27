import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

startPage('home', async ({ site }) => {
  const tagline = document.getElementById('tagline');
  if (tagline) tagline.textContent = site.tagline.toUpperCase();

  // hero first so the accent it samples from the image lands before the type reveals
  const host = document.getElementById('hero-host');
  if (host) {
    const { mountHero } = await import('../home/hero');
    await mountHero(host);
  }

  // the Clash lines scramble in; the slice ghost (::after reads data-text)
  // only appears once each line has resolved
  const lines = [...document.querySelectorAll<HTMLElement>('.st-clash')];
  await Promise.all(
    lines.map(async (el, i) => {
      const target = el.textContent ?? '';
      await new Promise((r) => setTimeout(r, i * 140));
      await scrambleEl(el, target, 560);
      el.dataset.text = target;
    }),
  );
  document.querySelector('.home-main')?.classList.add('is-revealed');
});
