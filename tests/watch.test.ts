import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { playerRatio, watchKind } from '../src/project/watch';

// The owner's testers, 2026-09-30: "they dont know how to navigate the website or click or do actions, and they feel
// lost". On a film's page the one action that matters is WATCH, and it was a full screen below the picture; pressed,
// the film opened 245 × 138 px on a 1440 screen, in the field right of the synopsis (the poster lock had pinned that
// field to a sliver). WATCH now stands on the first screen, and the film opens as wide as the page allows.

const film = (over: Partial<{ film: { type: 'youtube'; src: string } | null; filmPending: boolean; filmPrivate: boolean }> = {}) => ({
  film: { type: 'youtube' as const, src: 'https://youtu.be/abcdefghijk' },
  filmPending: false,
  filmPrivate: false,
  ...over,
});

describe('what stands where WATCH would', () => {
  it('a film with a link gets WATCH', () => {
    expect(watchKind(film())).toBe('watch');
  });

  it('a private film, a film awaiting its link and a placeholder each say so instead', () => {
    expect(watchKind(film({ film: null, filmPrivate: true }))).toBe('private');
    expect(watchKind(film({ film: null, filmPending: true }))).toBe('pending');
    expect(watchKind(film({ film: null }))).toBe('placeholder');
  });
});

describe("the player's shape", () => {
  it('vertical footage stands vertical, in its own ratio', () => {
    expect(playerRatio(9 / 16)).toBeCloseTo(0.5625, 4);
  });

  it('every other film plays in the 16:9 player (the embed letterboxes scope and 4:3 inside it)', () => {
    for (const r of [16 / 9, 4 / 3, 2.39]) expect(playerRatio(r)).toBeCloseTo(16 / 9, 4);
  });
});

describe('the film opens large', () => {
  const css = readFileSync('src/styles/project.css', 'utf8');

  it("the player takes the page's full row under the synopsis, as tall as the screen allows", () => {
    expect(css).toContain('.p-player { grid-column: 1 / -1; grid-row: 2; margin-top: 56px; }');
    expect(css).toContain('width: min(100%, calc(min(74svh / var(--plate, 1), 760px) * var(--player-ratio, 1.7778)));');
  });

  it('it no longer squeezes into the field right of the synopsis', () => {
    expect(css).not.toContain('margin-top: -220px');
    expect(css).not.toMatch(/\.p-player \{\s*grid-column: 2;/);
  });

  it("the open player stands clear of the header's veil: it centres in the screen under the header", () => {
    expect(css).toMatch(/\n\.p-player \{[^}]*scroll-margin-top: 66px;/);
  });

  it('the page travels to the open player', () => {
    const src = readFileSync('src/pages/project.ts', 'utf8');
    expect(src).toContain("player.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })");
    expect(src).toContain("player.style.setProperty('--player-ratio'");
  });
});

describe("WATCH stands on the film page's first screen", () => {
  it('the hero carries its own WATCH, wired to the same player', () => {
    expect(readFileSync('project.html', 'utf8')).toContain('<button class="p-run p-hero-run" id="p-hero-watch" hidden>WATCH ▸</button>');
    const src = readFileSync('src/pages/project.ts', 'utf8');
    expect(src).toContain("document.getElementById('p-hero-watch')");
    expect(src).toContain('for (const b of [watch, heroWatch]) {');
  });

  it('it sits inside the scan frame, clear of the title, at a thumb-sized target', () => {
    const css = readFileSync('src/styles/project.css', 'utf8');
    expect(css).toContain('.p-hero-run {');
    expect(css).toMatch(/\.p-hero-run \{[^}]*position: absolute;[^}]*z-index: 5;/);
  });

  it('the picture itself plays the film: both testers took it for the player and pressed it', () => {
    const src = readFileSync('src/pages/project.ts', 'utf8');
    expect(src).toContain("hero.dataset.cursor = 'PLAY ▸'");
    expect(src).toContain("if (!(e.target as Element).closest('a, button')) open();");
    expect(readFileSync('src/styles/project.css', 'utf8')).toContain('.p-hero--plays { cursor: pointer; }');
  });
});

describe('the way back to all films stands at the top of a film page, not only after its last still', () => {
  it('the hero carries the link, in the words of the one at the foot', () => {
    expect(readFileSync('project.html', 'utf8')).toContain(
      '<a class="p-up" href="/works.html" data-internal data-cursor="BACK ◂">◂ ALL FILMS</a>',
    );
    expect(readFileSync('src/pages/project.ts', 'utf8')).toContain('◂ BACK TO ALL FILMS');
  });

  it('a thumb can hit it', () => {
    const css = readFileSync('src/styles/project.css', 'utf8');
    expect(css).toMatch(/\.p-up \{[^}]*min-height: 44px;/);
  });
});

describe("the film page's marks keep clear of the menu, and read over a bright picture", () => {
  const css = readFileSync('src/styles/project.css', 'utf8');

  it("the letterbox's ratio stamp stands mid-band, not under the menu; a phone's band has no room for it", () => {
    expect(css).toMatch(/\.p-band-t::after \{[^}]*left: 50%;[^}]*translate: -50% 0;/);
    expect(css).not.toMatch(/\.p-band-t::after \{[^}]*right: 40px;/);
    expect(css).toContain('.p-band-t::after { display: none; }');
  });

  it('the status line, the index and the callouts wear the ink halo (white on a white picture read as nothing)', () => {
    expect(css).toMatch(/\.p-status, \.p-index, \.p-callouts, \.p-up \{\s*text-shadow:/);
  });

  it('a long title in the foot links wraps: it no longer widens a phone page past its screen', () => {
    expect(css).toMatch(/\.p-back, \.p-nextlink \{[^}]*overflow-wrap: anywhere;/);
  });
});
