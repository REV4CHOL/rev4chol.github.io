# The fourth batch — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** REMNANTS OF A DREAM fills CH·01's held place (featured) and MISSION: IMPASSIBLE takes COPPER LULLABY's pane, both linked, with their media. JAECOO J5 takes its new title, cut and runtime.

**Architecture:** Content only: a text-span splice of `public/content/projects.json` (json 15, 25, 27) and two new media folders built by the house recipes. COPPER LULLABY's folder is removed. No code changes.

**Tech Stack:** ffmpeg/ffprobe, node (the splice and its proofs), vitest, headless Chrome over CDP.

**Spec:** `docs/superpowers/specs/2026-09-27-fourth-batch-design.md`

## Global Constraints

- The owner's text verbatim: titles `Remnants of a Dream`, `Mission: Impassible`, `JAECOO J5: Every Road Leads Home`; the synopses exactly as typed.
- Runtimes `m:ss`: `24:16`, `1:36`, and JAECOO `2:46`. Tags are lowercase, one per genre.
- Slots: REMNANTS json 25 (`large`), MISSION json 27 (`normal`), JAECOO json 15. Every other entry byte-identical.
- Accents: REMNANTS `#ED6B85`, MISSION `#F5AE4A`.
- Loops: `-map 0:v:0 -an -dn -sn -map_metadata -1 -write_tmcd 0 -c:v libx264 -preset slow -crf N -profile:v high -pix_fmt yuv420p -movflags +faststart`.
- Stills: `01.jpg`… in Resolve label order (A.B.C numeric), q 5.
- MISSION skips the repeats: labels 1.5.1, 1.19.1, 1.24.1, 1.26.1 and 2.2.1.
- `about-old.*` is never touched. Commit with `git -c core.safecrlf=false commit`.

---

### Task 1: Tests first (red)

**Files:**
- Modify: `tests/content-files.test.ts` (a BATCH4 list, a JAECOO test, the CH·01 history test, cells, counts)
- Modify: `tests/legend.test.ts` (22 placeholders, 17 films)

- [x] **Step 1:** Add `BATCH4`, run through `checkFilm`:
  - `remnants-of-a-dream`: slot 25, 40 stills, 16:9, large;
  - `mission-impassible`: slot 27, 19 stills, 2.39:1, normal.
- [x] **Step 2:** Add the JAECOO test: the new title, film and runtime, and every other field equal to today's.
- [x] **Step 3:** Restate the CH·01 history test:
  - no held place left, 12 and 25 filled;
  - `copper-lullaby` in the removed list;
  - FAR EAST 9 and SODA COAST 16 as before.
- [x] **Step 4:** Update the cells (`remnants-of-a-dream` [3, 2], `mission-impassible` [4, 2]) and the counts (CH·01 19 films, 6 featured; floor 20, 6 large).
- [x] **Step 5:** Update `legend.test.ts` to 22 placeholders and 17 films.
- [x] **Step 6:** Run `npx vitest run tests/content-files.test.ts tests/legend.test.ts`. Expected: FAIL (no new entries, no folders).

### Task 2: Media

**Files:**
- Create: `public/content/projects/remnants-of-a-dream/{preview.mp4, poster.jpg, stills/01–40.jpg}`
- Create: `public/content/projects/mission-impassible/{preview.mp4, poster.jpg, stills/01–19.jpg}`
- Delete: `public/content/projects/copper-lullaby/`

- [x] **Step 1:** Encode each loop at CRF 23 in scratch. If one runs over ~3.5 MB, trial 25 and 27, and compare 1:1 crops against the source.
- [x] **Step 2:** Posters: each loop's first frame. MISSION's takes the loop's crop.
- [x] **Step 3:** Stills:
  - REMNANTS: `scale=1600:900:flags=lanczos`;
  - MISSION: `format=rgb24,crop=3840:1606:0:277,scale=1600:670:flags=lanczos`, skipping the five repeats.
- [x] **Step 4:** Check:
  - dimensions, counts and edge rows;
  - that each loop is video-only (no data or tmcd track);
  - that the first still of each set matches its source.
- [x] **Step 5:** `rm -rf public/content/projects/copper-lullaby`, in a call of its own.

### Task 3: The splice (green)

**Files:**
- Modify: `public/content/projects.json` (json 15, 25, 27)

- [x] **Step 1:** Write `scratchpad/films5/splice.mjs` by the third batch's method:
  - text spans, and the expected slugs at 15, 25 and 27 asserted first;
  - JAECOO's three fields replaced inside its span;
  - two new blocks.
- [x] **Step 2:** Proofs:
  - exactly 15, 25 and 27 changed;
  - every other span byte-identical and deep-equal;
  - JAECOO equal to its old entry except the three fields;
  - 40 entries, no CR.
- [x] **Step 3:** Run `npx vitest run tests/content-files.test.ts tests/legend.test.ts`. Expected: PASS.

### Task 4: Gates

- [x] **Step 1:** Run `npx tsc --noEmit`. Expected: no output.
- [x] **Step 2:** Run `npx vitest run`. Expected: all pass (3 skipped).
- [x] **Step 3:** Run `npx vite build`. Expected: success.

### Task 5: Real Chrome, dev (`scratchpad/ux/verify-batch4.mjs`, BASE=http://localhost:5199)

- [x] **Step 1:** CH·01:
  - the grid read back from `rvlWorld`;
  - `blanks` 0 and `gaps` 1;
  - the HUD count;
  - REMNANTS' tile large, with its video frames;
  - MISSION's `cw` 538.
- [x] **Step 2:** Hover REMNANTS and MISSION. The caption shows each title and meta in its accent.
- [x] **Step 3:** Dossiers:
  - REMNANTS, MISSION and JAECOO: headline on one line (scrollWidth ≤ clientWidth), stamp P·NN/39, stills count and order, WATCH src;
  - JAECOO's RUNTIME reads 2:46;
  - `?p=copper-lullaby` reads SIGNAL LOST.
- [x] **Step 4:** Flip to CH·02 and back. The console shows no errors (the `hover.mp4` probes are the only 404s).
- [x] **Step 5:** Screenshot CH·01 whole and each dossier head.

### Task 5b: The stuck hover (found in Task 5)

**Files:**
- Create: `src/works/hover.ts` (`paneToWake(hit, onFloor, awake, dragging)`)
- Modify: `src/works/world.ts` (a stage `globalpointermove` handler and a canvas `pointerleave` replace the tiles' `pointerover`/`pointerout`)
- Test: `tests/wayfinding.test.ts`

- [x] **Step 1:** Reproduce in real Chrome (`scratchpad/ux/stuck-hover.mjs`, `stuck-trace.mjs`), and read the cause in Pixi's `EventBoundary.mapPointerMove` and `EventTicker`.
- [x] **Step 2:** Write the rule's tests, the pins, and a guard against `tile.on('pointerover'` and `tile.on('pointerout'`. Run them: FAIL (no module).
- [x] **Step 3:** Add `src/works/hover.ts` and rewire `world.ts`. Run them: PASS.
- [x] **Step 4:** Run `scratchpad/ux/hover-regress.mjs` on dev. The stuck sequences sleep; tabs, drag and sweep behave.

### Task 6: Ship

- [x] **Step 1:** Stage explicitly, in two commits: (1) the batch: projects.json, the two new folders, the removed folder, the content tests, the spec and the plan; (2) the hover fix: hover.ts, world.ts, wayfinding.test.ts.
- [x] **Step 2:** `git -c core.safecrlf=false commit`, then `git push -q origin master`.
- [x] **Step 3:** `gh run watch --exit-status`.
- [x] **Step 4:** Run the Task 5 script with BASE=https://rev4chol.github.io (after the Pages cache settles).

### Task 7: Close

- [x] **Step 1:** Memory: the bullet and the description line.
- [x] **Step 2:** Report to the owner, flagging the design calls:
  - "the empty blank space" read as the held place;
  - JAECOO's runtime set to 2:46;
  - MISSION's five repeated stills left out;
  - the two accents.
