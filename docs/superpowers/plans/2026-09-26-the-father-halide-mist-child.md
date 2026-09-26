# THE FATHER, HALIDE, MISTCHILD, SODA COAST's Link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three of the owner's films take three placeholders' slots, each linked to YouTube, and SODA COAST's WATCH goes live.

**Architecture:** Content only. The work touches `public/content/projects.json` (three entry splices at slots 4, 31 and 32, plus SODA COAST's film) and three media folders in, three out. No code changes.

**Tech Stack:** Vite 7, TypeScript strict, vitest, ffmpeg.

## Global Constraints

- **Slots and sizes are unchanged:** each chapter keeps 20 films and 6 featured.
- **Media recipes:**
  - 16:9: loop 1280 × 720, poster 1280 × 720, stills 1600 × 900.
  - Scope: loop 1280 × 534, poster 1280 × 534, stills 1600 × 670. HALIDE's stills are 1600 × 668, the largest 2.39 frame inside its picture.
  - Loops: H.264 CRF 23, no audio, no timecode track, `-map_metadata -1 -write_tmcd 0`, faststart.
- **Posters:** the owner's thumbnail when present, else the loop's opening shot.
- **Stills order:** Resolve label order, numeric on A, B, C.
- **`projects.json` is spliced by text span**, one entry at a time, because a JSON round-trip would reformat other entries.
- **Gates before commit:** `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: The tests name the change (red)

**Files:**
- Modify: `tests/content-files.test.ts`. The SODA COAST case expects its link. A new `it.each` covers the three films: fields, credits, film, media and the placeholder gone.

- [x] **Step 1:** Write the assertions (the spec's Tests section).
- [x] **Step 2:** Run `npx vitest run tests/content-files.test.ts`. It should FAIL on SODA COAST's link and on the three slots.

### Task 2: The media and the entries (green)

**Files:**
- Create:
  - `public/content/projects/the-father/{poster.jpg, preview.mp4, stills/01..23.jpg}`
  - `public/content/projects/halide/{…, stills/01..29.jpg}`
  - `public/content/projects/mistchild/{…, stills/01..16.jpg}`
- Delete: `public/content/projects/{void-cartography, paper-lantern-war, low-tide-gospel}/`
- Modify: `public/content/projects.json`

- [x] **Step 1:** Transcode the three loops, cut the posters, and scale and cut the stills. Probe every output.
- [x] **Step 2:** `git rm -r` the three placeholder folders.
- [x] **Step 3:** Splice the three entries and SODA COAST's film. Verify that the 36 untouched entries are deep-equal to before.
- [x] **Step 4:** Run `npx vitest run tests/content-files.test.ts`. It should PASS.

### Task 3: Gates, pane, delivery

- [x] **Step 1:** Run `npx tsc --noEmit`, `npx vitest run` and `npx vite build`. All green.
- [x] **Step 2:** Pane checks:
  - the floor, both chapters;
  - the four dossiers: fields, loop ratio, stills count, WATCH opens the right YouTube id;
  - the phone preset.
- [x] **Step 3:** Write "As built", commit, push, then `gh run watch --exit-status`. Curl the live content, add the memory bullet, write the closing report.
