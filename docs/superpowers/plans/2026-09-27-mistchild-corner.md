# MISTCHILD Corner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MISTCHILD stands in NEON LITURGY's top-right corner of CH·01, and NEON LITURGY takes MISTCHILD's old corner.

**Architecture:** Content only. The two entries in `projects.json` exchange text spans.

**Tech Stack:** vitest.

## Global Constraints

- No other pane moves.
- Gates before commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1

- [x] **Step 1:** Pin MISTCHILD's json slot at 18, and the CH·01 layout at (4, 0) for MISTCHILD and (4, 3) for NEON LITURGY. 2 tests go red.
- [x] **Step 2:** Swap the entries by text span. Only json 18 and 32 change, and the tests go green (284).
- [x] **Step 3:** Pane grid check; commit, push, deploy, live check, memory, report.
