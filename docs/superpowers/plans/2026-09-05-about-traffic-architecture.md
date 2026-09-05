# Traffic Architecture Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every road in the about-page city physically plausible: a viaduct over a surface arterial with real ramps, a supported deck, a sunken canal with flush bridges, furniture out of the carriageways.

**Architecture:** `city-plan.ts` grows an `ARTERIAL` street on the highway's axis, rule-based severances of the grid (closed east–west segments, severed and stubbed north–south streets with merged lots and ground patches), four three-segment ramp chains, deck piers, and a sunken canal; `city-traffic.ts` learns per-street boxes and ramp joints/merges; `city-people.ts` learns the arterial's pavement and `ends` pads; `city3d.ts` draws it all (piers, wedges, slips, the arterial strip, zebras, patches, quay walls, flush bridges, a skewed bridge, corrected signal posts, parked vehicles).

**Tech Stack:** Vite 7, TypeScript strict, three.js 0.185, vitest 3.

## Global Constraints

- `HIGHWAY.y = 11`; `ARTERIAL = { w: 15, apron: 8.6, walk: 2.4 }` (row 18.5); `RAMP_W = 6.6`; `RAMP = { taper: 30, run: 120, slip: 28, lat: 12.3, mount: 7.6, foot: 8.6, clear: 5.2 }`; `CANAL = { w: 24, water: -2.6, deck: 0.05 }`.
- Left-hand traffic: eastbound ramps north of the deck, westbound south.
- No real text on any sign; calm mode stills idle motion; about-old.html untouched; no plates behind chrome.
- Gates before every commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task 1: The plan — arterial, severances, ramps, piers, sunken canal

**Files:** Modify `src/about/city-plan.ts`; Test `tests/city-plan.test.ts`.

- [x] Constants: `HIGHWAY.y 11`, `ARTERIAL`, `ARTERIAL_ROW`, `RAMP_W 6.6`, `RAMP`, `rampProfile`, `rampY` via it, `CANAL.water/deck`; `StreetKind` gains `'arterial'`; `Street` gains `ends?: [number, number]`; `Plan` gains `piers`, `patches`, `parked`; `bridges` become `{ x, z, yaw, w, span }`.
- [x] `arterialZ(x)`, `arterialLat(x, z)`; the four ramp chains built from `RAMP` (a helper `chain(side, dir, xMerge)`), pushed to `ramps` before the lots (so `allowedTop` sees them).
- [x] Severances: `closedX` for east–west segments within 26; severed lines at the slips' x; stubs where a run is lower than `clear` over a north–south line; `stubCut` map (line → z of the arterial, side) used by the `roads` assembly to end/start the surviving run on the axis with `ends`; merges across closed bands where ordinary; `patches` for every closed band.
- [x] `building()` drops cells within `ARTERIAL_ROW + cell/2 + 1` of the axis; the sprawl's massing skips the axis too.
- [x] Piers at every crossing ± 9.6 (skip |x| < 13) as 2.2-square solids + `plan.piers`; the old pillar loop, squats and interchange block removed; gantry posts at lateral 8.25; ramp lamps on the parapets; arterial lamps on the pavements; apron dressing (`parked`, stalls, shanties under the runs' high parts, kiosks).
- [x] The canal: bridges at `CANAL.deck`, a skewed bridge entry for the arterial, quay posts at ±13.0 / lanterns ±12.4, stilt huts on the water.
- [x] Tests: ramps (12 segments, 4 chains, joints continuous, grades, ends), no road under a low ramp, no east–west road within 26, T's carry `ends`, piers, no post in the water, 21 bridges, patches, arterial lanes clear.
- [x] Commit: `feat(about): an arterial under the viaduct, real ramps, piers, a sunken canal (plan)`.

### Task 2: The traffic graph

**Files:** Modify `src/about/city-traffic.ts`; Test `tests/city-traffic.test.ts`.

- [x] `OFFSETS.arterial = [3.0, 5.4]`, `SPEED.arterial = 1.25`; `surface()` includes the arterial; `rowOf(street)`; per-street boxes at lane trimming (`boxFor(node, street) = KERB + max row of the other streets`).
- [x] Ramp joins: joint (another ramp end within 0.6), deck (highway within 10 at deck height), foot (surface street within 12); wiring: edge lane only onto a ramp from highway or arterial; a ramp lands on the outermost lane; ramp→ramp straight only.
- [x] `streetPoint`: no hump; `rampProfile`.
- [x] Tests: kinds include arterial; chains connected; arterial populated; lit crossings / unlit T's; boxes; the 4000-frame test green.
- [x] Commit: `feat(about): the lane graph learns the arterial, ramp chains and per-street boxes`.

### Task 3: People

**Files:** Modify `src/about/city-people.ts`; Test `tests/city-people.test.ts`.

- [x] Walkable arterial; `band()` per kind used by `kerb`, `offOn`, `sameSide`, `turnCorner`; `sitOff` arterial; `endOf(st, end)` with `ends`.
- [x] Tests: arterial walkers in band, ≥ 20; nobody past `ends`.
- [x] Commit: `feat(about): walkers on the arterial's pavements, stopped at its edge`.

### Task 4: The renderer

**Files:** Modify `src/about/city3d.ts`.

- [x] Deck at 11 with caps on the plan's piers, under-deck lights, parapet gaps over the tapers, gantry posts on the parapet.
- [x] Ramps: run pieces with parapets; taper wedge and slip slab as polygons with an outer parapet; columns from the plan.
- [x] The arterial strip (37 wide, apron and pavements painted), zebras at its crossings, ground patches, parked vehicles.
- [x] Signal posts at the pavement corners, pushed out of carriageways; lamp arms know the arterial.
- [x] The canal sunk: ground in two halves, quay walls, water and mirror at −2.6, flush bridges without wedges/abutments, the skewed arterial bridge, boats and huts on the water.
- [x] The diagonal's strip as a clipped 16-wide polygon.
- [x] Verify in the pane: both interchanges from above and from the arterial; a quay crossing; a six-way crossing; night and day; auto flight 1500 ticks; WebGL error 0.
- [x] Commit: `feat(about): the viaduct drawn over its arterial — piers, ramps, a sunken canal, honest signals`.

### Task 5: Docs, memory, deploy

- [x] Spec "as built" appendix; memory entry; push; deploy green.
