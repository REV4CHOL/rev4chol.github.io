# The Film Thread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every film page loses its synopsis line and its `SYN:` tag and gains "the thread", a quiet, still line drawing of the film's path with a few dim frames of the film's own stills, in the row where the synopsis stood and, where there is room, beside the player.

**Architecture:** Small thumbnails of six stills per film are made by a script and listed in the build's media manifest. A pure planner turns measured boxes into a description of the drawing; a pure drawer turns that description into SVG markup; a thin DOM module measures, mounts and re-plans when the boxes change. Nothing else of the page is removed.

**Tech Stack:** Vite 7 multi-page site, TypeScript (strict, `noUnusedLocals`), vitest in the `node` environment (no DOM in tests), ffmpeg/ffprobe for media, plain CSS.

Spec: `docs/superpowers/specs/2026-11-25-film-thread-design.md`.

## Global Constraints

- The owner: "no deleting anything old". Only the synopsis line (`.p-synopsis`), its `SYN:` rail tag and the `synopsis` content field leave. The arc (`.p-arc-clip`, `.p-arc`), the plus marks (`.p-plus`), `REC:`, `.p-rail-tag`'s rules and every other mark stay untouched.
- Quiet: bone (`#EDEDE6`) lines 1 px, no bone line above opacity **0.30**, no type above **0.38**, the film's accent on at most two details at **0.55**, stills at **0.40**. No fill, plate, glow, CSS `filter`, animation or transition anywhere in the thread.
- Every word is true of the film: its name, its year, its place (`P·NN/NN`), and a still's wall code (`01`, or `1-01` for a still named by part). Nothing else.
- Nothing is drawn within 14 px of the player, its corner ticks (10 px outside its box) or its label (24 px above it). The thread stands at `z-index: 1`, the player at 2.
- The band is **120 px** tall on every screen, reserved in CSS.
- Sources are mostly CRLF; keep each file's line ends. No formatter. `about-old.*` is never touched.
- Type check: `npm run check`. Tests: `npx vitest run tests/<file>` for one file, `npm test` for all. Build: `npx vite build`.
- Commits: explicit paths only (never `git add -A`), end with the `Co-Authored-By` line of the model that wrote them. Nothing private in the repo: no local paths, no names, no addresses.
- While tasks 1 and 2 run in parallel with task 3 in the same checkout: touch only the files your task lists, run only your own test files, and read `tsc` errors only for your own files.

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `src/lib/thread-files.ts` (new) | 1 | Pure: the wall's order, the six picks, a still's code, the thumbnail's size and saturation. |
| `scripts/make-threads.mjs` (new) | 1 | Writes each film's thumbnails and `public/content/threads.json`. |
| `public/content/projects/<slug>/thread/*.jpg`, `public/content/threads.json` (new, generated) | 1 | The thumbnails and their map. |
| `vite.config.ts` (modify) | 1 | The manifest gains `threads`. |
| `package.json` (modify) | 1 | `"threads": "node scripts/make-threads.mjs"`. |
| `tests/thread-files.test.ts`, `tests/threads.test.ts` (new) | 1 | The rules; the map against every film's folder. |
| `src/project/thread-plan.ts` (new) | 2 | Pure geometry and the ink table. |
| `tests/thread-plan.test.ts` (new) | 2 | The geometry's laws. |
| `public/content/projects.json`, `src/lib/content.ts`, `project.html`, `src/pages/project.ts`, `src/styles/project.css`, `HOW-TO-EDIT.md`, the tests that name the synopsis (modify) | 3 | The synopsis and its tag leave; the band and the side box stand in the markup and the styles. |
| `tests/film-thread.test.ts` (new) | 3, 4 | The page's contract. |
| `src/project/thread-draw.ts` (new) | 4 | Pure: a plan to SVG markup. |
| `src/project/thread.ts` (new) | 4 | DOM: measure, mount, re-plan. |
| `src/lib/content.ts`, `src/pages/project.ts` (modify) | 4 | `threadFrames(slug)`; the mount; the wall's captions use `stillCode`. |

---

### Task 1: The thumbnails and their map

**Files:**
- Create: `src/lib/thread-files.ts`, `scripts/make-threads.mjs`, `tests/thread-files.test.ts`, `tests/threads.test.ts`
- Create (generated, committed): `public/content/projects/<slug>/thread/<code>.jpg` for all 20 films, `public/content/threads.json`
- Modify: `vite.config.ts` (the manifest: `scanMedia`), `package.json` (scripts)

**Interfaces:**
- Consumes: nothing from other tasks. Read `scripts/make-walls.mjs` (how a script here runs ffmpeg, stops with a clear message, and imports from `src/lib/*.ts`), `vite.config.ts` (`scanStills`, `scanMedia`, `p()`), `src/project/pillars.ts` (`PART_NAME`), `tests/loop-bars.test.ts` (how a test uses ffmpeg and skips without it).
- Produces (exact):

```ts
// src/lib/thread-files.ts
export const THREAD_FRAMES = 6;            // stills per film
export const THREAD_LONG_SIDE = 192;       // px: a thumbnail's longer side (never upscaled)
export const THREAD_SATURATION = 0.15;     // turned down in the file
export const THREAD_DIR = 'thread';        // public/content/projects/<slug>/thread/
/** one entry of threads.json: a still's code, its thumbnail's width and height */
export type ThreadEntry = [code: string, w: number, h: number];
/** The wall's order: names A to Z, numbers read as numbers (vite.config.ts scanStills sorts the same way). */
export function wallOrder(files: readonly string[]): string[];
/** The places (from 0) of the stills a film's thread shows: `want` of them spread evenly, ends included. */
export function threadPicks(count: number, want?: number): number[];
/** The code a still carries: its place in its wall from 1 ('07'), led by its part when the wall stands in pillars ('2-07'). */
export function stillCode(part: number, place: number): string;
/** Each file's code, in the order given. `vertical` is the film's aspect === '9:16'. A wall stands in pillars when the
 *  film is vertical, every file is named `<part>-<n>.<ext>` and there are two parts or more (src/pages/project.ts). */
export function wallCodes(files: readonly string[], vertical: boolean): string[];
```
- `public/content/threads.json`: `{ "<slug>": ThreadEntry[] }`, one key per film, slugs in `projects.json` order, entries in pick order. The thumbnail of an entry is `projects/<slug>/thread/<code>.jpg`.
- The media manifest (`/content/media-manifest.json`) gains `threads: Record<string, ThreadEntry[]>`: the map as read, minus any film with a missing thumbnail file.

- [ ] **Step 1: Write the failing test `tests/thread-files.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { THREAD_FRAMES, stillCode, threadPicks, wallCodes, wallOrder } from '../src/lib/thread-files';

describe("a film's thread shows six of its stills, spread through its wall", () => {
  it('the wall order reads numbers as numbers', () => {
    expect(wallOrder(['10.jpg', '2.jpg', '01.jpg'])).toEqual(['01.jpg', '2.jpg', '10.jpg']);
    expect(wallOrder(['2-01.jpg', '1-02.jpg', '1-01.jpg'])).toEqual(['1-01.jpg', '1-02.jpg', '2-01.jpg']);
  });
  it('six places, evenly, the first and the last still included', () => {
    expect(THREAD_FRAMES).toBe(6);
    expect(threadPicks(43)).toEqual([0, 8, 17, 25, 34, 42]);
    expect(threadPicks(10)).toEqual([0, 2, 4, 5, 7, 9]);
    expect(threadPicks(6)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it('a film with fewer stills gives them all; none gives none', () => {
    expect(threadPicks(4)).toEqual([0, 1, 2, 3]);
    expect(threadPicks(0)).toEqual([]);
  });
  it('the picks never repeat and stay in the wall', () => {
    for (let n = 1; n <= 80; n++) {
      const p = threadPicks(n);
      expect(new Set(p).size, String(n)).toBe(p.length);
      expect(p.every((i) => i >= 0 && i < n), String(n)).toBe(true);
      expect([...p].sort((a, b) => a - b)).toEqual(p);
    }
  });
  it('a still is called by its place in its wall, led by its part in pillars', () => {
    expect(stillCode(0, 7)).toBe('07');
    expect(stillCode(2, 11)).toBe('2-11');
    expect(wallCodes(['01.jpg', '02.jpg', '05.jpg'], false)).toEqual(['01', '02', '03']); // a place, not a file's own number
    expect(wallCodes(['1-01.jpg', '1-02.jpg', '2-01.jpg'], true)).toEqual(['1-01', '1-02', '2-01']);
    expect(wallCodes(['1-01.jpg', '1-02.jpg', '2-01.jpg'], false)).toEqual(['01', '02', '03']); // pillars are a vertical film's
    expect(wallCodes(['1-01.jpg', '1-02.jpg'], true)).toEqual(['01', '02']); // one part is one wall
    expect(wallCodes(['1-01.jpg', '07.jpg'], true)).toEqual(['01', '02']); // every file named by part, or none
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/thread-files.test.ts` → FAIL (cannot find `../src/lib/thread-files`).

- [ ] **Step 3: Write `src/lib/thread-files.ts`**

```ts
/** THE THREAD'S PICTURES (owner, 2026-11-25: the film's thread stands where the synopsis stood). Pure rules shared by
 *  scripts/make-threads.mjs, the build's manifest, the film page and the tests: which stills a thread shows, what a
 *  still is called, and how small its copy is. */
export const THREAD_FRAMES = 6;
export const THREAD_LONG_SIDE = 192;
export const THREAD_SATURATION = 0.15;
export const THREAD_DIR = 'thread';
export type ThreadEntry = [code: string, w: number, h: number];

const PART_NAME = /^(\d+)-\d+\.\w+$/; // (a still named by part: src/project/pillars.ts)
const pad2 = (n: number) => String(n).padStart(2, '0');

export function wallOrder(files: readonly string[]): string[] {
  return [...files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function threadPicks(count: number, want = THREAD_FRAMES): number[] {
  if (count <= 0) return [];
  if (count <= want) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: want }, (_, i) => Math.round((i * (count - 1)) / (want - 1)));
}

export function stillCode(part: number, place: number): string {
  return part > 0 ? `${part}-${pad2(place)}` : pad2(place);
}

export function wallCodes(files: readonly string[], vertical: boolean): string[] {
  const parts = files.map((f) => { const m = PART_NAME.exec(f); return m ? Number(m[1]) : 0; });
  const pillars = vertical && parts.every((n) => n > 0) && new Set(parts).size > 1;
  if (!pillars) return files.map((_, i) => stillCode(0, i + 1));
  const seen = new Map<number, number>();
  return parts.map((part) => { const place = (seen.get(part) ?? 0) + 1; seen.set(part, place); return stillCode(part, place); });
}
```

- [ ] **Step 4: Run it and see it pass** — `npx vitest run tests/thread-files.test.ts` → PASS.

- [ ] **Step 5: Write the failing test `tests/threads.test.ts`** (the map against the real folders; ffprobe parts skip where it is not installed, as `tests/loop-bars.test.ts` does)

```ts
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THREAD_DIR, THREAD_LONG_SIDE, threadPicks, wallCodes, wallOrder, type ThreadEntry } from '../src/lib/thread-files';

// EVERY FILM'S THREAD HAS ITS PICTURES (npm run threads). Run it again after a film's stills are added, replaced or
// removed, and commit what it writes: this file fails when the map and a stills folder disagree.
const root = 'public/content/';
const films = JSON.parse(readFileSync(`${root}projects.json`, 'utf8')) as { slug: string; aspect?: string }[];
const map = JSON.parse(readFileSync(`${root}threads.json`, 'utf8')) as Record<string, ThreadEntry[]>;
const STILL = /\.(jpe?g|png|gif|webp|avif)$/i;
const ffprobe = spawnSync('ffprobe', ['-version']).status === 0;
const sizeOf = (file: string): [number, number] => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [w, h] = r.stdout.trim().split(',').map(Number);
  return [w, h];
};

describe("the threads' pictures (npm run threads)", () => {
  it('the map lists every film, and only films', () => {
    expect(Object.keys(map)).toEqual(films.map((f) => f.slug));
  });

  it("each film's entries are the six picks of its stills as they stand today, by their wall codes", () => {
    for (const f of films) {
      const stills = wallOrder(readdirSync(`${root}projects/${f.slug}/stills`).filter((n) => STILL.test(n)));
      const codes = wallCodes(stills, f.aspect === '9:16');
      expect(map[f.slug].map((e) => e[0]), `${f.slug}: run npm run threads`).toEqual(threadPicks(stills.length).map((i) => codes[i]));
    }
  });

  it('every entry has its file, and nothing else stands in the folder', () => {
    for (const f of films) {
      const dir = `${root}projects/${f.slug}/${THREAD_DIR}`;
      for (const [code] of map[f.slug]) expect(existsSync(`${dir}/${code}.jpg`), `${f.slug} ${code}`).toBe(true);
      expect(readdirSync(dir).sort(), f.slug).toEqual(map[f.slug].map((e) => `${e[0]}.jpg`).sort());
    }
  });

  it.skipIf(!ffprobe)("a thumbnail is as large as the map says, small, and in its still's own shape", () => {
    for (const f of films) {
      const stills = wallOrder(readdirSync(`${root}projects/${f.slug}/stills`).filter((n) => STILL.test(n)));
      const picks = threadPicks(stills.length);
      map[f.slug].forEach(([code, w, h], i) => {
        expect(sizeOf(`${root}projects/${f.slug}/${THREAD_DIR}/${code}.jpg`), `${f.slug} ${code}`).toEqual([w, h]);
        expect(Math.max(w, h), `${f.slug} ${code}`).toBeLessThanOrEqual(THREAD_LONG_SIDE);
        const [sw, sh] = sizeOf(`${root}projects/${f.slug}/stills/${stills[picks[i]]}`);
        expect(Math.abs(w / h / (sw / sh) - 1), `${f.slug} ${code} shape`).toBeLessThan(0.03); // (rounded to whole, even px)
      });
    }
  }, 120_000);
});
```

- [ ] **Step 6: Run it and see it fail** — `npx vitest run tests/threads.test.ts` → FAIL (no `public/content/threads.json`).

- [ ] **Step 7: Write `scripts/make-threads.mjs`** in the manner of `scripts/make-walls.mjs` (same header comment style, same `run`, same refusal when ffmpeg is missing). It must:
  1. Read `public/content/projects.json` (slug, aspect) in order.
  2. For each film: list `projects/<slug>/stills` (`/\.(jpe?g|png|gif|webp|avif)$/i`), `wallOrder` it, take `threadPicks(n)`, name each by `wallCodes(files, aspect === '9:16')[i]`.
  3. Write every thumbnail into a temporary folder first: `ffmpeg -v error -y -i <still> -vf "scale=w='if(gte(iw,ih),min(192,iw),-2)':h='if(gte(iw,ih),-2,min(192,ih))':flags=lanczos,hue=s=0.15" -frames:v 1 -q:v 5 -map_metadata -1 <tmp>/<slug>/<code>.jpg` (the numbers from `THREAD_LONG_SIDE` and `THREAD_SATURATION`), then read its real width and height with ffprobe.
  4. Only when every film succeeded: for each film empty `projects/<slug>/thread/` (remove the files it holds, create the folder), copy the new files in, and write `public/content/threads.json` as `JSON.stringify(map, null, 1) + '\n'`. On any failure print which still failed and exit 1 having written nothing.
  5. Print one line per film (`philia  6 thumbnails  21 KB`) and a total.
  Add `"threads": "node scripts/make-threads.mjs"` to `package.json`'s scripts, after `"walls"`.

- [ ] **Step 8: Run `npm run threads`**, then look at four thumbnails with the Read tool (PHILIA's first, a 2.39:1 film's, GALAXY's `1-01.jpg`, MIEN VIEN's first): each must be the whole still, nearly grey, not stretched.

- [ ] **Step 9: Run both tests and see them pass** — `npx vitest run tests/thread-files.test.ts tests/threads.test.ts` → PASS.

- [ ] **Step 10: The manifest.** In `vite.config.ts` add, beside `scanStills`:

```ts
/** Each film's thread pictures (npm run threads): the map as the script wrote it, without a film whose files are not
 *  all there (its thread is then drawn without frames). */
function scanThreads(): Record<string, ThreadEntry[]> {
  const out: Record<string, ThreadEntry[]> = {};
  try {
    const map = JSON.parse(readFileSync(p('public/content/threads.json'), 'utf8')) as Record<string, ThreadEntry[]>;
    for (const [slug, list] of Object.entries(map)) {
      if (!Array.isArray(list) || list.length === 0) continue;
      if (list.every((e) => existsSync(p(`public/content/projects/${slug}/${THREAD_DIR}/${e[0]}.jpg`)))) out[slug] = list;
    }
  } catch { /* no map: no thread pictures */ }
  return out;
}
```
  with `import { THREAD_DIR, type ThreadEntry } from './src/lib/thread-files';`, and make `scanMedia()` return `{ ...scanLoops(), walls: scanWalls(root), hover: scanHover(root), threads: scanThreads() }`. Update the comment above `scanMedia` to name `threads`.

- [ ] **Step 11: Check the manifest.** `npx vite build --outDir <a scratch folder outside the repo> --emptyOutDir`, then read `<that folder>/content/media-manifest.json`: `threads` has 20 keys of 6 entries. Delete the scratch folder.

- [ ] **Step 12: Commit**

```bash
git add src/lib/thread-files.ts scripts/make-threads.mjs tests/thread-files.test.ts tests/threads.test.ts vite.config.ts package.json public/content/threads.json public/content/projects/*/thread
git commit -m "feat(content): each film's thread has its six small pictures (npm run threads)"
```

---

### Task 2: The thread's geometry

**Files:**
- Create: `src/project/thread-plan.ts`, `tests/thread-plan.test.ts`

**Interfaces:**
- Consumes: nothing. The owner chose a mock-up of this drawing; its numbers are in the reference block below.
- Produces (exact):

```ts
// src/project/thread-plan.ts
export const THREAD_INK = {
  line: 0.24, tick: 0.12, frame: 0.26, roller: 0.22, hub: 0.3, reel: [0.22, 0.18, 0.12, 0.09],
  gate: 0.3, type: 0.36, code: 0.32, accent: 0.55, still: 0.4,
} as const;
export const THREAD = {
  bandH: 120,      // the band's height, px (project.css reserves the same)
  gap: 3,          // between the film's two hairlines
  clear: 14,       // kept clear of the player, its ticks and its label
  sideGap: 24,     // the side box starts this far right of the player's edge
  sideMin: 160,    // no side run in a narrower box
  spoolMin: 150,   // the feed spool stands in the rail only when the rail reaches this far left of the band
  phoneMax: 520,   // a band under this is a phone's
  wideMin: 1000,   // from this width a band with no side run carries five frames
} as const;

export interface Size { w: number; h: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Pic { code: string; w: number; h: number }               // a thumbnail: its still's code, its own size
export interface FilmWords { name: string; year: number; place: string }  // the name as written, e.g. 'Ever Faraway / Miên Viễn'; place 'P·14/20'
export interface PlanFrame {
  code: string; x: number; y: number; w: number; h: number;               // the frame's box (top-left, size)
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };    // where its code is written
}
export interface ThreadPlan {
  box: Box;                 // everything drawn lies inside it; the SVG's viewBox (x is negative where the rail is used)
  type: 8 | 9;              // the micro type's size, px
  path: string;             // SVG path data: the film's centre line, one continuous sub-path
  rollers: { x: number; y: number; r: number }[];
  reels: { x: number; y: number; rings: number[]; accent: boolean }[];    // radii, outermost first, at most 4 (THREAD_INK.reel by place)
  frames: PlanFrame[];
  gate: { x: number; y: number; vertical: boolean } | null;               // vertical: the film runs downward through it
  labels: { text: string; x: number; y: number; anchor: 'start' | 'end' }[];
  exit: number | null;      // a band whose film goes on beside the player: the x where it leaves the band's foot
}

/** The film's name for a label: its first line when it carries two (` / `), in capitals, broken at spaces into at
 *  most `lines` lines of `perLine` characters; a longer name trails off in '…'. A word longer than a line is cut. */
export function threadName(title: string, perLine: number, lines: number): string[];
/** The largest size of `pic`'s own shape inside maxW x maxH, whole px, at least 1. */
export function frameSize(pic: Size, maxW: number, maxH: number): Size;
/** How many frames the band carries: 3 under 520 px; 4 with a side run; else 4 under 1000 px and 5 from there. */
export function bandFrames(w: number, side: boolean): number;
/** The box beside the player, in the band's px (origin: the band's top-left): from 24 px right of the player to the
 *  body's right edge, from the band's foot to the player's foot. Null without a player or under 160 px wide. */
export function sideBox(body: Size, player: Box | null): Box | null;
/** The band's drawing. `w`: the band's width. `rail`: how far the page's rail reaches left of the band (rail + gap;
 *  0 on a phone). `side`: the side box, or null. `pics`: the film's pictures in order (the band takes the first
 *  bandFrames(w, side !== null) of them).
 *  THE HEAD: the feed spool stands in the rail when `rail >= THREAD.spoolMin` and `w >= THREAD.phoneMax`
 *  (box.x = -rail, the name in two lines of 20 and the year under the spool). Otherwise no spool: the film enters
 *  at x 0, box.x = 0, the name stands in one line of 30 at the band's top left and the year is not written.
 *  THE TAIL: under THREAD.phoneMax the film leaves at x = w past the gate (no reel; the place at the top right);
 *  with a side box it leaves the band's foot at `exit`; otherwise the gate, then the take-up reel inside the band. */
export function planBand(o: { w: number; rail: number; side: Box | null; pics: readonly Pic[]; film: FilmWords }): ThreadPlan;
/** The side run's drawing, in the side box's own px (origin: its top-left). `exit`: the band plan's exit, in the
 *  band's px. `player`: the player's box in the band's px. `pics`: the pictures the side run shows (at most 2). */
export function planSide(o: { side: Box; exit: number; player: Box; pics: readonly Pic[]; film: FilmWords }): ThreadPlan;
```

**Reference: the mock-up the owner chose** (PC, band 1684 px wide, rail + gap 164 px; numbers in the band's px, origin its top-left, y down):
- Feed spool: centre (−122, 46), rings 24 and 17 px, hub. Under it, left edge x −152: the name at y 92, the year at y 107.
- The film leaves the spool's top (y ≈ 20), runs right, falls in an S to pass under a roller at (21, 62), r 9, and runs straight at **y 60**.
- Frames hang centred on y 60: 80 px wide for a 1.9:1 picture (max box 80 x 64), their codes 12 px under them, left aligned to the frame.
- With a side run: frames at 19 %, 27 %, 58 % and 83 % of the straight run (a close pair, then wider gaps); a roller at (1168, 73), a slack loop sagging to y ≈ 109, a roller at (1368, 73), then the film turns down and leaves the band's foot at x 1381 (26 % into the side box).
- Side run (side box 411 x 635, player beside it 739 px tall): the film straight down at the exit's x; frames centred on it at 16 % and 30 % of the player's height, their codes to their left; the gate at 47 % of the player's height; the take-up reel's centre 54 px right of the film at 70 % of the player's height, rings 54, 44, 34 and 12 px; the place label right of the reel.
- No side run: five frames (a close pair, then three wider), the gate (the film runs across it: `vertical: false`) at about 87 % of the width, then the film winds onto the top of a reel centred about 124 px from the right edge, y 88, rings 28, 23, 18 and 7 px; the place label right of the reel, inside the band.
- Phone (band 394 px, rail 0): the film enters at x 0, y 60, dips under a roller at about (74, 62), carries three frames 64 px wide (max box 64 x 48), passes the gate near the right end and leaves at x = w. The name on one line at the top left (y 14), the place at the top right (`anchor: 'end'`). No reel. `type: 8`.
- Everything scales by rule, not by a zoom: fixed px near the ends, the frames by shares of the straight run. A frame takes its own picture's shape (`frameSize`), so a portrait picture stands upright (max box 80 x 64 gives about 36 x 64).

- [ ] **Step 1: Write the failing test `tests/thread-plan.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  THREAD, THREAD_INK, bandFrames, frameSize, planBand, planSide, sideBox, threadName,
  type Box, type Pic, type ThreadPlan,
} from '../src/project/thread-plan';

const film = { name: 'PHILIA', year: 2026, place: 'P·14/20' };
const wide: Pic[] = ['01', '09', '18', '26', '35', '43'].map((code) => ({ code, w: 192, h: 102 }));
const tall: Pic[] = ['1-01', '1-03', '1-05', '2-02', '2-07', '2-11'].map((code) => ({ code, w: 108, h: 192 }));
const scope: Pic[] = wide.map((p) => ({ ...p, h: 80 }));
const four3: Pic[] = wide.map((p) => ({ ...p, h: 144 }));

/** every box a plan draws: frames, rollers, reels, the gate, with its labels as points */
const drawn = (p: ThreadPlan): Box[] => [
  ...p.frames.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h })),
  ...p.rollers.map((r) => ({ x: r.x - r.r, y: r.y - r.r, w: 2 * r.r, h: 2 * r.r })),
  ...p.reels.map((r) => ({ x: r.x - r.rings[0], y: r.y - r.rings[0], w: 2 * r.rings[0], h: 2 * r.rings[0] })),
  ...(p.gate ? [{ x: p.gate.x - 13, y: p.gate.y - 13, w: 26, h: 26 }] : []),
  ...p.labels.map((l) => ({ x: l.x, y: l.y - p.type, w: 0, h: p.type })),
  ...p.frames.map((f) => ({ x: f.label.x, y: f.label.y - p.type, w: 0, h: p.type })),
];
const inside = (b: Box, o: Box) => b.x >= o.x - 0.01 && b.y >= o.y - 0.01 && b.x + b.w <= o.x + o.w + 0.01 && b.y + b.h <= o.y + o.h + 0.01;
const apart = (a: Box, b: Box, by: number) => a.x + a.w + by <= b.x || b.x + b.w + by <= a.x || a.y + a.h + by <= b.y || b.y + b.h + by <= a.y;

describe('quiet is a rule', () => {
  it('no bone line above 0.30, no type above 0.38, the accent at 0.55, the stills at 0.40', () => {
    const { line, tick, frame, roller, hub, reel, gate, type, code, accent, still } = THREAD_INK;
    for (const v of [line, tick, frame, roller, hub, gate, ...reel]) expect(v).toBeLessThanOrEqual(0.3);
    for (const v of [type, code]) expect(v).toBeLessThanOrEqual(0.38);
    expect(accent).toBe(0.55);
    expect(still).toBe(0.4);
    expect(reel).toHaveLength(4);
  });
  it('the band is 120 px, the film two hairlines 3 px apart, 14 px kept clear of the player', () => {
    expect([THREAD.bandH, THREAD.gap, THREAD.clear, THREAD.sideGap, THREAD.sideMin]).toEqual([120, 3, 14, 24, 160]);
  });
});

describe("the film's name on its thread", () => {
  it('in capitals, the English line of a two-language name', () => {
    expect(threadName('Philia', 20, 2)).toEqual(['PHILIA']);
    expect(threadName('Ever Faraway / Miên Viễn', 20, 2)).toEqual(['EVER FARAWAY']);
  });
  it('breaks at spaces into lines of at most 20, two lines, then trails off', () => {
    expect(threadName('Soft Hours & Lonely Lands', 20, 2)).toEqual(['SOFT HOURS & LONELY', 'LANDS']);
    const long = threadName("Forest Onsen - Ecopark's Eco Retreat Commercial", 20, 2);
    expect(long).toHaveLength(2);
    expect(long.every((l) => [...l].length <= 20)).toBe(true);
    expect(long[1].endsWith('…')).toBe(true);
    expect(long[0]).toBe('FOREST ONSEN -');
  });
  it('a word longer than a line is cut, not lost', () => {
    const one = threadName('mr_PURPLE_dreams_in_electric_fish', 20, 2);
    expect(one.every((l) => [...l].length <= 20)).toBe(true);
    expect(one.join('').replace('…', '').length).toBeGreaterThan(20);
  });
  it('one line for a phone', () => {
    expect(threadName('Remnants of a Dream / Tàn Tích Của Một Giấc Mơ', 30, 1)).toEqual(['REMNANTS OF A DREAM']);
    expect([...threadName('APL 2026 TEASER: Valor Rises, Battles Collide', 30, 1)[0]].length).toBeLessThanOrEqual(30);
  });
});

describe('a frame takes the shape of its own picture', () => {
  it('fits the box whole, never stretched', () => {
    expect(frameSize({ w: 192, h: 102 }, 80, 64)).toEqual({ w: 80, h: 43 });
    expect(frameSize({ w: 108, h: 192 }, 80, 64)).toEqual({ w: 36, h: 64 });
    expect(frameSize({ w: 192, h: 80 }, 80, 64)).toEqual({ w: 80, h: 33 });
    expect(frameSize({ w: 192, h: 144 }, 80, 64)).toEqual({ w: 80, h: 60 });
  });
});

describe('how many frames, and whether the film goes on beside the player', () => {
  it('3 on a phone; 4 with a side run; else 4 under 1000 px and 5 from there', () => {
    expect([bandFrames(394, false), bandFrames(519, false)]).toEqual([3, 3]);
    expect([bandFrames(520, false), bandFrames(999, false), bandFrames(1000, false), bandFrames(1684, false)]).toEqual([4, 4, 5, 5]);
    expect([bandFrames(1204, true), bandFrames(1684, true)]).toEqual([4, 4]);
  });
  it('the side box starts 24 px right of the player and needs 160 px', () => {
    const player = { x: 0, y: 176, w: 1243, h: 739 };
    expect(sideBox({ w: 1684, h: 915 }, player)).toEqual({ x: 1267, y: 120, w: 417, h: 795 });
    expect(sideBox({ w: 1426, h: 915 }, player)).toBeNull(); // 159 px
    expect(sideBox({ w: 1427, h: 915 }, player)).not.toBeNull(); // 160 px
    expect(sideBox({ w: 1684, h: 915 }, { x: 0, y: 176, w: 1684, h: 706 })).toBeNull(); // the player fills the row
    expect(sideBox({ w: 1684, h: 300 }, null)).toBeNull(); // a private film: no player
  });
});

describe('the band', () => {
  const widths = (lo: number, hi: number) => Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10);

  it('a phone: the film crosses from edge to edge with three frames and a gate, no reel', () => {
    const p = planBand({ w: 394, rail: 0, side: null, pics: wide, film });
    expect(p.type).toBe(8);
    expect(p.frames.map((f) => f.code)).toEqual(['01', '09', '18']);
    expect(p.reels).toEqual([]);
    expect(p.gate && !p.gate.vertical).toBe(true);
    expect(p.exit).toBeNull();
    expect(p.box).toEqual({ x: 0, y: 0, w: 394, h: 120 });
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', 'P·14/20']);
    expect(p.labels[1].anchor).toBe('end');
    expect(p.path).toMatch(/^M ?0[ ,]/);
  });

  it('no side run: the spool in the rail, five frames, the gate, the reel inside the band', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics: wide, film });
    expect(p.type).toBe(9);
    expect(p.frames.map((f) => f.code)).toEqual(['01', '09', '18', '26', '35']);
    expect(p.reels).toHaveLength(2);
    expect(p.reels[0].x).toBeLessThan(0); // the feed spool, in the rail
    expect(p.reels[0].accent).toBe(false);
    expect(p.reels[1].accent).toBe(true); // the take-up reel
    expect(p.reels[1].x + p.reels[1].rings[0]).toBeLessThanOrEqual(1130);
    expect(p.gate && !p.gate.vertical).toBe(true);
    expect(p.gate!.x).toBeGreaterThan(p.frames[4].x + p.frames[4].w);
    expect(p.gate!.x).toBeLessThan(p.reels[1].x - p.reels[1].rings[0]);
    expect(p.exit).toBeNull();
    expect(p.box).toEqual({ x: -164, y: 0, w: 1294, h: 120 });
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', '2026', 'P·14/20']);
  });

  it('a side run: four frames, three rollers, and the film leaves the foot inside the side box', () => {
    const side = { x: 1267, y: 120, w: 417, h: 795 };
    const p = planBand({ w: 1684, rail: 164, side, pics: wide, film });
    expect(p.frames.map((f) => f.code)).toEqual(['01', '09', '18', '26']);
    expect(p.rollers).toHaveLength(3);
    expect(p.reels).toHaveLength(1);
    expect(p.gate).toBeNull();
    expect(p.exit).toBeGreaterThan(side.x + 40);
    expect(p.exit).toBeLessThan(side.x + side.w - 40);
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', '2026']);
    expect(p.path.trim()).toMatch(new RegExp(`${p.exit}[ ,]120$`)); // (it ends at the band's foot, at the exit)
  });

  it('no rail to stand in (a small tablet upright): no feed spool; the film enters at the left edge, the reel still ends it', () => {
    const p = planBand({ w: 724, rail: 0, side: null, pics: wide, film });
    expect(p.box).toEqual({ x: 0, y: 0, w: 724, h: 120 });
    expect(p.type).toBe(9);
    expect(p.reels).toHaveLength(1);
    expect(p.reels[0].accent).toBe(true);
    expect(p.frames).toHaveLength(4);
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', 'P·14/20']);
    expect(p.path).toMatch(/^M ?0[ ,]/);
  });

  it('a rail but a band under 520 px (a narrow PC window): the phone\'s drawing, nothing in the rail', () => {
    const p = planBand({ w: 464, rail: 164, side: null, pics: wide, film });
    expect(p.box).toEqual({ x: 0, y: 0, w: 464, h: 120 });
    expect(p.reels).toEqual([]);
    expect(p.frames).toHaveLength(3);
  });

  it('a long name stands in two lines under the spool', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics: wide, film: { ...film, name: 'Soft Hours & Lonely Lands' } });
    expect(p.labels.map((l) => l.text)).toEqual(['SOFT HOURS & LONELY', 'LANDS', '2026', 'P·14/20']);
  });

  it('at every width and for every shape: all of it inside its box, the frames apart, no number missing', () => {
    for (const pics of [wide, tall, scope, four3]) {
      for (const w of widths(280, 1800)) for (const rail of [0, 164]) {
        for (const side of w >= 900 ? [null, { x: w - 300, y: 120, w: 300, h: 700 }] : [null]) {
          const p = planBand({ w, rail, side, pics, film });
          const at = `${pics[0].code} w ${w} rail ${rail} side ${!!side}`;
          expect(p.path, at).not.toMatch(/NaN|undefined|Infinity/);
          expect(p.frames, at).toHaveLength(bandFrames(w, side !== null));
          for (const b of drawn(p)) expect(inside(b, p.box), `${at} ${JSON.stringify(b)}`).toBe(true);
          for (const f of p.frames) expect(inside(f, { x: 0, y: 0, w, h: 120 }), at).toBe(true);
          for (let i = 1; i < p.frames.length; i++) expect(apart(p.frames[i - 1], p.frames[i], 8), `${at} frames ${i}`).toBe(true);
          const solid = [...p.rollers.map((r) => ({ x: r.x - r.r, y: r.y - r.r, w: 2 * r.r, h: 2 * r.r })), ...p.reels.map((r) => ({ x: r.x - r.rings[0], y: r.y - r.rings[0], w: 2 * r.rings[0], h: 2 * r.rings[0] }))];
          for (const f of p.frames) for (const s of solid) expect(apart(f, s, 4), `${at} frame and wheel`).toBe(true);
          expect(p.box.y, at).toBe(0);
          expect(p.box.h, at).toBe(120);
        }
      }
    }
  });

  it('with no pictures the film runs bare', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics: [], film });
    expect(p.frames).toEqual([]);
    expect(p.path.length).toBeGreaterThan(10);
  });
});

describe('the side run', () => {
  const side = { x: 1267, y: 120, w: 417, h: 795 };
  const player = { x: 0, y: 176, w: 1243, h: 739 };

  it('straight down from the band: two frames, the gate level with the player, the reel, the place', () => {
    const band = planBand({ w: 1684, rail: 164, side, pics: wide, film });
    const p = planSide({ side, exit: band.exit!, player, pics: wide.slice(4), film });
    expect(p.box).toEqual({ x: 0, y: 0, w: 417, h: 795 });
    expect(p.path).toMatch(new RegExp(`^M ?${band.exit! - side.x}[ ,]0`)); // (it starts where the band's film left)
    expect(p.frames.map((f) => f.code)).toEqual(['35', '43']);
    expect(p.gate && p.gate.vertical).toBe(true);
    const gateY = p.gate!.y + side.y; // in the band's px
    expect(gateY).toBeGreaterThan(player.y + 0.35 * player.h);
    expect(gateY).toBeLessThan(player.y + 0.6 * player.h);
    expect(p.reels).toHaveLength(1);
    expect(p.reels[0].accent).toBe(true);
    expect(p.labels.map((l) => l.text)).toEqual(['P·14/20']);
    expect(p.exit).toBeNull();
    for (const b of drawn(p)) expect(inside(b, p.box), JSON.stringify(b)).toBe(true);
  });

  it('in every box from 160 px wide, short or tall, landscape or upright: inside the box, the frames apart', () => {
    for (const pics of [wide.slice(4), tall.slice(4), scope.slice(4), []]) {
      for (const w of [160, 200, 260, 320, 417, 600]) {
        for (const h of [260, 400, 560, 795]) {
          const s = { x: 1000, y: 120, w, h };
          const pl = { x: 0, y: 176, w: 976, h: h - 56 };
          const band = planBand({ w: 1000 + w, rail: 164, side: s, pics: wide, film });
          const p = planSide({ side: s, exit: band.exit!, player: pl, pics, film });
          const at = `side ${w} x ${h} pics ${pics.length}`;
          expect(p.path, at).not.toMatch(/NaN|undefined|Infinity/);
          for (const b of drawn(p)) expect(inside(b, p.box), `${at} ${JSON.stringify(b)}`).toBe(true);
          for (let i = 1; i < p.frames.length; i++) expect(apart(p.frames[i - 1], p.frames[i], 8), at).toBe(true);
          expect(p.frames.length, at).toBeLessThanOrEqual(pics.length);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/thread-plan.test.ts` → FAIL (cannot find `../src/project/thread-plan`).

- [ ] **Step 3: Write `src/project/thread-plan.ts`.** The constants and signatures exactly as in **Interfaces**; the geometry from the **Reference** block, by these rules:
  - No DOM, no imports. Round every coordinate to one decimal at most (the film's straight run and the frame boxes on whole px). Never hand back `-0` (a box's `x` with no rail is `0`: the tests compare with `toEqual`, which tells the two apart).
  - The path is ONE sub-path (a single `M`): it is stroked three times. Absolute commands only (`M`, `L`, `C`, `Q`, `A`).
  - A narrow band (down to 280 px, a small phone) keeps three frames by making their box smaller, never by letting them touch.
  - `planBand` on a phone (`w < THREAD.phoneMax`): path from (0, 60) to (w, 60) with the dip under the roller; frames by shares of the run between the roller and the gate; the name by `threadName(name, 30, 1)`; `type: 8`; `box: { x: 0, y: 0, w, h: 120 }`.
  - `planBand` otherwise, with the spool (`rail >= THREAD.spoolMin`): `box: { x: -rail, y: 0, w: w + rail, h: 120 }`; the spool and its labels in the rail (`threadName(name, 20, 2)`, then the year). Without the spool: `box: { x: 0, y: 0, w, h: 120 }`, the film enters at (0, 60) as on a phone, the name by `threadName(name, 30, 1)` at the top left, `type: 9`.
  - The tail when not a phone: with `side`, `exit = Math.round(side.x + 0.26 * side.w)` clamped so the last roller and the turn fit inside the band, and the path's last point is exactly `exit 120`; without `side`, the gate, then the reel inside the band with the place right of it.
  - A frame's box: `frameSize(pic, 80, 64)` (phone: 64, 48), centred on the film's line. When the side run's frames would not fit a short box, show fewer (`planSide` may drop its second frame, then its first), never overlap.
  - `planSide`: `box: { x: 0, y: 0, w: side.w, h: side.h }`; the film straight down from `(exit - side.x, 0)`; frames, gate and reel at the reference's shares of the player's height, each clamped inside the box; the reel's radius shrinks to fit a narrow box; the place label on the side of the reel with more room.
  Add any further tests you find you need; do not weaken the ones above.

- [ ] **Step 4: Run it and see it pass** — `npx vitest run tests/thread-plan.test.ts` → PASS. Then `npx tsc --noEmit` and read only the errors in your two files (other files may be mid-change): none.

- [ ] **Step 5: Commit**

```bash
git add src/project/thread-plan.ts tests/thread-plan.test.ts
git commit -m "feat(film page): the thread's geometry: boxes in, a drawing's description out"
```

---

### Task 3: The synopsis and its tag leave; the band stands in the page

**Files:**
- Modify: `public/content/projects.json` (the 20 `"synopsis"` lines), `src/lib/content.ts:49,272`, `project.html:45-55`, `src/pages/project.ts` (`mountSynopsis`), `src/styles/project.css` (`.p-synopsis`, the wide rule, comments), `HOW-TO-EDIT.md:56,64`
- Modify tests: `content-files`, `content`, `channels`, `floor-ways`, `list-order`, `phone-order` (fixtures), `fonts`, `text-face` (the synopsis leaves the running lines), `chrome`, `pillars` (the tag rule now speaks of `REC:` alone), `player-layer` (`.p-thread`, `.p-thread-side` join the marks), `watch` (wording)
- Create: `tests/film-thread.test.ts`

**Interfaces:**
- Produces: the markup task 4 mounts into:

```html
<section class="p-sec p-film-sec">
  <div class="p-rail"></div>
  <div class="p-sec-body">
    <h2 class="visually-hidden">Film</h2>
    <div class="p-arc-clip" aria-hidden="true"><div class="p-arc"></div></div>
    <div class="p-thread" id="p-thread" aria-hidden="true"></div>
    <div class="p-watch">
      <div class="p-player" id="p-player" hidden></div>
    </div>
    <div class="p-thread-side" id="p-thread-side" aria-hidden="true" hidden></div>
  </div>
</section>
```
  and the styles:

```css
/* THE FILM'S THREAD (owner, 2026-11-25: the synopsis leaves every film page and "artwork designs" take its place,
   "muted, subtle"): the band where the synopsis stood, its height kept here so the player never moves when the
   script draws (project/thread.ts), and the box beside the player. Both stand under the player's level, take no
   pointer, and never move. */
.p-thread { position: relative; z-index: 1; height: 120px; pointer-events: none; }
.p-thread-side { position: absolute; z-index: 1; pointer-events: none; }
.p-thread svg, .p-thread-side svg { position: absolute; display: block; overflow: visible; }
.p-thread text, .p-thread-side text { font-family: var(--f-micro); letter-spacing: 0.16em; fill: var(--bone); }
```
  with, inside the existing wide rule, `.p-film-sec .p-thread { grid-column: 1 / -1; grid-row: 1; }` in place of the synopsis's line, and `.p-syn-sec` renamed `.p-film-sec` wherever it stands (`project.html`, `project.css`, `project.ts`).

- [ ] **Step 1: Write the failing test `tests/film-thread.test.ts`**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// THE SYNOPSIS LEFT EVERY FILM PAGE AND THE THREAD STANDS IN ITS PLACE (owner, 2026-11-25: "Completely remove the
// synopsis from all film's pages", then, of the artwork: "the designs need to be muted, subtle", and: "no deleting
// anything old"). Only the synopsis line and its SYN: tag left; the arc, the plus marks and REC: stand as they did.
const read = (f: string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const html = read('project.html');
const css = read('src/styles/project.css');
const page = read('src/pages/project.ts');
const rule = (sel: string) => {
  const i = css.indexOf(`\n${sel} {`);
  if (i < 0) throw new Error(`no rule for ${sel}`);
  return css.slice(i, css.indexOf('}', i));
};

describe('the synopsis is gone', () => {
  it('from the content file, its parser and the editing guide', () => {
    expect(read('public/content/projects.json')).not.toMatch(/"synopsis"/);
    expect(read('src/lib/content.ts')).not.toMatch(/synopsis/i);
    expect(read('HOW-TO-EDIT.md')).not.toMatch(/synopsis/i);
  });
  it('from the page: no line, no SYN: tag', () => {
    expect(html).not.toMatch(/synopsis/i);
    expect(html).not.toContain('SYN:');
    expect(page).not.toMatch(/p-synopsis|p\.synopsis/);
    expect(css).not.toContain('.p-synopsis');
  });
});

describe('nothing else of the section left', () => {
  it('the arc, the plus marks and REC: stand as they did', () => {
    expect(html).toContain('<div class="p-arc-clip" aria-hidden="true"><div class="p-arc"></div></div>');
    expect(css).toContain('\n.p-arc-clip { position: absolute; inset: -96px 0 -72px; overflow: hidden; pointer-events: none; }');
    expect(css).toContain('\n.p-plus {');
    expect(page).toContain("s.className = `p-plus p-plus-${tone}`;");
    expect(html).toContain('<span class="p-rail-tag" aria-hidden="true">REC:</span>');
    expect(css).toContain('\n.p-rail-tag {');
  });
});

describe('the thread stands where the synopsis stood', () => {
  it('a band before the player and a box beside it, both hidden from a screen reader', () => {
    const band = html.indexOf('<div class="p-thread" id="p-thread" aria-hidden="true"></div>');
    const player = html.indexOf('id="p-player"');
    const side = html.indexOf('<div class="p-thread-side" id="p-thread-side" aria-hidden="true" hidden></div>');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(player);
    expect(side).toBeGreaterThan(player);
    expect(html).toContain('<section class="p-sec p-film-sec">');
  });
  it('the band keeps its 120 px in the styles, so the player never moves when the script draws', () => {
    expect(rule('.p-thread')).toContain('height: 120px;');
    expect(css).toContain('.p-film-sec .p-thread { grid-column: 1 / -1; grid-row: 1; }');
  });
  it('it takes no pointer, stands under the player, and never moves', () => {
    for (const sel of ['.p-thread', '.p-thread-side']) {
      expect(rule(sel), sel).toContain('pointer-events: none;');
      expect(rule(sel), sel).toContain('z-index: 1;');
    }
    const mine = css.split('\n').filter((l) => l.includes('.p-thread')).join('\n');
    expect(mine).not.toMatch(/animation|transition|filter|sticky/);
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/film-thread.test.ts` → FAIL (the synopsis is still everywhere).

- [ ] **Step 3: The content.** Remove the `"synopsis": …` line from all 20 entries of `public/content/projects.json` (a script: read as text, drop each line matching `^\s*"synopsis": ".*",?\r?$`, check 20 were dropped and the file still parses with 20 films and no trailing comma; keep the file's line ends). In `src/lib/content.ts` remove `synopsis: string;` from `Project` (with its doc comment if it has one) and the `synopsis: str(...)` line from the parser.

- [ ] **Step 4: The page.** `project.html`: the section as in **Interfaces**. `src/pages/project.ts`: rename `mountSynopsis` to `mountFilm`… the name `mountFilm` is taken (the single player): name it `mountFilmSection`; drop the `p-synopsis` line; the plus marks' `body` selector becomes `.p-film-sec .p-sec-body`; fix the comments that say "under the synopsis" to "under the thread". `src/styles/project.css`: remove the `.p-synopsis` rule and its comment; add the four thread rules after the plus marks' rules; in the wide rule rename the section and put `.p-film-sec .p-thread { grid-column: 1 / -1; grid-row: 1; }` where the synopsis's line stood; reword the comments that name the synopsis (the section's heading comment becomes `/* -------------------------------------------- FILM: thread + player -- */`). The rail tag's rules and comments stay, the comment's SYN: history included.

- [ ] **Step 5: The guide.** `HOW-TO-EDIT.md`: remove the `synopsis` row; "the player that stands under the film's synopsis" becomes "the player that stands under the film's thread (the thin line of film with a few of its stills)"; under the `stills` row's section add: "After you add, replace or remove a film's stills, run `npm run threads` and commit what it writes: it makes the six small pictures the film's thread shows."

- [ ] **Step 6: The other tests.** Fixtures: drop `synopsis: ''` / `synopsis: '…'` from the fixtures in `channels`, `content`, `floor-ways`, `list-order`, `phone-order` and every `synopsis` assertion in `content-files` and `content` (a film's facts stay: only the synopsis lines go). `fonts.test.ts`: drop the two loops over `p.synopsis` and `['project.css', '.p-synopsis', 'f-text']` from `LINES` (the title "the five lines" becomes four). `text-face.test.ts`: drop `['project.css', '.p-synopsis']` from `LINES` and the loop over `p.synopsis` ("the four running lines" becomes three). `chrome.test.ts` and `pillars.test.ts`: the tests stay as they are; add to their comments that SYN: left the page with the synopsis (2026-11-25) and the rule now holds REC:. `player-layer.test.ts`: the marks' list becomes `['.p-plus', '.p-arc-clip', '.p-rail-tag', '.p-checks-v', '.p-thread', '.p-thread-side']` and the test's name "every mark of the film's section". `watch.test.ts`: wording only ("under the thread").

- [ ] **Step 7: Run** `npx vitest run tests/film-thread.test.ts` → PASS; `npm run check` → no error in the files of this task; `npm test` → only failures that belong to tasks 1, 2 or 4 (none are expected: their tests are their own files).

- [ ] **Step 8: Commit**

```bash
git add public/content/projects.json src/lib/content.ts project.html src/pages/project.ts src/styles/project.css HOW-TO-EDIT.md tests/film-thread.test.ts tests/content-files.test.ts tests/content.test.ts tests/channels.test.ts tests/floor-ways.test.ts tests/list-order.test.ts tests/phone-order.test.ts tests/fonts.test.ts tests/text-face.test.ts tests/chrome.test.ts tests/pillars.test.ts tests/player-layer.test.ts tests/watch.test.ts
git commit -m "feat(film page): the synopsis and its tag leave every film page; the thread's band stands in their place (owner)"
```

---

### Task 4: The thread is drawn

**Files:**
- Create: `src/project/thread-draw.ts`, `src/project/thread.ts`, `tests/thread-draw.test.ts`
- Modify: `src/lib/content.ts` (`threadFrames`), `src/pages/project.ts` (the mount; the wall's captions), `tests/film-thread.test.ts` (the mount's contract)

**Interfaces:**
- Consumes: Task 1 `THREAD_DIR`, `ThreadEntry`, `stillCode`, the manifest's `threads`; Task 2 `ThreadPlan`, `THREAD_INK`, `THREAD`, `planBand`, `planSide`, `sideBox`, `Pic`, `Box`, `FilmWords`; Task 3's markup.
- Produces:

```ts
// src/lib/content.ts
/** A film's thread pictures as the manifest lists them: code, url and own size, in order; empty when it lists none. */
export function threadFrames(slug: string): { code: string; url: string; w: number; h: number }[];

// src/project/thread-draw.ts (pure)
/** A plan as SVG markup. `accent`: the film's own colour. `href`: a frame's picture by its code, or null (then the
 *  frame is not drawn at all: no empty frame ever stands). */
export function threadSvg(plan: ThreadPlan, o: { accent: string; href: (code: string) => string | null }): string;

// src/project/thread.ts (DOM)
export interface ThreadMount {
  band: HTMLElement;            // #p-thread
  side: HTMLElement;            // #p-thread-side
  body: HTMLElement;            // .p-film-sec .p-sec-body
  rail: HTMLElement;            // .p-film-sec .p-rail
  stage: HTMLElement | null;    // the player's box, or a film in parts' stage; null when the film has no player
  film: FilmWords;
  accent: string;
  pics: { code: string; url: string; w: number; h: number }[];
}
/** Draws the thread and draws it again whenever the band's or the player's box changes. */
export function mountThread(m: ThreadMount): void;
```

- [ ] **Step 1: Write the failing test `tests/thread-draw.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { THREAD_INK, planBand, planSide, type Pic } from '../src/project/thread-plan';
import { threadSvg } from '../src/project/thread-draw';

const film = { name: 'Philia', year: 2026, place: 'P·14/20' };
const pics: Pic[] = ['01', '09', '18', '26', '35', '43'].map((code) => ({ code, w: 192, h: 102 }));
const href = (code: string) => `/content/projects/philia/thread/${code}.jpg`;
const ACC = '#8FCC6B';
const opacities = (svg: string) => [...svg.matchAll(/opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
const allowed = new Set<number>([...Object.values(THREAD_INK)].flat() as number[]);

describe('the thread as markup', () => {
  const side = { x: 1267, y: 120, w: 417, h: 795 };
  const band = planBand({ w: 1684, rail: 164, side, pics, film });
  const sideRun = planSide({ side, exit: band.exit!, player: { x: 0, y: 176, w: 1243, h: 739 }, pics: pics.slice(4), film });
  const alone = planBand({ w: 1130, rail: 164, side: null, pics, film });
  const phone = planBand({ w: 394, rail: 0, side: null, pics, film });
  const all = [band, sideRun, alone, phone].map((p) => threadSvg(p, { accent: ACC, href }));

  it('an svg in the plan\'s own box, hidden from a screen reader, taking no focus', () => {
    const svg = threadSvg(band, { accent: ACC, href });
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('viewBox="-164 0 1848 120"');
    expect(svg).toContain('width="1848" height="120"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
  });

  it('every opacity comes from the ink table: nothing brighter can be drawn', () => {
    for (const svg of all) {
      expect(opacities(svg).length).toBeGreaterThan(5);
      for (const o of opacities(svg)) expect(allowed.has(o), String(o)).toBe(true);
    }
  });

  it('no filter, no mask, no animation, no style block, no script', () => {
    for (const svg of all) expect(svg).not.toMatch(/filter|<mask|<animate|<style|<script|transition|href="javascript/i);
  });

  it("the film's accent stands on the gate's hairline and the take-up reel's dot, nowhere else", () => {
    const count = (svg: string) => svg.split(ACC).length - 1;
    expect(count(threadSvg(band, { accent: ACC, href }))).toBe(0); // (the gate and the reel are beside the player)
    expect(count(threadSvg(sideRun, { accent: ACC, href }))).toBe(2);
    expect(count(threadSvg(alone, { accent: ACC, href }))).toBe(2);
    expect(count(threadSvg(phone, { accent: ACC, href }))).toBe(1); // (a phone has no reel)
  });

  it('a frame is its picture over black, dimmed by opacity, in a hairline, with its code', () => {
    const svg = threadSvg(alone, { accent: ACC, href });
    expect(svg.split('<image ').length - 1).toBe(5);
    expect(svg).toContain(`href="/content/projects/philia/thread/01.jpg"`);
    expect(svg).toMatch(new RegExp(`<image [^>]*opacity="${THREAD_INK.still}"`));
    expect(svg).toContain('>01</text>');
    expect(svg).toContain('preserveAspectRatio="none"');
  });

  it('a picture the page cannot name is not drawn: no empty frame stands', () => {
    const svg = threadSvg(alone, { accent: ACC, href: (c) => (c === '09' ? null : href(c)) });
    expect(svg.split('<image ').length - 1).toBe(4);
    expect(svg).not.toContain('>09</text>');
  });

  it('words are escaped', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics, film: { ...film, name: 'Soft Hours & Lonely Lands' } });
    expect(threadSvg(p, { accent: ACC, href })).toContain('SOFT HOURS &amp; LONELY');
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/thread-draw.test.ts` → FAIL (cannot find `../src/project/thread-draw`).

- [ ] **Step 3: Write `src/project/thread-draw.ts`.** One function building a string. In order, all strokes `fill="none"`, 1 px unless said:
  1. `<svg xmlns="http://www.w3.org/2000/svg" viewBox="x y w h" width="w" height="h" aria-hidden="true" focusable="false">`.
  2. The film (bone is `#EDEDE6`, written as a colour attribute; tokens.css's `--bone` and `--void`): the path stroked in bone, `stroke-width="5"` (`THREAD.gap + 2`), `opacity` `line`; the same path in the page's black (`#060606`), `stroke-width="3"`, no opacity; the same path in bone, `stroke-width="2"`, `stroke-dasharray="1 7"`, `opacity` `tick`.
  3. Rollers: a circle `opacity` `roller`, a 1.2 px dot `opacity` `hub`.
  4. Reels: each ring `opacity` `reel[i]`; a 1.6 px dot: the accent at `accent` when `reel.accent`, else bone at `hub`.
  5. Frames (skipped whole when `href(code)` is null): a black rect; `<image href x y width height preserveAspectRatio="none" opacity="still">`; a hairline rect inset by 0.5 px, `opacity` `frame`; the code as `<text>` at its label, `opacity` `code`, `font-size` `plan.type`, `text-anchor` its anchor.
  6. The gate: two brackets `opacity` `gate`, and one hairline across the film in the accent at `accent` (the mock-up's shapes: a 10 px half-length, brackets 9 px either side of the film).
  7. Labels: `<text>` `opacity` `type`, `font-size` `plan.type`, escaped (`escapeHtml` from `src/lib/escape`).
  Opacities are written with `String(value)` from `THREAD_INK`, never typed in.

- [ ] **Step 4: Run it and see it pass** — `npx vitest run tests/thread-draw.test.ts` → PASS.

- [ ] **Step 5: `threadFrames` in `src/lib/content.ts`.** Beside `stillsManifest`: `let threadsManifest: Record<string, ThreadEntry[]> = {};`; in `loadLoopManifest` read `data.threads` (an object whose values are arrays of `[string, number, number]`; anything else is dropped); `threadFrames(slug)` maps each entry to `{ code, url: projectAssetUrl(slug, `${THREAD_DIR}/${encodeURIComponent(code)}.jpg`), w, h }`. Add a test to `tests/film-thread.test.ts` that `content.ts` contains `export function threadFrames(slug: string)` and reads `data.threads`.

- [ ] **Step 6: Write `src/project/thread.ts`.**

```ts
/** THE FILM'S THREAD, DRAWN (owner, 2026-11-25). Measures the band and the player, asks the planner what to draw
 *  (project/thread-plan.ts), and sets the markup (project/thread-draw.ts). The page's poster lock zooms <body>, so
 *  screen px are divided by the band's own zoom (lib/title.ts zoomOf). Still: it draws again only when a box changes. */
import { zoomOf } from '../lib/title';
import { threadSvg } from './thread-draw';
import { THREAD, planBand, planSide, sideBox, type Box, type FilmWords } from './thread-plan';

export interface ThreadMount {
  band: HTMLElement; side: HTMLElement; body: HTMLElement; rail: HTMLElement; stage: HTMLElement | null;
  film: FilmWords; accent: string; pics: { code: string; url: string; w: number; h: number }[];
}

export function mountThread(m: ThreadMount): void {
  const urls = new Map(m.pics.map((p) => [p.code, p.url]));
  const href = (code: string) => urls.get(code) ?? null;
  let last = '';
  const draw = () => {
    const z = zoomOf(m.band);
    const b = m.band.getBoundingClientRect();
    if (b.width === 0) return; // (not laid out: a hidden page)
    const body = m.body.getBoundingClientRect();
    const px = (n: number) => Math.round(n / z);
    const w = px(b.width);
    const rail = Math.max(0, px(b.left - m.rail.getBoundingClientRect().left));
    let player: Box | null = null;
    if (m.stage && !m.stage.hidden) {
      const s = m.stage.getBoundingClientRect();
      if (s.width > 0) player = { x: px(s.left - b.left), y: px(s.top - b.top), w: px(s.width), h: px(s.height) };
    }
    const side = sideBox({ w, h: px(body.bottom - b.top) }, player);
    const key = JSON.stringify([w, rail, player, side]);
    if (key === last) return;
    last = key;
    const band = planBand({ w, rail, side, pics: m.pics, film: m.film });
    m.band.innerHTML = threadSvg(band, { accent: m.accent, href });
    const svg = m.band.firstElementChild as SVGElement;
    svg.style.left = `${band.box.x}px`;
    svg.style.top = `${band.box.y}px`;
    if (side && player && band.exit !== null) {
      const run = planSide({ side, exit: band.exit, player, pics: m.pics.slice(band.frames.length, band.frames.length + 2), film: m.film });
      const top = px(b.top - body.top) + side.y;
      const left = px(b.left - body.left) + side.x;
      m.side.style.cssText = `left:${left}px;top:${top}px;width:${side.w}px;height:${side.h}px;`;
      m.side.innerHTML = threadSvg(run, { accent: m.accent, href });
      m.side.hidden = false;
    } else {
      m.side.hidden = true;
      m.side.innerHTML = '';
    }
  };
  let asked = 0;
  const ask = () => { cancelAnimationFrame(asked); asked = requestAnimationFrame(draw); };
  draw();
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(ask);
    ro.observe(m.body);
    if (m.stage) ro.observe(m.stage);
  }
  window.addEventListener('resize', ask);
}
```
  (Import only what is used: `noUnusedLocals` is on. The band's 120 px is held on both sides by tests: `tests/film-thread.test.ts` for the styles, `tests/thread-plan.test.ts` for `THREAD.bandH`.)

- [ ] **Step 7: Mount it.** In `src/pages/project.ts`: `mountFilmSection(p, stamp)` (pass the stamp from `render`), and at its end, on every branch (a film with a player, a film in parts, a private or pending film):

```ts
  // THE THREAD (project/thread.ts): drawn once the manifest has named its pictures; its band's place stands in the styles
  const stage = kind === 'watch' ? (multi ? player.querySelector<HTMLElement>('.p-parts') ?? player : player) : null;
  void loadLoopManifest().then(() =>
    mountThread({
      band: document.getElementById('p-thread')!, side: document.getElementById('p-thread-side')!,
      body: document.querySelector<HTMLElement>('.p-film-sec .p-sec-body')!, rail: document.querySelector<HTMLElement>('.p-film-sec .p-rail')!,
      stage, film: { name: p.title, year: p.year, place: stamp }, accent: p.accent, pics: threadFrames(p.slug),
    }),
  );
```
  (restructure the early `return` of the no-player branch so the mount runs for it too). The wall's captions use the shared code: `STL·${stillCode(0, n)}` and `STL·${stillCode(g.part, i + 1)}` in place of the two hand-built strings. Add to `tests/film-thread.test.ts`: `project.ts` contains `mountThread({`, `threadFrames(p.slug)`, `` `STL·${stillCode(g.part, i + 1)}` `` and no `STL·${g.part}-`.

- [ ] **Step 8: The gates.** `npm run check` → exit 0. `npm test` → all pass. `npx vite build --outDir <scratch> --emptyOutDir` → exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/project/thread-draw.ts src/project/thread.ts tests/thread-draw.test.ts tests/film-thread.test.ts src/lib/content.ts src/pages/project.ts
git commit -m "feat(film page): the film's thread is drawn where the synopsis stood, and beside the player where there is room (owner)"
```

---

### Task 5: Seen, measured, published

- [ ] **Step 1: The matrix.** On the built site, headless (the harness's visit tool, never a visible window), for PHILIA, a 2.39:1 film (`mistchild`), a 4:3 (`deathman`), TEMPTATION (`xieu-long`), GALAXY (`galaxy-z-fold-8-ultra`) and EVER FARAWAY (`mien-vien`) on a 1920 px PC, a 1366 x 768 laptop, an iPad, an iPhone and an Android phone: a picture of the section, and by eval the smallest gap between every drawn element of the thread (`#p-thread svg *`, `#p-thread-side svg *`, by `getBoundingClientRect`) and the player's box grown by its ticks (10 px) and its label (24 px above): at least 14 px (in layout px). Also by eval: `scrollWidth` equals the screen's width (no sideways scroll), the band's height is 120 layout px, the side box is hidden where the spec says there is no room.
- [ ] **Step 2: The sheet.** One picture of the band for each of the 20 films on the PC, read one by one: a frame that reads as an empty black box is named in the report (the rule picks by place, not by brightness).
- [ ] **Step 3: The old marks.** On PHILIA's page, PC and phone: the arc and both plus marks are in the picture where they were; `REC:` stands at the wall's head.
- [ ] **Step 4: Publish.** The privacy sweep of the commits' messages and added lines; `git push origin master`; watch the deploy for the sha; on the live site check `content/media-manifest.json` has `threads` for 20 films and one thumbnail answers 200; visit PHILIA and GALAXY live on a PC and an iPhone.
- [ ] **Step 5: The notes** (local only, never committed): the rulebook, the handoff, the memory. Report to the owner with pictures, saying plainly that Safari on a real iPhone was not checked.
