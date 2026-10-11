# The Far Streets, the Sky, the Road's Rare Flicker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-11-far-streets-sky-flicker-design.md`: the far city's open streets
show their own ground, hazed and blurred like the blocks about them; no far road lights up; the road gives a GPU's
rounding and the quality governor's steps nothing to flicker by.

**Architecture:** The sky domes stand on the far plane and the opaque one draws first (`city-sky.ts` SKY_DEPTH,
`city-paint.ts` order). Added lights fog by dimming (`additiveFog`). See-through materials keep the frame's alpha, the
distance blur's amount (`city-post.ts` keepAmount, applied over the world in `city3d.ts`). The floor's paints test no
depth. The lights about the eye re-deal at once only across a cut.

**Tech Stack:** TypeScript, three.js, vitest; Playwright with Chrome for the renders.

## Global Constraints

- Motion and quality rules are unchanged; `about-old.*` is never touched.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The sky behind everything

**Files:** `src/about/city-sky.ts`, `src/about/city-paint.ts`, `src/about/city3d.ts`, `tests/city-sky.test.ts`,
`tests/city-paint.test.ts`

- [x] **Step 1:** Add `SKY_DEPTH`; draw both domes with their clip z at that share of w (`onFarPlane`).
- [x] **Step 2:** Add `PAINT.order.sky` (−31) and give it to the opaque dome.
- [x] **Step 3:** Test the sky's quantised depth behind the ground's far edge at every tier, inside the clip volume;
  both domes on the far plane, the opaque one first.

### Task 2: The lights in the fog

**Files:** `src/about/city3d.ts`, `tests/city-fog.test.ts`

- [x] **Step 1:** Wrap the seven added materials still tinted by three's fog in `additiveFog`.
- [x] **Step 2:** Scan the source: every added material is unfogged, dimmed, or dims in its own shader.

### Task 3: The blur's amount is the solids'

**Files:** `src/about/city-post.ts`, `src/about/city3d.ts`, `tests/city-post.test.ts`, `tests/city-fog.test.ts`

- [x] **Step 1:** Write `keepAmount`: a see-through blend's colour as before, its alpha not at all.
- [x] **Step 2:** Apply it over the world at the end of the mount, the sky's layers aside.
- [x] **Step 3:** Test the blend factors, the untouched cases, and the traversal's place.

### Task 4: The road's rare flicker

**Files:** `src/about/city-paint.ts`, `src/about/city3d.ts`, `tests/city-paint.test.ts`

- [x] **Step 1:** The paints (strips, boxes, patches, stop lines) test no depth and write none.
- [x] **Step 2:** A resize and a change to FREE or AUTO no longer re-deal the lights about the eye at once.
- [x] **Step 3:** Test the paints' materials, the decals' pull, and the eye's floor.

### Task 5: Gates, verification, ship

- [x] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [x] **Step 2:** Render the night views before and after, colour and the blur's input; run the smoke check and STORY's
  checks.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
