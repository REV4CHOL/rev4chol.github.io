# WORK on a Phone: the Reel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-20-work-phone-reel-design.md`: on a phone, WORK is a showreel, one film
to a frame and a swipe per film, in the floor's own dress. A tablet and a desktop keep the floor, unchanged.

**Architecture:**
- `works/reel.ts` decides which screens get the reel and holds a frame's sizes, codes and words (pure).
- `works/reel-view.ts` builds the strips, the rail and the foot, fits each frame, and runs the gate and its one loop.
- `pages/works.ts` decides once as it loads, builds no floor on a phone, and runs the channel change and the list for
  the reel.
- `works/index-list.ts` gives the list's way back its phone words.
- `components.css` holds the reel, its rail and its foot, upright and on its side.

**Tech Stack:** HTML and CSS (scroll snap), TypeScript, vitest; Playwright with Chrome on emulated touch phones.

## Global Constraints

- `about-old.*` is never touched. The desktop's and the tablet's floor are unchanged.
- Phones are gated on a coarse pointer. Nothing overflows at 360, 375, 390 or 430, nor on its side.
- Motion goes through `reducedMotion()` only. Vertical footage stands vertical. A chapter name stands bigger than its
  CH·NN line.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The rules

**Files:** `src/works/reel.ts`, `tests/reel.test.ts`

- [x] **Step 1:** Which screens: touch, and under 640 px wide or 500 px tall; the same lines as a media query.
- [x] **Step 2:** A frame's sizes:
  - the pane in the film's own shape, with its share of the frame by shape;
  - the title's size by its longest word;
  - the contact strip's count.
- [x] **Step 3:** Its words and codes:
  - the synopsis's first sentence, cut at a whole word;
  - the frame's number, its `RVL/xxxx` code and its edge code;
  - the rail's scrub and the gate's index;
  - the controls in plain sentences.

### Task 2: The reel

**Files:** `src/works/reel-view.ts`, `src/styles/components.css`

- [x] **Step 1:** A strip per chapter.
  - Each frame: the head, the pane with its dress, the contact strip, the words and the door, all one link.
  - The film's edge: sprockets and an edge code.
  - An EOF slate at the end of each strip.
- [x] **Step 2:** The fit: each pane in its shape, the title at its size, and what gives way in turn on a short screen.
  The EOF's name as big as the column holds it.
- [x] **Step 3:** The gate:
  - only the frame in the gate plays, and a frame two away gives its video back;
  - LITE shows posters only;
  - an advance ticks, scrambles the meta and flickers the title, except under CALM.
- [x] **Step 4:** The scrub rail (tap or drag) and the foot (the chapters, `LIST ▸`).
- [x] **Step 5:** Landscape: a frame in a row, the foot slimmer, the contact strip and the cue standing down.

### Task 3: The page

**Files:** `src/pages/works.ts`, `src/works/index-list.ts`, `HOW-TO-EDIT.md`, `tests/floor-ways.test.ts`,
`tests/fonts.test.ts`

- [x] **Step 1:** Decide once as the page loads; a phone loads no floor and mounts the reel.
- [x] **Step 2:** The channel change tunes the reel under the static. The list parks the reel; its way back reads
  `◂ BACK TO THE REEL`.
- [x] **Step 3:** Pins for the wiring, the CSS, the foot's sizes and the title's voice. The owner's guide says what a
  phone shows.

### Task 4: Gates, verification, ship

- [x] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [x] **Step 2:** On the built site, in Chrome on touch phones at 360 × 780, 375 × 667, 390 × 844, 430 × 932 and
  844 × 390:
  - arrive, advance, scrub, reach the EOF, change chapter, open the list and come back, and open a film with one tap;
  - one video at a time; no overflow; every frame fits.
  Check CALM and LITE. Check that a tablet and desktops keep the floor.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
