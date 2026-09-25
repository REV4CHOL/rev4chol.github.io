# SODA COAST, AI Generalist, COLORIST / AI Chapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SODA COAST replaces VHS EDEN in CH·01, the homepage roles bar opens with AI GENERALIST, and the works chapters are COLORIST and AI — each name always bigger than its CH·NN label.

**Architecture:** Content swaps in `public/content/` (projects.json slot 12 + media folder, site.json tagline); a pure `nameScale` rule in `src/works/channels.ts` consumed by `src/pages/works.ts` (a `--ch-scale` CSS variable for the dial, a direct size for the ident).

**Tech Stack:** Vite 7, TypeScript strict, vitest, ffmpeg.

## Global Constraints

- The media follow the FAR EAST scope recipe: loop 1280 × 534, stills 1600 × 670 in timeline order, poster 1280 × 534.
- `NAME_OVER_INDEX = 1.1`; the dial's two names share one scale.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`. Bash-first while auto mode is active.

---

### Task 1: The tests name the change (red)

**Files:**
- Modify: `tests/channels.test.ts` (names; `nameScale`)
- Modify: `tests/content-files.test.ts` (tagline order; soda-coast in slot 12 with its media)

**Interfaces:**
- Produces: `NAME_OVER_INDEX: number`, `nameScale(pairs: { name: number; index: number }[], ratio?: number): number` from `src/works/channels.ts`.

- [x] **Step 1:** Write the assertions (the spec's Tests section).
- [x] **Step 2:** `npx vitest run tests/channels.test.ts tests/content-files.test.ts` — FAIL (names, missing export, tagline, slot 12).

### Task 2: The content and the rule (green)

**Files:**
- Create: `public/content/projects/soda-coast/{poster.jpg, preview.mp4, stills/01..51.jpg}` (from the scratch pipeline)
- Delete: `public/content/projects/vhs-eden/`
- Modify: `public/content/projects.json` (slot 12), `public/content/site.json` (tagline)
- Modify: `src/works/channels.ts` (names, `NAME_OVER_INDEX`, `nameScale`)
- Modify: `src/pages/works.ts` (`.ch-word` span; `sizeDial()` after mount, fonts, resize; the ident grows by `nameScale` before its plate cap)
- Modify: `src/styles/components.css` (`.ch-name` sizes × `var(--ch-scale, 1)`, desktop and phone)
- Modify: `HOW-TO-EDIT.md` (the channel names and the size rule)

- [x] **Step 1:** Copy the media in; `git rm -r` the placeholder folder; splice the two JSON files.
- [x] **Step 2:** The rule and its wiring.
- [x] **Step 3:** The two test files — PASS.

### Task 3: Gates, pane, delivery

- [x] **Step 1:** `npx tsc --noEmit`, `npx vitest run`, `npx vite build` — green.
- [x] **Step 2:** Pane (desktop 1440 × 900 and the phone preset): dial measures, ident measures after a flip, homepage roles bar, the soda-coast pane and dossier; screenshots.
- [x] **Step 3:** "As built"; commit; push; `gh run watch --exit-status`; curl the live content; memory bullet; closing report.

### Task 4: Revision — the names too big (owner, same day)

- [x] **Step 1:** Specimen of the dial at 16–40 px; pick 24 px (2.4 × the label).
- [x] **Step 2:** Tests: swap the four `nameScale` cases for two CSS pins (`--ch-k` 2.2–2.8; one `.ch-name` size, no phone override, no `--ch-scale`) — red.
- [x] **Step 3:** `works.ts` and `components.css` back to their pre-rule state, then `--ch-k: 2.4` and the ratio size; `nameScale` out of `channels.ts` — green, 272.
- [x] **Step 4:** Pane (desktop, phone, the flip ident); docs; commit; push; deploy; live check.
