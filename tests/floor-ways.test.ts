import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Project } from '../src/lib/content';
import { softBreaks } from '../src/lib/escape';
import { scrambleFrame } from '../src/lib/scramble';
import { captionSpot } from '../src/works/caption';
import { hoverFitIn, previewBox } from '../src/works/constants';
import { chapterTabLabel, listGroups, rowMeta, searchForView, thumbSize, toggleText, viewFromSearch } from '../src/works/index-list';
import { COLUMN } from '../src/works/list-art';
import { PanController } from '../src/works/input';
import { stripName } from '../src/works/legend';
import { nearestPane, strayed } from '../src/works/stray';

// The owner's testers, 2026-09-30: "they dont know how to navigate the website or click or do actions, and they feel
// lost, as they have never seen a website like this before". On the WORK floor the review's two simulated first
// visits (agents given only the screen: a laptop, a phone) met: no plain way to see every film or find one by name;
// five of the seventeen films behind a tab that read as a caption; a phone's preview standing up half off the screen;
// one drag throwing the wall into empty floor with no way back; a hover title printed on its own picture or off the
// screen's edge; two names for one film.

const project = (over: Partial<Project> = {}): Project => ({
  slug: 'philia', title: 'PHILIA', year: 2026, role: 'Colorist', runtime: '11:42', client: '', short: '', tags: [],
  accent: '#c8ff00', tileSize: 'large', aspect: '16:9', category: 'human', synopsis: '', credits: [],
  film: { type: 'youtube', src: 'https://youtu.be/abcdefghijk' }, films: [], filmPending: false, filmPrivate: false,
  stills: [], position: null, focus: '50% 50%',
  ...over,
});

describe('a plain list of every film', () => {
  const all = [
    project(),
    project({ slug: 'katara', title: 'KATARA', category: 'machine', role: 'Director / Editor', runtime: '1:20' }),
    project({ slug: 'mien-vien', title: 'MIEN VIEN', aspect: '4:3', film: null, filmPrivate: true, runtime: '' }),
    project({ slug: 'galaxy', title: 'GALAXY', category: 'machine', aspect: '9:16' }),
  ];

  it('both chapters, in the chapters\' order, each under its name and its count', () => {
    const groups = listGroups(all);
    expect(groups.map((g) => g.heading)).toEqual(['CH·01 ▪ COLORIST ▪ 2 FILMS', 'CH·02 ▪ AI ▪ 2 FILMS']);
    expect(groups[0].rows.map((r) => r.slug)).toEqual(['philia', 'mien-vien']);
    expect(groups[1].rows.map((r) => r.slug)).toEqual(['katara', 'galaxy']);
  });

  it('a row carries its title, its facts and its link; no number (the films\' own numbers skip inside a chapter)', () => {
    const [human] = listGroups(all);
    expect(human.rows[0]).toEqual({
      slug: 'philia', title: 'PHILIA', href: '/project.html?p=philia', meta: '2026 · COLORIST · 11:42', accent: '#c8ff00', thumb: { w: 128, h: 72 },
    });
  });

  it('a title written with underscores wraps at them, in the list, in the caption and in the scramble', () => {
    expect(softBreaks('MR_PURPLE_DREAMS')).toBe('MR_\u200bPURPLE_\u200bDREAMS');
    expect(softBreaks('PHILIA')).toBe('PHILIA');
    expect(scrambleFrame('A_\u200bB', 0, () => 0)[2]).toBe('\u200b');
    expect(readFileSync('src/works/world.ts', 'utf8')).toContain('softBreaks((p.short || p.title).toUpperCase())');
    expect(readFileSync('src/pages/works.ts', 'utf8')).toContain("span('fl-title', softBreaks(r.title))");
  });

  it('a chapter with no film has no heading', () => {
    expect(listGroups([project()]).map((g) => g.key)).toEqual(['human']);
  });

  it('a private film says so where its running time would stand', () => {
    expect(rowMeta(project({ runtime: '', filmPrivate: true, role: '1st AD / Colorist' }))).toBe('2026 · 1ST AD / COLORIST · PRIVATE FILM');
    expect(rowMeta(project({ runtime: '' }))).toBe('2026 · COLORIST');
  });

  // (owner 2026-09-28: vertical footage is shown vertical everywhere, never cropped to 16:9)
  it("a thumbnail keeps its film's shape inside a 128 × 72 box: never cropped", () => {
    expect(thumbSize(16 / 9)).toEqual({ w: 128, h: 72 });
    expect(thumbSize(4 / 3)).toEqual({ w: 96, h: 72 });
    expect(thumbSize(2.39)).toEqual({ w: 128, h: 54 });
    expect(thumbSize(9 / 16)).toEqual({ w: 41, h: 72 });
  });

  it('the control that opens it says what it gives, and the way back says where it leads', () => {
    expect(toggleText('floor', 17)).toBe('LIST ALL 17 FILMS ▸');
    expect(toggleText('floor', 1)).toBe('LIST ALL 1 FILM ▸');
    expect(toggleText('list', 17)).toBe('◂ BACK TO THE FILM WALL');
    expect(toggleText('list', 17, true), "a phone's way back leads to its reel").toBe('◂ BACK TO THE REEL');
    expect(toggleText('floor', 17, true)).toBe('LIST ALL 17 FILMS ▸');
  });
});

describe('the view a visitor chose', () => {
  it('the address decides first, then what this visit chose, then the wall', () => {
    expect(viewFromSearch('', null)).toBe('floor');
    expect(viewFromSearch('?view=list', null)).toBe('list');
    expect(viewFromSearch('?ch=machine&view=list', 'floor')).toBe('list');
    expect(viewFromSearch('', 'list')).toBe('list');
    expect(viewFromSearch('?view=floor', 'list')).toBe('floor');
    expect(viewFromSearch('?view=junk', null)).toBe('floor');
  });

  it('the address keeps the chapter when the view changes', () => {
    expect(searchForView('?ch=machine', 'list')).toBe('?ch=machine&view=list');
    expect(searchForView('?ch=machine&view=list', 'floor')).toBe('?ch=machine');
    expect(searchForView('', 'list')).toBe('?view=list');
    expect(searchForView('?view=list', 'floor')).toBe('');
  });
});

describe('a chapter tab says how many films stand behind it', () => {
  it('the chapter showing counts its films; the other says how many MORE', () => {
    expect(chapterTabLabel('CH·01', 12, true)).toBe('CH·01 ▪ 12 FILMS');
    expect(chapterTabLabel('CH·02', 5, false)).toBe('CH·02 ▪ 5 MORE FILMS');
    expect(chapterTabLabel('CH·02', 1, false)).toBe('CH·02 ▪ 1 MORE FILM');
  });

  it('the tab not showing is no longer half ink: it reads as clearly as a menu link', () => {
    const css = readFileSync('src/styles/components.css', 'utf8');
    expect(css).toMatch(/\n\.ch-switch button:not\(\.is-on\) \.ch-idx \{ color: color-mix\(in srgb, var\(--bone\) 78%, transparent\); \}/);
    expect(css).toMatch(/\n\.ch-name \{[^}]*color: color-mix\(in srgb, var\(--bone\) 88%, transparent\);/);
  });
});

describe("one name for one film: the pane's strip", () => {
  it("speaks the slug in words, not in the address's hyphens", () => {
    expect(stripName({ short: '', year: 2026, slug: 'electric-fish' })).toBe('2026 · ELECTRIC FISH');
    expect(stripName({ short: '', year: 2025, slug: 'soft-hours-lonely-lands' })).toBe('2025 · SOFT HOURS LONELY LANDS');
  });

  it("the owner's short name is still the whole strip", () => {
    expect(stripName({ short: 'APL 2026 Teaser', year: 2026, slug: 'lien-quan' })).toBe('APL 2026 TEASER');
  });
});

describe('the lifted preview fits the screen', () => {
  it('a landscape card no wider than its box, a tall one no taller; never enlarged past the plain lift', () => {
    // 16:9 card: 400 × 225 units, doubled, lifted 1.18x = 944 × 531 at zoom 1
    expect(hoverFitIn(400, 225, 2, 1, 2000, 2000)).toBe(1);
    expect(hoverFitIn(400, 225, 2, 1, 472, 2000)).toBeCloseTo(0.5, 6);
    expect(hoverFitIn(258, 458, 2, 1, 2000, 540.44)).toBeCloseTo(0.5, 4);
    expect(hoverFitIn(400, 225, 2, 0.354, 359, 480)).toBe(1); // a phone's opening zoom: 334 px wide, fits
    expect(hoverFitIn(400, 225, 2, 1, 359, 480)).toBeCloseTo(359 / 944, 6); // pinched in: it was wider than the screen
  });

  it("a touch screen's preview box lies under the header and leaves the caption's room above the chapter tabs", () => {
    expect(previewBox(390, 844, true)).toEqual({ x: 390 * 0.04, y: 132, w: 390 * 0.92, h: 480 });
    // a short screen (a phone on its side) still gets a box
    expect(previewBox(844, 390, true).h).toBeCloseTo(390 * 0.4, 6);
  });

  it("a mouse's box is the screen, less the margins the tall pane always had", () => {
    expect(previewBox(1440, 900, false)).toEqual({ x: 1440 * 0.04, y: 900 * 0.08, w: 1440 * 0.92, h: 900 * 0.84 });
  });
});

describe("the preview's caption", () => {
  const view = { x: 16, y: 128, w: 1408, h: 676 }; // the screen between the header and the chapter tabs
  const size = { w: 300, h: 60 };
  const measure = () => size;

  it('stands under the lifted card, flush with its left edge', () => {
    const s = captionSpot({ x: 248, y: 158, w: 944, h: 531 }, view, measure);
    expect(s).toMatchObject({ side: 'below', left: 248, top: 158 + 531 + 14 });
  });

  it('over the card when there is no room under it', () => {
    const s = captionSpot({ x: 248, y: 330, w: 944, h: 531 }, view, measure);
    expect(s).toMatchObject({ side: 'above', left: 248, top: 330 - 14 - 60 });
  });

  it('never off the screen: held inside the left and right margins', () => {
    expect(captionSpot({ x: -400, y: 158, w: 944, h: 531 }, view, measure).left).toBe(16);
    expect(captionSpot({ x: 1300, y: 158, w: 944, h: 531 }, view, measure).left).toBe(16 + 1408 - 300);
  });

  it('beside a card that fills the height (a tall pane), in the room it has: the title wraps', () => {
    const asked: number[] = [];
    const wrap = (max: number) => { asked.push(max); return max < 500 ? { w: 250, h: 120 } : { w: 510, h: 60 }; };
    const s = captionSpot({ x: 508, y: 72, w: 425, h: 756 }, view, wrap);
    expect(s.side).toBe('right');
    expect(s.left).toBe(508 + 425 + 14);
    expect(s.maxWidth).toBe(16 + 1408 - (508 + 425 + 14));
    expect(asked).toContain(s.maxWidth);
    expect(s.top).toBe(128); // (the card starts above the header's line: the caption starts at it)
  });

  it('on its left when the right has no room', () => {
    const s = captionSpot({ x: 900, y: 72, w: 425, h: 756 }, view, measure);
    expect(s).toMatchObject({ side: 'left', left: 900 - 14 - 300 });
  });

  it('as a last resort over the foot of the picture, still whole on the screen', () => {
    const s = captionSpot({ x: 100, y: 72, w: 1240, h: 756 }, view, measure);
    expect(s).toMatchObject({ side: 'over', top: 128 + 676 - 60 });
    expect(s.left).toBeGreaterThanOrEqual(16);
  });

  it('never wider than the screen', () => {
    const asked: number[] = [];
    captionSpot({ x: 20, y: 300, w: 334, h: 188 }, { x: 16, y: 132, w: 358, h: 608 }, (max) => { asked.push(max); return { w: 300, h: 80 }; });
    expect(asked[0]).toBe(358);
  });
});

describe('never lost in empty floor', () => {
  const view = { x: -500, y: -400, w: 1000, h: 800 };
  const pane = (slug: string, cx: number, cy: number) => ({ slug, cx, cy, hw: 500, hh: 250 });

  it('a pane in the middle of the screen: not lost', () => {
    expect(strayed(view, [pane('a', 0, 0)])).toBe(false);
    expect(strayed(view, [pane('a', 450, 0)])).toBe(false); // well into the screen's middle part
  });

  it('only corners of panes at the screen\'s edges, or nothing at all: lost', () => {
    expect(strayed(view, [pane('a', 1200, 0)])).toBe(true);
    expect(strayed(view, [pane('a', 0, 900)])).toBe(true);
    expect(strayed(view, [pane('a', 5000, 5000)])).toBe(true);
    expect(strayed(view, [])).toBe(false); // (no panes: nowhere to return to)
  });

  it('the way back is the pane nearest the middle of the screen', () => {
    expect(nearestPane(view, [pane('far', 3000, 0), pane('near', 0, 900), pane('mid', -1500, -200)])?.slug).toBe('near');
    expect(nearestPane(view, [])).toBeNull();
  });

  it('the floor returns only once it has come to rest: a fling still coasting is left alone', () => {
    const el = { addEventListener() {}, removeEventListener() {} } as unknown as HTMLElement;
    const pan = new PanController(el, { minX: -9999, maxX: 9999, minY: -9999, maxY: 9999 });
    expect(pan.coasting).toBe(false);
    (pan as unknown as { vel: { x: number; y: number } }).vel = { x: 12, y: 0 };
    expect(pan.coasting).toBe(true);
    for (let i = 0; i < 200; i++) pan.tick();
    expect(pan.coasting).toBe(false);
  });
});

describe('the floor is wired (pins)', () => {
  const world = readFileSync('src/works/world.ts', 'utf8');
  const page = readFileSync('src/pages/works.ts', 'utf8');
  const css = readFileSync('src/styles/components.css', 'utf8');

  it("a touch screen's first tap brings the pane to the middle of its box, fitted", () => {
    expect(world).toContain('hoverFitIn(tile.cw, tile.ch, tile.sizeMul, zs, box.w, box.h)');
    expect(world).toContain('const box = previewBox(sw, sh, coarse);');
    expect(world).toContain('if (coarse) {');
  });

  it('a pane awake while the floor zooms is fitted afresh: its preview never outgrows the screen', () => {
    expect(world).toMatch(/if \(zs !== c\.zs\) \{[\s\S]*?const lift = this\.liftAt\(tile, zs, previewBox\(/);
    expect(world).toContain('tile.enterHover(lift);');
  });

  it('the caption is placed by captionSpot and travels with its card', () => {
    expect(world).toContain('captionSpot(');
    expect(world).toContain('this.followCaption();');
    expect(world).not.toContain('tile.extentX() * 0.7');
  });

  it('a strayed floor glides back to the nearest pane', () => {
    expect(world).toContain('strayed(this.viewRect(), rects)');
    expect(world).toContain('nearestPane(this.viewRect(), rects)');
    expect(world).toContain('this.pan.coasting');
  });

  it("a keyboard's focus lands on its pane at any zoom (it missed by the zoom's factor)", () => {
    expect(world).toMatch(/focusProject\(slug: string\): void \{[\s\S]*?x: -tile\.x \* zs, y: -tile\.y \* zs,/);
  });

  it('the floor stands still while the list shows', () => {
    expect(world).toContain('pause(): void {');
    expect(world).toContain('resume(): void {');
    expect(page).toContain("if (v === 'list') world?.pause();");
  });

  it('the page builds the list, the toggle and the counted tabs', () => {
    expect(readFileSync('works.html', 'utf8')).toContain('<section id="film-list" class="film-list" aria-label="All films" tabindex="-1" hidden></section>');
    expect(page).toContain('listGroups(projects)');
    expect(page).toContain('toggleText(v, projects.length, reelOn)');
    expect(page).toContain('chapterTabLabel(');
    expect(page).toContain('viewFromSearch(location.search, remembered)');
    expect(readFileSync('src/works/tile.ts', 'utf8')).toContain('text: stripName(project),');
  });

  it("the list button is the keyboard's first stop after the menu: the legend stands ahead of the chapter tabs in the page", () => {
    const html = readFileSync('works.html', 'utf8');
    expect(html.indexOf('id="floor-hint"')).toBeGreaterThan(-1);
    expect(html.indexOf('id="floor-hint"')).toBeLessThan(html.indexOf('id="ch-switch"'));
  });

  it('the list is a page of links: a thumb-sized row, the title wrapping, the chrome clear of it', () => {
    expect(css).toContain('\n.film-list {');
    expect(css).toMatch(/\n\.fl-row \{[^}]*min-height: 88px;/);
    expect(css).toMatch(/\n\.fl-title \{[^}]*overflow-wrap: anywhere;/);
    expect(css).toContain('.fl-thumb img { width: auto; height: auto; max-width: 128px; max-height: 72px; }');
    expect(css).toContain('.works-main.is-list #floor { visibility: hidden; }');
    expect(css).toContain('.works-main.is-list .ch-switch { display: none; }');
  });

  it("the list's city never stands under a title: the sheet keeps its black over the reading column, all black on a phone", () => {
    // (owner, 2026-10-13: "keep all the projects all perfectly readable in the middle") the band is the margins'
    // column, 1,192 plate px — 596 either side of the middle (works/list-art.ts) — and it is plain CSS
    expect(COLUMN / 2).toBe(596);
    expect(css).toContain('html.rvl-list-city .film-list {\n  background: linear-gradient(90deg, transparent calc(50% - 596px), var(--void) calc(50% - 596px) calc(50% + 596px), transparent calc(50% + 596px));');
    expect(css).toMatch(/\n\.film-list \{[^}]*background: var\(--void\);/); // the sheet's own black: a phone, a city skipped
    const deco = Number(/#list-deco \{[^}]*z-index: (\d+)/.exec(css)?.[1]), list = Number(/\n\.film-list \{[^}]*z-index: (\d+)/.exec(css)?.[1]);
    expect(deco).toBeLessThan(list);
    const src = readFileSync('src/works/list-deco.ts', 'utf8');
    expect(src).toContain("document.documentElement.classList.toggle('rvl-list-city', built);");
    expect(src).toContain('root.hidden = !built;');
    expect(page).toContain("listDeco(v === 'list');");
  });

  it('the caption wraps a long title, wears the halo, and its last line is 12 px', () => {
    expect(css).toMatch(/\n#tile-label \.tl-title \{[^}]*overflow-wrap: anywhere;/);
    expect(css).toContain('#tile-label .tl-meta { font-size: calc(var(--t-xs) * var(--uiz)); }');
  });

  it("a phone's legend stands down while a pane is awake (the preview takes its place)", () => {
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s+\.works-main\.is-awake \.floor-hint \{ opacity: 0; visibility: hidden; \}/);
  });
});

// WORK ON A PHONE (owner, 2026-10-20: "on Phone, its completely overwhelming and disorienting … a complete redesign of
// the interface of the Work section … specifically for Phones"): the reel (tests/reel.test.ts holds its rules)
describe('a phone gets the reel, never the floor (pins)', () => {
  const page = readFileSync('src/pages/works.ts', 'utf8');
  const view = readFileSync('src/works/reel-view.ts', 'utf8');
  const css = readFileSync('src/styles/components.css', 'utf8');
  const size = (sel: string, src = css) => Number(new RegExp(`\\n${sel.replace(/\./g, '\\.')} \\{[^}]*font-size: (\\d+)px`).exec(src)?.[1]);

  it('the page decides once as it loads, and a phone builds no floor', () => {
    expect(page).toContain('const reelOn = window.matchMedia(REEL_QUERY).matches;');
    expect(page).toContain('const floor = reelOn ? [] : await loadFloor();');
    expect(page).toContain("main.classList.toggle('is-reel', reelOn);");
    expect(page).toMatch(/if \(reelOn\) \{\s+reel = mountReel\(main, projects, \{[^\n]*\}\);[\s\S]*?\} else await mount\(active\);/);
    expect(page).toContain("reel?.park(v === 'list');");
  });

  it("the floor's world, legend and tabs leave a phone; the reel's rules come with its class", () => {
    expect(css).toContain('.works-main.is-reel #floor, .works-main.is-reel .ch-switch, .works-main.is-reel #tile-label,');
    expect(css).toContain('.works-main.is-reel:not(.is-list) .floor-hint { display: none; }');
    expect(css).toContain('.works-main.is-reel.is-list .reel, .works-main.is-reel.is-list .rl-rail, .works-main.is-reel.is-list .rl-foot { display: none; }');
  });

  it('a chapter\'s name stands bigger than its CH·NN line in the foot, upright and on its side', () => {
    const idx = size('.rl-chap-idx');
    expect(size('.rl-chap-name')).toBeGreaterThan(idx);
    const side = css.slice(css.indexOf('/* a phone on its side'));
    expect(Number(/\.rl-chap-name \{ font-size: (\d+)px; \}/.exec(side)?.[1])).toBeGreaterThan(idx);
  });

  it('the foot stands inside the small viewport, above the home indicator, the words above it', () => {
    expect(css).toMatch(/\n\.rl-foot \{[^}]*position: fixed;[^}]*bottom: 0;[^}]*padding: 0 10px env\(safe-area-inset-bottom\);/);
    expect(css).toMatch(/\n\.rl-cap \{[^}]*bottom: calc\(var\(--reel-foot\) \+ env\(safe-area-inset-bottom\) \+ 26px\);/);
  });

  // (owner, 2026-10-20, with two screenshots of antiantiart.com on a phone: "I would prefer the sizing of all panes on
  // Phone in the work section to be like this website")
  it('a pane is the whole screen, its picture covering it around the film\'s focus point', () => {
    expect(css).toContain('.reel { position: fixed; inset: 0; z-index: 900; }');
    expect(css).toMatch(/\n\.rl-frame \{[^}]*position: absolute;[^}]*height: 100%;/);
    expect(css).toContain('.rl-poster, .rl-loop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: var(--focus, 50% 50%); }');
    expect(view).toContain("pane.style.setProperty('--focus', p.focus);");
  });

  // (owner, 2026-10-20: "The moment we enter the work section, we can see the already continously scrolling down to the
  // next film in a continuous strips. And we can slide our finger up and down to scroll through the strip")
  it('the strip rolls on its own, endless, and a finger takes it; CALM never rolls it; a drag opens no film', () => {
    expect(css).toMatch(/\n\.rl-strip \{[^}]*overflow: hidden;[^}]*touch-action: none;/);
    expect(css).not.toContain('scroll-snap');
    expect(view).toContain('li.style.transform = `translate3d(0, ${Math.round(paneTop(i, offset, h, n) * dpr) / dpr}px, 0)`;');
    expect(view).toContain('const rollSpeed = () => (reducedMotion() ? 0 : h / ROLL_SECONDS);');
    expect(view).toContain('v = moved ? releaseSpeed(moves, e.timeStamp) : 0;');
    expect(view).toContain('restUntil = performance.now() + REST_AFTER_TOUCH_MS;');
    expect(view).toMatch(/root\.addEventListener\('click', \(e\) => \{\s+if \(!dragged\) return;[\s\S]*?e\.preventDefault\(\);/);
    expect(view).not.toContain('rl-eof'); // (endless: no end slate on a phone)
  });

  it("a vertical film stands vertical: on a phone held on its side it stands whole, never cropped wide", () => {
    expect(view).toContain("aspectRatio(p.aspect) < 1 ? ' is-vertical' : ''");
    const side = css.slice(css.indexOf('/* a phone on its side'));
    expect(side).toContain('.rl-pane.is-vertical .rl-poster, .rl-pane.is-vertical .rl-loop { object-fit: contain; }');
  });

  it('a pane carries the film\'s name and its roles, nothing else (owner: "Do not clog this section up with texts")', () => {
    expect(view).toContain("el('span', 'rl-title', softBreaks(p.title)), el('span', 'rl-role micro', roleLine(p.role))");
    for (const gone of ['rl-syn', 'rl-tags', 'rl-meta', 'rl-door', 'rl-stills', 'rl-num', 'rl-cue', 'teaser(', 'rowMeta(']) {
      expect(view, gone).not.toContain(gone);
    }
  });

  it('every pane in view plays, on every tier; a refusal turns the loops to images; a touch re-offers a video', () => {
    expect(view).toContain("if (!allowed) return null; // (Save-Data or a 2g line: the posters)");
    expect(view).not.toContain('quality.tier()'); // (a remembered LITE once left a phone on posters all visit)
    expect(view).toContain("else if (want[i] === 'rest') { const l = loops.get(li); if (l instanceof HTMLVideoElement) l.pause(); }");
    expect(view).toContain('l = loopsAsImages() ? imageLoop(li, chain) : videoLoop(chain);');
    expect(view).toContain('if (isRefusal(e)) noteRefusal();');
    expect(view).toContain("window.addEventListener('touchend', kick, { passive: true });");
    expect(view).toContain('if (!reducedMotion()) {');
    expect(css).toContain('.rvl-calm .works-main.is-arriving .rl-pane, .rvl-calm .works-main.is-arriving .rl-foot { animation: none; }');
  });

  // (owner, 2026-10-20: "i dont care which power mode iphone is on, but I want all the sections in both the homepage
  // and work section to play all video right away")
  it('the homepage turns to images on a refusal, at once when the visit was refused before', () => {
    const hero = readFileSync('src/home/hero.ts', 'utf8');
    expect(hero).toContain('if (probe) playOrNote(v);');
    expect(hero).toContain('if (loopsAsImages()) mountImageReel();');
    expect(hero).toContain('onRefusal(() => { if (imageLoopsWork() !== false) mountImageReel(); });');
    expect(css).toContain('.hero-img.is-on { opacity: 1; }');
  });

  it('one tap opens a film, with the house wipe', () => {
    expect(view).toContain('a.href = `/project.html?p=${p.slug}`;');
    expect(view).toContain("a.dataset.internal = '';");
  });
});
