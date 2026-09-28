# GALAXY Z FOLD 8 ULTRA (vertical, two parts) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-09-28-galaxy-fold-vertical-design.md`: the `9:16` format (vertical pane, hero, stills), films in parts (one WATCH, parts on one row), stills in pillars, and the film itself in TERMINAL BLOOM's place.

**Architecture:** `content.ts` learns `9:16` and `film` lists (`films`). Pure math in `src/project/pillars.ts` (`stillParts`, `pillarColumns`) and `src/works/spine.ts` (`spineFit`); the parts' player messaging in `src/project/parts.ts`. `tile.ts` dresses a vertical pane; `project.ts` builds the WATCH stage and the vertical wall. Media by ffmpeg; `projects.json` spliced by text span.

**Tech Stack:** TypeScript, PixiJS 8, CSS, ffmpeg, vitest.

## Global Constraints

- The owner's text verbatim (title with its `|`, synopsis). Runtime in the house form `0:24 & 0:37`.
- Left = part 1 = ad #1 = `film1`; right = part 2 = ad #2 = `film2`. Every still included.
- Nothing about landscape films changes: their panes, heroes, walls and single players stay as they are.
- No plates or black boxes behind chrome. `about-old.*` never touched.
- Loop flags: `-map 0:v:0 -an -dn -sn -map_metadata -1 -write_tmcd 0 -c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart`.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: Tests first

- [ ] **Step 1:** `tests/content.test.ts` (9:16, film lists), `tests/pillars.test.ts` (`stillParts`, `pillarColumns`, `spineFit`), `tests/embeds.test.ts` (no autoplay + API), `tests/parts.test.ts` (`ytState`, `ytCommand`), `tests/content-files.test.ts` (the entry, media, TERMINAL BLOOM gone, cell (3, 2), counts), pins for the spine, the stage and the pillars; fixtures gain `films`.
- [ ] **Step 2:** `npx vitest run`: red for the right reasons.

### Task 2: Content

- [ ] **Step 1:** `content.ts`: `aspect` `9:16` (ratio 9/16); `film` object or list → `films` + `film`; part `label`; empty list refused.
- [ ] **Step 2:** `HOW-TO-EDIT.md`: vertical films, films in parts, part-named stills.

### Task 3: The pure pieces

- [ ] **Step 1:** `src/project/pillars.ts`: `stillParts(urls)`, `pillarColumns(counts, minCols, maxCols)`.
- [ ] **Step 2:** `src/works/spine.ts`: `spineFit(textWidth, room)`.
- [ ] **Step 3:** `src/project/parts.ts`: `ytState(data)`, `ytCommand(func, id)`, `linkParts(frames)`; `embeds.ts`: `embedSrc(film, { autoplay, api })`.

### Task 4: The vertical pane

- [ ] **Step 1:** `tile.ts`: the spine, the moved accent bar and code, the shorter ticks for a portrait card.
- [ ] **Step 2:** `poster.ts`: a portrait poster at the floor's screen density; a portrait fallback.

### Task 5: The dossier

- [ ] **Step 1:** `project.ts` + `project.css`: the WATCH stage for parts (numbers, labels, hinge, uplink tag, first autoplays, `linkParts`).
- [ ] **Step 2:** The vertical wall: portrait grid, or pillars when the stills are part-named (heads, balanced columns, hatched foot, stacked below 700 px).

### Task 6: The film

- [ ] **Step 1:** Loop, poster, 17 stills into `public/content/projects/galaxy-z-fold-8-ultra/`.
- [ ] **Step 2:** `projects.json`: TERMINAL BLOOM's entry replaced by the film's (every other entry deep-equal); its folder removed.

### Task 7: Gates, verification, ship

- [ ] **Step 1:** Gates green.
- [ ] **Step 2:** Dev in real Chrome: pane, hero, WATCH stage, pillars; desktop and phone.
- [ ] **Step 3:** Commit, push, watch the Pages run, check the live site.
