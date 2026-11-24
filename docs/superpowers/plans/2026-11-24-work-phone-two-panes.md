# WORK on a Phone: Two Panes on the Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-11-24-work-phone-two-panes-design.md`. On a phone, a pane of WORK's
rolling strip is half the screen, so two show at once. A vertical film's pane is two panes high, the whole screen. A
phone held on its side keeps one pane a screen. The roll keeps today's pixels a second.

**Architecture:** The strip is measured in units. Upright, a unit is half the screen's height: a pane is 1 unit, a
vertical film's is 2. On its side, a unit is the screen's height and every pane is 1 unit. `src/works/reel.ts` (pure)
holds the arithmetic with two heights apart, the unit's and the screen's. `src/works/reel-view.ts` measures the two
heights, counts each pane's units and lays the animations from them. The reel's block of `src/styles/components.css`
sizes the panes. The work lands in four commits that are each green: the new rules beside the old; the old rules
changed to units with every pane still the screen; the loops' rule; then the one switch that halves the pane, with
its styles, its pins and the owner's guide.

**Tech Stack:** TypeScript, Vite 7, vitest (node), plain HTML and Web Animations for the strip (no Pixi, no quality
tiers). Verification in headless Chrome over the DevTools protocol, by a throwaway script kept outside the repository.

## Global Constraints

From the design, unchanged by this work:

- "Everything else that day's five designs set stays: the endless strip that rolls from arrival, the finger's drag and
  throw, only the name and the roles on a pane, the loops on every tier, the quiet section."
- "Unchanged: a tap opens the film and a drag never does; the throw and its return to the roll; CALM never rolls by
  itself; the channel change; the LIST switch; the quiet section; a tablet and a desktop keep the floor."
- "Unchanged: loops play on every tier, Save-Data and a 2g line keep the posters, a refused play falls back as today."
- Out of scope: "The desktop and tablet floor; the film pages; the performance round's device levels (the reel uses
  none of them)."

The repository's binding laws:

- **No formatter.** Never run prettier or any other formatter over a file. Keep each file's own style: long one-line
  statements, comments in the house voice, the owner's words quoted with their date.
- **Vertical footage** always gets vertical treatment. Never crop or blur-fill it to 16:9.
- **Never touch any `about-old.*` file.**
- **The repo is public, and a push to `master` is the publish.** Nothing private goes in this repo: no personal email,
  real name, local paths, credentials or security reports. That holds for code, comments, tests, this plan and commit
  messages.
- Commits are authored with the GitHub noreply address (the repo-local `user.email`). Leave it as it is. Never pass
  `-c user.name`, `-c user.email` or `--author`.
- Every commit message ends with the line `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Commit subjects read `type(scope): what changed, in plain words`, with ` (owner)` at the end when the owner asked for
  it. The body quotes the owner's request, then lists what changed and how it was verified.
- Stage explicit paths. Never `git add -A` or `git add .`: the owner's own uncommitted media may sit in the tree
  (`public/content/home/loop-7.mp4` did when this plan was written). Never stage, restore or touch it.
- `npm run check` (tsc) is the type gate; `vite build` never typechecks. `npm test` is vitest.
- Phones: bottom-anchored elements fit in `100svh`, never in `vh`. Gate phone blocks on `(pointer: coarse)`. An override
  of equal specificity must come AFTER the rule it overrides.
- `body { visibility: visible; }` must stay the LAST rule of `components.css`.
- A running CSS animation replaces an inline `transform`. Check computed values, not inline ones.
- **Never open visible windows** on the owner's PC. Use headless Chrome over CDP with a throwaway profile, muted. Never
  run a browser's exe to ask its version.
- The local `CLAUDE.md` is local only: it must never be committed or pushed. It does not exist in a git worktree.
- If a commit is refused, leave the work uncommitted and say so. Never work around a refusal.
- The commits belong on `master`, or on a branch the coordinator merges there. Never push without the coordinator's
  word: a push publishes the site.

Rules for this plan:

- **`tests/floor-ways.test.ts`: edit only inside the describe `a phone gets the reel, never the floor (pins)`.** A
  parallel plan (the WORK floor's performance work) edits other tests in that file. Add no import at the file's top.
  Before each commit run `git diff -- tests/floor-ways.test.ts`: if it shows a change outside that describe that you
  did not make, stop and tell the coordinator; do not commit it.
- **Go by the text, never by line numbers.** The `@@` line numbers in the patches below are from the commit this plan
  was written on; other work may have moved the lines.
- **Line ends.** This PC's checkout ends lines with CRLF (`core.autocrlf`); the repository stores LF. The Edit tool
  matches across CRLF and keeps it (checked). So does `git apply --ignore-whitespace` (checked on every patch below, in
  order). Never write a file with a script that puts bare LF into a CRLF file. In a pin, never match a line break with a
  literal `\n` inside a longer string: use `[^}]*` or `\s+`.
- **Applying a patch.** Each `diff` block below is a unified diff of one file: `-` lines go, `+` lines come, the
  others are context. Either apply it hunk by hunk with the Edit tool, or save the block's text to a file outside the
  repository and run `git apply --ignore-whitespace <that file>` from the repository's root. Both give the same file.
- **A git worktree** has no `node_modules` (run `npm ci` there first), no local `CLAUDE.md` and no `dist`.
- **A known local failure, not caused by this work:** on this PC `npm test` fails one test of
  `tests/floor-ways.test.ts`, `the list's city never stands under a title: the sheet keeps its black over the reading
  column, all black on a phone`. Its pin holds a literal `\n` and this checkout's `components.css` is CRLF. It fails the
  same way before any change here and passes where the checkout is LF (the deploy).
- **A second local failure, while the owner's uncommitted `public/content/home/loop-7.mp4` sits in the tree:**
  `tests/loop-frames.test.ts` (it needs ffmpeg on PATH and reads the working tree's loops) fails with
  `home/loop-7.mp4: frame 1 from the end`. That file is the owner's own, not yet committed; it is not this work's and
  must not be touched. Tell the coordinator the test names it. Every other test must pass.
- The checks named "the reel's pins" run `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`. The
  count of skipped tests in its output is the rest of that file and may differ from the numbers quoted here.

## What the code holds that the design did not say

Read against the code, the design needs more than new signatures in six places. Each has its own step below.

1. **A resting pane has no video today.** `plan()` in `reel-view.ts` only pauses a loop that already exists; a loop is
   created when its pane is told to play. The design says the next pane is "loaded and paused". Task 3 makes a resting
   pane load its video, with three limits: not under the LIST or in a hidden tab (nothing loads behind the list); not
   when the loops are images (an image cannot be paused: iOS Low Power Mode); and a loop file's fallback (`error`, the
   next name) no longer calls `play()` by itself, it asks the plan.
2. **The rail is painted before the strip is measured, and a turn of the phone never repaints it.** A film's tick now
   depends on the panes' units, which change on a turn. Task 2 paints the rail after `measure()`, in `show()` and in
   the resize handler.
3. **Strips are built once, when the page mounts, but units change on a turn.** Task 2 builds each strip for the
   upright screen, whose need is never the smaller, and pins that in a test. A turn never rebuilds a strip.
4. **The strip kept its place through a turn by scaling its offset with the one height.** With two heights and a tall
   pane that becomes one unit on its side, Task 2 keeps the place as "the pane under the screen's middle, and how far
   down it": `stripPlace` and `offsetForPlace`.
5. **The words already hang from their pane's bottom edge.** `.rl-cap` and `.rl-marks` sit inside `.rl-link`, which
   fills the frame, so their `bottom` distances need no change. Only the marks' `top` was measured from the header.
   A pane's bottom edge is its 1 px hairline, so the measured distances are 1 px more than the CSS numbers, as today.
6. **The build's media list goes to `dist` only.** `vite.config.ts` writes `media-manifest.json` into `dist/content/`
   whatever `--outDir` is. A build to a scratch folder holds none; the site then asks for each film's `preview.mp4`,
   which every film has. The verification script answers the missing file with 404 on purpose.

Three things the design left open are decided here; Task 6 lists them for the owner:

- the dark under the words: `max(48%, the foot's height + the safe area + 226px)`. On a 390 × 844 phone that is
  288 px of a 422 px pane. The tallest caption measured is 143 px; with its 88 px distance it needs 232 px;
- "on its side" is the styles' own line, `(max-height: 500px)`, asked by the view through `SIDE_QUERY`;
- "uncropped" for the vertical film is read as "never cropped to a wide shape": its tall pane is the upright screen and
  the picture covers it, as today. On a 390 × 844 screen a 9:16 picture loses about 9% at each side, as it does today.

One measured limit of the design, for the owner (Task 6, design call 12): the design promises that "at arrival and
under CALM both panes' names are whole". That holds at 390 × 844 and 412 × 915. On a shorter phone the upper pane's
name lies partly under the header when the strip stands still: at 360 × 640 only 2 of 12 names stand whole in the
upper pane, at 375 × 667 only 5 of 12 (measured on a scratch build of this plan's code; the header ends at 124 px).
Rolling, every name still shows whole while its pane crosses the clear band. This plan does not change it.

## File structure

| File | What changes |
|---|---|
| `src/works/reel.ts` | New: `SIDE_QUERY`, `screenUnits`, `paneUnits`, `places`, `lapUnits`, `rollPace`, `lapSeconds`, `railTicks`, `stripPlace`, `offsetForPlace`, `offsetForPane`. Changed to units: `stripOrder`, `paneTop`, `paneInView`, `railProgress`, `offsetForRail`, `lapProgress`, `offsetFromLap`, `paneKeyframes`, `capKeyframes`, `panePlay`. |
| `src/works/reel-view.ts` | Two heights (`view`, `unit`) and `side` replace `h`. Each strip carries its panes' units, places and laps. The rail after the measure. `remeasure()` keeps the place. A resting pane loads its video. The `is-tall` class. `rvlWorkReel.sizes()`. |
| `src/styles/components.css` | The reel's block only: a frame's height by its units, the marks' top, the dark, the arrival wipe, the sideways block, the comments. |
| `tests/reel.test.ts` | The new rules' tests; `the rolling strip` rewritten with the pane's and the screen's heights apart. |
| `tests/floor-ways.test.ts` | Only the reel's pins: rewritten to the new lines, two new tests. |
| `HOW-TO-EDIT.md` | The owner's guide: the phone strip's paragraph and the `focus` row. |
| local `CLAUDE.md` | One standing rule, added by the coordinator in the main checkout. Never committed. |
| `phone-check.mjs` | The verification script. Outside the repository. Never committed. |

The interfaces every later task builds on (all in `src/works/reel.ts`; `units` is a list of panes' units in order,
`unit` and `view` are px, `total` is a lap in units, `place` is the units before a pane, `u` is a pane's units):

```ts
export const SIDE_QUERY = '(max-height: 500px)';
export const screenUnits: (side: boolean) => number;                       // 2 upright, 1 on its side
export const paneUnits: (vertical: boolean, side: boolean) => number;      // 1, or 2 for a vertical film upright
export function places(units: readonly number[]): number[];
export const lapUnits: (units: readonly number[]) => number;
export const rollPace: (view: number) => number;                           // px/s
export const lapSeconds: (total: number, unit: number, view: number) => number;
export function railTicks(units: readonly number[]): number[];             // 0..1, one a film
export function stripPlace(offset: number, unit: number, view: number, units: readonly number[]): [pane: number, part: number];
export function offsetForPlace(pane: number, part: number, unit: number, view: number, units: readonly number[]): number;
export function offsetForPane(place: number, u: number, unit: number, view: number, total: number, current: number): number;
export function stripOrder(units: readonly number[], screen: number): number[];
export function paneTop(place: number, u: number, offset: number, unit: number, total: number): number;
export function paneInView(offset: number, unit: number, view: number, units: readonly number[]): number;
export function railProgress(offset: number, unit: number, view: number, total: number): number;
export function offsetForRail(p: number, unit: number, view: number, total: number, current: number): number;
export function lapProgress(place: number, u: number, offset: number, unit: number, total: number): number;
export function offsetFromLap(p0: number, u0: number, unit: number, total: number, near: number): number;
export const paneKeyframes: (u: number, total: number) => Keyframe[];
export function capKeyframes(u: number, unit: number, total: number, span: readonly [number, number], band: readonly [number, number], fade?: number): Keyframe[];
export function panePlay(top: number, height: number, view: number, unit: number): PanePlay;
```

---

### Before Task 1: a scratch folder and the starting state

- [ ] **Step 1: A scratch folder outside the repository.** It holds the commit messages, the patches you choose to
  apply with git, the verification build, the script and its stills. Run in Git Bash:

```bash
SCRATCH="$(cygpath -m "$(mktemp -d)")" && echo "$SCRATCH"
```

Keep the printed path: a later shell does not remember the variable. Wherever a step says `$SCRATCH`, use that path.

- [ ] **Step 2: The starting state.** From the repository's root:

Run: `npx vitest run tests/reel.test.ts`
Expected: `Tests  18 passed (18)`.

Run: `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`
Expected: `Tests  12 passed` and the skipped rest.

Run: `npm run check`
Expected: no error, exit 0.

If these differ, the strip's code has changed since this plan was written: read the difference before going on.

---

### Task 1: The strip in units — the new rules, beside the old

Additive: nothing that exists changes, so the view is untouched and every gate stays green.

**Files:**
- Modify: `src/works/reel.ts` (one block added after the line `const mod = …`)
- Test: `tests/reel.test.ts` (two import lines; one describe added before `describe("the reel's words …`)

**Interfaces:**
- Consumes: `ROLL_SECONDS`, `REEL_QUERY` and the private `mod`, already in `reel.ts`.
- Produces: `SIDE_QUERY`, `screenUnits`, `paneUnits`, `places`, `lapUnits`, `rollPace`, `lapSeconds`, `railTicks`,
  `stripPlace`, `offsetForPlace`, `offsetForPane`, with the signatures above.

- [ ] **Step 1: Write the failing tests.** Apply this patch to `tests/reel.test.ts`.

````diff
--- a/tests/reel.test.ts
+++ b/tests/reel.test.ts
@@ -1,10 +1,11 @@
 import { readFileSync } from 'node:fs';
 import { describe, expect, it } from 'vitest';
-import { parseJson, parseProjects } from '../src/lib/content';
+import { aspectRatio, parseJson, parseProjects } from '../src/lib/content';
 import { softBreaks } from '../src/lib/escape';
 import {
   capKeyframes, capOpacity, coast, COAST_TAU, lapProgress, loopsAllowed, MAX_THROW, offsetFromLap, paneKeyframes, offsetForRail, ONE_LINE_MIN, oneLineSize, paneInView, panePlay, paneTop, railProgress,
   REEL_QUERY, REEL_WORDS, reelMode, releaseSpeed, roleLine, ROLL_SECONDS, stripOrder, TITLE_MAX, TITLE_MIN, wrapStart,
+  lapSeconds, lapUnits, offsetForPane, offsetForPlace, paneUnits, places, railTicks, rollPace, screenUnits, SIDE_QUERY, stripPlace,
 } from '../src/works/reel';
 
 // WORK ON A PHONE (owner, 2026-10-20: "on Phone, its completely overwhelming and disorienting … a complete redesign of
@@ -225,6 +226,86 @@
   });
 });
 
+// (owner, 2026-11-24: "the panes are too long in length and should be shorten. we should be able to see two panes on
+// the phone screen at the same time instead")
+describe('the strip, measured in units: two panes on an upright screen', () => {
+  const unitsOf = (cat: string, side: boolean) => films.filter((p) => p.category === cat).map((p) => paneUnits(aspectRatio(p.aspect) < 1, side));
+
+  it("upright a pane is half the screen and a vertical film's is the whole of it; on its side every pane is the screen", () => {
+    expect(screenUnits(false)).toBe(2);
+    expect(screenUnits(true)).toBe(1);
+    expect(paneUnits(false, false)).toBe(1);
+    expect(paneUnits(true, false)).toBe(2); // (vertical footage is never cropped wide: its pane is two panes high)
+    expect(paneUnits(true, true)).toBe(1); // (on a sideways screen it stands whole in the middle of one pane)
+    expect(paneUnits(false, true)).toBe(1);
+    expect(SIDE_QUERY).toBe('(max-height: 500px)'); // (the styles' sideways block asks the same line: tests/floor-ways.test.ts)
+    expect(REEL_QUERY).toContain(SIDE_QUERY); // (the short screen the page asks about is the sideways one)
+  });
+
+  it("a pane's place is the units before it, and a lap is all of them: the two chapters hold 12 and 6", () => {
+    expect(places([1, 1, 1, 1, 2])).toEqual([0, 1, 2, 3, 4]);
+    expect(places([2, 1, 1])).toEqual([0, 2, 3]);
+    expect(places([])).toEqual([]);
+    expect(lapUnits([1, 1, 1, 1, 2])).toBe(6);
+    expect(lapUnits([])).toBe(0);
+    expect(lapUnits(unitsOf('human', false))).toBe(12);
+    expect(unitsOf('machine', false)).toEqual([1, 1, 1, 1, 2]); // (GALAXY Z FOLD 8 ULTRA, 9:16, stands last)
+    expect(lapUnits(unitsOf('machine', true))).toBe(5); // (on its side every pane is one unit)
+  });
+
+  it("the pace is one screen's height every 18 seconds, whatever a pane's height", () => {
+    expect(rollPace(844)).toBeCloseTo(844 / ROLL_SECONDS, 9); // (47 px a second on an 844-px phone, as before)
+    expect(lapSeconds(1, 422, 844)).toBeCloseTo(9, 9); // (a unit pane passes a line in 9 seconds)
+    expect(lapSeconds(12, 422, 844)).toBeCloseTo(108, 9);
+    expect(lapSeconds(6, 422, 844)).toBeCloseTo(54, 9);
+    expect(lapSeconds(12, 390, 390)).toBeCloseTo(216, 9); // (on its side a pane is the screen: 18 seconds a pane)
+    for (const [total, unit, view] of [[12, 422, 844], [6, 320, 640], [5, 390, 390], [4, 457.5, 915]]) {
+      expect((total * unit) / lapSeconds(total, unit, view)).toBeCloseTo(rollPace(view), 9); // (a lap's length over its time)
+    }
+    expect(lapSeconds(12, 422, 0)).toBe(0);
+  });
+
+  it("the rail has one tick a film, at its middle along the lap: the vertical film's stretch is twice as long", () => {
+    const close = (got: number[], want: number[]) => { expect(got).toHaveLength(want.length); got.forEach((g, i) => expect(g).toBeCloseTo(want[i], 9)); };
+    close(railTicks([1, 1, 1, 1, 2]), [0.5 / 6, 1.5 / 6, 2.5 / 6, 3.5 / 6, 5 / 6]);
+    close(railTicks([1, 1, 1, 1, 1]), [0.1, 0.3, 0.5, 0.7, 0.9]); // (on its side: evenly, as before)
+    close(railTicks(Array.from({ length: 12 }, () => 1)), Array.from({ length: 12 }, (_, i) => (i + 0.5) / 12));
+    expect(railTicks([])).toEqual([]);
+  });
+
+  it("the strip's place is the pane under the screen's middle; it holds through a turn of the phone", () => {
+    const up = [1, 1, 1, 1, 2], side = [1, 1, 1, 1, 1];
+    expect(stripPlace(0, 422, 844, up)).toEqual([1, 0]); // (at rest two panes fill the screen: its middle is the second one's top)
+    expect(stripPlace(-211, 422, 844, up)).toEqual([0, 0.5]);
+    expect(stripPlace(4 * 422, 422, 844, up)).toEqual([4, 0.5]); // (the tall pane square in the screen)
+    expect(stripPlace(100, 0, 844, up)).toEqual([0, 0]);
+    expect(stripPlace(100, 422, 844, [])).toEqual([0, 0]);
+    // turned on its side, the same film stands under the middle: the vertical film whole in the screen
+    expect(offsetForPlace(4, 0.5, 390, 390, side)).toBeCloseTo(4 * 390, 9);
+    expect(offsetForPlace(9, 0.5, 390, 390, side)).toBe(0); // (no such pane)
+    for (const units of [up, side, [2, 1, 1], Array.from({ length: 12 }, () => 1)]) {
+      for (const [unit, view] of [[422, 844], [390, 390], [320, 640]]) for (const off of [0, 1, 333, 5 * unit + 17, -3 * unit - 5, 1e6]) {
+        const [pane, part] = stripPlace(off, unit, view, units);
+        expect(part).toBeGreaterThanOrEqual(0);
+        expect(part).toBeLessThanOrEqual(1);
+        const lap = lapUnits(units) * unit, back = offsetForPlace(pane, part, unit, view, units);
+        const d = (((back - off) % lap) + lap) % lap;
+        expect(Math.min(d, lap - d), `${units} ${unit} ${view} ${off}`).toBeCloseTo(0, 6); // (the same place, whole laps apart)
+      }
+    }
+  });
+
+  it("a keyboard's focus brings its pane to the middle of the screen, on the lap the strip is on", () => {
+    expect(offsetForPane(3, 1, 422, 844, 12, 0)).toBeCloseTo(3 * 422 - 211, 9); // (a quarter of the screen clear above it, and below)
+    expect(offsetForPane(0, 1, 422, 844, 12, 0)).toBeCloseTo(-211, 9);
+    expect(offsetForPane(4, 2, 422, 844, 6, 0)).toBeCloseTo(-2 * 422, 9); // (the tall pane square in the screen, the short way round)
+    expect(offsetForPane(4, 1, 390, 390, 5, 0)).toBeCloseTo(-390, 9); // (on its side a pane stands square, as before)
+    const far = 40 * 12 * 422;
+    expect(Math.abs(offsetForPane(3, 1, 422, 844, 12, far) - far)).toBeLessThanOrEqual(6 * 422);
+    expect(offsetForPane(3, 1, 0, 844, 12, 50)).toBeCloseTo(-422, 9); // (no height yet: no lap to choose)
+  });
+});
+
 describe("the reel's words (controls in plain sentences, the house's codes as they are; none on a pane)", () => {
   it('say what each control does', () => {
     expect(REEL_WORDS.back).toBe('◂ BACK TO THE REEL');
````

- [ ] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/reel.test.ts`
Expected: FAIL. `Tests  6 failed | 18 passed (24)`. The six new tests fail with `TypeError: screenUnits is not a
function`, `places is not a function`, `rollPace is not a function`, `railTicks is not a function`, `stripPlace is not
a function` and `offsetForPane is not a function`.

- [ ] **Step 3: Write the rules.** Apply this patch to `src/works/reel.ts`.

````diff
--- a/src/works/reel.ts
+++ b/src/works/reel.ts
@@ -68,6 +68,62 @@
 
 const mod = (a: number, m: number): number => ((a % m) + m) % m;
 
+/* ------------------------------------------------------ the strip, measured in units -- */
+// (owner, 2026-11-24: "the panes are too long in length and should be shorten. we should be able to see two panes on
+// the phone screen at the same time instead") Upright, a unit is half the screen's height: a pane is 1 unit, and a
+// vertical film's is 2, the whole screen (vertical footage is never cropped wide). On its side, a unit is the screen's
+// height and every pane is 1 unit. So the strip's rules take two heights, apart: the unit's and the screen's.
+
+/** A phone held on its side: a short screen. The styles' sideways block asks the same line. */
+export const SIDE_QUERY = '(max-height: 500px)';
+/** The screen's height in units: two panes on an upright screen, one on a phone held on its side. */
+export const screenUnits = (side: boolean): number => (side ? 1 : 2);
+/** A pane's height in units: 1; a vertical film's is 2 on an upright screen. */
+export const paneUnits = (vertical: boolean, side: boolean): number => (vertical && !side ? 2 : 1);
+/** Each pane's place in the strip: the units before it. */
+export function places(units: readonly number[]): number[] {
+  let at = 0;
+  return units.map((u) => { const here = at; at += u; return here; });
+}
+/** A lap of the strip, in units. */
+export const lapUnits = (units: readonly number[]): number => units.reduce((a, u) => a + u, 0);
+
+/** The strip's pace, px/s: one screen's height every ROLL_SECONDS, whatever a pane's height. */
+export const rollPace = (view: number): number => view / ROLL_SECONDS;
+/** How long a lap of `total` units takes at that pace, s. */
+export const lapSeconds = (total: number, unit: number, view: number): number => (view > 0 ? ((total * unit) / view) * ROLL_SECONDS : 0);
+
+/** The rail's ticks, 0..1 down the rail: one a film, at its middle along the chapter's lap, so a tall pane's stretch
+ *  is twice as long. `units` are the chapter's films', in order. */
+export function railTicks(units: readonly number[]): number[] {
+  const total = lapUnits(units), at = places(units);
+  return units.map((u, i) => (total > 0 ? (at[i] + u / 2) / total : 0));
+}
+
+/** Where the strip stands: the pane under the screen's middle, and how far down that pane the middle falls (0..1). It
+ *  holds through a turn of the phone, when both heights change and a tall pane becomes one unit. */
+export function stripPlace(offset: number, unit: number, view: number, units: readonly number[]): [pane: number, part: number] {
+  const total = lapUnits(units);
+  if (total <= 0 || unit <= 0) return [0, 0];
+  const c = mod(offset + view / 2, total * unit) / unit; // (the lap's point under the screen's middle, in units)
+  const at = places(units);
+  let i = units.length - 1;
+  while (i > 0 && at[i] > c) i--;
+  return [i, (c - at[i]) / units[i]];
+}
+/** The offset that stands the strip at that place: `part` of pane `pane` under the screen's middle. */
+export function offsetForPlace(pane: number, part: number, unit: number, view: number, units: readonly number[]): number {
+  if (pane < 0 || pane >= units.length) return 0;
+  return (places(units)[pane] + part * units[pane]) * unit - view / 2;
+}
+/** The offset that brings a pane (at `place`, `u` units tall) to the middle of the screen, on the lap nearest `current`:
+ *  a pane as tall as the screen stands square in it. */
+export function offsetForPane(place: number, u: number, unit: number, view: number, total: number, current: number): number {
+  const lap = total * unit;
+  const target = place * unit - (view - u * unit) / 2;
+  return lap > 0 ? target + Math.round((current - target) / lap) * lap : target;
+}
+
 /** The film behind each pane of the strip: the chapter in order, laid twice or thrice when it holds one or two films,
  *  so the endless strip never shows a gap. */
 export function stripOrder(films: number): number[] {
````

- [ ] **Step 4: Run the tests and the type gate.**

Run: `npx vitest run tests/reel.test.ts`
Expected: PASS. `Tests  24 passed (24)`.

Run: `npm run check`
Expected: `tsc --noEmit` prints no error and exits 0.

- [ ] **Step 5: Commit.** Write this text to `$SCRATCH/msg.txt` (outside the repository), then commit with it:

```text
feat(works): the phone strip in units - a pane's units, the lap's time, the rail's ticks, the strip's place (owner)

The owner, on the phone's rolling strip: "This is for mobile's WORK section: RIght now, the panes are too long in
length and should be shorten. we should be able to see two panes on the phone screen at the same time instead."

The first step of docs/superpowers/plans/2026-11-24-work-phone-two-panes.md: the strip's new rules, beside the old.
- works/reel.ts: SIDE_QUERY, screenUnits, paneUnits, places, lapUnits, rollPace, lapSeconds, railTicks, stripPlace,
  offsetForPlace, offsetForPane. Upright a unit is half the screen, a pane 1 unit, a vertical film's 2; on its side a
  unit is the screen and every pane 1 unit.
- Nothing uses them yet: the strip on the site is unchanged.

Verified: tests/reel.test.ts 24 passed (six new); npm run check.

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
```

```bash
git add -- src/works/reel.ts tests/reel.test.ts
git commit -F "$SCRATCH/msg.txt" -- src/works/reel.ts tests/reel.test.ts
git show --stat HEAD
```

Expected: one commit, two files, the author the repository's noreply identity.

---

### Task 2: The strip's rules take units; the view follows; nothing moves yet

The rules that exist change their signatures, so the view changes in the same commit. The view gets its final shape
with one switch left off: `side = true`, so every pane is still one unit as tall as the screen, as the styles still
have it. Behaviour on the site is the same as before, except two repairs that units need (the rail painted after the
measure and repainted on a turn; the place kept through a turn by the pane under the screen's middle).

**Files:**
- Modify: `src/works/reel.ts` (`stripOrder`, `paneTop`, `paneInView`, `railProgress`, `offsetForRail`, `lapProgress`,
  `offsetFromLap`, `paneKeyframes`, `capKeyframes`)
- Modify: `src/works/reel-view.ts`
- Test: `tests/reel.test.ts` (the describe `the rolling strip`, whole)
- Test: `tests/floor-ways.test.ts` (the reel's pins: four lines rewritten, one test added)

**Interfaces:**
- Consumes: Task 1's rules.
- Produces: the changed signatures above; in the view, `Strip.order`, `Strip.tall`, `Strip.units`, `Strip.at`,
  `Strip.total`, `Strip.chapter`; the closures `measure()` (sets `view`, `unit`, `side` and the strip's units) and
  `remeasure()`; the debug handle's `sizes()` returning `{ view, unit, side, units }`.

- [ ] **Step 1: Rewrite the strip's tests.** In `tests/reel.test.ts`, replace the whole block that starts at the line
  `describe('the rolling strip', () => {` and ends at its closing `});` (the line before the comment
  `// (owner, 2026-11-24: "the panes are too long …` that Task 1 added) with this:

````ts
describe('the rolling strip', () => {
  const VIEW = 844, UNIT = VIEW / 2; // (an upright 390 × 844 phone: two panes on the screen)
  const ones = (n: number): number[] => Array.from({ length: n }, () => 1);
  // chapters of 1, 2, 5 with a tall pane, and 12 (the two real ones are the last two); then a tall pane alone, and with one more
  const CHAPTERS: boolean[][] = [[false], [false, false], [false, false, false, false, true], ones(12).map(() => false), [true], [true, false]];
  /** a chapter's strip as the view lays it: built once for the upright screen, measured as the screen stands */
  const lay = (tall: boolean[], side: boolean) => {
    const order = stripOrder(tall.map((t) => paneUnits(t, false)), screenUnits(false));
    const units = order.map((f) => paneUnits(tall[f], side)), view = side ? 390 : VIEW;
    return { units, at: places(units), total: lapUnits(units), unit: view / screenUnits(side), view };
  };

  it('is endless: every pane stands once in a lap, and the screen is always covered, upright and on its side', () => {
    for (const tall of CHAPTERS) for (const side of [false, true]) {
      const { units, at, total, unit, view } = lay(tall, side);
      expect(units.length).toBeGreaterThanOrEqual(3);
      expect(total).toBeGreaterThanOrEqual(screenUnits(side) + Math.max(...units)); // (the screen and the tallest pane)
      for (const offset of [0, 1, 211, unit, view, 5 * unit + 17, -3 * unit - 5, 1e6]) {
        const spans = units.map((u, i) => { const top = paneTop(at[i], u, offset, unit, total); return [top, top + u * unit]; });
        spans.forEach(([top], i) => { // (from its own height above the screen's top to the lap's end)
          expect(top).toBeGreaterThanOrEqual(-units[i] * unit - 1e-6);
          expect(top).toBeLessThan((total - units[i]) * unit + 1e-6);
        });
        // down the screen each pane starts where the last one ended: no gap, no overlap
        const on = spans.filter(([top, bottom]) => bottom > 1e-6 && top < view - 1e-6).sort((a, b) => a[0] - b[0]);
        expect(on[0][0]).toBeLessThanOrEqual(1e-6);
        for (let k = 1; k < on.length; k++) expect(on[k][0]).toBeCloseTo(on[k - 1][1], 6);
        expect(on[on.length - 1][1]).toBeGreaterThanOrEqual(view - 1e-6);
      }
    }
  });

  it('rolls the next film in from below: one unit on, the strip has moved one pane', () => {
    expect(paneTop(0, 1, 0, UNIT, 12)).toBe(0);
    expect(paneTop(1, 1, 0, UNIT, 12)).toBe(UNIT); // (two panes fill the screen at rest)
    expect(paneTop(2, 1, 0, UNIT, 12)).toBe(VIEW); // (the third waits just under it)
    expect(paneTop(1, 1, UNIT, UNIT, 12)).toBe(0);
    expect(paneTop(0, 1, UNIT, UNIT, 12)).toBe(-UNIT);
    expect(paneTop(0, 1, 12 * UNIT, UNIT, 12)).toBe(0); // (a whole lap: the first film again)
    expect(paneTop(11, 1, -UNIT, UNIT, 12)).toBe(0); // (dragged back from the first film: the last one)
    // a tall pane (CH·02's last: place 4, 2 units, a lap of 6) is the whole screen
    expect(paneTop(4, 2, 4 * UNIT, UNIT, 6)).toBe(0); // (square in the screen)
    expect(paneTop(4, 2, 6 * UNIT - 1, UNIT, 6)).toBe(1 - VIEW); // (a pixel of it left at the top …)
    expect(paneTop(4, 2, 6 * UNIT + 1, UNIT, 6)).toBe(4 * UNIT - 1); // (… then it waits two screens down: never a jump in sight)
    // on its side a pane is the screen, as before
    expect(paneTop(1, 1, 390, 390, 12)).toBe(0);
    expect(paneTop(0, 1, 390, 390, 12)).toBe(-390);
  });

  it("knows the film in view, the pane under the screen's middle; the rail's playhead marks that point of the lap", () => {
    const twelve = ones(12), ch2 = [1, 1, 1, 1, 2];
    expect(paneInView(-UNIT / 2, UNIT, VIEW, twelve)).toBe(0); // (the first pane's middle on the screen's)
    expect(paneInView(0, UNIT, VIEW, twelve)).toBe(1); // (at rest the middle is the second pane's top)
    expect(paneInView(UNIT * 0.9, UNIT, VIEW, twelve)).toBe(1);
    expect(paneInView(UNIT, UNIT, VIEW, twelve)).toBe(2);
    expect(paneInView(-UNIT - 1, UNIT, VIEW, twelve)).toBe(11);
    expect(paneInView(3 * UNIT, UNIT, VIEW, ch2)).toBe(4); // (the tall pane, from its top …)
    expect(paneInView(5 * UNIT - 1, UNIT, VIEW, ch2)).toBe(4); // (… to its foot)
    expect(paneInView(0, UNIT, VIEW, [])).toBe(0);
    // the playhead sits on a film's tick when that film's middle is on the screen's
    const ticks = railTicks(ch2);
    ch2.forEach((u, i) => expect(railProgress(offsetForPane(places(ch2)[i], u, UNIT, VIEW, 6, 0), UNIT, VIEW, 6)).toBeCloseTo(ticks[i], 9));
    expect(railProgress(0, UNIT, VIEW, 12)).toBeCloseTo(1 / 12, 9); // (at rest: between the first two films' ticks)
    expect(railProgress(12 * UNIT, UNIT, VIEW, 12)).toBeCloseTo(1 / 12, 9);
    for (const i of [0, 4, 11]) expect(railProgress(i * 390, 390, 390, 12)).toBeCloseTo((i + 0.5) / 12, 9); // (on its side, as before: on its tick when it stands square)
    expect(railProgress(0, 0, VIEW, 12)).toBe(0);
  });

  it("a touch on the rail brings that point of the lap to the screen's middle, on the lap the strip is already on", () => {
    const twelve = ones(12), ticks = railTicks(twelve);
    for (const i of [0, 3, 5, 11]) {
      const at = offsetForRail(ticks[i], UNIT, VIEW, 12, 0);
      expect(paneInView(at, UNIT, VIEW, twelve)).toBe(i);
      expect(railProgress(at, UNIT, VIEW, 12)).toBeCloseTo(ticks[i], 9);
      expect(Math.abs(at)).toBeLessThanOrEqual(6 * UNIT); // (the short way round)
    }
    // the vertical film's tick stands its pane square in the screen
    expect(paneTop(4, 2, offsetForRail(railTicks([1, 1, 1, 1, 2])[4], UNIT, VIEW, 6, 0), UNIT, 6)).toBeCloseTo(0, 6);
    const far = 40 * 12 * UNIT; // (forty laps on)
    expect(Math.abs(offsetForRail(0.5, UNIT, VIEW, 12, far) - far)).toBeLessThanOrEqual(6 * UNIT);
    expect(offsetForRail(-1, UNIT, VIEW, 12, 0)).toBeCloseTo(-VIEW / 2, 6); // (held to the rail's ends)
    expect(offsetForRail(11.5 / 12, 390, 390, 12, 0)).toBeCloseTo(-390, 6); // (on its side, as before: the last film is one pane back)
  });

  it('a short chapter is laid again until it holds the screen and its tallest pane, and never fewer than three panes', () => {
    expect(stripOrder(ones(12), 2)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(stripOrder([1, 1, 1, 1, 2], 2)).toEqual([0, 1, 2, 3, 4]); // (CH·02: 6 units, laid once)
    expect(stripOrder([1, 1], 2)).toEqual([0, 1, 0, 1]);
    expect(stripOrder([1], 2)).toEqual([0, 0, 0]); // (upright: three units for unit panes)
    expect(stripOrder([2, 1], 2)).toEqual([0, 1, 0, 1]); // (… four with a vertical film: 3 units are too few)
    expect(stripOrder([1, 1, 2], 2)).toEqual([0, 1, 2]);
    expect(stripOrder([2], 2)).toEqual([0, 0, 0]); // (4 units would do: never fewer than three panes)
    expect(stripOrder([1, 1], 1)).toEqual([0, 1, 0, 1]); // (on its side, as before)
    expect(stripOrder([1], 1)).toEqual([0, 0, 0]);
    expect(stripOrder([], 2)).toEqual([]);
    for (const tall of CHAPTERS) { // (a strip laid for the upright screen is long enough on its side: a turn never rebuilds it)
      const side = stripOrder(tall.map((t) => paneUnits(t, true)), screenUnits(true));
      expect(stripOrder(tall.map((t) => paneUnits(t, false)), screenUnits(false)).length).toBeGreaterThanOrEqual(side.length);
    }
  });

  // (owner, 2026-10-20: "I want the auto scrolling to happen instantly, but slower and smoother")
  it('rolls one screen every 18 seconds ("Even slower"); a throw coasts to its target, a rest swells into the roll', () => {
    expect(ROLL_SECONDS).toBe(18);
    expect(coast(3000, 0, COAST_TAU)).toBeCloseTo(3000 / Math.E, 6);
    let v = 3000;
    for (let t = 0; t < 3; t += 1 / 60) v = coast(v, 0, 1 / 60);
    expect(Math.abs(v)).toBeLessThan(5); // (a hard throw is at rest within three seconds)
    let r = 0;
    for (let t = 0; t < 2; t += 1 / 60) r = coast(r, rollPace(VIEW), 1 / 60);
    expect(r).toBeGreaterThan(0.98 * rollPace(VIEW)); // (and the roll is back to pace within two)
    expect(coast(500, 120, 0)).toBe(500);
  });

  it('the finger\'s throw: its travel over its last 100 ms, up moving the strip on, held still throwing nothing', () => {
    expect(releaseSpeed([[0, 600], [50, 500], [100, 400]], 100)).toBeCloseTo(2000, 6); // (up 200 px in 0.1 s)
    expect(releaseSpeed([[0, 400], [100, 600]], 100)).toBeCloseTo(-2000, 6); // (down: back)
    expect(releaseSpeed([[0, 600], [40, 400], [300, 400]], 300)).toBe(0); // (stopped, then lifted)
    expect(releaseSpeed([[0, 600]], 0)).toBe(0);
    expect(releaseSpeed([[0, 900], [10, 0]], 10)).toBe(MAX_THROW);
  });

  it("on the compositor: each pane's lap is the same place as the strip's arithmetic, and the clock's time gives the offset back", () => {
    for (const tall of CHAPTERS) for (const side of [false, true]) {
      const { units, at, total, unit } = lay(tall, side), lap = total * unit;
      for (const off of [0, 300, unit, 7.5 * unit, -2.25 * unit]) {
        units.forEach((u, i) => {
          const p = lapProgress(at[i], u, off, unit, total);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThan(1);
          // the keyframes run from the lap less the pane's own height down to its own height up, linearly
          const y = (total - u) * unit - p * lap;
          const d = (((y - paneTop(at[i], u, off, unit, total)) % lap) + lap) % lap;
          expect(Math.min(d, lap - d)).toBeCloseTo(0, 6); // (the same place, a whole lap apart at most)
        });
        expect(offsetFromLap(lapProgress(0, units[0], off, unit, total), units[0], unit, total, off)).toBeCloseTo(off, 6); // (the offset read back off the clock)
      }
    }
    expect(paneKeyframes(1, 12)).toEqual([{ transform: 'translate3d(0, 1100%, 0)' }, { transform: 'translate3d(0, -100%, 0)' }]);
    expect(paneKeyframes(1, 6)).toEqual([{ transform: 'translate3d(0, 500%, 0)' }, { transform: 'translate3d(0, -100%, 0)' }]);
    // a tall pane's keyframes differ only by the ratio: in its own height, (6 − 2) / 2 of itself down
    expect(paneKeyframes(2, 6)).toEqual([{ transform: 'translate3d(0, 200%, 0)' }, { transform: 'translate3d(0, -100%, 0)' }]);
    expect(offsetFromLap(lapProgress(0, 1, 3 * UNIT, UNIT, 12), 1, UNIT, 12, 0)).toBeCloseTo(3 * UNIT, 6);
    const far = 40 * 6 * UNIT + 100; // (a tall first pane, forty laps on)
    expect(offsetFromLap(lapProgress(0, 2, far, UNIT, 6), 2, UNIT, 6, far - 100)).toBeCloseTo(far, 6);
  });

  it("the words' fade, laid on the lap as keyframes, matches the fade the strip computes by hand: a half pane's, and a tall pane's", () => {
    const band: [number, number] = [124, 782]; // (under the header; above a 62 px foot on an 844 screen)
    const cases: [u: number, total: number, span: [number, number]][] = [
      [1, 12, [218, 334]], // a half pane: its words end 88 px above its own foot
      [1, 12, [191, 334]], // the tallest name of chapter one (143 px)
      [2, 6, [640, 756]], // the tall pane: where a whole-screen pane's words stood before
    ];
    for (const [u, total, span] of cases) {
      const kf = capKeyframes(u, UNIT, total, span, band);
      const offsets = kf.map((k) => k.offset as number);
      for (let k = 1; k < offsets.length; k++) expect(offsets[k]).toBeGreaterThanOrEqual(offsets[k - 1]);
      const at = (p: number) => { // (the keyframes' opacity at lap point p, linearly between them)
        for (let k = 1; k < kf.length; k++) {
          const [a, b] = [kf[k - 1], kf[k]];
          if (p <= (b.offset as number)) {
            const w = (b.offset as number) - (a.offset as number);
            return w <= 0 ? (b.opacity as number) : (a.opacity as number) + ((b.opacity as number) - (a.opacity as number)) * ((p - (a.offset as number)) / w);
          }
        }
        return kf[kf.length - 1].opacity as number;
      };
      for (let off = -VIEW; off <= 2 * VIEW; off += 37) {
        const top = paneTop(0, u, off, UNIT, total), p = lapProgress(0, u, off, UNIT, total);
        expect(at(p), `${u} of ${total}, offset ${off}`).toBeCloseTo(capOpacity(top + span[0], top + span[1], ...band), 2);
      }
    }
    // at rest both panes' names stand whole: the upper pane's, and the lower one's clear of the foot
    expect(capOpacity(218, 334, ...band)).toBe(1);
    expect(capOpacity(UNIT + 218, UNIT + 334, ...band)).toBe(1);
  });

  it("a pane's words fade as they pass under the header or the foot, and stand whole between", () => {
    const band = [140, 782] as const; // (under the switches; above a 62 px foot on an 844 screen)
    expect(capOpacity(600, 700, ...band)).toBe(1);
    expect(capOpacity(700, 782, ...band)).toBe(0); // (its foot at the foot's top)
    expect(capOpacity(700, 772, ...band)).toBeCloseTo(0.5, 6); // (10 px clear of 20)
    expect(capOpacity(700, 900, ...band)).toBe(0); // (under the foot)
    expect(capOpacity(140, 240, ...band)).toBe(0); // (its top at the header's bottom)
    expect(capOpacity(150, 250, ...band)).toBeCloseTo(0.5, 6);
    expect(capOpacity(-40, 60, ...band)).toBe(0); // (under the header)
    expect(capOpacity(600, 700, 500, 400)).toBe(1); // (no band to measure: whole)
  });

  it('plays every pane on the screen and the next to come in; rests the near; lets the far go', () => {
    expect(panePlay(0, VIEW, VIEW, 1)).toBe('play');
    expect(panePlay(-VIEW / 2, VIEW, VIEW, 1)).toBe('play'); // (half out at the top)
    expect(panePlay(VIEW / 2, VIEW, VIEW, 1)).toBe('play'); // (half in from below)
    expect(panePlay(VIEW, VIEW, VIEW, 1)).toBe('play'); // (the next to come in, rolling on)
    expect(panePlay(VIEW, VIEW, VIEW, -1)).toBe('rest'); // (… but not while the strip goes back)
    expect(panePlay(-VIEW, VIEW, VIEW, -1)).toBe('play'); // (going back, the one above comes in)
    expect(panePlay(-VIEW, VIEW, VIEW, 1)).toBe('rest');
    expect(panePlay(2 * VIEW, VIEW, VIEW, 1)).toBe('rest');
    expect(panePlay(3 * VIEW, VIEW, VIEW, 1)).toBe('free');
    expect(panePlay(-3 * VIEW, VIEW, VIEW, 1)).toBe('free');
  });
});
````

- [ ] **Step 2: Rewrite the reel's pins.** Apply this patch to `tests/floor-ways.test.ts` (both hunks are inside the
  describe `a phone gets the reel, never the floor (pins)`).

````diff
--- a/tests/floor-ways.test.ts
+++ b/tests/floor-ways.test.ts
@@ -362,10 +362,10 @@
     expect(css).toMatch(/\n\.rl-strip \{[^}]*overflow: hidden;[^}]*touch-action: none;/);
     expect(css).not.toContain('scroll-snap');
     // (owner, 2026-10-20: "I want the auto scrolling to happen instantly, but slower and smoother") — on the compositor
-    expect(view).toContain('pane: li.animate(paneKeyframes(n), lane),');
-    expect(view).toContain('cap: strip.caps[i].animate(capKeyframes(n, h, strip.spans[i], [bandTop, bandBottom]), lane),'); // (its words never print over the chrome)
+    expect(view).toContain('pane: li.animate(paneKeyframes(strip.units[i], strip.total), lane),');
+    expect(view).toContain('cap: strip.caps[i].animate(capKeyframes(strip.units[i], unit, strip.total, strip.spans[i], [bandTop, bandBottom]), lane),'); // (its words never print over the chrome)
     expect(view).toContain('roll(); // (from the first frame, at its pace)');
-    expect(view).toContain('const rollSpeed = () => (reducedMotion() ? 0 : h / ROLL_SECONDS);');
+    expect(view).toContain('const rollSpeed = () => (reducedMotion() ? 0 : rollPace(view));'); // (one screen's height every 18 s, whatever a pane's height)
     expect(view).toContain('v = moved ? releaseSpeed(moves, e.timeStamp) : 0;');
     expect(view).toContain('if (target > 0 && Math.abs(v - target) < 2) { roll(); return; }'); // (the throw eases straight into the roll)
     expect(view).not.toContain('style.transform');
@@ -373,6 +373,20 @@
     expect(view).not.toContain('rl-eof'); // (endless: no end slate on a phone)
   });
 
+  // (owner, 2026-11-24: "we should be able to see two panes on the phone screen at the same time") the strip is measured
+  // in units, with two heights apart: the screen's and a unit's (tests/reel.test.ts holds the rules)
+  it('the strip is measured in units: two heights, its place kept through a turn of the phone, the rail by units', () => {
+    expect(view).toContain('view = strip.ol.clientHeight || window.innerHeight;'); // (no height yet under the LIST: the window's)
+    expect(view).toContain('unit = view / screenUnits(side);');
+    expect(view).toContain('strip.units = strip.order.map((f) => paneUnits(strip.tall[f], side));');
+    expect(view).toContain('const order = stripOrder(tall.map((t) => paneUnits(t, false)), screenUnits(false));');
+    expect(view).toContain('offset = offsetForPlace(pane, part, unit, view, strip.units);');
+    expect(view).toMatch(/remeasure\(\); \/\/ \(the same film stays in view through a turn of the phone\)\s+paintRail\(\);/);
+    expect(view).toMatch(/measure\(\);\s+paintRail\(\);\s+fit\(strip\);/); // (the ticks need the panes' units)
+    expect(view).toContain('offset = offsetForPane(strip.at[i], strip.units[i], unit, view, strip.total, offset);');
+    expect(view).toContain('offset = offsetForRail((clientY - r.top) / Math.max(1, r.height), unit, view, strip.chapter, offset);');
+  });
+
   it("a vertical film stands vertical: on a phone held on its side it stands whole, never cropped wide", () => {
     expect(view).toContain("aspectRatio(p.aspect) < 1 ? ' is-vertical' : ''");
     const side = css.slice(css.indexOf('/* a phone on its side'));
````

- [ ] **Step 3: Run them and see them fail.**

Run: `npx vitest run tests/reel.test.ts`
Expected: FAIL. `Tests  7 failed | 17 passed (24)` (the old rules read the new arguments wrongly).

Run: `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`
Expected: FAIL. `Tests  2 failed | 11 passed` and the skipped rest: `the strip rolls on its own, endless …` and `the
strip is measured in units …`.

- [ ] **Step 4: Change the rules to units.** Apply this patch to `src/works/reel.ts`.

````diff
--- a/src/works/reel.ts
+++ b/src/works/reel.ts
@@ -124,36 +124,41 @@
   return lap > 0 ? target + Math.round((current - target) / lap) * lap : target;
 }
 
-/** The film behind each pane of the strip: the chapter in order, laid twice or thrice when it holds one or two films,
- *  so the endless strip never shows a gap. */
-export function stripOrder(films: number): number[] {
+/** The film behind each pane of the strip: the chapter in order, laid again while it is too short for an endless
+ *  strip. A pane leaves the top whole before it comes in again below the screen, so a lap must hold the screen and the
+ *  tallest pane; and a strip is never fewer than three panes. `units` are the chapter's films', in order; `screen` is
+ *  the screen's height in units. */
+export function stripOrder(units: readonly number[], screen: number): number[] {
+  const films = units.length;
   if (films <= 0) return [];
-  const laps = films >= 3 ? 1 : Math.ceil(3 / films);
+  const laps = Math.max(Math.ceil((screen + Math.max(...units)) / lapUnits(units)), Math.ceil(3 / films));
   return Array.from({ length: films * laps }, (_, i) => i % films);
 }
 
-/** A pane's top on the screen, px: pane `i` of `n`, each `h` tall, the strip moved `offset` px on. Endless: every pane
- *  stands once in a lap, from one pane above the screen down to the lap's end. */
-export function paneTop(i: number, offset: number, h: number, n: number): number {
-  return mod(i * h - offset + h, n * h) - h;
+/** A pane's top on the screen, px: the pane at `place` (the units before it), `u` units tall, in a strip of `total`
+ *  units of `unit` px each, moved `offset` px on. Endless: every pane stands once in a lap, from its own height above
+ *  the screen's top down to the lap's end. */
+export function paneTop(place: number, u: number, offset: number, unit: number, total: number): number {
+  return mod(place * unit - offset + u * unit, total * unit) - u * unit;
 }
 
-/** The pane most in view: the one standing nearest square in the screen. */
-export function paneInView(offset: number, h: number, n: number): number {
-  return n > 0 && h > 0 ? mod(Math.round(offset / h), n) : 0;
+/** The film in view: the pane under the screen's middle. */
+export function paneInView(offset: number, unit: number, view: number, units: readonly number[]): number {
+  return stripPlace(offset, unit, view, units)[0];
 }
 
-/** The rail's playhead, 0..1 down the rail: on a pane's tick when that pane stands square in the screen. */
-export function railProgress(offset: number, h: number, n: number): number {
-  return n > 0 && h > 0 ? mod(offset + h / 2, n * h) / (n * h) : 0;
+/** The rail's playhead, 0..1 down the rail: the point of the chapter's lap (`total` units) under the screen's middle.
+ *  It sits on a film's tick when that film's middle is on the screen's. */
+export function railProgress(offset: number, unit: number, view: number, total: number): number {
+  return total > 0 && unit > 0 ? mod(offset + view / 2, total * unit) / (total * unit) : 0;
 }
 
-/** Where a touch `p` (0..1) down the rail moves the strip: that point of the lap square in the screen, on the lap the
- *  strip is already on (a scrub never spins it through a whole lap). */
-export function offsetForRail(p: number, h: number, n: number, current: number): number {
-  const lap = n * h;
-  const target = Math.max(0, Math.min(1, p)) * lap - h / 2;
-  return target + Math.round((current - target) / lap) * lap;
+/** Where a touch `p` (0..1) down the rail moves the strip: that point of the chapter's lap to the screen's middle, on
+ *  the lap the strip is already on (a scrub never spins it through a whole lap). */
+export function offsetForRail(p: number, unit: number, view: number, total: number, current: number): number {
+  const lap = total * unit;
+  const target = Math.max(0, Math.min(1, p)) * lap - view / 2;
+  return lap > 0 ? target + Math.round((current - target) / lap) * lap : target;
 }
 
 /** The strip's speed, px/s, eased toward `target` over `dt` s: a throw slows to rest, a rest swells into the roll. */
@@ -187,32 +192,34 @@
 // Each pane, its words and the rail's playhead run one linear animation a lap, phased by where they stand: the screen's
 // own clock moves them, so a busy page never stutters the strip. A finger takes the timelines by hand.
 
-/** Where pane `i` of `n` stands in its lap, 0..1, the strip moved `offset` px with panes `h` px tall. Its lap runs from
- *  (n − 1) panes below the screen's top (0) up to one pane above it (1). */
-export function lapProgress(i: number, offset: number, h: number, n: number): number {
-  return mod(((n - 1) * h - paneTop(i, offset, h, n)) / (n * h), 1);
+/** Where a pane stands in its lap, 0..1: the pane at `place`, `u` units tall, the strip (`total` units of `unit` px)
+ *  moved `offset` px. Its lap runs from the lap less its own height below the screen's top (0) up to its own height
+ *  above it (1). */
+export function lapProgress(place: number, u: number, offset: number, unit: number, total: number): number {
+  return mod(((total - u) * unit - paneTop(place, u, offset, unit, total)) / (total * unit), 1);
 }
 
-/** The strip's offset, px, from pane 0's place in its lap — the one nearest `near` (the strip's offset runs on through
- *  laps; a lap is n panes). */
-export function offsetFromLap(p0: number, h: number, n: number, near: number): number {
-  const lap = n * h;
-  const base = p0 * lap - (n - 1) * h; // (pane 0 stands at (n − 1)·h − p0·lap, and the offset is minus where it stands)
+/** The strip's offset, px, from the first pane's place in its lap (`u0` is that pane's units) — the one nearest `near`
+ *  (the strip's offset runs on through laps; a lap is `total` units). */
+export function offsetFromLap(p0: number, u0: number, unit: number, total: number, near: number): number {
+  const lap = total * unit;
+  const base = p0 * lap - (total - u0) * unit; // (it stands at (total − u0)·unit − p0·lap, and the offset is minus where it stands)
   return base + Math.round((near - base) / lap) * lap;
 }
 
-/** A pane's lap as keyframes, in its own height: from (n − 1) panes below the screen's top to one above it. */
-export const paneKeyframes = (n: number): Keyframe[] => [
-  { transform: `translate3d(0, ${(n - 1) * 100}%, 0)` },
+/** A pane's lap as keyframes, in its own height: from the lap less its own units below the screen's top to one of
+ *  itself above it. A tall pane's keyframes differ from a unit pane's only by that ratio. */
+export const paneKeyframes = (u: number, total: number): Keyframe[] => [
+  { transform: `translate3d(0, ${((total - u) / u) * 100}%, 0)` },
   { transform: 'translate3d(0, -100%, 0)' },
 ];
 
 /** A pane's words over its lap: dark until they rise clear of the foot, whole across the clear band, dark again as they
  *  near the header — capOpacity laid out on the pane's lap. `span` is where they stand in the pane, px from its top;
  *  `band` the clear band on the screen. */
-export function capKeyframes(n: number, h: number, span: readonly [number, number], band: readonly [number, number], fade = CAP_FADE): Keyframe[] {
+export function capKeyframes(u: number, unit: number, total: number, span: readonly [number, number], band: readonly [number, number], fade = CAP_FADE): Keyframe[] {
   const [a, b] = span, [top, bottom] = band;
-  const at = (y: number) => Math.max(0, Math.min(1, ((n - 1) * h - y) / (n * h))); // (the lap's point where the pane stands at y)
+  const at = (y: number) => Math.max(0, Math.min(1, ((total - u) * unit - y) / (total * unit))); // (the lap's point where the pane stands at y)
   const marks = [at(bottom - b), at(bottom - b - fade), at(top + fade - a), at(top - a)];
   for (let k = 1; k < marks.length; k++) marks[k] = Math.max(marks[k], marks[k - 1]); // (a tall name in a short band)
   return [
````

- [ ] **Step 5: Change the view to units, every pane still the screen.** Apply this patch to
  `src/works/reel-view.ts`. `ROLL_SECONDS` leaves the import list (the view now asks `rollPace` and `lapSeconds`); an
  unused import fails the type gate.

````diff
--- a/src/works/reel-view.ts
+++ b/src/works/reel-view.ts
@@ -23,8 +23,9 @@
 import { softBreaks } from '../lib/escape';
 import { CHANNELS, type ChannelKey, channelProjects } from './channels';
 import {
-  capKeyframes, coast, lapProgress, loopsAllowed, offsetForRail, offsetFromLap, oneLineSize, paneInView, paneKeyframes, panePlay,
-  paneTop, railProgress, REEL_WORDS, releaseSpeed, roleLine, ROLL_SECONDS, stripOrder, TAP_SLOP, TITLE_MAX, TITLE_MIN, wrapStart,
+  capKeyframes, coast, lapProgress, lapSeconds, lapUnits, loopsAllowed, offsetForPane, offsetForPlace, offsetForRail, offsetFromLap,
+  oneLineSize, paneInView, paneKeyframes, panePlay, paneTop, paneUnits, places, railProgress, railTicks, REEL_WORDS, releaseSpeed,
+  roleLine, rollPace, screenUnits, stripOrder, stripPlace, TAP_SLOP, TITLE_MAX, TITLE_MIN, wrapStart,
   type PanePlay,
 } from './reel';
 
@@ -57,6 +58,14 @@
   caps: HTMLElement[];
   spans: [number, number][];
   films: number;
+  /** the film behind each pane, and which films are vertical (works/reel.ts: stripOrder, paneUnits) */
+  order: number[];
+  tall: boolean[];
+  /** as the screen stands (measure): each pane's height in units and its place, the strip's lap and the chapter's */
+  units: number[];
+  at: number[];
+  total: number;
+  chapter: number;
 }
 
 export function mountReel(main: HTMLElement, projects: Project[], o: ReelOptions): Reel {
@@ -105,7 +114,10 @@
     ol.dataset.ch = ch.key;
     ol.hidden = true;
     ol.setAttribute('aria-label', `${ch.index} ${ch.name}`);
-    const panes = stripOrder(films.length).map((f, i) => {
+    const tall = films.map((p) => aspectRatio(p.aspect) < 1);
+    // laid for the upright screen, the longer need of the two: a turn of the phone never rebuilds a strip
+    const order = stripOrder(tall.map((t) => paneUnits(t, false)), screenUnits(false));
+    const panes = order.map((f, i) => {
       const li = frameOf(films[f], i);
       if (i >= films.length) { // (a short chapter laid again: the repeats are for the eye only)
         li.setAttribute('aria-hidden', 'true');
@@ -116,7 +128,7 @@
     ol.append(...panes);
     root.append(ol);
     const caps = panes.map((li) => li.querySelector<HTMLElement>('.rl-cap')!);
-    strips.set(ch.key, { ol, panes, caps, spans: caps.map(() => [0, 0]), films: films.length });
+    strips.set(ch.key, { ol, panes, caps, spans: caps.map(() => [0, 0]), films: films.length, order, tall, units: [], at: [], total: 0, chapter: 0 });
   }
 
   /* --------------------------------------------------------------- the foot -- */
@@ -188,11 +200,28 @@
 
   let active: ChannelKey = o.active;
   let strip = strips.get(active)!;
-  let offset = 0, v = 0, h = 1, raf = 0, last = 0;
+  // two heights (works/reel.ts): the screen's, and a unit's — the height of a pane of one unit
+  let offset = 0, v = 0, view = 1, unit = 1, side = false, raf = 0, last = 0;
   let parked = false, pinned = false, touching = false, pointer: number | null = null, startY = 0, startOffset = 0, moved = false, dragged = false;
   const moves: [number, number][] = [];
-  const rollSpeed = () => (reducedMotion() ? 0 : h / ROLL_SECONDS); // (CALM: it never rolls by itself)
-  const measure = () => { h = strip.ol.clientHeight || window.innerHeight; };
+  const rollSpeed = () => (reducedMotion() ? 0 : rollPace(view)); // (CALM: it never rolls by itself)
+  /** the two heights, and every pane's units and place as the screen stands */
+  const measure = () => {
+    view = strip.ol.clientHeight || window.innerHeight; // (no height yet under the LIST: the window's)
+    side = true; // (every pane the screen, as the styles still have it)
+    unit = view / screenUnits(side);
+    strip.units = strip.order.map((f) => paneUnits(strip.tall[f], side));
+    strip.at = places(strip.units);
+    strip.total = lapUnits(strip.units);
+    strip.chapter = lapUnits(strip.units.slice(0, strip.films));
+  };
+  /** the heights measured anew, the strip keeping its place: the same film under the screen's middle */
+  const remeasure = () => {
+    const [pane, part] = stripPlace(offset, unit, view, strip.units);
+    measureTop();
+    measure();
+    offset = offsetForPlace(pane, part, unit, view, strip.units);
+  };
 
   /* ---------------------------------------------- the roll, on the compositor -- */
 
@@ -202,39 +231,39 @@
   let lanes: { pane: Animation; cap: Animation }[] = [];
   let head: Animation | null = null;
   let rolling = false;
-  const lapMs = () => strip.panes.length * ROLL_SECONDS * 1000;
-  const headMs = () => strip.films * ROLL_SECONDS * 1000;
+  // a lap's time is its length at the roll's pace: the strip's, and the chapter's for the rail's playhead
+  const lapMs = () => lapSeconds(strip.total, unit, view) * 1000;
+  const headMs = () => lapSeconds(strip.chapter, unit, view) * 1000;
   const timelines = (): Animation[] => [...lanes.flatMap((l) => [l.pane, l.cap]), ...(head ? [head] : [])];
   /** every timeline set from the strip's offset */
   const setTimes = () => {
-    const n = strip.panes.length, lap = lapMs();
+    const lap = lapMs();
     lanes.forEach((l, i) => {
-      const t = lapProgress(i, offset, h, n) * lap;
+      const t = lapProgress(strip.at[i], strip.units[i], offset, unit, strip.total) * lap;
       l.pane.currentTime = t;
       l.cap.currentTime = t;
     });
-    if (head) head.currentTime = railProgress(offset, h, strip.films) * headMs();
+    if (head) head.currentTime = railProgress(offset, unit, view, strip.chapter) * headMs();
   };
   /** the strip's offset now: its own by hand; read from the clock while it rolls */
   const offsetNow = (): number => {
     if (rolling && lanes.length) {
       const lap = lapMs(), t = Number(lanes[0].pane.currentTime ?? 0);
-      offset = offsetFromLap((((t % lap) + lap) % lap) / lap, h, strip.panes.length, offset);
+      offset = offsetFromLap((((t % lap) + lap) % lap) / lap, strip.units[0], unit, strip.total, offset);
     }
     return offset;
   };
   /** the words' fades laid on their panes' laps (the band, the names or the screen's height changed) */
   const capFrames = () => {
-    const n = strip.panes.length;
-    lanes.forEach((l, i) => (l.cap.effect as KeyframeEffect).setKeyframes(capKeyframes(n, h, strip.spans[i], [bandTop, bandBottom])));
+    lanes.forEach((l, i) => (l.cap.effect as KeyframeEffect).setKeyframes(capKeyframes(strip.units[i], unit, strip.total, strip.spans[i], [bandTop, bandBottom])));
   };
   /** the animations anew for the strip shown, paused where it stands */
   const build = () => {
     for (const a of timelines()) a.cancel();
-    const n = strip.panes.length, lane = { duration: lapMs(), iterations: Infinity, easing: 'linear' };
+    const lane = { duration: lapMs(), iterations: Infinity, easing: 'linear' };
     lanes = strip.panes.map((li, i) => ({
-      pane: li.animate(paneKeyframes(n), lane),
-      cap: strip.caps[i].animate(capKeyframes(n, h, strip.spans[i], [bandTop, bandBottom]), lane),
+      pane: li.animate(paneKeyframes(strip.units[i], strip.total), lane),
+      cap: strip.caps[i].animate(capKeyframes(strip.units[i], unit, strip.total, strip.spans[i], [bandTop, bandBottom]), lane),
     }));
     const ph = rail.querySelector<HTMLElement>('.rl-play');
     head = ph ? ph.animate([{ transform: 'translate3d(0, 0%, 0)' }, { transform: 'translate3d(0, 100%, 0)' }], { duration: headMs(), iterations: Infinity, easing: 'linear' }) : null;
@@ -322,9 +351,9 @@
   };
   /** every pane's loop as the strip stands: on the screen or next in, playing; near, resting; far, let go */
   const plan = () => {
-    const n = strip.panes.length, at = offsetNow(), dir = rolling || v >= -1 ? 1 : -1, still = parked || document.hidden;
+    const at = offsetNow(), dir = rolling || v >= -1 ? 1 : -1, still = parked || document.hidden;
     const want: PanePlay[] = strip.panes.map((_, i) => {
-      const p = panePlay(paneTop(i, at, h, n), h, h, dir);
+      const p = panePlay(paneTop(strip.at[i], strip.units[i], at, unit, strip.total), strip.units[i] * unit, view, dir);
       return still && p === 'play' ? 'rest' : p;
     });
     const key = want.join(',');
@@ -349,7 +378,7 @@
     const at = offsetNow();
     strip.panes.forEach((li, i) => {
       const l = loops.get(li);
-      if (l instanceof HTMLVideoElement && l.paused && panePlay(paneTop(i, at, h, strip.panes.length), h, h, 1) === 'play') tryPlay(l);
+      if (l instanceof HTMLVideoElement && l.paused && panePlay(paneTop(strip.at[i], strip.units[i], at, unit, strip.total), strip.units[i] * unit, view, 1) === 'play') tryPlay(l);
     });
   };
   window.addEventListener('pointerdown', kick, { passive: true });
@@ -426,7 +455,7 @@
     e.preventDefault();
     e.stopPropagation();
   }, true);
-  // a keyboard's focus brings its pane square into the screen and holds the strip there until it leaves
+  // a keyboard's focus brings its pane to the middle of the screen and holds the strip there until it leaves
   root.addEventListener('focusin', (e) => {
     const li = (e.target as Element).closest<HTMLLIElement>('.rl-frame');
     const i = li ? strip.panes.indexOf(li) : -1;
@@ -434,8 +463,7 @@
     hold();
     sleep();
     pinned = true;
-    const lap = strip.panes.length * h;
-    offset = i * h + Math.round((offset - i * h) / lap) * lap;
+    offset = offsetForPane(strip.at[i], strip.units[i], unit, view, strip.total, offset);
     v = 0;
     setTimes();
     plan();
@@ -448,12 +476,13 @@
 
   /* ------------------------------------------------------------- the rail -- */
 
+  // (after measure: a film's tick stands at its middle along the lap, and a tall pane's stretch is twice as long)
   const paintRail = () => {
     rail.replaceChildren();
-    const films = channelProjects(projects, active);
+    const films = channelProjects(projects, active), ticks = railTicks(strip.units.slice(0, strip.films));
     films.forEach((p, i) => {
       const t = el('i', 'rl-tick');
-      t.style.top = `${((i + 0.5) / films.length) * 100}%`;
+      t.style.top = `${ticks[i] * 100}%`;
       t.style.setProperty('--acc', p.accent);
       rail.append(t);
     });
@@ -462,7 +491,7 @@
   let scrubbing = false;
   const scrubTo = (clientY: number) => {
     const r = rail.getBoundingClientRect();
-    offset = offsetForRail((clientY - r.top) / Math.max(1, r.height), h, strip.films, offset);
+    offset = offsetForRail((clientY - r.top) / Math.max(1, r.height), unit, view, strip.chapter, offset);
     v = 0;
     setTimes();
     plan();
@@ -498,9 +527,9 @@
     strip = strips.get(key)!;
     for (const [k, s] of strips) s.ol.hidden = k !== key;
     paintFoot();
-    paintRail();
     measureTop();
     measure();
+    paintRail();
     fit(strip);
     offset = 0;
     v = 0;
@@ -512,11 +541,10 @@
   window.addEventListener('resize', () => {
     clearTimeout(resizeT);
     resizeT = window.setTimeout(() => {
-      const was = h, wasRolling = rolling;
+      const wasRolling = rolling;
       hold();
-      measureTop();
-      measure();
-      offset = (offset / Math.max(1, was)) * h; // (the same film stays in view through a turn of the phone)
+      remeasure(); // (the same film stays in view through a turn of the phone)
+      paintRail();
       fit(strip);
       build();
       replan();
@@ -540,7 +568,8 @@
     offset: () => offsetNow(),
     speed: () => (rolling ? rollSpeed() : v),
     rolling: () => rolling,
-    inView: () => strip.panes[paneInView(offsetNow(), h, strip.panes.length)]?.dataset.slug,
+    inView: () => strip.panes[paneInView(offsetNow(), unit, view, strip.units)]?.dataset.slug,
+    sizes: () => ({ view, unit, side, units: [...strip.units] }),
     chapter: () => active,
     playing: () => [...loops].filter(([, l]) => (l instanceof HTMLVideoElement ? !l.paused : l.classList.contains('is-live'))).map(([li]) => li.dataset.slug),
     loops: () => loops.size,
@@ -564,8 +593,7 @@
     park(p) {
       parked = p;
       if (p) { hold(); sleep(); replan(); return; }
-      measureTop();
-      measure();
+      remeasure();
       fit(strip);
       capFrames();
       setTimes();
````

- [ ] **Step 6: Run the tests and the type gate.**

Run: `npx vitest run tests/reel.test.ts`
Expected: PASS. `Tests  24 passed (24)`.

Run: `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`
Expected: PASS. `Tests  13 passed` and the skipped rest.

Run: `npm run check`
Expected: no error, exit 0.

- [ ] **Step 7: Commit.** Check `git diff -- tests/floor-ways.test.ts` first (Global Constraints). Message file:

```text
refactor(works): the phone strip's arithmetic takes units and two heights - nothing moves yet (owner)

The owner: "This is for mobile's WORK section: RIght now, the panes are too long in length and should be shorten. we
should be able to see two panes on the phone screen at the same time instead."

The second step of docs/superpowers/plans/2026-11-24-work-phone-two-panes.md.
- works/reel.ts: stripOrder, paneTop, paneInView, railProgress, offsetForRail, lapProgress, offsetFromLap,
  paneKeyframes and capKeyframes take each pane's units, the unit's height and the screen's. A short chapter is laid
  again until it holds the screen and its tallest pane, never to fewer than three panes. The film in view and the
  rail's playhead are the point of the lap under the screen's middle.
- works/reel-view.ts: two heights replace the one. Each strip carries its panes' units, places and laps. The rail is
  painted after the measure, and again on a turn of the phone. The strip keeps its place through a turn by the pane
  under the screen's middle. A keyboard's focus brings its pane to the screen's middle.
- Every pane is still one unit as tall as the screen: the strip on the site looks and rolls as before.

Verified: tests/reel.test.ts 24 passed; the reel's pins in tests/floor-ways.test.ts 13 passed; npm run check.

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
```

```bash
git add -- src/works/reel.ts src/works/reel-view.ts tests/reel.test.ts tests/floor-ways.test.ts
git commit -F "$SCRATCH/msg.txt" -- src/works/reel.ts src/works/reel-view.ts tests/reel.test.ts tests/floor-ways.test.ts
git show --stat HEAD
```

---

### Task 3: The loops' rule — the next pane starts as it enters

The owner approved this with the design: the next pane to come in waits loaded and paused, and starts the moment it
enters, so three loops decode at most.

**Files:**
- Modify: `src/works/reel.ts` (`panePlay`)
- Modify: `src/works/reel-view.ts` (the header comment, the loop's `error` handler, `plan()`, `kick()`)
- Test: `tests/reel.test.ts` (the last test of `the rolling strip` replaced by two)
- Test: `tests/floor-ways.test.ts` (the reel's pins: one line rewritten, three added)

**Interfaces:**
- Consumes: Task 2's `paneTop`, and the view's `unit`, `view`, `strip.units`, `strip.at`, `strip.total`.
- Produces: `panePlay(top, height, view, unit)`: `'play'` on the screen; `'rest'` within one unit of it; `'free'`
  further off. It no longer takes a direction.

- [ ] **Step 1: Write the failing tests.** Apply these two patches.

`tests/reel.test.ts`:

````diff
--- a/tests/reel.test.ts
+++ b/tests/reel.test.ts
@@ -279,17 +279,35 @@
     expect(capOpacity(600, 700, 500, 400)).toBe(1); // (no band to measure: whole)
   });
 
-  it('plays every pane on the screen and the next to come in; rests the near; lets the far go', () => {
-    expect(panePlay(0, VIEW, VIEW, 1)).toBe('play');
-    expect(panePlay(-VIEW / 2, VIEW, VIEW, 1)).toBe('play'); // (half out at the top)
-    expect(panePlay(VIEW / 2, VIEW, VIEW, 1)).toBe('play'); // (half in from below)
-    expect(panePlay(VIEW, VIEW, VIEW, 1)).toBe('play'); // (the next to come in, rolling on)
-    expect(panePlay(VIEW, VIEW, VIEW, -1)).toBe('rest'); // (… but not while the strip goes back)
-    expect(panePlay(-VIEW, VIEW, VIEW, -1)).toBe('play'); // (going back, the one above comes in)
-    expect(panePlay(-VIEW, VIEW, VIEW, 1)).toBe('rest');
-    expect(panePlay(2 * VIEW, VIEW, VIEW, 1)).toBe('rest');
-    expect(panePlay(3 * VIEW, VIEW, VIEW, 1)).toBe('free');
-    expect(panePlay(-3 * VIEW, VIEW, VIEW, 1)).toBe('free');
+  // (owner, 2026-11-24, on the design: the next pane starts as it enters, so three loops decode at most)
+  it('plays every pane on the screen; rests the panes within one unit of it, loaded; lets the far go', () => {
+    expect(panePlay(0, UNIT, VIEW, UNIT)).toBe('play');
+    expect(panePlay(UNIT, UNIT, VIEW, UNIT)).toBe('play'); // (the lower of the two)
+    expect(panePlay(1 - UNIT, UNIT, VIEW, UNIT)).toBe('play'); // (a pixel of it left at the top)
+    expect(panePlay(VIEW - 1, UNIT, VIEW, UNIT)).toBe('play'); // (a pixel in from below: it starts as it enters)
+    expect(panePlay(VIEW, UNIT, VIEW, UNIT)).toBe('rest'); // (the next to come in: loaded, paused)
+    expect(panePlay(-UNIT, UNIT, VIEW, UNIT)).toBe('rest'); // (the one that has just left)
+    expect(panePlay(VIEW + UNIT - 1, UNIT, VIEW, UNIT)).toBe('rest');
+    expect(panePlay(VIEW + UNIT, UNIT, VIEW, UNIT)).toBe('free');
+    expect(panePlay(-2 * UNIT, UNIT, VIEW, UNIT)).toBe('free');
+    expect(panePlay(0, VIEW, VIEW, UNIT)).toBe('play'); // (the tall pane, square in the screen)
+    expect(panePlay(VIEW, VIEW, VIEW, UNIT)).toBe('rest');
+    expect(panePlay(-VIEW - UNIT, VIEW, VIEW, UNIT)).toBe('free');
+    expect(panePlay(390, 390, 390, 390)).toBe('rest'); // (on its side a unit is the screen)
+    expect(panePlay(780, 390, 390, 390)).toBe('free');
+  });
+
+  it('never plays more than three loops, nor loads more than five, wherever the strip stands', () => {
+    for (const tall of CHAPTERS) for (const side of [false, true]) {
+      const { units, at, total, unit, view } = lay(tall, side);
+      for (let off = -total * unit; off <= 2 * total * unit; off += 13) {
+        const want = units.map((u, i) => panePlay(paneTop(at[i], u, off, unit, total), u * unit, view, unit));
+        const playing = want.filter((w) => w === 'play').length;
+        expect(playing, `${units} at ${off}`).toBeGreaterThanOrEqual(1);
+        expect(playing, `${units} at ${off}`).toBeLessThanOrEqual(3);
+        expect(want.filter((w) => w !== 'free').length, `${units} at ${off}`).toBeLessThanOrEqual(5);
+      }
+    }
   });
 });
 
````

`tests/floor-ways.test.ts` (inside the reel's describe):

````diff
--- a/tests/floor-ways.test.ts
+++ b/tests/floor-ways.test.ts
@@ -403,7 +403,11 @@
   it('every pane in view plays, on every tier; a refusal turns the loops to images; a touch re-offers a video', () => {
     expect(view).toContain("if (!allowed) return null; // (Save-Data or a 2g line: the posters)");
     expect(view).not.toContain('quality.tier()'); // (a remembered LITE once left a phone on posters all visit)
-    expect(view).toContain("else if (want[i] === 'rest') { const l = loops.get(li); if (l instanceof HTMLVideoElement) l.pause(); }");
+    // (owner, 2026-11-24, on the design: the next pane starts as it enters) a resting pane's video is loaded, paused
+    expect(view).toContain("else if (want[i] === 'rest') { const l = ahead ? ensureLoop(li) : loops.get(li); if (l instanceof HTMLVideoElement) l.pause(); }");
+    expect(view).toContain('const ahead = !still && !loopsAsImages();'); // (an image cannot wait paused; nothing loads under the LIST)
+    expect(view).toContain('strip.units[i] * unit, view, unit);'); // (the loops' rule gets the pane's height, the screen's and the unit's)
+    expect(view).toContain('replan(); // (it plays if its pane is on the screen; a resting pane\'s waits, paused)');
     expect(view).toContain('l = loopsAsImages() ? imageLoop(li, chain) : videoLoop(chain);');
     expect(view).toContain('if (isRefusal(e)) noteRefusal();');
     expect(view).toContain("window.addEventListener('touchend', kick, { passive: true });");
````

- [ ] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/reel.test.ts`
Expected: FAIL. `Tests  2 failed | 23 passed (25)`: the two loops' tests.

Run: `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`
Expected: FAIL. `Tests  1 failed | 12 passed` and the skipped rest: `every pane in view plays, on every tier …`.

- [ ] **Step 3: Write the rule.** Apply this patch to `src/works/reel.ts`.

````diff
--- a/src/works/reel.ts
+++ b/src/works/reel.ts
@@ -233,14 +233,14 @@
 }
 
 export type PanePlay = 'play' | 'rest' | 'free';
-/** What a pane at `top` (px, `h` tall, on a screen `view` tall) does with its loop while the strip moves `dir`: on the
- *  screen, or the next to come in, it plays; within two screens it rests, loaded; further off it gives the video back. */
-export function panePlay(top: number, h: number, view: number, dir: number): PanePlay {
-  const bottom = top + h;
+/** What a pane does with its loop: `top` px down the screen and `height` px tall, on a screen `view` px tall, in a strip
+ *  whose unit is `unit` px. On the screen it plays. Within one unit of the screen it rests, loaded and paused, so the
+ *  next pane to come in starts the moment it enters (owner, 2026-11-24, on the design: three loops decode at most).
+ *  Further off it gives its video back. */
+export function panePlay(top: number, height: number, view: number, unit: number): PanePlay {
+  const bottom = top + height;
   if (bottom > 0 && top < view) return 'play';
-  if (dir >= 0 && top >= view && top < view + h) return 'play';
-  if (dir < 0 && bottom <= 0 && bottom > -h) return 'play';
-  if (top < view + 2 * h && bottom > -2 * h) return 'rest';
+  if (top < view + unit && bottom > -unit) return 'rest';
   return 'free';
 }
 
````

- [ ] **Step 4: The view: a resting pane loads its video.** Apply this patch to `src/works/reel-view.ts`. Three
  things in it need care:
  - `ahead` is false under the LIST and in a hidden tab, so nothing loads behind the list, and false when the loops
    are images, which cannot wait paused;
  - a loop file's fallback calls `replan()`, not `tryPlay(vid)`: after `load()` the video is paused, and the plan plays
    it only if its pane is on the screen;
  - `dir` is gone from `plan()`; `v` is still used by the coast.

````diff
--- a/src/works/reel-view.ts
+++ b/src/works/reel-view.ts
@@ -14,9 +14,10 @@
  *    side stands whole in the middle.
  *  - Down the right, the scrub rail: a tick per film, the lime playhead travelling with the strip; a touch along it moves
  *    the strip there. At the foot, the chapters and LIST.
- *  - Every pane on the screen plays its loop, and so does the next to come in; panes further off rest, then give their
- *    video back. A refused play() (iOS Low Power Mode) turns the loops into MP4 images (lib/autoplay.ts). Save-Data or
- *    a 2g line shows posters. The page (pages/works.ts) runs the channel change and the list. */
+ *  - Every pane on the screen plays its loop. The panes within one unit of the screen rest, loaded and paused, so the
+ *    next to come in starts the moment it enters (owner, 2026-11-24: three loops decode at most); further off they give
+ *    their video back. A refused play() (iOS Low Power Mode) turns the loops into MP4 images (lib/autoplay.ts).
+ *    Save-Data or a 2g line shows posters. The page (pages/works.ts) runs the channel change and the list. */
 import { aspectRatio, loopSrcChain, projectAssetUrl, type Project } from '../lib/content';
 import { autoplayRefused, imageLoopsWork, isRefusal, loopsAsImages, noteImageLoops, noteRefusal, onRefusal } from '../lib/autoplay';
 import { reducedMotion } from '../lib/env';
@@ -314,7 +315,7 @@
       if (++k >= chain.length) return;
       vid.src = chain[k];
       vid.load();
-      tryPlay(vid);
+      replan(); // (it plays if its pane is on the screen; a resting pane's waits, paused)
     });
     vid.addEventListener('playing', () => vid.classList.add('is-live')); // (the poster until the loop has a picture)
     vid.src = chain[0];
@@ -349,11 +350,13 @@
     loops.set(li, l);
     return l;
   };
-  /** every pane's loop as the strip stands: on the screen or next in, playing; near, resting; far, let go */
+  /** every pane's loop as the strip stands: on the screen, playing; within one unit of it, loaded and resting (the next
+   *  to come in starts the moment it enters); further off, let go */
   const plan = () => {
-    const at = offsetNow(), dir = rolling || v >= -1 ? 1 : -1, still = parked || document.hidden;
+    const at = offsetNow(), still = parked || document.hidden;
+    const ahead = !still && !loopsAsImages(); // (a video waits paused; an image cannot, and nothing loads under the LIST)
     const want: PanePlay[] = strip.panes.map((_, i) => {
-      const p = panePlay(paneTop(strip.at[i], strip.units[i], at, unit, strip.total), strip.units[i] * unit, view, dir);
+      const p = panePlay(paneTop(strip.at[i], strip.units[i], at, unit, strip.total), strip.units[i] * unit, view, unit);
       return still && p === 'play' ? 'rest' : p;
     });
     const key = want.join(',');
@@ -361,7 +364,7 @@
     planned = key;
     strip.panes.forEach((li, i) => {
       if (want[i] === 'free') release(li);
-      else if (want[i] === 'rest') { const l = loops.get(li); if (l instanceof HTMLVideoElement) l.pause(); }
+      else if (want[i] === 'rest') { const l = ahead ? ensureLoop(li) : loops.get(li); if (l instanceof HTMLVideoElement) l.pause(); }
       else { const l = ensureLoop(li); if (l instanceof HTMLVideoElement && l.paused) tryPlay(l); }
     });
   };
@@ -378,7 +381,7 @@
     const at = offsetNow();
     strip.panes.forEach((li, i) => {
       const l = loops.get(li);
-      if (l instanceof HTMLVideoElement && l.paused && panePlay(paneTop(strip.at[i], strip.units[i], at, unit, strip.total), strip.units[i] * unit, view, 1) === 'play') tryPlay(l);
+      if (l instanceof HTMLVideoElement && l.paused && panePlay(paneTop(strip.at[i], strip.units[i], at, unit, strip.total), strip.units[i] * unit, view, unit) === 'play') tryPlay(l);
     });
   };
   window.addEventListener('pointerdown', kick, { passive: true });
````

- [ ] **Step 5: Run the tests and the type gate.**

Run: `npx vitest run tests/reel.test.ts`
Expected: PASS. `Tests  25 passed (25)`.

Run: `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`
Expected: PASS. `Tests  13 passed` and the skipped rest.

Run: `npm run check`
Expected: no error, exit 0.

- [ ] **Step 6: Commit.** Check `git diff -- tests/floor-ways.test.ts` first. Message file:

```text
feat(works): on a phone the next pane starts as it enters - it waits loaded and paused (owner)

The owner approved the design of 2026-11-24 with the next pane starting as it enters, over playing before it shows
(docs/superpowers/specs/2026-11-24-work-phone-two-panes-design.md, design call 2).

The third step of docs/superpowers/plans/2026-11-24-work-phone-two-panes.md.
- works/reel.ts: panePlay takes the pane's height, the screen's and the unit's. On the screen a pane plays; within one
  unit of it, it rests; further off it gives its video back. No direction any more.
- works/reel-view.ts: a resting pane's video is created and loaded, paused. Not under the LIST or in a hidden tab, and
  not when the loops are images, which cannot wait paused. A loop file's fallback asks the plan instead of playing by
  itself.
- So three loops play at most and five are loaded, wherever the strip stands (a test walks every offset).

Verified: tests/reel.test.ts 25 passed; the reel's pins in tests/floor-ways.test.ts 13 passed; npm run check.

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
```

```bash
git add -- src/works/reel.ts src/works/reel-view.ts tests/reel.test.ts tests/floor-ways.test.ts
git commit -F "$SCRATCH/msg.txt" -- src/works/reel.ts src/works/reel-view.ts tests/reel.test.ts tests/floor-ways.test.ts
git show --stat HEAD
```

---

### Task 4: The flip — two panes on the screen

One commit turns the switch and changes the styles, the pins and the owner's guide together. Never commit arithmetic
that says half while the styles say whole. Tasks 4 and 5 are one unit of work for one worker: Task 4 leaves its
changes uncommitted, Task 5 checks them in a headless phone and then commits them.

**Files:**
- Modify: `src/works/reel-view.ts` (`side` from the media query, the `is-tall` class, three eager posters, comments)
- Modify: `src/works/reel.ts` (the header comment only)
- Modify: `src/styles/components.css` (the reel's block only)
- Modify: `HOW-TO-EDIT.md`
- Test: `tests/floor-ways.test.ts` (the reel's pins: three tests rewritten or extended, one added)
- Test: `tests/reel.test.ts` (the header comment only)

**Interfaces:**
- Consumes: `SIDE_QUERY` (Task 1) and `measure()` (Task 2).
- Produces: `li.rl-frame.is-tall` for a vertical film's pane; in the styles `.rl-frame { height: 50% }`,
  `.rl-frame.is-tall { height: 100% }` and, in the sideways block, `.rl-frame { height: 100% }`.

- [ ] **Step 1: Rewrite the reel's pins.** Apply this patch to `tests/floor-ways.test.ts` (every hunk is inside the
  reel's describe). The comment `/* a phone on its side` must keep that beginning in the styles: two pins find the
  sideways block by it.

````diff
--- a/tests/floor-ways.test.ts
+++ b/tests/floor-ways.test.ts
@@ -345,13 +345,27 @@
   it('the foot stands inside the small viewport, above the home indicator, the words above it', () => {
     expect(css).toMatch(/\n\.rl-foot \{[^}]*position: fixed;[^}]*bottom: 0;[^}]*padding: 0 10px env\(safe-area-inset-bottom\);/);
     expect(css).toMatch(/\n\.rl-cap \{[^}]*bottom: calc\(var\(--reel-foot\) \+ env\(safe-area-inset-bottom\) \+ 26px\);/);
+    // the words and the marks are placed from their pane's own edges (the link fills the pane): a pane at the screen's
+    // bottom shows its words clear of the foot; the top marks stand 14 px inside the pane; the dark covers the words
+    expect(css).toContain('.rl-link { position: absolute; inset: 0; display: block;');
+    expect(css).toMatch(/\n\.rl-marks \{[^}]*top: 14px; bottom: calc\(var\(--reel-foot\) \+ env\(safe-area-inset-bottom\) \+ 10px\);/);
+    expect(css).toMatch(/\n\.rl-pane::after \{[^}]*height: max\(48%, calc\(var\(--reel-foot\) \+ env\(safe-area-inset-bottom\) \+ 226px\)\);/);
   });
 
-  // (owner, 2026-10-20, with two screenshots of antiantiart.com on a phone: "I would prefer the sizing of all panes on
-  // Phone in the work section to be like this website")
-  it('a pane is the whole screen, its picture covering it around the film\'s focus point', () => {
+  it('at arrival the gate wipe covers both panes on the screen, and their posters load at once', () => {
+    expect(css).toContain('.works-main.is-arriving .rl-strip:not([hidden]) .rl-frame:nth-child(-n+2) .rl-pane { animation: rl-gate 0.42s steps(7) both; }');
+    expect(view).toContain("img.loading = i < 3 ? 'eager' : 'lazy';");
+  });
+
+  // (owner, 2026-11-24: "the panes are too long in length and should be shorten. we should be able to see two panes on
+  // the phone screen at the same time instead"; from 2026-10-20 until then a pane was the whole screen)
+  it("a pane is half the screen and a vertical film's is the whole of it, its picture covering it around the film's focus point", () => {
     expect(css).toContain('.reel { position: fixed; inset: 0; z-index: 900; }');
-    expect(css).toMatch(/\n\.rl-frame \{[^}]*position: absolute;[^}]*height: 100%;/);
+    expect(css).toMatch(/\n\.rl-frame \{[^}]*position: absolute;[^}]*height: 50%;/);
+    expect(css).toContain('.rl-frame.is-tall { height: 100%; }');
+    expect(css.indexOf('.rl-frame.is-tall {')).toBeGreaterThan(css.indexOf('\n.rl-frame {')); // (after the rule it overrides)
+    expect(view).toContain("const li = el('li', `rl-frame${aspectRatio(p.aspect) < 1 ? ' is-tall' : ''}`);");
+    expect(view).toContain('side = window.matchMedia(SIDE_QUERY).matches;'); // (the view counts units on the styles' own line)
     expect(css).toContain('.rl-poster, .rl-loop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: var(--focus, 50% 50%); }');
     expect(view).toContain("pane.style.setProperty('--focus', p.focus);");
   });
@@ -391,6 +405,11 @@
     expect(view).toContain("aspectRatio(p.aspect) < 1 ? ' is-vertical' : ''");
     const side = css.slice(css.indexOf('/* a phone on its side'));
     expect(side).toContain('.rl-pane.is-vertical .rl-poster, .rl-pane.is-vertical .rl-loop { object-fit: contain; }');
+    // on its side every pane is the whole screen, its marks under the header and its dark as they were
+    expect(side).toContain('@media (max-height: 500px) {'); // (works/reel.ts's SIDE_QUERY, pinned in tests/reel.test.ts)
+    expect(side).toContain('.rl-frame { height: 100%; }');
+    expect(side).toContain('.rl-marks { top: calc(var(--reel-top, 132px) + 4px); }');
+    expect(side).toContain('.rl-pane::after { height: 48%; }');
   });
 
   it('a pane carries the film\'s name and its roles, nothing else (owner: "Do not clog this section up with texts")', () => {
````

- [ ] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`
Expected: FAIL. `Tests  4 failed | 10 passed` and the skipped rest: `the foot stands inside the small viewport …`,
`at arrival the gate wipe covers both panes …`, `a pane is half the screen …` and `a vertical film stands vertical …`.

- [ ] **Step 3: The view: turn the switch.** Apply this patch to `src/works/reel-view.ts`.

````diff
--- a/src/works/reel-view.ts
+++ b/src/works/reel-view.ts
@@ -1,7 +1,9 @@
 /** WORK ON A PHONE: THE REEL, built — a rolling strip (works/reel.ts says what it is and holds its rules).
  *
- *  - A strip per chapter: its films' panes, each the whole screen, endless (no scrolling: the strip never ends and never
- *    jumps). From the first frame it rolls on, one screen every ROLL_SECONDS.
+ *  - A strip per chapter: its films' panes, endless (no scrolling: the strip never ends and never jumps). A pane is half
+ *    the screen, so two show at once (owner, 2026-11-24: "we should be able to see two panes on the phone screen at the
+ *    same time"); a vertical film's is the whole screen; on a phone held on its side every pane is the screen. From the
+ *    first frame it rolls on, one screen's height every ROLL_SECONDS.
  *  - The roll runs on the compositor: each pane, its words and the rail's playhead run one linear animation a lap,
  *    phased by where they stand, so the screen's own clock moves them and a busy page (a film's video starting) never
  *    stutters the strip (owner, 2026-10-20: "I want the auto scrolling to happen instantly, but slower and smoother").
@@ -26,7 +28,7 @@
 import {
   capKeyframes, coast, lapProgress, lapSeconds, lapUnits, loopsAllowed, offsetForPane, offsetForPlace, offsetForRail, offsetFromLap,
   oneLineSize, paneInView, paneKeyframes, panePlay, paneTop, paneUnits, places, railProgress, railTicks, REEL_WORDS, releaseSpeed,
-  roleLine, rollPace, screenUnits, stripOrder, stripPlace, TAP_SLOP, TITLE_MAX, TITLE_MIN, wrapStart,
+  roleLine, rollPace, screenUnits, SIDE_QUERY, stripOrder, stripPlace, TAP_SLOP, TITLE_MAX, TITLE_MIN, wrapStart,
   type PanePlay,
 } from './reel';
 
@@ -81,10 +83,11 @@
 
   /* ------------------------------------------------------------ the strips -- */
 
-  // a pane: the picture over the whole screen, and on it the film's name and its roles — nothing else (owner,
-  // 2026-10-20: "only the Project name, and the Role names are enough. Do not clog this section up with texts")
+  // a pane: the picture over half the screen, and on it the film's name and its roles — nothing else (owner,
+  // 2026-10-20: "only the Project name, and the Role names are enough. Do not clog this section up with texts"). A
+  // vertical film's pane is tall, two panes high: the whole screen (the styles size both; works/reel.ts counts them)
   const frameOf = (p: Project, i: number): HTMLLIElement => {
-    const li = el('li', 'rl-frame');
+    const li = el('li', `rl-frame${aspectRatio(p.aspect) < 1 ? ' is-tall' : ''}`);
     li.dataset.slug = p.slug;
     li.style.setProperty('--acc', p.accent);
     const a = el('a', 'rl-link');
@@ -98,7 +101,7 @@
     img.alt = '';
     img.decoding = 'async';
     img.draggable = false;
-    img.loading = i < 2 ? 'eager' : 'lazy';
+    img.loading = i < 3 ? 'eager' : 'lazy'; // (the two on the screen, and the next to come in)
     img.src = projectAssetUrl(p.slug, 'poster.jpg');
     pane.append(img, el('i', 'rl-scan'));
     const cap = el('span', 'rl-cap');
@@ -209,7 +212,7 @@
   /** the two heights, and every pane's units and place as the screen stands */
   const measure = () => {
     view = strip.ol.clientHeight || window.innerHeight; // (no height yet under the LIST: the window's)
-    side = true; // (every pane the screen, as the styles still have it)
+    side = window.matchMedia(SIDE_QUERY).matches; // (the styles' own line: on its side every pane is the screen)
     unit = view / screenUnits(side);
     strip.units = strip.order.map((f) => paneUnits(strip.tall[f], side));
     strip.at = places(strip.units);
````

- [ ] **Step 4: The styles.** Apply this patch to `src/styles/components.css`. All of it is inside the reel's block
  (from the comment `/* WORK ON A PHONE: THE REEL` to the end of the block `@media (max-height: 500px)`). What it does:
  - a frame is `height: 50%`, and `.rl-frame.is-tall` is `100%`, placed after the rule it overrides;
  - `.rl-cap` keeps its rule: it already hangs from its pane's bottom edge. Only its comment says so now;
  - `.rl-marks` stands `top: 14px` inside the pane; its `bottom` keeps today's distance;
  - the dark (`.rl-pane::after`) is `max(48%, calc(var(--reel-foot) + env(safe-area-inset-bottom) + 226px))`;
  - the arrival wipe takes `.rl-frame:nth-child(-n+2)`: both panes on the screen;
  - the sideways block puts back the whole-screen frame, the marks under the header and the 48% dark. Each of its
    three new rules has the same specificity as the rule it overrides and comes after it.

````diff
--- a/src/styles/components.css
+++ b/src/styles/components.css
@@ -644,10 +644,11 @@
 /* WORK ON A PHONE: THE REEL (works/reel.ts, works/reel-view.ts; owner, 2026-10-20: "on Phone, its completely
    overwhelming and disorienting … a complete redesign of the interface of the Work section, still keeping the
    fundamental art direction, but changing the UI/UX specifically for Phones"). The class comes only with a phone
-   (touch, and under 640 px wide or 500 px tall): one film to a screen and a swipe per film. A pane is the whole screen,
-   its loop covering it, as antiantiart.com's on a phone (owner, the same day, with two screenshots of it: "I would
-   prefer the sizing of all panes on Phone in the work section to be like this website"); on it only the film's name
-   and its roles ("Do not clog this section up with texts"). The panes run as one endless strip that rolls on its own
+   (touch, and under 640 px wide or 500 px tall). A pane has its loop covering it, as antiantiart.com's on a phone
+   (owner, the same day, with two screenshots of it: "I would prefer the sizing of all panes on Phone in the work
+   section to be like this website"); it was the whole screen then, and is half of it since 2026-11-24 (the rule
+   stands at .rl-frame). On it only the film's name and its roles ("Do not clog this section up with texts"). The panes
+   run as one endless strip that rolls on its own
    and a finger drags ("we can see the already continously scrolling down to the next film in a continuous strips. And
    we can slide our finger up and down"): works/reel-view.ts moves it, each pane by its transform. The header and the
    foot lie over the picture, the rail down its right edge. The floor, its legend and its tabs leave a phone; THE LIST
@@ -672,11 +673,15 @@
   touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
 }
 .rl-strip[hidden] { display: none; }
-/* a pane: the whole screen, one film, set along the strip by its transform; the cut between two a hairline of field blue */
+/* a pane: half the screen, one film, set along the strip by its transform; the cut between two a hairline of field blue.
+   Two panes show at once (owner, 2026-11-24: "the panes are too long in length and should be shorten. we should be
+   able to see two panes on the phone screen at the same time instead"). A vertical film's pane is two panes high, the
+   whole screen: vertical footage is never cropped wide. works/reel.ts measures the strip in these units. */
 .rl-frame {
-  position: absolute; left: 0; right: 0; top: 0; box-sizing: border-box; height: 100%; overflow: hidden;
+  position: absolute; left: 0; right: 0; top: 0; box-sizing: border-box; height: 50%; overflow: hidden;
   background: var(--void); will-change: transform; border-bottom: 1px solid color-mix(in srgb, var(--field) 60%, transparent);
 }
+.rl-frame.is-tall { height: 100%; }
 /* the film's edge: sprockets down the left, riding with the panes */
 .rl-frame::before {
   content: ''; position: absolute; left: 6px; top: 0; bottom: 0; width: 7px; z-index: 3; pointer-events: none;
@@ -689,15 +694,18 @@
 .rl-loop { opacity: 0; transition: opacity 0.25s; }
 .rl-loop.is-live { opacity: 1; }
 .rl-scan { position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(6, 6, 6, 0.16) 0 1px, transparent 1px 3px); }
-/* the dark the words and the foot stand on */
+/* the dark the words and the foot stand on: in a half pane it reaches over the words' whole span — their distance from
+   the pane's foot (the .rl-cap rule) and 200 px, room for the tallest name (143 px, measured) */
 .rl-pane::after {
-  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 48%; pointer-events: none;
+  content: ''; position: absolute; left: 0; right: 0; bottom: 0; pointer-events: none;
+  height: max(48%, calc(var(--reel-foot) + env(safe-area-inset-bottom) + 226px));
   background: linear-gradient(0deg, color-mix(in srgb, var(--void) 90%, transparent) 0%, color-mix(in srgb, var(--void) 58%, transparent) 42%, transparent 100%);
 }
-/* the viewfinder's corners in the film's accent (the floor's crop marks), round the picture between the header and the foot */
+/* the viewfinder's corners in the film's accent (the floor's crop marks), round the pane's own picture: 14 px inside its
+   top, and above the foot's height from its bottom (so the lower pane's stand clear of the foot) */
 .rl-marks {
   position: absolute; left: 20px; right: 40px; z-index: 2; pointer-events: none;
-  top: calc(var(--reel-top, 132px) + 4px); bottom: calc(var(--reel-foot) + env(safe-area-inset-bottom) + 10px);
+  top: 14px; bottom: calc(var(--reel-foot) + env(safe-area-inset-bottom) + 10px);
   background:
     linear-gradient(var(--acc), var(--acc)) left top / 20px 2px no-repeat,
     linear-gradient(var(--acc), var(--acc)) left top / 2px 20px no-repeat,
@@ -709,7 +717,8 @@
     linear-gradient(var(--acc), var(--acc)) right bottom / 2px 20px no-repeat;
 }
 /* the words: the film's name and its roles, nothing else (owner, 2026-10-20: "only the Project name, and the Role names
-   are enough"), inside the viewfinder's lower corner */
+   are enough"), inside the viewfinder's lower corner. They are placed from their pane's own bottom edge (the link fills
+   the pane), the foot's height and 26 px up: a pane standing at the screen's bottom shows them clear of the foot */
 .rl-cap {
   position: absolute; left: 34px; right: 54px; z-index: 2; bottom: calc(var(--reel-foot) + env(safe-area-inset-bottom) + 26px);
   display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
@@ -768,18 +777,23 @@
 .rl-chap.is-on { color: var(--signal); }
 .rl-chap.is-on .rl-chap-name { text-decoration: none; }
 .rl-allbtn { margin-left: auto; padding: 9px 14px 8px; background: color-mix(in srgb, var(--void) 45%, transparent); }
-/* arrival: the first picture comes up through the gate, the foot rises; under CALM it all simply stands (and the strip
-   never rolls by itself: works/reel-view.ts) */
+/* arrival: the pictures on the screen (the first two panes) come up through the gate, the foot rises; under CALM it all
+   simply stands (and the strip never rolls by itself: works/reel-view.ts) */
 @keyframes rl-gate { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
 @keyframes rl-rise { from { transform: translateY(100%); } to { transform: none; } }
-.works-main.is-arriving .rl-strip:not([hidden]) .rl-frame:first-child .rl-pane { animation: rl-gate 0.42s steps(7) both; }
+.works-main.is-arriving .rl-strip:not([hidden]) .rl-frame:nth-child(-n+2) .rl-pane { animation: rl-gate 0.42s steps(7) both; }
 .works-main.is-arriving .rl-foot { animation: rl-rise 0.36s var(--ease-out) both; }
 .rvl-calm .works-main.is-arriving .rl-pane, .rvl-calm .works-main.is-arriving .rl-foot { animation: none; }
 .rvl-calm .rl-loop { transition: none; }
-/* a phone on its side: the same whole-screen pane; a vertical film stands whole in the middle, never cropped wide (the
-   owner's standing rule: vertical footage gets vertical treatment); the words keep to the left; the foot slims */
+/* a phone on its side: every pane is the whole screen (half of a sideways screen would be a band about 195 px high),
+   its marks under the header and its dark as they were; a vertical film stands whole in the middle, never cropped wide
+   (the owner's standing rule: vertical footage gets vertical treatment); the words keep to the left; the foot slims.
+   The query is works/reel.ts's SIDE_QUERY: the view counts every pane one unit, the screen's height, on the same line */
 @media (max-height: 500px) {
   .works-main.is-reel { --reel-foot: 46px; }
+  .rl-frame { height: 100%; }
+  .rl-marks { top: calc(var(--reel-top, 132px) + 4px); }
+  .rl-pane::after { height: 48%; }
   .rl-pane.is-vertical .rl-poster, .rl-pane.is-vertical .rl-loop { object-fit: contain; }
   .rl-cap { right: auto; width: 56%; bottom: calc(var(--reel-foot) + env(safe-area-inset-bottom) + 22px); gap: 6px; }
   .rl-chap { min-height: 40px; padding: 2px 8px; }
````

- [ ] **Step 5: The comments that said "a pane is the whole screen".** Apply these two patches.

`src/works/reel.ts`:

````diff
--- a/src/works/reel.ts
+++ b/src/works/reel.ts
@@ -2,10 +2,12 @@
  *  Phone, its completely overwhelming and disorienting … I want a complete redesign of the interface of the Work
  *  section, still keeping the fundamental art direction, but changing the UI/UX specifically for Phones").
  *
- *  On a phone the section is a rolling strip of films, endless: each pane is the whole screen, its loop covering it,
- *  and on it only the film's name and its roles (owner, the same day, with two screenshots of antiantiart.com on a
- *  phone: "I would prefer the sizing of all panes on Phone in the work section to be like this website" — "only the
- *  Project name, and the Role names are enough"). It rolls on its own from arrival, and a finger takes it ("The moment
+ *  On a phone the section is a rolling strip of films, endless: each pane has its loop covering it, and on it only the
+ *  film's name and its roles (owner, the same day, with two screenshots of antiantiart.com on a phone: "I would prefer
+ *  the sizing of all panes on Phone in the work section to be like this website" — "only the Project name, and the Role
+ *  names are enough"). A pane was the whole screen then; it is half of it since 2026-11-24 (owner: "the panes are too
+ *  long in length and should be shorten. we should be able to see two panes on the phone screen at the same time
+ *  instead"), a vertical film's the whole of it. It rolls on its own from arrival, and a finger takes it ("The moment
  *  we enter the work section, we can see the already continously scrolling down to the next film in a continuous
  *  strips. And we can slide our finger up and down to scroll through the strip"). Pure: which screens get it, the
  *  strip's arithmetic, its words, the loops' rule; works/reel-view.ts builds it. */
````

`tests/reel.test.ts`:

````diff
--- a/tests/reel.test.ts
+++ b/tests/reel.test.ts
@@ -10,8 +10,8 @@
 
 // WORK ON A PHONE (owner, 2026-10-20: "on Phone, its completely overwhelming and disorienting … a complete redesign of
 // the interface of the Work section, still keeping the fundamental art direction, but changing the UI/UX specifically
-// for Phones"): the reel, one film to a screen — a pane the size of the screen, as antiantiart.com's on a phone, with
-// only the film's name and its roles on it.
+// for Phones"): the reel, a rolling strip of panes with only the film's name and its roles on each. A pane was the size
+// of the screen, as antiantiart.com's on a phone; since 2026-11-24 it is half of it, and two show at once.
 const films = parseProjects(parseJson(readFileSync('public/content/projects.json', 'utf8'), 'projects.json'));
 
 describe('which screens get the reel', () => {
````

- [ ] **Step 6: The owner's guide.** A change that alters what the owner does updates `HOW-TO-EDIT.md` in the same
  commit. Apply this patch.

````diff
--- a/HOW-TO-EDIT.md
+++ b/HOW-TO-EDIT.md
@@ -47,7 +47,7 @@
 | accent | this film's color, hex | `"#C8FF00"` |
 | tileSize | `"normal"` or `"large"` (large = FEATURED: the centre cluster and the featured dress — every landscape pane is the same size; a vertical film's stands two rows tall) | `"large"` |
 | aspect | `"16:9"` (default), `"4:3"`, `"2.39:1"` or `"9:16"` (vertical footage) — the floor pane AND the whole dossier (hero + stills) present in this ratio; the carpet packs neighbors tight around any width. A `"9:16"` film gets the tall vertical pane (two pane rows high, its name up a spine on the left edge; featured, it stands in the right-hand column of the centre cluster), a vertical hero and a wall of portrait stills | `"4:3"` |
-| focus | where the picture's subject sits, `"X% Y%"` — how far across, then how far down (`"0% 0%"` top-left, `"50% 50%"` the middle, the default). A phone shows each film on its tall screen and crops the picture around this point; set it when the subject sits off the middle | `"60% 50%"` |
+| focus | where the picture's subject sits, `"X% Y%"` — how far across, then how far down (`"0% 0%"` top-left, `"50% 50%"` the middle, the default). A phone shows each film in a pane half its screen high and crops the picture around this point; set it when the subject sits off the middle | `"60% 50%"` |
 | category | which works channel: `"human"` or `"machine"` (leave out = human) | `"machine"` |
 | synopsis | one short paragraph | |
 | credits | list of `{ "role": …, "name": … }` | |
@@ -206,16 +206,18 @@
   A film's `category` decides its channel. Give each channel a few
   `"large"` films so both floors get a featured centre cluster. Deep links:
   `works.html?ch=machine`.
-- **On a phone, WORK is a rolling strip** instead of the floor: one film to a
+- **On a phone, WORK is a rolling strip** instead of the floor: two films to a
   screen, in `projects.json` order, rolling up on its own from the moment the
-  page opens (one screen every 18 seconds) and round again, endlessly. A
-  finger drags it up and down and throws it, and it eases straight back into
-  its roll. A tap opens the film. Each film fills the whole screen with its loop (its poster
-  until the loop plays), and on it stand only its **title and its `role`** —
-  nothing else. The picture is cropped to the tall screen **around the film's
-  `focus`** (the middle unless you set one). A `"9:16"` film fills the screen
-  as it is; on a phone held sideways it stands whole in the middle. Nothing to
-  set up; a tablet and a computer keep the floor.
+  page opens (one screen's height every 18 seconds, so a film passes in 9) and
+  round again, endlessly. A finger drags it up and down and throws it, and it
+  eases straight back into its roll. A tap opens the film. Each film's pane is
+  half the screen, filled with its loop (its poster until the loop plays), and
+  on it stand only its **title and its `role`** — nothing else. The picture is
+  cropped to the pane **around the film's `focus`** (the middle unless you set
+  one). A `"9:16"` film gets a tall pane, two panes high: it fills the whole
+  screen as it is. On a phone held sideways every pane is the whole screen, and
+  a `"9:16"` film stands whole in the middle. Nothing to set up; a tablet and a
+  computer keep the floor.
 - **Loops on an iPhone in Low Power Mode:** iOS refuses to start videos by
   themselves there. The site then shows the same loop files as moving images,
   on the homepage and in WORK — nothing for you to make.
````

- [ ] **Step 7: Run every gate.**

Run: `npx vitest run tests/floor-ways.test.ts -t "a phone gets the reel"`
Expected: PASS. `Tests  14 passed` and the skipped rest.

Run: `npx vitest run tests/reel.test.ts`
Expected: PASS. `Tests  25 passed (25)`.

Run: `npm run check`
Expected: no error, exit 0.

Run: `npm test`
Expected: every test passes, except on this PC the two known local failures named in Global Constraints (the list's
city pin; the black-frame test on the owner's uncommitted loop, if it is still in the tree). Any other failure is this
work's: stop and fix it.

Run: `tail -c 120 src/styles/components.css`
Expected: the file still ends with `body { visibility: visible; }`.

- [ ] **Step 8: Do not commit yet.** Task 5 checks the page in a headless phone first. If Task 5 finds a fault, fix it
  here, run Step 7 again, then commit in Task 5, Step 6.

---

### Task 5: Verification in a headless phone

A throwaway script, kept outside the repository, opens the built site in a headless Chrome as a touch phone and runs
the checks of the design's Verification section. No window opens. It serves the built folder itself from loopback, so
no dev server runs.

**Files:**
- Create, outside the repository: `$SCRATCH/phone-check.mjs`. Never copy it into the repository.

**Interfaces:**
- Consumes the debug handle `window.rvlWorkReel`: `offset()`, `speed()`, `rolling()`, `inView()`, `chapter()`,
  `playing()`, `loops()`, `hold(px | null)` (all there before this work) and `sizes()` (Task 2), and `window.rvlBooted`.
- Consumes the page's own state: `.works-main.is-list`, `.rl-chap[data-ch]`, `.rl-allbtn`, `.view-toggle`,
  `sessionStorage` (the page remembers the view it was left in) and `localStorage['rvl-motion']` (`calm`).

- [ ] **Step 1: A build into the scratch folder.** The repository's `dist` can be locked on this PC, so the build
  goes to the scratch folder. Run from the repository's root:

```bash
npx vite build --outDir "$SCRATCH/site" --emptyOutDir
```

Expected: `✓ built in …`, and `$SCRATCH/site/works.html` exists. A warning about chunks larger than 500 kB is normal.
The build copies `public/` (about 90 MB). It holds no `content/media-manifest.json` (see "What the code holds", 6).
If `dist/content/` exists, the build's plugin also rewrites `dist/content/media-manifest.json` there; if that file is
locked and the build ends with an error from that write, the scratch folder is complete all the same.

- [ ] **Step 2: Write the script.** Write this file as `$SCRATCH/phone-check.mjs` with the Write tool. It needs
  Node 22 or newer (its own `WebSocket`) and a Chrome; `CHROME` names another browser's exe.

````js
// WORK on a phone, two panes on the screen: the checks of the design's Verification section, in a headless Chrome.
// No window: a throwaway profile, muted. A built folder is served from loopback by this script; a URL is opened as it is.
//   node phone-check.mjs <built folder | https://site>        CHROME=<chrome.exe> names another browser
// It prints PASS or FAIL a check, saves stills to ./shots beside this file, and exits 1 when a check failed.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const target = process.argv[2];
if (!target) { console.error('usage: node phone-check.mjs <built folder | https://site>'); process.exit(2); }
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ the built folder, on loopback -- */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.txt': 'text/plain',
};
async function serve(root) {
  const base = resolve(root);
  const server = createServer((req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(base, path));
      // (a build to a scratch folder holds no media-manifest.json: the site then asks for each film's preview.mp4)
      if (!file.startsWith(base + sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
      const body = readFileSync(file);
      const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : body.length - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
        res.end(body.subarray(start, end + 1));
        return;
      }
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': body.length }).end(body);
    } catch { res.writeHead(500).end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

/* ------------------------------------------------------------------------------ a headless Chrome -- */
async function launch() {
  const dir = mkdtempSync(join(tmpdir(), 'rvl-phone-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--user-data-dir=${dir}`, '--remote-debugging-port=0', '--window-size=500,1000', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--no-sandbox', // (an agent's own sandbox refuses Chrome's; the profile is thrown away and only this site is opened)
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  const portFile = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 300 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) { proc.kill(); throw new Error('Chrome did not start'); }
  const [port, path] = readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('no DevTools socket')); });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const p = m.id && pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    clearTimeout(p.timer);
    if (m.error) p.rej(new Error(`${p.method}: ${m.error.message}`)); else p.res(m.result);
  };
  const raw = (method, params = {}, sessionId, timeout = 60000) => new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => { pending.delete(i); rej(new Error(`${method}: no answer in ${timeout} ms`)); }, timeout);
    pending.set(i, { res, rej, timer, method });
    ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const { targetInfos } = await raw('Target.getTargets');
  const { sessionId } = await raw('Target.attachToTarget', { targetId: targetInfos.find((t) => t.type === 'page').targetId, flatten: true });
  const send = (m, p, t) => raw(m, p, sessionId, t);
  await send('Page.enable');
  await send('Runtime.enable');
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const close = async () => {
    try { await raw('Browser.close', {}, undefined, 5000); } catch { /* already gone */ }
    await sleep(800);
    try { proc.kill(); } catch { /* gone */ }
    for (let i = 0; i < 10; i++) { try { rmSync(dir, { recursive: true, force: true }); break; } catch { await sleep(500); } }
  };
  return { send, evaluate, close };
}

/* ------------------------------------------------------------------------------------ the checks -- */
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  [${typeof detail === 'string' ? detail : JSON.stringify(detail)}]`}`);
};
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;

// what stands in the strip now: every pane's box, its words, its marks, its dark, its picture, its loop
const SNAP = `(() => {
  const strip = document.querySelector('.rl-strip:not([hidden])');
  const frames = [...strip.querySelectorAll('.rl-frame')].map((li) => {
    const r = li.getBoundingClientRect(), cap = li.querySelector('.rl-cap'), c = cap.getBoundingClientRect();
    const m = li.querySelector('.rl-marks').getBoundingClientRect(), img = li.querySelector('.rl-poster'), vid = li.querySelector('video.rl-loop');
    return {
      slug: li.dataset.slug, tall: li.classList.contains('is-tall'), top: r.top, height: r.height, width: r.width,
      capTop: c.top, capBottom: c.bottom, capOpacity: +getComputedStyle(cap).opacity, capFromTop: cap.offsetTop, capHeight: cap.offsetHeight,
      marksTop: m.top - r.top, marksBottom: r.bottom - m.bottom, dark: parseFloat(getComputedStyle(li.querySelector('.rl-pane'), '::after').height),
      fit: getComputedStyle(img).objectFit, shape: img.naturalHeight ? img.naturalWidth / img.naturalHeight : null,
      video: vid ? (vid.paused ? 'paused' : 'playing') : null,
    };
  });
  const ticks = [...document.querySelectorAll('.rl-tick')].map((t) => parseFloat(t.style.top));
  const bandTop = Math.max(...['.brand', '.nav-links', '.hud-tr'].map((s) => document.querySelector(s)?.getBoundingClientRect().bottom ?? 0));
  return { w: innerWidth, h: innerHeight, bandTop, footTop: document.querySelector('.rl-foot').getBoundingClientRect().top, frames, ticks };
})()`;
// the names that stand whole when their pane is the upper of the two: 20 px clear of the header (the words' fade)
const wholeUp = (at) => at.frames.filter((f) => f.capFromTop >= at.bandTop + 20).length;

const site = /^https?:/.test(target) ? { url: target.replace(/\/$/, ''), close() {} } : await serve(target);
const b = await launch();
const R = (expr) => b.evaluate(`window.rvlWorkReel.${expr}`);
const waitFor = async (expr, ms = 15000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) {
    try { if (await b.evaluate(`!!(${expr})`)) return true; } catch { /* the document is swapping */ }
  }
  return false;
};
const screen = async (kind, width, height) => {
  const touch = kind !== 'desktop';
  await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: touch ? 2 : 1, mobile: touch });
  await b.send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: 5 });
  await b.send('Emulation.setUserAgentOverride', { userAgent: kind === 'phone' ? PHONE_UA : '' });
};
const open = async (path, reel = true) => {
  await b.send('Page.navigate', { url: `${site.url}${path}${path.includes('?') ? '&' : '?'}cb=${Date.now().toString(36)}` });
  const ok = await waitFor(reel ? 'window.rvlBooted && window.rvlWorkReel' : 'window.rvlBooted', 60000);
  if (reel) await waitFor('document.fonts.status === "loaded"', 5000);
  await sleep(600);
  return ok;
};
const shot = async (name) => {
  const { data } = await b.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
};
const finger = async (type, x, y) => b.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const section = async (name, fn) => {
  console.log(`\n${name}`);
  try { await fn(); } catch (e) { check(`${name}: ran to its end`, false, String(e.message ?? e).slice(0, 300)); }
};

try {
  await section('390 x 844, chapter one: sizes, words, marks', async () => {
    await screen('phone', 390, 844);
    check('the page boots the reel', await open('/works.html'));
    const s = await R('sizes()');
    check('two heights: the screen 844, a unit 422, upright', s.view === 844 && s.unit === 422 && s.side === false, s);
    check('twelve panes of one unit', s.units.length === 12 && s.units.every((u) => u === 1), s.units);
    await R('hold(0)');
    await sleep(300);
    const at = await b.evaluate(SNAP);
    const [a, c] = at.frames;
    check('at rest two panes fill the screen', near(a.top, 0) && near(a.height, 422) && near(c.top, 422) && near(c.top + c.height, 844), [a.top, a.height, c.top, c.height]);
    check('both names stand whole at rest', a.capOpacity === 1 && c.capOpacity === 1, [a.capOpacity, c.capOpacity]);
    check("the lower pane's words stand clear of the foot", c.capBottom <= at.footTop, [c.capBottom, at.footTop]);
    const foot = at.h - at.footTop; // (the foot's height with the safe area)
    // (a pane's bottom edge is its 1 px hairline; the words and the marks are placed from inside it, as before)
    check("every pane's words end the foot's height and 26 px above its own bottom edge", at.frames.every((f) => near(f.height - f.capFromTop - f.capHeight, foot + 26 + 1, 0.5)), at.frames.map((f) => f.height - f.capFromTop - f.capHeight));
    check("the top marks stand 14 px inside the pane, the bottom ones the foot's height and 10 px above its bottom edge", at.frames.every((f) => near(f.marksTop, 14, 0.5) && near(f.marksBottom, foot + 10 + 1, 0.5)), [a.marksTop, a.marksBottom]);
    check('every name fits its half pane, under the top marks', at.frames.every((f) => f.capFromTop >= 14), at.frames.map((f) => f.capFromTop));
    check('every name stands whole in the upper pane too, clear of the header', wholeUp(at) === at.frames.length, [wholeUp(at), Math.round(at.bandTop), Math.min(...at.frames.map((f) => f.capFromTop))]);
    check("the dark covers every pane's words", at.frames.every((f) => f.dark >= f.height - f.capFromTop), at.frames.map((f) => [f.dark, f.height - f.capFromTop]));
    check('one tick a film, evenly down the rail', at.ticks.length === 12 && at.ticks.every((t, i) => near(t, ((i + 0.5) / 12) * 100, 0.01)), at.ticks);
    console.log(`      captions run ${Math.min(...at.frames.map((f) => f.capHeight))} to ${Math.max(...at.frames.map((f) => f.capHeight))} px high`);
    await shot('390x844-ch1-rest');
    await R('hold(211)');
    await sleep(300);
    const mid = await b.evaluate(SNAP);
    check('mid-roll, parts of three panes show', mid.frames.filter((f) => f.top + f.height > 0 && f.top < 844).length === 3);
    await shot('390x844-ch1-mid-roll');
    const longest = at.frames.reduce((best, f, i) => (f.capHeight > at.frames[best].capHeight ? i : best), 0);
    await R(`hold(${(longest - 1) * 422})`); // (the longest name in the lower pane, over the foot)
    await sleep(300);
    const lo = (await b.evaluate(SNAP)).frames[longest];
    check('the longest name stands whole in the lower pane', near(lo.top, 422) && lo.capOpacity === 1, [lo.slug, lo.top, lo.capOpacity]);
    await shot('390x844-ch1-longest-name');
  });

  await section('390 x 844: the pace, the loops', async () => {
    await open('/works.html');
    check('it rolls from arrival', await waitFor('window.rvlWorkReel.rolling()', 5000));
    const o0 = await R('offset()'), t0 = Date.now();
    await sleep(3000);
    const pace = ((await R('offset()')) - o0) / ((Date.now() - t0) / 1000);
    check('the pace is one screen\'s height every 18 s (46.9 px/s)', Math.abs(pace - 844 / 18) < 4, pace.toFixed(1));
    check('the roll\'s own speed says the same', near(await R('speed()'), 844 / 18, 0.01));
    let most = 0, least = 99, loaded = 0;
    for (let i = 0; i < 48; i++) { // (twelve seconds of the roll)
      await sleep(250);
      const n = (await R('playing()')).length;
      if (i >= 12) { most = Math.max(most, n); least = Math.min(least, n); }
      loaded = Math.max(loaded, await R('loops()'));
    }
    check('at the roll\'s pace three loops play at most', most <= 3 && least >= 1, { most, least });
    check('five loops are loaded at most', loaded <= 5, loaded);
    await R('hold(0)');
    await sleep(500);
    const f = (await b.evaluate(SNAP)).frames;
    check('the next pane to come in waits loaded and paused; the two on the screen play', f[0].video === 'playing' && f[1].video === 'playing' && f[2].video === 'paused', f.slice(0, 4).map((x) => x.video));
  });

  await section('390 x 844: the finger, the rail, CALM, a tap', async () => {
    await open('/works.html');
    await waitFor('window.rvlWorkReel.rolling()', 5000);
    const o0 = await R('offset()');
    await finger('touchStart', 195, 600);
    for (let y = 580; y >= 400; y -= 20) { await finger('touchMove', 195, y); await sleep(30); }
    await sleep(250); // (held still: it throws nothing)
    const dragged = (await R('offset()')) - o0;
    check('a drag moves the strip with the finger (200 px)', Math.abs(dragged - 200) <= 12 && !(await R('rolling()')), dragged.toFixed(1));
    await finger('touchEnd');
    check('a drag opens no film', (await b.evaluate('location.pathname')).endsWith('/works.html'));
    check('let go, it eases back into the roll', await waitFor('window.rvlWorkReel.rolling()', 5000));
    await finger('touchStart', 195, 700);
    for (let y = 620; y >= 300; y -= 80) await finger('touchMove', 195, y);
    await finger('touchEnd');
    const thrown = await R('speed()');
    check('a throw carries it faster than the roll', thrown > 3 * (844 / 18), thrown.toFixed(0));
    check('the throw eases straight back into the roll', (await waitFor('window.rvlWorkReel.rolling()', 6000)) && near(await R('speed()'), 844 / 18, 0.01));
    const rail = await b.evaluate('(() => { const r = document.querySelector(".rl-rail").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()');
    await finger('touchStart', rail.x, rail.y);
    const lap = 12 * 422, off = await R('offset()');
    const head = ((((off + 422) % lap) + lap) % lap) / lap; // (the lap's point under the screen's middle)
    await finger('touchEnd');
    check('a touch half-way down the rail brings the lap\'s middle to the screen\'s middle', Math.abs(head - 0.5) < 0.01, head.toFixed(3));
    await b.evaluate('document.documentElement.classList.add("rvl-calm")');
    await sleep(600);
    const c0 = await R('offset()');
    await sleep(1000);
    check('under CALM it never rolls by itself', !(await R('rolling()')) && near(await R('offset()'), c0, 0.5));
    await b.evaluate('document.documentElement.classList.remove("rvl-calm")');
    check('CALM off, it rolls again', await waitFor('window.rvlWorkReel.rolling()', 5000));
    await b.evaluate('localStorage.setItem("rvl-motion", "calm")');
    await open('/works.html');
    const calm = await b.evaluate(SNAP);
    check('arriving under CALM it stands at its first two films, both names whole', !(await R('rolling()')) && (await R('offset()')) === 0 && calm.frames[0].capOpacity === 1 && calm.frames[1].capOpacity === 1);
    await shot('390x844-ch1-calm');
    await b.evaluate('localStorage.removeItem("rvl-motion")');
    await open('/works.html');
    const under = await b.evaluate('document.elementFromPoint(195, 250).closest(".rl-frame").dataset.slug');
    await finger('touchStart', 195, 250);
    await finger('touchEnd');
    check('a tap opens the film under it', await waitFor(`location.pathname.endsWith('/project.html') && location.search.includes('p=${under}')`, 8000), under);
  });

  await section('390 x 844: the channel change, the vertical film, the LIST and back, a turn of the phone', async () => {
    await open('/works.html');
    await b.evaluate('document.querySelector(\'.rl-chap[data-ch="machine"]\').click()');
    check('the other chapter comes up', await waitFor('window.rvlWorkReel.chapter() === "machine"', 8000));
    await sleep(800);
    const s = await R('sizes()');
    check('chapter two: four unit panes and the vertical film, two units', JSON.stringify(s.units) === '[1,1,1,1,2]', s.units);
    check('it rolls from its first film', (await R('rolling()')) && (await R('offset()')) < 200);
    await R(`hold(${4 * 422})`);
    await sleep(600);
    const at = await b.evaluate(SNAP), tall = at.frames.find((f) => f.tall);
    check('the vertical film stands tall: the whole screen, never a wide shape', !!tall && near(tall.top, 0) && near(tall.height, 844) && tall.width === 390 && tall.fit === 'cover' && tall.shape < 1, tall && [tall.slug, tall.top, tall.height, tall.fit, tall.shape]);
    check("its tick stands at its stretch's middle, twice as long", at.ticks.length === 5 && [0.5 / 6, 1.5 / 6, 2.5 / 6, 3.5 / 6, 5 / 6].every((t, i) => near(at.ticks[i], t * 100, 0.01)), at.ticks);
    check('it is the film in view', (await R('inView()')) === tall?.slug, await R('inView()'));
    await shot('390x844-ch2-vertical-film');
    await screen('phone', 844, 390); // (a turn of the phone)
    await sleep(700);
    const turned = await R('sizes()'), side = (await b.evaluate(SNAP)).frames.find((f) => f.tall);
    check('turned on its side, every pane is the screen and the same film stands in it', turned.side === true && turned.unit === 390 && turned.view === 390 && turned.units.every((u) => u === 1) && near(side.top, 0) && near(side.height, 390) && (await R('inView()')) === side.slug, [turned, side.top, side.height]);
    check('on its side the vertical film stands whole in the middle', side.fit === 'contain', side.fit);
    await shot('844x390-ch2-vertical-film');
    await screen('phone', 390, 844);
    await sleep(700);
    const back = await R('sizes()');
    check('turned back, it keeps its place', back.side === false && back.unit === 422 && (await R('inView()')) === side.slug, back);
    await R('hold(null)');
    await b.evaluate('document.querySelector(".rl-allbtn").click()');
    check('LIST: the list stands, the strip stops', (await waitFor('document.querySelector(".works-main").classList.contains("is-list")', 5000)) && !(await R('rolling()')));
    await b.evaluate('document.querySelector(".view-toggle").click()');
    check('and back: the strip rolls again, its heights as they were', (await waitFor('!document.querySelector(".works-main").classList.contains("is-list") && window.rvlWorkReel.rolling()', 6000)) && (await R('sizes()')).unit === 422);
    await open('/works.html?view=list');
    check('opened under the LIST, the strip measures from the window', (await R('sizes()')).view === 844, await R('sizes()'));
    await b.evaluate('document.querySelector(".view-toggle").click()'); // (back to the strip: the visit remembers the view it was left in)
    check('and from there the strip comes up and rolls', await waitFor('!document.querySelector(".works-main").classList.contains("is-list") && window.rvlWorkReel.rolling()', 6000));
  });

  for (const [w, h] of [[360, 640], [375, 667], [412, 915]]) await section(`${w} x ${h}: two panes fill the screen`, async () => {
    await screen('phone', w, h);
    await open('/works.html');
    const s = await R('sizes()');
    check('a unit is half the screen', s.view === h && s.unit === h / 2 && s.side === false, s);
    await R('hold(0)');
    await sleep(300);
    const at = await b.evaluate(SNAP), [a, c] = at.frames;
    check('two panes fill the screen', near(a.top, 0) && near(a.height, h / 2) && near(c.top + c.height, h), [a.top, a.height, c.top, c.height]);
    check("the lower pane's words stand clear of the foot", c.capBottom <= at.footTop && c.capOpacity === 1, [c.capBottom, at.footTop, c.capOpacity]);
    check("the dark covers every pane's words", at.frames.every((f) => f.dark >= f.height - f.capFromTop), at.frames.map((f) => [f.dark, f.height - f.capFromTop]));
    // (the design promises whole names at rest on a 390 x 844 phone; on a shorter one the upper pane's may lie under the header)
    console.log(`NOTE  ${w} x ${h}: ${wholeUp(at)} of ${at.frames.length} names stand whole in the upper pane (the header ends at ${Math.round(at.bandTop)} px, a pane is ${h / 2} px; at rest the upper name shows ${a.capOpacity}, the lower ${c.capOpacity}; captions run ${Math.min(...at.frames.map((f) => f.capHeight))} to ${Math.max(...at.frames.map((f) => f.capHeight))} px)`);
    await shot(`${w}x${h}-ch1-rest`);
  });

  await section('844 x 390, on its side: one pane a screen', async () => {
    await screen('phone', 844, 390);
    await open('/works.html?ch=machine');
    const s = await R('sizes()');
    check('a unit is the screen, every pane one unit', s.side === true && s.view === 390 && s.unit === 390 && s.units.every((u) => u === 1), s);
    await R('hold(0)');
    await sleep(300);
    const at = await b.evaluate(SNAP);
    check('one pane a screen', near(at.frames[0].top, 0) && near(at.frames[0].height, 390) && near(at.frames[1].top, 390));
    await shot('844x390-ch2-rest');
    await R(`hold(${4 * 390})`);
    await sleep(600);
    const tall = (await b.evaluate(SNAP)).frames.find((f) => f.tall);
    check('the vertical film stands whole in the middle of its screen', near(tall.top, 0) && near(tall.height, 390) && tall.fit === 'contain', [tall.top, tall.height, tall.fit]);
    await shot('844x390-ch2-vertical-film-arrived');
  });

  await section('a tablet and a desktop keep the floor', async () => {
    await screen('tablet', 820, 1180);
    await open('/works.html', false);
    await sleep(1500);
    check('a tablet: no reel', await b.evaluate('!document.querySelector(".reel") && !document.querySelector(".works-main").classList.contains("is-reel") && window.rvlWorkReel === undefined'));
    await screen('desktop', 1440, 900);
    await open('/works.html', false);
    await sleep(1500);
    check('a desktop: no reel', await b.evaluate('!document.querySelector(".reel") && !document.querySelector(".works-main").classList.contains("is-reel") && window.rvlWorkReel === undefined'));
  });
} finally {
  await b.close();
  site.close();
}
console.log(`\n${failed === 0 ? 'ALL CHECKS PASS' : `${failed} CHECK(S) FAILED`}; stills in ${SHOTS}`);
process.exit(failed === 0 ? 0 : 1);
````

- [ ] **Step 3: Run it.** An agent's own sandbox may refuse to start Chrome: run this one command outside it.

```bash
node "$SCRATCH/phone-check.mjs" "$SCRATCH/site"
```

Expected, in about three minutes: exit 0, the last line `ALL CHECKS PASS; stills in …`, 60 lines that begin with
`PASS`, none with `FAIL`, and three lines that begin with `NOTE`. The sections it prints:

```text
390 x 844, chapter one: sizes, words, marks
390 x 844: the pace, the loops
390 x 844: the finger, the rail, CALM, a tap
390 x 844: the channel change, the vertical film, the LIST and back, a turn of the phone
360 x 640: two panes fill the screen
375 x 667: two panes fill the screen
412 x 915: two panes fill the screen
844 x 390, on its side: one pane a screen
a tablet and a desktop keep the floor
```

On a scratch build of this plan's code the three notes read (the counts depend on the films' names):

```text
NOTE  360 x 640: 2 of 12 names stand whole in the upper pane (the header ends at 124 px, a pane is 320 px; …)
NOTE  375 x 667: 5 of 12 names stand whole in the upper pane (the header ends at 124 px, a pane is 333.5 px; …)
NOTE  412 x 915: 12 of 12 names stand whole in the upper pane (the header ends at 124 px, a pane is 457.5 px; …)
```

Copy the three `NOTE` lines, whole, into the closing report (Task 6, design call 12).

- [ ] **Step 4: Look at the stills.** Read each PNG in `$SCRATCH/shots` and confirm by eye:

| Still | What it must show |
|---|---|
| `390x844-ch1-rest.png` | Two panes fill the screen. Both names whole and readable on their dark; the lower name clear of the foot. |
| `390x844-ch1-mid-roll.png` | Parts of three panes, the hairline of field blue between them, no gap. |
| `390x844-ch1-longest-name.png` | The longest name of chapter one whole in the lower pane, above the foot. |
| `390x844-ch1-calm.png` | As at rest; nothing mid-wipe. |
| `390x844-ch2-vertical-film.png` | The vertical film fills the whole screen, upright, never a wide crop. |
| `844x390-ch2-vertical-film.png`, `844x390-ch2-vertical-film-arrived.png` | The vertical film whole in the middle of the sideways screen. |
| `844x390-ch2-rest.png` | One pane the whole sideways screen, its words on the left. |
| `360x640-ch1-rest.png`, `375x667-ch1-rest.png`, `412x915-ch1-rest.png` | Two panes fill the screen; the lower name clear of the foot. On the two short screens the upper name may be faded under the header: that is the `NOTE`, not a fault of the build. |

- [ ] **Step 5: If a check fails.** Use superpowers:systematic-debugging. Find the cause in the source, fix it in the
  file Task 2, 3 or 4 changed, run Task 4, Step 7 again, build again, run the script again. Never loosen a check to make
  it pass, and never change the script's numbers to match a wrong page. The loops' counts need the videos to start:
  `--autoplay-policy=no-user-gesture-required` is already among the script's flags.

- [ ] **Step 6: Commit the flip.** Check `git diff -- tests/floor-ways.test.ts` first. Message file:

```text
feat(works): two panes on a phone's screen - a pane is half of it, a vertical film's the whole (owner)

The owner, on the phone's rolling strip: "This is for mobile's WORK section: RIght now, the panes are too long in
length and should be shorten. we should be able to see two panes on the phone screen at the same time instead."
Their choices of 2026-11-24, from mock-ups: half the screen; the vertical film a tall pane, two panes high; the same
motion as today; the next pane starting as it enters.

The design: docs/superpowers/specs/2026-11-24-work-phone-two-panes-design.md. The plan's fourth step.
- works/reel-view.ts: a unit is half the screen upright, the whole of it on a phone held on its side (the styles'
  own line, SIDE_QUERY). A vertical film's pane wears is-tall. Three posters load at once.
- styles/components.css, the reel's block: a frame is 50% high, a tall one 100%. The marks stand 14 px inside their
  pane's top. The dark reaches over the words' whole span. The arrival wipe covers both panes on the screen. The
  sideways block keeps the whole-screen pane.
- The words keep their rule: they already hung from their pane's bottom edge.
- HOW-TO-EDIT.md: the phone strip's paragraph and the focus row.
- The roll keeps its pixels a second: one screen's height every 18 seconds, so a pane passes in 9.

Verified: npm run check; npm test; a build; a headless touch phone at 390 x 844, 360 x 640, 375 x 667, 412 x 915
and 844 x 390 (sizes, both names whole at rest, the vertical film tall, the pace, a drag, a throw, the rail, CALM, a
tap, the channel change, the LIST and back, a turn of the phone, three loops playing at most), and a tablet and a
desktop keeping the floor.

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
```

```bash
git add -- src/works/reel.ts src/works/reel-view.ts src/styles/components.css tests/reel.test.ts tests/floor-ways.test.ts HOW-TO-EDIT.md
git commit -F "$SCRATCH/msg.txt" -- src/works/reel.ts src/works/reel-view.ts src/styles/components.css tests/reel.test.ts tests/floor-ways.test.ts HOW-TO-EDIT.md
git show --stat HEAD
git status --short
```

Expected: six files in the commit. `git status --short` shows nothing of this work left over, and still shows the
owner's own uncommitted media if it was there before.

---

### Task 6: The local rule, the design calls, shipping

- [ ] **Step 1: The local rule (the coordinator, in the main checkout).** The local `CLAUDE.md` is excluded from git
  and does not exist in a worktree. The coordinator adds this bullet under `## The owner's standing rules`, after the
  bullet **The floor's loops**. Never stage or commit that file.

```markdown
- **WORK on a phone:** a pane of the rolling strip is half the screen, so two show at once, and a vertical film's pane
  is the whole screen. On a phone held on its side every pane is the screen (owner, 2026-11-24). `src/works/reel.ts`
  measures the strip in these units; the styles' sideways block and `SIDE_QUERY` ask the same line.
```

- [ ] **Step 2: The design calls, in the closing report.** List these for the owner's feedback. Calls 1 to 7 are the
  design's own; 8 to 14 were made while planning and building.

  1. The words keep today's distance from the pane's bottom edge. In the mock-ups they stood 58 px lower; at that place
     the lower pane's name lay under the foot whenever the strip stood still.
  2. The next pane starts as it enters, so three loops decode at most (approved; the other way was four).
  3. The rail's playhead marks the film at the screen's middle. At rest it stands between the first two films' ticks.
  4. A keyboard's focus brings its pane to the screen's middle.
  5. The arrival wipe covers both panes on the screen.
  6. A phone held on its side keeps one pane a screen.
  7. A chapter of one or two films is laid again until the strip is long enough: upright, three units, four with a
     vertical film; never fewer than three panes.
  8. The dark under the words reaches the foot's height and 226 px up a half pane (288 px of 422 on a 390 × 844
     phone). The design gave no number.
  9. The vertical film's tall pane covers the upright screen as before: on a 390 × 844 screen a 9:16 picture loses
     about 9% at each side. "Uncropped" was read as "never cropped to a wide shape".
  10. The top corner marks stand 14 px inside every pane's top (the design's number). So the top marks of whichever
      pane stands at the screen's top lie under the header: the upper pane's at rest, and the tall pane's when it stands
      square. Before, a pane's top marks stood 4 px under the header's end.
  11. A resting pane's video loads ahead only while the strip shows and the loops are videos. Under the LIST nothing
      loads; in iOS Low Power Mode, where loops are images, a pane's loop still starts when it enters.
  12. On a short phone the upper pane's name lies partly under the header when the strip stands still (the three
      `NOTE` lines of Task 5). The design promised whole names at rest on a 390 × 844 phone, and that holds.
  13. On a phone held on its side the next pane no longer plays before it shows either: the loops' rule is one rule.
  14. Three posters load at once (two before): the two on the screen and the next to come in.

- [ ] **Step 3: Shipping. Push only when the coordinator says so: a push to `master` publishes the site.** Until then
  the four commits wait on `master`, unpushed. Before the push, on the commit to be pushed:

```bash
npm run check
npm test
npx vite build --outDir "$SCRATCH/site" --emptyOutDir
```

Expected: as in Task 4, Step 7, and `✓ built in …`. Then, on the coordinator's word:

```bash
git push origin master
gh run watch
```

Expected: the deploy run ends green. About a minute later the live site serves the new strip.

- [ ] **Step 4: The same checks on the live site.** The script opens a URL as it is, with its own cache-buster:

```bash
node "$SCRATCH/phone-check.mjs" https://rev4chol.github.io
```

Expected: `ALL CHECKS PASS`, as in Task 5, Step 3. The pace check allows 4 px/s either way; a slow line may need a
second run before the loops' checks pass.

- [ ] **Step 5: Tick this plan.** Tick every box above, then commit the plan alone:

```bash
git add -- docs/superpowers/plans/2026-11-24-work-phone-two-panes.md
git commit -m "docs(plan): WORK on a phone, two panes on the screen - ticked; shipped in <the flip's short sha>, verified live" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/superpowers/plans/2026-11-24-work-phone-two-panes.md
```

Write the flip commit's real short sha in the subject (`git log --oneline -5` shows it). Push it with the
coordinator's word, as before.

- [ ] **Step 6: Clean up.** Delete the scratch folder (`$SCRATCH`): the build, the script, the stills, the message
  file. Nothing of it belongs in the repository.

---

## Coverage and checks

**The design's sections, and where each is built:**

| The design | Here |
|---|---|
| 1. Sizes: half the screen; the vertical film two panes high; sideways the whole screen; no gap | Task 4 (styles, `is-tall`, `side`); Task 1 (`paneUnits`, `screenUnits`); Task 5 checks every size |
| 2. A pane's place, the lap | Task 1 (`places`, `lapUnits`) |
| 2. Endless; a short chapter laid again | Task 2 (`paneTop`, `stripOrder`; the test `is endless …` on chapters of 1, 2, 5 with a tall pane and 12, upright and on its side) |
| 2. A pane's lap on the compositor | Task 2 (`lapProgress`, `offsetFromLap`, `paneKeyframes`, `capKeyframes`) |
| 2. The pace | Task 1 (`rollPace`, `lapSeconds`); Task 2 (the view's `rollSpeed`, `lapMs`, `headMs`); Task 5 measures it |
| 2. The rail | Task 1 (`railTicks`); Task 2 (`railProgress`, `offsetForRail`, the rail after the measure) |
| 2. The film in view | Task 2 (`paneInView`) |
| 2. A keyboard's focus | Task 1 (`offsetForPane`); Task 2 (the view's `focusin`) |
| 3. Words and marks; the fade; the dark | Task 4 (styles); Task 2 (the fade's test on a half pane's lap); Task 5 measures the distances and the dark |
| 4. Loops | Task 3 |
| 5. The arrival wipe | Task 4 |
| 5. Unchanged behaviour | Task 5 checks a tap, a drag, a throw, CALM, the channel change, the LIST, a tablet, a desktop |
| Error handling: no height under the LIST | Task 2 (`view = strip.ol.clientHeight \|\| window.innerHeight`, pinned); Task 5 opens `?view=list` |
| Error handling: a turn of the phone | Task 1 (`stripPlace`, `offsetForPlace`); Task 2 (`remeasure`, the rail repainted); Task 5 turns the phone and back |
| Error handling: a loop that fails keeps its poster | Unchanged code; Task 3 keeps the fallback's chain and only stops it playing a resting pane's video |
| Tests: `reel.test.ts`, every bullet | Tasks 1, 2 and 3 |
| Tests: `floor-ways.test.ts` pins | Tasks 2, 3 and 4, inside the reel's describe only |
| Verification, every bullet | Task 5; "the same on the live site" Task 6, Step 4 |
| The local `CLAUDE.md` rule | Task 6, Step 1 |
| Design calls 1 to 7 | Task 6, Step 2 |

**Not in the design, added because the work needs it:** `HOW-TO-EDIT.md` (the repository's rule: a change that alters
what the owner sees in their guide updates it in the same commit); 375 × 667 among the checked sizes; `sizes()` on the
debug handle.

**Names and types, checked across tasks:** `units`, `unit`, `view`, `total`, `place`, `u` mean the same in every
signature. The view's `strip.at`, `strip.units`, `strip.total`, `strip.chapter` are set in `measure()` (Task 2) before
any rule reads them: `show()` and `remeasure()` both call it before `paintRail()`, `fit()` and `build()`. `panePlay`'s
fourth argument is a direction in Task 2 and the unit's height from Task 3 on; both call sites change in Task 3. The
script reads only handle fields that exist: `sizes()` comes with Task 2, the rest were there.

**Every state was run.** The patches above were applied in order to a scratch copy of the sources, outside the
repository. After each task the type gate and both test files gave the results quoted in that task, failing first and
passing after. The whole suite, run in that copy at the starting state and at the last, fails the same tests before
and after (none of them the strip's), and nine more pass. A scratch build of the last state passed all 60 checks of the
script, headless. The patches that start from untouched files also pass `git apply --check --ignore-whitespace` in the
real checkout.
