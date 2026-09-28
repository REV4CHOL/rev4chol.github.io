# Two New Webloops and a Private Film — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-09-28-two-webloops-private-film-design.md`: JAECOO J5's and FOREST ONSEN's new loops, FOREST ONSEN's new poster, and MIEN VIEN as a private film.

**Architecture:** Media is cut with ffmpeg into `public/content/projects/<slug>/`. One new optional content flag, `filmPrivate`, read by the parser, `isPlaceholder()` and the dossier's WATCH slot. `projects.json` is spliced by text span.

**Tech Stack:** ffmpeg, TypeScript, vitest.

## Global Constraints

- Loop flags: `-map 0:v:0 -an -dn -sn -map_metadata -1 -write_tmcd 0 -c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart`.
- The private line reads exactly `PRIVATE FILM ▪ NOT AVAILABLE TO WATCH ONLINE`. The director's reason never appears on the site.
- Every other projects.json entry keeps its bytes. `about-old.*` is never touched.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: Tests first

**Files:** `tests/content.test.ts`, `tests/legend.test.ts`, `tests/wayfinding.test.ts`, `tests/channels.test.ts`, `tests/content-files.test.ts`

- [x] **Step 1:** Add the tests the spec lists (the parser, placeholders and captions, the private line pin, the two loops' `mvhd` duration + faststart + size), and `filmPrivate: false` in the typed fixtures.
- [x] **Step 2:** Run `npx vitest run` and see them fail for the right reasons: no `filmPrivate` yet, MIEN VIEN still pending, the old loops' durations.

### Task 2: The private film

**Files:** `src/lib/content.ts`, `src/works/legend.ts`, `src/pages/project.ts`, `src/styles/project.css`, `public/content/projects.json`, `HOW-TO-EDIT.md`

- [x] **Step 1:** `Project.filmPrivate: boolean`, parsed like `filmPending`; both true refused; `isPlaceholder` false for it.
- [x] **Step 2:** The dossier: the private branch first, its line in `.p-private` (styled with `.p-placeholder`).
- [x] **Step 3:** MIEN VIEN's `"filmPending": true` becomes `"filmPrivate": true` (a text splice; every other entry deep-equal).
- [x] **Step 4:** HOW-TO-EDIT: the new flag and the corrected `null` line.

### Task 3: The media

- [x] **Step 1:** JAECOO J5: the 4K loop scaled to 1280 × 720, CRF 21, over `jaecoo-j5/preview.mp4`.
- [x] **Step 2:** FOREST ONSEN: 237 frames, CRF 29, over `forest-onsen/preview.mp4`; its first frame as `forest-onsen/poster.jpg`.
- [x] **Step 3:** Probe both: sizes, frame counts, no black frame at either wrap.

### Task 4: Gates, verification, ship

- [x] **Step 1:** `npx tsc --noEmit`, `npx vitest run`, `npx vite build` green.
- [x] **Step 2:** Dev in real Chrome over CDP: the panes, the heroes, FOREST ONSEN's poster, MIEN VIEN's dossier.
- [x] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
