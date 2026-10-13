# The Films' Names in the Display Voice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `docs/superpowers/specs/2026-10-13-film-titles-display-voice-design.md`: every film's name on the
site in Clash Display, so the names read.

**Architecture:** Two CSS rules change voice (`components.css`); the type scale's rule is restated (`tokens.css`); a
test pins every name's voice (`fonts.test.ts`).

**Tech Stack:** CSS, vitest; Playwright with Chrome for the screenshots.

## Global Constraints

- `about-old.*` is never touched. Gates before commit: `npm run check`, `npm test`, `npm run build`.

---

### Task 1: The two places

**Files:** `src/styles/components.css`, `src/styles/tokens.css`

- [ ] **Step 1:** The floor's caption (`#tile-label .tl-title`) and THE LIST (`.fl-title`) take `var(--f-display)`, bold,
  with 0.02em letter spacing and 0.12em word spacing.
- [ ] **Step 2:** Restate the type scale's rule: Clash owns `--t-xl` and up, and every film's name.

### Task 2: The tests

**Files:** `tests/fonts.test.ts`

- [ ] **Step 1:** Every film's name is set in the display voice; the serif voice's check covers the synopses.

### Task 3: Gates, verification, ship

- [ ] **Step 1:** Get `npm run check`, `npm test` and `npm run build` green.
- [ ] **Step 2:** Screenshots of THE LIST (1440, a 390 phone) and the floor's caption; the smoke check.
- [ ] **Step 3:** Commit, push, watch the Pages run, and check the same on the live site.
