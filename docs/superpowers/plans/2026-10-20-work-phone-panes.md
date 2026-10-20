# WORK on a Phone: Whole-Screen Panes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-20-work-phone-panes-design.md`: on a phone, each film's pane is the
whole screen with its loop covering it, as on antiantiart.com. Only the film's name and its roles stand on a pane, and
the loops play on every phone.

**Architecture:**
- `works/reel.ts` holds the loops' rule, the roles' line, the name's sizes, the rail and the words (pure).
- `works/reel-view.ts` builds the whole-screen panes, measures each name in its own face, and runs the gate, the warm
  next loop and the touch's re-offer.
- `components.css` holds the reel block: the pane, the words, the hardware, and the chrome over the picture.

**Tech Stack:** HTML and CSS (scroll snap, `object-fit`), TypeScript, vitest; Playwright with Chrome on emulated touch
phones.

## Global Constraints

- `about-old.*` is never touched. A tablet's and a desktop's floor are unchanged.
- Vertical footage stands vertical: never cropped wide on a phone held on its side.
- No horizontal overflow on a phone. Motion goes through `reducedMotion()` only. A chapter name stands bigger than its
  CH·NN line.
- Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The loops

**Files:** `src/works/reel.ts`, `src/works/reel-view.ts`, `tests/reel.test.ts`, `tests/floor-ways.test.ts`

- [ ] **Step 1:** Loops on every tier; posters only on Save-Data or a 2g line.
- [ ] **Step 2:** The next pane's loop warm. A pane two away gives its video back. Every touch, and a return from the
  back-forward cache, re-offers the loop.

### Task 2: The panes

**Files:** `src/works/reel-view.ts`, `src/styles/components.css`

- [ ] **Step 1:** A pane is the screen.
  - The poster and the loop cover it.
  - A vertical film stands whole on a phone held on its side.
  - The cut between panes is a hairline.
- [ ] **Step 2:** The words: the name with its ▸, and the roles. Nothing else on a pane.
- [ ] **Step 3:** The hardware without words: the accent tab, the viewfinder's corners, the scan lines, the sprockets and
  the rail.
- [ ] **Step 4:** The chrome over the picture: the header's veil, the switches' halo, and the foot on a fade. The EOF
  slate is a whole screen.

### Task 3: The names and the words

**Files:** `src/works/reel.ts`, `src/works/reel-view.ts`, `tests/reel.test.ts`, `HOW-TO-EDIT.md`

- [ ] **Step 1:** The roles' line: upper case, a role never broken inside, no line opening on a slash.
- [ ] **Step 2:** The name's size, measured in its own face:
  - one line at 34 to 52 px when it fits;
  - otherwise it wraps at its words from 34, 28 or 24 px by length, never under 22.
- [ ] **Step 3:** The owner's guide says what a phone shows, and that a film's middle is what stands.

### Task 4: Gates, verification, ship

- [ ] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [ ] **Step 2:** On the built site, on touch phones at 390 × 844, 375 × 667, 360 × 780, 430 × 932 and 844 × 390:
  - the walkthrough;
  - every pane's words clear of the chrome;
  - the loops under a remembered LITE, a pinned LITE, Save-Data and a battery saver;
  - CALM.
  Check that a tablet and desktops keep the floor.
- [ ] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
