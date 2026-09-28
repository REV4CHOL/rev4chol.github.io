# Adaptive quality, plain words, ENTER — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every instruction on the site reads as a sentence a stranger can follow; the homepage door reads ENTER ▸; one governor steers three quality tiers (FULL / BALANCED / LITE) from the device and the measured frame, on every page, remembered across pages.

**Architecture:** A pure module `src/lib/quality.ts` (opening tier, window verdict, steering, persistence, knob tables) with one live singleton the shell starts; `env.ts`'s two device caps read the tier; the hero, the floor, the tiles, the grain and the city apply their knobs and subscribe to changes; a `.rvl-lite` class stills the decor animations in CSS. The words change in `legend.ts`, `world.ts`, `works.ts`, `story.ts`/`story.html`, `project.ts`, `swipe-nav.ts`, `contact.ts`, `hud.ts`, `index.html`.

**Tech Stack:** Vite 7, TypeScript strict, PixiJS 8, three.js, vitest (node environment), headless Chrome over the DevTools pipe (`scratchpad/perf/cdp.mjs`, `weak.mjs`, `knobs.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-28-adaptive-quality-plain-words-design.md`

## Global Constraints

- Tiers `0 lite`, `1 balanced`, `2 full`; `html.rvl-lite|rvl-balanced|rvl-full` stamped by the shell.
- Storage keys: `sessionStorage rvl-gfx-session` = `{ tier, ceiling, downs }`; `localStorage rvl-gfx` = `{ tier, at }`, valid 24 h. URL pin `?gfx=lite|balanced|full`.
- Judge: `refresh = min(p10, 16.7)`; SLOW = mean > 1.4·refresh or long share > 0.25 (long = > 1.6·refresh); FAST = mean < 1.1·refresh and long share < 0.05. Window 60 frames; frames > 250 ms dropped; hold 2.5 s; down cooldown 3 s; reopen after 60 s unless two downs from that tier; up after 12 s since the last down.
- Knobs: resolution FULL min(DPR,2) / phone min(DPR,1.5); BALANCED min(DPR,1.5) / phone 1; LITE 1. Ticker maxFPS 0 / 60 / 30. Live loops 10·6·3 (phone 4·3·2).
- The strings exactly as the spec's §2.1 table; `ENTER ▸`.
- STORY keeps its own governor; the site's sampler does not run there.
- `about-old.*` is never touched. Commit with `git -c core.safecrlf=false commit`.

---

### Task 1: Plain words + ENTER — tests first (red)

**Files:**
- Modify: `tests/legend.test.ts`, `tests/wayfinding.test.ts`

- [x] **Step 1:** `legend.test.ts`: the legend lines, the caption verbs and the placeholder prefix per §2.1.
- [x] **Step 2:** `wayfinding.test.ts`: the door pin becomes `data-cursor="ENTER ▸">ENTER ▸</a>`; the pins move to `dataset.cursor = 'SWITCH CHAPTER ▸'`, `setCursorLabel('OPEN ▸')`, `◂ BACK TO ALL FILMS`, `NEXT FILM ▸ ${`, `BACK TO ALL FILMS ▸`, `PLACEHOLDER ▪ NO FILM HERE YET`, `FILM LINK COMING SOON`, `AUTOPILOT IS ON ▪ PRESS FREE TO FLY THE CITY YOURSELF`, the story.html keyboard line, the touch line in story.ts, `SCROLL DOWN ▾`, `NEXT PAGE ▸`, `◂ PREVIOUS PAGE`, `COPY EMAIL`, `MUSIC ${`, `MOTION ${`; a guard that no instruction carries the old pairs (`▸ ROAM`, `▸ ZOOM`, `▸ PREVIEW`, `▸ OPEN`, `▸ SELECT`, `▸ LOOK`, `▸ MOVE`, `▸ BOOST`, `▸ TIME`, `TUNING ▸`, `COPY FREQ`, `THE FLOOR`); `.floor-hint` and `.a3-hint` at 12 px.
- [x] **Step 3:** Run `npx vitest run tests/legend.test.ts tests/wayfinding.test.ts`. Expected: FAIL.

### Task 2: Plain words + ENTER (green)

**Files:**
- Modify: `index.html`, `src/works/legend.ts`, `src/works/world.ts` (the cursor label), `src/pages/works.ts` (the tab's cursor), `src/pages/story.ts`, `story.html`, `src/pages/project.ts`, `src/lib/swipe-nav.ts`, `src/pages/contact.ts`, `src/shell/hud.ts`, `src/styles/components.css` (`.floor-hint` 12 px / 70 %), `src/styles/story.css` (`.a3-hint` 12 px)

- [x] **Step 1:** Write the strings of §2.1 into each file.
- [x] **Step 2:** Run the two test files. Expected: PASS.

### Task 3: The governor — tests first (red)

**Files:**
- Create: `tests/quality.test.ts`

- [x] **Step 1:** `startTier` cases; the URL pin; `judge` on synthetic windows (clean 60 Hz; alternating 16.7/33.3; 120 Hz at 60; steady 33 ms); `steer` (hold to 2.5 s; down; 3 s cooldown; ceiling; reopen at 60 s; two downs close; up after 12 s, never past the ceiling); `restoreState`/`saveState` through fake storages (a throwing storage reads as fresh; a 25 h-old record is ignored; the session record wins over the day record); `videoCapFor(tier, phone)`, `resolutionFor(tier, dpr, phone)`, `maxFpsFor(tier)`.
- [x] **Step 2:** Source pins: `src/shell/shell.ts` calls `quality.start(`; `src/lib/env.ts` reads `quality.tier()` in both caps; `grain.ts`, `hero.ts`, `world.ts`, `tile.ts`, `playback.ts`, `city3d.ts` read the tier; `components.css` has `.rvl-lite #grain { display: none; }`.
- [x] **Step 3:** Run `npx vitest run tests/quality.test.ts`. Expected: FAIL (no module).

### Task 4: The governor (green)

**Files:**
- Create: `src/lib/quality.ts`
- Modify: `src/lib/env.ts`, `src/shell/shell.ts`

- [x] **Step 1:** `quality.ts`: the pure functions and tables, then the singleton: `start(search, device)` restores the state, applies the pin, stamps the class, starts the sampler (unless `{ govern: false }`); `tier()`, `on(cb)`, `set(t)`; `window.rvlQuality`.
- [x] **Step 2:** `env.ts`: `liveVideoCap()` = `videoCapFor(quality.tier(), isMobile())`; `dprCap()` = `resolutionFor(quality.tier(), devicePixelRatio, isMobile())`.
- [x] **Step 3:** `shell.ts`: `quality.start()` before `mountAtmosphere()`; `mountShell` takes an option `{ govern?: boolean }` that STORY passes false.
- [x] **Step 4:** Run `tests/quality.test.ts`. Expected: the pure tests PASS; the pins for grain/hero/world/tile/playback/city/CSS still FAIL.

### Task 5: The knobs

**Files:**
- Modify: `src/shell/grain.ts`, `src/home/hero.ts`, `src/works/world.ts`, `src/works/tile.ts`, `src/works/playback.ts`, `src/about/city3d.ts`, `src/pages/story.ts`, `src/styles/components.css`, `src/styles/project.css`, `src/styles/about.css`

- [x] **Step 1:** `grain.ts`: interval by tier (90 / 180 / none), `grain.hidden` at LITE, re-tune on `quality.on`.
- [x] **Step 2:** `hero.ts`: `applyTier()` — filters per tier, `renderer.resize(w, h, resolutionFor(...))`, `ticker.maxFPS`; at LITE `glitch.enabled` follows `burstLeft > 0`; subscribe.
- [x] **Step 3:** `world.ts`: `applyTier()` — resolution, `maxFPS`, `playback.update`; `hover()` sets the desat filter only when `quality.tier() > 0`; `exit()`/`arrive()` at LITE: the slides only; subscribe; the world unsubscribes in `destroy()`.
- [x] **Step 4:** `tile.ts`: `enterHover`/constructor skip the glow at LITE.
- [x] **Step 5:** `playback.ts`: `get cap()` / `get maxElements()`.
- [x] **Step 6:** `city3d.ts`: `tier = Math.min(startTier(...), quality.tier())`; `trim = isMobile() || quality.tier() === 0` for the four counts. `story.ts`: `startPage('story', …, { govern: false })` — the shell's sampler stays off.
- [x] **Step 7:** CSS `.rvl-lite` blocks in the three sheets.
- [x] **Step 8:** Run `npx vitest run tests/quality.test.ts`. Expected: PASS.

### Task 6: Gates

- [x] **Step 1:** `npx tsc --noEmit` — no output.
- [x] **Step 2:** `npx vitest run` — all pass (3 skipped).
- [x] **Step 3:** `npx vite build` — success.

### Task 7: Real Chrome

- [x] **Step 1:** `scratchpad/perf/weak.mjs` against dev on the four machines: LITE holds the homepage and the floor near the display's rate on the software GPU; the phone opens BALANCED; this PC stays FULL; the governor's state is in sessionStorage after a page change.
- [x] **Step 2:** `scratchpad/ux/verify-words.mjs`: the legend text and size, the caption verb, the cursor labels (`OPEN ▸` over a pane, `SWITCH CHAPTER ▸` over a tab), the door, the dossier's end links, the STORY lines, CONTACT's button, the HUD labels; `?gfx=lite` → `html.rvl-lite`, no grain, 3 loops, plain flip; `?gfx=full` → 10 loops.
- [x] **Step 3:** Screenshots: the floor at FULL and at LITE, the homepage at both, the legend.

### Task 8: Ship

- [x] **Step 1:** Stage explicitly, two commits: (1) the words + ENTER; (2) the governor and its knobs. Docs with (2).
- [x] **Step 2:** `git -c core.safecrlf=false commit`, `git push -q origin master`, `gh run watch --exit-status`.
- [x] **Step 3:** Task 7's scripts against `https://rev4chol.github.io`.

### Task 9: Close

- [x] **Step 1:** Memory: the bullet and the description line.
- [x] **Step 2:** Report to the owner, flagging the design calls: ENTER keeps its arrow; MTN/MUS renamed; COPY FREQ renamed; "the floor" → "all films" on screen; three tiers and their knobs; the reopen rule; the URL pin.
