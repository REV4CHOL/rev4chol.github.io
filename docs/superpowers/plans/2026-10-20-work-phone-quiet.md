# WORK: the Roll Even Slower, Sounds on Presses Only — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-20-work-phone-quiet-design.md`:
- The phone strip rolls one screen every 18 seconds.
- WORK on a phone sounds only when something is pressed. (Tasks 1 to 3 shipped it on every device; Task 4 narrows it
  to the phone, as the owner asked.)

**Architecture:**
- `works/reel.ts` sets the pace.
- The phone's WORK asks for press-only sounds with `data-sfx="press"`, and `shell/shell.ts` stands its blip down on that
  ask. (First shipped from `works.html` for every device, with the floor's wake blip dropped in `works/world.ts`; Task 4
  moves the ask to `pages/works.ts`, on a phone alone, and gives the floor its blip back.)

**Tech Stack:** TypeScript, vitest; Playwright with Chrome and CDP touch events, with every sound call counted.

## Global Constraints

- Motion goes through `reducedMotion()` only: under CALM the strip never rolls by itself.
- Presses keep their sounds. Other pages keep their blips.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: Even slower

**Files:** `src/works/reel.ts`, `tests/reel.test.ts`, `HOW-TO-EDIT.md`

- [x] **Step 1:** Set `ROLL_SECONDS` to 18, and pin it.
- [x] **Step 2:** The owner's guide says "one screen every 18 seconds".

### Task 2: Sounds on presses only

**Files:** `works.html`, `src/shell/shell.ts`, `src/works/world.ts`, `tests/floor-ways.test.ts`

- [x] **Step 1:** The body asks for `data-sfx="press"`. The shell's `pointerover` blip stands down on that ask.
- [x] **Step 2:** The floor's wake drops `sound.hover()`. `enter()` keeps its click.
- [x] **Step 3:** Pin both, with the strip's silence and a tap's click.

### Task 3: Gates, verification, ship

- [x] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [x] **Step 2:** On the built site, with the sound calls counted:
  - the phone's strip pace;
  - drags, throws and the rail, silent;
  - the presses, sounding;
  - the desktop floor, its links and a pan, silent, while its presses sound;
  - the homepage still blipping.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.

### Task 4: The quiet on the phone alone (owner, after the first ship: "no no that quiet only go with PHONE. bruh revert others")

**Files:** `works.html`, `src/pages/works.ts`, `src/shell/shell.ts`, `src/works/world.ts`, `tests/floor-ways.test.ts`

- [x] **Step 1:** `works.html` and the floor's wake blip go back as they were. The page sets `data-sfx="press"` when it
  builds the phone's strip, and the shell reads the ask as each pointer comes over.
- [x] **Step 2:** Re-pin: the ask on a phone alone; the floor keeps its blip.
- [x] **Step 3:** Gates; then, with the sounds counted: the phone silent on swipes, and a desktop and a tablet blipping
  as before. Commit, push, watch the Pages run, and check the same live.
