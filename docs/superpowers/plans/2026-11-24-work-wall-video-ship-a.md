# WORK Wall Video, Ship A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver ship A of `docs/superpowers/specs/2026-11-24-work-wall-video-design.md` (§3.1): on a weak machine, and
on any machine at LITE, the WORK floor plays one combined video per chapter so every pane moves; a machine with 4 GB or
less stays at BALANCED; the floor's waste is removed; a readout behind `?stats=1` shows every reading of both ships.

**Architecture:** The shared ladder (`src/lib/quality.ts`) gains pure functions: the weak class, the hardware ceiling
and the floor's mode. A script builds one wall video per chapter from the films' loops, with a map of the tiles; its
arithmetic is one pure module (`src/lib/wall-files.ts`) that the script, the media manifest and the tests share. On the
floor one unit (`src/works/wall.ts`) owns the wall video and hands each pane a tile texture; the world chooses the
mode and the playback manager rations the panes' own loops by it. Ship B's readings (stalls, loop health, the meter,
processor pressure, a discarded tab) are measured and shown on the readout, and decide nothing.

**Tech Stack:** TypeScript ~5.6, Vite 7 (multi-page), PixiJS 8.20, vitest 4, Node 22.18 or later, ffmpeg and ffprobe on
the PATH for the wall script and for `tests/loop-frames.test.ts`.

## Global Constraints

From the spec, word for word where a value is given:

- **Ship A decides only by the class and the tier.** "In ship A these are measured and shown on the readout, and
  decide nothing: the stalls, the loops' health watch, the meter and its budgets, processor pressure, and whether the
  tab was discarded." Ship A changes no steering: frames over 250 ms stay out of the governor's window.
- **The weak class:** "it reports 8 GB of memory or less (`deviceMemory <= 8`)"; "it reports 4 threads or fewer
  (`hardwareConcurrency <= 4`)"; "its main pointer is coarse: a tablet or a phone". "A value the browser does not
  report makes nothing weak." It is "worked out again at every page's start from the device and never read from
  storage".
- **The class caps no tier.** "The class chooses the floor's video at every tier". The opening rule and the hardware
  ceiling stand at the first line: "BALANCED for a machine that reports 4 GB or less, or 4 threads or fewer"; "FULL
  for any other".
- **The pin:** "A pin of FULL also sets the class aside: the machine is read as not weak." "`?gfx=balanced` and
  `?gfx=lite` keep the class." A pinned page "shows both watches' readings on the readout and obeys neither".
- **The caps:** `videoCapFor` is not this plan's to change. "`own` uses it as it is. The wall modes and `posters` use
  the smaller of it and 3." `starved` is 1. (The spec quotes the table as 12 · 12 · 3 on a desktop; commit
  `7362044` has since raised it to 14 · 14 · 3, a whole chapter again. So this plan never writes that number:
  `ownLoopCap`, the playback policy and their tests read `videoCapFor`.)
- **Switching:** "A step up changes no video until the floor is next built." A step down, and a verdict of the wall's
  watch, switch at once. "Every switch happens under the posters."
- **Save-Data and a 2g line** "never start a wall video".
- **The wall video:** "Rows of one height fill a frame no larger than 1920×1080." "Each tile is surrounded by 4 px of
  its own edge pixels, and a pane samples its tile half a pixel inside the picture." "H.264 High, level 4.0, 4:2:0, 24
  frames a second, CRF 23, a key frame every 2 s, no audio, `+faststart`." The half-size copy is the same frame at
  half its width and height, "encoded from the same tiles, so one map serves both". The length lies "between the
  longest loop and 30 s", and the script "warns if that pass is under 2 s".
- **The files:** `public/content/walls/<chapter>.mp4`, `<chapter>-s.mp4`, `<chapter>.json`. "The chapter is the
  `category`: `human`, `machine`." "The outputs are committed. The deploy workflow has no ffmpeg and never builds
  them."
- **A stale wall:** "The floor reads walls only from the manifest and never probes for a file." A tile is listed only
  when its loop's fingerprint "(file name, byte length, SHA-256)" matches the loop on disk.
- **The wall's watch:** "Every 2 s the unit reads the frames the wall video presented and the frames it dropped.
  Under 18 presented frames a second for 6 s moves `wall` to `wall-small`. Under 12 for 6 s moves `wall-small` to
  `starved`. The first 4 s after a video starts are not judged, and nor is a hidden page. A move down is remembered
  for the session, so the next page does not try again." A wall has failed "after 8 s without a frame".
- **Releases:** a sleeping pane's video is "Released after 20 s asleep"; the pointed pane's loop, "Asleep again, it is
  released after 5 s."
- **Stalls (counted, shown):** "A frame longer than 250 ms is no longer thrown away. Not counted: frames inside the
  opening hold of 2.5 s, the 4 s after a floor is built (a load, a chapter flip, the return from THE LIST), the first
  frame after the tab returns from hidden, and gaps over 5 s (a sleeping machine)."
- **The readout:** "`?stats=1` on any page shows one small panel in the house's mono type, fixed at the left edge.
  Nothing shows without the parameter." Its lines are `LEVEL`, `FRAMES`, `WALL`, `OWN LOOPS`, `MEMORY`, `PRESSURE`,
  `DEVICE`. "A `COPY` button puts those lines on the clipboard as text." "Nothing is sent anywhere."
- **Content tests:** "the full-size file is under 16 MB and the half-size under 6 MB".

The repository's laws:

- **Video in Pixi** (`src/lib/video-texture.ts`): never show a video sprite before its source has presented a frame;
  never give a `VideoSource` an `updateFPS`; the page owns play and pause (`autoPlay: false`). Every video texture is
  made by `videoTexture()`.
- **The wall's shared source** is never destroyed from a pane. A tile's texture is made only after the wall video has
  presented a frame.
- **Files are listed at build time** (the media manifest). Nothing is probed at run time.
- **Another plan is being built at the same time** (the phone's strip). Its files are not this plan's: `src/works/reel.ts`,
  `src/works/reel-view.ts`, the reel's block in `src/styles/components.css`, `tests/reel.test.ts`, and the reel's tests
  inside `tests/floor-ways.test.ts`. So this plan edits neither `tests/floor-ways.test.ts` nor
  `src/styles/components.css` at all: its source pins go into a new file, `tests/floor-video.test.ts`, and the
  readout's styles into a new sheet, `src/styles/stats.css`. It does not edit `tests/content-files.test.ts` either.
- **`about-old.*` is never touched.** No formatter is ever run. Comments and copy are in plain words.
- **The repo is public.** No local path, personal email or real name goes into a file or a commit. Stage explicit
  paths, never `git add -A` and never `git add .`. If `git status` shows a changed file that no task of
  this plan wrote, it is the owner's own work (`public/content/home/loop-7.mp4` was one for a while): never stage it.
- **Never open a visible browser window on the owner's PC.** Browser checks run in headless Chrome over the DevTools
  protocol with a throwaway profile, muted.
- **Commits** go on `master` with the repo's configured author (leave it as it is) and end with the trailer
  `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. Subjects read `type(scope): what changed, in plain
  words`. **A push publishes the site and is the coordinator's call: no task pushes.**

Known quirks of the development PC:

- `npm run build` can fail with `EPERM` on `dist`. Build with `npx vite build --outDir <a scratch folder outside the
  repository>` instead. Task 5 makes the media manifest follow the output folder, so a scratch build is complete.
- **Line ends.** The checkout on the development PC has CRLF line ends; the repository stores LF. Every source pin in
  this plan is one line of source, or a pattern that crosses line ends with `\s`. When you write a pin of your own,
  never match a line break with a literal `\n` inside a longer string.
- **Known local failure 1:** one test in `tests/floor-ways.test.ts`, "the list's city never stands under a title…",
  fails only on a checkout whose `src/styles/components.css` has CRLF line ends.
- **Known local failure 2:** a fresh worktree on the development PC is all CRLF, where one more test may fail for the
  same reason (`tests/sections.test.ts`, "the entries wear their own pages"). Both pass on an LF checkout and on the
  deploy.
- Neither is this plan's to fix. A run where they are the only failures counts as green; name them in the task's
  report. A fresh worktree has neither `node_modules` nor `dist`: run `npm ci` in it first.
- The local rules file `CLAUDE.md` is excluded from git and is absent in a worktree. No task edits it. The
  coordinator updates it in the main checkout at the end (Task 15 gives the text).

What the code in this plan was run on:

- Every code block below was applied, task by task, to a scratch copy of `master` at `3baeb9b` (LF line ends) and
  run there: after each task's tests step the named tests failed as its "Expected" line says, and after its code step
  they passed. At the end `npx tsc --noEmit` was clean and `npx vitest run` read 65 files, 783 passed, 3 skipped
  (before the plan: 56 files, 666 passed, 3 skipped). The wall script was run there too (Task 4 quotes its output),
  and its files passed the content tests of Task 5.
- **That `master` already holds the two new films:** THE LOVERS (`the-lovers`, 4:3) and XIÊU LÒNG (`xieu-long`, 3:2,
  a fifth ratio), which make chapter one 14 films, and `videoCapFor` raised to 14. The edits were first written on
  `7d60769`, with 12 films and a cap of 12, and went onto the newer `master` unchanged, each finding its place by
  text. Nothing here assumes a film count, a grid, a cap, or a closed list of ratios: the
  script and the tests take the films, their ratios and their loops from `projects.json` and the folders, and the
  cap from `videoCapFor`.
- **The headless runs were made on the 12-film chapter** (a scratch build of `7d60769` with this plan's edits): the
  modes of spec §4.1 came up as designed (Tasks 10 and 15 list the readings). Where a step quotes a number from
  those runs it says so: measure again when you run the step, and trust your reading over the quoted one.
- **Edits are placed by text, never by line number.** Each one names the lines to find. If a "find" block is not in
  the file exactly once, stop: the file has moved since this plan was written. Read the file, place the change where
  its own comment says it belongs, and say so in the task's report.

---

## File structure

Created:

| File | Its one job |
|---|---|
| `src/lib/wall-files.ts` | The wall's arithmetic, pure and import-free: a film's ratio, packing, pass lengths, the shared length, the half-size rectangle, the map's and the manifest entry's types, which tiles are still good |
| `src/lib/wall-scan.ts` | Node side only: reads `public/content/walls/` and the loops on disk, and returns the manifest's `walls` and `hover` entries |
| `scripts/make-walls.mjs` | Runs ffprobe and ffmpeg; writes the two videos and the map per chapter |
| `public/content/walls/*` | The script's output, committed |
| `src/works/wall-watch.ts` | The wall's own watch (pure) and its session memory |
| `src/works/wall.ts` | The wall unit: one video, one shared source, its frame gate, the tile textures |
| `src/works/loop-health.ts` | The loops' health reading (pure; shown only in ship A) |
| `src/lib/meter.ts` | What the site itself holds: Pixi's texture bytes and the JavaScript heap (shown only) |
| `src/lib/pressure.ts` | The processor's pressure state, where the browser offers it (shown only) |
| `src/lib/readout.ts` | The readout's seven lines as pure text, and the floor's hand-over of its readings |
| `src/shell/stats.ts`, `src/styles/stats.css` | The readout's panel behind `?stats=1`, and its own sheet |
| `tests/wall-files.test.ts`, `tests/walls.test.ts`, `tests/wall-watch.test.ts`, `tests/wall.test.ts`, `tests/poster-texture.test.ts`, `tests/loop-health.test.ts`, `tests/meter.test.ts`, `tests/readout.test.ts` | Unit and content tests, one file per unit |
| `tests/floor-video.test.ts` | The source pins on the floor's wiring (this plan's own file, so `tests/floor-ways.test.ts` is left alone) |
| `tests/mp4-facts.ts` | Two readers of an MP4's boxes for `tests/walls.test.ts` |

Modified:

| File | What changes |
|---|---|
| `src/lib/quality.ts` | `<= 4`, the hardware ceiling, the weak class, the floor's mode, the own-loop cap, the stall counter, the budget, the report |
| `src/lib/content.ts` | The manifest's `walls` and `hover` entries, with `wallFor()`, `wallAssetUrl()` and `hasHoverClip()` |
| `vite.config.ts` | The manifest gains `walls` and `hover`, and is written into the build's real output folder |
| `src/works/playback.ts` | A policy: the cap by mode, which panes may play their own loop, the paused guard, the release of a sleeping pane |
| `src/works/tile.ts` | The pane's wall sprite; the hover clip asked for only when listed; the poster's texture destroyed; the loop's health sample |
| `src/works/world.ts` | The mode, the wall unit's life, pausing releases, the health reading, the readings for the readout |
| `src/works/glow.ts` | The glow drawn once on a canvas, no filter |
| `src/pages/works.ts` | One argument: the chapter, in the `WorksWorld.create(` call |
| `src/shell/shell.ts` | Loads the readout when the address asks for it |
| `package.json`, `HOW-TO-EDIT.md` | `npm run walls`, and when to run it |
| `tests/quality.test.ts`, `tests/playback.test.ts`, `tests/glow.test.ts`, `tests/video-texture.test.ts`, `tests/loop-frames.test.ts` | New cases; one pin's file list; the walls join the loops that are checked for a black frame |

## The order of work, and what may run side by side

Every task commits on its own. A "lane" is a separate git worktree made with superpowers:using-git-worktrees (run
`npm ci` in it first); a lane's commits come to `master` by rebase and fast-forward, in the order below.

| Task | What | Needs | May run beside |
|---|---|---|---|
| 1 | The ladder: `<= 4`, the ceiling, the class, the mode, the cap | nothing | 3, 4, 5, 6, 12 |
| 2 | The ladder's readings: stalls, budget, report | 1 (same file) | 3, 4, 5, 6, 12 |
| 3 | `wall-files.ts` | nothing | 1, 2, 6, 12 |
| 4 | The script; the walls built and committed; `HOW-TO-EDIT.md` | 3 (the two new films are on `master`) | 1, 2, 6, 12 |
| 5 | The manifest: `walls`, `hover`, the content tests | 4 | 1, 2, 6, 12 |
| 6 | Measure before: three profiles, six chapter flips, the hover clip's request | the commit before Task 1 | everything |
| 7 | The wall's watch and its memory | 1 | 5, 9, 12 |
| 8 | The wall unit and the pane's second sprite | 5, 7 | 9, 12 |
| 9 | The playback policy: caps, the guard, the release | 1 | 5, 7, 8, 12 |
| 10 | The world: modes wired, pausing releases | 2, 8, 9 | 12 |
| 11 | Waste: the hover clip, the poster textures | 6, 10 | 12 |
| 12 | The baked glow (comes to `master` only with the coordinator's go) | nothing | everything |
| 13 | The shown-only readings: loop health, the meter, pressure | 11 | 12 |
| 14 | The readout | 13 | 12 |
| 15 | Gates, the harness's table, the hand-over to the coordinator | all | nothing |

- **Three lanes may open at once:** the ladder (1 → 2), the wall files (3 → 4 → 5) and the glow (12). They share no
  file. Task 6 only measures and may run at any time, from a build of the commit before Task 1.
- **After the ladder lane is in:** Task 7 and Task 9 may run side by side (Task 7 creates `src/works/wall-watch.ts`
  and its test; Task 9 touches only `src/works/playback.ts` and `tests/playback.test.ts`).
- **Serial, in one lane, in this order:** 8 → 10 → 11 → 13 → 14 → 15. They all edit `src/works/tile.ts`,
  `src/works/world.ts` or `tests/floor-video.test.ts`.
- Before the first task, note the commit this plan starts from: `git rev-parse HEAD`. Task 6 and Task 12 build it for
  their "before" readings.

---

### Task 1: The ladder knows the machine's class, its ceiling and the floor's mode

**Lane:** the ladder (may run beside Tasks 3, 4, 5, 6, 12).

**Files:**
- Modify: `src/lib/quality.ts`
- Test: `tests/quality.test.ts`

**Interfaces:**
- Consumes (already in `src/lib/quality.ts`): `Tier` (`0 | 1 | 2`), `Device`, `State`, `KeyStore`, `videoCapFor(tier, narrow)`,
  `startTier(dev)`, `restoreState(...)`, `newGovernor(...)`, `pinnedTier(search)`, `readDevice()`.
- Produces, all exported from `src/lib/quality.ts`:
  - `hardwareCeiling(dev: Device): Tier`
  - `type WeakBy = 'memory' | 'threads' | 'pointer'` and `weakBy(dev: Device): WeakBy | null`
  - `dataSaver(dev: Device): boolean`
  - `openAt(st: State, max: Tier, pinned: Tier | null): { tier: Tier; ceiling: Tier }`
  - `type FloorMode = 'own' | 'wall' | 'wall-small' | 'posters' | 'starved'`
  - `type WallVerdict = 'ok' | 'small' | 'starved'`
  - `interface FloorFacts { tier; weak; pinned; dataSaver; wall; small; loopsFailed; contextLost; verdict }`
  - `floorMode(f: FloorFacts): FloorMode`
  - `modeAfterTierChange(current: FloorMode, before: Tier, after: Tier, f: FloorFacts): FloorMode`
  - `ownLoopCap(mode: FloorMode, tier: Tier, narrow: boolean): number`
  - on the `quality` object: `pinned(): Tier | null` and
    `floorFacts(wall: Pick<FloorFacts, 'wall' | 'small' | 'verdict'>): FloorFacts`

What this task changes for a visitor: a machine that reports exactly 4 GB or exactly 4 threads now opens at BALANCED
and can never reach FULL. Nothing else moves yet: the class and the mode are only worked out, and nothing reads them
until Task 10.

The spec asks the plan to list the existing test fixtures that the `<= 4` line moves (§6). There are none: no fixture
in `tests/quality.test.ts` reports exactly 4 GB or exactly 4 threads, so every existing case keeps its expectation.

- [x] **Step 1: Write the failing tests**

In `tests/quality.test.ts`, find:

```ts
import {
  DAY_MS, FAST_MEAN, HOLD_MS, LONG_FRAME, LONG_SHARE_FAST, LONG_SHARE_SLOW, REOPEN_MS, SLOW_MEAN, UP_AFTER_MS, WINDOW,
  grainIntervalFor, judge, maxFpsFor, newGovernor, pinnedTier, resolutionFor, restoreState, saveState, startTier, steer,
  videoCapFor, type Governor, type KeyStore, type Tier,
} from '../src/lib/quality';
```

Replace it with:

```ts
import {
  DAY_MS, FAST_MEAN, HOLD_MS, LONG_FRAME, LONG_SHARE_FAST, LONG_SHARE_SLOW, REOPEN_MS, SLOW_MEAN, UP_AFTER_MS, WINDOW,
  dataSaver, floorMode, grainIntervalFor, hardwareCeiling, judge, maxFpsFor, modeAfterTierChange, newGovernor, openAt,
  ownLoopCap, pinnedTier, resolutionFor, restoreState, saveState, startTier, steer, videoCapFor, weakBy,
  type FloorFacts, type FloorMode, type Governor, type KeyStore, type Tier,
} from '../src/lib/quality';
```

In `tests/quality.test.ts`, find:

```ts
describe('the governor is wired (pins)', () => {
```

Directly before it, add:

```ts
// THE WEAK CLASS AND THE FLOOR'S VIDEO (owner 2026-11-24: "the wall for weak machines only … 8 GB or less"; the first
// approval: a 4 GB, four-thread laptop "never pushed up to the heavy level"). Spec 2026-11-24-work-wall-video-design,
// §4.1 and §4.6.
describe('the weak class and the hardware ceiling', () => {
  it('8 GB or less, 4 threads or fewer, or a coarse pointer is weak; a value not reported makes nothing weak', () => {
    expect(weakBy({ coarse: false, deviceMemory: 8, hardwareConcurrency: 8 })).toBe('memory');
    expect(weakBy({ coarse: false, deviceMemory: 4, hardwareConcurrency: 16 })).toBe('memory');
    expect(weakBy({ coarse: false, deviceMemory: 16, hardwareConcurrency: 8 })).toBeNull();
    expect(weakBy({ coarse: false, hardwareConcurrency: 8 }), 'Firefox and Safari report no memory').toBeNull();
    expect(weakBy({ coarse: false, deviceMemory: 16, hardwareConcurrency: 4 })).toBe('threads');
    expect(weakBy({ coarse: false, hardwareConcurrency: 4 })).toBe('threads');
    expect(weakBy({ coarse: false })).toBeNull();
    expect(weakBy({ coarse: true })).toBe('pointer');
    expect(weakBy({ coarse: true, deviceMemory: 16, hardwareConcurrency: 8 })).toBe('pointer');
  });

  it('4 GB or less, or 4 threads or fewer, opens BALANCED and may never reach FULL', () => {
    for (const dev of [
      { coarse: false, deviceMemory: 4, hardwareConcurrency: 8 },
      { coarse: false, deviceMemory: 16, hardwareConcurrency: 4 },
      { coarse: false, deviceMemory: 4, hardwareConcurrency: 4 }, // the laptop profile, which `< 4` let open at FULL
      { coarse: false, deviceMemory: 2 },
      { coarse: false, hardwareConcurrency: 2 },
    ]) {
      expect(startTier(dev), JSON.stringify(dev)).toBe(1);
      expect(hardwareCeiling(dev), JSON.stringify(dev)).toBe(1);
    }
  });

  it('8 GB with 8 threads is weak for the floor, opens as before and keeps a FULL ceiling', () => {
    const dev = { coarse: false, deviceMemory: 8, hardwareConcurrency: 8 };
    expect(weakBy(dev)).toBe('memory');
    expect(startTier(dev)).toBe(2);
    expect(hardwareCeiling(dev)).toBe(2);
    expect(hardwareCeiling({ coarse: true }), 'a phone or a tablet may still climb').toBe(2);
    expect(hardwareCeiling({ coarse: false }), 'nothing reported').toBe(2);
  });

  it('a page opens no higher than the hardware ceiling, whatever an earlier visit remembered; the pin wins', () => {
    expect(openAt({ tier: 2, ceiling: 2, downs: [0, 0, 0] }, 1, null)).toEqual({ tier: 1, ceiling: 1 });
    expect(openAt({ tier: 0, ceiling: 1, downs: [0, 1, 1] }, 1, null)).toEqual({ tier: 0, ceiling: 1 });
    expect(openAt({ tier: 1, ceiling: 2, downs: [0, 0, 0] }, 2, null)).toEqual({ tier: 1, ceiling: 2 });
    expect(openAt({ tier: 0, ceiling: 0, downs: [0, 1, 1] }, 1, 2), '?gfx=full on any machine').toEqual({ tier: 2, ceiling: 2 });
    expect(openAt({ tier: 2, ceiling: 2, downs: [0, 0, 0] }, 2, 0)).toEqual({ tier: 0, ceiling: 0 });
  });

  it('a governor opened at the hardware ceiling never climbs past it, through a step down and its reopening too', () => {
    const SLOW = judge(frames(60, [16.7, 33.3]));
    const FAST = judge(frames(60, 16.7));
    const g = newGovernor(1, 1, 0);
    for (let t = 3000; t < 30000; t += 1000) steer(g, FAST, t);
    expect(g.tier).toBe(1);
    steer(g, SLOW, 30000); // BALANCED → LITE: the ceiling closes on LITE
    expect([g.tier, g.ceiling]).toEqual([0, 0]);
    for (let t = 34000; t < 200000; t += 1000) steer(g, FAST, t); // it reopens once, a minute later, and climbs back
    expect([g.tier, g.ceiling]).toEqual([1, 1]);
  });

  it('Save-Data or a 2g line: the visitor asked for less data, or nothing streams', () => {
    expect(dataSaver({ coarse: false, connection: { saveData: true } })).toBe(true);
    expect(dataSaver({ coarse: false, connection: { effectiveType: '2g' } })).toBe(true);
    expect(dataSaver({ coarse: true, connection: { effectiveType: 'slow-2g' } })).toBe(true);
    expect(dataSaver({ coarse: false, connection: { effectiveType: '3g' } })).toBe(false);
    expect(dataSaver({ coarse: false })).toBe(false);
  });
});

/** The floor's facts for a machine that is not weak, at FULL, with both wall files there and nothing remembered. */
const facts = (over: Partial<FloorFacts> = {}): FloorFacts => ({
  tier: 2, weak: false, pinned: null, dataSaver: false, wall: true, small: true,
  loopsFailed: false, contextLost: false, verdict: 'ok', ...over,
});

describe("the floor's mode: the class and the tier choose the video", () => {
  it('step 1: a weak machine plays the wall at every tier; any other its own loops at FULL and BALANCED, the wall at LITE', () => {
    for (const tier of TIERS) expect(floorMode(facts({ tier, weak: true })), `weak, tier ${tier}`).toBe('wall');
    expect(TIERS.map((tier) => floorMode(facts({ tier })))).toEqual(['own', 'own', 'wall']);
  });

  it('the pin: FULL sets the class aside; BALANCED and LITE keep it', () => {
    expect(floorMode(facts({ tier: 2, pinned: 2, weak: true }))).toBe('own');
    expect(floorMode(facts({ tier: 1, pinned: 1, weak: true }))).toBe('wall');
    expect(floorMode(facts({ tier: 1, pinned: 1 }))).toBe('own');
    expect(floorMode(facts({ tier: 0, pinned: 0 }))).toBe('wall');
  });

  it('step 2 (ship B hands these in): own loops that failed their watch, or a context lost in the visit, give the wall', () => {
    expect(floorMode(facts({ loopsFailed: true }))).toBe('wall');
    expect(floorMode(facts({ contextLost: true }))).toBe('wall');
    expect(floorMode(facts({ loopsFailed: true, wall: false })), 'no wall can play').toBe('posters');
    expect(floorMode(facts({ contextLost: true, dataSaver: true }))).toBe('posters');
  });

  it('step 3: a wall that is due and cannot play gives posters: no file, Save-Data, a 2g line', () => {
    expect(floorMode(facts({ weak: true, wall: false }))).toBe('posters');
    expect(floorMode(facts({ weak: true, dataSaver: true }))).toBe('posters');
    expect(floorMode(facts({ tier: 0, dataSaver: true })), "exactly today's LITE").toBe('posters');
    expect(floorMode(facts({ wall: false })), 'own loops need no wall').toBe('own');
  });

  it("step 4: a wall that plays follows its own watch; with no half-size file, posters stand in for it", () => {
    expect(floorMode(facts({ weak: true, verdict: 'small' }))).toBe('wall-small');
    expect(floorMode(facts({ weak: true, verdict: 'small', small: false }))).toBe('posters');
    expect(floorMode(facts({ weak: true, verdict: 'starved' }))).toBe('starved');
    expect(floorMode(facts({ weak: true, verdict: 'starved', small: false }))).toBe('starved');
    expect(floorMode(facts({ verdict: 'starved' })), "the verdict is the wall's: own loops are untouched").toBe('own');
  });

  it('a pinned page obeys neither watch and ignores what an earlier visit remembered', () => {
    expect(floorMode(facts({ tier: 2, pinned: 2, loopsFailed: true, contextLost: true }))).toBe('own');
    expect(floorMode(facts({ tier: 1, pinned: 1, weak: true, verdict: 'starved' }))).toBe('wall');
    expect(floorMode(facts({ tier: 0, pinned: 0, verdict: 'small' }))).toBe('wall');
    expect(floorMode(facts({ tier: 0, pinned: 0, wall: false })), 'step 3 stands').toBe('posters');
    expect(floorMode(facts({ tier: 0, pinned: 0, dataSaver: true })), 'step 3 stands').toBe('posters');
  });

  it('a step up changes no video until the floor is next built; a step down switches at once', () => {
    expect(modeAfterTierChange('wall', 0, 1, facts({ tier: 1 })), 'LITE → BALANCED: the wall stays').toBe('wall');
    expect(modeAfterTierChange('own', 1, 0, facts({ tier: 0 })), 'BALANCED → LITE, not weak').toBe('wall');
    expect(modeAfterTierChange('wall', 1, 0, facts({ tier: 0, weak: true })), 'BALANCED → LITE, weak').toBe('wall');
    expect(modeAfterTierChange('own', 2, 1, facts({ tier: 1 })), 'FULL → BALANCED, not weak').toBe('own');
  });

  it('how many panes may decode their own loop: every cell of the table', () => {
    const MODES: FloorMode[] = ['own', 'wall', 'wall-small', 'posters', 'starved'];
    // `own` takes videoCapFor as it stands (a whole chapter on a desktop, whatever that number is: this test never
    // writes it); beside a wall and in `posters`, the smaller of it and 3; `starved`, the pointed pane alone
    for (const narrow of [false, true]) {
      const own = TIERS.map((t) => videoCapFor(t, narrow));
      const beside = own.map((c) => Math.min(c, 3));
      const where = narrow ? 'a tablet, or a window under 820 px' : 'a desktop or a laptop';
      expect(MODES.map((m) => TIERS.map((t) => ownLoopCap(m, t, narrow))), where).toEqual([own, beside, beside, beside, [1, 1, 1]]);
    }
    // no machine decodes more than three loops beside a wall, and a floor of own loops keeps its whole chapter
    expect(ownLoopCap('wall', 2, false)).toBe(3);
    expect(ownLoopCap('own', 2, false)).toBe(videoCapFor(2, false));
    expect(ownLoopCap('own', 2, false)).toBeGreaterThan(3);
  });
});

```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/quality.test.ts`

Expected: FAIL. The new cases fail and every older case passes (when this plan was written: 13 failed, 43 passed). The
first failure reads `TypeError: weakBy is not a function`; the case "4 GB or less, or 4 threads or fewer, opens
BALANCED and may never reach FULL" fails with `expected 2 to be 1`, which is today's `< 4` letting a 4 GB machine
open at FULL.

- [x] **Step 3: Write the code**

In `src/lib/quality.ts`, find:

```ts
/** FULL by default on a desktop. BALANCED at most on a coarse pointer, on fewer than four cores or less than 4 GB, or
 *  on an integrated GPU. LITE on saveData or a 2g line (a visitor's own ask, or a line where nothing streams), or on
```

Replace it with:

```ts
/** FULL by default on a desktop. BALANCED at most on a coarse pointer, on four threads or fewer or 4 GB or less
 *  (hardwareCeiling: `<= 4` since 2026-11-24, `< 4` let a 4 GB, four-thread laptop open at FULL), or on an
 *  integrated GPU. LITE on saveData or a 2g line (a visitor's own ask, or a line where nothing streams), or on
```

In `src/lib/quality.ts`, find:

```ts
  if ((dev.hardwareConcurrency ?? 8) < 4 || (dev.deviceMemory ?? 8) < 4) cap(1);
  const c = dev.connection;
  if (c && (c.saveData || c.effectiveType === '2g' || c.effectiveType === 'slow-2g')) cap(0);
```

Replace it with:

```ts
  if (hardwareCeiling(dev) < 2) cap(1);
  if (dataSaver(dev)) cap(0);
```

In `src/lib/quality.ts`, find:

```ts
/* ---------------------------------------------------------------- the window's verdict -- */
```

Directly before it, add:

```ts
/* ------------------------------------------------------------------ the machine's class -- */

/** The highest tier a device may ever reach: BALANCED for a machine that reports 4 GB of memory or less, or 4 threads
 *  or fewer (owner 2026-11-24, of the old 4 GB laptop: "never pushed up to the heavy level"); FULL for any other. A
 *  value the browser does not report says nothing. Worked out from the device at every start, never from storage. */
export function hardwareCeiling(dev: Device): Tier {
  const small =
    (dev.deviceMemory !== undefined && dev.deviceMemory <= 4) ||
    (dev.hardwareConcurrency !== undefined && dev.hardwareConcurrency <= 4);
  return small ? 1 : 2;
}

/** THE WEAK CLASS (owner 2026-11-24: the combined video "for weak machines only", "8 GB or less"). A machine is weak
 *  when it reports 8 GB of memory or less, or 4 threads or fewer, or its main pointer is coarse (a tablet; a phone
 *  has its reel). The answer names the line that gave it. The class chooses the WORK floor's video (floorMode) and
 *  caps no tier. Memory is read only where it is reported: Firefox and Safari report none, and a default of 8 would
 *  make every one of their visitors weak. An old Chrome reports no value above 8, so a larger machine reads as weak
 *  there. Worked out from the device at every start, never from storage. */
export type WeakBy = 'memory' | 'threads' | 'pointer';
export function weakBy(dev: Device): WeakBy | null {
  if (dev.deviceMemory !== undefined && dev.deviceMemory <= 8) return 'memory';
  if (dev.hardwareConcurrency !== undefined && dev.hardwareConcurrency <= 4) return 'threads';
  if (dev.coarse) return 'pointer';
  return null;
}

/** Save-Data, or a 2g line: the visitor asked for less data, or nothing streams. Opens LITE (startTier) and never
 *  starts a wall video (floorMode). */
export function dataSaver(dev: Device): boolean {
  const c = dev.connection;
  return !!c && (c.saveData === true || c.effectiveType === '2g' || c.effectiveType === 'slow-2g');
}

```

In `src/lib/quality.ts`, find:

```ts
export function saveState(session: KeyStore | null, local: KeyStore | null, g: Governor, now: number): void {
  try { session?.setItem(SESSION_KEY, JSON.stringify({ tier: g.tier, ceiling: g.ceiling, downs: g.downs })); } catch { /* private mode */ }
  try { local?.setItem(DAY_KEY, JSON.stringify({ tier: g.tier, at: now })); } catch { /* private mode */ }
}
```

Directly after it, add:

```ts

/** Where a page opens: the remembered tier and ceiling, both lowered to the device's hardware ceiling (`max`), so
 *  what an earlier visit remembered cannot lift a small machine. A pin (`?gfx=`) wins over both. The governor never
 *  raises a ceiling past the one it opened with (a closed ceiling reopens one step, back to where it was), so
 *  lowering it here holds for the page's life. */
export function openAt(st: State, max: Tier, pinned: Tier | null): { tier: Tier; ceiling: Tier } {
  if (pinned !== null) return { tier: pinned, ceiling: pinned };
  return { tier: Math.min(st.tier, max) as Tier, ceiling: Math.min(st.ceiling, max) as Tier };
}
```

In `src/lib/quality.ts`, find:

```ts
/* ------------------------------------------------------------------- the live governor -- */
```

Directly before it, add:

```ts
/* -------------------------------------------------------------------- the floor's video -- */

/** What the WORK floor plays (spec 2026-11-24-work-wall-video-design, §4.1):
 *  - `own`: each pane its own loop, as since 2026-11-08;
 *  - `wall`: every pane a tile of the chapter's one wall video (works/wall.ts);
 *  - `wall-small`: the same from the half-size copy;
 *  - `posters`: a wall is due and cannot play; the panes nearest the middle play their own loops;
 *  - `starved`: the half-size copy cannot keep up either; only the pointed pane plays. */
export type FloorMode = 'own' | 'wall' | 'wall-small' | 'posters' | 'starved';

/** What the wall's own watch has found this session (works/wall-watch.ts): the full-size video keeps up (`ok`), only
 *  the half-size copy may be tried (`small`), or neither does (`starved`). */
export type WallVerdict = 'ok' | 'small' | 'starved';

export interface FloorFacts {
  tier: Tier;
  /** the weak class (weakBy), before the pin is read */
  weak: boolean;
  pinned: Tier | null;
  /** Save-Data or a 2g line (dataSaver) */
  dataSaver: boolean;
  /** the chapter has a wall video that may be tried: listed in the manifest, and not failed this session */
  wall: boolean;
  /** …and a half-size copy of it */
  small: boolean;
  /** the panes' own loops failed their health watch, in this visit or within a day. Ship B sets it; until then false */
  loopsFailed: boolean;
  /** the floor lost its WebGL context in this visit. Ship B sets it; until then false */
  contextLost: boolean;
  verdict: WallVerdict;
}

/** The floor's mode, in the spec's four steps. A pinned page takes step 1 from the pinned tier, where a pin of FULL
 *  also sets the class aside (the owner's switch for the floor as it was: every pane's own loop on any machine); it keeps
 *  step 3 and skips steps 2 and 4, so it obeys neither watch and ignores what an earlier visit remembered. */
export function floorMode(f: FloorFacts): FloorMode {
  const pinned = f.pinned !== null;
  const tier = f.pinned ?? f.tier;
  // 1. the class and the tier: a weak machine plays the wall at every tier, any other at LITE
  let due = (f.weak && f.pinned !== 2) || tier === 0;
  // 2. own loops that starved, or a lost context, make the wall due
  if (!pinned && (f.loopsFailed || f.contextLost)) due = true;
  if (!due) return 'own';
  // 3. a wall that is due and cannot play
  if (f.dataSaver || !f.wall) return 'posters';
  // 4. a wall that plays follows its own watch
  const verdict = pinned ? 'ok' : f.verdict;
  if (verdict === 'starved') return 'starved';
  if (verdict === 'small') return f.small ? 'wall-small' : 'posters';
  return 'wall';
}

/** The mode after the tier moved under a standing floor. A step up changes no video until the floor is next built,
 *  so no machine downloads the wall and then a chapter of loops in one view; a step down switches at once. `f` holds
 *  the new tier. */
export function modeAfterTierChange(current: FloorMode, before: Tier, after: Tier, f: FloorFacts): FloorMode {
  return after > before ? current : floorMode(f);
}

/** How many panes may decode their own loop: `own` takes videoCapFor as it is; beside a wall, and in `posters`, the
 *  smaller of it and 3; `starved` leaves the pointed pane alone. */
export function ownLoopCap(mode: FloorMode, tier: Tier, narrow: boolean): number {
  if (mode === 'starved') return 1;
  const cap = videoCapFor(tier, narrow);
  return mode === 'own' ? cap : Math.min(cap, 3);
}

```

In `src/lib/quality.ts`, find:

```ts
  private session: KeyStore | null = null;
  private local: KeyStore | null = null;

  tier(): Tier { return this.t; }
  label(): TierLabel { return TIER_LABELS[this.t]; }
```

Replace it with:

```ts
  private session: KeyStore | null = null;
  private local: KeyStore | null = null;
  /** the device as read at start(); before it, a machine that reports nothing */
  private dev: Device = { coarse: false };
  private pin: Tier | null = null;

  tier(): Tier { return this.t; }
  label(): TierLabel { return TIER_LABELS[this.t]; }
  /** the address's pin (`?gfx=`), or null: a pinned page is measured and obeys no watch */
  pinned(): Tier | null { return this.pin; }

  /** The ladder's half of the floor's facts; the floor adds the wall's (works/world.ts). The health flag and a lost
   *  context arrive with ship B: until then neither is ever set. */
  floorFacts(wall: Pick<FloorFacts, 'wall' | 'small' | 'verdict'>): FloorFacts {
    return {
      tier: this.t, weak: weakBy(this.dev) !== null, pinned: this.pin, dataSaver: dataSaver(this.dev),
      loopsFailed: false, contextLost: false, ...wall,
    };
  }
```

In `src/lib/quality.ts`, find:

```ts
    const pinned = pinnedTier(location.search);
    const st = restoreState(this.session, this.local, Date.now(), startTier(readDevice()));
    this.g = newGovernor(pinned ?? st.tier, pinned ?? st.ceiling, now, st.downs);
```

Replace it with:

```ts
    const pinned = pinnedTier(location.search);
    this.pin = pinned;
    this.dev = readDevice();
    const st = restoreState(this.session, this.local, Date.now(), startTier(this.dev));
    // (the hardware ceiling and the class are read from the device here, at every start, and never from storage)
    const open = openAt(st, hardwareCeiling(this.dev), pinned);
    this.g = newGovernor(open.tier, open.ceiling, now, st.downs);
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/quality.test.ts`

Expected: PASS, every case (56 when this plan was written).

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add -- src/lib/quality.ts tests/quality.test.ts
git commit -m "feat(quality): a weak class, a hardware ceiling and the floor's mode; 4 GB or four threads open BALANCED" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 2: The ladder counts stalls, knows the floor's budget and reports what it knows

**Lane:** the ladder, after Task 1 (the same file).

**Files:**
- Modify: `src/lib/quality.ts`
- Test: `tests/quality.test.ts`

**Interfaces:**
- Consumes: Task 1's `weakBy`, `dataSaver`, `hardwareCeiling`, `openAt`; the existing `HOLD_MS`, `Steer`, `TIER_LABELS`.
- Produces, exported from `src/lib/quality.ts`:
  - `STALL_MS = 250`, `STALL_GAP_MS = 5000`, `FLOOR_QUIET_MS = 4000`
  - `class StallCounter { count: number; constructor(openedAt: number); quiet(now: number, ms?: number): void; note(now: number, dt: number, afterHidden: boolean): boolean }`
  - `signalOf(moved: Steer): string | null`
  - `BUDGET_CANVAS_PX = 1366 * 768` and `budgetFor(dev: Device, canvasPixels: number): number` (MB)
  - `interface QualityReport { tier; label; ceiling; hardwareCeiling; opened; downs; governed; pinned; weak; lastSignal; stalls; discarded; device }`
  - on the `quality` object: `floorBuilt(): void`, `budget(canvasPixels: number): number`, `report(): QualityReport`
  - `window.rvlQuality.state()` now returns `quality.report()`

Ship A changes no steering. A frame over 250 ms is counted and still never reaches the governor's window; a pinned
page is measured and not steered. The last test of this task pins both in the source, because the live sampler
cannot run in a unit test.

- [x] **Step 1: Write the failing tests**

In `tests/quality.test.ts`, find:

```ts
  DAY_MS, FAST_MEAN, HOLD_MS, LONG_FRAME, LONG_SHARE_FAST, LONG_SHARE_SLOW, REOPEN_MS, SLOW_MEAN, UP_AFTER_MS, WINDOW,
  dataSaver, floorMode, grainIntervalFor, hardwareCeiling, judge, maxFpsFor, modeAfterTierChange, newGovernor, openAt,
  ownLoopCap, pinnedTier, resolutionFor, restoreState, saveState, startTier, steer, videoCapFor, weakBy,
  type FloorFacts, type FloorMode, type Governor, type KeyStore, type Tier,
```

Replace it with:

```ts
  DAY_MS, FAST_MEAN, HOLD_MS, LONG_FRAME, LONG_SHARE_FAST, LONG_SHARE_SLOW, REOPEN_MS, SLOW_MEAN, UP_AFTER_MS, WINDOW,
  StallCounter, budgetFor, dataSaver, floorMode, grainIntervalFor, hardwareCeiling, judge, maxFpsFor, modeAfterTierChange,
  newGovernor, openAt, ownLoopCap, pinnedTier, resolutionFor, restoreState, saveState, signalOf, startTier, steer,
  videoCapFor, weakBy, type FloorFacts, type FloorMode, type Governor, type KeyStore, type Tier,
```

In `tests/quality.test.ts`, find:

```ts
describe('the governor is wired (pins)', () => {
```

Directly before it, add:

```ts
// SHIP A COUNTS, SHIP B ACTS (spec §3.1): the stalls and the budget are measured and shown on the readout
// (?stats=1) and decide nothing until the old laptop has been read.
describe('what the ladder also reads: counted and shown, deciding nothing yet', () => {
  it('a frame over 250 ms is a stall, but not in the opening hold, the 4 s after a floor is built, after a hidden tab, or across a sleep', () => {
    const s = new StallCounter(1000); // the page opened at 1000 ms
    expect(s.note(2000, 400, false), 'inside the 2.5 s hold').toBe(false);
    expect(s.note(3600, 400, false)).toBe(true);
    expect(s.note(3700, 250, false), 'exactly 250 ms is no stall').toBe(false);
    expect(s.note(3800, 16.7, false)).toBe(false);
    expect(s.note(9000, 400, true), 'the first frame after the tab was hidden').toBe(false);
    expect(s.note(20000, 6000, false), 'a gap over 5 s: the machine slept').toBe(false);
    s.quiet(30000); // a floor was built
    expect(s.note(33900, 400, false), 'inside the 4 s after the build').toBe(false);
    expect(s.note(34100, 400, false)).toBe(true);
    expect(s.count).toBe(2);
  });

  it('a later quiet spell never shortens one that is running', () => {
    const s = new StallCounter(0);
    s.quiet(10000, 4000);
    s.quiet(10500, 1000);
    expect(s.note(13000, 400, false)).toBe(false);
    expect(s.note(14100, 400, false)).toBe(true);
  });

  it("the floor's budget: 96 MB at 4 GB or less, 144 for the rest of the weak class, 256 otherwise; 45% grows with the canvas", () => {
    const px = 1366 * 768;
    expect(budgetFor({ coarse: false, deviceMemory: 4, hardwareConcurrency: 4 }, px)).toBeCloseTo(96);
    expect(budgetFor({ coarse: false, deviceMemory: 8, hardwareConcurrency: 8 }, px)).toBeCloseTo(144);
    expect(budgetFor({ coarse: true }, px)).toBeCloseTo(144);
    expect(budgetFor({ coarse: false, deviceMemory: 16, hardwareConcurrency: 4 }, px), 'weak by its threads').toBeCloseTo(144);
    expect(budgetFor({ coarse: false, deviceMemory: 16, hardwareConcurrency: 16 }, px)).toBeCloseTo(256);
    expect(budgetFor({ coarse: false }, px)).toBeCloseTo(256);
    expect(budgetFor({ coarse: false }, 2 * px)).toBeCloseTo(256 * 1.45);
    expect(budgetFor({ coarse: false, deviceMemory: 4 }, 1920 * 1080)).toBeCloseTo(96 * (0.55 + (0.45 * 1920 * 1080) / px));
  });

  it('the signal that last changed the level has a name', () => {
    expect(signalOf('down')).toBe('slow frames');
    expect(signalOf('up')).toBe('fast frames');
    expect(signalOf(null)).toBeNull();
  });

  it('ship A changes no steering: a long frame is counted, and still stays out of the window (pins)', () => {
    const src = readFileSync('src/lib/quality.ts', 'utf8');
    expect(src).toContain('stalls.note(now, dt, afterHidden);');
    expect(src).toMatch(/stalls\.note\(now, dt, afterHidden\);\s+afterHidden = false;\s+if \(document\.hidden \|\| dt > 250\) return;\s+if \(!steering\) return;/);
    // a pinned page is measured and never moved; the STORY page is not sampled at all
    expect(src).toContain('if (opts.govern !== false) this.sample(pinned === null);');
    expect(src).toContain('state: () => this.report(),');
  });
});

```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/quality.test.ts`

Expected: FAIL in the new `describe` only ("what the ladder also reads: counted and shown, deciding nothing yet":
5 failed when this plan was written), beginning with `TypeError: StallCounter is not a constructor`.

- [x] **Step 3: Write the code**

In `src/lib/quality.ts`, find:

```ts
/* ---------------------------------------------------------------- the verdict travels -- */
```

Directly before it, add:

```ts
/* ------------------------------------------------------------ what the ladder also reads -- */

/** SHIP A COUNTS, SHIP B ACTS (spec 2026-11-24-work-wall-video-design, §3.1). What follows is measured and shown on
 *  the readout (`?stats=1`, lib/readout.ts) and decides nothing: each of these can lower a machine for a day, on
 *  numbers that cannot be proved on the development PC. The old laptop's reading comes first.
 *
 *  A STALL is a frame longer than STALL_MS. The sampler has always thrown such frames away, and still does (they
 *  never reach a window's verdict); now it counts them too. Not counted: frames inside the opening hold (HOLD_MS,
 *  boot residue), frames in the FLOOR_QUIET_MS after a floor is built (a load, a chapter flip, the return from THE
 *  LIST: the build's own work), the first frame after the tab was hidden, and gaps over STALL_GAP_MS (the machine
 *  slept). */
export const STALL_MS = 250;
export const STALL_GAP_MS = 5000;
export const FLOOR_QUIET_MS = 4000;

export class StallCounter {
  count = 0;
  private quietUntil: number;

  constructor(openedAt: number) {
    this.quietUntil = openedAt + HOLD_MS;
  }

  /** Nothing is counted for `ms` from `now`. A later call never shortens a spell that is running. */
  quiet(now: number, ms: number = FLOOR_QUIET_MS): void {
    this.quietUntil = Math.max(this.quietUntil, now + ms);
  }

  /** One frame of `dt` ms that ended at `now`. True when it was counted. */
  note(now: number, dt: number, afterHidden: boolean): boolean {
    if (dt <= STALL_MS || dt > STALL_GAP_MS || afterHidden || now < this.quietUntil) return false;
    this.count++;
    return true;
  }
}

/** The name of the signal behind a governor's move, as the readout shows it. */
export function signalOf(moved: Steer): string | null {
  return moved === 'down' ? 'slow frames' : moved === 'up' ? 'fast frames' : null;
}

/** THE FLOOR'S MEMORY BUDGET in MB, for what the site itself holds (lib/meter.ts: Pixi's textures and the
 *  JavaScript heap; never the machine's memory, which no browser tells a page). 96 for a machine that reports 4 GB
 *  or less, 144 for the rest of the weak class, 256 for any other, on a canvas of 1366×768. A filter's render target
 *  is sized by the canvas, so 45% of the budget grows with the canvas's pixel count. Shown on the readout, and over
 *  it nothing is shed until ship B. */
export const BUDGET_CANVAS_PX = 1366 * 768;
export function budgetFor(dev: Device, canvasPixels: number): number {
  const base = dev.deviceMemory !== undefined && dev.deviceMemory <= 4 ? 96 : weakBy(dev) !== null ? 144 : 256;
  return base * (0.55 + (0.45 * canvasPixels) / BUDGET_CANVAS_PX);
}

/** What `window.rvlQuality.state()` returns and the readout shows. */
export interface QualityReport {
  tier: Tier;
  label: TierLabel;
  ceiling: Tier;
  /** the highest tier this device may reach (hardwareCeiling) */
  hardwareCeiling: Tier;
  /** the tier this page opened at */
  opened: Tier;
  downs: number[];
  /** the sampler steers this page: false on a pinned page and on a page that governs itself (STORY) */
  governed: boolean;
  pinned: Tier | null;
  /** the weak class, by the line that gave it */
  weak: WeakBy | null;
  /** the signal that last changed the level, with the page clock's time (performance.now) */
  lastSignal: { name: string; at: number } | null;
  /** frames over STALL_MS since the page opened; null on a page that is not sampled */
  stalls: number | null;
  /** Chrome threw this tab away in the background and loaded it again (document.wasDiscarded) */
  discarded: boolean;
  device: { memory: number | null; threads: number | null; coarse: boolean; gpu: string | null; dataSaver: boolean };
}

```

In `src/lib/quality.ts`, find:

```ts
  /** the device as read at start(); before it, a machine that reports nothing */
  private dev: Device = { coarse: false };
  private pin: Tier | null = null;
```

Replace it with:

```ts
  /** the device as read at start(); before it, a machine that reports nothing */
  private dev: Device = { coarse: false };
  private pin: Tier | null = null;
  private hardMax: Tier = 2;
  private opened: Tier = 2;
  private stalls: StallCounter | null = null;
  private signal: { name: string; at: number } | null = null;
  private discarded = false;
```

In `src/lib/quality.ts`, find:

```ts
      loopsFailed: false, contextLost: false, ...wall,
    };
  }
```

Replace it with:

```ts
      loopsFailed: false, contextLost: false, ...wall,
    };
  }

  /** A floor is being built, or has just been (a load, a chapter flip, the return from THE LIST): the long frames of
   *  the next 4 s are the build's own work and are not counted as stalls. */
  floorBuilt(): void {
    this.stalls?.quiet(performance.now());
  }

  /** The floor's memory budget in MB for a canvas of `canvasPixels` (budgetFor). */
  budget(canvasPixels: number): number {
    return budgetFor(this.dev, canvasPixels);
  }

  /** What the readout and `rvlQuality.state()` show. */
  report(): QualityReport {
    const g = this.g;
    const d = this.dev;
    return {
      tier: this.t,
      label: TIER_LABELS[this.t],
      ceiling: g ? g.ceiling : this.t,
      hardwareCeiling: this.hardMax,
      opened: this.opened,
      downs: g ? [...g.downs] : [0, 0, 0],
      governed: this.governed,
      pinned: this.pin,
      weak: weakBy(d),
      lastSignal: this.signal,
      stalls: this.stalls ? this.stalls.count : null,
      discarded: this.discarded,
      device: {
        memory: d.deviceMemory ?? null, threads: d.hardwareConcurrency ?? null, coarse: d.coarse, gpu: d.gpu ?? null,
        dataSaver: dataSaver(d),
      },
    };
  }
```

In `src/lib/quality.ts`, find:

```ts
    const open = openAt(st, hardwareCeiling(this.dev), pinned);
    this.g = newGovernor(open.tier, open.ceiling, now, st.downs);
    this.apply(this.g.tier);
    saveState(this.session, this.local, this.g, Date.now());
    const g = this.g;
    (window as unknown as { rvlQuality: unknown }).rvlQuality = {
      tier: () => this.t,
      label: () => this.label(),
      set: (t: Tier) => this.set(t),
      state: () => ({ tier: g.tier, label: TIER_LABELS[g.tier], ceiling: g.ceiling, downs: [...g.downs], governed: this.governed, pinned }),
    };
    if (opts.govern !== false && pinned === null) this.sample();
  }
```

Replace it with:

```ts
    this.hardMax = hardwareCeiling(this.dev);
    const open = openAt(st, this.hardMax, pinned);
    this.opened = open.tier;
    this.discarded = (document as Document & { wasDiscarded?: boolean }).wasDiscarded === true;
    this.g = newGovernor(open.tier, open.ceiling, now, st.downs);
    this.apply(this.g.tier);
    saveState(this.session, this.local, this.g, Date.now());
    (window as unknown as { rvlQuality: unknown }).rvlQuality = {
      tier: () => this.t,
      label: () => this.label(),
      set: (t: Tier) => this.set(t),
      state: () => this.report(),
    };
    // a pinned page is measured (its stalls show on the readout) and never moved; a page that governs itself is not
    // sampled at all (the STORY city)
    if (opts.govern !== false) this.sample(pinned === null);
  }
```

In `src/lib/quality.ts`, find the block that begins:

```ts
  /** The sampler: frame intervals, a verdict every WINDOW frames, the governor's move applied live. Hidden tabs and
```

and ends, a few lines further down, with:

```ts
    requestAnimationFrame(loop);
  }
```

Replace all of it, both ends included, with:

```ts
  /** The sampler: frame intervals, a verdict every WINDOW frames, the governor's move applied live. Hidden tabs and
   *  frames over 250 ms (a tab switch, the boot screen's work) do not count toward a verdict. Such a long frame is
   *  counted as a stall and shown on the readout (StallCounter); it decides nothing until ship B. With `steering`
   *  false (a pinned page) the frames are measured and the tier never moves. */
  private sample(steering: boolean): void {
    this.governed = steering;
    const stalls = new StallCounter(performance.now());
    this.stalls = stalls;
    const iv: number[] = [];
    let last = performance.now();
    let afterHidden = document.hidden;
    document.addEventListener('visibilitychange', () => { if (document.hidden) afterHidden = true; });
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      stalls.note(now, dt, afterHidden);
      afterHidden = false;
      if (document.hidden || dt > 250) return;
      if (!steering) return;
      iv.push(dt);
      if (iv.length < WINDOW) return;
      const v = judge(iv);
      iv.length = 0;
      const g = this.g!;
      const before = g.tier;
      const moved = steer(g, v, now);
      if (moved && g.tier !== before) {
        this.signal = { name: signalOf(moved)!, at: now };
        this.apply(g.tier);
        saveState(this.session, this.local, g, Date.now());
      }
    };
    requestAnimationFrame(loop);
  }
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/quality.test.ts`

Expected: PASS, every case (61 when this plan was written).

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add -- src/lib/quality.ts tests/quality.test.ts
git commit -m "feat(quality): stalls counted, the floor's budget and a fuller report - shown, deciding nothing" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 3: The wall video's arithmetic

**Lane:** the wall files (may run beside Tasks 1, 2, 6, 12).

**Files:**
- Create: `src/lib/wall-files.ts`
- Test: `tests/wall-files.test.ts`

**Interfaces:**
- Consumes: nothing. The module has no imports and uses nothing from Node or the browser, and only TypeScript that
  Node can strip as it reads the file (no enums, no parameter properties, no namespaces): the script of Task 4
  imports it as it is.
- Produces, exported from `src/lib/wall-files.ts`:
  - `WALL_MAX_W = 1920`, `WALL_MAX_H = 1080`, `WALL_GUTTER = 4`, `WALL_FPS = 24`, `WALL_MAX_SECONDS = 30`,
    `WALL_SHORT_PASS_SECONDS = 2`
  - `interface WallRect { x; y; w; h }`, `interface WallFilm { slug; ratio; tall }`,
    `interface WallPacking { width; height; rows; rowHeight; tiles: Record<string, WallRect> }`
  - `ratioOfAspect(aspect: string): number`
  - `tileSize(film: WallFilm, rowHeight: number, gutter?: number): { w: number; h: number }`
  - `packWall(films: WallFilm[], maxW?: number, maxH?: number, gutter?: number): WallPacking | null`
  - `dropsEveryFifth(fps: number): boolean`, `passFrames(frames: number, fps: number): number`
  - `sharedLength(passes: number[], maxFrames?: number): { frames: number; shortestLastPass: number }`
  - `halfRect(r: WallRect): WallRect`
  - `interface LoopPrint { file; bytes; sha256 }`, `interface WallMapTile extends WallRect { fps; loop: LoopPrint }`,
    `interface WallMap { width; height; fps; frames; seconds; file; small; tiles }`
  - `interface WallEntryTile extends WallRect { fps }`,
    `interface WallEntry { file; small: string | null; width; height; fps; frames; tiles }`
  - `wallManifestEntry(map: WallMap, slugs: string[], loops: Record<string, LoopPrint | undefined>, has: { full: boolean; small: boolean }): WallEntry | null`
  - `readWalls(raw: unknown): Record<string, WallEntry>`

**Any number of films, any ratio.** `ratioOfAspect` reads a ratio as it is written (`W:H` is W over H), so the module
keeps no list of ratios; one test checks that it agrees with `aspectRatio` of `src/lib/content.ts` on every film in
`projects.json`, so the wall's tiles and the floor's panes cannot part. The fixtures in the test file are fixtures: two
chapters as they stood on 2026-11-24, and the first of them again with two more films, one of them 3:2.

- [x] **Step 1: Write the failing tests**

Create `tests/wall-files.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aspectRatio, parseJson, parseProjects } from '../src/lib/content';
import {
  WALL_FPS, WALL_GUTTER, WALL_MAX_H, WALL_MAX_W, WALL_SHORT_PASS_SECONDS,
  dropsEveryFifth, halfRect, packWall, passFrames, ratioOfAspect, readWalls, sharedLength, tileSize, wallManifestEntry,
  type LoopPrint, type WallFilm, type WallMap, type WallRect,
} from '../src/lib/wall-files';

// THE WALL VIDEO'S ARITHMETIC (spec 2026-11-24-work-wall-video-design, §4.2 to §4.4): one video per chapter plays
// every pane's loop as a tile. The script that builds it (scripts/make-walls.mjs), the media manifest
// (vite.config.ts) and these tests read the same pure module.

const film = (slug: string, aspect: string): WallFilm => ({ slug, ratio: ratioOfAspect(aspect), tall: ratioOfAspect(aspect) < 1 });

// FIXTURES, not the site's content: two chapters as they stood on 2026-11-24 (twelve films; five with one vertical),
// so the arithmetic is checked on real shapes whatever projects.json holds today. The site's own chapters are
// checked from the files, in tests/walls.test.ts.
const CH01 = [
  film('remnants-of-a-dream', '16:9'), film('mien-vien', '4:3'), film('far-east', '2.39:1'), film('an-hoi', '4:3'),
  film('lien-quan', '16:9'), film('soda-coast', '2.39:1'), film('electric-fish', '4:3'),
  film('soft-hours-lonely-lands', '2.39:1'), film('philia', '16:9'), film('mission-impassible', '2.39:1'),
  film('halide', '2.39:1'), film('mistchild', '2.39:1'),
];
const CH02 = [
  film('katara', '16:9'), film('the-father', '16:9'), film('forest-onsen', '16:9'), film('jaecoo-j5', '16:9'),
  film('galaxy-z-fold-8-ultra', '9:16'),
];
// each loop's frame count and frame rate, in the same order (ffprobe, 2026-11-24)
const CH01_LOOPS: Array<[number, number]> = [
  [173, 23.976], [145, 23.976], [202, 25], [291, 25], [239, 29.97], [196, 24], [103, 24], [212, 24], [447, 29.97],
  [147, 24], [190, 24], [224, 24],
];
const CH02_LOOPS: Array<[number, number]> = [[135, 24], [229, 24], [237, 24], [107, 23.976], [179, 29.97]];
// the first chapter with two more films, one of them in a fifth ratio (3:2): any count and any ratio must pack
const CH01_MORE = [...CH01, film('the-lovers', '4:3'), film('xieu-long', '3:2')];
const CH01_MORE_LOOPS: Array<[number, number]> = [...CH01_LOOPS, [200, 25], [135, 25]];

/** a tile with its gutter */
const ringed = (r: WallRect): WallRect => ({
  x: r.x - WALL_GUTTER, y: r.y - WALL_GUTTER, w: r.w + 2 * WALL_GUTTER, h: r.h + 2 * WALL_GUTTER,
});
const overlap = (a: WallRect, b: WallRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('the packing: rows of one height in a frame no larger than 1920×1080', () => {
  for (const [name, films] of [['twelve films', CH01], ['five films, one vertical', CH02], ['fourteen films, five ratios', CH01_MORE]] as const) {
    it(`${name}: every tile lies inside the frame with its gutter, and no two overlap`, () => {
      const p = packWall(films)!;
      expect(p.width).toBeLessThanOrEqual(WALL_MAX_W);
      expect(p.height).toBeLessThanOrEqual(WALL_MAX_H);
      // both sides a multiple of four: the half-size copy has even sides too
      expect(p.width % 4).toBe(0);
      expect(p.height % 4).toBe(0);
      const rects = films.map((f) => ringed(p.tiles[f.slug]));
      for (const [i, r] of rects.entries()) {
        expect(r.x, films[i].slug).toBeGreaterThanOrEqual(0);
        expect(r.y, films[i].slug).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w, films[i].slug).toBeLessThanOrEqual(p.width);
        expect(r.y + r.h, films[i].slug).toBeLessThanOrEqual(p.height);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          expect(overlap(rects[i], rects[j]), `${films[i].slug} / ${films[j].slug}`).toBe(false);
        }
      }
    });

    it(`${name}: one scale: each tile is a row high and its film's ratio wide; a tall tile is two rows and the gutters between`, () => {
      const p = packWall(films)!;
      for (const f of films) {
        const t = p.tiles[f.slug];
        expect(t.h, f.slug).toBe(f.tall ? 2 * p.rowHeight + 2 * WALL_GUTTER : p.rowHeight);
        expect(Math.abs(t.w - t.h * f.ratio), f.slug).toBeLessThanOrEqual(1);
        // every edge on an even pixel: in a 4:2:0 picture a tile's colour samples are its own
        for (const v of [t.x, t.y, t.w, t.h]) expect(v % 2, f.slug).toBe(0);
        expect(tileSize(f, p.rowHeight)).toEqual({ w: t.w, h: t.h });
      }
    });
  }

  it('the fixtures pack as worked out by hand: four rows of 262 px in 1904×1080, and two rows of 404 px in 1920×824', () => {
    const size = (films: WallFilm[]) => {
      const { width, height, rows, rowHeight } = packWall(films)!;
      return { width, height, rows, rowHeight };
    };
    expect(size(CH01)).toEqual({ width: 1904, height: 1080, rows: 4, rowHeight: 262 });
    expect(size(CH02)).toEqual({ width: 1920, height: 824, rows: 2, rowHeight: 404 });
    expect(packWall(CH02)!.tiles['galaxy-z-fold-8-ultra']).toEqual({ x: 4, y: 4, w: 460, h: 816 });
    expect(packWall(CH01)!.tiles['remnants-of-a-dream']).toMatchObject({ w: 466, h: 262 });
    // two more films fill the frame's empty corner at the same scale; a 3:2 tile is 394 px wide in a 262 px row
    expect(size(CH01_MORE)).toEqual({ width: 1904, height: 1080, rows: 4, rowHeight: 262 });
    expect(packWall(CH01_MORE)!.tiles['xieu-long']).toMatchObject({ w: 394, h: 262 });
  });

  it('any chapter packs: one film to forty, in any mix of ratios', () => {
    const ratios = ['16:9', '4:3', '2.39:1', '3:2', '1:1', '9:16', '21:9'];
    for (let n = 1; n <= 40; n++) {
      const films = Array.from({ length: n }, (_, i) => film(`f${i}`, ratios[(i * 3 + n) % ratios.length]));
      const p = packWall(films);
      expect(p, `${n} films`).not.toBeNull();
      expect(Object.keys(p!.tiles), `${n} films`).toHaveLength(n);
      expect(p!.width, `${n} films`).toBeLessThanOrEqual(WALL_MAX_W);
      expect(p!.height, `${n} films`).toBeLessThanOrEqual(WALL_MAX_H);
    }
  });

  it('no films, no packing; one film takes the tallest row that fits', () => {
    expect(packWall([])).toBeNull();
    const one = packWall([film('a', '16:9')])!;
    expect(one.rows).toBe(1);
    expect(one.tiles.a).toEqual({ x: 4, y: 4, w: 1906, h: 1072 });
    expect(packWall([film('a', '9:16')]), 'a tall tile needs two rows').toMatchObject({ rows: 2 });
  });

  it('a ratio is read as written, with no list to keep: W:H is W over H', () => {
    expect(ratioOfAspect('16:9')).toBe(16 / 9);
    expect(ratioOfAspect('4:3')).toBe(4 / 3);
    expect(ratioOfAspect('2.39:1')).toBe(2.39);
    expect(ratioOfAspect('9:16')).toBe(9 / 16);
    expect(ratioOfAspect('3:2')).toBe(1.5);
    for (const odd of ['anything else', '', '16:0', '0:9', '16/9']) expect(ratioOfAspect(odd), odd).toBe(16 / 9);
  });

  it('every film in projects.json reads the same ratio here as on the floor', () => {
    // (the script builds tiles from this reading, the floor builds panes from content.ts's: the two must not part)
    const file = fileURLToPath(new URL('../public/content/projects.json', import.meta.url));
    const projects = parseProjects(parseJson(readFileSync(file, 'utf8'), 'projects.json'));
    expect(projects.length).toBeGreaterThan(0);
    for (const p of projects) expect(ratioOfAspect(p.aspect), `${p.slug} (${p.aspect})`).toBe(aspectRatio(p.aspect));
  });

  it('the half-size copy: the same rectangle, halved', () => {
    expect(halfRect({ x: 478, y: 544, w: 466, h: 262 })).toEqual({ x: 239, y: 272, w: 233, h: 131 });
  });
});

describe('the shared length: every pane restarts together', () => {
  const passes = (loops: Array<[number, number]>) => loops.map(([n, fps]) => passFrames(n, fps));

  it('a 29.97 fps loop loses every fifth frame; slower loops keep every frame', () => {
    expect(dropsEveryFifth(29.97)).toBe(true);
    expect(dropsEveryFifth(25)).toBe(false);
    expect(passFrames(239, 29.97)).toBe(192);
    expect(passFrames(447, 29.97)).toBe(358);
    expect(passFrames(202, 25), 'a 25 fps loop runs 4% slower, frame for frame').toBe(202);
    expect(passFrames(173, 23.976)).toBe(173);
  });

  it("the fixtures' loops: 515 frames (21.46 s) and 405 (16.88 s); no pane restarts under 2 s into a pass", () => {
    const ch01 = sharedLength(passes(CH01_LOOPS));
    const ch02 = sharedLength(passes(CH02_LOOPS));
    expect(ch01).toEqual({ frames: 515, shortestLastPass: 67 });
    expect(ch02).toEqual({ frames: 405, shortestLastPass: 84 });
    // two more loops (8.00 s and 5.40 s at 25 fps) are new inputs: here the same length still serves them
    const more = sharedLength(passes(CH01_MORE_LOOPS));
    expect(more).toEqual({ frames: 515, shortestLastPass: 67 });
    for (const s of [ch01, ch02, more]) expect(s.shortestLastPass / WALL_FPS).toBeGreaterThan(WALL_SHORT_PASS_SECONDS);
  });

  it('whatever the loops, no other length up to 30 s has a longer shortest last pass', () => {
    const odd: Array<[number, number]> = [[100, 24], [333, 24], [47, 24]];
    for (const loops of [CH01_LOOPS, CH02_LOOPS, CH01_MORE_LOOPS, odd]) {
      const p = passes(loops);
      const best = sharedLength(p);
      const lastPass = (len: number) => Math.min(...p.map((n) => len % n || n));
      expect(lastPass(best.frames)).toBe(best.shortestLastPass);
      for (let len = Math.max(...p); len <= 30 * WALL_FPS; len++) {
        expect(lastPass(len), `length ${len}`).toBeLessThanOrEqual(best.shortestLastPass);
      }
    }
  });

  it('never shorter than the longest pass, never past 30 s unless one loop is; the shorter length wins a tie', () => {
    expect(sharedLength([100]), 'a pass that ends at the restart is a whole pass').toEqual({ frames: 100, shortestLastPass: 100 });
    expect(sharedLength([100, 50])).toEqual({ frames: 100, shortestLastPass: 50 });
    expect(sharedLength([300, 700]).frames).toBe(700);
    expect(sharedLength([800]), 'a loop longer than 30 s still plays whole').toEqual({ frames: 800, shortestLastPass: 800 });
    const s = sharedLength(passes(CH01_LOOPS));
    expect(s.frames).toBeGreaterThanOrEqual(Math.max(...passes(CH01_LOOPS)));
    expect(s.frames).toBeLessThanOrEqual(30 * WALL_FPS);
  });
});

describe('a wall that has gone stale: the manifest lists only the tiles that are still good', () => {
  const print = (n: number): LoopPrint => ({ file: 'preview.mp4', bytes: 1000 + n, sha256: `hash-${n}` });
  const MAP: WallMap = {
    width: 1904, height: 1080, fps: 24, frames: 515, seconds: 21.458, file: 'human.mp4', small: 'human-s.mp4',
    tiles: {
      a: { x: 4, y: 4, w: 466, h: 262, fps: 24, loop: print(1) },
      b: { x: 478, y: 4, w: 350, h: 262, fps: 25, loop: print(2) },
      c: { x: 836, y: 4, w: 626, h: 262, fps: 29.97, loop: print(3) },
    },
  };
  const disk = { a: print(1), b: print(2), c: print(3) };
  const both = { full: true, small: true };
  const slugs = ['a', 'b', 'c'];

  it('a wall built from the loops on disk lists every tile, with its rectangle and its loop frame rate', () => {
    expect(wallManifestEntry(MAP, slugs, disk, both)).toEqual({
      file: 'human.mp4', small: 'human-s.mp4', width: 1904, height: 1080, fps: 24, frames: 515,
      tiles: {
        a: { x: 4, y: 4, w: 466, h: 262, fps: 24 },
        b: { x: 478, y: 4, w: 350, h: 262, fps: 25 },
        c: { x: 836, y: 4, w: 626, h: 262, fps: 29.97 },
      },
    });
  });

  it('a changed byte length, hash or file name drops that tile, and only that tile', () => {
    const keys = (d: Record<string, LoopPrint | undefined>) => Object.keys(wallManifestEntry(MAP, slugs, d, both)!.tiles);
    expect(keys({ ...disk, b: { ...print(2), bytes: 5 } })).toEqual(['a', 'c']);
    expect(keys({ ...disk, c: { ...print(3), sha256: 'another' } })).toEqual(['a', 'b']);
    expect(keys({ ...disk, a: { ...print(1), file: 'loop.mp4' } })).toEqual(['b', 'c']);
  });

  it('a film that left the chapter loses its tile; so does a film with no loop on disk', () => {
    expect(Object.keys(wallManifestEntry(MAP, ['a', 'c'], disk, both)!.tiles)).toEqual(['a', 'c']);
    expect(Object.keys(wallManifestEntry(MAP, slugs, { a: print(1), b: undefined, c: print(3) }, both)!.tiles)).toEqual(['a', 'c']);
  });

  it('no entry without the full-size video, or with no good tile left; a missing half-size copy leaves the wall', () => {
    expect(wallManifestEntry(MAP, slugs, disk, { full: false, small: true })).toBeNull();
    expect(wallManifestEntry(MAP, [], disk, both)).toBeNull();
    expect(wallManifestEntry(MAP, slugs, {}, both)).toBeNull();
    expect(wallManifestEntry(MAP, slugs, disk, { full: true, small: false })!.small).toBeNull();
  });

  it('the manifest as the page fetches it: a well-formed entry passes, anything else is dropped', () => {
    const entry = wallManifestEntry(MAP, slugs, disk, both)!;
    expect(readWalls({ human: entry })).toEqual({ human: entry });
    expect(readWalls({ human: { ...entry, small: null } }).human.small).toBeNull();
    expect(readWalls(null)).toEqual({});
    expect(readWalls('walls')).toEqual({});
    expect(readWalls({ human: null, machine: { file: 7 }, other: { ...entry, tiles: {} } })).toEqual({});
    expect(Object.keys(readWalls({ human: { ...entry, tiles: { a: entry.tiles.a, b: { x: 'left' } } } }).human.tiles)).toEqual(['a']);
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/wall-files.test.ts`

Expected: FAIL, no test runs: `Error: Cannot find module '../src/lib/wall-files'`.

- [x] **Step 3: Write the module**

Create `src/lib/wall-files.ts`:

```ts
/** WALL FILES: the arithmetic of a chapter's wall video (docs/superpowers/specs/2026-11-24-work-wall-video-design.md,
 *  §4.2 to §4.4). How the tiles pack into one frame, how long the shared video runs, and which tiles of a built wall
 *  are still good. Pure, with no imports and nothing from Node or the browser, so the script
 *  (scripts/make-walls.mjs), the media manifest (vite.config.ts) and the tests read the same rules. Erasable
 *  TypeScript only: Node runs this file as it is. */

export const WALL_MAX_W = 1920;
export const WALL_MAX_H = 1080;
/** each tile is ringed by this many pixels of its own edge, so no neighbour's picture can show in a pane */
export const WALL_GUTTER = 4;
export const WALL_FPS = 24;
export const WALL_MAX_SECONDS = 30;
/** the script warns when a pane's last pass before the shared restart is shorter than this */
export const WALL_SHORT_PASS_SECONDS = 2;

export interface WallRect { x: number; y: number; w: number; h: number }
/** `tall`: a vertical film's tile stands two rows high, as its pane does on the floor */
export interface WallFilm { slug: string; ratio: number; tall: boolean }
/** `tiles` are the pictures' rectangles, gutters excluded */
export interface WallPacking { width: number; height: number; rows: number; rowHeight: number; tiles: Record<string, WallRect> }

/** A film's picture ratio from its `aspect` key, read as written: `W:H` is W over H ("16:9", "4:3", "2.39:1",
 *  "9:16", "3:2", and any ratio a later film brings). So this module holds no list of ratios to keep in step with
 *  content.ts's aspectRatio; a test checks the two agree on every film in projects.json. A key that is not of that
 *  form reads as 16:9, as there. */
export function ratioOfAspect(aspect: string): number {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect);
  const ratio = m ? Number(m[1]) / Number(m[2]) : NaN;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
}

/** Every tile lies on even pixels, so in a 4:2:0 picture its colour samples are its own. */
const even = (n: number): number => 2 * Math.round(n / 2);

/** A tile's picture size at a row height: a tall tile spans two rows and the two gutters between them. */
export function tileSize(film: WallFilm, rowHeight: number, gutter: number = WALL_GUTTER): { w: number; h: number } {
  const h = film.tall ? 2 * rowHeight + 2 * gutter : rowHeight;
  return { w: even(h * film.ratio), h };
}

/** One try: `rows` rows of `rowHeight`. Tall tiles first, each in the pair of rows with the most room; then the
 *  rest, widest first, each into the first row it fits. Null when something does not fit. */
function packAt(films: WallFilm[], rows: number, rowHeight: number, maxW: number, gutter: number): WallPacking | null {
  const cell = rowHeight + 2 * gutter;
  const used: number[] = new Array(rows).fill(0);
  const tiles: Record<string, WallRect> = {};
  for (const f of films.filter((x) => x.tall)) {
    if (rows < 2) return null;
    const { w, h } = tileSize(f, rowHeight, gutter);
    let at = 0;
    for (let r = 1; r < rows - 1; r++) if (Math.max(used[r], used[r + 1]) < Math.max(used[at], used[at + 1])) at = r;
    const x = Math.max(used[at], used[at + 1]);
    if (x + w + 2 * gutter > maxW) return null;
    tiles[f.slug] = { x: x + gutter, y: at * cell + gutter, w, h };
    used[at] = used[at + 1] = x + w + 2 * gutter;
  }
  const rest = films.filter((x) => !x.tall).map((f) => ({ f, ...tileSize(f, rowHeight, gutter) }));
  rest.sort((a, b) => b.w - a.w);
  for (const { f, w, h } of rest) {
    const r = used.findIndex((x) => x + w + 2 * gutter <= maxW);
    if (r < 0) return null;
    tiles[f.slug] = { x: used[r] + gutter, y: r * cell + gutter, w, h };
    used[r] += w + 2 * gutter;
  }
  // (both sides a multiple of four, so the half-size copy has even sides too)
  return { width: 4 * Math.ceil(Math.max(...used) / 4), height: 4 * Math.ceil((rows * cell) / 4), rows, rowHeight, tiles };
}

/** The packing with the tallest rows that fits a frame of `maxW` by `maxH`: every tile in its film's ratio, all at
 *  one scale. Fewer rows win a tie. Null for no films, or when nothing fits. */
export function packWall(
  films: WallFilm[], maxW: number = WALL_MAX_W, maxH: number = WALL_MAX_H, gutter: number = WALL_GUTTER,
): WallPacking | null {
  if (films.length === 0) return null;
  let best: WallPacking | null = null;
  for (let rows = 1; rows <= films.length + 1; rows++) {
    const top = 2 * Math.floor((Math.floor(maxH / rows) - 2 * gutter) / 2);
    for (let h = top; h >= 2 && (!best || h > best.rowHeight); h -= 2) {
      const p = packAt(films, rows, h, maxW, gutter);
      if (p) { best = p; break; }
    }
  }
  return best;
}

/** A 29.97 fps loop loses every fifth frame on its way to 24; slower loops keep every frame. */
export function dropsEveryFifth(fps: number): boolean {
  return fps > 27;
}

/** How many frames of the wall one pass of a loop takes. */
export function passFrames(frames: number, fps: number): number {
  return dropsEveryFifth(fps) ? frames - Math.floor(frames / 5) : frames;
}

/** The wall's length in frames: between the longest pass and `maxFrames`, the length whose shortest last pass is the
 *  longest (the shorter length on a tie). A pass that ends exactly at the restart counts as a whole pass. */
export function sharedLength(
  passes: number[], maxFrames: number = WALL_MAX_SECONDS * WALL_FPS,
): { frames: number; shortestLastPass: number } {
  const longest = Math.max(...passes);
  let best = { frames: longest, shortestLastPass: 0 };
  for (let len = longest; len <= Math.max(longest, maxFrames); len++) {
    const shortest = Math.min(...passes.map((p) => len % p || p));
    if (shortest > best.shortestLastPass) best = { frames: len, shortestLastPass: shortest };
  }
  return best;
}

/** A tile's rectangle in the half-size copy. */
export function halfRect(r: WallRect): WallRect {
  return { x: r.x / 2, y: r.y / 2, w: r.w / 2, h: r.h / 2 };
}

/** What a wall was built from: the loop's name, its length in bytes and its SHA-256. */
export interface LoopPrint { file: string; bytes: number; sha256: string }
export interface WallMapTile extends WallRect { fps: number; loop: LoopPrint }
/** `public/content/walls/<chapter>.json`, written by the script beside the two videos. */
export interface WallMap {
  width: number; height: number; fps: number; frames: number; seconds: number;
  file: string; small: string;
  tiles: Record<string, WallMapTile>;
}
export interface WallEntryTile extends WallRect { fps: number }
/** A chapter's wall as the media manifest lists it: only the tiles that are still good. `small` is null when the
 *  half-size copy is missing. */
export interface WallEntry {
  file: string; small: string | null;
  width: number; height: number; fps: number; frames: number;
  tiles: Record<string, WallEntryTile>;
}

/** The manifest's entry for a chapter. A tile is listed when its film is still in the chapter (`slugs`) and its
 *  loop on disk (`loops`) is the one the wall was built from. No entry without the full-size video, or with no good
 *  tile left. */
export function wallManifestEntry(
  map: WallMap, slugs: string[], loops: Record<string, LoopPrint | undefined>, has: { full: boolean; small: boolean },
): WallEntry | null {
  if (!has.full) return null;
  const tiles: Record<string, WallEntryTile> = {};
  for (const [slug, t] of Object.entries(map.tiles)) {
    const now = loops[slug];
    if (!slugs.includes(slug) || !now) continue;
    if (now.file !== t.loop.file || now.bytes !== t.loop.bytes || now.sha256 !== t.loop.sha256) continue;
    tiles[slug] = { x: t.x, y: t.y, w: t.w, h: t.h, fps: t.fps };
  }
  if (Object.keys(tiles).length === 0) return null;
  return {
    file: map.file, small: has.small ? map.small : null,
    width: map.width, height: map.height, fps: map.fps, frames: map.frames, tiles,
  };
}

/** The manifest's `walls` as fetched. Anything of the wrong shape is dropped, so a broken manifest gives no wall (and
 *  where one is due, the floor's `posters`) and never a broken pane. */
export function readWalls(raw: unknown): Record<string, WallEntry> {
  const out: Record<string, WallEntry> = {};
  if (!raw || typeof raw !== 'object') return out;
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  for (const [chapter, e] of Object.entries(raw as Record<string, Partial<WallEntry> | null>)) {
    if (!e || typeof e.file !== 'string' || !num(e.width) || !num(e.height) || !num(e.fps) || !num(e.frames)) continue;
    if (!e.tiles || typeof e.tiles !== 'object') continue;
    const tiles: Record<string, WallEntryTile> = {};
    for (const [slug, t] of Object.entries(e.tiles as Record<string, Partial<WallEntryTile> | null>)) {
      if (t && num(t.x) && num(t.y) && num(t.w) && num(t.h) && num(t.fps)) tiles[slug] = { x: t.x, y: t.y, w: t.w, h: t.h, fps: t.fps };
    }
    if (Object.keys(tiles).length === 0) continue;
    out[chapter] = {
      file: e.file, small: typeof e.small === 'string' ? e.small : null,
      width: e.width, height: e.height, fps: e.fps, frames: e.frames, tiles,
    };
  }
  return out;
}
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/wall-files.test.ts`

Expected: PASS, 21 tests. If "every film in projects.json reads the same ratio here as on the floor" fails, a film
has an `aspect` that `aspectRatio` in `src/lib/content.ts` does not know yet: that is the content's fault, not this
module's. Stop and tell the coordinator which film.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add -- src/lib/wall-files.ts tests/wall-files.test.ts
git commit -m "feat(walls): the wall video's arithmetic - packing, the shared length, which tiles are still good" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 4: `npm run walls` builds the wall videos, and they are committed

**Lane:** the wall files, after Task 3.

**Files:**
- Create: `scripts/make-walls.mjs`
- Create (the script's output): `public/content/walls/human.mp4`, `human-s.mp4`, `human.json`, `machine.mp4`,
  `machine-s.mp4`, `machine.json`
- Modify: `package.json`, `HOW-TO-EDIT.md`

**Interfaces:**
- Consumes: Task 3's `src/lib/wall-files.ts` (`WALL_FPS`, `WALL_GUTTER`, `WALL_SHORT_PASS_SECONDS`, `dropsEveryFifth`,
  `packWall`, `passFrames`, `ratioOfAspect`, `sharedLength`) and the existing `pickLoopFiles` of
  `src/lib/loop-files.ts`. Node imports both `.ts` files as they are (Node 22.18 or later).
- Produces: the command `npm run walls` (`node scripts/make-walls.mjs`; `--out <folder>` writes elsewhere, for a
  trial), and per chapter the files `<chapter>.mp4`, `<chapter>-s.mp4` and `<chapter>.json` (a `WallMap` of Task 3).

**The walls are built when this task runs, not before.** They are made from whatever films `projects.json` holds at
that moment, so Step 3 first checks that the tree has THE LOVERS (`the-lovers`) and XIÊU LÒNG (`xieu-long`), the two
films that joined chapter one while this plan was written. The script takes the tile layout from `projects.json` (any
count, any ratio) and the shared length from the loops on disk.

This task has no unit test of its own: the script only reads files and runs ffmpeg. Its arithmetic is Task 3's and is
tested there; what it writes is tested by Task 5's content tests and by `tests/loop-frames.test.ts`, and looked at in
Step 4 below.

- [x] **Step 1: Write the script**

Create `scripts/make-walls.mjs`:

```js
// THE WALL VIDEOS (npm run walls). One video per chapter that plays every pane's loop as a tile, a half-size copy of
// it, and a map of where each tile lies: public/content/walls/<chapter>.mp4, <chapter>-s.mp4, <chapter>.json.
// The arithmetic is src/lib/wall-files.ts; this file only reads the loops and runs ffmpeg.
// Run it after a loop is added or replaced, and after a film joins or leaves a chapter. Commit what it writes.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickLoopFiles } from '../src/lib/loop-files.ts';
import {
  WALL_FPS, WALL_GUTTER, WALL_SHORT_PASS_SECONDS, dropsEveryFifth, packWall, passFrames, ratioOfAspect, sharedLength,
} from '../src/lib/wall-files.ts';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const outFlag = process.argv.indexOf('--out');
const outDir = outFlag > 0 ? resolve(process.argv[outFlag + 1]) : join(root, 'walls');

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const tmp = mkdtempSync(join(tmpdir(), 'rvl-walls-'));
const stop = (msg) => {
  rmSync(tmp, { recursive: true, force: true });
  console.error(`make-walls: ${msg} Nothing was written.`);
  process.exit(1);
};

if (run('ffmpeg', ['-version']).status !== 0 || run('ffprobe', ['-version']).status !== 0) {
  stop('ffmpeg and ffprobe must be on the PATH (winget install Gyan.FFmpeg).');
}

/** A loop's frame count and frame rate, or null when ffprobe cannot read it. */
function probe(file) {
  const r = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=r_frame_rate,nb_read_frames', '-of', 'json', file,
  ]);
  if (r.status !== 0) return null;
  try {
    const s = JSON.parse(r.stdout).streams[0];
    const [n, d] = String(s.r_frame_rate).split('/').map(Number);
    const frames = Number(s.nb_read_frames);
    const fps = n / (d || 1);
    return frames > 0 && fps > 0 ? { frames, fps } : null;
  } catch {
    return null;
  }
}

const encode = (frames, extra) => [
  '-frames:v', String(frames), '-r', String(WALL_FPS), '-c:v', 'libx264', ...extra, '-pix_fmt', 'yuv420p',
  '-crf', '23', '-g', String(2 * WALL_FPS), '-keyint_min', String(2 * WALL_FPS), '-sc_threshold', '0', '-an', '-movflags', '+faststart',
];
const mb = (file) => (statSync(file).size / 1e6).toFixed(1);

const films = JSON.parse(readFileSync(join(root, 'projects.json'), 'utf8')).filter((e) => e && e.slug && !e.blank && !e.gap);
const built = [];
for (const chapter of ['human', 'machine']) {
  const list = films.filter((f) => (f.category === 'machine' ? 'machine' : 'human') === chapter);
  if (list.length === 0) continue;
  const tiles = [];
  for (const f of list) {
    const dir = join(root, 'projects', f.slug);
    let files = [];
    try { files = readdirSync(dir); } catch { /* no folder: reported below */ }
    const loop = pickLoopFiles(files, f.film && f.film.type === 'local' && f.film.src ? [f.film.src] : [])[0];
    if (!loop) stop(`${f.slug} has no loop file.`);
    const path = join(dir, loop);
    const p = probe(path);
    if (!p) stop(`the loop of ${f.slug} (${loop}) cannot be read.`);
    const bytes = readFileSync(path);
    const ratio = ratioOfAspect(f.aspect ?? '16:9');
    tiles.push({
      slug: f.slug, ratio, tall: ratio < 1, path, fps: p.fps, drop: dropsEveryFifth(p.fps), pass: passFrames(p.frames, p.fps),
      loop: { file: loop, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') },
    });
  }
  const pack = packWall(tiles.map(({ slug, ratio, tall }) => ({ slug, ratio, tall })));
  if (!pack) stop(`the films of ${chapter} do not fit one frame.`);
  const len = sharedLength(tiles.map((t) => t.pass));

  // each loop: every fifth frame out if it runs at 29.97, then frame for frame at 24; scaled to its tile; ringed by its
  // own edge pixels; repeated for ever from its first frame. Then every tile laid on one black frame.
  const g = WALL_GUTTER;
  const chains = [`color=c=black:s=${pack.width}x${pack.height}:r=${WALL_FPS}[bg0]`];
  tiles.forEach((t, i) => {
    const r = pack.tiles[t.slug];
    chains.push(
      `[${i}:v]${t.drop ? "select='mod(n+1,5)'," : ''}setpts=N/${WALL_FPS}/TB,fps=${WALL_FPS},` +
      `scale=${r.w}:${r.h}:flags=lanczos,setsar=1,format=yuv420p,` +
      `pad=${r.w + 2 * g}:${r.h + 2 * g}:${g}:${g},fillborders=left=${g}:right=${g}:top=${g}:bottom=${g}:mode=smear,` +
      `loop=loop=-1:size=${t.pass}:start=0,setpts=N/${WALL_FPS}/TB[t${i}]`,
      `[bg${i}][t${i}]overlay=x=${r.x - g}:y=${r.y - g}[bg${i + 1}]`,
    );
  });
  chains.push(`[bg${tiles.length}]split[full][half]`, `[half]scale=${pack.width / 2}:${pack.height / 2}:flags=area[small]`);

  const full = `${chapter}.mp4`;
  const small = `${chapter}-s.mp4`;
  const r = run('ffmpeg', [
    '-v', 'error', '-y', ...tiles.flatMap((t) => ['-i', t.path]), '-filter_complex', chains.join(';'),
    '-map', '[full]', ...encode(len.frames, ['-profile:v', 'high', '-level:v', '4.0']), join(tmp, full),
    '-map', '[small]', ...encode(len.frames, ['-profile:v', 'high']), join(tmp, small),
  ]);
  if (r.status !== 0) stop(`ffmpeg failed on ${chapter}: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ')}`);

  const map = {
    width: pack.width, height: pack.height, fps: WALL_FPS, frames: len.frames, seconds: Math.round((len.frames / WALL_FPS) * 1000) / 1000,
    file: full, small,
    tiles: Object.fromEntries(tiles.map((t) => [t.slug, { ...pack.tiles[t.slug], fps: Math.round(t.fps * 1000) / 1000, loop: t.loop }])),
  };
  writeFileSync(join(tmp, `${chapter}.json`), `${JSON.stringify(map, null, 2)}\n`);
  built.push(full, small, `${chapter}.json`);

  const last = len.shortestLastPass / WALL_FPS;
  console.log(
    `${chapter}: ${tiles.length} tiles in ${pack.rows} rows of ${pack.rowHeight} px, frame ${pack.width}x${pack.height}; ` +
    `${len.frames} frames, ${map.seconds} s; shortest last pass ${last.toFixed(2)} s; ` +
    `${full} ${mb(join(tmp, full))} MB, ${small} ${mb(join(tmp, small))} MB`,
  );
  if (last < WALL_SHORT_PASS_SECONDS) console.warn(`  warning: a pane of ${chapter} restarts ${last.toFixed(2)} s into a pass`);
}

mkdirSync(outDir, { recursive: true });
for (const f of built) copyFileSync(join(tmp, f), join(outDir, f));
rmSync(tmp, { recursive: true, force: true });
console.log(`written to ${outDir}`);
```

- [x] **Step 2: Add the command, and say in `HOW-TO-EDIT.md` when to run it**

In `package.json`, find:

```json
    "test:watch": "vitest"
```

Replace it with:

```json
    "test:watch": "vitest",
    "walls": "node scripts/make-walls.mjs"
```

In `HOW-TO-EDIT.md`, find:

```text
4. Save. Refresh the site. The new tile is on the floor.
```

Replace it with:

```text
4. Save. Refresh the site. The new tile is on the floor. Before you publish,
   run `npm run walls` once (see "Change / reorder / remove" below).
```

In `HOW-TO-EDIT.md`, find:

```text
  folder, `preview.mp4` / `loop.mp4` win first, then A→Z decides.
  `hover.mp4` and a self-hosted film file are never picked.
```

Directly after it, add:

```text
- **After any loop changes, rebuild the wall videos:** run `npm run walls`
  and publish what it writes into `public/content/walls/` (three files per
  chapter). Weaker computers and tablets play ONE combined video per chapter
  on the floor instead of every pane's own loop; this command builds it from
  the loops. Run it after you add or replace any pane's loop, and after a
  film joins or leaves a chapter. Reordering panes needs nothing. It needs
  ffmpeg (as the preview script does) and takes under a minute. If you
  forget, nothing breaks: the pane with the new loop plays its own file, the
  others keep their place in the combined video, and `npm test` names the
  film that is waiting for a rebuild.
```

- [x] **Step 3: Check that the two new films are in the tree, then build the walls**

Run:

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('public/content/projects.json','utf8'));for(const s of ['the-lovers','xieu-long'])console.log(s,p.some(e=>e&&e.slug===s));console.log(['human','machine'].map(c=>c+' '+p.filter(e=>e&&e.slug&&!e.blank&&!e.gap&&(e.category==='machine'?'machine':'human')===c).length).join(', '))"
```

Expected: `the-lovers true`, `xieu-long true`, then the film count of each chapter (`human 14, machine 5` once both
films are in). If either reads `false`, stop: the films have not landed on this tree. Tell the coordinator and wait;
do not build the walls from a chapter that is about to change.

Run: `npm run walls`

Expected: one line per chapter and a last line naming the folder, and no line beginning `make-walls:` (that is the
script stopping; nothing is written then). It takes well under a minute. Measured by the plan's author on a scratch
copy of `master` at `3baeb9b` (14 films in chapter one):

```text
human: 14 tiles in 4 rows of 262 px, frame 1904x1080; 515 frames, 21.458 s; shortest last pass 2.79 s; human.mp4 15.6 MB, human-s.mp4 5.5 MB
machine: 5 tiles in 2 rows of 404 px, frame 1920x824; 405 frames, 16.875 s; shortest last pass 3.50 s; machine.mp4 10.7 MB, machine-s.mp4 3.9 MB
```

(On the 12-film chapter the first line read `12 tiles … human.mp4 13.7 MB, human-s.mp4 4.8 MB`, with the same frame
and length.) The loops may have changed since; your reading is the one that counts.

- [x] **Step 4: Check what was built, before anything is committed**

Every one of these must hold. If one does not, do not commit: delete `public/content/walls/` (it is this task's own
output), and report the reading to the coordinator. Do not change the CRF, the frame size or a test's limit on your
own: they are the spec's numbers.

1. **The printed lines.** Each chapter's tile count is its film count from Step 3. Each frame is no larger than
   1920x1080. There is no `warning:` line. (A warning means a pane restarts less than 2 s into a pass. The spec lets
   the script warn; the owner accepted the restart with no pass that short. So a warning goes to the coordinator
   before the commit, with the line.)
2. **The streams.** Run:

   ```bash
   for f in human human-s machine machine-s; do ffprobe -v error -show_entries stream=codec_type,codec_name,profile,level,width,height,pix_fmt,r_frame_rate,nb_frames -of csv=p=0 public/content/walls/$f.mp4; done
   ```

   Expected: exactly one line per file (one video stream, no audio). Each reads `h264,High,video,<width>,<height>,
   yuv420p,<level>,24/1,<frames>`. The full-size files read level `40`; the half-size files read half the width and
   half the height of their full-size file and the same frame count. Measured on the 12-film chapter:

   ```text
   h264,High,video,1904,1080,yuv420p,40,24/1,515
   h264,High,video,952,540,yuv420p,31,24/1,515
   h264,High,video,1920,824,yuv420p,40,24/1,405
   h264,High,video,960,412,yuv420p,30,24/1,405
   ```

   (The half-size files' level is whatever the encoder gives a picture of that size: 31 and 30 here.)

3. **The lengths.** Each file's frame count in check 2 is the `frames` of its chapter's map, and `seconds` is
   `frames / 24`:

   ```bash
   node -e "for(const c of ['human','machine']){const m=JSON.parse(require('fs').readFileSync('public/content/walls/'+c+'.json','utf8'));console.log(c,m.width+'x'+m.height,m.frames,m.seconds,Object.keys(m.tiles).length+' tiles')}"
   ```

   Expected: the same sizes and frame counts as check 2, and each chapter's tile count again.
4. **The sizes.** Run: `ls -l public/content/walls/`

   Expected: each full-size file under 16,777,216 bytes (16 MB) and each half-size file under 6,291,456 bytes (6 MB).
   These are the content tests' limits (Task 5). With 14 films the author's build read 15,569,994 and 5,451,255
   bytes for chapter one: under both limits, with about 1.2 MB and 0.8 MB to spare. A fifteenth film, or a busier
   loop, can cross the first. If a file comes out over its limit, that is a finding for the coordinator, not a number
   to adjust.
5. **A key frame every 2 s.** Run:

   ```bash
   ffprobe -v error -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time -of csv=p=0 public/content/walls/human.mp4 | head -4
   ```

   Expected: `0.000000`, `2.000000`, `4.000000`, `6.000000` (the first may carry a trailing comma).
6. **A frame looked at.** Write one frame of each of the four files into a scratch folder outside the repository, and
   look at each picture (open the PNG with the Read tool; never a viewer window on the owner's PC):

   ```bash
   for f in human human-s machine machine-s; do ffmpeg -v error -y -ss 1 -i public/content/walls/$f.mp4 -frames:v 1 "<scratch folder>/$f-1s.png"; done
   ```

   What must be true in each picture: every film of the chapter has one tile, and the two new films are among them;
   every tile is a picture in its film's own ratio, not stretched and not black; the vertical film's tile stands two
   rows high; between two tiles there is a narrow band that continues each tile's own edge colour, and no line of
   one picture lies inside another; a part of the frame that no tile covers is black. Then one more frame of
   `human.mp4` from its last second (`-sseof -0.5` in place of `-ss 1`): every tile still holds a picture.

- [x] **Step 5: Commit**

```bash
git add -- scripts/make-walls.mjs package.json HOW-TO-EDIT.md public/content/walls/human.mp4 public/content/walls/human-s.mp4 public/content/walls/human.json public/content/walls/machine.mp4 public/content/walls/machine-s.mp4 public/content/walls/machine.json
git commit -m "feat(walls): npm run walls builds one video per chapter, with its half-size copy and its map" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

Then `git status --short`: nothing of this task is left, and nothing but this task's files went into the commit
(`git show --stat HEAD` lists `scripts/make-walls.mjs`, `package.json`, `HOW-TO-EDIT.md` and the six files under
`public/content/walls/`).

### Task 5: The manifest lists the walls and the hover clips, and the content tests guard them

**Lane:** the wall files, after Task 4.

**Files:**
- Create: `src/lib/wall-scan.ts`, `tests/mp4-facts.ts`, `tests/walls.test.ts`
- Modify: `vite.config.ts`, `src/lib/content.ts`, `tests/loop-frames.test.ts`

**Interfaces:**
- Consumes: Task 3's `wallManifestEntry`, `readWalls`, `LoopPrint`, `WallEntry`, `WallMap`; Task 4's files in
  `public/content/walls/`; the existing `pickLoopFiles` (`src/lib/loop-files.ts`), `scanLoops()` and the plugin
  `mediaManifest()` in `vite.config.ts`, and `loadLoopManifest()`, `CONTENT_BASE` in `src/lib/content.ts`.
- Produces:
  - `src/lib/wall-scan.ts` (Node only): `CHAPTERS` (`['human', 'machine']`),
    `chapterFilms(contentRoot: string): ChapterFilm[]`,
    `loopPrintOf(contentRoot: string, slug: string, film: string | null): LoopPrint | null`,
    `scanWalls(contentRoot: string): Record<string, WallEntry>`, `scanHover(contentRoot: string): string[]`
  - the manifest (`/content/media-manifest.json`) gains `walls` and `hover`, and a build writes it into its real
    output folder, so `npx vite build --outDir <elsewhere>` is a whole site
  - `src/lib/content.ts`: `wallFor(chapter: string): WallEntry | null`, `wallAssetUrl(file: string): string`,
    `hasHoverClip(slug: string): boolean`
  - `tests/mp4-facts.ts`: `mp4Facts(file)`, `mp4Size(file)`

`tests/content-files.test.ts` has the same two MP4 readers of its own. They are copied into `tests/mp4-facts.ts`
rather than moved, so this plan does not edit a file that the films' commits edit.

- [x] **Step 1: Write the failing tests**

Create `tests/mp4-facts.ts`:

```ts
import { readFileSync } from 'node:fs';

// Two readers of an MP4's boxes for the content tests. No ffmpeg: plain bytes. (tests/content-files.test.ts carries
// the same two of its own.)

/** An mp4's top-level boxes in file order, and the movie's length in seconds from moov/mvhd. */
export function mp4Facts(file: string): { boxes: string[]; seconds: number; bytes: number } {
  const b = readFileSync(file);
  const boxes: string[] = [];
  let seconds = NaN;
  for (let at = 0; at + 8 <= b.length; ) {
    let size = b.readUInt32BE(at);
    let head = 8;
    if (size === 1) {
      size = Number(b.readBigUInt64BE(at + 8));
      head = 16;
    } else if (size === 0) size = b.length - at;
    const type = b.toString('latin1', at + 4, at + 8);
    boxes.push(type);
    if (type === 'moov') {
      for (let c = at + head; c + 8 <= at + size; ) {
        const childSize = b.readUInt32BE(c);
        if (b.toString('latin1', c + 4, c + 8) === 'mvhd') {
          // FullBox: version, flags; then v0 = 32-bit times, v1 = 64-bit times; then timescale, duration
          const v1 = b[c + 8] === 1;
          const timescale = b.readUInt32BE(c + (v1 ? 28 : 20));
          const duration = v1 ? Number(b.readBigUInt64BE(c + 32)) : b.readUInt32BE(c + 24);
          seconds = duration / timescale;
          break;
        }
        if (childSize < 8) break;
        c += childSize;
      }
    }
    if (size < 8) break;
    at += size;
  }
  return { boxes, seconds, bytes: b.length };
}

/** An mp4's picture size from moov/trak/tkhd (16.16 fixed point): the first track that has one. */

export function mp4Size(file: string): [number, number] | null {
  const b = readFileSync(file);
  const walk = (from: number, to: number): [number, number] | null => {
    for (let at = from; at + 8 <= to; ) {
      let size = b.readUInt32BE(at);
      let head = 8;
      if (size === 1) {
        size = Number(b.readBigUInt64BE(at + 8));
        head = 16;
      } else if (size === 0) size = to - at;
      if (size < 8) return null;
      const type = b.toString('latin1', at + 4, at + 8);
      if (type === 'tkhd') {
        // FullBox; v0 = 32-bit times: width at +84, height at +88; v1 = 64-bit times: +96, +100
        const v1 = b[at + 8] === 1;
        const w = b.readUInt32BE(at + (v1 ? 96 : 84)) / 65536;
        const h = b.readUInt32BE(at + (v1 ? 100 : 88)) / 65536;
        if (w > 0 && h > 0) return [w, h];
      } else if (type === 'moov' || type === 'trak') {
        const found = walk(at + head, at + size);
        if (found) return found;
      }
      at += size;
    }
    return null;
  };
  return walk(0, b.length);
}
```

Create `tests/walls.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WallEntry, WallMap } from '../src/lib/wall-files';
import { CHAPTERS, chapterFilms, scanHover, scanWalls } from '../src/lib/wall-scan';
import { mp4Facts, mp4Size } from './mp4-facts';

// THE SHIPPED WALL VIDEOS (spec 2026-11-24-work-wall-video-design, §4.3, §4.4). `npm run walls` builds them on the
// owner's PC and they are committed: the deploy has no ffmpeg. These tests need none either. The third one is the
// guard against a wall gone stale: a loop replaced, or a film added, without a rebuild.

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const REBUILD = 'run "npm run walls" and commit public/content/walls/';
const films = chapterFilms(root);

describe('the shipped wall videos', () => {
  for (const chapter of CHAPTERS) {
    const mine = films.filter((f) => f.chapter === chapter).map((f) => f.slug);
    if (mine.length === 0) continue;
    const map = (): WallMap => JSON.parse(readFileSync(`${root}walls/${chapter}.json`, 'utf8')) as WallMap;

    it(`${chapter}: the wall, its half-size copy and its map are there`, () => {
      for (const f of [`${chapter}.mp4`, `${chapter}-s.mp4`, `${chapter}.json`]) {
        expect(existsSync(`${root}walls/${f}`), `walls/${f} is missing: ${REBUILD}`).toBe(true);
      }
    });

    it(`${chapter}: both videos play before the whole file is in, run the map's length in the map's frame, and stay light`, () => {
      const m = map();
      const full = mp4Facts(`${root}walls/${m.file}`);
      const half = mp4Facts(`${root}walls/${m.small}`);
      for (const [name, f] of [[m.file, full], [m.small, half]] as const) {
        expect(f.boxes.indexOf('moov'), `${name} faststart`).toBeGreaterThanOrEqual(0);
        expect(f.boxes.indexOf('moov'), `${name} faststart`).toBeLessThan(f.boxes.indexOf('mdat'));
        expect(f.seconds, `${name} length`).toBeCloseTo(m.seconds, 2);
      }
      expect(m.seconds).toBeCloseTo(m.frames / m.fps, 2);
      expect(m.width).toBeLessThanOrEqual(1920);
      expect(m.height).toBeLessThanOrEqual(1080);
      expect(mp4Size(`${root}walls/${m.file}`)).toEqual([m.width, m.height]);
      expect(mp4Size(`${root}walls/${m.small}`), 'one map serves both: the copy is the same frame, halved').toEqual([m.width / 2, m.height / 2]);
      expect(full.bytes, `${m.file} weight`).toBeLessThan(16 * 1024 * 1024);
      expect(half.bytes, `${m.small} weight`).toBeLessThan(6 * 1024 * 1024);
    });

    it(`${chapter}: every film has a tile built from the loop that is on disk now`, () => {
      const listed = Object.keys(scanWalls(root)[chapter]?.tiles ?? {});
      const waiting = mine.filter((slug) => !listed.includes(slug));
      expect(waiting, `a loop changed after the wall was built, or a film is new: ${REBUILD}`).toEqual([]);
    });
  }

  it('the manifest lists a hover clip for exactly the films that have one', () => {
    const have = films.map((f) => f.slug).filter((slug) => existsSync(`${root}projects/${slug}/hover.mp4`)).sort();
    expect(scanHover(root)).toEqual(have);
  });
});

describe('the page reads walls and hover clips from the manifest, and never probes for a file', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  /** lib/content.ts with a manifest of this body already loaded */
  const loaded = async (body: unknown) => {
    vi.resetModules();
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }));
    const content = await import('../src/lib/content');
    await content.loadLoopManifest();
    return content;
  };
  const entry: WallEntry = {
    file: 'human.mp4', small: 'human-s.mp4', width: 1904, height: 1080, fps: 24, frames: 515,
    tiles: { halide: { x: 4, y: 4, w: 626, h: 262, fps: 24 } },
  };

  it('a listed wall and a listed hover clip are found; nothing else is', async () => {
    const c = await loaded({ projects: {}, home: [], stills: {}, walls: { human: entry }, hover: ['katara'] });
    expect(c.wallFor('human')).toEqual(entry);
    expect(c.wallFor('machine')).toBeNull();
    expect(c.hasHoverClip('katara')).toBe(true);
    expect(c.hasHoverClip('halide')).toBe(false);
    expect(c.wallAssetUrl('human-s.mp4')).toBe('/content/walls/human-s.mp4');
  });

  it('an older manifest, a broken entry or no manifest at all: no wall, and no hover clip is asked for', async () => {
    const old = await loaded({ projects: {}, home: [], stills: {} });
    expect(old.wallFor('human')).toBeNull();
    expect(old.hasHoverClip('katara')).toBe(false);
    const broken = await loaded({ walls: { human: { file: 'human.mp4' } }, hover: 'katara' });
    expect(broken.wallFor('human')).toBeNull();
    expect(broken.hasHoverClip('katara')).toBe(false);
    vi.resetModules();
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    const none = await import('../src/lib/content');
    await none.loadLoopManifest();
    expect(none.wallFor('human')).toBeNull();
    expect(none.hasHoverClip('katara')).toBe(false);
  });
});
```

In `tests/loop-frames.test.ts`, find:

```ts
/** Every loop the site plays: each film's videos and the homepage reel's, as paths under public/content. */
```

Replace it with:

```ts
/** Every loop the site plays: each film's videos, the homepage reel's and the chapters' wall videos (a black frame at
 *  a wall's wrap would flash on every pane at once), as paths under public/content. */
```

In `tests/loop-frames.test.ts`, find:

```ts
  return [...films.flatMap((d) => videos(`projects/${d.name}`)), ...videos('home')];
```

Replace it with:

```ts
  return [...films.flatMap((d) => videos(`projects/${d.name}`)), ...videos('home'), ...videos('walls')];
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/walls.test.ts tests/loop-frames.test.ts`

Expected: `tests/walls.test.ts` FAILS with `Error: Cannot find module '../src/lib/wall-scan'`.
`tests/loop-frames.test.ts` PASSES already (it needs ffmpeg and takes about half a minute): it now also decodes the
first frame and the last quarter second of the four wall videos, and none is black. A failure that names a file
under `walls/` is real: the wall begins or ends on a black frame, and Task 4's output must not ship. Tell the
coordinator.

- [x] **Step 3: Write the scan, and wire it into the manifest and the page's reader**

Create `src/lib/wall-scan.ts`:

```ts
/** WALL SCAN: what the media manifest says about the wall videos and the hover clips (spec
 *  2026-11-24-work-wall-video-design, §4.4). NODE ONLY: the manifest plugin (vite.config.ts) and the content tests
 *  import it; nothing the browser loads may. The rules themselves are pure and live in lib/wall-files.ts. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pickLoopFiles } from './loop-files';
import { wallManifestEntry, type LoopPrint, type WallEntry, type WallMap } from './wall-files';

/** a chapter is a film's `category` */
export const CHAPTERS = ['human', 'machine'] as const;

export interface ChapterFilm { slug: string; chapter: string; film: string | null }

/** The films of projects.json (held places and gaps left out), each with its chapter and its self-hosted film file,
 *  which is never taken for the loop. */
export function chapterFilms(contentRoot: string): ChapterFilm[] {
  type Row = { slug?: unknown; blank?: unknown; gap?: unknown; category?: unknown; film?: { type?: unknown; src?: unknown } | null } | null;
  try {
    const parsed = JSON.parse(readFileSync(join(contentRoot, 'projects.json'), 'utf8')) as unknown;
    const out: ChapterFilm[] = [];
    for (const e of (Array.isArray(parsed) ? parsed : []) as Row[]) {
      if (!e || typeof e.slug !== 'string' || e.blank || e.gap) continue;
      const src = e.film?.type === 'local' && typeof e.film.src === 'string' ? e.film.src : null;
      out.push({ slug: e.slug, chapter: e.category === 'machine' ? 'machine' : 'human', film: src });
    }
    return out;
  } catch {
    return [];
  }
}

/** hashes kept by size and time of change: the dev server answers the manifest on every page load */
const hashes = new Map<string, { bytes: number; mtimeMs: number; sha256: string }>();

/** A film's loop as it is on disk now (the first file the loop rules pick): its name, its byte length and its
 *  SHA-256. Null when the folder holds no loop. */
export function loopPrintOf(contentRoot: string, slug: string, film: string | null): LoopPrint | null {
  const dir = join(contentRoot, 'projects', slug);
  try {
    const file = pickLoopFiles(readdirSync(dir), film ? [film] : [])[0];
    if (!file) return null;
    const path = join(dir, file);
    const st = statSync(path);
    const kept = hashes.get(path);
    if (kept && kept.bytes === st.size && kept.mtimeMs === st.mtimeMs) return { file, bytes: st.size, sha256: kept.sha256 };
    const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    hashes.set(path, { bytes: st.size, mtimeMs: st.mtimeMs, sha256 });
    return { file, bytes: st.size, sha256 };
  } catch {
    return null;
  }
}

/** The manifest's `walls`: for each chapter with a built wall, only the tiles whose loop on disk is still the one the
 *  wall was built from and whose film is still in the chapter. A chapter with no map, no full-size video or no good
 *  tile gets no entry. */
export function scanWalls(contentRoot: string): Record<string, WallEntry> {
  const out: Record<string, WallEntry> = {};
  const films = chapterFilms(contentRoot);
  const dir = join(contentRoot, 'walls');
  for (const chapter of CHAPTERS) {
    try {
      const map = JSON.parse(readFileSync(join(dir, `${chapter}.json`), 'utf8')) as WallMap;
      const mine = films.filter((f) => f.chapter === chapter);
      const loops: Record<string, LoopPrint | undefined> = {};
      for (const f of mine) loops[f.slug] = loopPrintOf(contentRoot, f.slug, f.film) ?? undefined;
      const entry = wallManifestEntry(map, mine.map((f) => f.slug), loops, {
        full: existsSync(join(dir, String(map.file))), small: existsSync(join(dir, String(map.small))),
      });
      if (entry) out[chapter] = entry;
    } catch { /* no map, or not a map: no wall for this chapter */ }
  }
  return out;
}

/** The manifest's `hover`: the films whose folder holds a `hover.mp4`. A pane asks for the clip only when its film is
 *  listed (works/tile.ts). */
export function scanHover(contentRoot: string): string[] {
  return chapterFilms(contentRoot)
    .map((f) => f.slug)
    .filter((slug) => existsSync(join(contentRoot, 'projects', slug, 'hover.mp4')))
    .sort();
}
```

In `vite.config.ts`, find:

```ts
import { basename } from 'node:path';
```

Replace it with:

```ts
import { basename, join, resolve } from 'node:path';
```

In `vite.config.ts`, find:

```ts
import { pickLoopFiles } from './src/lib/loop-files';
```

Directly after it, add:

```ts
import { scanHover, scanWalls } from './src/lib/wall-scan';
```

In `vite.config.ts`, find:

```ts
function mediaManifest(): Plugin {
  return {
    name: 'revachol-media-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/content/media-manifest.json')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(scanLoops()));
      });
    },
    closeBundle() {
      const dist = p('dist/content/');
      if (existsSync(dist)) writeFileSync(`${dist}media-manifest.json`, JSON.stringify(scanLoops()));
    },
  };
}
```

Replace it with:

```ts
/** The whole manifest: the loops, the reel and the stills (scanLoops), then each chapter's wall video with only the
 *  tiles that are still good, and the films that have a hover clip (src/lib/wall-scan.ts):
 *  { projects, home, stills, walls, hover }. The pages read walls and hover clips from here and never probe. */
function scanMedia() {
  const root = p('public/content/');
  return { ...scanLoops(), walls: scanWalls(root), hover: scanHover(root) };
}

function mediaManifest(): Plugin {
  // the build's real output folder: `vite build --outDir <elsewhere>` gets its manifest too
  let outDir = p('dist/');
  return {
    name: 'revachol-media-manifest',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/content/media-manifest.json')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(scanMedia()));
      });
    },
    closeBundle() {
      const dir = join(outDir, 'content');
      if (existsSync(dir)) writeFileSync(join(dir, 'media-manifest.json'), JSON.stringify(scanMedia()));
    },
  };
}
```

In `src/lib/content.ts`, find:

```ts
export interface NavItem { label: string; href: string }
```

Directly before it, add:

```ts
import { readWalls, type WallEntry } from './wall-files';

```

In `src/lib/content.ts`, find:

```ts
let homeManifest: string[] | null | undefined;
let stillsManifest: Record<string, string[]> | null | undefined;
```

Replace it with:

```ts
let homeManifest: string[] | null | undefined;
let stillsManifest: Record<string, string[]> | null | undefined;
/** each chapter's wall video, and the films that have a hover clip: empty until a manifest lists them */
let wallsManifest: Record<string, WallEntry> = {};
let hoverManifest: string[] = [];
```

In `src/lib/content.ts`, find:

```ts
    const data = (await res.json()) as {
      projects?: Record<string, string[]>;
      home?: string[];
      stills?: Record<string, string[]>;
    };
    loopManifest = data.projects ?? null;
    homeManifest = Array.isArray(data.home) ? data.home : null;
    stillsManifest = data.stills ?? null;
```

Replace it with:

```ts
    const data = (await res.json()) as {
      projects?: Record<string, string[]>;
      home?: string[];
      stills?: Record<string, string[]>;
      walls?: unknown;
      hover?: unknown;
    };
    loopManifest = data.projects ?? null;
    homeManifest = Array.isArray(data.home) ? data.home : null;
    stillsManifest = data.stills ?? null;
    wallsManifest = readWalls(data.walls);
    hoverManifest = Array.isArray(data.hover) ? data.hover.filter((s): s is string => typeof s === 'string') : [];
```

In `src/lib/content.ts`, find:

```ts
/** Candidate urls for a project's loop clip, in probe order: every video the
```

Directly before it, add:

```ts
/** A chapter's wall video as the manifest lists it (one video that plays every pane's loop as a tile: lib/wall-files.ts,
 *  works/wall.ts), with only the tiles that are still good. Null without a manifest, without a built wall, or with no
 *  good tile left. The floor reads walls only from here and never probes for a file. */
export function wallFor(chapter: string): WallEntry | null {
  return wallsManifest[chapter] ?? null;
}

export function wallAssetUrl(file: string): string {
  return `${CONTENT_BASE}/walls/${encodeURIComponent(file)}`;
}

/** Whether a film has a hover clip (`hover.mp4`), as the manifest lists it. Without a manifest none is listed, and a
 *  pane asks for none: an unlisted clip used to cost every pane's first hover a failed request and a reloaded loop. */
export function hasHoverClip(slug: string): boolean {
  return hoverManifest.includes(slug);
}

```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/walls.test.ts tests/wall-files.test.ts`

Expected: PASS. If "every film has a tile built from the loop that is on disk now" fails, its message names the
films: a loop changed after Task 4 built the walls. Run `npm run walls` again, repeat Task 4's Step 4, and commit the
rebuilt files with this task.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Build into a scratch folder and read the manifest**

Run (the folder is outside the repository; never `dist`):

```bash
npx vite build --outDir "<scratch folder>/build" --emptyOutDir
node -e "const m=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(Object.keys(m).join(' '));for(const c of Object.keys(m.walls))console.log(c,m.walls[c].file,m.walls[c].small,Object.keys(m.walls[c].tiles).length+' tiles');console.log('hover',JSON.stringify(m.hover))" "<scratch folder>/build/content/media-manifest.json"
```

Expected: `projects home stills walls hover`; then `human human.mp4 human-s.mp4 <its film count> tiles` and
`machine machine.mp4 machine-s.mp4 <its film count> tiles`; then `hover []` (no film has a hover clip today; a film
that gets one is listed here by its slug).

- [x] **Step 6: Commit**

```bash
git add -- src/lib/wall-scan.ts vite.config.ts src/lib/content.ts tests/mp4-facts.ts tests/walls.test.ts tests/loop-frames.test.ts
git commit -m "feat(manifest): the walls and the hover clips are listed at build time; content tests guard a stale wall" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 6: Measure the floor as it is, before the waste is removed

**Lane:** any; it writes nothing into `src`. It builds the commit this plan started from, so it may run while other
tasks are under way.

**Files:**
- Modify: this plan file only (the readings go into the table at the end of this task).

**Interfaces:**
- Consumes: the measuring harness, and a build of the starting commit.
- Produces: the "before" readings that Tasks 11, 12 and 15 compare against.

The spec says three of its facts come from reading code and were never measured (§11): that poster textures outlive
a chapter flip, that every pane's first hover asks for a `hover.mp4` no film has, and how two of the three laptop
profiles open today (§7.1, "not measured"). This task measures them, so each fix that follows stands on a number.

**The harness.** It is not in the repository and never will be: the repository is public and the harness holds
local paths. The coordinator gives you its place; write no path of it into any file or commit. What it does, so that
it can be rebuilt from this page if it is ever lost:

- It serves a built site from loopback with a small static server that answers `Range` requests (a video will not
  loop without them) and can be told to answer 404 for one path.
- It starts Chrome headless with a throwaway profile folder, muted, with autoplay allowed and a fixed window size,
  and talks to it over the DevTools protocol. No window opens. On the development PC the tool that runs it must have
  its own sandbox off and Chrome needs `--no-sandbox`; nothing else needs either.
- A **profile** is a script added with `Page.addScriptToEvaluateOnNewDocument` that makes `navigator.deviceMemory` and
  `navigator.hardwareConcurrency` answer a given value and makes WebGL's unmasked renderer string name an integrated
  laptop GPU; with it go a 1366×768 viewport and `Emulation.setCPUThrottlingRate` at 6. The three profiles: 4 GB and
  4 threads; 8 GB and 8 threads; 16 GB and 8 threads. "The development PC as it is" has no such script and no
  slowing.
- It waits for `window.rvlBooted`, then reads the page: `rvlQuality.state()` for the tier, and `rvlWorld` for the
  floor (`rvlWorld.app.renderer.texture.managedTextures.filter(Boolean)` is Pixi's list of live textures; an
  unloaded texture leaves a `null` in it).
- It counts live canvases with `HeapProfiler.collectGarbage`, then `Runtime.queryObjects` on
  `HTMLCanvasElement.prototype` with an `objectGroup`, then `Runtime.releaseObjectGroup` for that group. **Release the
  group after every count.** Without it the count itself keeps every canvas it has listed alive, and every flip seems
  to leak (this happened while the plan was written).
- It flips the chapter by clicking `button[data-ch][aria-pressed="false"]`, and waits 7 s for the new floor.
- It records every request path the static server sees.

- [x] **Step 1: Build the starting commit in a throwaway worktree**

```bash
git worktree add --detach "<scratch folder>/before" <the commit noted before Task 1>
cd "<scratch folder>/before" && npm ci && npx vite build
```

Expected: `✓ built in …`. Serve `<scratch folder>/before/dist`. (This `dist` is the throwaway worktree's own, so the
`EPERM` quirk of the main checkout's `dist` does not arise; and at the starting commit only a build into `dist` gets
its media manifest, which Task 5 changes.)

- [x] **Step 2: How the three profiles open today**

For each of the three profiles, a fresh browser, `/works.html`: read `rvlQuality.state().label` 2 s, 15 s and 60 s
after `rvlBooted`.

Known from the spec (§7.1): the 4 GB profile reads `balanced`, `full`, `full`. Write down all three profiles.

- [x] **Step 3: Six chapter flips**

The 4 GB profile, `/works.html`. After 8 s, count the live canvases and the live textures. Then flip six times; after
each flip count again.

What the plan's author measured on 2026-11-24 (the 12-film chapter): canvases 17, then 22, 35, 39, 52, 56, 69 after
the six flips. Every poster canvas of every floor that had been built was still alive (24 of 640×360, 24 of 640×267,
12 of 640×480, 3 of 413×734), about 58 MB of pixels against 14 MB at the start. Your counts will differ with the
film count; what matters is whether they grow from flip to flip.

- [x] **Step 4: The hover clip's request**

The development PC as it is, 1920×1080, `/works.html`. After 9 s move the pointer, 1.8 s apart, to five places:
(30%, 40%), (50%, 50%), (70%, 45%), (45%, 70%), (62%, 62%) of the window. Count the requests whose path ends in
`hover.mp4`, and all requests ending in `.mp4`.

What the plan's author measured: 3 requests for `hover.mp4` (the pointer crossed three panes), each answered 404, and
14 video requests in all where 11 loops were playing: each failed hover clip made its pane load its loop again.

- [x] **Step 5: The glow's cost today**

The development PC as it is, 1366×768, `/works.html?gfx=full`. After 9 s move the pointer to the middle of the
window, wait 2.5 s, and list the sizes of the live textures
(`rvlWorld.app.renderer.texture.managedTextures.filter(Boolean).map((s) => s.pixelWidth + 'x' + s.pixelHeight)`).

What the plan's author measured: four textures of 2048×1024, three of 1024×1024 and three of 1024×512 among them.
They are the render targets of the blur filters, about 50 MB. Task 12 is measured against this.

- [x] **Step 6: Write the readings into this plan, remove the worktree, commit the plan**

The readings, taken on 2026-11-24 on a build of the starting commit (the 14-film chapter), two runs each with the
same answer:

- The 4 GB profile's tier at 2 s, 15 s, 60 s: balanced, lite, lite (it steps down 4.4 to 5.1 s after boot, while the
  14 loops start; the step down shuts the ceiling at LITE for 60 s, so it was still shut at the last reading)
- The 8 GB profile's tier at 2 s, 15 s, 60 s: balanced, lite, lite (down at 4.2 to 4.3 s)
- The 16 GB profile's tier at 2 s, 15 s, 60 s: balanced, lite, lite (down at 4.3 to 4.9 s)
- Six flips, live canvases after each (and textures): canvases 19, then 23, 38, 42, 57, 61, 76 (they grow: every
  poster canvas of every floor that was built stays alive, 12.3 MB of poster pixels at the start and 63.1 MB after
  six flips); Pixi's live textures 71, then 25, 56, 25, 56, 26, 56 (they do not grow)
- First hovers, requests for `hover.mp4` of panes pointed at: 3, each answered 404; 17 `.mp4` requests in all with 14
  loops playing; each failed hover clip loaded its pane's loop into its element again (from the media cache, with no
  new request), so that pane's loop restarts
- Filter targets with one pane pointed at, at FULL: 15 pooled render targets, 60 MB: three each of 2048×1024,
  2048×512, 1024×1024, 512×1024 and 1024×512; the 12 that are not 2048×1024 (36 MB) are the blur passes' own

This is not what the spec's §7.1 has for the 4 GB profile (balanced, full, full). With 14 loops starting under the
slowing, every profile meets one slow window in its first five seconds and drops to LITE, where 3 panes play. The
tier after 60 s was not read. The development PC as it is stayed at FULL in every reading.

After Task 11, the same two runs on a build with its fix:

- Six flips, live canvases after each (and textures): canvases 21, then 13, 22, 12, 22, 12, 22 (no growth); textures
  53, then 28, 51, 23, 51, 23, 51
- First hovers, requests for `hover.mp4` of panes pointed at: none; 14 `.mp4` requests in all, the 14 loops, all 14
  playing

```bash
git worktree remove --force "<scratch folder>/before"
git add -- docs/superpowers/plans/2026-11-24-work-wall-video-ship-a.md
git commit -m "docs(plan): ship A, the floor measured before the waste is removed" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 7: The wall's own watch, and what it remembers for the session

**Lane:** after Task 1 (may run beside Tasks 5, 9, 12).

**Files:**
- Create: `src/works/wall-watch.ts`
- Test: `tests/wall-watch.test.ts`

**Interfaces:**
- Consumes: `KeyStore` (already in `src/lib/quality.ts`) and Task 1's `WallVerdict`.
- Produces, exported from `src/works/wall-watch.ts`:
  - `WATCH_EVERY_MS = 2000`, `WATCH_GRACE_MS = 4000`, `WATCH_FOR_MS = 6000`, `WALL_MIN_FPS = 18`,
    `SMALL_MIN_FPS = 12`, `NO_FRAME_MS = 8000`
  - `class WallWatch { fps: number | null; constructor(minFps: number, startedAt: number); read(now: number, presented: number, hidden: boolean): boolean }`
    (`read` returns true when the video has been under its line for `WATCH_FOR_MS`)
  - `interface WallMemory { verdict: WallVerdict; failed: string[] }`, `WALL_KEY = 'rvl-wall'`
  - `readWallMemory(store: KeyStore | null): WallMemory`, `writeWallMemory(store: KeyStore | null, m: WallMemory): void`,
    `sessionStore(): KeyStore | null`

- [x] **Step 1: Write the failing tests**

Create `tests/wall-watch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { KeyStore } from '../src/lib/quality';
import {
  SMALL_MIN_FPS, WALL_KEY, WALL_MIN_FPS, WATCH_EVERY_MS, WallWatch, readWallMemory, writeWallMemory,
} from '../src/works/wall-watch';

// THE WALL'S OWN WATCH (spec 2026-11-24-work-wall-video-design, §4.5): under 18 presented frames a second for 6 s,
// the wall video gives way to its half-size copy; under 12 for 6 s, the copy gives way too.

/** Readings every 2 s from `from`, the video presenting `fps[i]` frames a second in the i-th interval. Returns what
 *  each reading answered. */
function run(watch: WallWatch, from: number, fps: number[], hidden: boolean[] = []): boolean[] {
  let presented = 0;
  const out = [watch.read(from, presented, hidden[0] ?? false)];
  fps.forEach((f, i) => {
    presented += (f * WATCH_EVERY_MS) / 1000;
    out.push(watch.read(from + (i + 1) * WATCH_EVERY_MS, presented, hidden[i + 1] ?? false));
  });
  return out;
}

describe("the wall's own watch", () => {
  it('six seconds under 18 frames a second moves down; five readings at 24 do not', () => {
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [24, 24, 24, 24, 24])).toEqual([false, false, false, false, false, false]);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [10, 10, 10])).toEqual([false, false, false, true]);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [17.5, 17.5, 17.5]).at(-1), 'just under the line').toBe(true);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [18, 18, 18]).at(-1), 'on the line').toBe(false);
  });

  it('a single bad reading does not, and a good one starts the count again', () => {
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [24, 5, 24, 24]).includes(true)).toBe(false);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 24, 5, 5]).includes(true)).toBe(false);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 24, 5, 5, 5]).at(-1)).toBe(true);
  });

  it('the first 4 s after a video starts are not judged', () => {
    // readings at 0, 2, 4, 6, 8, 10 s: the video stalls for its first seconds, then plays
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 0, [0, 0, 24, 24, 24]).includes(true)).toBe(false);
    // it never gets going: the first judged interval is 4 to 6 s, so the verdict comes at 10 s
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 0, [0, 0, 0, 0, 0])).toEqual([false, false, false, false, false, true]);
  });

  it('a hidden page is not judged, and the count starts afresh when it shows again', () => {
    const hidden = [false, false, true, true, false, false, false];
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 0, 0, 5, 5], hidden).includes(true)).toBe(false);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 0, 0, 5, 5, 5, 5], [...hidden, false, false]).at(-1)).toBe(true);
  });

  it('the half-size copy is held to 12 frames a second, and the reading is kept for the readout', () => {
    const w = new WallWatch(SMALL_MIN_FPS, 0);
    expect(run(w, 4000, [14, 14, 14, 14]).includes(true)).toBe(false);
    expect(w.fps).toBeCloseTo(14);
    expect(run(new WallWatch(SMALL_MIN_FPS, 0), 4000, [11, 11, 11]).at(-1)).toBe(true);
    expect(new WallWatch(SMALL_MIN_FPS, 0).fps).toBeNull();
  });
});

describe("the wall's memory lasts the session", () => {
  const store = (init: Record<string, string> = {}): KeyStore => {
    const m = new Map(Object.entries(init));
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
  };
  const broken: KeyStore = {
    getItem: () => { throw new Error('private mode'); },
    setItem: () => { throw new Error('private mode'); },
  };

  it('nothing remembered: the wall is tried', () => {
    expect(readWallMemory(store())).toEqual({ verdict: 'ok', failed: [] });
    expect(readWallMemory(null)).toEqual({ verdict: 'ok', failed: [] });
  });

  it('a move down and a failed file are written and read back', () => {
    const s = store();
    writeWallMemory(s, { verdict: 'small', failed: ['human.mp4'] });
    expect(readWallMemory(s)).toEqual({ verdict: 'small', failed: ['human.mp4'] });
  });

  it('garbage and a throwing storage read as nothing remembered; writing into one is quiet', () => {
    expect(readWallMemory(store({ [WALL_KEY]: '{oops' }))).toEqual({ verdict: 'ok', failed: [] });
    expect(readWallMemory(store({ [WALL_KEY]: JSON.stringify({ verdict: 'tiny', failed: [] }) }))).toEqual({ verdict: 'ok', failed: [] });
    expect(readWallMemory(store({ [WALL_KEY]: JSON.stringify({ verdict: 'starved', failed: ['a.mp4', 7] }) }))).toEqual({ verdict: 'starved', failed: ['a.mp4'] });
    expect(readWallMemory(broken)).toEqual({ verdict: 'ok', failed: [] });
    expect(() => writeWallMemory(broken, { verdict: 'small', failed: [] })).not.toThrow();
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/wall-watch.test.ts`

Expected: FAIL, no test runs: `Error: Cannot find module '../src/works/wall-watch'`.

- [x] **Step 3: Write the module**

Create `src/works/wall-watch.ts`:

```ts
import type { KeyStore, WallVerdict } from '../lib/quality';

/** THE WALL'S OWN WATCH (spec 2026-11-24-work-wall-video-design, §4.5). One 1920×1080 video is light for most
 *  machines and too much for some: an old laptop's video chip may not hold it at 24 frames a second. So the wall unit
 *  (works/wall.ts) reads, every WATCH_EVERY_MS, how many frames its video has presented. Under its line for
 *  WATCH_FOR_MS, the video gives way: the full-size wall (WALL_MIN_FPS) to its half-size copy, the copy
 *  (SMALL_MIN_FPS) to `starved`. The first WATCH_GRACE_MS after a video starts are not judged, and nor is a hidden
 *  page. A move down is remembered for the session, so the next page does not try again.
 *
 *  Pure, and tested (tests/wall-watch.test.ts). */
export const WATCH_EVERY_MS = 2000;
export const WATCH_GRACE_MS = 4000;
export const WATCH_FOR_MS = 6000;
export const WALL_MIN_FPS = 18;
export const SMALL_MIN_FPS = 12;
/** a wall video that has presented no frame after this long has failed */
export const NO_FRAME_MS = 8000;

export class WallWatch {
  /** frames presented a second over the last reading; null until two readings stand */
  fps: number | null = null;
  private last: { at: number; presented: number } | null = null;
  private underSince: number | null = null;

  constructor(private readonly minFps: number, private readonly startedAt: number) {}

  /** One reading: the frames the video has presented so far (decoded, less dropped). True when it has been under
   *  its line for WATCH_FOR_MS. */
  read(now: number, presented: number, hidden: boolean): boolean {
    if (hidden || now - this.startedAt < WATCH_GRACE_MS) {
      // not judged, and the next reading starts afresh: a hidden page presents nothing
      this.last = null;
      this.underSince = null;
      return false;
    }
    const prev = this.last;
    this.last = { at: now, presented };
    if (!prev || now <= prev.at) return false;
    this.fps = ((presented - prev.presented) * 1000) / (now - prev.at);
    if (this.fps >= this.minFps) {
      this.underSince = null;
      return false;
    }
    this.underSince ??= prev.at;
    return now - this.underSince >= WATCH_FOR_MS;
  }
}

/** What the watch has found this session, and the wall files that failed to play in it. */
export interface WallMemory { verdict: WallVerdict; failed: string[] }

/** sessionStorage: the wall's memory. It lasts the tab's session and no longer: a new visit tries the wall again. */
export const WALL_KEY = 'rvl-wall';

export function readWallMemory(store: KeyStore | null): WallMemory {
  try {
    const m = JSON.parse(store?.getItem(WALL_KEY) ?? 'null') as Partial<WallMemory> | null;
    if (m && (m.verdict === 'ok' || m.verdict === 'small' || m.verdict === 'starved') && Array.isArray(m.failed)) {
      return { verdict: m.verdict, failed: m.failed.filter((f): f is string => typeof f === 'string') };
    }
  } catch { /* private mode, or not ours */ }
  return { verdict: 'ok', failed: [] };
}

export function writeWallMemory(store: KeyStore | null, m: WallMemory): void {
  try { store?.setItem(WALL_KEY, JSON.stringify(m)); } catch { /* private mode */ }
}

/** The tab's sessionStorage, or null where it is refused. */
export function sessionStore(): KeyStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/wall-watch.test.ts`

Expected: PASS, 8 tests.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add -- src/works/wall-watch.ts tests/wall-watch.test.ts
git commit -m "feat(works): the wall's own watch and its session memory" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 8: The wall unit, and the pane's second sprite

**Lane:** the floor's spine (serial: 8 → 10 → 11 → 13 → 14 → 15), after Tasks 5 and 7. Task 9 may run beside it.

**Files:**
- Create: `src/works/wall.ts`, `tests/wall.test.ts`, `tests/floor-video.test.ts`
- Modify: `src/works/tile.ts`, `tests/video-texture.test.ts`

**Interfaces:**
- Consumes: Task 3's `WallEntry`; Task 5's `wallAssetUrl(file)`; Task 7's `WallWatch`, `NO_FRAME_MS`, `SMALL_MIN_FPS`,
  `WALL_MIN_FPS`, `WATCH_EVERY_MS`; the existing `videoTexture(v)` of `src/lib/video-texture.ts`.
- Produces:
  - `src/works/wall.ts`: `interface WallHooks { onReady(): void; onFail(): void; onVerdict(): void }`,
    `interface WallReading { file: string; ready: boolean; fps: number | null; dropped: number; decoded: number }`,
    `class WallVideo { readonly file: string; ready: boolean; readonly which: 'full' | 'small'; constructor(entry: WallEntry, which: 'full' | 'small', hooks: WallHooks); textureFor(slug: string): Texture | null; reading(): WallReading; destroy(): void }`
  - `src/works/tile.ts` (`ProjectTile`): `setWall(tex: Texture | null): void`, `hasWall(): boolean`
  - `tests/floor-video.test.ts`: this plan's file of source pins, with a helper `read(file)`; Tasks 10, 11, 13 and 14
    each add one `describe` at its end.

Nothing uses the unit yet: the world starts it in Task 10.

One thing the tests must do that the browser does not need: Pixi's `VideoSource` finishes loading in a promise. A
source destroyed before that promise resumes throws inside Pixi, as an unhandled rejection. In the browser it is
harmless (the unit is gone). In a test it fails the run, so the tests wait a few turns (`settle()`) after a frame is
presented and before a unit is destroyed.

- [x] **Step 1: Write the failing tests**

Create `tests/wall.test.ts`:

```ts
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WallEntry } from '../src/lib/wall-files';
import type { WallHooks, WallVideo as WallVideoClass } from '../src/works/wall';

// THE WALL UNIT ON A STAND-IN VIDEO (spec 2026-11-24-work-wall-video-design, §4.5): nothing of the wall exists before
// its video has presented a frame; every pane's tile is a frame over ONE shared source; only the unit destroys it.

type Fn = (...a: unknown[]) => void;

/** A stand-in <video>: what the wall unit and Pixi's VideoSource touch, and no more. */
class FakeVideo {
  videoWidth = 1904;
  videoHeight = 1080;
  width = 0;
  height = 0;
  readyState = 4;
  HAVE_ENOUGH_DATA = 4;
  HAVE_FUTURE_DATA = 3;
  HAVE_CURRENT_DATA = 2;
  paused = true;
  ended = false;
  playbackRate = 1;
  muted = false;
  loop = false;
  playsInline = false;
  preload = '';
  src = '';
  loads = 0;
  total = 0;
  droppedFrames = 0;
  private listeners = new Map<string, Set<Fn>>();
  private frameCbs: Fn[] = [];
  addEventListener(type: string, fn: Fn): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Fn): void {
    this.listeners.get(type)?.delete(fn);
  }
  fire(type: string): void {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn();
  }
  requestVideoFrameCallback(fn: Fn): number {
    this.frameCbs.push(fn);
    return this.frameCbs.length;
  }
  cancelVideoFrameCallback(): void {}
  getVideoPlaybackQuality() {
    return { totalVideoFrames: this.total, droppedVideoFrames: this.droppedFrames };
  }
  play(): Promise<void> {
    this.paused = false;
    this.fire('play');
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
    this.fire('pause');
  }
  load(): void {
    this.loads++;
  }
  /** the decoder puts one frame on screen */
  present(): void {
    const due = this.frameCbs;
    this.frameCbs = [];
    for (const fn of due) fn(0, {});
  }
}

const ENTRY: WallEntry = {
  file: 'human.mp4', small: 'human-s.mp4', width: 1904, height: 1080, fps: 24, frames: 515,
  tiles: {
    halide: { x: 4, y: 4, w: 626, h: 262, fps: 24 },
    philia: { x: 952, y: 544, w: 466, h: 262, fps: 29.97 },
  },
};

let WallVideo: typeof WallVideoClass;
let made: FakeVideo[] = [];

beforeAll(async () => {
  // Pixi in node (as tests/video-texture.test.ts): stand-ins before pixi.js loads
  const g = globalThis as Record<string, unknown>;
  g.requestAnimationFrame = () => 1;
  g.cancelAnimationFrame = () => {};
  g.HTMLVideoElement = FakeVideo;
  g.window = globalThis;
  g.document = {
    hidden: false,
    createElement: (tag: string) => {
      if (tag !== 'video') return { getContext: () => null };
      const v = new FakeVideo();
      made.push(v);
      return v;
    },
  };
  ({ WallVideo } = await import('../src/works/wall'));
});

beforeEach(() => {
  made = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** A wall unit on a stand-in video, with its hooks counted. */
function wall(which: 'full' | 'small' = 'full', entry: WallEntry = ENTRY) {
  const calls = { ready: 0, fail: 0, verdict: 0 };
  const hooks: WallHooks = { onReady: () => calls.ready++, onFail: () => calls.fail++, onVerdict: () => calls.verdict++ };
  const unit = new WallVideo(entry, which, hooks);
  return { unit, v: made.at(-1)!, calls };
}

/** Let Pixi's VideoSource finish loading (it awaits a probe of the browser's video alpha handling): a source
 *  destroyed before that throws inside Pixi, in a test as in a browser. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('the wall unit: one video, one shared source, a frame gate of its own', () => {
  it('plays the listed file, muted and looping, and owns its play', () => {
    const { unit, v } = wall();
    expect(v.src).toBe('/content/walls/human.mp4');
    expect([v.muted, v.loop, v.playsInline, v.preload, v.paused]).toEqual([true, true, true, 'auto', false]);
    expect(unit.file).toBe('human.mp4');
    expect(wall('small').v.src).toBe('/content/walls/human-s.mp4');
  });

  it('before the video has presented a frame there is no tile at all', () => {
    const { unit, calls } = wall();
    expect(unit.ready).toBe(false);
    expect(unit.textureFor('halide')).toBeNull();
    expect(calls.ready).toBe(0);
  });

  it('the first frame opens the gate: each film gets its tile, half a pixel inside its picture, over the one source', async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    expect(calls.ready).toBe(1);
    expect(unit.ready).toBe(true);
    const a = unit.textureFor('halide')!;
    const b = unit.textureFor('philia')!;
    expect([a.frame.x, a.frame.y, a.frame.width, a.frame.height]).toEqual([4.5, 4.5, 625, 261]);
    expect([b.frame.x, b.frame.y, b.frame.width, b.frame.height]).toEqual([952.5, 544.5, 465, 261]);
    expect(a.source).toBe(b.source);
    expect([a.source.width, a.source.height]).toEqual([1904, 1080]);
    expect(unit.textureFor('a-film-with-no-tile'), 'its pane plays its own loop').toBeNull();
    unit.destroy();
  });

  it('the half-size copy uses the same map, halved', async () => {
    const { unit, v } = wall('small');
    v.videoWidth = 952;
    v.videoHeight = 540;
    v.present();
    await settle();
    const a = unit.textureFor('halide')!;
    expect([a.frame.x, a.frame.y, a.frame.width, a.frame.height]).toEqual([2.5, 2.5, 312, 130]);
    unit.destroy();
  });

  it('a file that errors, or presents no frame in 8 s, has failed; one that plays has not', async () => {
    const broken = wall();
    broken.v.fire('error');
    expect(broken.calls.fail).toBe(1);
    const silent = wall();
    vi.advanceTimersByTime(7900);
    expect(silent.calls.fail).toBe(0);
    vi.advanceTimersByTime(200);
    expect(silent.calls.fail).toBe(1);
    const fine = wall();
    fine.v.present();
    await settle();
    vi.advanceTimersByTime(9000);
    expect(fine.calls.fail).toBe(0);
    fine.unit.destroy();
  });

  it("its watch reads the video's own frame totals every 2 s: 6 s under 18 a second is a verdict", async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    // 4 s of grace, then a video presenting 10 frames a second and dropping the rest
    for (let s = 2; s <= 12; s += 2) {
      v.total = s * 24;
      v.droppedFrames = s * 14;
      vi.advanceTimersByTime(2000);
    }
    expect(calls.verdict).toBeGreaterThanOrEqual(1);
    expect(unit.reading()).toMatchObject({ file: 'human.mp4', ready: true, decoded: 288, dropped: 168 });
    expect(unit.reading().fps).toBeCloseTo(10);
    unit.destroy();
  });

  it('a wall that holds its frame rate gets no verdict', async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    for (let s = 2; s <= 20; s += 2) {
      v.total = s * 24;
      vi.advanceTimersByTime(2000);
    }
    expect(calls.verdict).toBe(0);
    unit.destroy();
  });

  it('destroying the unit gives the decoder back: the tiles go, the video is paused and emptied, and nothing fires after', async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    const a = unit.textureFor('halide')!;
    const source = a.source;
    unit.destroy();
    expect(a.destroyed).toBe(true);
    expect(source.destroyed).toBe(true);
    expect(v.paused).toBe(true);
    expect(v.src).toBe('');
    expect(v.loads).toBeGreaterThan(0);
    expect(unit.textureFor('halide')).toBeNull();
    v.fire('error'); // an emptied element reports an error: it is not a failure of the wall
    vi.advanceTimersByTime(20000);
    expect(calls).toEqual({ ready: 1, fail: 0, verdict: 0 });
  });

  it('destroyed before its first frame, it empties the video itself and never opens', () => {
    const { unit, v, calls } = wall();
    unit.destroy();
    expect(v.paused).toBe(true);
    expect(v.src).toBe('');
    v.present();
    vi.advanceTimersByTime(20000);
    expect(calls).toEqual({ ready: 0, fail: 0, verdict: 0 });
  });
});
```

In `tests/video-texture.test.ts`, find:

```ts
    for (const f of ['src/works/tile.ts', 'src/home/hero.ts']) {
```

Replace it with:

```ts
    // (the wall unit, works/wall.ts, is the third player: one video for a whole chapter's panes)
    for (const f of ['src/works/tile.ts', 'src/home/hero.ts', 'src/works/wall.ts']) {
```

Create `tests/floor-video.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// THE FLOOR'S VIDEO, AS SOURCE PINS (spec 2026-11-24-work-wall-video-design). The rules themselves are tested where
// they live (tests/quality.test.ts, wall-files, wall, wall-watch, playback); these pins hold the wiring between them,
// which no unit test reaches: the world needs a GPU. Every pin is one line of source or a pattern that crosses line
// ends with \s, so it reads the same on an LF and a CRLF checkout.
const read = (file: string): string => readFileSync(file, 'utf8');

describe("a pane's tile of the wall video (pins)", () => {
  const tile = read('src/works/tile.ts');

  it('lies above the poster and under the own loop', () => {
    expect(tile).toContain('this.card.addChildAt(s, this.card.getChildIndex(this.posterSprite) + 1);');
    expect(tile).toContain('this.card.addChildAt(s, this.card.getChildIndex(this.wallSprite ?? this.posterSprite) + 1);');
  });

  it('is given back by the pane without destroying what is shared: the sprite alone, no texture, no source', () => {
    expect(tile).toContain('setWall(tex: Texture | null): void {');
    expect(tile).toContain('this.wallSprite.destroy();');
    expect(tile).not.toMatch(/wallSprite\.destroy\(\{/);
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/wall.test.ts tests/video-texture.test.ts tests/floor-video.test.ts`

Expected: FAIL in all three files. `tests/wall.test.ts` cannot find `src/works/wall`; the two pins of
`tests/floor-video.test.ts` fail (`expected … to contain 'setWall(tex: Texture | null): void {'`); in
`tests/video-texture.test.ts` one test fails with `ENOENT … src/works/wall.ts` and its others pass.

- [x] **Step 3: Write the unit, and give the pane its second sprite**

Create `src/works/wall.ts`:

```ts
import { Rectangle, Texture } from 'pixi.js';
import { wallAssetUrl } from '../lib/content';
import { videoTexture } from '../lib/video-texture';
import type { WallEntry } from '../lib/wall-files';
import { NO_FRAME_MS, SMALL_MIN_FPS, WALL_MIN_FPS, WATCH_EVERY_MS, WallWatch } from './wall-watch';

/** What the world hears from its wall. */
export interface WallHooks {
  /** the video has presented a frame: the tiles' textures exist from now on */
  onReady(): void;
  /** the file did not load, will not decode, or presented no frame in NO_FRAME_MS */
  onFail(): void;
  /** the wall's own watch (works/wall-watch.ts): this file cannot hold its frame rate */
  onVerdict(): void;
}

/** What the readout shows of the wall (lib/readout.ts). */
export interface WallReading { file: string; ready: boolean; fps: number | null; dropped: number; decoded: number }

/** THE WALL VIDEO (owner 2026-11-24: one combined video per chapter "for weak machines only"; spec
 *  2026-11-24-work-wall-video-design, §4.5). One muted, looping video plays every pane's loop as a tile; each pane
 *  gets a texture over the ONE shared source, framed on its tile. One decoder where the floor held one for every pane.
 *
 *  The house laws for video in Pixi hold here as for a pane's own loop (lib/video-texture.ts): the texture comes from
 *  videoTexture(), so it uploads only on a new frame and the page owns play and pause; and nothing of the wall shows
 *  before its video has presented a frame. Two more are this unit's own:
 *  - a tile's texture is made only after that first frame, when the source has the video's size (a sprite does not
 *    follow a source that changes size under it);
 *  - the shared source is destroyed here and nowhere else. A pane destroys its own sprite, never the texture.
 *
 *  A change of file (full-size to half-size) is always a new unit; nothing is resized in place. */
export class WallVideo {
  readonly file: string;
  /** the frame gate has opened */
  ready = false;
  private video: HTMLVideoElement | null;
  private shared: Texture | null = null;
  private tiles = new Map<string, Texture>();
  private watch: WallWatch;
  private watchTimer = 0;
  private failTimer = 0;
  private decoded = 0;
  private dropped = 0;
  private done = false;

  constructor(private readonly entry: WallEntry, readonly which: 'full' | 'small', private readonly hooks: WallHooks) {
    this.file = which === 'small' && entry.small ? entry.small : entry.file;
    this.watch = this.newWatch();
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    this.video = v;
    v.addEventListener('error', () => this.fail());
    this.failTimer = window.setTimeout(() => { if (!this.ready) this.fail(); }, NO_FRAME_MS);
    // THE FRAME GATE: the first presented frame. (A browser without requestVideoFrameCallback opens it when the first
    // frame's data is in, as a pane does for its own loop.)
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(() => this.open(v));
    else v.addEventListener('loadeddata', () => this.open(v), { once: true });
    v.src = wallAssetUrl(this.file);
    void v.play().catch(() => { /* the posters stay up; the gate or the timer decides */ });
  }

  private newWatch(): WallWatch {
    return new WallWatch(this.which === 'small' ? SMALL_MIN_FPS : WALL_MIN_FPS, performance.now());
  }

  private open(v: HTMLVideoElement): void {
    if (this.done || this.video !== v) return;
    window.clearTimeout(this.failTimer);
    if (!v.videoWidth || !v.videoHeight) {
      this.fail();
      return;
    }
    const shared = videoTexture(v);
    // (made after the first frame, the source takes the video's size as it is built; made sure of here)
    if (shared.source.width !== v.videoWidth || shared.source.height !== v.videoHeight) {
      shared.source.resize(v.videoWidth, v.videoHeight);
    }
    this.shared = shared;
    // one map serves both files: the half-size copy's rectangles are the map's, scaled by the file's own width
    const k = v.videoWidth / this.entry.width;
    for (const [slug, t] of Object.entries(this.entry.tiles)) {
      // half a pixel inside the picture; with the 4 px of the tile's own edge around it, no neighbour's picture and
      // no compression at the edge can show in a pane
      const frame = new Rectangle(t.x * k + 0.5, t.y * k + 0.5, t.w * k - 1, t.h * k - 1);
      this.tiles.set(slug, new Texture({ source: shared.source, frame }));
    }
    this.ready = true;
    this.watch = this.newWatch(); // (the watch's 4 s of grace run from the first frame)
    this.watchTimer = window.setInterval(() => this.read(), WATCH_EVERY_MS);
    this.hooks.onReady();
  }

  /** The watch's reading: the frames presented so far are the element's own totals, decoded less dropped. Where the
   *  browser gives no such totals, the watch does nothing. */
  private read(): void {
    const v = this.video;
    if (this.done || !v || typeof v.getVideoPlaybackQuality !== 'function') return;
    const q = v.getVideoPlaybackQuality();
    this.decoded = q.totalVideoFrames;
    this.dropped = q.droppedVideoFrames;
    if (this.watch.read(performance.now(), q.totalVideoFrames - q.droppedVideoFrames, document.hidden)) this.hooks.onVerdict();
  }

  private fail(): void {
    if (this.done) return;
    this.hooks.onFail();
  }

  /** The pane's tile, or null: the gate has not opened, or the manifest lists no tile for this film (its loop
   *  changed after the wall was built: the pane plays its own loop). */
  textureFor(slug: string): Texture | null {
    return this.tiles.get(slug) ?? null;
  }

  reading(): WallReading {
    return { file: this.file, ready: this.ready, fps: this.watch.fps, dropped: this.dropped, decoded: this.decoded };
  }

  /** Stop for good: THE LIST, a chapter flip, a change of file. The panes must have given their tiles back first
   *  (ProjectTile.setWall(null)). The video is paused and emptied, and its source destroyed: the decoder is given
   *  back. */
  destroy(): void {
    if (this.done) return;
    this.done = true;
    window.clearInterval(this.watchTimer);
    window.clearTimeout(this.failTimer);
    for (const t of this.tiles.values()) t.destroy(false); // (the texture alone: the source is shared)
    this.tiles.clear();
    const v = this.video;
    this.video = null;
    if (this.shared) {
      this.shared.destroy(true); // (VideoSource.destroy pauses the video, sets src = '' and loads)
      this.shared = null;
    } else if (v) {
      v.pause();
      v.src = '';
      v.load();
    }
  }
}
```

In `src/works/tile.ts`, find:

```ts
  video?: HTMLVideoElement;
  videoSprite?: Sprite;
```

Replace it with:

```ts
  video?: HTMLVideoElement;
  videoSprite?: Sprite;
  /** this pane's tile of the chapter's wall video (works/wall.ts): above the poster, under the pane's own loop */
  private wallSprite?: Sprite;
```

In `src/works/tile.ts`, find:

```ts
  swapToMontage(): void {
```

Directly before it, add:

```ts
  /** Take a tile of the wall video, or give it back (`null`). The tile shows whenever the pane's own loop does not:
   *  it lies above the poster and under the loop's sprite. The texture is the wall unit's, and so is the one source
   *  behind every pane's tile: the pane destroys its own sprite and nothing else. */
  setWall(tex: Texture | null): void {
    if (this.wallSprite) {
      this.wallSprite.destroy();
      this.wallSprite = undefined;
    }
    if (!tex) return;
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.width = this.cw;
    s.height = this.ch;
    this.wallSprite = s;
    this.card.addChildAt(s, this.card.getChildIndex(this.posterSprite) + 1);
  }

  hasWall(): boolean {
    return !!this.wallSprite;
  }

```

In `src/works/tile.ts`, find:

```ts
    this.card.addChildAt(s, this.card.getChildIndex(this.posterSprite) + 1); // above poster, below labels
```

Replace it with:

```ts
    // above the poster and the wall's tile, below the labels
    this.card.addChildAt(s, this.card.getChildIndex(this.wallSprite ?? this.posterSprite) + 1);
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/wall.test.ts tests/video-texture.test.ts tests/floor-video.test.ts`

Expected: PASS, 19 tests in the three files, and no "Unhandled Rejection" in the output.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add -- src/works/wall.ts src/works/tile.ts tests/wall.test.ts tests/floor-video.test.ts tests/video-texture.test.ts
git commit -m "feat(works): the wall unit - one video, one shared source, a tile for every pane" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 9: Playback follows a policy: the cap by mode, the paused guard, a sleeping pane gives its video back

**Lane:** after Task 1 (may run beside Tasks 5, 7, 8, 12). It touches only the two files below.

**Files:**
- Modify: `src/works/playback.ts`
- Test: `tests/playback.test.ts`

**Interfaces:**
- Consumes: Task 1's `FloorMode`; the existing `liveVideoCap()` of `src/lib/env.ts`, `computePlaySet`, `TileRect`,
  `ViewRect` of `src/works/priority.ts`, and `ProjectTile`'s `mode`, `wake()`, `sleep()`, `hasVideo()`,
  `releaseVideo()`, `extentX()`, `extentY()`.
- Produces, exported from `src/works/playback.ts`:
  - `SLEEP_RELEASE_MS = 20000`, `POINTED_RELEASE_MS = 5000`, `releaseAfterMs(mode: FloorMode): number`
  - `interface PlaybackPolicy { cap(): number; mayPlay(slug: string): boolean; paused(): boolean; releaseAfter(): number }`
  - `class PlaybackManager`: `constructor(tiles: Map<string, ProjectTile>, policy?: PlaybackPolicy)`, `get cap()`,
    `get maxElements()`, `update(view: ViewRect, hovered: string | null, now?: number): void`,
    `releaseAll(except?: string | null): void`, `releaseIdle(): void`
- With no policy the manager behaves as before, plus one thing: a pane asleep 20 s gives its video back. So this
  task alone already changes the live floor a little: far panes release their decoders (spec §4.7, first row).

The cap is never written here as a number. The default policy reads `liveVideoCap()`, as the manager always did, and
the tests hand the manager a made-up cap of their own.

- [x] **Step 1: Write the failing tests**

In `tests/playback.test.ts`, find:

```ts
import { PlaybackManager } from '../src/works/playback';
```

Replace it with:

```ts
import { POINTED_RELEASE_MS, PlaybackManager, SLEEP_RELEASE_MS, releaseAfterMs, type PlaybackPolicy } from '../src/works/playback';
```

At the end of `tests/playback.test.ts`, add:

```ts

// THE FLOOR'S MODES (spec 2026-11-24-work-wall-video-design, §4.1, §4.7): the world hands the manager a policy. It
// says how many panes may decode their own loop, which panes may at all, whether the floor is paused, and how long a
// sleeping pane keeps its video.
describe('PlaybackManager under a policy', () => {
  /** a cap larger than any floor in these tests: every pane may play (the real number is lib/quality.ts's) */
  const WHOLE = 99;
  const policy = (over: Partial<PlaybackPolicy> = {}): PlaybackPolicy => ({
    cap: () => WHOLE, mayPlay: () => true, paused: () => false, releaseAfter: () => SLEEP_RELEASE_MS, ...over,
  });
  const AWAY: ViewRect = { x: VIEW.x + FAR, y: VIEW.y + FAR, w: VIEW.w, h: VIEW.h };

  it('a pane asleep 20 s gives its video back; one asleep 19 s keeps it', () => {
    const a = makeFakeTile('a', 0, 0);
    const manager = new PlaybackManager(makeTiles([a]), policy());
    manager.update(VIEW, null, 0);
    expect(a.hasVideo()).toBe(true);
    manager.update(AWAY, null, 1000); // the view leaves: the pane sleeps, its video paused
    expect(a.mode).toBe('sleep');
    manager.update(AWAY, null, 20000); // 19 s asleep
    expect(a.hasVideo()).toBe(true);
    expect(a.releaseCalls).toBe(0);
    manager.update(AWAY, null, 21000); // 20 s asleep
    expect(a.hasVideo()).toBe(false);
    expect(a.releaseCalls).toBe(1);
    expect(getLru(manager)).not.toContain('a');
  });

  it('a pane that wakes again before its 20 s starts the count afresh', () => {
    const a = makeFakeTile('a', 0, 0);
    const manager = new PlaybackManager(makeTiles([a]), policy());
    manager.update(VIEW, null, 0);
    manager.update(AWAY, null, 1000);
    manager.update(VIEW, null, 15000); // back in view
    manager.update(AWAY, null, 16000);
    manager.update(AWAY, null, 30000); // 14 s asleep this time
    expect(a.releaseCalls).toBe(0);
    manager.update(AWAY, null, 36000);
    expect(a.releaseCalls).toBe(1);
  });

  it('the wait is the mode\'s: 20 s on a floor of own loops, 5 s for a loop beside the wall', () => {
    expect(releaseAfterMs('own')).toBe(SLEEP_RELEASE_MS);
    expect(releaseAfterMs('posters')).toBe(SLEEP_RELEASE_MS);
    expect(releaseAfterMs('wall')).toBe(POINTED_RELEASE_MS);
    expect(releaseAfterMs('wall-small')).toBe(POINTED_RELEASE_MS);
    expect(releaseAfterMs('starved')).toBe(POINTED_RELEASE_MS);
    expect([SLEEP_RELEASE_MS, POINTED_RELEASE_MS]).toEqual([20000, 5000]);
    const a = makeFakeTile('a', 0, 0);
    const manager = new PlaybackManager(makeTiles([a]), policy({ releaseAfter: () => POINTED_RELEASE_MS }));
    manager.update(VIEW, 'a', 0); // pointed
    manager.update(VIEW, null, 1000); // (in view still, and playing: nothing to release)
    manager.update(AWAY, null, 2000);
    manager.update(AWAY, null, 6900);
    expect(a.releaseCalls).toBe(0);
    manager.update(AWAY, null, 7000);
    expect(a.releaseCalls).toBe(1);
  });

  it('no pane wakes while the floor is paused, however often it is asked', () => {
    let paused = true;
    const fakes = Array.from({ length: 6 }, (_, i) => makeFakeTile(`p${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy({ paused: () => paused }));
    for (let i = 0; i < 5; i++) manager.update(HUGE_VIEW, 'p0', i * 1000); // a tier change, a pointer, a tick
    expect(fakes.reduce((n, f) => n + f.wakeCalls, 0)).toBe(0);
    paused = false;
    manager.update(HUGE_VIEW, null, 6000);
    expect(fakes.every((f) => f.mode === 'live')).toBe(true);
  });

  it('beside a wall only the pointed pane and the panes with no tile play their own loop, and they share the cap', () => {
    const fakes = Array.from({ length: 8 }, (_, i) => makeFakeTile(`w${i}`, i * 10, 0));
    const noTile = new Set(['w1', 'w2', 'w3', 'w4']);
    const manager = new PlaybackManager(makeTiles(fakes), policy({ cap: () => 3, mayPlay: (slug) => noTile.has(slug) }));
    manager.update(HUGE_VIEW, null, 0);
    expect(fakes.filter((f) => f.mode === 'live').map((f) => f.project.slug)).toEqual(['w1', 'w2', 'w3']);
    manager.update(HUGE_VIEW, 'w7', 1000); // the pointer comes over a pane that has a tile: its own loop plays too
    expect(fakes.filter((f) => f.mode === 'live').map((f) => f.project.slug)).toEqual(['w1', 'w2', 'w7']);
    expect(getLastSet(manager).size).toBe(3);
  });

  it('starved: only the pointed pane plays', () => {
    const fakes = Array.from({ length: 5 }, (_, i) => makeFakeTile(`s${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy({ cap: () => 1, mayPlay: () => false }));
    manager.update(HUGE_VIEW, null, 0);
    expect(fakes.filter((f) => f.mode === 'live')).toHaveLength(0);
    manager.update(HUGE_VIEW, 's3', 1000);
    expect(fakes.filter((f) => f.mode === 'live').map((f) => f.project.slug)).toEqual(['s3']);
  });

  it('giving everything back: every video released, the pointed pane kept when asked', () => {
    const fakes = Array.from({ length: 4 }, (_, i) => makeFakeTile(`r${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy());
    manager.update(HUGE_VIEW, 'r2', 0);
    manager.releaseAll('r2');
    expect(fakes.map((f) => f.hasVideo())).toEqual([false, false, true, false]);
    expect(getLru(manager)).toEqual(['r2']);
    manager.releaseAll();
    expect(fakes.some((f) => f.hasVideo())).toBe(false);
    expect(getLru(manager)).toEqual([]);
    expect(getLastSet(manager).size).toBe(0);
  });

  it('a change of mode gives back at once every video that is not playing', () => {
    let cap = WHOLE;
    const fakes = Array.from({ length: 6 }, (_, i) => makeFakeTile(`m${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy({ cap: () => cap, mayPlay: (slug) => cap === WHOLE || slug === 'none' }));
    manager.update(HUGE_VIEW, 'm4', 0); // own loops: all six play
    expect(fakes.every((f) => f.hasVideo())).toBe(true);
    cap = 3; // the wall takes over: no pane but the pointed one may play
    manager.update(HUGE_VIEW, 'm4', 1000);
    manager.releaseIdle();
    expect(fakes.map((f) => f.hasVideo())).toEqual([false, false, false, false, true, false]);
    expect(fakes[4].mode, 'the pointed pane keeps its loop').toBe('live');
  });

  it('without a policy the manager is as it was: the tier\'s cap, every pane, never paused', () => {
    const fakes = Array.from({ length: 3 }, (_, i) => makeFakeTile(`d${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes));
    manager.update(HUGE_VIEW, null);
    expect(fakes.every((f) => f.mode === 'live')).toBe(true);
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/playback.test.ts`

Expected: FAIL in the new `describe` only, "PlaybackManager under a policy": 8 failed, the older cases pass. Among
the failures: `TypeError: releaseAfterMs is not a function` and `TypeError: manager.releaseAll is not a function`.

- [x] **Step 3: Write the code**

This step replaces the whole file. First make sure the file is still the one this plan knew: run
`git log --oneline -- src/works/playback.ts | head -3`. The newest commit this plan knows is `7362044`
("fix(works): fourteen loops at once, a whole chapter again"), which changed one number in a comment; the text below
names no number of loops. If a newer commit has touched the file, read its change and carry it into the text below.

Replace the whole of `src/works/playback.ts` with:

```ts
import { liveVideoCap } from '../lib/env';
import type { FloorMode } from '../lib/quality';
import { computePlaySet, TileRect, ViewRect } from './priority';
import type { ProjectTile } from './tile';

/** A sleeping pane gives its video back after this long, so only panes in or near the view hold a decoder. (Before,
 *  a paused video kept its element, its decoder and its texture for the whole visit: only a count over 24 elements
 *  released one, and no chapter has that many films.) */
export const SLEEP_RELEASE_MS = 20000;
/** …and after this long beside a wall, where the only own loops are the pointed pane's and a pane's with no tile */
export const POINTED_RELEASE_MS = 5000;

export function releaseAfterMs(mode: FloorMode): number {
  return mode === 'own' || mode === 'posters' ? SLEEP_RELEASE_MS : POINTED_RELEASE_MS;
}

/** What the floor's mode asks of the manager. The world builds it (works/world.ts); the rules are lib/quality.ts's
 *  (floorMode, ownLoopCap). */
export interface PlaybackPolicy {
  /** how many panes may decode their own loop right now */
  cap(): number;
  /** whether this pane may play its own loop without being pointed at: beside a wall, only a pane with no tile */
  mayPlay(slug: string): boolean;
  /** the floor is paused (THE LIST shows): nothing wakes */
  paused(): boolean;
  /** how long a sleeping pane keeps its video, in ms */
  releaseAfter(): number;
}

/** A floor of own loops at the tier's cap, never paused: the manager as it was before the modes. */
const OWN_LOOPS: PlaybackPolicy = {
  cap: liveVideoCap,
  mayPlay: () => true,
  paused: () => false,
  releaseAfter: () => SLEEP_RELEASE_MS,
};

/** Applies the pure play-set to the stateful tiles + caps total video elements. */
export class PlaybackManager {
  /** Live loops right now: the floor's mode and the site's tier decide (lib/quality.ts ownLoopCap), read on every
   *  update — a step down sleeps the excess at the next pass, a step up wakes more. On a floor of own loops a
   *  desktop's cap covers a whole chapter: every pane in the view plays. Beside a wall at most 3 panes decode a loop. */
  get cap(): number { return this.policy.cap(); }
  get maxElements(): number { return this.cap * 2; }
  private lastSet = new Set<string>();
  private lru: string[] = []; // slugs with a created video element, oldest first
  /** when each pane that holds a video was first seen out of the play set */
  private asleepSince = new Map<string, number>();

  constructor(private tiles: Map<string, ProjectTile>, private policy: PlaybackPolicy = OWN_LOOPS) {}

  update(view: ViewRect, hovered: string | null, now: number = performance.now()): void {
    // THE ONE GUARD: every playback pass comes through here, and none wakes a pane while the floor is paused. (A tier
    // change under THE LIST used to wake every loop behind it.)
    if (this.policy.paused()) return;
    const rects: TileRect[] = [];
    for (const t of this.tiles.values()) {
      const slug = t.project.slug;
      if (slug !== hovered && !this.policy.mayPlay(slug)) continue;
      rects.push({ slug, cx: t.x, cy: t.y, hw: t.extentX(), hh: t.extentY() });
    }
    const set = computePlaySet(rects, view, hovered, this.cap);

    for (const slug of this.lastSet) {
      if (!set.has(slug)) this.tiles.get(slug)?.sleep();
    }
    for (const slug of set) {
      const tile = this.tiles.get(slug);
      if (!tile) continue;
      if (tile.mode === 'sleep') tile.wake();
      if (tile.hasVideo()) {
        if (this.lru.includes(slug)) this.touch(slug);
        else this.lru.push(slug);
      }
    }
    while (this.lru.length > this.maxElements) {
      const victim = this.lru.find((s) => !set.has(s));
      if (!victim) break;
      this.release(victim);
    }
    // A SLEEPING PANE GIVES ITS VIDEO BACK once it has slept the policy's wait
    const wait = this.policy.releaseAfter();
    for (const slug of [...this.lru]) {
      if (set.has(slug)) {
        this.asleepSince.delete(slug);
        continue;
      }
      const since = this.asleepSince.get(slug);
      if (since === undefined) this.asleepSince.set(slug, now);
      else if (now - since >= wait) this.release(slug);
    }
    this.lastSet = set;
  }

  /** Give back every own video (the floor pauses for THE LIST), or every one but `except`'s. Each pane rests on its
   *  poster, or on its tile of the wall. */
  releaseAll(except: string | null = null): void {
    for (const [slug, t] of this.tiles) {
      if (slug !== except && t.hasVideo()) t.releaseVideo();
    }
    this.lru = this.lru.filter((s) => s === except);
    this.lastSet = new Set([...this.lastSet].filter((s) => s === except));
    this.asleepSince.clear();
  }

  /** Give back at once every video that is not playing. A change of mode happens under the posters: the loops that
   *  are leaving do not wait out their sleep beside the video that is coming. */
  releaseIdle(): void {
    for (const slug of [...this.lru]) {
      if (!this.lastSet.has(slug)) this.release(slug);
    }
  }

  private release(slug: string): void {
    this.lru = this.lru.filter((s) => s !== slug);
    this.asleepSince.delete(slug);
    this.tiles.get(slug)?.releaseVideo();
  }

  private touch(slug: string): void {
    const i = this.lru.indexOf(slug);
    if (i >= 0) {
      this.lru.splice(i, 1);
      this.lru.push(slug);
    }
  }
}
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/playback.test.ts`

Expected: PASS, every case (15 when this plan was written).

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add -- src/works/playback.ts tests/playback.test.ts
git commit -m "feat(works): playback follows a policy - the cap by mode, the paused guard, a sleeping pane released after 20 s" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 10: The floor plays the wall where it is due, and THE LIST gives every video back

**Lane:** the floor's spine, after Tasks 2, 8 and 9.

**Files:**
- Modify: `src/works/world.ts`, `src/pages/works.ts`
- Test: `tests/floor-video.test.ts`

**Interfaces:**
- Consumes: Task 1's `floorMode`, `modeAfterTierChange`, `ownLoopCap`, `FloorFacts`, `FloorMode`, `quality.pinned()`,
  `quality.floorFacts(...)`; Task 2's `quality.floorBuilt()`; Task 5's `wallFor(chapter)`; Task 7's `readWallMemory`,
  `writeWallMemory`, `sessionStore`, `WallMemory`; Task 8's `WallVideo`, `ProjectTile.setWall`, `ProjectTile.hasWall`;
  Task 9's `PlaybackManager(tiles, policy)`, `releaseAfterMs`, `releaseAll()`, `releaseIdle()`; the existing
  `isMobile()` of `src/lib/env.ts`.
- Produces:
  - `WorksWorld.create(host, stream, hooks, chapter: string)`: a fourth argument, the chapter's key (`human` or
    `machine`)
  - `WorksWorld.mode: FloorMode` (public: the harness and the readout read it)
  - private on `WorksWorld`: `facts()`, `modeNow()`, `takeMode(mode)`, `startWall(entry, which)`, `dropWall()`
  - `pause()` now releases every own loop and the wall; `resume()` works the mode out anew

This is the task that changes what a visitor sees. A machine that is not weak, at FULL or BALANCED, is in `own` and
sees the floor as before. A weak machine, and any machine at LITE, sees every pane move from one video.

The world cannot run in a unit test (it needs a GPU), so its rules are tested where they are pure (Tasks 1, 7, 8, 9)
and its wiring is pinned in the source here. Step 5 then runs it for real, headless.

- [x] **Step 1: Write the failing pins**

At the end of `tests/floor-video.test.ts`, add:

```ts

describe("the floor's video follows the mode (pins)", () => {
  const world = read('src/works/world.ts');

  it('pausing gives every video back, and one guard keeps every playback pass asleep under the list', () => {
    expect(world).toMatch(/pause\(\): void \{[\s\S]*?this\.playback\.releaseAll\(\);\s+this\.dropWall\(\);\s+this\.app\.stop\(\);/);
    expect(world).toContain('paused: () => w.paused,');
    expect(read('src/works/playback.ts')).toContain('if (this.policy.paused()) return;');
  });

  it('the mode is worked out at a build, at once on a step down, never on a step up', () => {
    expect(world).toContain('w.takeMode(w.modeNow());'); // the build: a load, a chapter flip
    expect(world).toMatch(/resume\(\): void \{[\s\S]*?this\.takeMode\(this\.modeNow\(\)\);/); // the return from THE LIST
    expect(world).toContain('modeAfterTierChange(w.mode, tierWas, t, w.facts())');
  });

  it("the mode rations the panes' own loops: how many, which panes, and how long a sleeping pane keeps its video", () => {
    expect(world).toContain('cap: () => ownLoopCap(w.mode, quality.tier(), isMobile()),');
    expect(world).toContain('releaseAfter: () => releaseAfterMs(w.mode),');
    expect(world).toMatch(/mayPlay: \(slug\) => w\.mode === 'own' \|\| w\.mode === 'posters'/);
  });

  it('the page tells the floor its chapter', () => {
    expect(read('src/pages/works.ts')).toContain('}, key);');
  });

  it("the wall unit is the world's: the panes give their tiles back before it is destroyed, at THE LIST and at a flip", () => {
    expect(world).toMatch(/private dropWall\(\): void \{[\s\S]*?tile\.setWall\(null\);[\s\S]*?this\.wall\.destroy\(\);/);
    expect(world).toMatch(/destroy\(\): void \{[\s\S]*?this\.dropWall\(\);[\s\S]*?this\.app\.destroy\(true, \{ children: true \}\);/);
  });

  it('a pinned page obeys no watch, and a floor on its way out takes up no new video', () => {
    expect(world).toMatch(/onVerdict: \(\) => \{\s+if \(this\.wall !== wall \|\| this\.exiting \|\| quality\.pinned\(\) !== null\) return;/);
    expect(world).toMatch(/onFail: \(\) => \{\s+if \(this\.wall !== wall \|\| this\.exiting\) return;/);
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/floor-video.test.ts`

Expected: FAIL. The six new pins fail and Task 8's two pass.

- [x] **Step 3: Wire the world, and tell it its chapter**

In `src/works/world.ts`, find:

```ts
import { aspectRatio, isBlank } from '../lib/content';
import { dprCap, finePointer, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';
import { maxFpsFor, quality } from '../lib/quality';
```

Replace it with:

```ts
import { aspectRatio, isBlank, wallFor } from '../lib/content';
import { dprCap, finePointer, isMobile, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';
import {
  floorMode, maxFpsFor, modeAfterTierChange, ownLoopCap, quality, type FloorFacts, type FloorMode,
} from '../lib/quality';
import type { WallEntry } from '../lib/wall-files';
```

In `src/works/world.ts`, find:

```ts
import { PlaybackManager } from './playback';
```

Replace it with:

```ts
import { PlaybackManager, releaseAfterMs } from './playback';
```

In `src/works/world.ts`, find:

```ts
import { ProjectTile } from './tile';

export interface WorldHooks { onCoords(x: number, y: number): void }
```

Replace it with:

```ts
import { ProjectTile } from './tile';
import { WallVideo } from './wall';
import { readWallMemory, sessionStore, writeWallMemory, type WallMemory } from './wall-watch';

export interface WorldHooks { onCoords(x: number, y: number): void }
```

In `src/works/world.ts`, find:

```ts
  /** the floor stands still while the page shows its list of films (pause/resume) */
  private paused = false;
```

Replace it with:

```ts
  /** the floor stands still while the page shows its list of films (pause/resume) */
  private paused = false;

  /** WHAT THE FLOOR PLAYS (lib/quality.ts floorMode; owner 2026-11-24: one combined video per chapter "for weak
   *  machines only"): each pane's own loop, or the chapter's wall video as tiles, or neither. Worked out when the
   *  floor is built (a load, a chapter flip, the return from THE LIST) and at once when the tier steps down or the
   *  wall's own watch gives a verdict. A step up changes no video until the next build. */
  mode: FloorMode = 'own';
  /** the chapter this floor shows: its wall's key in the manifest (`human`, `machine`) */
  private chapter = '';
  private wall: WallVideo | null = null;
  /** the films with a tile in the wall that is playing or about to: their panes need no loop of their own */
  private tiled = new Set<string>();
  /** what the wall's watch found this session, and the wall files that failed in it (works/wall-watch.ts) */
  private wallMem: WallMemory = { verdict: 'ok', failed: [] };
```

In `src/works/world.ts`, find:

```ts
  static async create(host: HTMLElement, stream: FloorItem[], hooks: WorldHooks): Promise<WorksWorld> {
    const w = new WorksWorld();
    w.hooks = hooks;
```

Replace it with:

```ts
  static async create(host: HTMLElement, stream: FloorItem[], hooks: WorldHooks, chapter: string): Promise<WorksWorld> {
    const w = new WorksWorld();
    w.hooks = hooks;
    w.chapter = chapter;
    w.wallMem = readWallMemory(sessionStore());
    quality.floorBuilt(); // (the long frames of a build are its own work, not stalls: lib/quality.ts)
```

In `src/works/world.ts`, find:

```ts
    w.playback = new PlaybackManager(w.tiles);
```

Replace it with:

```ts
    // the floor's mode rations the panes' own loops: how many, which panes, never under THE LIST, and how long a
    // sleeping pane keeps its video
    w.playback = new PlaybackManager(w.tiles, {
      cap: () => ownLoopCap(w.mode, quality.tier(), isMobile()),
      mayPlay: (slug) => w.mode === 'own' || w.mode === 'posters' || (w.mode !== 'starved' && !w.tiled.has(slug)),
      paused: () => w.paused,
      releaseAfter: () => releaseAfterMs(w.mode),
    });
```

In `src/works/world.ts`, find:

```ts
    w.offQuality = quality.on((t) => {
      app.renderer.resize(app.screen.width, app.screen.height, dprCap());
      app.ticker.maxFPS = maxFpsFor(t);
      if (w.hoveredSlug) w.tilesLayer.filters = t > 0 ? [w.desat] : [];
      for (const tile of w.tiles.values()) tile.retune();
      w.playback.update(w.viewRect(), w.hoveredSlug);
    });
```

Replace it with:

```ts
    let tierWas = quality.tier();
    w.offQuality = quality.on((t) => {
      app.renderer.resize(app.screen.width, app.screen.height, dprCap());
      app.ticker.maxFPS = maxFpsFor(t);
      if (w.hoveredSlug) w.tilesLayer.filters = t > 0 ? [w.desat] : [];
      for (const tile of w.tiles.values()) tile.retune();
      // THE FLOOR'S VIDEO: a step down switches at once; a step up waits for the next build, so no machine downloads
      // the wall and then a chapter of loops in one view. (Under THE LIST nothing plays: resume() works the mode out.)
      const mode = w.paused ? w.mode : modeAfterTierChange(w.mode, tierWas, t, w.facts());
      tierWas = t;
      if (mode !== w.mode) w.takeMode(mode);
      else w.playback.update(w.viewRect(), w.hoveredSlug);
    });
```

In `src/works/world.ts`, find:

```ts
      w.afterTick(tk.deltaMS);
    });
    return w;
  }
```

Replace it with:

```ts
      w.afterTick(tk.deltaMS);
    });
    // THE FLOOR'S VIDEO, from the machine's class and the tier (lib/quality.ts)
    w.takeMode(w.modeNow());
    quality.floorBuilt();
    return w;
  }
```

In `src/works/world.ts`, find:

```ts
      const sleeping = [...this.tiles.values()].filter((t) => t.mode === 'sleep');
```

Replace it with:

```ts
      // (a pane showing its tile of the wall is moving already: the tick is for a pane resting on its poster)
      const sleeping = [...this.tiles.values()].filter((t) => t.mode === 'sleep' && !t.hasWall());
```

In `src/works/world.ts`, find:

```ts
  /** The floor stands still while the page shows its list: no pane awake, every loop asleep, the ticker stopped. */
  pause(): void {
    if (this.paused) return;
    this.unhover();
    this.paused = true;
    for (const t of this.tiles.values()) t.sleep();
    this.app.stop();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.app.start();
    this.playback.update(this.viewRect(), this.hoveredSlug);
  }
```

Replace it with:

```ts
  /** The floor stands still while the page shows its list: no pane awake, the ticker stopped, and every video given
   *  back: each pane's own loop and the wall. (Asleep, they kept their decoders and textures under the list for as
   *  long as it showed; and a tier change woke them all: 11 videos playing behind the list, measured 2026-11-24.) */
  pause(): void {
    if (this.paused) return;
    this.unhover();
    this.paused = true;
    this.playback.releaseAll();
    this.dropWall();
    this.app.stop();
  }

  /** Back from the list: a build like any other. The mode is worked out anew and the videos come back under the
   *  posters. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.app.start();
    quality.floorBuilt();
    this.takeMode(this.modeNow());
  }

  /** The floor's facts: the ladder's half (the tier, the class, the pin, Save-Data) and the wall's (which files may
   *  be tried, and what its watch found this session). */
  private facts(): FloorFacts {
    const e = wallFor(this.chapter);
    const failed = this.wallMem.failed;
    return quality.floorFacts({
      wall: e !== null && !failed.includes(e.file),
      small: e !== null && e.small !== null && !failed.includes(e.small),
      verdict: this.wallMem.verdict,
    });
  }

  private modeNow(): FloorMode {
    return floorMode(this.facts());
  }

  /** Take a mode up. Every switch happens under the posters: the own loops that are leaving are given back, each
   *  pane rests on its poster, the new video starts, and the panes take their tiles once its frame gate has opened
   *  (works/wall.ts). The pointed pane keeps its own loop through it. A change of file is a new wall unit: nothing is
   *  resized in place. */
  private takeMode(mode: FloorMode): void {
    const which = mode === 'wall' ? 'full' : mode === 'wall-small' ? 'small' : null;
    if (this.wall && this.wall.which !== which) this.dropWall();
    const entry = which ? wallFor(this.chapter) : null;
    this.mode = mode;
    this.tiled = new Set(entry ? Object.keys(entry.tiles) : []);
    this.playback.update(this.viewRect(), this.hoveredSlug);
    this.playback.releaseIdle();
    if (entry && which && !this.wall && !this.paused) this.startWall(entry, which);
  }

  private startWall(entry: WallEntry, which: 'full' | 'small'): void {
    const wall: WallVideo = new WallVideo(entry, which, {
      onReady: () => {
        if (this.wall !== wall) return;
        for (const [slug, tile] of this.tiles) tile.setWall(wall.textureFor(slug));
      },
      // the file will not play: remembered for the session, and the floor falls to what is left
      onFail: () => {
        if (this.wall !== wall || this.exiting) return;
        this.wallMem.failed.push(wall.file);
        writeWallMemory(sessionStore(), this.wallMem);
        this.takeMode(this.modeNow());
      },
      // the wall's own watch: the full-size video gives way to its half-size copy, the copy to `starved`; remembered
      // for the session, so the next page does not try again. (A pinned page shows the watch's reading on the
      // readout and obeys nothing.)
      onVerdict: () => {
        if (this.wall !== wall || this.exiting || quality.pinned() !== null) return;
        this.wallMem.verdict = which === 'full' ? 'small' : 'starved';
        writeWallMemory(sessionStore(), this.wallMem);
        this.takeMode(this.modeNow());
      },
    });
    this.wall = wall;
  }

  /** Stop the wall: every pane gives its tile back first, then the unit destroys the one shared source. */
  private dropWall(): void {
    if (!this.wall) return;
    for (const tile of this.tiles.values()) tile.setWall(null);
    this.wall.destroy();
    this.wall = null;
  }
```

In `src/works/world.ts`, find:

```ts
    gsap.killTweensOf([this.tilesLayer, this.fieldsC, this.debrisC, ...this.blanks]);
    for (const tile of this.tiles.values()) {
```

Replace it with:

```ts
    gsap.killTweensOf([this.tilesLayer, this.fieldsC, this.debrisC, ...this.blanks]);
    this.dropWall();
    for (const tile of this.tiles.values()) {
```

In `src/pages/works.ts`, find:

```ts
      world = await WorksWorld.create(host, channelProjects(floor, key), {
        onCoords: (x, y) => hud.setCoords(x, y),
      });
```

Replace it with:

```ts
      world = await WorksWorld.create(host, channelProjects(floor, key), {
        onCoords: (x, y) => hud.setCoords(x, y),
      }, key);
```

- [x] **Step 4: Run the tests, the type check and the floor's other pins**

Run: `npx vitest run tests/floor-video.test.ts tests/floor-ways.test.ts tests/playback.test.ts tests/quality.test.ts`

Expected: PASS, but for known local failure 1 in `tests/floor-ways.test.ts` on a CRLF checkout. The older pins on
`pause()`, `resume()` and the page's call to them still hold: this plan did not edit that file.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: See it run, headless**

Build into a scratch folder (`npx vite build --outDir "<scratch folder>/build" --emptyOutDir`) and open these with the
harness of Task 6, each in a fresh browser, reading the page 12 s after `rvlBooted`. `rvlWorld.mode` is the mode;
"tiles" is `[...rvlWorld.tiles.values()].filter((t) => t.hasWall()).length`; "videos" is
`[...rvlWorld.tiles.values()].filter((t) => t.hasVideo()).length`.

| Page | Profile | Expected |
|---|---|---|
| `/works.html?gfx=lite` | the development PC as it is | mode `wall`; tiles = the chapter's films; videos 0 |
| `/works.html?ch=machine&gfx=lite` | the same | mode `wall`; tiles = the second chapter's films; videos 0 |
| `/works.html` | the same, 1920×1080 | mode `own`; tiles 0; videos about a chapter's worth (the panes in the view) |
| `/works.html` | 4 GB and 4 threads | tier `balanced`; mode `wall`; tiles = the chapter's films |
| `/works.html` | 8 GB and 8 threads, no slowing | mode `wall` at whatever tier it reaches |
| `/works.html` | 4 GB, with `sessionStorage['rvl-wall']` set to `{"verdict":"small","failed":[]}` before the page's scripts | mode `wall-small` |
| the same with `"verdict":"starved"` | 4 GB | mode `starved`; tiles 0; videos 0 |
| `/works.html` with the server answering 404 for `/content/walls/human.mp4` | 4 GB | mode `posters`; videos 3; `sessionStorage['rvl-wall']` reads `{"verdict":"ok","failed":["human.mp4"]}` |

Then, on the first page: move the pointer to the middle of the window and wait 3 s: videos 1 (the pointed pane plays
its own loop over its tile). Move the pointer to a corner and wait 7 s: videos 0 (released after 5 s). Press the
button of THE LIST (`document.querySelector('.view-toggle')`), wait 4 s: tiles 0, videos 0, and
`rvlWorld.wall` is `null`. Press it again, wait 8 s: mode `wall` and all the tiles back.

The plan's author ran every row of this on a scratch build (the 12-film chapter) and each read as expected: the wall
presented 24 frames a second with none dropped, and the pointed pane cost one request for its own loop and none for
a hover clip. The console may show two Pixi warnings at a chapter flip, `[BindGroup] a 'textureSource' was destroyed
while still bound to a shader` and the same for `'textureSampler'`: the floor logs both today, before this plan, and
they are not this task's.

Take one screenshot of the first two pages and look at them: every pane holds a moving picture in its own ratio.

- [x] **Step 6: Commit**

```bash
git add -- src/works/world.ts src/pages/works.ts tests/floor-video.test.ts
git commit -m "feat(works): the floor plays the wall on a weak machine and at LITE; THE LIST gives every video back" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 11: Waste removed: the hover clip nobody has, and the posters that outlived their floor

**Lane:** the floor's spine, after Tasks 6 and 10.

**Files:**
- Create: `tests/poster-texture.test.ts`
- Modify: `src/works/tile.ts`, `src/works/world.ts`
- Test: `tests/floor-video.test.ts`

**Interfaces:**
- Consumes: Task 5's `hasHoverClip(slug)`; Pixi's `Texture.from(canvas)`, `Cache`, `Texture.EMPTY`.
- Produces: `ProjectTile.destroyPoster(): void`; `swapToMontage()` asks for `hover.mp4` only when the manifest lists
  the clip.

Both fixes rest on facts the spec read from code (§11). Task 6 measured them on the floor. The first test file below
holds the two Pixi facts the poster fix stands on, so an upgrade of Pixi that changes either is seen: it passes
before the fix is written, and that is its job.

- [x] **Step 1: Write the tests**

Create `tests/poster-texture.test.ts`:

```ts
import { Cache, Texture } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';

// WHY A POSTER'S TEXTURE IS DESTROYED BY HAND (spec 2026-11-24-work-wall-video-design, §4.7). The floor is torn down
// with app.destroy(true, { children: true }), which destroys every sprite and leaves every texture. A poster's texture
// comes from Texture.from(canvas), and Pixi keeps such a texture in its cache, keyed by the canvas, until the texture
// itself is destroyed. So each chapter flip left a chapter's poster canvases and textures behind. This test holds the
// two facts the fix stands on, so an upgrade of Pixi that changes either is seen here.

/** enough of a canvas for Pixi to take it as one (no DOM in the tests) */
class FakeCanvas {
  width = 400;
  height = 225;
}

const g = globalThis as unknown as { HTMLCanvasElement?: unknown };
const before = g.HTMLCanvasElement;

afterEach(() => {
  g.HTMLCanvasElement = before;
});

describe("a poster's texture and Pixi's cache", () => {
  it('Texture.from(canvas) keeps the texture, keyed by the canvas, for as long as the texture lives', () => {
    g.HTMLCanvasElement = FakeCanvas;
    const canvas = new FakeCanvas();
    const tex = Texture.from(canvas as unknown as HTMLCanvasElement);
    expect(Cache.has(canvas)).toBe(true);
    expect(Texture.from(canvas as unknown as HTMLCanvasElement)).toBe(tex);
    tex.destroy(true);
  });

  it('destroying the texture with its source lets the canvas go', () => {
    g.HTMLCanvasElement = FakeCanvas;
    const canvas = new FakeCanvas();
    const tex = Texture.from(canvas as unknown as HTMLCanvasElement);
    const source = tex.source;
    tex.destroy(true);
    expect(Cache.has(canvas)).toBe(false);
    expect(source.destroyed).toBe(true);
  });
});
```

At the end of `tests/floor-video.test.ts`, add:

```ts

describe('waste removed on every tier (pins)', () => {
  const tile = read('src/works/tile.ts');
  const world = read('src/works/world.ts');

  it('a pane asks for a hover clip only when the manifest lists one for its film', () => {
    expect(tile).toContain('if (!hasHoverClip(this.project.slug) || this.hoverMissing) return;');
  });

  it("each pane's poster texture is destroyed with its source, before the app is", () => {
    expect(tile).toMatch(/destroyPoster\(\): void \{[\s\S]*?tex\.destroy\(true\);/);
    expect(world).toMatch(/destroy\(\): void \{[\s\S]*?tile\.destroyPoster\(\);[\s\S]*?this\.app\.destroy\(true, \{ children: true \}\);/);
  });
});
```

- [x] **Step 2: Run them**

Run: `npx vitest run tests/poster-texture.test.ts tests/floor-video.test.ts`

Expected: `tests/poster-texture.test.ts` PASSES (2 tests: Pixi behaves as the spec read it). In
`tests/floor-video.test.ts` the two new pins FAIL
(`expected … to contain 'if (!hasHoverClip(this.project.slug) || this.hoverMissing) return;'`).

- [x] **Step 3: Write the two fixes**

In `src/works/tile.ts`, find:

```ts
import { aspectRatio, isPlaceholder, loopSrcChain, projectAssetUrl } from '../lib/content';
```

Replace it with:

```ts
import { aspectRatio, hasHoverClip, isPlaceholder, loopSrcChain, projectAssetUrl } from '../lib/content';
```

In `src/works/tile.ts`, find:

```ts
  swapToMontage(): void {
    if (this.hoverMissing) return; // keep the loop rolling — no montage exists
```

Replace it with:

```ts
  swapToMontage(): void {
    // keep the loop rolling when no montage exists: the manifest lists none for this film (no request is made), or
    // one was listed and failed
    if (!hasHoverClip(this.project.slug) || this.hoverMissing) return;
```

In `src/works/tile.ts`, find:

```ts
  /** One brief glitch tick on the dithered poster — sleeping tiles stay alive. */
```

Directly before it, add:

```ts
  /** The poster's texture and its canvas, given back when the floor is torn down. (The app's teardown destroys the
   *  sprites and leaves their textures, and Texture.from(canvas) keeps a texture in Pixi's cache until the texture
   *  itself is destroyed: every chapter flip left a chapter's posters behind. tests/poster-texture.test.ts) */
  destroyPoster(): void {
    const tex = this.posterSprite.texture;
    this.posterSprite.texture = Texture.EMPTY;
    tex.destroy(true);
  }

```

In `src/works/world.ts`, find:

```ts
      tile.killTweens(); // no tween may outlive the scene graph it writes into
      tile.releaseVideo();
```

Replace it with:

```ts
      tile.killTweens(); // no tween may outlive the scene graph it writes into
      tile.releaseVideo();
      tile.destroyPoster(); // (the app's teardown below leaves textures: works/tile.ts)
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/poster-texture.test.ts tests/floor-video.test.ts`

Expected: PASS, 12 tests in the two files.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Measure after, with Task 6's two runs**

Build into a scratch folder and repeat Task 6's Step 3 (six flips, the 4 GB profile) and Step 4 (five places pointed
at, the development PC as it is).

Expected: the live canvases do not grow from flip to flip, and no request ends in `hover.mp4`. What the plan's author
measured on a scratch build (the 12-film chapter): canvases 19, then 13, 21, 13, 21, 13, 21 after the six flips
(69 before the fix); no `hover.mp4` request and 11 video requests (3 and 14 before). If your canvases still grow,
list their sizes (`width + 'x' + height`) to see what is kept, and first make sure the harness released its object
group after each count (Task 6).

Add the two readings to the plan, under Task 6's list.

- [x] **Step 6: Commit**

```bash
git add -- src/works/tile.ts src/works/world.ts tests/poster-texture.test.ts tests/floor-video.test.ts docs/superpowers/plans/2026-11-24-work-wall-video-ship-a.md
git commit -m "fix(works): no request for a hover clip that is not there; poster textures leave with the floor" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 12: The pane glow is drawn once on a canvas (it comes to `master` only with the coordinator's go)

**Lane:** its own worktree; it touches only the two files below and may run beside everything.

**Files:**
- Modify: `src/works/glow.ts`
- Test: `tests/glow.test.ts`

**Interfaces:**
- Consumes: Pixi's `Sprite`, `Texture`; gsap. Nothing of this plan's other tasks.
- Produces, exported from `src/works/glow.ts`: `GLOW_SOFT = 12`, `GLOW_PAD = 36`, `GLOW_BAKE = 0.5`, and
  `class PaneGlow` with the same constructor and methods as today
  (`new PaneGlow(accent: number, w: number, h: number, rest?: number)`, `sprite`, `rest`, `fadeTo(alpha, d)`,
  `kill()`). `src/works/tile.ts` uses it unchanged.

**This task changes a look on every machine**, not only on weak ones: the glow under a featured pane and under a
hovered pane is no longer a live blur but one soft picture. The softness was matched by arithmetic (the blur of
strength 18 in four passes a side spreads about as far as a sigma of 12 px), and the two looked alike in the author's
scratch pictures; the owner's eye decides. So the task ends with a before and after picture, and its commit stays on
its lane's branch until the coordinator says go.

- [x] **Step 1: Write the failing tests**

In `tests/glow.test.ts`, find:

```ts
import { BlurFilter } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { PaneGlow } from '../src/works/glow';
```

Replace it with:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { GLOW_BAKE, GLOW_PAD, GLOW_SOFT, PaneGlow } from '../src/works/glow';
```

In `tests/glow.test.ts`, find:

```ts
beforeAll(() => {
  // the blur's shader setup probes a canvas for float precision; in node it gets one with no context
  (globalThis as Record<string, unknown>).document = { createElement: () => ({ getContext: () => null }) };
});

describe('a pane glow runs its blur only while it can be seen (Pixi blurs alpha-0 objects every frame)', () => {
```

Replace it with:

```ts
beforeAll(() => {
  // in node the glow's bake gets a canvas with no 2D context: it falls back to a plain rectangle of the size given
  (globalThis as Record<string, unknown>).document = { createElement: () => ({ getContext: () => null }) };
});

describe('a pane glow shows only while it can be seen (its rule since 2026-09-27, kept through the bake)', () => {
```

In `tests/glow.test.ts`, find the block that begins:

```ts
  it('keeps its look: the accent, the size it is given, one blur of strength 18', () => {
```

and ends, a few lines further down, with:

```ts
    expect(blur.strength).toBe(18);
  });
});
```

Replace all of it, both ends included, with:

```ts
  it('keeps its accent and the size it is given, and runs no filter', () => {
    const g = new PaneGlow(ACC, 472, 292, 0.14);
    expect(g.sprite.tint).toBe(ACC);
    expect(g.sprite.width).toBeCloseTo(472);
    expect(g.sprite.height).toBeCloseTo(292);
    expect(g.sprite.filters ?? []).toHaveLength(0);
  });
});

describe('the glow is one soft rectangle, drawn once per pane size on a 2D canvas (no blur runs: spec §4.7)', () => {
  /** a canvas that records what is drawn on it */
  class FakeCanvas {
    width = 0;
    height = 0;
    readonly ctx = { shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, fillStyle: '', rects: [] as number[][] };
    getContext(kind: string) {
      if (kind !== '2d') return null;
      return Object.assign(this.ctx, {
        fillRect: (x: number, y: number, w: number, h: number) => { this.ctx.rects.push([x, y, w, h]); },
      });
    }
  }

  function withCanvas<T>(run: (made: FakeCanvas[]) => T): T {
    const g = globalThis as Record<string, unknown>;
    const keep = { doc: g.document, canvas: g.HTMLCanvasElement };
    const made: FakeCanvas[] = [];
    g.HTMLCanvasElement = FakeCanvas;
    g.document = { createElement: () => { const c = new FakeCanvas(); made.push(c); return c; } };
    try {
      return run(made);
    } finally {
      g.document = keep.doc;
      g.HTMLCanvasElement = keep.canvas;
    }
  }

  it('the canvas is the pane and its soft margin at half size; only the shadow of the rectangle lands on it', () => {
    withCanvas((made) => {
      const g = new PaneGlow(ACC, 300, 200);
      expect(made).toHaveLength(1);
      const c = made[0]!;
      expect([c.width, c.height]).toEqual([(300 + 2 * GLOW_PAD) * GLOW_BAKE, (200 + 2 * GLOW_PAD) * GLOW_BAKE]);
      expect([c.width, c.height]).toEqual([186, 136]);
      // a canvas shadow's blur is twice its sigma: the glow's softness, at the bake's scale
      expect(c.ctx.shadowBlur).toBe(2 * GLOW_SOFT * GLOW_BAKE);
      expect(c.ctx.shadowColor).toBe('#fff');
      // the rectangle itself is drawn off the canvas, one canvas width to the left; its shadow is thrown back on
      const off = c.ctx.shadowOffsetX;
      expect(off).toBeGreaterThanOrEqual(c.width);
      expect(c.ctx.rects).toEqual([[GLOW_PAD * GLOW_BAKE - off, GLOW_PAD * GLOW_BAKE, 150, 100]]);
      // the sprite is as large as the rectangle and its margin: the soft edge falls where the blur used to put it
      expect(g.sprite.width).toBeCloseTo(300 + 2 * GLOW_PAD);
      expect(g.sprite.height).toBeCloseTo(200 + 2 * GLOW_PAD);
      expect(g.sprite.tint).toBe(ACC);
      expect(g.sprite.filters ?? []).toHaveLength(0);
    });
  });

  it('panes of one size share one picture; another size gets its own', () => {
    withCanvas((made) => {
      const a = new PaneGlow(ACC, 310, 210);
      const b = new PaneGlow(0xff5f1f, 310, 210, 0.14);
      const c = new PaneGlow(ACC, 520, 210);
      expect(made).toHaveLength(2);
      expect(b.sprite.texture).toBe(a.sprite.texture);
      expect(c.sprite.texture).not.toBe(a.sprite.texture);
      expect(b.sprite.tint).toBe(0xff5f1f); // the colour is the sprite's tint, never baked in
    });
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/glow.test.ts`

Expected: FAIL, 3 failed and 5 passed. "keeps its accent and the size it is given, and runs no filter" fails because
the sprite still carries one `BlurFilter`; the two tests of the new `describe` fail because no canvas is made.

- [x] **Step 3: Write the code**

This step replaces the whole file (74 lines today; its last change was `d14eda9`).

Replace the whole of `src/works/glow.ts` with:

```ts
import { Sprite, Texture } from 'pixi.js';
import gsap from 'gsap';

/** How soft the glow's edge is: the sigma of its blur, in the pane's own pixels. (The blur filter it replaces ran
 *  strength 18 in four passes a side, which spreads about as far.) */
export const GLOW_SOFT = 12;
/** the margin the soft edge needs around the rectangle: past three sigmas nothing is left to see */
export const GLOW_PAD = 3 * GLOW_SOFT;
/** the picture is drawn at half size: nothing in it is sharper than the blur */
export const GLOW_BAKE = 0.5;

/** one picture per pane size, kept for the visit and shared by every pane of that size and by every floor */
const baked = new Map<string, Texture | null>();

/** A white rectangle of w × h with a blurred edge, on a canvas GLOW_PAD larger on every side. Only the rectangle's
 *  shadow is drawn: the rectangle itself stands off the canvas, and a canvas shadow is a true blur of its shape (its
 *  `shadowBlur` is twice the sigma). Null where no 2D canvas is to be had. */
function softRect(w: number, h: number): Texture | null {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  const kept = baked.get(key);
  if (kept !== undefined) return kept;
  let tex: Texture | null = null;
  const c = document.createElement('canvas');
  c.width = Math.ceil((w + 2 * GLOW_PAD) * GLOW_BAKE);
  c.height = Math.ceil((h + 2 * GLOW_PAD) * GLOW_BAKE);
  const ctx = c.getContext('2d');
  if (ctx) {
    const off = c.width;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 2 * GLOW_SOFT * GLOW_BAKE;
    ctx.shadowOffsetX = off;
    ctx.fillStyle = '#fff';
    ctx.fillRect(GLOW_PAD * GLOW_BAKE - off, GLOW_PAD * GLOW_BAKE, w * GLOW_BAKE, h * GLOW_BAKE);
    tex = Texture.from(c);
  }
  baked.set(key, tex);
  return tex;
}

/** A pane's underglow: a soft accent rectangle behind the card.
 *
 *  It used to be a white sprite under a blur filter of eight passes, which Pixi ran every frame the glow showed, on
 *  every featured pane at rest and on every hovered one; the weak-GPU floor's cost was those glows (2026-09-28). Now
 *  the soft rectangle is drawn once per pane size on a 2D canvas (softRect) and the sprite only tints it: no filter
 *  runs. Its rule stays: it stands hidden whenever it is fully faded, and shows the moment it starts to rise. */
export class PaneGlow {
  readonly sprite: Sprite;

  /** `rest` is the alpha it idles at: a featured pane keeps a faint glow, the others none. */
  constructor(accent: number, w: number, h: number, readonly rest = 0) {
    const soft = softRect(w, h);
    const g = new Sprite(soft ?? Texture.WHITE);
    this.sprite = g;
    g.anchor.set(0.5);
    // (the picture carries its soft margin; without a 2D canvas the glow is a plain rectangle of the size given)
    g.width = soft ? w + 2 * GLOW_PAD : w;
    g.height = soft ? h + 2 * GLOW_PAD : h;
    g.tint = accent;
    g.alpha = rest;
    g.visible = rest > 0;
  }

  /** Fade to `alpha` over `d` seconds — up for a hover, back to rest after it. */
  fadeTo(alpha: number, d: number): void {
    const g = this.sprite;
    gsap.killTweensOf(g);
    g.visible = true;
    gsap.to(g, { alpha, duration: d, onComplete: () => { g.visible = g.alpha > 0; } });
  }

  kill(): void {
    gsap.killTweensOf(this.sprite);
  }
}
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/glow.test.ts`

Expected: PASS, 8 tests.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit on the lane's branch**

```bash
git add -- src/works/glow.ts tests/glow.test.ts
git commit -m "perf(works): the pane glow is drawn once on a canvas - no blur filter runs" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

- [x] **Step 6: The before and after pictures, and the cost**

Two builds into scratch folders: this lane's parent commit ("before") and this lane's head ("after"). With the
harness, for each build: the development PC as it is, 1366×768, `/works.html?gfx=full`.

1. 9 s after `rvlBooted`: stop the floor's ticker (`rvlWorld.app.ticker.stop()`), take a screenshot, start it again
   (`rvlWorld.app.ticker.start()`). This is the picture at rest: the featured panes' resting glow.
2. Move the pointer to the middle of the window, wait 2.5 s, take a screenshot. This is the hovered pane's glow.
3. List the sizes of the live textures, as in Task 6's Step 5.

Save the four pictures in a scratch folder outside the repository as `glow-rest-before.png`, `glow-rest-after.png`,
`glow-hover-before.png`, `glow-hover-after.png`, and look at each pair yourself first: the glow must be a soft haze
in the pane's accent colour with no hard edge and no visible rectangle, and about as wide as before.

Expected for the textures: the blur's render targets are gone. Measured by the plan's author with one pane pointed
at: four textures of 2048×1024, three of 1024×1024 and three of 1024×512 before (about 50 MB); one of 2048×1024
after (the hover's desaturation pass), and two or three small pictures of the glow itself (272×183 and the like).

- [x] **Step 7: Hand over, and wait for the go**

Give the coordinator the four pictures' full paths and the two texture lists, and say plainly: this changes the look
of the glow on every machine, the pictures are for the owner, and the commit is not on `master`.

- If the coordinator says go: rebase the lane on `master`, run `npx tsc --noEmit` and `npx vitest run tests/glow.test.ts`,
  and fast-forward `master` to it. No push.
- If the owner wants the glow softer or tighter: `GLOW_SOFT` in `src/works/glow.ts` is the one number. The test reads
  the constants and follows, but for two lines that write today's canvas out in full (`[186, 136]`, and `150, 100` in
  the rectangle): change them with it, and make new pictures.
- If there is no go by Task 15: Task 15 runs without this task and says so in its table (the rows on Pixi's textures
  then read higher).

### Task 13: Three readings that are only shown: the loops' health, the meter, processor pressure

**Lane:** the floor's spine, after Task 11.

**Files:**
- Create: `src/works/loop-health.ts`, `src/lib/meter.ts`, `src/lib/pressure.ts`, `tests/loop-health.test.ts`,
  `tests/meter.test.ts`
- Modify: `src/works/tile.ts`
- Test: `tests/floor-video.test.ts`

**Interfaces:**
- Consumes: nothing of the other tasks (`ProjectTile` only gains a method).
- Produces:
  - `src/works/loop-health.ts`: `HEALTH_AFTER_MS = 3000`, `HEALTH_OVER_MS = 5000`, `HEALTH_SHARE = 0.5`,
    `HEALTH_RESUME_MS = 4000`, `HEALTH_MIN_LOOPS = 2`, `HEALTH_GAP_MS = 2500`,
    `interface LoopSample { slug: string; playingFor: number; presented: number; buffered: boolean; fps: number }`,
    `interface HealthReading { counted: number; presented: number | null; due: number | null; judged: boolean; failed: boolean }`,
    `class LoopHealth { read(now: number, samples: LoopSample[], quiet: boolean): HealthReading }`
  - `src/lib/meter.ts`: `textureBytes(renderer: { texture: object }): number`, `heapBytes(): number | null`
  - `src/lib/pressure.ts`: `type PressureState = 'nominal' | 'fair' | 'serious' | 'critical' | 'no reading' | 'not offered'`,
    `watchPressure(): () => PressureState`
  - `ProjectTile.loopSample(now: number, fps: number): LoopSample | null`

**Ship A reads these and acts on none of them** (spec §3.1). Nothing here is called until Task 14 shows them on the
readout; nothing switches the floor, steps the tier or sheds a video. The numbers above are the spec's as designed
today, and ship B may move them after the old laptop has been read.

Two facts about Pixi 8.20 that the meter leans on, both found by running it: the renderer's `texture.managedTextures`
is marked deprecated (since 8.15) and still served, and an unloaded texture leaves a `null` in it. The meter skips the
holes, and one test checks that the list is still there.

- [x] **Step 1: Write the failing tests**

Create `tests/loop-health.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LoopHealth, type HealthReading, type LoopSample } from '../src/works/loop-health';

// THE LOOPS' HEALTH READING, on made-up readings (spec 2026-11-24-work-wall-video-design, §4.5). Ship A shows it on
// the readout and lets it decide nothing; these are the rules ship B will act on.

interface Loop { slug: string; fps: number; rate: number; from?: number; buffered?: boolean }

/** One reading a second for `seconds`, from `start`. Each loop was told to play at `from` (default: the start) and
 *  presents `rate` frames a second. Returns every reading. */
function run(h: LoopHealth, loops: Loop[], seconds: number, start = 0, quiet: (t: number) => boolean = () => false): HealthReading[] {
  const out: HealthReading[] = [];
  for (let i = 0; i <= seconds; i++) {
    const now = start + i * 1000;
    const samples: LoopSample[] = loops.map((l) => ({
      slug: l.slug,
      playingFor: now - (l.from ?? start),
      presented: Math.max(0, ((now - (l.from ?? start)) / 1000) * l.rate),
      buffered: l.buffered ?? true,
      fps: l.fps,
    }));
    out.push(h.read(now, samples, quiet(now)));
  }
  return out;
}

const loop = (slug: string, rate: number, over: Partial<Loop> = {}): Loop => ({ slug, fps: 24, rate, ...over });

describe("the loops' health reading: the videos' own frames against the frames due", () => {
  it('healthy loops present their frames: judged, and not failed', () => {
    const last = run(new LoopHealth(), [loop('a', 24), loop('b', 24), loop('c', 24)], 10).at(-1)!;
    expect(last).toMatchObject({ counted: 3, judged: true, failed: false });
    expect(last.presented).toBeCloseTo(360);
    expect(last.due).toBeCloseTo(360);
  });

  it('under half of the frames due over 5 s fails; exactly half does not', () => {
    expect(run(new LoopHealth(), [loop('a', 11), loop('b', 11)], 10).at(-1)).toMatchObject({ judged: true, failed: true });
    expect(run(new LoopHealth(), [loop('a', 12), loop('b', 12)], 10).at(-1)).toMatchObject({ judged: true, failed: false });
  });

  it("a loop's frame rate is its own: a 29.97 loop owes more frames than a 24", () => {
    const last = run(new LoopHealth(), [loop('a', 24), loop('b', 14, { fps: 29.97 })], 10).at(-1)!;
    expect(last.due).toBeCloseTo((24 + 29.97) * 5);
    expect(last.presented).toBeCloseTo((24 + 14) * 5);
  });

  it('a counted loop that presents nothing counts as none of its frames: the frozen pane', () => {
    // one healthy loop and two frozen: 24 of 72 frames a second
    expect(run(new LoopHealth(), [loop('a', 24), loop('b', 0), loop('c', 0)], 10).at(-1)).toMatchObject({ counted: 3, judged: true, failed: true });
  });

  it('a loop still downloading is not counted: a slow line is not a slow machine', () => {
    const last = run(new LoopHealth(), [loop('a', 24), loop('b', 24), loop('c', 0, { buffered: false })], 10).at(-1)!;
    expect(last).toMatchObject({ counted: 2, judged: true, failed: false });
  });

  it("a loop's first 3 s are not counted, and nothing is judged before 5 s of counted readings", () => {
    const all = run(new LoopHealth(), [loop('a', 0), loop('b', 0)], 9);
    // counted from 3 s, so the first 5 s window ends at 8 s
    expect(all.slice(0, 8).some((r) => r.judged)).toBe(false);
    expect(all[8]).toMatchObject({ counted: 2, judged: true, failed: true });
  });

  it('a single counted loop is not judged', () => {
    expect(run(new LoopHealth(), [loop('a', 0)], 12).at(-1)).toMatchObject({ counted: 1, judged: false, failed: false });
  });

  it('a hidden page or a paused floor is not judged, and the count starts afresh after it', () => {
    const h = new LoopHealth();
    const all = run(h, [loop('a', 0), loop('b', 0)], 20, 0, (t) => t >= 9000 && t <= 12000);
    expect(all[8].failed).toBe(true);
    for (const r of all.slice(9, 13)) expect(r).toMatchObject({ counted: 0, presented: null, judged: false, failed: false });
    // the first reading after the quiet is at 13 s: the 5 s window starts there
    expect(all.slice(13, 18).some((r) => r.judged), 'the 5 s window starts again').toBe(false);
    expect(all[18]).toMatchObject({ judged: true, failed: true });
  });

  it('a gap between readings (the tab was hidden: the ticker stood still) starts the count afresh too', () => {
    const h = new LoopHealth();
    run(h, [loop('a', 0), loop('b', 0)], 9);
    // (the same two loops, told to play at 0 and still playing a minute later)
    const after = run(h, [loop('a', 0, { from: 0 }), loop('b', 0, { from: 0 })], 6, 60000);
    expect(after.slice(0, 5).some((r) => r.judged)).toBe(false);
    expect(after[5]).toMatchObject({ judged: true, failed: true });
  });

  it('a pane whose video was made anew (its counter fell) is counted from its next window', () => {
    const h = new LoopHealth();
    run(h, [loop('a', 24), loop('b', 24), loop('c', 24)], 8);
    // c's element is new at 9 s: it has presented 0 frames again, and has played 4 s
    const r = h.read(9000, [
      { slug: 'a', playingFor: 9000, presented: 216, buffered: true, fps: 24 },
      { slug: 'b', playingFor: 9000, presented: 216, buffered: true, fps: 24 },
      { slug: 'c', playingFor: 4000, presented: 10, buffered: true, fps: 24 },
    ], false);
    expect(r).toMatchObject({ counted: 2, judged: true, failed: false });
  });
});
```

Create `tests/meter.test.ts`:

```ts
import { GlTextureSystem, GpuTextureSystem } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';
import { heapBytes, textureBytes } from '../src/lib/meter';
import { watchPressure } from '../src/lib/pressure';

// TWO READINGS SHIP A ONLY SHOWS (spec 2026-11-24-work-wall-video-design, §4.9): what the site itself holds, and the
// processor's pressure where the browser offers it. They go to the readout (?stats=1) and decide nothing yet.

describe('the meter and the pressure reading', () => {
  const g = globalThis as Record<string, unknown>;
  afterEach(() => {
    delete g.PressureObserver;
  });

  it("the meter adds up Pixi's textures as width × height × 4", () => {
    const renderer = { texture: { managedTextures: [{ pixelWidth: 640, pixelHeight: 360 }, { pixelWidth: 2048, pixelHeight: 1024 }] } };
    expect(textureBytes(renderer)).toBe(640 * 360 * 4 + 2048 * 1024 * 4);
    expect(textureBytes({ texture: { managedTextures: [] } })).toBe(0);
    expect(textureBytes({ texture: {} })).toBe(0); // a renderer that keeps no list
    // an unloaded source leaves a hole in Pixi's list: it holds nothing
    expect(textureBytes({ texture: { managedTextures: [null, { pixelWidth: 400, pixelHeight: 225 }, null] } })).toBe(400 * 225 * 4);
  });

  it("Pixi's texture systems still serve the list the meter reads (marked deprecated since 8.15, and served)", () => {
    for (const system of [GlTextureSystem, GpuTextureSystem]) {
      expect(Object.getOwnPropertyDescriptor(system.prototype, 'managedTextures')?.get, system.name).toBeTypeOf('function');
    }
  });

  it('the heap is read where the browser reports it, and null where it does not', () => {
    const h = heapBytes();
    expect(h === null || typeof h === 'number').toBe(true);
  });

  it('without the observer, pressure is NOT OFFERED', () => {
    expect(watchPressure()()).toBe('not offered');
  });

  it('with it: NO READING until one arrives, then the latest state; an unknown state changes nothing', () => {
    let deliver: (records: Array<{ state?: unknown }>) => void = () => {};
    let watched: unknown[] = [];
    g.PressureObserver = class {
      constructor(cb: (records: Array<{ state?: unknown }>) => void) { deliver = cb; }
      observe(...a: unknown[]) { watched = a; return Promise.resolve(); }
    };
    const read = watchPressure();
    expect(watched).toEqual(['cpu', { sampleInterval: 1000 }]);
    expect(read()).toBe('no reading');
    deliver([{ state: 'nominal' }, { state: 'serious' }]);
    expect(read()).toBe('serious');
    deliver([{ state: 'melting' }]);
    expect(read()).toBe('serious');
    deliver([{ state: 'fair' }]);
    expect(read()).toBe('fair');
  });

  it('a browser that refuses the source leaves NO READING, quietly', async () => {
    g.PressureObserver = class {
      observe() { return Promise.reject(new Error('NotSupportedError')); }
    };
    const read = watchPressure();
    await Promise.resolve();
    expect(read()).toBe('no reading');
    g.PressureObserver = class {
      constructor() { throw new Error('refused'); }
    };
    expect(watchPressure()()).toBe('no reading');
  });
});
```

At the end of `tests/floor-video.test.ts`, add:

```ts

describe("a pane reports its own loop to the health reading (pins)", () => {
  const tile = read('src/works/tile.ts');

  it("the frames presented are the element's own totals: decoded, less dropped", () => {
    expect(tile).toContain('loopSample(now: number, fps: number): LoopSample | null {');
    expect(tile).toContain('presented: q.totalVideoFrames - q.droppedVideoFrames,');
  });

  it('the clock starts when the pane is told to play, and a browser without the totals reports nothing', () => {
    expect(tile).toContain('this.playSince = performance.now();');
    expect(tile).toContain("typeof v.getVideoPlaybackQuality !== 'function'");
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/loop-health.test.ts tests/meter.test.ts tests/floor-video.test.ts`

Expected: FAIL in all three files: `Cannot find module '../src/works/loop-health'`,
`Cannot find module '../src/lib/meter'`, and the two new pins of `tests/floor-video.test.ts`.

- [x] **Step 3: Write the three modules and the pane's sample**

Create `src/works/loop-health.ts`:

```ts
/** THE LOOPS' HEALTH READING (spec 2026-11-24-work-wall-video-design, §4.5). Smooth frames on the page say nothing
 *  about starving video decoders: a chapter of loops can freeze while the floor still draws at 60. So the floor reads the
 *  videos themselves: once a second, for each of the panes' own loops that is playing, the frames it has presented
 *  against the frames it should have.
 *
 *  SHIP A MEASURES, SHIP B ACTS (§3.1): the reading goes to the readout (`?stats=1`) and decides nothing. Its numbers
 *  are set for good after the old laptop has been read; from ship B a failed reading switches the floor to the wall.
 *
 *  - A loop is counted once it has been told to play for HEALTH_AFTER_MS and its data reaches a second past the play
 *    position, or the file's end. A loop still downloading is not counted: a slow line is not a slow machine.
 *  - A counted loop that presents nothing counts as none of its frames: that is the frozen pane.
 *  - The counted loops together are judged over HEALTH_OVER_MS: under HEALTH_SHARE of the frames due, they fail.
 *  - Not judged: a hidden page or a paused floor, the first HEALTH_RESUME_MS after either, and fewer than
 *    HEALTH_MIN_LOOPS counted loops.
 *
 *  Pure, and tested on made-up readings (tests/loop-health.test.ts). */
export const HEALTH_AFTER_MS = 3000;
export const HEALTH_OVER_MS = 5000;
export const HEALTH_SHARE = 0.5;
export const HEALTH_RESUME_MS = 4000;
export const HEALTH_MIN_LOOPS = 2;
/** readings further apart than this had a hidden page or a stopped ticker between them */
export const HEALTH_GAP_MS = 2500;

/** One of the panes' own loops at one reading. */
export interface LoopSample {
  slug: string;
  /** ms since the pane was told to play */
  playingFor: number;
  /** frames presented so far: the element's own totals, decoded less dropped */
  presented: number;
  /** its data reaches a second past the play position, or the file's end */
  buffered: boolean;
  /** the loop's frame rate as the manifest lists it; 24 where it lists none */
  fps: number;
}

export interface HealthReading {
  /** loops counted over the whole of the last 5 s */
  counted: number;
  /** the frames those loops presented in the last 5 s, and the frames due; null until 5 s of readings stand */
  presented: number | null;
  due: number | null;
  judged: boolean;
  /** judged, and under half of the frames due */
  failed: boolean;
}

const NOTHING: HealthReading = { counted: 0, presented: null, due: null, judged: false, failed: false };

export class LoopHealth {
  private readings: Array<{ at: number; loops: Map<string, { presented: number; fps: number }> }> = [];
  private lastAt: number | null = null;
  /** when the page last showed again, or the floor last resumed */
  private resumedAt = -Infinity;

  /** One reading. `quiet`: the page is hidden or the floor is paused. */
  read(now: number, samples: LoopSample[], quiet: boolean): HealthReading {
    const gap = this.lastAt !== null && now - this.lastAt > HEALTH_GAP_MS;
    this.lastAt = now;
    if (quiet || gap) {
      this.readings = [];
      this.resumedAt = now;
      if (quiet) return NOTHING;
    }
    const loops = new Map<string, { presented: number; fps: number }>();
    for (const s of samples) {
      if (s.playingFor >= HEALTH_AFTER_MS && s.buffered) loops.set(s.slug, { presented: s.presented, fps: s.fps });
    }
    this.readings.push({ at: now, loops });
    // keep the newest reading that is at least 5 s old as the window's start, and nothing before it
    while (this.readings.length > 1 && this.readings[1].at <= now - HEALTH_OVER_MS) this.readings.shift();
    const first = this.readings[0];
    if (first.at > now - HEALTH_OVER_MS) return { ...NOTHING, counted: loops.size };

    let counted = 0;
    let presented = 0;
    let due = 0;
    for (const [slug, cur] of loops) {
      const was = first.loops.get(slug);
      // counted at both ends of the window; a counter that fell is a new video element, counted from its next window
      if (!was || cur.presented < was.presented) continue;
      counted++;
      presented += cur.presented - was.presented;
      due += (cur.fps * (now - first.at)) / 1000;
    }
    const judged = counted >= HEALTH_MIN_LOOPS && now - this.resumedAt >= HEALTH_RESUME_MS;
    return { counted, presented, due, judged, failed: judged && presented < due * HEALTH_SHARE };
  }
}
```

Create `src/lib/meter.ts`:

```ts
/** THE METER: what the site itself holds (spec 2026-11-24-work-wall-video-design, §4.9). No browser tells a page how
 *  much of the machine's memory is free, so the site adds up its own: the textures Pixi has uploaded, and the
 *  JavaScript heap where the browser reports it. It cannot see the video decoders or the graphics process's own
 *  memory, which are the larger part: this guards against the site's own growth and is no reading of the machine.
 *
 *  SHIP A SHOWS IT (the readout, `?stats=1`), against the budget (lib/quality.ts budgetFor). Nothing is shed over the
 *  budget until ship B. */

/** A renderer's list of managed texture sources. The WebGL and WebGPU renderers keep one; Pixi's canvas renderer,
 *  which the site never asks for, keeps none. A source that was unloaded leaves a hole in the list (Pixi 8.20 keeps
 *  them in a hash and nulls the entry), and holds nothing. Pixi marks this list as deprecated since 8.15 and still
 *  serves it: tests/meter.test.ts reads it from a real texture system, so an upgrade that drops it is seen there. */
type Managed = ReadonlyArray<{ pixelWidth: number; pixelHeight: number } | null>;

/** Bytes of the textures a renderer manages, each counted as width × height × 4: posters, video frames, glows, and
 *  the filters' render targets. */
export function textureBytes(renderer: { texture: object }): number {
  let bytes = 0;
  for (const s of (renderer.texture as { managedTextures?: Managed }).managedTextures ?? []) {
    if (s) bytes += s.pixelWidth * s.pixelHeight * 4;
  }
  return bytes;
}

/** The JavaScript heap in bytes, where the browser reports it (`performance.memory`: Chrome and Edge); else null. */
export function heapBytes(): number | null {
  const m = (performance as Performance & { memory?: { usedJSHeapSize?: unknown } }).memory;
  return m && typeof m.usedJSHeapSize === 'number' ? m.usedJSHeapSize : null;
}
```

Create `src/lib/pressure.ts`:

```ts
/** PROCESSOR PRESSURE (spec 2026-11-24-work-wall-video-design, §4.9). A machine out of memory starts swapping, and
 *  swapping shows as load. Where the browser has a PressureObserver, it reports the whole machine's processor state:
 *  `nominal`, `fair`, `serious`, `critical`. The reading is the machine's, not the page's.
 *
 *  SHIP A SHOWS IT on the readout (`?stats=1`) and nothing acts on it; the observer is started only when the readout
 *  is. An observer may deliver nothing at all (it did not in the spec's check, §2.7), which the readout says in
 *  plain words. */
export type PressureState = 'nominal' | 'fair' | 'serious' | 'critical' | 'no reading' | 'not offered';

type Observer = new (cb: (records: Array<{ state?: unknown }>) => void) => {
  observe(source: string, options?: { sampleInterval?: number }): Promise<void> | void;
};

const STATES: PressureState[] = ['nominal', 'fair', 'serious', 'critical'];

/** Start watching `cpu`, one reading a second. Returns the reader of the latest state: `not offered` without the
 *  observer, `no reading` until one arrives (or for good, where the browser refuses the source). */
export function watchPressure(): () => PressureState {
  const Ctor = (globalThis as { PressureObserver?: Observer }).PressureObserver;
  if (typeof Ctor !== 'function') return () => 'not offered';
  let state: PressureState = 'no reading';
  try {
    const observer = new Ctor((records) => {
      const s = records[records.length - 1]?.state;
      if (STATES.includes(s as PressureState)) state = s as PressureState;
    });
    void Promise.resolve(observer.observe('cpu', { sampleInterval: 1000 })).catch(() => { /* refused: no reading */ });
  } catch { /* refused: no reading */ }
  return () => state;
}
```

In `src/works/tile.ts`, find:

```ts
import { PaneGlow } from './glow';
```

Replace it with:

```ts
import { PaneGlow } from './glow';
import type { LoopSample } from './loop-health';
```

In `src/works/tile.ts`, find:

```ts
  private frameSeen = false;
```

Replace it with:

```ts
  private frameSeen = false;
  /** when this pane was last told to play its own loop (the page's clock) */
  private playSince = 0;
```

In `src/works/tile.ts`, find:

```ts
    this.mode = 'live';
    if (this.videoSprite) this.videoSprite.visible = this.frameSeen;
```

Replace it with:

```ts
    this.mode = 'live';
    this.playSince = performance.now();
    if (this.videoSprite) this.videoSprite.visible = this.frameSeen;
```

In `src/works/tile.ts`, find:

```ts
  hasVideo(): boolean {
    return !!this.video;
  }
```

Directly after it, add:

```ts

  /** This pane's own loop as the loops' health reading takes it (works/loop-health.ts): how long it has been told to
   *  play, the frames it has presented so far (the element's own totals), and whether its data reaches a second past
   *  the play position or the file's end. `fps` is the loop's frame rate, which the caller knows. Null while the pane
   *  sleeps or has no video, and in a browser that gives no totals: there the reading counts nothing. */
  loopSample(now: number, fps: number): LoopSample | null {
    const v = this.video;
    if (!v || this.mode === 'sleep' || typeof v.getVideoPlaybackQuality !== 'function') return null;
    const q = v.getVideoPlaybackQuality();
    let ahead = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime && v.currentTime <= v.buffered.end(i)) ahead = v.buffered.end(i);
    }
    return {
      slug: this.project.slug,
      playingFor: now - this.playSince,
      presented: q.totalVideoFrames - q.droppedVideoFrames,
      buffered: ahead >= Math.min(v.currentTime + 1, (v.duration || Infinity) - 0.05),
      fps,
    };
  }
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/loop-health.test.ts tests/meter.test.ts tests/floor-video.test.ts`

Expected: PASS, 28 tests in the three files.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add -- src/works/loop-health.ts src/lib/meter.ts src/lib/pressure.ts src/works/tile.ts tests/loop-health.test.ts tests/meter.test.ts tests/floor-video.test.ts
git commit -m "feat(works): the loops' health, the meter and processor pressure are read - shown only" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 14: The readout behind `?stats=1`

**Lane:** the floor's spine, after Task 13.

**Files:**
- Create: `src/lib/readout.ts`, `src/shell/stats.ts`, `src/styles/stats.css`, `tests/readout.test.ts`
- Modify: `src/works/world.ts`, `src/shell/shell.ts`
- Test: `tests/floor-video.test.ts`

**Interfaces:**
- Consumes: Task 2's `QualityReport`, `quality.report()`, `quality.budget(canvasPixels)`, and the existing
  `TIER_LABELS`; Task 8's `WallVideo.reading()`, `WallVideo.which`; Task 13's `LoopHealth`, `HealthReading`,
  `LoopSample`, `ProjectTile.loopSample`, `textureBytes`, `heapBytes`, `watchPressure`, `PressureState`; Task 5's
  `wallFor(chapter)`.
- Produces:
  - `src/lib/readout.ts`: `interface FloorReadings { mode; wall; playing; health; textures; videos; budget }`,
    `offerFloorReadings(read: (() => FloorReadings) | null): void`, `floorReadings(): FloorReadings | null`,
    `statsWanted(search: string): boolean`,
    `readoutLines(q: QualityReport, fps: number | null, f: FloorReadings | null, heap: number | null, pressure: PressureState, now: number): string[]`
  - `src/shell/stats.ts`: `mountStats(): void` (the panel `#rvl-stats`: a `<pre>` and a COPY button)
  - `WorksWorld.readings(): FloorReadings` (public: `rvlWorld.readings()` is what the harness reads in Task 15)

The seven lines are what the owner reads back from the old laptop, so their words are pinned in
`tests/readout.test.ts`. Three things to know:

- The spec gives the discarded tab no line of its own (§4.8) and asks ship A to show it (§3.1): it is the last
  item of the `DEVICE` line, and shows only when it is true.
- The spec's meter "lists, without adding them, the live video elements and their picture sizes" (§4.9), and the
  seven lines have no room for the list. It is in the floor's readings (`rvlWorld.readings().videos`) for the
  harness, and on no line.
- The panel lets presses and hovers through to the page under it (only COPY takes a press), so a pane or THE LIST's
  button under it still works while someone measures.

- [x] **Step 1: Write the failing tests**

Create `tests/readout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { QualityReport } from '../src/lib/quality';
import { floorReadings, offerFloorReadings, readoutLines, statsWanted, type FloorReadings } from '../src/lib/readout';

// THE READOUT (spec 2026-11-24-work-wall-video-design, §4.8): `?stats=1` shows seven lines. They are what the owner
// reads back from the old laptop, so their words are pinned here.

const report = (over: Partial<QualityReport> = {}): QualityReport => ({
  tier: 1, label: 'balanced', ceiling: 1, hardwareCeiling: 1, opened: 1, downs: [0, 0, 0], governed: true, pinned: null,
  weak: 'memory', lastSignal: null, stalls: 0, discarded: false,
  device: { memory: 4, threads: 4, coarse: false, gpu: 'ANGLE (Intel, Intel(R) HD Graphics 4000, OpenGL 4.1)', dataSaver: false },
  ...over,
});
const floor = (over: Partial<FloorReadings> = {}): FloorReadings => ({
  mode: 'wall',
  wall: { file: 'human.mp4', ready: true, fps: 23.6, dropped: 3, decoded: 1200 },
  playing: 1,
  health: { counted: 0, presented: null, due: null, judged: false, failed: false },
  textures: 40 * 1024 * 1024,
  videos: ['1904×1080'],
  budget: 96,
  ...over,
});
const MB = 1024 * 1024;

describe('the readout: seven lines, in plain words', () => {
  it('the old laptop on the wall', () => {
    expect(readoutLines(report(), 58.4, floor(), 9 * MB, 'no reading', 60000)).toEqual([
      'LEVEL      BALANCED · CEILING BALANCED · HARDWARE CEILING BALANCED · OPENED BALANCED · NO SIGNAL YET',
      'FRAMES     58 FPS · 0 STALLS',
      'WALL       MODE WALL · HUMAN.MP4 · 24 FPS PRESENTED · 3 DROPPED OF 1200 DECODED',
      'OWN LOOPS  1 PLAYING · NO LOOP COUNTED',
      'MEMORY     MACHINE 4 GB · TEXTURES 40 MB · HEAP 9 MB · BUDGET 96 MB',
      'PRESSURE   NO READING',
      'DEVICE     4 THREADS · FINE POINTER · WEAK BY ITS MEMORY · ANGLE (Intel, Intel(R) HD Graphics 4000, OpenGL 4.1)',
    ]);
  });

  it('a strong machine on its own loops, after a step down', () => {
    const q = report({
      tier: 1, ceiling: 1, hardwareCeiling: 2, opened: 2, weak: null, stalls: 1, lastSignal: { name: 'slow frames', at: 48000 },
      device: { memory: 32, threads: 24, coarse: false, gpu: null, dataSaver: false },
    });
    const f = floor({
      mode: 'own', wall: null, playing: 12, textures: 122 * MB, budget: 256,
      health: { counted: 12, presented: 1150, due: 1440, judged: true, failed: false },
    });
    const lines = readoutLines(q, 119.7, f, null, 'nominal', 60000);
    expect(lines[0]).toBe('LEVEL      BALANCED · CEILING BALANCED · HARDWARE CEILING FULL · OPENED FULL · LAST SIGNAL SLOW FRAMES 12 S AGO');
    expect(lines[1]).toBe('FRAMES     120 FPS · 1 STALL');
    expect(lines[2]).toBe('WALL       MODE OWN · NO WALL VIDEO');
    expect(lines[3]).toBe('OWN LOOPS  12 PLAYING · 1150 OF 1440 FRAMES OVER 5 S · KEEPING UP');
    expect(lines[4]).toBe('MEMORY     MACHINE 32 GB · TEXTURES 122 MB · HEAP NOT REPORTED · BUDGET 256 MB');
    expect(lines[5]).toBe('PRESSURE   NOMINAL');
    expect(lines[6]).toBe('DEVICE     24 THREADS · FINE POINTER · NOT WEAK · GPU NOT NAMED');
  });

  it('every reading has its plain words when it is missing, starving or over', () => {
    const starving = floor({ mode: 'own', wall: null, playing: 12, health: { counted: 12, presented: 400, due: 1440, judged: true, failed: true } });
    expect(readoutLines(report(), 30, starving, 0, 'serious', 0)[3]).toBe('OWN LOOPS  12 PLAYING · 400 OF 1440 FRAMES OVER 5 S · STARVING');
    const early = floor({ mode: 'own', wall: null, playing: 12, health: { counted: 12, presented: null, due: null, judged: false, failed: false } });
    expect(readoutLines(report(), 30, early, 0, 'serious', 0)[3]).toBe('OWN LOOPS  12 PLAYING · NO READING YET');
    const single = floor({ health: { counted: 1, presented: 110, due: 120, judged: false, failed: false } });
    expect(readoutLines(report(), 30, single, 0, 'serious', 0)[3]).toBe('OWN LOOPS  1 PLAYING · 110 OF 120 FRAMES OVER 5 S · NOT JUDGED');
    const starting = floor({ wall: { file: 'human-s.mp4', ready: false, fps: null, dropped: 0, decoded: 0 }, mode: 'wall-small' });
    expect(readoutLines(report(), 30, starting, 0, 'serious', 0)[2]).toBe('WALL       MODE WALL-SMALL · HUMAN-S.MP4 · STARTING');
    expect(readoutLines(report(), 30, floor({ mode: 'posters', wall: null }), 0, 'critical', 0)[2]).toBe('WALL       MODE POSTERS · NO WALL VIDEO');
    const over = floor({ textures: 90 * MB });
    expect(readoutLines(report(), 30, over, 9 * MB, 'fair', 0)[4]).toBe('MEMORY     MACHINE 4 GB · TEXTURES 90 MB · HEAP 9 MB · BUDGET 96 MB · OVER');
    expect(readoutLines(report(), null, floor(), 0, 'not offered', 0).slice(1, 2)).toEqual(['FRAMES     COUNTING · 0 STALLS']);
    expect(readoutLines(report(), 30, floor(), 0, 'not offered', 0)[5]).toBe('PRESSURE   NOT OFFERED');
  });

  it('a pinned page, a page that steers itself, a tablet, Save-Data and a discarded tab say so', () => {
    expect(readoutLines(report({ pinned: 2, tier: 2, ceiling: 2, governed: false }), 60, floor(), 0, 'no reading', 0)[0]).toMatch(/ · PINNED BY THE ADDRESS$/);
    expect(readoutLines(report({ governed: false, stalls: null }), 60, null, 0, 'no reading', 0).slice(0, 2)).toEqual([
      'LEVEL      BALANCED · CEILING BALANCED · HARDWARE CEILING BALANCED · OPENED BALANCED · NO SIGNAL YET · NOT STEERED ON THIS PAGE',
      'FRAMES     60 FPS · STALLS NOT COUNTED ON THIS PAGE',
    ]);
    const tablet = report({
      weak: 'pointer', discarded: true,
      device: { memory: null, threads: null, coarse: true, gpu: 'Apple GPU', dataSaver: true },
    });
    const lines = readoutLines(tablet, 60, null, null, 'not offered', 0);
    expect(lines[6]).toBe('DEVICE     THREADS NOT REPORTED · COARSE POINTER · WEAK BY ITS POINTER · Apple GPU · SAVE-DATA OR 2G · THIS TAB WAS DISCARDED AND LOADED AGAIN');
    // a page with no floor (the homepage, a film's page): the three floor lines say so
    expect(lines.slice(2, 5)).toEqual([
      'WALL       NO FLOOR ON THIS PAGE',
      'OWN LOOPS  NO FLOOR ON THIS PAGE',
      'MEMORY     MACHINE NOT REPORTED · HEAP NOT REPORTED · NO FLOOR ON THIS PAGE',
    ]);
  });

  it('only ?stats=1 asks for it', () => {
    expect(statsWanted('?stats=1')).toBe(true);
    expect(statsWanted('?ch=machine&stats=1&gfx=full')).toBe(true);
    expect(statsWanted('?stats=0')).toBe(false);
    expect(statsWanted('?stats')).toBe(false);
    expect(statsWanted('')).toBe(false);
  });

  it('the floor hands its readings over while it stands, and takes them back', () => {
    expect(floorReadings()).toBeNull();
    offerFloorReadings(() => floor({ playing: 7 }));
    expect(floorReadings()?.playing).toBe(7);
    offerFloorReadings(null);
    expect(floorReadings()).toBeNull();
  });
});
```

At the end of `tests/floor-video.test.ts`, add:

```ts

describe('the readout reads the floor and changes nothing (pins)', () => {
  const world = read('src/works/world.ts');
  const shell = read('src/shell/shell.ts');

  it('the floor offers its readings while it stands, and takes them back when it is destroyed', () => {
    expect(world).toContain('offerFloorReadings(() => w.readings());');
    expect(world).toMatch(/destroy\(\): void \{\s+offerFloorReadings\(null\);/);
  });

  it("the loops' health is read once a second and only kept: ship A acts on no reading", () => {
    expect(world).toContain('this.healthNow = this.health.read(now, samples, document.hidden || this.paused);');
    // (the reading's only reader is the readout)
    expect(world.match(/healthNow/g)).toHaveLength(3);
  });

  it('nothing of the readout loads without ?stats=1: the shell imports the panel only then', () => {
    expect(shell).toContain("if (statsWanted(location.search)) void import('./stats').then((m) => m.mountStats());");
    expect(shell).not.toMatch(/from '\.\/stats'/);
    for (const file of ['src/lib/quality.ts', 'src/works/world.ts', 'src/pages/works.ts']) {
      expect(read(file), file).not.toMatch(/shell\/stats|styles\/stats\.css/);
    }
  });

  it("the panel's sheet styles the panel and nothing else", () => {
    const css = read('src/styles/stats.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...css.matchAll(/(^|\})\s*([^{}]+)\{/g)].map((m) => m[2]!.trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) {
      for (const one of s.split(',')) expect(one.trim(), s).toMatch(/^#rvl-stats\b/);
    }
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/readout.test.ts tests/floor-video.test.ts`

Expected: FAIL. `tests/readout.test.ts` cannot find `../src/lib/readout`; the four new pins of
`tests/floor-video.test.ts` fail, the last of them with `ENOENT … src/styles/stats.css`.

- [x] **Step 3: Write the lines, the panel and its sheet; let the floor offer its readings; let the shell load the panel**

Create `src/lib/readout.ts`:

```ts
import type { PressureState } from './pressure';
import { TIER_LABELS, type FloorMode, type QualityReport, type Tier } from './quality';

/** THE READOUT (spec 2026-11-24-work-wall-video-design, §4.8; owner 2026-11-24: the site should "detect if the
 *  machine … have sufficient RAM", and say what it found). `?stats=1` on any page shows seven lines, refreshed once a
 *  second, with a COPY button: what the ladder decided and from what, and every reading of ship A and ship B. Ship
 *  B's readings (stalls, the loops' health, the meter against its budget, pressure, a discarded tab) are shown and
 *  decide nothing yet. Nothing is sent anywhere: the panel reads what the page already knows.
 *
 *  This file is the pure part: the lines as text (tested, tests/readout.test.ts), and the floor's hand-over of its
 *  readings. The panel itself is shell/stats.ts. */

/** What the WORK floor hands the readout (works/world.ts). Other pages have no floor. */
export interface FloorReadings {
  mode: FloorMode;
  /** the wall video, when one is playing or starting (works/wall.ts) */
  wall: { file: string; ready: boolean; fps: number | null; dropped: number; decoded: number } | null;
  /** how many of the panes' own videos are playing */
  playing: number;
  /** the loops' health reading (works/loop-health.ts) */
  health: { counted: number; presented: number | null; due: number | null; judged: boolean; failed: boolean };
  /** bytes of the textures Pixi holds for the floor (lib/meter.ts) */
  textures: number;
  /** every live video element's picture size, the wall's first and then the panes' own: the meter lists them and
   *  never adds them up (it cannot see a decoder's memory). Not one of the seven lines: read at
   *  `rvlWorld.readings().videos`. */
  videos: string[];
  /** the floor's budget in MB (lib/quality.ts budgetFor) */
  budget: number;
}

let floor: (() => FloorReadings) | null = null;

/** The floor offers its readings while it stands (`null` when it is destroyed). */
export function offerFloorReadings(read: (() => FloorReadings) | null): void {
  floor = read;
}

export function floorReadings(): FloorReadings | null {
  return floor ? floor() : null;
}

/** `?stats=1` asks for the readout; nothing else does. */
export function statsWanted(search: string): boolean {
  return new URLSearchParams(search).get('stats') === '1';
}

const MB = 1024 * 1024;
const tier = (t: Tier): string => TIER_LABELS[t].toUpperCase();
const mb = (bytes: number): string => `${Math.round(bytes / MB)} MB`;
const NO_FLOOR = 'NO FLOOR ON THIS PAGE';

/** The seven lines. `fps`: frames a second over the last second (null before the first second is in). `heap`: the
 *  JavaScript heap in bytes, or null where the browser does not report it. `now`: the page's clock
 *  (performance.now), the same clock as the report's last signal. */
export function readoutLines(
  q: QualityReport, fps: number | null, f: FloorReadings | null, heap: number | null, pressure: PressureState, now: number,
): string[] {
  const signal = q.lastSignal
    ? `LAST SIGNAL ${q.lastSignal.name.toUpperCase()} ${Math.max(0, Math.round((now - q.lastSignal.at) / 1000))} S AGO`
    : 'NO SIGNAL YET';
  const held = q.pinned !== null ? ' · PINNED BY THE ADDRESS' : q.governed ? '' : ' · NOT STEERED ON THIS PAGE';
  const level =
    `LEVEL      ${tier(q.tier)} · CEILING ${tier(q.ceiling)} · HARDWARE CEILING ${tier(q.hardwareCeiling)} · ` +
    `OPENED ${tier(q.opened)} · ${signal}${held}`;

  const stalls = q.stalls === null ? 'STALLS NOT COUNTED ON THIS PAGE' : `${q.stalls} ${q.stalls === 1 ? 'STALL' : 'STALLS'}`;
  const frames = `FRAMES     ${fps === null ? 'COUNTING' : `${Math.round(fps)} FPS`} · ${stalls}`;

  let wall = `WALL       ${NO_FLOOR}`;
  let own = `OWN LOOPS  ${NO_FLOOR}`;
  let memory = `MEMORY     MACHINE ${q.device.memory === null ? 'NOT REPORTED' : `${q.device.memory} GB`} · ${heap === null ? 'HEAP NOT REPORTED' : `HEAP ${mb(heap)}`} · ${NO_FLOOR}`;
  if (f) {
    const w = f.wall;
    const video = !w
      ? 'NO WALL VIDEO'
      : !w.ready
        ? `${w.file.toUpperCase()} · STARTING`
        : `${w.file.toUpperCase()} · ${w.fps === null ? 'COUNTING' : `${Math.round(w.fps)} FPS PRESENTED`} · ${w.dropped} DROPPED OF ${w.decoded} DECODED`;
    wall = `WALL       MODE ${f.mode.toUpperCase()} · ${video}`;

    const h = f.health;
    const share = h.counted === 0
      ? 'NO LOOP COUNTED'
      : h.presented === null || h.due === null
        ? 'NO READING YET'
        : `${Math.round(h.presented)} OF ${Math.round(h.due)} FRAMES OVER 5 S · ${!h.judged ? 'NOT JUDGED' : h.failed ? 'STARVING' : 'KEEPING UP'}`;
    own = `OWN LOOPS  ${f.playing} PLAYING · ${share}`;

    const held = f.textures + (heap ?? 0);
    memory =
      `MEMORY     MACHINE ${q.device.memory === null ? 'NOT REPORTED' : `${q.device.memory} GB`} · TEXTURES ${mb(f.textures)} · ` +
      `${heap === null ? 'HEAP NOT REPORTED' : `HEAP ${mb(heap)}`} · BUDGET ${Math.round(f.budget)} MB${held > f.budget * MB ? ' · OVER' : ''}`;
  }

  const d = q.device;
  const device =
    `DEVICE     ${d.threads === null ? 'THREADS NOT REPORTED' : `${d.threads} THREADS`} · ${d.coarse ? 'COARSE' : 'FINE'} POINTER · ` +
    `${q.weak ? `WEAK BY ITS ${q.weak.toUpperCase()}` : 'NOT WEAK'} · ${d.gpu ?? 'GPU NOT NAMED'}` +
    `${d.dataSaver ? ' · SAVE-DATA OR 2G' : ''}${q.discarded ? ' · THIS TAB WAS DISCARDED AND LOADED AGAIN' : ''}`;

  return [level, frames, wall, own, memory, `PRESSURE   ${pressure.toUpperCase()}`, device];
}
```

Create `src/shell/stats.ts`:

```ts
import '../styles/stats.css';
import { heapBytes } from '../lib/meter';
import { watchPressure } from '../lib/pressure';
import { quality } from '../lib/quality';
import { floorReadings, readoutLines } from '../lib/readout';

/** THE READOUT'S PANEL (`?stats=1` on any page; the shell loads this file only then). Seven lines in the house's mono
 *  type at the left edge, refreshed once a second, and a COPY button that puts them on the clipboard as text. It
 *  reads what the page already knows and sends nothing anywhere. The lines themselves are lib/readout.ts. */
export function mountStats(): void {
  if (document.getElementById('rvl-stats')) return;
  const panel = document.createElement('aside');
  panel.id = 'rvl-stats';
  panel.setAttribute('aria-label', 'Performance readout');
  const lines = document.createElement('pre');
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'COPY';
  panel.append(lines, copy);
  document.body.append(panel);

  const pressure = watchPressure();
  // frames a second over the last second, counted here: a page that is not sampled by the ladder still has a number
  let frames = 0;
  let since = performance.now();
  const count = (): void => {
    frames++;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);

  let text = '';
  let first = true;
  const refresh = (): void => {
    const now = performance.now();
    const fps = first || now <= since ? null : (frames * 1000) / (now - since);
    first = false;
    frames = 0;
    since = now;
    text = readoutLines(quality.report(), fps, floorReadings(), heapBytes(), pressure(), now).join('\n');
    lines.textContent = text;
  };
  refresh();
  window.setInterval(refresh, 1000);

  copy.addEventListener('click', () => {
    const done = navigator.clipboard?.writeText(text);
    if (!done) return; // (no clipboard here: the lines are read off the screen)
    void done.then(() => {
      copy.textContent = 'COPIED';
      window.setTimeout(() => { copy.textContent = 'COPY'; }, 1200);
    }).catch(() => { /* refused: the lines are read off the screen */ });
  });
}
```

Create `src/styles/stats.css`:

```css
/* THE READOUT (?stats=1; src/shell/stats.ts): seven lines at the left edge, over everything, for whoever is
   measuring. Nothing here shows without the parameter: this sheet is loaded with the panel. The panel lets every
   press and hover through to the page under it (the floor's panes, THE LIST's button); only COPY takes a press. */
#rvl-stats {
  position: fixed;
  left: 8px;
  top: 96px;
  z-index: 990;
  max-width: min(520px, calc(100vw - 16px));
  padding: 8px 10px;
  background: color-mix(in srgb, var(--void) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--bone) 30%, transparent);
  color: var(--bone);
  font-family: var(--f-micro);
  font-size: 10px;
  line-height: 1.7;
  letter-spacing: 0.04em;
  pointer-events: none;
}
#rvl-stats pre {
  margin: 0;
  font: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
#rvl-stats button {
  margin-top: 6px;
  padding: 3px 10px;
  background: none;
  border: 1px solid var(--signal);
  color: var(--signal);
  font: inherit;
  letter-spacing: 0.16em;
  cursor: pointer;
  pointer-events: auto;
}
#rvl-stats button:hover,
#rvl-stats button:focus-visible { background: var(--signal); color: var(--void); }
```

In `src/works/world.ts`, find:

```ts
import { dprCap, finePointer, isMobile, reducedMotion } from '../lib/env';
```

Replace it with:

```ts
import { dprCap, finePointer, isMobile, reducedMotion } from '../lib/env';
import { textureBytes } from '../lib/meter';
```

In `src/works/world.ts`, find:

```ts
import type { WallEntry } from '../lib/wall-files';
```

Replace it with:

```ts
import { offerFloorReadings, type FloorReadings } from '../lib/readout';
import type { WallEntry } from '../lib/wall-files';
```

In `src/works/world.ts`, find:

```ts
import { layoutProjects, packRows, paneBand, rowsOf, type Placed } from './layout';
```

Replace it with:

```ts
import { layoutProjects, packRows, paneBand, rowsOf, type Placed } from './layout';
import { LoopHealth, type HealthReading, type LoopSample } from './loop-health';
```

In `src/works/world.ts`, find:

```ts
  /** what the wall's watch found this session, and the wall files that failed in it (works/wall-watch.ts) */
  private wallMem: WallMemory = { verdict: 'ok', failed: [] };
```

Replace it with:

```ts
  /** what the wall's watch found this session, and the wall files that failed in it (works/wall-watch.ts) */
  private wallMem: WallMemory = { verdict: 'ok', failed: [] };
  /** THE LOOPS' HEALTH (works/loop-health.ts): read once a second and shown on the readout (`?stats=1`). Ship A acts
   *  on no reading: the numbers are set after the old laptop has been read. */
  private health = new LoopHealth();
  private healthNow: HealthReading = { counted: 0, presented: null, due: null, judged: false, failed: false };
  private healthClock = 0;
```

In `src/works/world.ts`, find:

```ts
    // THE FLOOR'S VIDEO, from the machine's class and the tier (lib/quality.ts)
    w.takeMode(w.modeNow());
    quality.floorBuilt();
    return w;
```

Replace it with:

```ts
    // THE FLOOR'S VIDEO, from the machine's class and the tier (lib/quality.ts)
    w.takeMode(w.modeNow());
    quality.floorBuilt();
    offerFloorReadings(() => w.readings()); // (the readout, ?stats=1: lib/readout.ts)
    return w;
```

In `src/works/world.ts`, find:

```ts
      this.playback.update(this.viewRect(), this.hoveredSlug);
    }
    // sleeping posters get occasional glitch ticks — the floor never looks frozen
```

Replace it with:

```ts
      this.playback.update(this.viewRect(), this.hoveredSlug);
    }
    this.healthClock += dtMs;
    if (this.healthClock >= 1000) {
      this.healthClock = 0;
      this.readHealth();
    }
    // sleeping posters get occasional glitch ticks — the floor never looks frozen
```

In `src/works/world.ts`, find:

```ts
  /** NEVER LOST IN EMPTY FLOOR (stray.ts; the review's walkthroughs, 2026-09-30): four times a second, once the floor has come
```

Directly before it, add:

```ts
  /** One reading of the panes' own loops: each video's frames presented against the frames due at its loop's frame
   *  rate (the manifest's, from the wall's map; 24 where it lists none). A hidden page and a paused floor are not
   *  read. */
  private readHealth(): void {
    const now = performance.now();
    const listed = wallFor(this.chapter)?.tiles ?? {};
    const samples: LoopSample[] = [];
    for (const [slug, tile] of this.tiles) {
      const s = tile.loopSample(now, listed[slug]?.fps ?? 24);
      if (s) samples.push(s);
    }
    this.healthNow = this.health.read(now, samples, document.hidden || this.paused);
  }

  /** What the readout shows of the floor (lib/readout.ts): the mode, the wall's reading, the own loops playing and
   *  their health, and the meter: the textures Pixi holds against the budget for this canvas, with every live video's
   *  picture size listed beside it. Read when asked; nothing here runs unless the readout is open. */
  readings(): FloorReadings {
    const canvas = this.app.canvas;
    const entry = this.wall ? wallFor(this.chapter) : null;
    const videos: string[] = [];
    if (entry && this.wall) {
      const k = this.wall.which === 'small' ? 0.5 : 1;
      videos.push(`${entry.width * k}×${entry.height * k}`);
    }
    let playing = 0;
    for (const t of this.tiles.values()) {
      if (t.video) videos.push(`${t.video.videoWidth}×${t.video.videoHeight}`);
      if (t.mode !== 'sleep' && t.hasVideo()) playing++;
    }
    return {
      mode: this.mode,
      wall: this.wall ? this.wall.reading() : null,
      playing,
      health: this.healthNow,
      textures: textureBytes(this.app.renderer),
      videos,
      budget: quality.budget(canvas.width * canvas.height),
    };
  }

```

In `src/works/world.ts`, find:

```ts
  destroy(): void {
    this.offQuality?.();
```

Replace it with:

```ts
  destroy(): void {
    offerFloorReadings(null);
    this.offQuality?.();
```

In `src/shell/shell.ts`, find:

```ts
import { quality } from '../lib/quality';
```

Replace it with:

```ts
import { quality } from '../lib/quality';
import { statsWanted } from '../lib/readout';
```

In `src/shell/shell.ts`, find:

```ts
  return { hud };
```

Replace it with:

```ts
  // THE READOUT (`?stats=1`, lib/readout.ts): the panel and its sheet are loaded only when the address asks
  if (statsWanted(location.search)) void import('./stats').then((m) => m.mountStats());

  return { hud };
```

- [x] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/readout.test.ts tests/floor-video.test.ts`

Expected: PASS, 22 tests in the two files.

Run: `npx tsc --noEmit`

Expected: no output.

- [x] **Step 5: See it, headless**

Build into a scratch folder and open, with the harness: `/works.html?gfx=lite&stats=1`, `/works.html?stats=1`,
`/index.html?stats=1`, and `/works.html` with no parameter. 12 s after `rvlBooted` read
`document.querySelector('#rvl-stats pre')?.textContent`.

Expected:

- On the first page, seven lines of this shape (the numbers are the machine's; read on the development PC):

  ```text
  LEVEL      LITE · CEILING LITE · HARDWARE CEILING FULL · OPENED LITE · NO SIGNAL YET · PINNED BY THE ADDRESS
  FRAMES     61 FPS · 0 STALLS
  WALL       MODE WALL · HUMAN.MP4 · 24 FPS PRESENTED · 0 DROPPED OF 245 DECODED
  OWN LOOPS  0 PLAYING · NO LOOP COUNTED
  MEMORY     MACHINE 32 GB · TEXTURES 18 MB · HEAP 6 MB · BUDGET 256 MB
  PRESSURE   NO READING
  DEVICE     32 THREADS · FINE POINTER · NOT WEAK · <the GPU's name>
  ```

- On the second, `WALL       MODE OWN · NO WALL VIDEO`, and after about 10 s an `OWN LOOPS` line that counts frames
  and ends `KEEPING UP` (on the development PC the loops presented every frame that was due).
- On the homepage, `NO FLOOR ON THIS PAGE` on the `WALL`, `OWN LOOPS` and `MEMORY` lines.
- On the fourth, `null`: there is no panel, and the server saw no request for a `stats-*.js` or `stats-*.css` file.
- No console error on any of them. `PRESSURE` reads `NO READING` at first and may turn `NOMINAL`: the development PC
  delivered a reading in the author's run, where the spec's check (§2.7) had seen none.

Take a screenshot of the first page and look: the panel stands at the left edge under the header, in the house's mono
type, with COPY under it. At 1366×768 it leaves THE LIST's button free and lies over the start of the page's hint
line; it is a measuring panel and shows only to whoever asked for it.

- [x] **Step 6: Commit**

```bash
git add -- src/lib/readout.ts src/shell/stats.ts src/styles/stats.css src/works/world.ts src/shell/shell.ts tests/readout.test.ts tests/floor-video.test.ts
git commit -m "feat(shell): the readout behind ?stats=1 - seven lines and COPY" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

### Task 15: The gates, the harness's table, and the hand-over to the coordinator

**Lane:** last, on `master` with every task in (Task 12 only if the coordinator said go).

**Files:**
- Modify: this plan file only (the table's last column, and the ticked boxes).

**Interfaces:**
- Consumes: everything above; the harness of Task 6.
- Produces: the measured column of the spec's §7.1 for ship A's rows; the text for the local rules file; the list of
  live checks for after the coordinator's push.

- [x] **Step 1: The gates**

Run: `npm run check`

Expected: no output after the command's own two header lines.

Run: `npm test`

Expected: no failure but the known local ones (see "Known quirks"). Nine test files are this plan's:
`wall-files`, `walls`, `wall-watch`, `wall`, `floor-video`, `poster-texture`, `loop-health`, `meter`, `readout`.
On a scratch copy of `master` at `3baeb9b` (LF line ends) the author's run read 65 files, 783 passed and 3 skipped,
with no failure.

Run: `npx vite build --outDir "<scratch folder>/build" --emptyOutDir`

Expected: `✓ built in …`, and `<scratch folder>/build/content/media-manifest.json` lists `walls` and `hover`
(Task 5's Step 5 command).

- [x] **Step 2: The harness's table**

Serve the scratch build and measure each row with the harness of Task 6 (a fresh browser per page, the profiles as
described there). The first three columns are the spec's §7.1, ship A's rows only; the fourth is what the plan's
author read on a scratch build while writing (the development PC, the 12-film chapter, the glow baked), for you to
know what to expect. **Add a fifth column, "After the build", with your own reading in every row**, and commit it with
this task. Where your reading is not the expected one, say so in the row and in your report; do not tune a number to
make a row pass.

How to read what: the tier is `rvlQuality.state().label`; the mode is `rvlWorld.mode`; the videos decoding are
`rvlWorld.readings().videos` (the wall's size first, then each own loop's); "picture decoded each second" is the sum
over those of width × height × the frame rate (24 for the wall; each loop's own rate); "all" and "GPU memory" are the
browser's processes as `SystemInfo.getProcessInfo` gives them, read at rest (15 s after boot) and "used" (after
pointing at five places and dragging the floor away and back three times, as the spec's runs did); Pixi's textures
are `rvlWorld.readings().textures` in MB.

| Row | Today (the spec's measurement) | Expected | The author's scratch reading | After the build |
|---|---|---|---|---|
| The 4 GB profile: the tier 2 s, 15 s and 60 s after boot | balanced, full, full | balanced at all three; the wall | balanced at 20 s; mode `wall` | balanced, lite, lite, and balanced again at 64 s; the wall throughout. **Not the expected row:** one slow window 3.7 s after boot steps it down, as before the build; the floor never leaves `wall` |
| The 8 GB profile: the same | Task 6's reading | balanced, then full, as today; the wall at every tier | opened balanced, full by 20 s; mode `wall` | run 1: balanced, lite, lite, balanced at 64 s; run 2: balanced, full, full; the wall at every tier in both |
| The 16 GB profile: the same | Task 6's reading | balanced, then full, as today; own loops at both | not read | balanced with own loops for 4 s, then lite and the wall; balanced again at 64 s with the wall kept (a step up changes no video until the floor is next built). **Not the expected row** |
| WORK, the 4 GB profile, `?gfx=balanced`: videos decoding at rest | 11 | 1 | 1 (the wall, 1904×1080) | 1 (the wall, 1904×1080) |
| The same: picture decoded each second | about 200 million px | about 50 million | 49 million by arithmetic (1904 × 1080 × 24) | 49.4 million px |
| The same: all, used | 1,266 MB | lower by about 280, from the video alone | not read | 882 and 892 MB (two runs): 374 to 384 under the spec's figure |
| The same: GPU memory, used | 724 MB | lower by about 320, from the video alone | not read | 302 and 305 MB: 419 to 422 under |
| WORK, the 4 GB profile: Pixi textures, rest → used | 81 → 122 MB | lower | 18 MB at rest by the meter | 20.7 → 28.7 MB |
| WORK at LITE, any profile: panes moving | 3 | all | all (every pane on its tile, both chapters) | all: 14 of 14 and 5 of 5 on their tiles, about 24 frames a second presented, no own loop decoding |
| WORK, `?gfx=balanced` on the development PC as it is | a chapter of own loops by the code | the same: a chapter of own loops (`videoCapFor`) | mode `own`; 11 playing in a 1920×1080 view at FULL | mode `own`; 14 own loops playing in a 1920×1080 view |
| THE LIST after a tier change: videos | 11 playing | 0 | 0 under THE LIST (no tier change was forced) | 0 |
| THE LIST: all / GPU memory | 995 / 472 MB | at or under 696 / 182 | not read | 706 / 201 MB 8 s after the change (819 / 201 at 3 s). **Over the expected** by 10 and 19 MB |
| Six chapter flips: canvases and textures alive | Task 6's reading | no growth from flip to flip | canvases 19, 13, 21, 13, 21, 13, 21 | canvases 21, then 11, 21, 11, 21, 11, 21; textures 53, then 23, 51, 23, 51, 23, 51: no growth |
| A pane's first hover: requests for `hover.mp4` | Task 6's reading | none | none | none; 14 `.mp4` requests in all, the 14 loops |
| WORK at FULL on the development PC as it is | a chapter of sharp loops | the same picture; fewer decoders once far panes have slept 20 s | not read past 20 s | 14 decoding; 9 after 25 s with five panes dragged far out of view |

For "THE LIST after a tier change": open `/works.html` on the 4 GB profile, press THE LIST's button, then call
`rvlQuality.set(0)` and, 3 s later, `rvlQuality.set(1)`; read the videos. For the last row: on the development PC as
it is, drag the floor until some panes are far out of view, wait 25 s, and count `rvlWorld.readings().videos`.

The spec's other rows belong to ship B's plan and are not measured here: a lost context given back, a lost context
never given back, WORK hidden for 40 s, the health watch's verdict forced, and the meter's texture figure against the
harness's count. One free reading for ship B, to note under the table: the meter's `TEXTURES` figure beside the
harness's own count of GL texture bytes on the same page.

Read on 2026-11-24 on a scratch build of the branch with every task in, two runs of each tier row and one of the
rest. The development PC as it is held 60 frames a second and stayed at FULL with own loops in every reading, so the
slowed profiles' readings are the profiles' own. On every profile the floor changed its video at most once (the 16 GB
profile, from own loops to the wall, 4.3 s after boot) and never back and forth. The free reading: the readout's
`TEXTURES` line said 50 MB beside 49.5 MB of GL texture bytes counted by the harness on the development PC, and 21 MB
beside 20.7 MB on the 4 GB profile.

- [x] **Step 3: The checks the table does not hold (spec §7.1, "Also checked")**

All headless, on the scratch build.

1. **Every pane moves, in its own ratio.** `/works.html?gfx=lite` and `/works.html?ch=machine&gfx=lite` on the
   development PC, and `/works.html?gfx=balanced` on the 4 GB profile. Every pane has a tile (Task 10's "tiles"), the
   wall presents about 24 frames a second, and for every pane the tile's ratio is the pane's within 1%:

   ```js
   [...rvlWorld.tiles].map(([slug, t]) => { const f = rvlWorld.wall.textureFor(slug).frame; return slug + ' ' + ((f.width / f.height) / (t.cw / t.ch)).toFixed(3); })
   ```

   (The author's reading: 1.000 to 1.003 on every pane.)
2. **No neighbour's picture at a pane's edge.** On the same pages, draw the wall's current frame to a 2D canvas
   (`rvlWorld.wall.video`), and for every tile compare, along each of its four sides, the picture's outermost line of
   pixels with the line 2 px further out (the gutter). The script ringed each tile with its own edge pixels, so the
   two lines are alike: the mean difference per colour channel stays small on every tile (the author's reading on the
   full-size walls: 5.1 at most, of 255). A neighbour's picture within reach of a pane would read many times that.
   Repeat on the half-size copy (seed `sessionStorage['rvl-wall']` as in Task 10; the gutter is 1 px out there). A
   tile of fine-grained footage reads higher in the half-size copy because its outermost column is already an average
   of two columns of its own picture (the author's reading: 31 on ELECTRIC FISH, under 10 on every other tile): for
   any tile over 12 there, crop that tile's edge from a frame at eight times its size and look. The edge holds the
   tile's own picture and no line of another.
3. **The pointed pane switches to its own loop and back with no black frame.** `/works.html?gfx=lite`: move the pointer
   onto a pane and take a screenshot every 100 ms for 2 s, then move it away and do the same. In no picture is the
   pane black: its tile shows until its own loop has presented a frame, and again when the loop sleeps.
4. **A loop replaced without a rebuild.** In a throwaway worktree (never the main checkout): copy one film's loop over
   another's (`public/content/projects/<a>/preview.mp4` over `<b>`'s), build into a scratch folder, open
   `/works.html?gfx=lite`. Pane `<b>` has no tile and plays its own (new) loop; every other pane has its tile; and
   `npx vitest run tests/walls.test.ts` in that worktree fails, naming `<b>` and saying to run `npm run walls`. Remove
   the worktree.
5. **A wall file removed.** Task 10's last row (the server answers 404): the floor stands in `posters`.
6. **A tablet.** A 1024×768 viewport with `Emulation.setDeviceMetricsOverride` (`mobile: true`) and
   `Emulation.setTouchEmulationEnabled`: `matchMedia('(pointer: coarse)').matches` is true,
   `rvlQuality.state().weak` is `pointer`, and the mode is `wall`. (Read the page's state; a screenshot can hang
   under this emulation.)
7. **A phone.** 390×844 with the same emulation: there is no `rvlWorld` (the phone has its reel, untouched), and with
   `?stats=1` the `WALL`, `OWN LOOPS` and `MEMORY` lines say `NO FLOOR ON THIS PAGE`.
8. **The readout never throws where a reading is missing.** On each profile, with `?stats=1`: seven lines, the
   `MEMORY` and `PRESSURE` lines showing a value or their plain words, no console error.

The discarded tab's rule is ship B's; ship A only shows the flag.

Read on 2026-11-24 on the same build: all eight as written, with no console error and no failed request on any page
but the 404 that check 5 asks for.

- 1: 14 of 14 and 5 of 5 panes on a tile; the wall presented 24.00 frames a second with none dropped; the ratios read
  1.000 to 1.003 (0.999 to 1.004 on the half-size copy).
- 2: full-size walls, 4.6 at most (a line 9 px out, in the neighbour, reads 24 to 216, so the test would see one).
  Half-size copy: ELECTRIC FISH 29.5 and LIEN QUAN 17.6 on their top sides, every other tile 7.1 at most. Both
  edges were cropped at eight times their size and looked at: each holds its own picture (LIEN QUAN's is a white
  bar of its game's interface) and no line of another. A `?gfx=` pin sets the remembered verdict aside, so the
  half-size copy was read on the unpinned 4 GB profile.
- 3: the pane's own loop shows 150 ms after the pointer arrives and its tile is back 109 ms after it leaves; the
  share of near-black pixels in the pane at the two switches is 0 to 0.4%.
- 4: the replaced film lost its tile and played its own new loop; the other 13 kept theirs; `tests/walls.test.ts`
  failed, naming the film and `npm run walls`.
- 5: mode `posters`, 3 loops playing, no tile.
- 6: coarse pointer, weak by its pointer, mode `wall`, 14 of 14 on a tile.
- 7: no floor; the three lines say `NO FLOOR ON THIS PAGE`.
- 8: seven lines on each profile; `PRESSURE` reads `NO READING`.

- [x] **Step 4: Write the table's fifth column into this plan and commit it**

```bash
git add -- docs/superpowers/plans/2026-11-24-work-wall-video-ship-a.md
git commit -m "docs(plan): ship A verified - the harness's table and the gates" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

- [x] **Step 5: Hand over to the coordinator**

Report: every task's commit, the table, anything that did not read as expected, the two known local failures if they
showed, and whether Task 12 is in. Then the coordinator does these; no task does them.

**The push.** It publishes the site. It is the coordinator's call, after the owner's word where one is needed.

**The live checks after the deploy** (headless, as above, on the live site):

- `content/media-manifest.json` lists `walls.human` and `walls.machine`, each with as many tiles as its chapter has
  films, and `hover`.
- `content/walls/human.mp4` answers `200` (or `206` to a `Range` request) as `video/mp4`.
- `works.html?gfx=lite&stats=1`: mode `wall`, about 24 frames a second presented, every pane on its tile, no console
  error and no Content-Security-Policy report (the readout's script and sheet are the site's own files).
- `works.html` on the development PC as it is: mode `own`, the floor as it was.
- `works.html` on the 4 GB profile: tier `balanced`, mode `wall`.
- `works.html` at 390×844 with touch emulation: the reel, as before.

**The owner's laptop** (spec §7.2): the owner opens `works.html?stats=1` on the live site in Chrome on the old laptop
and reads back, with the COPY button: the seven lines after 30 s at rest, and whether every pane is moving; the same
after pointing at three panes and switching to CH·02; the same after a minute in another tab and back (ship A does
nothing when the tab is hidden: this reading is for ship B); once, `works.html?stats=1&gfx=full` for 30 s, where the
`OWN LOOPS` line shows frames presented of frames due on a chapter of own loops; and in words, whether the motion is
smooth, whether the panes look too soft, and what Task Manager shows for Chrome. Ship B's plan is written from that.

**The local rules file.** `CLAUDE.md` in the main checkout is local only: never committed, absent in a worktree. The
coordinator replaces the floor's rule of 2026-11-08 there with this, and adds the rest (the spec's §9, cut to what
ship A built):

```text
- **The floor's loops:** a machine that is not weak plays each pane's own loop at FULL and at BALANCED, as since
  2026-11-08 (a whole chapter: `videoCapFor`). A weak machine (8 GB or less, 4 threads or fewer, or a touch screen)
  and any machine at LITE play one wall video per chapter (`public/content/walls/`) as tiles, and only the pointed
  pane decodes its own loop. Where a wall is due and cannot play (a missing file, Save-Data, a 2g line), at most 3
  own loops play. `?gfx=full` shows every pane's own loop on any machine.

Under "Media from the owner":
- After any loop is added or replaced, or a film joins or leaves a chapter, run `npm run walls` and commit
  `public/content/walls/`. The content tests fail on a stale wall.

Under "Laws":
- Never destroy the wall's shared source from a pane; a tile's texture is made only after the wall video has
  presented a frame; the weak class and the hardware ceiling are worked out from the device at every start and never
  read from storage.
- Ship B is not built: the stalls, the loops' health, the meter, processor pressure and a discarded tab are read and
  shown by `?stats=1` and decide nothing; the floor has no handler for a lost context or a hidden page yet.

Under "Verifying":
- `?stats=1` shows the readout; `rvlQuality.state()` reports the hardware ceiling, the weak class and the signal that
  last changed the level; `rvlWorld.mode` and `rvlWorld.readings()` give the floor's mode and its readings.
- Counting live canvases with `Runtime.queryObjects`: release the object group after every count, or the count
  itself keeps them alive.
```

**Worktrees.** Remove every lane's worktree that is merged and clean; leave one that is not, and say why in one line.

---

## What ship A leaves to ship B

These are in the spec and in no task above, on purpose (§3.1: they act only after the old laptop has been read):

- the stalls stepping the tier down (three in 10 s); ship A counts them;
- the loops' health watch switching the floor, and its flag kept for a day; ship A reads and shows it;
- a lost WebGL context (the floor stopped, built anew one tier lower, THE LIST after 4 s); ship A has no handler;
- a discarded tab opening one tier lower; ship A shows the flag;
- processor pressure counting as a slow window; ship A shows the state;
- the meter shedding videos and stepping down over its budget; ship A shows the figure and the budget;
- a hidden page pausing its videos and giving them back after 30 s;
- their tests in the spec's §6, their rows in §7.1, and their sentences in §9.

`floorMode` already takes the two facts ship B will hand in (`loopsFailed`, `contextLost`), tested, and ship A always
passes `false` for both.

## Where this plan parts from the spec's letter

- **The source pins** go into `tests/floor-video.test.ts`, not into `tests/floor-ways.test.ts` as §6 says, because
  another plan and the new films' commit edit that file. The older pins there on `pause()` and `resume()` keep passing.
- **The loop cap is never written as a number.** The spec says 12; the new films raise `videoCapFor` to 14.
  `ownLoopCap`, the playback policy and their tests read `videoCapFor`.
- **A film's ratio is read as written** (`W:H`), with no list, so a fifth ratio needed no change here.
- **The discarded tab** has no line in §4.8 and is shown on the `DEVICE` line; **the live video list** of §4.9 is in
  `rvlWorld.readings().videos` and on no line.
- **A wall with its full-size file missing** gets no manifest entry (§4.4); **with only its half-size copy missing**
  the wall runs and a verdict against it gives `posters` (§5). §6's "a missing video file drops the chapter" is read
  as the full-size file.

## Self-review, done when the plan was written

- **Coverage of §3.1's list for ship A:** the weak class and the floor's video chosen by it (Tasks 1, 10); the wall
  videos, their script, their map and the stale guard (Tasks 3, 4, 5); the wall on the floor, its modes and its own
  watch (Tasks 7, 8, 9, 10); `<= 4` and the hardware ceiling (Task 1); the waste removed (Task 9: the sleeping pane;
  Task 10: THE LIST; Task 11: the hover clip and the posters; Task 12: the glow); the readout with all seven lines
  (Tasks 2, 13, 14); the tests and pins of §6 that are ship A's (in each task); `HOW-TO-EDIT.md` (Task 4); the
  verification (Tasks 6, 15).
- **Names and types** were checked by the compiler, not by eye: the code blocks are the files that `npx tsc --noEmit`
  passed on, in the order of the tasks.
- **No step says "as above" for code, and none leaves code to be written later.** The two places that ask for
  numbers to be filled in (Task 6's list, Task 15's fifth column) are measurements, which is what the spec asks the
  plan to record.

## Execution

Plan complete. Two ways to build it:

1. **Subagent-driven (recommended):** a fresh subagent per task with a review between tasks
   (superpowers:subagent-driven-development). The three opening lanes may run at once; the spine is serial.
2. **Inline:** the tasks in order in one session, with checkpoints (superpowers:executing-plans).
