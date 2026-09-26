# Third Batch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-09-27-third-batch-design.md`:

- FOREST ONSEN (CH·02, TENDER MACHINES' slot);
- SOFT HOURS & LONELY LANDS (SODA COAST's old slot);
- "ĂN HỎI" CEREMONY (the upper held place, featured);
- FAR EAST ↔ COPPER LULLABY;
- SODA COAST to RUST CHOIR's slot;
- Sound Mixer → Sound Designer.

**Architecture:** Content and media only.

- `projects.json` is spliced by text span. Every untouched entry keeps its bytes, and the script proves the changed slots are exactly 3, 5, 9, 12, 15, 16, 19, 24 and 27.
- Media is cut with ffmpeg from the owner's folders into `public/content/projects/<slug>/`.

**Tech Stack:** ffmpeg, node, vitest.

## Global Constraints

- The owner's text is verbatim: titles, quotes, `&`, diacritics (NFC) and synopses.
- No other pane moves. The layout engine and the parser are untouched. `about-old.*` is never touched.
- Loop flags: `-map 0:v:0 -an -dn -sn -map_metadata -1 -write_tmcd 0 -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p -movflags +faststart`. A grainy loop may go up to CRF 27.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: Tests first (`tests/content-files.test.ts`)

- [ ] **Step 1:** Update and add tests:
  - Sound Designer everywhere;
  - the BATCH3 table (slot, fields, credit, film, media counts);
  - the moves and removals;
  - CH·01 cell-by-cell;
  - CH·02 FOREST ONSEN at (1, 2);
  - counts (CH·01 19 + 1 held, 5 featured; CH·02 20, 6 featured);
  - SODA COAST at slot 16.
- [ ] **Step 2:** Run `npx vitest run tests/content-files.test.ts` and see them red for the right reasons.

### Task 2: Media

- [ ] **Step 1:** `films4/media.sh`:
  - the three loops, each checked for size (raise CRF only for a grainy loop over about 2.5 MB);
  - the posters: the FOREST ONSEN loop's frame 0, SOFT HOURS still 23 and ĂN HỎI still 34;
  - the stills, in label order.
- [ ] **Step 2:** Probe every output's size and dimensions, and check the edge rows and columns for black.
- [ ] **Step 3:** Remove the `tender-machines/` and `rust-choir/` folders.

### Task 3: Data

- [ ] **Step 1:** `films4/splice.mjs`:
  - replace the six slots' spans;
  - rename the role in the three entries;
  - prove the exact set of changed slots and LF endings.
- [ ] **Step 2:** Run `npx vitest run` and confirm everything is green.

### Task 4: Ship

- [ ] **Step 1:** Run the gates; check both chapters and the three dossiers in the pane, including the hover labels and ĂN HỎI's borrowed Ỏ.
- [ ] **Step 2:** Commit, push, watch the deploy, curl the live `projects.json` and the media, update memory, and write the report.
