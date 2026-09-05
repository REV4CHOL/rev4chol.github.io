# About city overhaul — Newport City, layered and messy

Date: 2026-09-05. Owner brief: "City are feeling too uniformed and generic. The whole city now needs a total overhaul of the city design, architecture, etc., everything. I need it to feel like Ghost in the Shell, AKIRA, BLADE RUNNER. Messy city layout, overlapping structures. Also conduct a thorough review into the city's whole infrastructure and life behavior, fix anything that doesn't make sense."

Reference plates studied: the Ghost in the Shell (2017) Hong Kong pool concept (fused tenement masses, external pipework, stacked signs, AC units by the hundred, shafts of sky between walls of building); the GITS aerial (dark ground, supertalls, curving elevated roads snaking between towers, giant holographic ads, neon outlining buildings); "Carnival Plaza" (a stacked megastructure of walkways and platforms, neon cyan/magenta/orange, lanterns and cables everywhere); "Welcome to Tokyo" (elevated walkways arcing over a canyon, structures bridging the street); the neon harbour (an elevated railway over water, catwalks on stilts, giant billboards with faces, a wet mirror ground).

## What is wrong today (measured in the pane, night, ultra tier)

- From the air the city is a flat pale-blue carpet of coloured dots: the ground glow, the lamp pools and the haze wash the street level to near-white, the walls read as nothing, and every block has the same size, the same rhythm, the same gutters. The tallest things are thin LED needles.
- At street level the asphalt is white, the facades are invisible behind the glare, and the only structure is the signs floating in it.
- The layout is one uniform orthogonal grid of 24-unit lots and 14-unit streets, every building an isolated box with a 0.3–1.1 gutter round it, one clean archetype per cell. Nothing overlaps, nothing spans a street, nothing stacks. There is one elevated road and 44 thin skybridges, all above 36.
- Signage is small (hanging signs 1.5–2 wide), abstract, and evenly spread; there are three small holograms and eight screens.
- Life gaps: traffic lights exist in the simulation but are never drawn (vehicles stop for nothing); boats are car-shaped boxes with car wraps that clip through the bridge decks; people sitting on a step sit inside the wall; the boulevard's pavement offsets put walkers on the edge line; headlights burn by day; police patrols fly through the flight's canyon band.

## Goal

The city keeps its bones — the street grid, the two avenues, the canal, the highway, the diagonal, the tour route, the traffic and pedestrian simulations, the three flight modes, the time-of-day system — and grows the flesh the references have:

1. Massing that is dense, fused, stacked and layered, with legible districts instead of a smooth radial gradient.
2. Structures over structures: buildings bridging streets, catwalks and arcades at many heights, an elevated rail loop with stations and trains, more skybridges.
3. Facades crusted with the kit of a lived-in city: AC units, pipes, ducts, dishes, balconies, fire escapes, brackets, cables, water tanks, plant.
4. Signage that dominates the street: stacked giant hanging signs, billboards with painted art, LED screens, holograms over the streets, neon outlining towers.
5. A night that is dark wet ground under saturated cyan / magenta / orange sources, not a glowing floor.
6. Infrastructure and life that make sense: drawn traffic lights on the simulation's phases, real boats under the bridges, people on the catwalks and platforms, fixed offsets.

Non-goals: replacing the street grid (traffic, people, the tour and the tests depend on it); real text on any sign; changes to the page's UI; curved roads in the traffic simulation.

## Architecture

The module split stays. `city-plan.ts` (pure, tested) plans everything new as data; `city3d.ts` draws it; `city-people.ts` learns to walk raised paths; `city-sky.ts` retunes the night and dusk looks; `city-traffic.ts` is unchanged (the renderer reads its nodes to draw the lights).

New plan output (all pure data):

- `clutter: Clutter[]` — `{ kind, x, y, z, w, h, d, rotY, color? }` with kinds `ac | pipe | duct | dish | rail | escape | tank | bracket | vend | bin | crate | booth | plant | frame`. Not registered in the collision grid except `escape`, `tank` and `frame` (anything that protrudes more than a unit).
- `overbuilds` — solids with `arch: 'over'` in `core` (skinned by the renderer like any facade), spanning a street between two facing masses.
- `catwalks` — `Street`s of kind `catwalk` (a new `StreetKind`) with their own `y`, in `streets`: across alleys, along facades (arcades), and station platforms.
- `billboards: Billboard[]` — `{ x, y, z, rotY, w, h, art, lit }`, `art` an index into the renderer's painted atlas.
- `rail: { pts: [x, y, z][]; stations: { x, y, z, along: [dx, dz] }[]; portals: { x, z, y }[] }` — the elevated loop, closed, corners rounded.
- `holos` gains a `kind: 'panel' | 'ring' | 'pillar' | 'logo'`.
- `leds` (neon edges) and `wires` grow; `signs` grow and get bigger.
- `districtOf(bx, bz)` exported for tests.

## The plan

### Districts

A `district(bx, bz)` profile replaces the radial pull:

| district | where | heights | fuse | stack | kit | signs | catwalks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| heights | the blocks within two of the megastructure (NE of the plaza) | 60–150, slender | 0.3 | 2 | 0.25 | 0.6 | high skybridges |
| walled | bx 1..6, bz −7..−2 (minus the reserved lots) | 24–52, fused into one mass per lot, overbuilds across most streets | 0.9 | 3 | 1.0 | 1.0 | dense, low |
| strip | within one block of the plaza or either avenue, and along the diagonal | 20–70 | 0.5 | 2 | 0.7 | 1.2 (billboards, screens, holos) | some |
| old | bx −7..−2, bz 2..7 (minus the stadium and wheel) | 8–24, pitched roofs, lanterns, wires | 0.6 | 1 | 0.5 | 0.5 | few |
| mid | everything else | 16–60 | 0.5 | 2 | 0.6 | 0.8 | some |

Heights carry a per-block jitter (a hash of the block) of ±35 % and the odd spike (8 %) so no district is a plateau. The outer ring uses `mid` at 0.4 scale; the sprawl is unchanged.

### Massing

- Fusion: a lot whose district rolls under `fuse` builds its cells with a 0.15 seam instead of a 0.3–1.1 gutter, so the masses touch and read as one agglomerated block with jumbled heights (Kowloon).
- Stacking: every building gets up to `stack` additions: a rooftop annex (30–60 % of the footprint, 3–9 tall, offset up to a quarter of the width, allowed to cantilever up to 1.5 over a street face when its underside is above 5), and a side bustle (a box on a street face, 40–70 % of the face, 1.2–1.8 deep, 30–70 % of the height, underside above 5). Both registered in the grid.
- Overbuilds: after the lots are built, for every open road segment in the core that is not an avenue, the diagonal or under the highway, up to two spans per block face: the tallest street-facing masses either side are found (a per-lot register of street-facing solids kept during construction); an overbuild spans from face to face, 8–16 deep along the street, 6–14 tall, its underside at or above 36 (the auto-flight's canyon band is 20–32 with a 2.6 pad) and its top at least 4 below the lower of the two masses; it must fit under `allowedTop` (the tour route); walled district 70 % of candidates, strip 25 %, mid 15 %, heights 10 %, old 0. It is a facade solid (`arch: 'over'`) and sometimes carries a screen on its face over the street.
- Rooftop kit on every flat roof: a water tank on legs, an AC cluster, a stair bulkhead, a vent, a dish, a billboard frame with a roof sign, sometimes a crane (three citywide) or a rooftop shack (existing). Roofs under the route stay bare (existing `capped` rule).
- Facade kit on every street face, scaled by the district's `kit`: AC units in rows under windows, a vertical pipe run or two, a horizontal pipe at a floor, a duct, dishes, balconies with rails (existing slabs plus rail boxes) and hung laundry (small coloured quads in `tarps`), fire escapes (platforms every floor, a ladder box between, registered), cable runs along the second floor, brackets for every hanging sign, vending machines and phone booths against the wall at street level, bins and crates in alleys.
- Catwalks: two per alley at 4.5–18 (1.4 wide, rails, a lantern each end); an arcade along 15 % of street faces of 12+ length at y 5.5 (1.6 deep over the pavement, rails, lanterns; that face's hanging signs start above 9); skybridges grow from 44 to 90 and come in two builds — an enclosed glass tube (facade skin) or an open deck with rails — all still above 36 when they span a street.

### Signage

- Hanging signs: 2–5 per street face in rich districts, 1.6–3.4 wide, 6–22 tall (scaled to the building), stacked at different heights and positions, bottom above 6.5, each on a bracket. Wall signs 2.2–4 wide, 9–20 tall.
- Billboards (new): on tall street faces (30+) at 12–40 up, 8–18 wide at a 0.55 ratio, framed, two spot lamps on top; giant ones (20 × 12) on six of the tallest towers and on the megastructure; on overbuild ends. About 250. Art comes from a painted atlas of 24 designs: a big eye, a profile, a koi, a hand, a bottle, an umbrella, a circle logo, a chevron field, stripes, a sun and moon, a heart, glyph rows on gradients — abstract, no text. Kept clear of the tour route with `allowedTop`.
- Screens: eight become about forty, on strip-district faces at 8–20 up.
- Holograms: three become twelve: scrolling panels over the strip streets facing down the street, a slowly rotating ring over the plaza at 60, two light pillars, a rotating logo over the walled district, the existing three.
- Neon edges: LED strips up two edges and along the roofline of 12 % of towers over 30 (40 % in the heights), cyan / magenta / orange / lime.
- Wires across streets between facing buildings at 7–11, cable bundles along facades, lantern strings across the old town's streets at 8.
- The sign palette shifts to the plates: cyan 18, magenta 16, red 12, white 10, purple 8, blue 8, yellow 8, orange 6, lime 5, green 5.

### The rail loop

A closed elevated line along the four street lines at ±209 (streetAt(5) and streetAt(−6)), deck at 38 (the canyon band's top plus the pad is 34.6), corners rounded on a 30-unit arc over the corner lots, whose buildings are capped at 34 under it (added to `allowedTop`). Portal frames every 24 units: two legs at ±7.4 from the street centre (the lot side of the pavement, shifted along the street when the grid says a building stands there, skipped near the highway), a crossbeam at 36. Three stations at mid-block on the south, east and west sides: platforms either side of the track at 38.5 (each a `catwalk` street so people wait and walk on them), a canopy at 42, a stair tower down to the pavement. Deck and frames are registered in the grid; the ring streets are excluded from dives (`roomAhead` returns 0 for them). The renderer runs three trains of four cars round the loop with station stops (a speed profile, 240-frame dwell), lit windows, a headlight and a red tail.

### Palette and light (city-sky.ts, city3d.ts)

Night and dusk: the ground's lift drops from 1.05 to about 0.7 and its glow from 1.2 to about 0.55 (dark asphalt, the paint still brighter than it); the lamp pools drop from 0.38 to about 0.24 opacity; the fog and hemisphere go a shade deeper; the signs' colour scale rises to 1.0 and the bigger signs bloom. Window colour lists gain teal. The values are tuned by eye in the pane against the plates: the aim is a dark, wet-looking street under saturated sources, not a lit floor — while keeping the previous decree that the street level is lit by practicals and never falls to black.

### Life and infrastructure fixes

- Traffic lights: at every lit node a post on each corner with an arm over the road and a head (three lamps; the group with the green shows green, the rest red, the all-red shows red on all) and a pedestrian head on the post; instance colours refreshed every six ticks from `traffic.green(node, group)`.
- Boats: their own hull (a low box), a cabin with lit windows, bow and stern lights, hull top at 0.56 under the bridge undersides at 0.7; no car wrap, no headlight throw.
- People walk `catwalk` streets (arcades, alley catwalks, platforms): walkable, y-aware corners (a corner candidate must be within 1.5 of the same height), turn about at a dead end; sit against the wall (offset width/2 − 0.25, not 1.15 × the kerb); the diagonal's pavement is 6.3–6.9 from its axis and its lamp posts 6.1; a share of platform people stand.
- Headlights (the point sprites) dim with the lamps by day like the throws; police patrols fly at 36+.
- Whatever else the review of each module turns up is fixed in the same pass and listed in the commit.

## Testing

- `city-plan.test.ts`: districts are where the table says; fused lots have seams under 0.2; overbuilds sit at or above 36 and below both masses, none over an avenue, none under `allowedTop`; catwalks are streets with a `y`; billboards, clutter, the rail (a closed loop, 4 straight runs, 3 stations, portals off the roads and out of buildings) exist; the tour route and the avenues stay clear (existing tests); the road-clear test still passes (nothing on a road below 5); counts updated.
- `city-people.test.ts`: walkers on a catwalk stay on it and never leave its height; the sitting offset stays on the pavement.
- `city-traffic.test.ts`: unchanged (the sim is untouched); a test that every lit node has at least one drawable phase.
- AutoFlight test: still no fallbacks, still dives (the ring streets excluded), re-tuned if the reshuffled plan changes the seeds' behaviour.
- Gates: `npm run check`, `npx vitest run`, `npx vite build`; screenshots in the pane at night and day from the aerial, the canyon, the street and the canal; frame time at the high tier measured with `ride.tick` loops.

## Delivery

Four commits, each green and verified in the pane: (1) massing, districts, kit, overbuilds, catwalks; (2) signage, billboards, holos, neon, palette and light; (3) the rail, traffic lights, boats, street kit; (4) the life review fixes and polish. Deployed to Pages after each.

## As built (2026-09-05)

Departures from the design above, each for a reason found while building:

- The walled district is 44–80 tall (not 24–52) with its block jitter softened: spans need masses of 43+ either side, and the tops were too low to carry them. Spans sit at 35+ (the band's top plus the flight's pad is 34.6), and their number is found by a sweep of the masses either side of each street, not by pairing random cells.
- Skybridges over streets are capped at thirty and, like the spans, count as closures for the auto-flight, which now reads the true skyline under a chord (a cell's maximum was a spike two lots away and kept it cruising at spire height), aligns with a street at its own height before plunging, budgets a dive against the open street ahead, climbs out early, keeps orbits above the skyline, and straightens a hemmed-in knot's tangent instead of forcing a leg.
- The rail's portal legs stand at the kerb line (5.35), not on the lot side: a fused lot has no gutter to stand in. Its stations are entered by a bridge into the tower next door where one is tall enough; there is no stair tower on the pavement.
- The canal bridges stand at 1.6 with visible approach wedges (the design said nothing of the ramps; the cars climbed an invisible hump), their abutments at the water's edge so the quays' walkers pass; boats are low, their cabins under 1.35.
- Billboards start at 20-tall walls (few walls reach 30) and the giants hang on the tallest wide masses (a slender spire cannot carry a board twenty wide).
- Found and fixed on the way: the shadow map was never rendered under a moonlit look with the maps enabled, so every lit material's draw was dropped and the city showed as a carpet of dots on the shadow tiers by night since a1cca0a. One priming render fixes it.
- Lit panes are glass by day (their painted light made a Mondrian of every grid tower), windows are mostly warm and cool whites with a rare saturated pane, the wide panes burn lower.
