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
