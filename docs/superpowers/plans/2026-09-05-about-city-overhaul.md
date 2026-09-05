# About City Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the about page's uniform grid city into a dense, layered, fused, sign-crusted Newport City (Ghost in the Shell / Akira / Blade Runner) while keeping the traffic, pedestrians, flights and time-of-day working, and fix what does not make sense in the city's infrastructure and life.

**Architecture:** `city-plan.ts` (pure, tested) plans every new thing as data — districts, fused and stacked massing, overbuilds spanning streets, catwalks and arcades, rooftop and facade kit, giant signage and billboards, the elevated rail loop; `city3d.ts` draws them with instanced meshes and painted atlases; `city-people.ts` walks raised paths; `city-sky.ts` retunes the night. The traffic simulation is untouched; the renderer reads its nodes to draw the lights.

**Tech Stack:** Vite 7, TypeScript strict, three.js 0.185, vitest. Spec: `docs/superpowers/specs/2026-09-05-about-city-overhaul-design.md`.

## Global Constraints

- No real text on any sign or billboard (glyph blocks and abstract art only).
- The tour route stays clear of every solid (`allowedTop` caps anything under it; the route test uses `CAM_R + 1.0`).
- Nothing solid spans a street below 36 (the auto-flight's canyon band is 20–32, pad 2.6), except over alleys.
- Nothing stands on a road or a pavement below 5 (`keeps every open road clear` test: `grid.hit(x, 2, z, 0.3)` at offsets 0 and ±6).
- The avenues stay open down the middle (`grid.hit(3, 12, t, 1)`).
- `npm run check`, `npx vitest run`, `npx vite build` green before every commit; the pane verified after every task that draws.
- Work through Bash where it can do the job; long files through node edit scripts written with the Write tool (heredocs truncate around 6 KB).
- Commit format: `git -c core.safecrlf=false commit -q -F <msgfile>`, deploy watch with `gh run watch <id> --exit-status`.

---

### Task 1: Districts, fused and stacked massing, rooftop and facade kit, overbuilds, catwalks (plan)

**Files:**
- Modify: `src/about/city-plan.ts` (the `Plan` interface, `planCity` massing: `buildLot`, `building`, archetypes, `roofBits`, `clutter`, new `district`, `stackOn`, `roofKit`, `facadeKit`, `overbuilds`, `catwalks`)
- Test: `tests/city-plan.test.ts`

**Interfaces:**
- Produces:
  - `export type District = 'heights' | 'walled' | 'strip' | 'old' | 'mid'`; `export function districtOf(bx: number, bz: number): District`.
  - `export type ClutterKind = 'ac' | 'pipe' | 'duct' | 'dish' | 'rail' | 'escape' | 'tank' | 'bracket' | 'vend' | 'bin' | 'crate' | 'booth' | 'plant' | 'frame' | 'beam'`; `export interface Clutter { kind: ClutterKind; x: number; y: number; z: number; w: number; h: number; d: number; rotY: number; color?: string }`; `Plan.clutter: Clutter[]`.
  - `Arch` gains `'over' | 'annex'`; `StreetKind` gains `'catwalk'`; a catwalk `Street` has `y` set and `width` 1.4–2.4.
  - `Plan.faces` not exported; overbuilds are `core` solids with `arch: 'over'`.

- [x] Step 1: Write failing tests in `tests/city-plan.test.ts`: `districtOf` returns `walled` for (3, −5), `heights` for (4, −2), `old` for (−5, 5), `strip` for (1, −1) and (−7, 1); the plan has `> 8000` clutter entries with every kind present; `> 40` `over` solids, each with `y − h/2 >= 36`, none with `|x| < MEDIAN + 20 && |z| < ...` (none over an avenue: for each, not (`|x| < 27` or `|z| < 27`)); `> 150` catwalk streets each with a finite `y >= 4`; fused lots: at least 300 pairs of core facade solids whose faces are within 0.2 of each other.
- [x] Step 2: Run `npx vitest run tests/city-plan.test.ts` — expect failures on the missing exports/fields.
- [x] Step 3: Implement in `city-plan.ts`: `districtOf`, the district profile table, per-block height jitter, seam fusion in `buildLot`, `stackOn(fp, h, top, allowed, profile)` (annex + bustle, registered), `roofKit`, `facadeKit` (clutter, brackets reserved for Task 2), the street-face register (`faces: Map<string, Solid[]>` keyed `${axis}:${i}:${j}:${side}`), `overbuilds()` after the lots, `catwalks()` (alley catwalks + arcades; arcades recorded so Task 2 raises that face's signs).
- [x] Step 4: Run the plan tests and the whole suite; fix the AutoFlight/roomAhead expectations if the reshuffle breaks them (dives counted across seeds).
- [x] Step 5: Commit `feat(about): districts, fused and stacked massing, overbuilds, catwalks, the facade and rooftop kit (plan)`.

### Task 2: Draw the kit, the overbuilds and the catwalks; first light rebalance

**Files:**
- Modify: `src/about/city3d.ts` (a `clutter` section after the skins: one InstancedMesh per kind family with its own material; catwalk decks/rails/lanterns from the catwalk streets; overbuilds already skinned through the buckets), `src/about/city-sky.ts` (night/dusk ground values).

**Interfaces:**
- Consumes: `plan.clutter`, catwalk streets, `arch: 'over'` solids.

- [x] Step 1: Materials: `kitMat` (Lambert `#6c7284` galvanized), `rustMat` (`#5a3a2a`), `acMat` (`#b8bcc4` with a dark grille face via a 3-material box), `vendMat` (MeshBasic instance-coloured, emissive look), `boothMat` (Lambert `#2a3a5a` + a lit glass strip), `deckMat` (`#3a3f52`).
- [x] Step 2: Build the instanced meshes by kind; rotation from `rotY`; `castShadow` false for the small kinds.
- [x] Step 3: Catwalks: for each catwalk street a deck box (len × 0.25 × width), two rails (0.06 × 1.0 × len at ±(width/2 − 0.1)), lanterns at both ends and every 6 units (pushed into a local `glowPoints` array).
- [x] Step 4: Night/dusk in `city-sky.ts`: `groundLift` 0.72, `groundGlow` 0.55, pool opacity 0.24 in `city3d.ts`; verify in the pane from the four views (aerial, canyon, street, canal) that walls now read as masses and the ground is dark with the paint still visible.
- [x] Step 5: `npm run check && npx vitest run && npx vite build`; commit `feat(about): the kit drawn — AC, pipes, ducts, dishes, escapes, tanks, catwalks; a darker wet street`.

### Task 3: Signage — giant hanging signs, brackets, billboards atlas, screens, holograms, neon edges, wires; the palette

**Files:**
- Modify: `src/about/city-plan.ts` (`dress`, `SIGN_COLORS`, `Billboard`, `Plan.billboards`, holo kinds, neon edges, street wires), `src/about/city3d.ts` (billboard atlas painter, instanced billboard mesh with `aArt`, holo builders by kind, sign colour scale), `src/about/city-skins.ts` (window colour lists unchanged; the renderer's `COOL` gains teal).
- Test: `tests/city-plan.test.ts` (billboards > 200, none over the route: `allowedTop`-checked; holos 12 with all four kinds; signs > 8000 with hanging signs ≥ 1.6 wide; leds > 400).

**Interfaces:**
- Produces: `export interface Billboard { x: number; y: number; z: number; rotY: number; w: number; h: number; art: number; lit: number }`; `Holo` gains `kind: 'panel' | 'ring' | 'pillar' | 'logo'`.

- [x] Step 1: Tests first (counts and invariants above); run, expect failures.
- [x] Step 2: Plan: bigger stacked hanging signs with brackets (clutter `bracket`), wall signs bigger, billboards on tall faces and overbuild ends and the six tallest, screens ×40, holos ×12 by kind, neon edges by district, wires across streets, lantern strings in the old town, the palette weights.
- [x] Step 3: Renderer: `billboardAtlas(rand)` paints 24 designs into a 6×4 atlas of 96×64 cells; an instanced plane with `aArt` (instance attribute) offsetting the uv in a patched MeshBasicMaterial; a frame box behind each (clutter `frame`); two spot glow points; holo builders: panel (existing), ring (open cylinder, additive, rotating, glyph texture), pillar (tall thin additive cylinder), logo (disc with a painted logo, rotating).
- [x] Step 4: Pane: street view down a strip street and the walled district; signs dominate, billboards readable, holos visible over the streets.
- [x] Step 5: Gates, commit `feat(about): signage that owns the street — stacked neon, billboards, screens, holograms, neon edges`.

### Task 4: The rail loop, stations and trains

**Files:**
- Modify: `src/about/city-plan.ts` (`Plan.rail`, `RAIL` constants, portals, stations as catwalk platforms, `allowedTop` cap under the corner arcs, `roomAhead` returns 0 on the ring streets), `src/about/city3d.ts` (deck, portal frames, station canopies and stairs, three trains on a `CatmullRomCurve3` closed loop with a speed profile).
- Test: `tests/city-plan.test.ts` (rail: a closed polyline, first and last within 1 unit; every point at y 38; ≥ 3 stations; portals: every portal foot clear of the grid at y 2 (`grid.hit(x, 2, z, 0.2)` null before its own registration is checked by position: |lat from its street| ≥ 7) and off the roads; `roomAhead('x', 209, 0, 1) === 0`).

- [x] Step 1: Tests first; run; fail.
- [x] Step 2: Plan: `RAIL = { at: 209, y: 38, r: 30 }`, the polyline (straight runs + 8-point arcs), portals every 24 with the grid check, stations at mid-block (`t` = the block centre) on S/E/W, platforms as catwalk streets, the deck chain and frames registered.
- [x] Step 3: Renderer: deck (box chain along the polyline), rails (two thin boxes), portal legs and beams (instanced), station canopy (box + glow), stairs (a box chain), trains: `InstancedMesh` of 12 cars, `curve.getPointAt`/`getTangentAt`, a per-train `s` with a profile (cruise 0.9, station dwell 240 frames, ease in/out over 30 units), window strips (emissive), head/tail points.
- [x] Step 4: Pane: the loop visible from the aerial; a train passing a station; the auto flight still dives (probe over 4000 ticks: `flight.dives` via a new `probe` field `dives`).
- [x] Step 5: Gates, commit `feat(about): an elevated rail loop with stations and trains`.

### Task 5: Traffic lights, boats, street kit, life fixes

**Files:**
- Modify: `src/about/city3d.ts` (traffic light instanced posts/arms/heads refreshed from `traffic.green`; boats as hull + cabin + lights; headlight points dimmed with the lamps), `src/about/city-people.ts` (catwalk walking, y-aware corners, sit offset, diagonal pavement), `src/about/city-plan.ts` (diagonal posts at 6.1, patrol air lanes at 36, street kit clutter: `vend`, `booth`, `bin`, `crate`).
- Test: `tests/city-people.test.ts` (a catwalk walker stays within its street's width and at its y for 3000 frames; a sitter's |off| ≤ width/2 − 0.2), `tests/city-traffic.test.ts` (every lit node has ≥ 2 groups and `green` is true for exactly one group at any tick outside the all-red).

- [x] Step 1: Tests first; run; fail.
- [x] Step 2: People: `walkable` includes `catwalk`; `kerb` for catwalk `(rand − 0.5)·(width − 0.9)`; `endOf` catwalk 0.6; `turnCorner` skips candidates with `|s.y − st.y| > 1.5`; sit offset `sign·(width/2 − 0.25)`; diagonal kerb `sign·(width/2 + 0.6 + rand·0.4)`; `sameSide` accordingly.
- [x] Step 3: Renderer: lights at every `n.signal` node — for each port's street, a post at the near-left corner (`n.x ± (box)`, `n.z ± (box)`) with an arm and a head; every 6 ticks set head colours by `traffic.green(n, group)` (green `#3dff8f`, red `#ff3b3b`, all-red red); boats; headlight dim.
- [x] Step 4: Pane: a lit crossing shows heads changing with the queue; boats pass under a bridge; walkers on an arcade.
- [x] Step 5: Gates, commit `fix(about): lights the vehicles stop for, real boats, people on the catwalks, offsets that make sense`.

### Task 6: Review pass, polish, deploy

- [x] Step 1: Walk the city in the pane in all five looks from the four views and the auto flight for 3000 ticks; list anything that reads wrong (clipping, floating kit, over-bright, missing shadows by day on the kit) and fix.
- [x] Step 2: Frame time at the high tier: `performance.now()` over 120 `ride.tick()` calls at 1280×720 in the pane; if the average exceeds 26 ms, halve the smallest kit (dishes, crates) first.
- [x] Step 3: Update the memory file entry and the plan checkboxes; push; watch the deploy; report.
