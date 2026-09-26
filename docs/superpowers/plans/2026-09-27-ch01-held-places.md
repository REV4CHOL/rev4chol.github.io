# CH·01 Moves and Held Places — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SODA COAST and FAR EAST take SODIUM HAZE's and MOTEL EDEN's places on CH·01, and the two spots they leave are held as unlit screens for the owner's next two films.

**Architecture:**
- A `blank` entry kind in `projects.json`. `parseFloor` (films and held places) feeds only the works floor; `parseProjects` (films) feeds everything else.
- `BlankPane` draws a held place.
- Json order and size class fix every pane's spot, so moving and holding is a text splice.

**Tech Stack:** Vite 7, TypeScript strict, PixiJS v8, gsap, vitest.

## Global Constraints

- No other pane moves, on either chapter.
- A held place is never a page, a count or a chain stop, and never takes the pointer.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: Tests (red)

- [x] `content.test.ts`: `parseFloor`, `isBlank`, `parseProjects` skipping held places, and refusals.
- [x] `channels.test.ts`: the filter over a floor stream.
- [x] `content-files.test.ts`:
  - the moves, the held places, the placeholders gone;
  - the CH·01 geometry laid out;
  - counts of 18 + 2 and 20;
  - BATCH slots read on the floor stream.
- [x] 10 red.

### Task 2: Parser and data (green)

- [x] `content.ts`: `FloorBlank`, `FloorItem`, `isBlank`, `parseFloor` and `loadFloor`; the helpers extracted.
- [x] `channels.ts`: `channelProjects` becomes generic.
- [x] `projects.json` text splice (12, 24, 25, 27); `git rm -r` of `sodium-haze` and `motel-eden`. 50 green.

### Task 3: Floor

- [x] `src/works/blank.ts` `BlankPane`.
- [x] `world.ts`: create from the stream, `panes()` for bounds and flights, teardown.
- [x] `works.ts`: `loadFloor` wiring; the HUD counts films.
- [x] HOW-TO-EDIT: "Hold a place for a film to come".

### Task 4: Verify and deliver

- [x] Pane checks: the grid, the look, the pointer, flips (gsap driven by hand while the pane is hidden), the phone, the dossiers.
- [x] Gates, commit, push, deploy, live check, memory, report.
