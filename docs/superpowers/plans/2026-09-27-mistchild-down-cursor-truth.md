# MISTCHILD back down + the cursor's label tells the truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move MISTCHILD back to CH·01's bottom-right corner in NEON LITURGY's place, leave its top-right corner as open floor, and stop the cursor's label from lying: no chrome label stuck over the floor, and no pane waking under a tab.

**Architecture:**
- A new floor entry, `{ "gap": true }`, keeps a slot in the layout's fill order and draws nothing.
- The move itself is a two-span text splice of `projects.json`.
- The cursor module records who wrote the label on show, and a pane hovers only when the floor's canvas is under the pointer.

**Tech Stack:** Vite 7, TypeScript strict, PixiJS 8.20.1, Vitest; real Chrome over CDP for verification.

Spec: `docs/superpowers/specs/2026-09-27-mistchild-down-cursor-truth-design.md`.

## Global Constraints

- Line endings: the index stores LF (`core.autocrlf=true`); working copies vary. Commit with `git -c core.safecrlf=false commit`.
- Every entry but json 18 and 32 stays byte-identical, and so does CH·02.
- Never touch `about-old.*`.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Gates: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: The open gap in the parser

**Files:**
- Modify: `src/lib/content.ts` (`FloorBlank`, `BLANK_KEY`, `parseBlank`, `parseFloor`)
- Test: `tests/content.test.ts`

**Produces:** `FloorBlank.gap: boolean`; gap keys `gap-<json index>`.

- [x] **Step 1: Write the failing tests.** In the held-places describe:
  - `parseFloor([validProject(), { gap: true, category: 'human' }])[1]` toEqual `{ blank: true, gap: true, slug: 'gap-1', category: 'human', tileSize: 'normal', position: null }`;
  - a held place toEqual now carries `gap: false`;
  - `parseProjects` skips gaps;
  - a film with slug `gap-7` is refused as reserved;
  - a gap's bad category is refused.
- [x] **Step 2: Run** `npx vitest run tests/content.test.ts`. Expect FAIL: the gap entry is read as a film and refused for missing fields.
- [x] **Step 3: Implement:**
  - `r.blank === true || r.gap === true` → `parseBlank`;
  - `gap = r.gap === true`;
  - `slug: \`${gap ? 'gap' : 'blank'}-${i}\``;
  - `BLANK_KEY = /^(blank|gap)-\d+$/`.
- [x] **Step 4: Run.** Expect PASS.

### Task 2: The move in the data

**Files:**
- Modify: `public/content/projects.json` (json 18 → the gap; json 32 → MISTCHILD's entry, moved whole)
- Delete: `public/content/projects/neon-liturgy/`
- Test: `tests/content-files.test.ts`, `tests/legend.test.ts`

- [x] **Step 1: Write the failing tests:**
  - MISTCHILD's slot is 32;
  - a new "back down" test: json 18 is the gap, NEON LITURGY has no entry or folder, 40 entries;
  - held vs gap counts: 1 each;
  - `floor[25]` carries `gap: false`;
  - CH·01 cells: `'gap-18': [4, 0]`, `mistchild: [4, 3]`;
  - CH·01 has 18 films;
  - 23 placeholders.
- [x] **Step 2: Run.** Expect FAIL.
- [x] **Step 3: Splice by text span** with a node script:
  - scan the top-level entries with a string-aware depth counter;
  - replace span 32 with span 18's text;
  - replace span 18 with the gap's text, in the file's own line ending;
  - assert JSON parses, the other 38 deep-equal the original, and new 32 deep-equals old 18.

  Then `git rm -r -q public/content/projects/neon-liturgy`.
- [x] **Step 4: Run.** Expect PASS.

### Task 3: The world draws nothing for a gap, but measures it

**Files:** Modify `src/works/world.ts` (the held-screen loop); Test: a pin in `tests/wayfinding.test.ts`

- [x] **Step 1:** Add the pins `if (it.gap) { w.gaps.push(pane); continue; }` and `for (const t of [...w.panes(), ...w.gaps]) {`. Run them: FAIL.
- [x] **Step 2: Implement:**
  - build the gap's `BlankPane` (for its position and extents) but keep it in `w.gaps`, off the scene graph;
  - the carpet's bounds run over `[...w.panes(), ...w.gaps]`;
  - `destroy()` disposes the measures.

  Run: PASS.

  (Changed in verification: the first cut skipped gaps outright. The corner cell is the carpet's rightmost point in the isometric view, so the carpet shrank and the furniture ringing it slid into the corner the pane left.)

### Task 4: The label tells the truth

**Files:**
- Modify: `src/shell/cursor.ts` (the `chromeWrote` flag, `cursorLabelFor(target, chromeWrote)`, the listener)
- Modify: `src/works/world.ts` (the tile `pointerover` guard)
- Test: `tests/wayfinding.test.ts`

- [x] **Step 1: Write the failing tests:**
  - `cursorLabelFor(target(['canvas']), true)` → `null` (the stuck SWITCH ▸);
  - `cursorLabelFor(target(['canvas']), false)` → `undefined`;
  - `data-cursor` / plain as before, with the flag either way;
  - pin `document.elementFromPoint(e.clientX, e.clientY) === app.canvas` in `world.ts`.
- [x] **Step 2: Run.** Expect FAIL.
- [x] **Step 3: Implement:**
  - `paint()` holds the DOM write;
  - `setCursorLabel` sets `chromeWrote = false` and paints;
  - the listener calls `cursorLabelFor(e.target, chromeWrote)`, paints unless `undefined`, then sets `chromeWrote = true`;
  - the tile `pointerover` gets the guard.
- [x] **Step 4: Run** the whole suite. Expect PASS.

### Task 5: Gates, verification, ship

- [x] `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.
- [x] CDP on dev:
  - `sticky.mjs`: tabs → SWITCH ▸ with nothing hovered; bare floor → empty; pane → ENTER ▸;
  - the grid read back from the world;
  - the first-hover ENTER ▸ (`verify.mjs` section B);
  - a flip each way;
  - the dossiers.
- [x] Commit, push, `gh run watch --exit-status`, then the same CDP checks with `BASE=https://rev4chol.github.io`.
- [x] Memory bullet; closing report with the design call flagged.
