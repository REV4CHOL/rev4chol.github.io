# The pillar hatch drawn soft; SALINE THRONE off the floor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GALAXY's ad #1 pillar shows no grain, and CH·01 loses the SALINE THRONE placeholder.

**Architecture:** One CSS declaration (`.p-vgrid`'s hatch: hard 1 px lines → soft 2 px ramps, the same ink); one
splice of `public/content/projects.json` (entry 5 out) and `git rm -r` of its folder. The layout re-flows CH·01 on its
own.

**Tech Stack:** Vite 7, TypeScript strict, Vitest, PixiJS 8 floor; real Chrome over CDP for verification.

Spec: `docs/superpowers/specs/2026-09-28-pillar-hatch-saline-throne-design.md`.

## Global Constraints

- The owner's words verbatim in comments and tests; no narrative fact invented.
- `about-old.*` untouched.
- `projects.json` round-trips `JSON.stringify(j, null, 2)` (LF, no trailing newline): splice by parse / filter /
  stringify, every kept film deep-equal and in order.
- No `rm` on a shell-variable path: `git rm -r public/content/projects/saline-throne`.
- Gates: `npx tsc --noEmit`, `npx vitest run`, `npx vite build --outDir dist-check`, then `rm -rf dist-check`.

---

### Task 1: The hatch drawn soft

**Files:** Modify `src/styles/project.css` (`.p-vgrid`). Test `tests/pillars.test.ts`.

- [x] Write the failing test: parse `.p-vgrid`'s `repeating-linear-gradient`: 135deg; the last stop at 12 px; every
      change of alpha between neighbouring stops runs over ≥ 1 px; the ink per period (the alpha's area) ≈ 0.13 px.
- [x] Run it: fails on the hard edge (0.13 → 0 over 0 px at 1 px).
- [x] Change the declaration to
      `repeating-linear-gradient(135deg, rgba(237, 237, 230, 0) 0, rgba(237, 237, 230, 0.13) 1px, rgba(237, 237, 230, 0) 2px 12px)`,
      and say why in the comment above it (the owner's words).
- [x] Run it: passes.

### Task 2: SALINE THRONE out

**Files:** `public/content/projects.json`, `public/content/projects/saline-throne/` (removed). Tests
`tests/content-files.test.ts`, `tests/legend.test.ts`.

- [x] Update the tests first: every json position after 5 down by one (SODA COAST 9, HALIDE 15, MISTCHILD 16,
      SOFT HOURS 12, ĂN HỎI 6, REMNANTS 13, MISSION 14, JAECOO J5 8, GALAXY 11, FAR EAST 5); the floor 17 long;
      SALINE THRONE with the placeholders gone; no film on the list is one `scripts/gen-placeholders.ps1` makes;
      CH·01's cells the 4 × 3 block; 12 (6 featured) + 5 = 17; legend 17.
- [x] Run them: they fail on the positions, the counts, the cells, the folder and the guard.
- [x] Splice entry 5 out of `projects.json` (checked script: the rest deep-equal, in order); `git rm -r` the folder.
- [x] Run them: pass.

### Task 3: Gates

- [x] `npx tsc --noEmit`; `npx vitest run`; `npx vite build --outDir dist-check`; `rm -rf dist-check`.

### Task 4: Real Chrome, dev

- [x] GALAXY's wall at DPR 1, 1.25, 1.5 and 2: the pillar's foot magnified, every line alike; the EOF cells.
- [x] Works: CH·01 12 panes, 0 blanks, 0 gaps, the 4 × 3 block; CH·02 5; a phone's opening frame.
- [x] Dossiers P·NN/17, the next-film chain; SALINE THRONE's old address; no console errors.

### Task 5: Ship

- [x] Commit (`git -c core.safecrlf=false commit -F <msgfile>`), push, watch the Pages run by its full sha.
- [x] The same checks on the live site.

### Task 6: Close

- [x] Tick this plan (its own commit); update the memory; the closing report with the design calls.

## Shipped

482f34a, Pages run 36396961769 green; verified on dev and live the same day.

- The hatch: each line crossing's ink in ad #1's empty half, p95 / p5, was 2.07 at 100% and 125%, 1.55 at 150%, 1.53
  at 200%, 2.07 at 1920 wide (the dotted lines); now 1.24 at 1440 × 100%, 1.08 to 1.10 everywhere else. The grain and
  scanline layers stay off the wall (a capture with them hidden differs by at most one level in 32 values).
- CH·01: 12 panes on the full 4 × 3 block, 0 blanks, 0 gaps; CH·02 unchanged (GALAXY's loop 269 frames, 0 black).
- Dossiers P·01/17 to P·17/17, FOREST ONSEN's next film FAR EAST; SALINE THRONE's address: SIGNAL LOST. No errors.
