# STORY Without a Graphics Chip — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-11-story-without-a-gpu-design.md`: on a browser without graphics
acceleration (or without WebGL), STORY shows the city's still and says why, and offers the live city anyway.

**Architecture:** `src/about/city-gate.ts` holds a pure decision (`cityGate`) over a DOM probe (`probeGpu`).
`src/pages/story.ts` asks it before the lock arms: the live path is the old `armFlight`; the still path mounts an
`<img class="a3-still">` and offers the live city in the dial's seat. The still is one frame read off the live city.

**Tech Stack:** TypeScript, three.js (unchanged), Playwright with Chrome for the still and the checks, vitest.

## Global Constraints

- A browser with a graphics chip gets exactly today's page.
- The copy is plain words, in the hint's seat: the four lines in `city-gate.ts`.
- Motion and quality rules are unchanged; `about-old.*` is never touched.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: The gate

**Files:** `src/about/city-gate.ts`, `src/lib/quality.ts`

- [ ] **Step 1:** Export `SOFTWARE_GPU` from `quality.ts`.
- [ ] **Step 2:** Write `cityGate` (live, still or no-3d) and `probeGpu` (the renderer's name, the strict context's
  refusal), and the four lines and the still's path.

### Task 2: The page

**Files:** `src/pages/story.ts`, `src/styles/story.css`

- [ ] **Step 1:** Ask the gate before `armPosterLock`; on still or no-3d, mount the still and exempt it with the canvas.
- [ ] **Step 2:** Put the line in the hint's seat, and on still `LOAD THE LIVE CITY ANYWAY` in the dial's seat, which
  runs `armFlight` (the canvas back, the still gone once the city is built).
- [ ] **Step 3:** Style `.a3-still` like the canvas, with `object-fit: cover`, not pixelated.

### Task 3: The still

**Files:** `public/content/story/still.jpg`

- [ ] **Step 1:** Read one frame off the live city, at its opening drift at night, at high, at 1920 × 1080; save it as
  a JPEG under 450 KB.

### Task 4: Tests and the guide

**Files:** `tests/city-gate.test.ts`, `HOW-TO-EDIT.md`

- [ ] **Step 1:** Pin the decisions over GPU and software names, the caveat and no WebGL; pin the lines, the still's
  size and weight, and the gate's place before the lock.
- [ ] **Step 2:** Add HOW-TO-EDIT's "STORY without graphics acceleration".

### Task 5: Gates, verification, ship

- [ ] **Step 1:** Get `npx tsc --noEmit`, `npx vitest run` and `npx vite build` green.
- [ ] **Step 2:** In Chrome on this machine (no GPU), check that STORY shows the still and the line, and answers at
  once; that the smoke check is clean, STORY included; and that `LOAD THE LIVE CITY ANYWAY` builds the city.
- [ ] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
