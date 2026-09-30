# The wayfinding review: a film that can be found, chrome that can be read, a floor with a way around it — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A first-time visitor finds a film, plays it, knows what can be pressed and where they are, and gets back, on a
laptop and on a phone, without the site's own ideas (the floor, the city, the homepage) being changed.

**Architecture:** Three batches, each behind its own pure module and its own test file. The film page: `project/watch.ts`
decides what stands where WATCH would; the player becomes a full row. The chrome: one veil behind the header on every
page, the switches' words from `shell/switches.ts`, the scroll cue's state from `cueState` / `cueKicker` in
`lib/swipe-nav.ts`. The floor: `works/index-list.ts` (THE LIST), `works/caption.ts` (where a preview's title stands),
`works/stray.ts` (the way back from empty floor), `previewBox` / `hoverFitIn` in `works/constants.ts` (a preview no
larger than its screen); `world.ts` and `pages/works.ts` only wire them.

**Tech Stack:** Vite 7, TypeScript strict, Vitest, PixiJS 8 floor, GSAP; real Chrome over CDP for verification.

Spec (the review itself): `docs/superpowers/specs/2026-09-30-wayfinding-review-design.md`.

**Shipped:** 7d6350a (Pages run 36683679006 green); verified live 2026-09-30 at 1440 × 900, 1920 × 1080, 1366 × 768 and
390 × 844 (touch): the same facts as on dev, no page error.

## Global Constraints

- The owner's decisions stand: the door says `ENTER ▸` and nothing else; a scroll past a page's end leaves for the next
  page; the city page is STORY; chapter names keep the label's type × `--ch-k`; Clash Display owns ≥ `--t-xl`.
- No plate and no black box behind the chrome: a veil is a fade of the page's own black, without an edge.
- A desktop pane lifts where it lies (moving it from under the pointer flickers the hover). Only a touch screen
  centres the tapped pane.
- Vertical footage stands vertical everywhere, the list's thumbnails included: never cropped to 16:9.
- MIEN VIEN is private for good: it has no WATCH; the list says PRIVATE FILM.
- Calm mode and LITE still idle motion: the floor's return is a cut, not a glide, under reduced motion.
- `about-old.*` untouched. No narrative fact invented; the owner's words verbatim.
- Most sources are CRLF in the working copy: test regexes use `\s+` / `[^}]*`, never a literal newline count.
- Hover styles stand inside `@media (hover: hover)`: a touch screen keeps `:hover` after a tap.
- Gates: `npx tsc --noEmit`, `npx vitest run`, `npx vite build --outDir dist-check`, then `rm -rf dist-check`.

---

### Task 1: The film page — WATCH on the first screen, the film large, the way back at the top

**Files:** Create `src/project/watch.ts`, `tests/watch.test.ts`. Modify `project.html`, `src/pages/project.ts`,
`src/styles/project.css`.

**Interfaces (produced):**
`watchKind(p: Pick<Project, 'film' | 'filmPending' | 'filmPrivate'>): 'watch' | 'pending' | 'private' | 'placeholder'`;
`playerRatio(ratio: number): number` (a ratio under 1 stands in itself, every other film in 16 / 9).

- [x] Write `tests/watch.test.ts` (16 tests): `watchKind` for a film with a link, a private film, a pending film, a
      placeholder; `playerRatio(9 / 16)`, `(4 / 3)`, `(2.39)`; pins: `#p-hero-watch` in `project.html` inside the scan
      frame; the hero's press opens the player unless it lands on a link or a button; `.p-player` spans the row
      (`grid-column: 1 / -1`), its width `min(100%, min(74svh / plate, 760px) × ratio)`, `scroll-margin-top: 66px`;
      `◂ ALL FILMS` under the wordmark; the ratio stamp mid-band and gone on a phone; the void halo on the status
      line, the index, the callouts; the foot links wrap (`softBreaks` on the next film's title).
- [x] Run it: fails (no module, no hero WATCH, the player in the grid's second column).
- [x] `src/project/watch.ts`; `project.html` gains the hero WATCH and the top link; `project.ts` builds the hero WATCH
      from `watchKind`, opens the player from either WATCH or the hero picture, travels to it
      (`scrollIntoView({ block: 'center' })`); `project.css` places and sizes the player, the hero WATCH (left 116,
      bottom 152; a phone: left 32, bottom 146), the top link, the stamp.
- [x] Run it: passes. Real Chrome (`uxr/film-probe.mjs`): WATCH on the first screen at 1440 × 900, 1920 × 1080,
      1366 × 768 and 390 × 844, never over the title; the open player whole on screen and clear of the veil
      (1184 × 666, 1421 × 799, 1010 × 568, 354 × 199); GALAXY's two-part stage whole; no page error.

### Task 2: The chrome — a veil on every page, switches in words, a phone's chrome, the cue, honest shapes

**Files:** Create `src/shell/switches.ts`, `tests/chrome.test.ts`. Modify `src/shell/hud.ts`, `src/shell/shell.ts`,
`src/shell/cursor.ts`, `src/shell/boot.ts`, `src/lib/swipe-nav.ts`, `src/pages/contact.ts`, `src/pages/about.ts`,
`src/styles/components.css`, `src/styles/base.css`, `src/styles/about.css`, `src/styles/contact.css`,
`src/styles/story.css`, `tests/wayfinding.test.ts`.

**Interfaces (produced):** `switchLabel(name: string, on: boolean): string` (`SFX ON`, `MUSIC OFF`);
`cueState(canLeave: boolean, scrollTop: number): 'next' | 'scroll' | 'hidden'`; `cueKicker(fine: boolean): string`
(`SCROLL DOWN ▾` / `NEXT PAGE`).

- [x] Write `tests/chrome.test.ts` (27 tests): the veil on `.nav` for every page and `.rvl-scrolled .nav::before`;
      full ink and the halo on the wordmark, the links, the switches; `.hud-tr` above `.nav`; rail tags at
      `top: 136px`; `switchLabel`; a switch that is off looks off; a phone: `.hud-bl, .hud-br { display: none; }`,
      `#hud-count { display: none; }`, the solid veil 184 px, the switches' padding, `body { overflow-x: clip }`,
      `.c-status` under the switches, `.a3-hint`'s phone rule after its base rule; `cueState` in its three states,
      its wiring, its type; `cueKicker`; `.c-eof`'s foot padding; genres dotted and square; no fill on a skill row;
      no arrow on STATUS; the cross boxes over any `a, button`; the menu 14 px; the roles line 13 px; STORY's dials.
- [x] Run it: fails.
- [x] Implement: the veil moves from `.page-work .nav, .page-home .nav` to `.nav`; `shell.ts` toggles `rvl-scrolled`
      at `scrollY > 8`; `hud.ts` writes `switchLabel(…)` on each switch and on each press; `boot.ts` says TAP TO SKIP
      on a coarse pointer; `swipe-nav.ts` sets `cue.dataset.state = cueState(may(1), top())` on scroll, resize and
      body resize, a press in the `scroll` state scrolls 85 % of a screen, the kicker is `cueKicker(finePointer())`;
      the stylesheets as pinned. `tests/wayfinding.test.ts`: the switches' and the kicker's pins follow the functions.
- [x] Run it: passes. Real Chrome (`uxr/capture.mjs`, `uxr/overflow-probe.mjs`): every page 390 wide on the phone
      (ABOUT was 498, SODA COAST 481); no page's text through the header; the cue gone mid-page on ABOUT.

### Task 3: The floor — THE LIST

**Files:** Create `src/works/index-list.ts`, `tests/floor-ways.test.ts`. Modify `src/pages/works.ts`, `works.html`,
`src/styles/components.css`, `src/lib/escape.ts` (`softBreaks`), `src/lib/scramble.ts` (keeps `​`).

**Interfaces (produced):** `type WorkView = 'floor' | 'list'`;
`viewFromSearch(search: string, remembered: string | null): WorkView`;
`searchForView(search: string, view: WorkView): string`; `toggleText(view: WorkView, total: number): string`;
`chapterTabLabel(index: string, count: number, on: boolean): string`; `thumbSize(ratio: number): { w; h }` inside
`THUMB = { w: 128, h: 72 }`; `rowMeta(p): string`; `listGroups(projects: Project[]): ListGroup[]`;
`softBreaks(s: string): string`.

- [x] Write the list's tests: two groups in `CHANNELS` order, 12 + 5 rows, headings `CH·01 ▪ COLORIST ▪ 12 FILMS` /
      `CH·02 ▪ AI ▪ 5 FILMS`; `rowMeta` (`2026 · COLORIST · 11:42`; MIEN VIEN: `… · PRIVATE FILM`); `thumbSize`
      (16:9 128 × 72, 4:3 96 × 72, 2.39 128 × 54, 9:16 41 × 72); `toggleText` (`LIST ALL 17 FILMS ▸`,
      `◂ BACK TO THE FILM WALL`); `viewFromSearch` (the address wins, then the visit's memory, then the floor);
      `searchForView` keeps `ch`; `chapterTabLabel` (`CH·01 ▪ 12 FILMS`, `CH·02 ▪ 5 MORE FILMS`, `1 FILM`);
      `softBreaks('MR_PURPLE')`; pins: `works.html` has the `h1`, `#film-list` (hidden, `tabindex="-1"`), the legend
      ahead of `#ch-switch`; `works.ts` builds rows as links, pauses the floor in the list, writes the address with
      `history.replaceState`; the stylesheet's `.film-list`, `.fl-row`, the px limits on `.fl-thumb img`, hover only
      inside `@media (hover: hover)`.
- [x] Run them: fail.
- [x] Implement `index-list.ts`; `works.ts`: the legend holds `.fh-text` and `button.view-toggle`, `setView(v, byHand)`,
      `buildFilmList(host, projects)`, the keydown handler stands down in the list; `world.pause()` / `resume()`.
- [x] Run them: pass. Real Chrome (`uxr/floor-probe.mjs`, `uxr/floor-gesture.mjs`): 17 rows; no thumbnail cropped or
      larger than its box; the ticker stopped in the list; `?view=list` kept with `ch`; a row opens its film and Back
      returns to the list; Tab reaches the button first after the menu, Enter opens the list, the arrows scroll it.

### Task 4: The floor — tabs that count, a preview that fits, a caption by its card, the way back

**Files:** Create `src/works/caption.ts`, `src/works/stray.ts`. Modify `src/works/constants.ts`, `src/works/input.ts`,
`src/works/legend.ts`, `src/works/tile.ts`, `src/works/world.ts`, `src/pages/works.ts`, `src/styles/components.css`,
`tests/floor-ways.test.ts`.

**Interfaces (produced):** `HOVER_LIFT = 26`;
`hoverFitIn(cw, ch, sizeMul, zoom, boxW, boxH): number` (≤ 1);
`previewBox(screenW, screenH, coarse): { x; y; w; h }` (a mouse: 92 % × 84 % of the screen; touch: under the header
at 132, over 232 of caption and tabs, never under 40 % of the height);
`captionSpot(card: Box, view: Box, measure: (maxWidth: number) => { w; h }, gap = 14): { left; top; maxWidth; side }`
(`below`, `above`, `right`, `left`, `over`); `strayed(view: ViewRect, panes: TileRect[]): boolean`;
`nearestPane(view, panes): TileRect | null`; `PanController.coasting: boolean`;
`stripName(p: Pick<Project, 'short' | 'year' | 'slug'>): string`.

- [x] Write their tests: `hoverFitIn` never over 1 and fits the narrower side; `previewBox` for a mouse and for a
      phone; `captionSpot` in its five places, clamped into the view, measured at the width it is given; `strayed`
      false with a pane's core in the view's middle, true on empty floor, false with no panes; `nearestPane`;
      `coasting`; `stripName` (`2026 · ELECTRIC FISH`, the owner's `short` kept); pins in `world.ts`: `liftAt`,
      `returnIfStrayed` guarded by `entering`, `dragging`, `coasting`, a running tween and `strayHold`; the caption
      placed by `captionSpot` and moved by `followCaption`; a zoom change refits the preview; `focusProject` pans to
      `-tile.x * zs`; `is-awake` on `#app`; the stylesheet: tab contrast, `width: max-content` on the dial, the
      phone's legend hidden while a pane is awake.
- [x] Run them: fail.
- [x] Implement: `world.hover()` lifts through `liftAt(tile, zs, previewBox(…))`; on a coarse pointer it tweens
      `pan.pos` so the card's centre meets the box's middle (0.45 s); `showLabel` → `placeCaption` → `followCaption`;
      `afterTick` runs `followCaption()` and `returnIfStrayed(dtMs)` (every 250 ms, at rest, glide 0.7 s to the
      nearest pane, a cut under reduced motion); `arrive()` holds the return 1200 ms; `works.ts` paints
      `chapterTabLabel` on each tab.
- [x] Run them: pass. Real Chrome: on the phone a tapped pane stands whole in the middle (`[16, 297, 359, 150]`), its
      caption under it, the legend gone, the second tap opens the film; thrown to the bounds' corner the floor is
      back on a film within 2 s; zoomed to 2 under an awake pane the preview is 1008 × 756 on 1440 × 900; every
      caption whole on the screen and off its picture.

### Task 5: Gates, ship, live

- [x] `npx tsc --noEmit`; `npx vitest run` (45 files, 555 passed, 3 skipped); `npx vite build --outDir dist-check`;
      `rm -rf dist-check`.
- [x] Commit (`git -c core.safecrlf=false commit -F <message file>`), `git push -q origin master`, watch the Pages run
      of that sha to its end.
- [x] On https://rev4chol.github.io: `uxr/capture.mjs` (desktop, phone), `uxr/film-probe.mjs`, `uxr/overflow-probe.mjs`,
      `uxr/floor-probe.mjs` (desktop, laptop, phone), `uxr/floor-gesture.mjs` (desktop, phone): the same facts as on
      dev, no page error.

### Task 6: Record

- [x] Tick this plan; note the shipped sha.
- [x] Memory: the round, the design calls made without the owner (the spec's section 7), what is left for the owner
      (its section 6).
