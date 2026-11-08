# WORK: Almost Every Pane Plays at Once — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-11-08-work-loops-at-once-design.md`. On a desktop, every pane in the view
plays its loop at FULL and at BALANCED. The far panes wait until the view comes near.

**Architecture:** one table in `src/lib/quality.ts` (`videoCapFor`), its pin in `tests/quality.test.ts`, and the comment
in `src/works/playback.ts`. The window rule (`src/works/priority.ts`) is unchanged.

**Tech Stack:** TypeScript, vitest; the live floor read through `window.rvlWorld` in the browser pane.

## Global Constraints

- LITE stays at 3. The tablet and narrow-window column stays 4 · 3 · 2. The phone strip is untouched.
- The performance fixes are untouched: upload on a new frame, `autoPlay: false`, the frame gate, the glows.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The cap

**Files:** `tests/quality.test.ts`, `src/lib/quality.ts`, `src/works/playback.ts`

- [x] **Step 1:** Pin the desktop column `[12, 12, 3]` and the narrow one `[4, 3, 2]`. The test fails.
- [x] **Step 2:** `videoCapFor` reads `[[3, 2], [12, 3], [12, 4]]`. Its comment, and `PlaybackManager.cap`'s, say why.
- [x] **Step 3:** The test passes. Run check, the full suite and the build.
- [x] **Step 4:** Commit `feat(works): …(owner)`.

### Task 2: Ship and verify

- [x] **Step 1:** Push, and watch the deploy run.
- [x] **Step 2:** On the live floor, with a cache-buster:
  - `rvlWorld.playback.cap` is 12 at FULL and with `?gfx=balanced`, and 3 with `?gfx=lite`;
  - in CH·01, every pane in the window is awake; the panes past it sleep.
- [x] **Step 3:** Tick this plan.
