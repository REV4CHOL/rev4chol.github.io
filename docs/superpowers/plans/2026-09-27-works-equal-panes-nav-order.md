# Equal Panes and the Menu Order — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every works pane stands at the featured size, and the menu runs HOMEPAGE, WORK, ABOUT, CONTACT (then STORY).

**Architecture:**
- `layoutProjects` places panes on a band of pane slots, emitting 2 × 2 lattice blocks. The featured cluster is centred on the origin, and a `paneBand` helper drives the flights.
- The menu is data, in `site.json`'s `nav`.

**Tech Stack:** Vite 7, TypeScript strict, PixiJS v8, gsap, vitest.

## Global Constraints

- Featured stays a dress (inset rule, FEATURED tag, photographic poster), not a size.
- The band has no holes, and the featured sit at its heart, on the camera's opening view.
- STORY stays the line's end.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: The menu

- [x] **Step 1:** In `content-files.test.ts`, pin the nav as HOMEPAGE, WORK, ABOUT, CONTACT, STORY. It fails.
- [x] **Step 2:** In `site.json`, swap WORK ahead of ABOUT (a text swap, the file's form kept). It passes, and the swipe and sections suites stay green.

### Task 2: Equal panes

- [x] **Step 1:** Rewrite `tests/layout.test.ts` for the equal-pane contract, plus `paneBand`. It fails with 5 red.
- [x] **Step 2:** In `layout.ts`, implement pane-slot placement, the 2 × 2 emission, the cluster-on-origin shift and `paneBand`. It passes.
- [x] **Step 3:** In `world.ts`, the flights alternate and stagger by `paneBand`. Update the `constants.ts` comment and HOW-TO-EDIT (tileSize, position, Feature a film).
- [x] **Step 4:** A pane check showed a ragged 6 × 4. Pin the shipped chapter as a 5 × 4 block with the featured ringed. It fails, then passes on the fewest-empty-slots band rule.

### Task 3: Verify and deliver

- [x] **Step 1:** Pane checks, desktop and phone: spans, extents, the opening view, the header, the cues.
- [x] **Step 2:** A flip with a pane hovered threw after teardown. Add `hover()`'s exiting guard and `ProjectTile.killTweens` in `destroy()`, then re-run clean.
- [x] **Step 3:** Gates, As built, commits, push, deploy, live check, memory, report.
