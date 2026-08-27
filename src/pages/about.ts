import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

startPage('about', () => {
  const st = document.getElementById('statement');
  if (st) void scrambleEl(st);
});
