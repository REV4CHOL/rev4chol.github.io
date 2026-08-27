import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

startPage('contact', ({ site }) => {
  const el = document.getElementById('contact-email');
  if (el && site.email) {
    el.innerHTML = `<a href="mailto:${site.email}" style="color: var(--accent)">${site.email}</a>`;
  }
  const st = document.getElementById('statement');
  if (st) void scrambleEl(st);
});
