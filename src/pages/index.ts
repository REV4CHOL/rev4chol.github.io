import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

startPage('home', ({ site }) => {
  const tagline = document.getElementById('tagline');
  if (tagline) tagline.textContent = `${site.tagline} // SECTION UNDER CONSTRUCTION`.toUpperCase();
  const st = document.getElementById('statement');
  if (st) void scrambleEl(st);
});
