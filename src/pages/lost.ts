import { armPosterLock } from '../lib/poster-lock';
import { startPage } from '../shell/page';
import '../styles/lost.css';

// THE SITE'S OWN "NOT FOUND" (404.html; the review's walkthroughs, 2026-11-25: an address that does not exist showed
// the host's own white page, 980 px wide on a phone, with no way back). GitHub Pages serves this page for ANY unknown
// address, at any depth, so everything it names is an absolute address. It is not a page of the menu's stack: no
// glide and no cue, and no film is looked up.
startPage('lost', () => {
  armPosterLock();
});
