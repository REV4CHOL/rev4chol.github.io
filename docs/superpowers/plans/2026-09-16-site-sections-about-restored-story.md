# ABOUT Restored, STORY Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ABOUT is the original full-fledged page again, between HOMEPAGE and WORK; the city page is renamed STORY and sits after CONTACT at the nav's far right.

**Architecture:** Pure routing/nav restructure. The nav data in `public/content/site.json` drives the header and the glide chain; the city page and entry are git-mv'd to story.*; the archive trio (`about-old.*`, never touched) is copied into fresh `about.*` files.

**Tech Stack:** Vite 7 multi-page, TypeScript strict, vitest.

## Global Constraints

- `about-old.html`, `src/pages/about-old.ts`, `src/styles/about-old.css` stay byte-identical.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.
- Bash-first workflow while auto mode is active.

---

### Task 1: The tests name the new shape (red)

**Files:**
- Modify: `tests/content-files.test.ts` (nav = the five stops in order)
- Modify: `tests/music-boot.test.ts` (PAGES + `story.html`)
- Create: `tests/sections.test.ts` (story carries the city; about carries the original; the archive untouched; vite + shell wiring)

- [x] **Step 1:** Write the assertions; run vitest on the three files; all three FAIL against the current tree.

### Task 2: The move (green)

**Files:**
- Modify: `public/content/site.json` (nav: HOMEPAGE · ABOUT · WORK · CONTACT · STORY)
- Rename: `about.html` → `story.html` (+ title `STORY — REVACHOL`, description, entry `/src/pages/story.ts`)
- Rename: `src/pages/about.ts` → `src/pages/story.ts` (`startPage('story')`, `../styles/story.css`)
- Rename: `src/styles/about.css` → `src/styles/story.css`
- Create: `about.html` (archive body + standard head + music boot, title `ABOUT — REVACHOL`, entry `/src/pages/about.ts`)
- Create: `src/pages/about.ts` (copy of `about-old.ts`, imports `../styles/about.css`)
- Create: `src/styles/about.css` (copy of `about-old.css`)
- Modify: `src/shell/shell.ts` (`PageKey` + `'story'`, `HREF_FOR.story`)
- Modify: `vite.config.ts` (`story: p('story.html')`)

- [x] **Step 1:** git mv the three city files; splice the three story edits.
- [x] **Step 2:** Assemble the new about trio from the archive (script-driven copy + head/title/entry edits; the archive files untouched).
- [x] **Step 3:** site.json nav, shell.ts, vite.config.ts.
- [x] **Step 4:** `npx vitest run tests/content-files.test.ts tests/music-boot.test.ts tests/sections.test.ts` — PASS.

### Task 3: Gates, pane, delivery

- [x] **Step 1:** `npx tsc --noEmit`, `npx vitest run`, `npx vite build` — green.
- [x] **Step 2:** Pane: home header order; `/about.html` original renders (ABOUT active); `/story.html` city boots, `rvlRide` up (STORY active); `/about-old.html` alive; contact/works fine; screenshots of ABOUT and STORY.
- [x] **Step 3:** "As built" in the spec; commit; push; `gh run watch --exit-status`; curl the live pages; memory bullet; closing report.
