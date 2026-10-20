# WORK on a Phone: the Rolling Strip, Focus Points, Loops That Play at Once — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-20-work-phone-strip-design.md`:
- On a phone, WORK is an endless strip of whole-screen panes. It rolls on its own from arrival, and a finger drags and
  throws it.
- Each film's crop follows its focus point.
- A battery saver's refused video `play()` turns the loops, on the homepage and in WORK, into MP4 images that move at
  once.

**Architecture:**
- `lib/content.ts` reads and refuses the `focus` field.
- `lib/autoplay.ts` knows a refusal and remembers it for the visit.
- `works/reel.ts` holds the strip's arithmetic: the panes' places, the film in view, the rail, the coast, the throw,
  and which panes play (pure).
- `works/reel-view.ts` sets the panes by transform, runs the roll and the finger, and plays the panes in view as videos
  or images.
- `home/hero.ts` turns the homepage's reel to images on a refusal.

**Tech Stack:** TypeScript, CSS transforms, pointer events, vitest; Playwright with Chrome and CDP touch events; a
refusal stand-in (the MP4 served to an image as an animated WebP).

## Global Constraints

- `about-old.*` is never touched. A tablet's and a desktop's floor are unchanged.
- Motion goes through `reducedMotion()` only: under CALM the strip never rolls by itself.
- Vertical footage stands vertical. No horizontal overflow on a phone.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: Focus points

**Files:** `src/lib/content.ts`, `public/content/projects.json`, `tests/content.test.ts`, `HOW-TO-EDIT.md`

- [x] **Step 1:** `focus: "X% Y%"`, defaulting to the middle. A malformed value is refused, naming the film.
- [x] **Step 2:** The values from the loops' frames:
  - PHILIA `45% 50%`;
  - MIEN VIEN `62% 50%`;
  - MISSION: IMPASSIBLE `46% 50%`;
  - JAECOO J5 `60% 50%`.
- [x] **Step 3:** The pane's poster and loop take it as their `object-position`.

### Task 2: The rolling strip

**Files:** `src/works/reel.ts`, `src/works/reel-view.ts`, `src/styles/components.css`, `tests/reel.test.ts`

- [x] **Step 1:** The arithmetic: each pane's endless place, the film in view, the rail both ways, the coast, the throw,
  and a short chapter laid again.
- [x] **Step 2:** The view.
  - The panes are set by transform, with no scroll.
  - The roll is one screen in 7 s.
  - The finger drags and throws the strip; it rests 2.5 s, then rolls on. A tap opens; a drag never does.
  - Keyboard focus brings a pane square.
- [x] **Step 3:** The rail scrubs. CALM never rolls. The end slate leaves the phone.

### Task 3: The loops at once

**Files:** `src/lib/autoplay.ts`, `src/works/reel-view.ts`, `src/home/hero.ts`, `src/styles/components.css`,
`tests/autoplay.test.ts`, `tests/floor-ways.test.ts`

- [x] **Step 1:** Every pane in view plays, and the next one in. Near panes rest; far panes let go.
- [x] **Step 2:** A refusal is noted and remembered for the visit. In WORK the loops then stand as MP4 images. A
  browser that shows none falls back to video and a touch.
- [x] **Step 3:** The homepage probes on its first clip. It turns to an image reel on its own clock, with its colour
  and its bars trimmed, and hands back to the videos if the images fail.

### Task 4: Gates, verification, ship

- [x] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [x] **Step 2:** On the built site, on touch phones:
  - the roll, a drag, a throw and the rest, a tap and a drag over a film, the rail, CALM;
  - the loops in view;
  - the refusal stand-in on the homepage and in WORK, with images and without;
  - every pane's words clear of the chrome; no overflow.
  Check that a tablet and desktops keep the floor.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
