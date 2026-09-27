# Wayfinding signposts — implementation plan (2026-09-27)

> Spec: `docs/superpowers/specs/2026-09-27-wayfinding-design.md`. TDD per task; gates after each: `npx tsc --noEmit`,
> `npx vitest run`, `npx vite build`. One commit per task.

**Goal:** first-time visitors know what the site is, where to go, how the floor works and which panes are real —
without changing any page's look.

**Stack:** Vite 7, TypeScript strict, PixiJS 8 (floor), vitest (node env; DOM-free pure modules).

## Tasks

### Task 1 — pure helpers + tests (red → green)

**Files:** create `src/works/legend.ts`, `src/works/opening.ts`, `src/home/door.ts`; modify `src/lib/content.ts`
(`isPlaceholder`), `src/shell/cursor.ts` (`cursorLabelFor`); tests `tests/legend.test.ts`, `tests/opening.test.ts`,
`tests/wayfinding.test.ts`.

- [x] Write the three test files (they fail: modules missing).
- [x] `legend.ts`: `FLOOR_LEGEND`, `legendText(fine)`, `captionMeta(p, fine)`, `floorOpened(storage)`,
      `markFloorOpened(storage)`.
- [x] `opening.ts`: `openingFrame(panes, screenW, minScale, maxScale = 1, margin = 18)`.
- [x] `door.ts`: `doorFromVoidClick(target, movedPx)`.
- [x] `content.ts`: `export const isPlaceholder`.
- [x] `cursor.ts`: `cursorLabelFor(target)`; the `pointerover` listener uses it.
- [x] Run `npx vitest run tests/legend.test.ts tests/opening.test.ts tests/wayfinding.test.ts` → green except the
      html/css/source pins (Task 2–4).

### Task 2 — the door (homepage)

**Files:** `index.html` (the `.home-cta-row` + `#home-door`), `src/pages/index.ts` (void click → WORK; door in the jolt
list), `src/styles/components.css` (`.home-door`, phone size).

- [x] Markup + styles; `leaveTo(workHref)` on a clean pointerup outside `#statement`.
- [x] Pins in `tests/wayfinding.test.ts` green.

### Task 3 — the floor (legend, cursor, caption, tabs, phone frame)

**Files:** `works.html` (`#floor-hint`), `src/pages/works.ts` (legend text/class, `onEnter` hook, `data-cursor` on the
switch buttons, sr list suffix), `src/works/world.ts` (`onEnter` hook, `captionMeta`, opening frame on coarse
pointers), `src/styles/components.css` (`.floor-hint`, tab underline, phone nav targets, HUD top on phones).

- [x] Build; pins green; `tsc` green.

### Task 4 — placeholders + plain words

**Files:** `src/works/tile.ts` (strip tag), `src/pages/project.ts` (status line, notice, end nav words),
`src/styles/project.css` (`.p-placeholder`), `src/pages/story.ts` (AUTO line).

- [x] Build; pins green.

### Task 5 — verify, ship

- [x] Gates: tsc, vitest (all), build.
- [x] Dev pane walk (spec § Verification) + real-Chrome CDP checks (cursor label on first hover, phone frame, legend).
- [ ] Commit(s), push, `gh run watch --exit-status`, live re-check, memory bullet, report.
