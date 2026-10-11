# The Crowd at the Lights, the Plaza, the Flicker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-11-city-crowd-plaza-flicker-design.md`. On STORY, the walkers cross
when WALK comes, never stand on each other, the plaza fits its block, and the street paint holds still as the camera
flies.

**Architecture:** The lights make room for the walkers' crossings (`Traffic.roomToWalk`, asked once per crossing by
`People`). Waiters take spots from a per-junction registry and walk to them. The plaza deck takes its size from
`PLAZA` in `city-plan.ts`. The floor's paints are drawn in a fixed order over the floor's depth, instead of fighting
over rungs (`city-paint.ts`).

**Tech Stack:** TypeScript, three.js, vitest; Playwright with Chrome (SwiftShader) for the renders.

## Global Constraints

- Motion and quality rules are unchanged; `about-old.*` is never touched.
- The crowd's step must not cost more than it did with everyone moving.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The lights make room to walk

**Files:** `src/about/city-traffic.ts`, `src/about/city3d.ts`

- [x] **Step 1:** Add `WALK_MIN`, `nodeAt`, `groupAlong`, `redAt`, `walkAt`, `roomToWalk` and `walkTime` to `Traffic`.
- [x] **Step 2:** Wire the page to them (`crossOK`, `walkOK`, `walkRoom`); the WALK lamp times its FLASH by `walkTime`.

### Task 2: The walkers

**Files:** `src/about/city-people.ts`

- [x] **Step 1:** Crossers go at `CROSS_STEP` or faster, and WALK is asked for that time (`crossFrames`).
- [x] **Step 2:** Waiters take spots of their own (`takeSpot`, `QUEUE` rows, per junction) and walk to them. The queue
  moves up as it clears, and a full kerb turns a walker back.
- [x] **Step 3:** Walkers look ahead from the back of the queue, every 8th frame. Front-row waiters may take the WALK
  across their own street. After `PATIENCE`, a waiter turns back.
- [x] **Step 4:** Nobody stands, sits or browses within `STEP_APART` of someone already still.
- [x] **Step 5:** Hold the cost down: the wall check runs every 4th frame, crosswalk keys are numbers, and a crossing's
  two ways over are made once.

### Task 3: The plaza

**Files:** `src/about/city-plan.ts`, `src/about/city3d.ts`

- [x] **Step 1:** Export `PLAZA` (the canal's width by the block between the streets). Size the collision box by it.
  Move the planters and benches to 10.2. Remove the lamp ring that the carriageway rule had already cleared.
- [x] **Step 2:** Replace the disc and its rim with a box deck of `PLAZA`, with the same paving at the same flag size.

### Task 4: The floor, painted in turn

**Files:** `src/about/city-paint.ts`, `src/about/city3d.ts`

- [x] **Step 1:** Replace the rungs with `PAINT.ground`, `PAINT.pull` and `PAINT.order`.
- [x] **Step 2:** Draw the floor first (`order.floor`: the ground, the quay walls, the canal bridges' decks, the
  arterial's bridge). Make every paint a non-depth-writing material in its turn: the patches, the strips, the boulevard,
  the arterial, the slip at grade, the boxes, the stop lines. Pull the zebras and the lights on the ground by
  `PAINT.pull`.

### Task 5: Tests

**Files:** `tests/city-traffic.test.ts`, `tests/city-people.test.ts`, `tests/city-plan.test.ts`,
`tests/city-paint.test.ts`

- [x] **Step 1:** `roomToWalk`: WALK appears where it never came, the all-red is kept, and nothing shrinks.
- [x] **Step 2:** The crowd at the lights: every lit crossing opens long enough, and nobody waits past a cycle. Every
  waiter has a spot of their own, walked to, and no still pair overlaps.
- [x] **Step 3:** The plaza is its block, with nothing of it on a road and its furniture on the deck.
- [x] **Step 4:** The painted floor: the turns stack in order, every turn is used, a paint writes no depth.

### Task 6: Gates, verification, ship

- [x] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [x] **Step 2:** Render five views (the plaza from above and from the bridge, along the avenue, up the canal,
  steeply down on the grid) on the old build, the plaza build and the final build. Compare the flicker maps. Measure
  the paint schemes in a 24-bit depth buffer.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the live site.
