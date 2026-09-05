# About page — the life pass (design)

Owner's list (2026-09-05), twenty items: one on the homepage, nineteen on the about page's city. Grouped here
by what they share, each with the design decision.

## A. Quick fixes

| item | decision |
|------|----------|
| H1 "noice weather innit?" | the homepage CTA row goes (the phrase and its prompt); nothing else references it |
| 7 motorcycles sway | the lane weave is removed |
| 11 default time | the about page always opens at NIGHT; the switch still works for the visit, the choice is no longer remembered |
| 12 mobile pad | the stick moves to the bottom right, the rise/sink buttons to the bottom left; the stick's x is negated (left is left) |

## B. Furniture out of the carriageways (items 2, 15)

A plan post-pass removes every lamp post, kiosk, stall and tree standing inside any carriageway (road ±5,
boulevard ±4.9, arterial ±7.5, ramp ±3.3, deck ±8) — the grid roads' kerb posts ran on through the boulevard's
six-way crossings. The deck's median lamps move to its parapets. A test asserts no post in any carriageway.
Photo 1's "weird road" is the six-way crossing drawn as two overlapping crossings: the boulevard's lane paint
runs through the box over the grid tile's zebras and stop lines. Each six-way crossing gets a plain asphalt box
polygon (the union of the three carriageways) with zebras and stop lines on all six arms.

## C. People and vehicles (items 3, 4, 8, 9)

- **Nobody walks through a solid.** Street kit at ground level (vending machines, booths, bins, crates) registers
  in the collision grid; a walker's next step is tested against the grid and, if blocked, steps toward the kerb
  or turns about.
- **Crossings.** A walker reaching a cross street along their pavement waits at the kerb until that street's
  vehicles have the red (lit) or no vehicle is within 14 of the crosswalk and closing (unlit) — the same rule
  their own-street crossings already use — then crosses at a brisk pace. Vehicles yield to walkers: a lane whose
  stop line faces a crosswalk with a walker in it holds, as it does for the box. The two sims exchange two
  hooks: `roadClear(x, z, axis)` from the traffic and `walkersIn(x, z, axis)` from the people.
- **Under the bridges.** The quay roads' water-side pavement is not walked (it passes under every bridge deck);
  east–west walkers cross the canal on the bridges, whose decks are the street's full 14 wide with the
  handrails outside the pavement.
- **Vanishing.** People go in only at doors — the plan lists a door at every lit shopfront and at every station
  entrance — and come out of them; nobody steps into a blank wall.

## D. Stations (items 1, 5)

- Each elevated station gets two access towers on the pavements at the platform's ends: a stair core with lit
  landings, a glass lift shaft with a cab that rides up and down, a landing bridge to the platform, a lit
  entrance at the pavement (a door for the walkers).
- Eight underground station entrances at major crossings: a stairwell opening with painted steps, railings, a
  canopy on two posts, a lit sign block (no text); walkers go down and come up (doors).

## E. Life and variety (items 13, 14, 16, 17, 18, 19)

- **The plaza** (item 19): the dark disc becomes a paved circular plaza over the canal (light paving, a kerb
  rim, planters and benches, the ring of lamps), spanning the water as a wide bridge deck; at its centre a
  monumental voxel STALLION rearing on a plinth, lit by four spots. A crowd mills on it.
- **The boulevard** (item 18): bunting and paper lanterns strung between the trees, two festival stages in the
  median with screens and crowds, more stalls, knots of people; fireworks stay.
- **Rooftop parties** (13): eight flat roofs (top 30–70, off the route) get string lights around the edge, a DJ
  box with a strobe, and a crowd milling at roof height (zones carry a height now).
- **Balconies** (14): one in four balcony slabs carries a perch; a person stands, leans on the phone, sits or
  talks in pairs there, facing out — stationary acts that swap over time.
- **The canal** (16): bridges in five builds by position (bowstring, girder with lamps, cable-stayed with a
  pylon, truss, covered footbridge deck), quay stairs down to the water, moored boats, a pump house.
- **Chaos** (17): three pedestrian market streets (closed to traffic, stalls down the middle under canopies and
  lanterns), conduit bridges between facing masses at 12–18, more block merges, taller spikes and more overbuilds
  in the mid district, rooftop cooling towers and greenhouses.

## F. Shimmer (item 6)

The shadow frustum follows the eye every frame, so the shadow map's texel grid drifts and every shadow edge on a
facade crawls — the "glitching windows". The target is snapped to shadow texels in the light's frame. Every
pixel texture minifies through mipmaps with anisotropy (crisp nearest magnification stays). Normal bias 0.8.

## G. The zen camera (item 10)

The auto flight's pan is damped already but capped at 31°/s with a 9° bank; the eye's target steps when a
subject is chosen or released. New: the target point slews (a step becomes a glide), yaw capped at 12°/s and
pitch at 8°/s with softer gains, bank at 3°, the camera position follows the path through a short lag, and the
auto speed drops a third. Measured: the largest per-frame yaw change and its change of change over 3000 ticks.

## Testing and delivery

Plan tests: no post in a carriageway, doors > 300, perches > 200, party zones 8, station access towers 6,
subway entrances 8, market streets 3 walkable, bridge kinds ≥ 5. People tests: nobody inside a grid solid on
a pavement, crossers only on red/clear, nobody on the quay's water side, entries only at doors. Traffic: a
lane facing an occupied crosswalk holds. Pane: photos 1–5 retaken, night, auto flight smoothness numbers.
Commits per group; deploy after C and at the end.

## As built (2026-09-06)

- **A** as designed. The address may still ask for a time (`?tod=dawn`); nothing is remembered.
- **B**: the post-pass also drops a removed kiosk's tag sign; `carriagewayAt` treats a ramp's carriageway as inside its
  parapets and the deck's as inside its kerbs, so the lamps on both stand. The six-way boxes are three overlapping
  asphalt quads a hair apart in height (no z-fight), zebras at every arm, stop lines only for the boulevard (the tile
  paints the roads').
- **C**: the crosswalk census is taken at the end of the people's step; the traffic reads it next frame. A blocked
  walker sidesteps 0.7 or 1.2 either way (kit stands at the wall, portal legs at the kerb). A run ending at a quay
  road no longer flips its walkers to the far quay: the water band is 12.5 (the coping is walked) and quay roads are
  never crossed. Doors carry their own offset; the exit returns to the walker's pavement band. The knots of talk are
  placed inside a street's walkable run (one stood past a short catwalk's end).
- **D**: the stair cores are slim (1.0 across) on the pavement's wall side so the kerb side stays walked; a core the
  boulevard's crossing would take slides toward the platform's middle; the lift shaft stands inboard. The underground
  entrances sit mid-block in the avenue's median (stairs along the road) and on the arterial's aprons where no ramp
  comes down; the arterial's door band reaches from the apron to the building line.
- **E**: the stallion is thirty boxes in a lit bronze (an emissive floor, four practicals at its feet); its collision
  box is exempted where the avenue-open test samples the plaza's centre. Party roofs: eight of top 22–82, at least 8
  wide, off the route. Bridges: five builds by |block index| mod 5; the arterial's is the girder build. Market
  streets at (line −2, col 3), (line 4, row −3, in the megastructure's shadow) and (line 1, col −4). Conduits are
  three 0.42 pipes on brackets, 44 of them, at 12–17.5, never within the arterial's right of way. The pump house is
  slim (1.6) on the east quay's water side. Cooling towers on roofs ≥ 7, greenhouses on roofs ≥ 10 × 8.
- **F**: `asPixelTex` minifies through mipmaps with anisotropy 4; the shadow focus snaps in the light's frame (a
  texel sideways, a texel over the elevation's sine along the light); normal bias 0.8.
- **G**: auto speed 0.18 (0.11 calm); the eye's target slews at 0.012 a frame; yaw capped at 0.0035 rad a frame
  (12°/s) and pitch at 0.0025 (8.6°/s) with gain 0.00045 and damping 0.042; bank capped at 0.05 rad and eased at
  0.03; the body follows the flight's point through a 0.1 lerp and is kept out of solids.
- **The pedestrian phase** (added on request): every lit node runs a walk signal per street — WALK while the
  street is red after its own all-red with more red left than the crossing takes, FLASH for the crossing time before
  its green, DONT through its phase; a crossing starts only on WALK, timed at the slowest walker's hurry (crossers move
  at 1.5× a walker); the cycle grew to 18 s (green 420, all-red 130) to make room for a window; the lamps show it.
- Not done: the market streets' vendors mill as at any market; the lift cabs ride on a fixed cycle.
