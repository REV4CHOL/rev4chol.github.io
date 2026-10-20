# WORK: the Roll Even Slower, Sounds on Presses Only — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-20-work-phone-quiet-design.md`:
- The phone strip rolls one screen every 18 seconds.
- WORK sounds only when something is pressed.

**Architecture:**
- `works/reel.ts` sets the pace.
- `works.html` asks for press-only sounds with `data-sfx="press"`, and `shell/shell.ts` stands its blip down on that ask.
- `works/world.ts` drops the floor's wake blip.

**Tech Stack:** TypeScript, vitest; Playwright with Chrome and CDP touch events, with every sound call counted.

## Global Constraints

- Motion goes through `reducedMotion()` only: under CALM the strip never rolls by itself.
- Presses keep their sounds. Other pages keep their blips.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: Even slower

**Files:** `src/works/reel.ts`, `tests/reel.test.ts`, `HOW-TO-EDIT.md`

- [ ] **Step 1:** Set `ROLL_SECONDS` to 18, and pin it.
- [ ] **Step 2:** The owner's guide says "one screen every 18 seconds".

### Task 2: Sounds on presses only

**Files:** `works.html`, `src/shell/shell.ts`, `src/works/world.ts`, `tests/floor-ways.test.ts`

- [ ] **Step 1:** The body asks for `data-sfx="press"`. The shell's `pointerover` blip stands down on that ask.
- [ ] **Step 2:** The floor's wake drops `sound.hover()`. `enter()` keeps its click.
- [ ] **Step 3:** Pin both, with the strip's silence and a tap's click.

### Task 3: Gates, verification, ship

- [ ] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [ ] **Step 2:** On the built site, with the sound calls counted:
  - the phone's strip pace;
  - drags, throws and the rail, silent;
  - the presses, sounding;
  - the desktop floor, its links and a pan, silent, while its presses sound;
  - the homepage still blipping.
- [ ] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
