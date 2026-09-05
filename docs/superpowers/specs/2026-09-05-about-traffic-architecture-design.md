# About page — traffic architecture review and rebuild (design)

Owner's ask (2026-09-05): "Review the whole traffic architectural design. There are parts of the roads where
there are roads that doesn't make sense, impossible to be in real life. Highway ramp's design is one of them —
there is no ramp leading to highways in real life looking like that."

## 1. What is wrong today (the audit)

Measured on the live plan (seed `revachol-night-city`) and seen in the pane.

| # | Finding | Evidence |
|---|---------|----------|
| R1 | **The ramps.** Each is a single straight strip glued to the deck's edge, falling 14.4 units in 67 (a 21 % grade; real ramps stop at 6–8 %). It lands in the *middle* of a north–south street with its parapets running into the carriageway; the off-ramp's foot and the on-ramp's head sit 8 units apart on the same side; both sit 10–13 units from a signalised crossing that lies under the deck. Leaving the deck is a sideways jump from the edge lane across the parapet line. | `fits()`/`ramp()` in city-plan; audit: ramp feet with neighbours at 8.0 and 9.6–13.2 |
| R2 | **The deck floats.** Pillars are skipped wherever the deck's axis is within 9.5 of any street centre; the deck skews across the east–west streets at 9°, so it spends 470 of its 800 units "on a street". Nine pillars carry it; the longest unsupported run is 158. The pillars are 1.4-square sticks under a 17-wide deck, no pier caps. | audit: `deck pillars 9, longest unsupported stretch 158` |
| R3 | **A viaduct over buildings.** The deck runs over lots with buildings capped at 10 under it and shanties between the pillars. Real elevated expressways run over a surface road (Tokyo's Shuto over Route 246, the Hanshin over Naniwa-suji) or a river. | `allowedTop` highway clause |
| R4 | **Gantry posts hang in the air** at lateral 8.7, just outside the deck edge, from y 14 to 22. | plan line 1410 |
| R5 | **The canal bridges' approach wedges sit inside the quay crossings.** The quay roads run at |x| = 19 (lanes 15.3–22.8); the wedges span |x| 13–21, so quay vehicles (whose height the sim keeps at 0) drive up to 1.4 deep inside a wedge. The bridges hump 1.9 over the water because the boats needed headroom. | `streetPoint` hump, renderer wedges at ±17 |
| R6 | **44 lamp posts and ~40 lanterns stand in the canal water** (posts at |x| = 10.6, lanterns at 10.2; the water spans ±12). | audit |
| R7 | **25 signal posts stand in another street's carriageway** at the eleven six-way crossings of the diagonal boulevard (the post offset is a constant `ROAD/2 + 0.9` in every geometry). | audit |
| R8 | Ramp lamp posts stand on the carriageway edge inside the parapet; the diagonal's laid strip runs its paint into the quay road at its T; the diagonal's walkers walk on bare ground past its 12-wide strip. | plan/renderer |

Sound: the grid, the closed segments (T's and L's), the diagonal's six-way crossings, the avenue's median crossings,
the canal's quays, the rail loop's clearances, the highway's fog-end portals, the lane graph and lights.

## 2. The design

One idea fixes R1–R4 together: **the elevated highway becomes a viaduct over a surface arterial on the same
skewed axis** — the Shuto-over-Route-246 configuration. The arterial gives the ramps a road to touch down on
as merges (no T's), gives the deck a median to stand in, and replaces the buildings under the deck with a
boulevard. The skew stays: an expressway that ignores the grid is exactly the layered look the plates show,
and a boulevard cutting the grid at 9° makes the Broadway-style severances that read as a real, messy city.

### 2.1 The arterial (`kind: 'arterial'`, `ARTERIAL`)

Same axis as `HIGHWAY` (from (−400, 210) to (400, 80)). Cross-section, lateral from the axis:

| zone | lateral | note |
|------|---------|------|
| median | 0–1.8 | the deck's piers stand here |
| lanes | 3.0, 5.4 (centres) | two a side, `OFFSETS.arterial = [3.0, 5.4]`; carriageway `width: 15` |
| kerb | 7.5–8.0 | |
| apron | 8.0–16.6 | the ramps descend here; where no ramp: parked vehicles, stalls, shanties under the ramps' high parts, kiosks |
| pavement | 16.6–19.0 | walkers at 17.0–17.6; the building line at 18.5+ |

`ARTERIAL = { w: 15, apron: 8.6, walk: 2.4 }`; right-of-way half `row = 18.5`. Cells of any lot within
`row + cell/2 + 1` of the axis are dropped (as the diagonal does). Lit crossings with every north–south street
(at 81°), priority T's where a stub ends on it, dead ends at x = ±400 in the fog. Zebras across the arterial at
each crossing; lamp posts on the pavements every 12; lights under the deck. Crosses the canal on a flat skewed
bridge (§2.4). Traffic weight 1.6× a road's.

### 2.2 The deck (`HIGHWAY.y` 14 → 11)

Deck top 11.4, underside 10.6; pier caps 9.2–10.6 leave 9.2 clear over the arterial (a bus is 3.0). Piers:
a 2.2-square column in the median with a 14 × 1.4 × 2.2 hammerhead cap, two per block at each crossing ± 9.6
along the axis (so never inside a crossing's box; spacing 19.3), none over the canal. Gantry posts stand on the
parapet line (lateral 8.25). Parapets 8–8.5 as now, broken only over a ramp's taper. Median lamps as now.

### 2.3 The ramps (four, each a chain of three straight one-way `'ramp'` streets)

Left-hand traffic: the eastbound lanes ride the deck's north (+lateral) side, so the eastbound ramps are on the
north, the westbound on the south. Every ramp is `RAMP_W = 6.6` wide, one lane at offset 0, parapets on the
run, a parapet on the outer side of the taper and the slip only.

| segment | plan | profile |
|---------|------|---------|
| **taper** (30) | at deck level, from lateral 7.6 (the lane begins 1.4 outside the deck's edge lane at 6.2) diverging to 12.3; drawn as a wedge outside the deck edge | flat, y = 11.4 |
| **run** (120) | parallel to the axis at lateral 12.3 (slab 9.0–15.6, a 0.5 gap to the deck's edge, 1.0 to the pavement) on 1.2-square columns every 12 (none in a street band) | `rampProfile(u) = 0.5·u + 0.5·u²(3−2u)`: mean 9.5 %, peak 11.8 %, 4.7 % at the joints |
| **slip** (28) | at grade, converging from 12.3 to 8.6 (1.1 outside the kerb), then a merge arc into the outer lane at 5.4 over the box | flat, y = 0.05 |

Placement (axis x of the ends): EB off-ramp north: taper −311→−281, run −281→−161, slip −161→−133 (merge at
x = −133). EB on-ramp north: slip 57→85, run 85→205, taper 205→235 (diverge at 57). WB off-ramp south: taper
311→281, run 281→161, slip 161→133 (merge at 133). WB on-ramp south: slip −57→−85, run −85→−205, taper
−205→−235 (diverge at −57). An on-ramp is an off-ramp reversed (slip, run, taper).

**Severances (rule-based, from the geometry):**
- A north–south line where a slip meets the arterial (x = ±57, ±133) is *severed*: it ends at the first open
  east–west crossing on each side; the blocks either side of the closed band merge into one lot.
- Where a run passes over a north–south street lower than `RAMP.clear = 5.2` (a bus under a 0.7 slab), that
  street's *stub* on the ramp's side is closed from the arterial to the first open crossing beyond; the run on the
  other side ends **on the arterial's axis** as a priority T (the street carries `ends` pads of 18.7 so its
  walkers stop at the arterial's pavement). Outcome for these constants: north stubs at x = −209, −171, 95;
  south stubs at 171, 209, −95.
- An east–west segment (line i alongside column j) is closed when the arterial's axis comes within
  `row + STREET/2 + 0.5 = 26` of its centreline anywhere along the segment's inner range (its pavement would
  eat the street's band). Outcome: line 4 (z 171) cols −8..−1, line 3 (z 133) cols −2..6, line 5 (z 209)
  cols −10..−6, line 2 (z 95) cols 4..10, line 1 (z 57) col 10 — 30 segments; the blocks across each merge
  where both are ordinary. The crossings at (95, 133) and the like cease to exist, which is what keeps every
  junction on a north–south street ≥ 20 from the next.
- Every closed band gets a **ground patch** in the lots' stone so the tile's street paint never shows as a
  ghost road.

### 2.4 The canal, sunk (`CANAL = { w: 24, water: −2.6, deck: 0.05 }`)

The water drops 2.6 below street level between stone quay walls; every bridge deck is flush with the street
(0.6 thick, top at 0.05), the bowstring arches spring from it, the abutments become the walls, the approach
wedges and the road hump go. The boats keep 0.7 of headroom under the decks. The stilt huts stand on 2.9-tall
stilts from the water; the quay lamps move onto the quay (posts at |x| = 13.0, lanterns at 12.4). The arterial
crosses on a 37-wide skewed girder bridge with balustrades. The ground plane becomes two halves with a slot for
the water.

### 2.5 Small fixes

- Signal posts stand at the corner of the two pavements: `along = row(cross) + 0.9`, `left = row(street) − 1.2`
  (the arterial's own approaches: at its kerb, `w/2 + 0.9`); a post that would still land inside another
  street's carriageway is pushed out along its street's left normal, else dropped.
- Ramp lamps on the parapet tops (lateral ±(RAMP_W/2 − 0.25), base y + 0.9).
- The diagonal's laid strip becomes a polygon clipped at the avenue roads' kerbs, 16 wide with painted
  pavements; the arterial's strip is 37 wide with its apron and pavements painted.
- Per-street boxes in the lane graph: a street's lanes stop `row(other) + KERB` before a node (the north–south
  approaches to the arterial stop at 20, before its pavement; the arterial's stop at 8.5).

### 2.6 Traffic graph rules

- Ramp ends join: another ramp's end within 0.6 → a shared joint node; else at deck height → the highway
  within 10 (cut at the projection); else → the nearest surface street within 12 (the arterial) at the projection.
- Only the outermost lane of a highway *or an arterial* exits onto a ramp; a ramp joins the outermost lane of
  whatever it lands on; ramp → ramp only straight (the taper and slip angles are 8.9° and 7.5°).
- No lights at a node with a highway or a ramp street (joints and merges are unlit, the merging lane yields by
  gap); the arterial's crossings with roads are lit; its T's run on priority.
- `streetPoint` loses the canal hump; ramps use `rampProfile`.

### 2.7 People

`'arterial'` is walkable: pavement band |off| ∈ [17.0, 17.6], sitters at 18.1, corners accept a candidate
whose band lies within 2.5 of the walker; `endOf` honours a street's `ends` pads. Walkers never cross the
arterial itself (as with the diagonal); north–south walkers cross it on their own pavement line inside the box.

## 3. Testing

Plan: kinds include `arterial`; 12 ramp segments in 4 chains meeting end to end (position and height within
0.05); run grades ≤ 12.5 %, taper and slip flat; the high end 7.6 from the deck axis at deck height, the low end
8.6 from the arterial axis at 0.05; no open north–south road under a ramp point lower than 5.2; no east–west road
within 26 of the arterial's axis; north–south T's on the axis carry `ends` ≈ 18.7; piers ≥ 36, spacing ≤ 20
(≤ 50 across the canal), none within 9 of a crossing; no lamp post in the water; 21 bridges (20 axis-aligned,
one skewed); patches > 20; every road, arterial lane and ramp clear of solids.
Traffic: ramp chains connected (end nodes ≥ 3 ports, joints 2); vehicles on the arterial; lit crossings and unlit
T's on it; per-street boxes (road lanes end ≥ 19.5 from an arterial node, arterial lanes ≤ 9); the existing
4000-frame no-overlap/no-vanish test still green.
People: arterial walkers in band and ≥ 20 of them; nobody past a road's `ends`.

## 4. Delivery

Spec → plan → implement in five tasks (plan, traffic, people, renderer, docs) → typecheck, 190+ tests, build →
verify in the pane (an interchange from above and from the arterial; a quay crossing; the six-way crossings;
the auto flight 1500 ticks) → commit per task → push → deploy green.
