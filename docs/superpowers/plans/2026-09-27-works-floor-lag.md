# Works Floor Lag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The works floor's loops keep real time. Each loop uploads only its new frames, and a faded glow runs no blur.

**Architecture:**
- `videoTexture(v)` in `src/lib/video-texture.ts` replaces both `Texture.from(v)` + `updateFPS = 30` call sites (`src/works/tile.ts`, `src/home/hero.ts`).
- `PaneGlow` in `src/works/glow.ts` replaces the tile's raw glow sprite and its tweens.

**Tech Stack:** TypeScript, PixiJS 8.20.1, GSAP, vitest (node environment).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-27-works-floor-lag-design.md`.
- No visible change: the same glow (accent, 1.18 × 1.3 of the card, `BlurFilter` strength 18, rest 0.14 featured / 0 otherwise, hover 0.4), and the same loops.
- Gates: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: Loops upload only their new frames

**Files:** create `src/lib/video-texture.ts` and `tests/video-texture.test.ts`; modify `src/works/tile.ts` and `src/home/hero.ts`.

- [x] **Step 1: Refactor only.** Create `videoTexture(v)` with today's behaviour (`Texture.from(v)`, then `updateFPS = 30`). Both call sites use it, and the gates stay green.
- [x] **Step 2: Write the test and watch it fail.**
  - Stand-ins before pixi.js loads: `requestAnimationFrame`, `document.createElement` (Pixi's alpha probe) and `HTMLVideoElement`.
  - A fake video with `requestVideoFrameCallback`.
  - After `play()`, 240 manual ticks of `Ticker.shared` at 120 Hz upload 0 times. Today it uploads 240 times, so this is RED.
  - `present(48)` uploads 48 times.
  - A paused video's presented frames upload nothing.
  - A source scan: no `updateFPS` in `src/`, and `videoTexture(` in both call sites.
- [x] **Step 3: The fix.** Drop the `updateFPS` line and document why. GREEN.
- [x] **Step 4:** Gates, then commit.

### Task 2: A faded glow runs no blur

**Files:** create `src/works/glow.ts` and `tests/glow.test.ts`; modify `src/works/tile.ts`.

- [x] **Step 1: Refactor only.** Extract `PaneGlow` (sprite, blur, `fadeTo(alpha, d)`, `kill()`) with today's behaviour (always visible). The tile uses it, and the gates stay green.
- [x] **Step 2: Write the test and watch it fail.**
  - A glow faded to 0 is hidden. Today it stays visible, so this is RED.
  - A glow rising from 0 is visible at once.
  - A featured glow resting at 0.14 is visible.
  - A fade to 0 cut short by `fadeTo(0.4)` stays visible.
  - A new non-featured glow starts hidden.
- [x] **Step 3: The fix.** `fadeTo` shows the glow first. The fade's `onComplete` sets `visible = alpha > 0`, and the constructor sets `visible = rest > 0`. GREEN.
- [x] **Step 4:** Gates, then commit.

### Task 3: Verify, ship

- [ ] **Step 1: Probe on the dev build.**
  - Capacity at 4K, idle and after crossing every pane: expect about 2,450 fps, 0.41 ms/frame.
  - The owner's session replay at 60 Hz and paced at 120/240 Hz: every loop at real time, uploads = presented.
- [ ] **Step 2: Pane.**
  - A featured pane at rest and a hovered pane, before and after: the same glow.
  - No console errors.
- [ ] **Step 3: Ship.**
  - Push, watch the deploy, curl the live site, and re-run the replay against the live site.
  - Update memory, then report.
