# WORK on a Phone: the Roll at Once, Slower, Smoother — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-20-work-phone-roll-design.md`. The phone strip rolls at full pace
from the first frame, one screen every 12 seconds, on the compositor, and a throw eases straight back into the roll.

**Architecture:** `works/reel.ts` gains the lap arithmetic: lapProgress, offsetFromLap, paneKeyframes and
capKeyframes. `works/reel-view.ts` runs per-pane, per-word and playhead Web Animations: playing while it rolls, paused
and set by hand otherwise.

**Tech Stack:** Web Animations (transform and opacity on the compositor), TypeScript, vitest; Playwright with Chrome,
CDP touch events and the screencast.

## Global Constraints

- Motion goes through `reducedMotion()` only: under CALM the strip never rolls by itself.
- A tablet's and a desktop's floor are unchanged. No horizontal overflow on a phone.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The lap arithmetic

**Files:** `src/works/reel.ts`, `tests/reel.test.ts`

- [x] **Step 1:** The pace becomes 12 s. The words' fade becomes 20 px, so square words stand whole.
- [x] **Step 2:** lapProgress and offsetFromLap, tested against paneTop.
- [x] **Step 3:** paneKeyframes, and capKeyframes tested against capOpacity.

### Task 2: The roll on the compositor

**Files:** `src/works/reel-view.ts`, `src/styles/components.css`, `tests/floor-ways.test.ts`

- [x] **Step 1:** Build the animations per strip, paused at the offset.
- [x] **Step 2:** Roll from the first frame. Hold for a finger, the rail or a keyboard's focus. The coast hands back to
  the clock at the pace.
- [x] **Step 3:** The loops on a 150 ms beat. The playhead becomes a rail-tall transform, and the words' layer is
  composited.

### Task 3: Gates, verification, ship

- [x] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [x] **Step 2:** On the built site:
  - the blocked-main-thread screencast;
  - the strip at two sizes;
  - the playhead, the words, the loops, CALM, and a tablet and desktops.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
