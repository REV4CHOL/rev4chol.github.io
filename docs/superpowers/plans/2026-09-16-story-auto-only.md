# STORY Without the Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The STORY section is the city alone — no tour, no stations, no scroll — and opens in AUTO on every platform, with FREE as the only other mode.

**Architecture:** Page-level surgery only: story.html loses the station layer, story.ts loses the tour/scroll/dossier machinery and boots the dial at AUTO, story.css loses the station rules and takes the solo body defaults outright. The renderer stays untouched.

**Tech Stack:** Vite 7, TypeScript strict, vitest.

## Global Constraints

- `city3d.ts` and every `src/about/*` module untouched; `about-old.*` untouched; ABOUT untouched.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.
- Bash-first workflow while auto mode is active.

---

### Task 1: The tests name the shape (red)

**Files:**
- Modify: `tests/sections.test.ts`

- [x] **Step 1:** story.html: no `a3-stations` / `a3-track` / `a3-rail`, dial present; story.ts: no `'tour'`, modes `['auto', 'free']`, still `mountCity3D`. Run the file — FAIL.

### Task 2: The surgery (green)

**Files:**
- Modify: `story.html` (drop track, stations, rail)
- Rewrite: `src/pages/story.ts` (AUTO/FREE dial, boot at AUTO silently, glide home only in AUTO, clock kept, free controls kept; tour/scroll/dossier code gone)
- Modify: `src/styles/story.css` (drop station/track/rail/cue/`.a-*`/`a3-solo` rules; body takes overflow hidden, touch-action none, user-select none)

- [x] **Step 1:** story.html splice; story.ts rewrite; story.css pruned by a block-parsing script (media queries kept only where rules survive), then the body defaults block appended.
- [x] **Step 2:** `npx vitest run tests/sections.test.ts` — PASS.

### Task 3: Gates, pane, delivery

- [x] **Step 1:** `npx tsc --noEmit`, `npx vitest run`, `npx vite build` — green.
- [x] **Step 2:** Pane: STORY boots AUTO lit, no stations, pose drifts over ticks; FREE on click (hint shows), back to AUTO; phone preset AUTO + stick/lift in FREE; screenshots.
- [x] **Step 3:** "As built"; commit; push; `gh run watch`; curl live; memory bullet; closing report.
