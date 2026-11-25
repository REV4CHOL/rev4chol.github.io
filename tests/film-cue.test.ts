import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cueKicker, cueState, pageCueWords } from '../src/lib/swipe-nav';

// A FILM PAGE'S FIRST SCREEN SAYS THERE IS MORE BELOW (the review's walkthroughs, 2026-11-25: first-time visitors waited
// on the full-screen picture and the title for the film to play; nothing said it stands further down). Shown the
// picture, the owner chose: "SCROLL DOWN cue: show the same small SCROLL DOWN cue that ABOUT already has at the foot of
// the screen. No new words."
const swipe = readFileSync('src/lib/swipe-nav.ts', 'utf8');
const page = readFileSync('src/pages/project.ts', 'utf8');
const armer = swipe.slice(swipe.indexOf('export function armScrollCue'), swipe.indexOf('export function armGlideNav'));

describe("a film page's scroll cue", () => {
  it("says what ABOUT says at its top: the gesture to a mouse, the dipping mark alone on a touch screen", () => {
    expect(pageCueWords(true)).toBe(cueKicker(true));
    expect(pageCueWords(true)).toBe('SCROLL DOWN ▾');
    expect(pageCueWords(false)).toBeNull();
  });

  it('is never the NEXT PAGE cue: a film page leads to no next page', () => {
    expect(pageCueWords(false)).not.toBe('NEXT PAGE');
    expect(armer).toContain('cueState(false, ');
    expect(armer).not.toContain('href');
    expect(armer).not.toContain('data-internal');
    expect(armer).not.toContain('swc-label');
  });

  it('shows while the first screen is in view and is gone once the visitor has scrolled', () => {
    expect(cueState(false, 0)).toBe('scroll');
    expect(cueState(false, 41)).toBe('hidden');
    expect(armer).toContain("window.addEventListener('scroll', sync, { passive: true });");
    // (a press on it scrolls a screen on, as ABOUT's does)
    expect(armer).toContain('window.scrollBy({ top: window.innerHeight * 0.85');
  });

  it("is ABOUT's own cue: the same element and class, so the same place, size and halo", () => {
    expect(armer).toContain("cue.className = 'swipe-cue';");
    expect(armer).toContain("chevron.className = 'swc-chevron';");
    expect(armer).toContain("kicker.className = 'swc-kicker';");
  });

  it('the film page arms it once its dossier stands, not on SIGNAL LOST, and arms no glide to another page', () => {
    const render = page.slice(page.indexOf('function render('), page.indexOf('/* ---------------------------------------------------------------- hero -- */'));
    expect(render).toContain('armScrollCue()');
    const lost = page.slice(page.indexOf('function renderNotFound('), page.indexOf('function render('));
    expect(lost).not.toContain('armScrollCue');
    expect(page).not.toContain('armGlideNav');
  });
});
