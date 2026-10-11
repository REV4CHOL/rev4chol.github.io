# The far streets, the sky, the road's rare flicker — design (2026-10-11)

The owner, on STORY's city at night, after the round that gave the plaza its lamps:

- "1. it's the road liteally flickering ( it happens rarely tho)"
- "2. Also look at photo. Why the hell that highway afar lights up? Fix. Also all the streets afar have weird depth of
  field. All these happens on all sides beyond the boundaries" (a screenshot: night, from high over the city toward
  the horizon; a broad light-cyan band runs down a far street to the horizon, and dark, sharp streaks dotted with
  lights run along the far streets through the blurred far city)

## What was found

Rendered here (Chrome on the software GPU, LITE, 960 × 540, night) from high over the south fence up the canal, and
along the expressway; with the distance blur's input — the frame's alpha — shown as a map (green: the haze's amount,
black: sharp, red: alpha pushed past sharp).

### The sky over the far ground

- The sky domes ride the eye at a radius of 640 and write no depth. The opaque dome used to draw first, and the city
  drew over it.
- The round that painted the floor in turn (a06ac6b) gave the floor draw order −30, ahead of the dome's −2. Since then
  the dome drew after the floor and covered it wherever the floor lay more than 640 from the eye. From a high eye that
  is the whole far city's floor: every street it leaves open showed the dome instead — its horizon band near the
  horizon (the light-cyan "highway") and its darker stops below the band (the dark streaks).
- The dome is the sky, and its alpha says sharp, so the distance blur left those pixels sharp inside the blurred far
  city: the "weird depth of field". The map showed the far streets black in the green far city.

### The far lights added the horizon's colour

- The lamps' glows — the city's, the endless city's copies, the endless highway's — are added to the frame. Three's
  fog mixes a colour toward the fog's, so far out each glow added the horizon's colour, at least a pixel each (a GPU
  draws no point smaller than a pixel), and a far street's lamps summed to a lit line.
- The rule that dims added light instead (FOG_ADD) covered the lamps' pools, the headlights' throws and the shops'
  spill. Seven added materials lacked it: the glows, the signs, the trains' and the flyers' lights, the stadium's rim,
  the runners' sparks, the canal's sheen.

### See-through things set the blur's amount

- The distance blur reads its amount from the frame's alpha, which every solid writes. Every see-through thing blended
  its own alpha in on top (an added glow its alpha squared, a light laid over its alpha over), so a far pixel under a
  glow, a car's light or a decal read as sharp. The map showed them red: the pools, the throws, the signs, the beams,
  the far lamps. A moving light switched the road under it between sharp and blurred as it went.

### The road's rare flicker

This machine has no GPU to show it, so the round removes what could make it, found in the code:

- **The sky over the far ground, above, moves with the eye.** The dome's edge lies 640 from the camera wherever it
  goes, so as the camera flies, the far roads it crosses flip between road and sky. It came in with the painted floor
  — the round after which the owner wrote "roads across whole city still flickering when camera moves".
- **The paints tested the floor's depth**, with a margin of eight units of the depth buffer looking straight down. A
  GPU's rounding over the ground's vast triangles (32,000 units a side) can eat that. And the quay roads' paint lies
  4–6 mm under the canal bridges' decks where it runs over their ends: hidden from closer than about 80 units, shown
  from farther, switching at the distance between.
- **The lights about the eye were re-dealt at once** on every change of the frame's size — each step of the quality
  governor's render scale, a window resize — and on every change of flying mode: lamps fading in jumped to full, those
  fading out went dark, a flash on the street about the camera.

## Design

### 1. The sky behind everything (`city-sky.ts`, `city-paint.ts`, `city3d.ts`)

- Both domes are drawn on the far plane: their clip z set to `SKY_DEPTH` (0.999999) of w, a window depth of
  0.9999995, past the ground's far edge (16,000 out: 0.999994) at every tier. Whatever the city draws stands in front
  of them, in any order. (The ground's polygon offset pushes it back by a slope, one pixel row's depth; at most the row
  at the horizon, the sky's colour either way, could fall behind the sky.)
- The opaque dome draws first of all again (`PAINT.order.sky`, −31), as it did before the painted floor.

### 2. The lights in the fog (`city3d.ts`)

- The seven added materials dim in the fog (`additiveFog`): far out a lamp fades with the city, it no longer adds the
  horizon's colour.

### 3. The blur's amount is the solids' (`city-post.ts`, `city3d.ts`)

- `keepAmount`: a see-through material blends its colour exactly as before and its alpha not at all (three's normal
  and additive blends, with the alpha's factors zero and one). It is applied to every material of the world once the
  mount is done, so a pixel blurs as the solid behind it does. The sky's own layers — the domes, the stars, the moon,
  the sun — keep theirs: they stay sharp, as they were.

### 4. The road's rare flicker (`city-paint.ts`, `city3d.ts`)

- The floor's paints (the strips, the junctions' boxes, the patches, the stop lines) neither test the depth nor write
  any. The floor is under every paint and the eye is never below the floor (two units up at the least; the tour and the
  auto flight fly higher), so the floor can never stand in front of a paint: the draw order alone decides, at any
  distance, on any GPU. The see-through decals (zebras, pools, throws, spill) still test the depth, so a car standing
  on them covers them.
- The lights about the eye are re-dealt at once only across a cut: a warp, or entering the tour (which jumps to its
  route). A resize, a governor's step, and a change to FREE or AUTO (both fly on from the camera) keep the fades.

## Tests

- `city-sky.test.ts`: the sky's quantised depth lies more than 80 steps of a 24-bit buffer behind the ground's far
  edge at every tier, and in front of the cleared depth; both domes are drawn on the far plane, the opaque one first.
- `city-fog.test.ts` (new): every added material in `city3d.ts` is unfogged, dimmed by `additiveFog`, or dims in its
  own shader (the old source fails it); the glows of every lamp dim; `keepAmount` runs over the world after the static
  merge and before the first frames, the sky aside.
- `city-post.test.ts`: `keepAmount` keeps three's colour factors and sets the alpha's to zero and one, for normal and
  additive blends; it leaves solids and other blends alone, and is the same twice over.
- `city-paint.test.ts`: the sky, the floor, then the paints in their order; a strip, a box, a patch and a stop line
  test no depth and write none; the four see-through decals keep the pull; the free flight keeps the eye two units up.

## Verification

- **The renders** (night, LITE, 960 × 540 frames on this machine's software GPU):
  - high over the south fence, up the canal (the owner's view): the light-cyan streaks down the far streets are gone,
    and the far city hazes over evenly. Over the far axis (a 400 × 110 patch) the pixels the blur skipped went from
    2,479 (2,362 read sharp, 117 pushed past sharp) to 170, the flyers and the low stars. With the lights and the
    blur's amount fixed but the dome not, it stayed at 2,377: the sky over the far ground was the cause.
  - along the expressway, east: the cyan band down the far highway is gone; it recedes as a faint warm line of its own
    lamps in the haze.
- **The city as mounted:** all 94 see-through materials of the world keep the frame's alpha; all 26 depth-blind
  meshes are floor paints in their turns; both domes are drawn on the far plane, the opaque one at −31; no page
  errors.
- check, test and build clean; the smoke check of 9 pages at three sizes, and STORY's checks, locally and live.

## Design calls for the owner

- **The far streets show the far city's own ground**, hazed and blurred like the blocks about them. The far lamps and
  traffic dim into the fog instead of lighting the streets in the horizon's colour.
- **The stars are as they were**: sharp, and still seen over the far skyline low on the horizon.
- **The lights near the camera keep fading in and out** through the governor's quality steps; only a cut (a jump of
  the camera, entering the tour) relights them at once.
