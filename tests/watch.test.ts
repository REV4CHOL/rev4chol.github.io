import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { playerRatio, watchKind } from '../src/project/watch';

// The owner's testers, 2026-09-30: "they dont know how to navigate the website or click or do actions, and they feel
// lost". On a film's page the one action that matters is WATCH, and it was a full screen below the picture; pressed,
// the film opened 245 × 138 px on a 1440 screen, in the field right of the synopsis (the poster lock had pinned that
// field to a sliver). The film now opens as wide as the page allows, and a press on the hero picture plays it. (The
// hero carried a WATCH button of its own for a day; the owner, of the hero, 2026-09-30: "remove the WATCH on this".)

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

  it('every other film plays in the 16:9 player (the embed letterboxes scope, 3:2 and 4:3 inside it)', () => {
    for (const r of [16 / 9, 4 / 3, 3 / 2, 2.39]) expect(playerRatio(r)).toBeCloseTo(16 / 9, 4);
  });
});

// (owner 2026-11-24, of XIÊU LÒNG's 3:2 picture: "Keep 3:2, add that pane") a 3:2 film's hero is pillarboxed like a 4:3
// one, only narrower: it wears the same dress, the side rack panels with the ring sized into the right one, not the
// 16:9 hero's ring hanging across the picture
describe("a 3:2 film's hero", () => {
  it('wears the 4:3 dress: rack panels, the ring inside the right one', () => {
    const src = readFileSync('src/pages/project.ts', 'utf8');
    expect(src).toContain("if (p.aspect === '4:3' || p.aspect === '3:2') heroSec.classList.add('p-hero--43');");
  });

  // the ROLE / YR / RT readouts hang from the hero's right edge (right: 44px, from 170px down) and grow leftward with
  // their text; the right panel's vertical tag stood 26px inside the panel from 148px down, so on a narrow panel (3:2
  // at 1920, 4:3 at 1440) or under a long role line the two crossed. The tag yields: in this dress it starts below the
  // readouts' last row (three rows of 16px with 16px between them end at 250px), whatever the panel's width
  it("the right panel's tag starts below the readouts, so the two never cross", () => {
    const css = readFileSync('src/styles/project.css', 'utf8');
    expect(css).toContain('.p-callouts {\n  position: absolute; right: 44px; top: 170px;'.replace(/\n/g, css.includes('\r\n') ? '\r\n' : '\n'));
    const top = /\.p-hero--43 \.p-pillar-r \.p-pillar-tag \{ top: (\d+)px; \}/.exec(css);
    expect(top, 'the dress moves the right tag').not.toBeNull();
    expect(Number(top![1])).toBeGreaterThanOrEqual(170 + 3 * 16 + 2 * 16 + 16);
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

describe("the film plays from the page's first screen", () => {
  it('the hero carries no WATCH button (owner, of the hero: "remove the WATCH on this")', () => {
    const html = readFileSync('project.html', 'utf8');
    expect(html).not.toContain('p-hero-watch');
    expect(html).not.toContain('p-hero-run');
    expect(html.match(/WATCH ▸/g)).toHaveLength(1); // the synopsis's, where it always stood
    expect(readFileSync('src/pages/project.ts', 'utf8')).not.toContain('p-hero-watch');
    expect(readFileSync('src/styles/project.css', 'utf8')).not.toContain('.p-hero-run');
  });

  it("the synopsis's WATCH opens the player", () => {
    const src = readFileSync('src/pages/project.ts', 'utf8');
    expect(src).toContain("watch.addEventListener('click', open);");
    expect(src).not.toContain('heroWatch');
  });

  it('the picture itself plays the film: both walkthroughs took it for the player and pressed it', () => {
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

// The owner, 2026-11-24, of XIÊU LÒNG: "I need the following info: Artist: Dung Hoang Pham / PHUCNAM. Production
// House: Explosion Kitchen. Runtime: 4:20. Genre: Music Video". The spec sheet had no row for the first two. Then:
// "Underneath PRODUCTION HOUSE, write Director: Khadarec [XPOKIT]".
describe("the spec sheet's rows", () => {
  const page = readFileSync('src/pages/project.ts', 'utf8').replace(/\r\n/g, '\n');
  const rowAt = (label: string) => page.indexOf(`rows.push(['${label}',`);

  it('ARTIST, PRODUCTION HOUSE and DIRECTOR stand after CLIENT and before RUNTIME, each only when its film carries it', () => {
    const order = ['YEAR', 'ROLE', 'CLIENT', 'ARTIST', 'PRODUCTION HOUSE', 'DIRECTOR', 'RUNTIME', 'GENRE'].map(rowAt);
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(page).toContain("if (p.artist) rows.push(['ARTIST', `<span>${escapeHtml(p.artist.toUpperCase())}</span>`]);");
    expect(page).toContain("if (p.productionHouse) rows.push(['PRODUCTION HOUSE', `<span>${escapeHtml(p.productionHouse.toUpperCase())}</span>`]);");
    expect(page).toContain("if (p.director) rows.push(['DIRECTOR', `<span>${escapeHtml(p.director.toUpperCase())}</span>`]);");
  });
});
