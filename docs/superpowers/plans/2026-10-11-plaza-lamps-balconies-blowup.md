# The Plaza's Lamps, the Balconies, the Blow-up — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-11-plaza-lamps-balconies-blowup-design.md`: a ring of lamps on the
plaza, nobody standing in the air past a balcony, and the city's frame blown up by whole pixels or smoothly.

**Architecture:** The plan places the perches and the lamp ring (`city-plan.ts`). The renderer honours a post's own
arm. `frameSize` (`city-governor.ts`, pure) sizes the frame for `fit()`.

**Tech Stack:** TypeScript, three.js, vitest; Playwright with Chrome for the renders.

## Global Constraints

- Motion and quality rules are unchanged; `about-old.*` is never touched.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The balconies

**Files:** `src/about/city-plan.ts`, `tests/city-plan.test.ts`

- [x] **Step 1:** Place the second of a pair a step along whichever way the slab has room, or not at all.
- [x] **Step 2:** Test that every perch stands on its slab.

### Task 2: The plaza's ring of lamps

**Files:** `src/about/city-plan.ts`, `src/about/city3d.ts`, `tests/city-plan.test.ts`

- [x] **Step 1:** Add `PLAZA_LAMP`, an optional `arm` on posts, and the twelve lamps (with a collision box each).
  Turn the furniture ring 15°.
- [x] **Step 2:** Honour a post's own arm in the renderer.
- [x] **Step 3:** Test the ring: on the deck, off the axes, arms in, clear of the furniture, solid to the crowd.

### Task 3: The blow-up, whole

**Files:** `src/about/city-governor.ts`, `src/about/city3d.ts`, `tests/city-governor.test.ts`

- [x] **Step 1:** Write `frameSize` and use it in `fit()`, smoothing the canvas where the blow-up is a fraction.
- [x] **Step 2:** Add `setScale` and `setPass` to the debug handle.
- [x] **Step 3:** Test whole blow-ups across the ratios, tiers and governor steps.

### Task 4: Gates, verification, ship

- [x] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [x] **Step 2:** Render the plaza with its ring; run the smoke check and STORY's checks.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
