# Vietnamese Companion Fonts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every letter of every film title and synopsis draws in the site's own type, with no system-font borrowing. The trigger was "Ăn Hỏi" Ceremony.

**Architecture:** Companion `@font-face` families, second in `--f-display` and `--f-serif`. `--f-micro` falls back to Geist Mono.

**Tech Stack:** CSS, vitest.

## Global Constraints

- Only the three measured subset files are added, and no primary font changes.
- Gates: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1

- [x] **Step 1:** Write `tests/fonts.test.ts` (a WOFF2 cmap reader; voice coverage; companion order, coverage and metrics). It is red for `an-hoi`: `ỏ Ỏ`.
- [x] **Step 2:** Add the three files and the three `@font-face` rules, and update the voices. The tests go green.
- [x] **Step 3:** Pane: the dossier headline, ticker and hover label. Then gates, commit, push, the deploy, a live check and memory.
