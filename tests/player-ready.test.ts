import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { startedByFocus, startsPlay } from '../src/project/parts';

// The owner, 2026-11-24: "Also across all platforms, I want to abolish the WATCH button. Instead, I want the video to be
// already there ready to play, with its thumbnail displaying". A film with a link now stands as its real player under
// the synopsis from the start, not started, showing the platform's own thumbnail and play control: one press plays it,
// on a phone and a tablet too (a frame made by a press could not start with sound on an iPhone or an iPad, which would
// cost a second tap).

const html = readFileSync('project.html', 'utf8');
const page = readFileSync('src/pages/project.ts', 'utf8').replace(/\r\n/g, '\n');
const css = readFileSync('src/styles/project.css', 'utf8').replace(/\r\n/g, '\n');

describe('no WATCH button, anywhere', () => {
  it('the page, its script and its styles carry none', () => {
    for (const s of ['p-watch-btn', 'WATCH ▸', 'p-run']) expect(html, s).not.toContain(s);
    expect(page).not.toContain('p-watch-btn');
    expect(css).not.toMatch(/\.p-run\b/);
  });

  it("the owner's guide speaks of the player, not of a button", () => {
    const guide = readFileSync('HOW-TO-EDIT.md', 'utf8');
    expect(guide).not.toContain('WATCH button');
    expect(guide).not.toMatch(/\bWATCH\b(?! ONLINE)/);
  });
});

describe('the film stands ready to play from the start', () => {
  it('the real player is in the page, not started, and talks back to this page', () => {
    expect(page).toContain('embedSrc(film, { autoplay: false, origin: location.origin })');
    expect(page).not.toMatch(/embedSrc\(p\.film!?\)/);
    expect(page).not.toContain('autoplay: i === 0');
  });

  // measured: the browser's lazy loading alone asked for the frames 150-250 ms before the hero's first frame, on every
  // screen; the address is now held until the hero shows (or fails), the player nears the screen, a hero press, or 4 s
  it("it loads after the hero, lazily, its place kept from the start by the player's shape", () => {
    expect(page).toContain('f.dataset.src = src;');
    expect(page).toMatch(/for \(const ev of \['playing', 'error'\]\) heroVideo\.addEventListener\(ev, wake, \{ once: true \}\);/);
    expect(page).toContain('setTimeout(wake, 4000);');
    expect(page).toContain("if (f.loading !== 'eager') f.loading = 'lazy';");
    expect(page.indexOf("f.loading = 'lazy';")).toBeLessThan(page.indexOf('f.src = src;')); // (a frame given its src first starts loading at once)
    expect(css).toMatch(/\.p-player iframe, \.p-player video \{[^}]*aspect-ratio: var\(--player-ratio, 16 \/ 9\);/);
    expect(page).toContain('player.hidden = false;');
  });

  it("a film of the owner's own file shows its poster and waits too", () => {
    expect(page).toContain("v.poster = projectAssetUrl(p.slug, 'poster.jpg');");
    expect(page).not.toContain('if (i === 0) void v.play()');
  });
});

describe('the music gives way when the film starts', () => {
  it("a player that talks says so itself: playing (1) or buffering towards it (3) is the start", () => {
    expect(startsPlay(1)).toBe(true);
    expect(startsPlay(3)).toBe(true);
    for (const s of [-1, 0, 2, 5, null]) expect(startsPlay(s)).toBe(false);
  });

  it('a press inside a frame that never talks: the window hands its focus to that frame', () => {
    const a = { id: 'a' }, b = { id: 'b' };
    expect(startedByFocus(a, [a, b], () => false)).toBe(true);
    expect(startedByFocus(a, [a, b], () => true)).toBe(false); // (it talks: its own state says when it plays)
    expect(startedByFocus({ id: 'c' }, [a, b], () => false)).toBe(false);
    expect(startedByFocus(null, [a], () => false)).toBe(false);
  });

  it('the start holds the music, once, as WATCH did', () => {
    expect(page).toContain('linkParts(talking, { onPlay: start })');
    expect(page).toMatch(/const start = \(\) => \{\s*if \(started\) return;\s*started = true;\s*music\.hold\(\);/);
    expect(page).toContain("window.addEventListener('blur', ");
  });
});

describe('a film whose link is on its way', () => {
  it('one quiet line where the player would stand, in the private line\'s style', () => {
    expect(page).toContain("note.textContent = 'FILM LINK COMING SOON';");
    expect(page).not.toContain('.disabled = true');
    expect(css).toContain('.p-placeholder, .p-private, .p-pending {');
  });
});

describe('the hero still plays the film, and carries no button', () => {
  it('a press brings the player into view and asks it to play', () => {
    expect(page).toContain("if (!(e.target as Element).closest('a, button')) open();");
    expect(page).toContain('programme.play();');
  });
});
