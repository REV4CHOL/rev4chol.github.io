# Tall vertical pane, equal pillars, no placeholders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-09-28-tall-pane-equal-pillars-no-placeholders-design.md`.

**Architecture:** `layout.ts` learns tall panes (`tall`, `rowsOf`, two stacked slots, the cluster's right column); `constants.ts` `cardSize` is the one source of a pane's card; `tile.ts`, `world.ts`, `debris.ts`, `poster.ts` read it. The pillars share one CSS column count; `pillarColumns` goes. `projects.json` loses its placeholders and gap by a checked splice; their folders go with `git rm`.

**Tech Stack:** TypeScript, PixiJS 8, CSS, vitest.

## Global Constraints

- Landscape panes, heroes and walls do not change.
- No plates or black boxes behind chrome. `about-old.*` never touched.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: Tests first

- [x] **Step 1:** `layout.test.ts`, `pillars.test.ts`, `content-files.test.ts`, `legend.test.ts` as the spec's Tests section lists.
- [x] **Step 2:** `npx vitest run`: red for the right reasons.

### Task 2: The tall pane

- [x] **Step 1:** `layout.ts`: `tall`, `rowsOf`, stacked slots, the cluster's right column; `packRows` over `rowsOf`.
- [x] **Step 2:** `constants.ts` `cardSize`; `tile.ts`, `world.ts`, `debris.ts`, `poster.ts` read it.

### Task 3: Equal pillars

- [x] **Step 1:** `project.ts` + `project.css`: one column count, the end mark; `pillarColumns` removed.

### Task 4: No placeholders

- [x] **Step 1:** `projects.json` spliced (placeholders and the gap out, every film deep-equal); 21 folders removed; `HOW-TO-EDIT.md`.

### Found in verification

- [x] The tall pane's hover overran the screen (1081 px upright at the opening zoom): `hoverFit` holds it to 84% of the screen's height; a landscape pane keeps the plain lift. Tested (`pillars.test.ts`), pinned in `world.ts` and `tile.ts`.
- [x] The end mark's cell takes its row's height, not a portrait cell's: a phone lost a dead row of hatch.
- [x] Out of scope, its own commit: the phone's floor legend override stood above the rule it overrides and never applied (the legend ran across the HUD line and off the edge since 81d985e). Moved after it, wrapped and balanced under the HUD; a regression test in `wayfinding.test.ts`.

### Task 5: Gates, verification, ship

- [x] **Step 1:** Gates green.
- [x] **Step 2:** Dev in real Chrome: both floors, the tall pane asleep and awake, the pillars on three screens.
- [x] **Step 3:** Commit, push, watch the Pages run, check the live site.
