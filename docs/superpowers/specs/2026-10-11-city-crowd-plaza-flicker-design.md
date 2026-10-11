# The crowd at the lights, the plaza, the flicker — design (2026-10-11)

The owner, on STORY's city:

- "1. streets are glitching when I fly my camera 2. Some pedestrians are morphing on top of each other static like
  this. 3. Pedestrians just keep waiting eternally for the red and green light, not moving at all when green lights
  hit."
- "On the boulevard: Many places like this is glitching too, like the boulevards spilling on top to the streets
  itself. Also please no gap that reveal the underwater like this pls"

## What was found

### The walkers at the lights

Measured with the real plan, the traffic and 3,800 walkers, wired as the page wires them, in node:

- **WALK never came at nine crossings in ten.** A crossing was timed at the slowest walker's own pace: an elder at
  0.55 of the base step, hurried. A plain road took about 870 frames that way. But the street's red at a two-street
  light is one phase, 550 frames, and WALK only shows while more red is left than the crossing takes. At 562 of the
  619 lit crossings, the crossing outlasted the whole red.
- **Nobody ever gave up.** After 7,000 frames, 1,500 of the 3,800 stood at kerbs and only 462 walked.
- **Waiters had no places.** Each stopped on the kerb line in the lane they had walked, so everyone arriving in that
  lane stood on the same spot. Others could stop on a waiter as well: standing, sitting, browsing a stall.

### The plaza

- The plaza was a disc of radius 15 on a block 24 × 24: the canal's slot between the quay walls (x = ±12), and the
  bridge decks of the streets either side (z = ±12 to ±26).
- **It spilled.** It reached 3 over both quay roads (their pavements and half a unit into the carriageway) and 3 onto
  both bridge decks, at exactly their height (0.05). Two surfaces in one plane fight at every distance.
- **Its corners were open.** A corner of the block is 17 from the centre, beyond the disc's arc, so the slot showed
  the water 2.6 below.
- Its ring of twelve lamps at radius 17 stood in those roads, and the rule that clears carriageways had removed all
  twelve.

### The street paint

- The paint ladder (`city-paint.ts`) parted the flat paints, millimetres apart, by polygon-offset rungs: one unit
  apart, and nearly all with the same slope factor.
- **Measured** in Chrome, in a WebGL2 framebuffer with a 24-bit depth buffer (the GPU's usual), with the city's near
  and far planes and strips shaped like the city's (14 wide, hundreds long):
  - two long strips 2 mm apart with the same factor traded places as the eye slid a centimetre. The wrong one showed
    through 10 to 60 % of their overlap, even 8 units apart; 32 units apart, still up to 5 %;
  - strips whose factors differed by one never traded. That is why the east–west roads (no offset at all) held still
    against the north–south ones;
  - the pairs that share a factor in the city: lanes over the north–south roads, lanes crossing each other, the
    boulevard over the north–south roads, the boxes over all of those, and lanes through roads all over the endless
    city's tiles, where no box covers a crossing.
- **The rungs also pulled the paint in front of what stands on it.** In a grid like the city's, a junction box swallowed
  most of a distant car from a steep view: 90 to 240 of a car's pixels showed, against 640 to 890 with the floor
  painted in turn (below).
- **The plaza's disc and the bridges' decks** lay in one plane with no offset at all: a pure z-fight, which even this
  machine's software renderer shows.

## Design

### 1. The lights make room to walk (`city-traffic.ts`)

- Crossers go at `CROSS_STEP` or faster (a walker's base step, hurried; an elder hurries like anyone). WALK is asked
  for the crossing's time at that step.
- **At build, every crossing at the lights asks the traffic for its time** (`roomToWalk`). The node's phases stretch
  until the shared red of the streets crossed holds the crossing and `WALK_MIN` (180 frames, 3 s) of WALK besides.
  The greens stretch with them; the all-red stays as it was. A plain crossing's phase goes from 550 to 667 frames.
  The longest cycle in the city stays 3,165.
- The WALK lamp times its FLASH by the walkers' own crossing at that light (`walkTime`). When the lamp says WALK,
  they go.

### 2. The walkers (`city-people.ts`)

- **A spot of their own.** A walker who must wait takes a spot: first the front row across the pavement, then rows
  behind it, 0.55 apart, up to eight rows. No spot is within 0.44 of another waiter at the same junction (a corner's
  two pavements meet), inside a solid, or past one on the way. They walk there. The queue moves up as the front
  clears. A walker who finds the kerb full turns back.
- **They fall in from the back.** A walker sees a red from 4.4 out (the queue's depth), looking every eighth frame,
  instead of walking through the queue to the kerb.
- **Both ways.** A front-row waiter sometimes takes the WALK across their own street instead, as people do.
- **Patience.** After 4,800 frames (80 s, past any light's cycle), a waiter turns back the way they came. Only an
  unlit crossing in an endless stream can run them out of it.
- **Nobody stops on anyone.** Standing, sitting and browsing need 0.45 clear of everyone already still.
- **The cost.** The wall check runs every fourth frame, which stays inside the walls' 0.3 padding. Crosswalk keys are
  numbers, and a crossing's two ways over are made once.

### 3. The plaza (`city-plan.ts`, `city3d.ts`)

- **The deck is the block itself:** `PLAZA` is 24 × 24, quay wall to quay wall and bridge deck to bridge deck. Its top
  is flush with the bridges' (0.05), in the same paving at the same flag size.
- The planters and benches move in to a ring at 10.2, all on the deck. The disc's rim goes with the disc. The dead
  lamp ring goes from the plan.

### 4. The floor, painted in turn (`city-paint.ts`, `city3d.ts`)

- **The floor is drawn first and writes the depth:** the ground (pushed back a slope and six units, as before), the
  quay walls' coping, the canal bridges' decks and the arterial's bridge.
- **Every paint is drawn after it, in a fixed order.** It tests against the floor's depth, pulled a slope and two units
  in front, and writes none. The later paint covers the earlier wherever both lie, so no two paints can fight:

  | turn | paint |
  |---|---|
  | −30 | the floor: the ground, the quay walls, the canal bridges' decks, the arterial's bridge |
  | −29 | the patches over closed street bands |
  | −28, −27 | the roads' strips, east–west, then north–south |
  | −26, −25 | the lanes' strips, east–west, then north–south |
  | −24 | the boulevard's carriageway, and the arterial's strip (they never meet) |
  | −23 | a slip road at grade, over the arterial's apron |
  | −22 to −20 | the crossings' boxes, a turn a street |
  | −19 | the stop lines |
  | 0 | everything that stands on the floor: it covers the paint |

- The zebras and the lights lying on the ground (lamp pools, the shops' spill, headlight throws) are see-through. They
  are drawn after everything solid, with the same pull.
- The slip road at grade had sat under the arterial's strip, by a rung left over from an older ladder. It is paint over
  the arterial's apron now.

## Tests

- `city-traffic.test.ts`: `roomToWalk` makes WALK appear where it never came and keeps the all-red. A shorter
  crossing never shortens a phase. A crossing of every street at once changes nothing. The 40,000-frame flow test runs
  with the lights retimed for the walkers, as the page runs them.
- `city-people.test.ts`:
  - with the lights making room, every street crossed at a light shows WALK long enough every cycle, and nobody
    waits past their light's cycle (6,000 frames);
  - every waiter has a spot of their own and walks to it, the queues form, and no still pair overlaps.
- `city-plan.test.ts`: the plaza is its block. The bridges either side meet it, no carriageway runs on it, and its
  eighteen pieces of furniture stand on the deck.
- `city-paint.test.ts`: the floor's depth is pushed behind and every paint pulled in front of it. The turns go floor,
  patches, roads, lanes, boulevard, slip, boxes (three turns), stop lines, then everything else. Every turn is used in
  `city3d.ts`, the retired rungs are gone, and a paint writes no depth.

## Verification

- **The crowd, in node** (3,800 walkers, 12,000 frames, about 3.3 minutes):
  - every lit crossing shows at least 180 frames of WALK a cycle;
  - no wait outlasted its light's cycle; the longest was 2,876 frames at a cycle of 3,165, and nobody ran out of
    patience;
  - about 9,300 crossings started from a kerb, and about 600 went across their own street;
  - no two waiters stood within 0.35 of each other, and no two of the 2,250 still people within 0.3;
  - the crowd's step costs 2.6 ms a frame with everyone moving. The old code cost 3.8 ms with everyone moving early
    in a visit, and 1.8 ms once 1,500 had frozen.
- **The traffic, in node** (2,000 vehicles, 40,000 frames): the same flow with the lights retimed. Links crossed:
  64,255 against 63,997; a quarter of the vehicles stopped at any moment, as before (26.0 % on average; 31.7 % at worst,
  against 32.6 %).
- **The renders:** see "The renders" below.
- **The same on the live site** after the Pages deploy.

## The renders

- **The live city, on this machine's software renderer** (Chrome, SwiftShader, at LITE, 960 × 540 frames). For each
  view the eye slides sideways a hair twice, nothing moving, and every pixel that jumps by more than 40 of 255 is
  counted:

  | view | old | the plaza fixed | final |
  |---|---|---|---|
  | the plaza from above a corner | 1,134 | 371 | 381 |
  | down the bridge toward the statue | 1,609 | — | 1,581 |
  | east along the avenue's road | 3,800 | — | 3,774 |
  | north up the canal | 1,737 | — | 1,729 |
  | steeply down on the grid | 735 | — | 736 |

  - On the old build, the disc's overlap with the bridge decks lit up red in the flicker map: the z-fight. It is gone,
    with the disc, from the plaza build on.
  - Elsewhere the jumping pixels are the edges of buildings, posts and people, alike in both builds. The software
    renderer's depth is more forgiving than a GPU's, and it does not reproduce the paints' fight. That is measured
    below, in a 24-bit depth buffer.
  - **Nothing lost:** the final build's frames match the old build's, but for the cars and the people (who moved) and
    the near lights that follow them: 0.07 to 0.16 % of pixels differ. The quay roads' pavement still runs over the
    quay walls' coping, and the bridges' ends still carry the quay roads' paint.
- **The paint schemes, in Chrome's WebGL2 with a 24-bit depth buffer:** a grid of crossings like the city's (strips
  14 wide and 1,200 long, lanes, a diagonal boulevard, boxes, zebras, and a car standing in each box). The eye slid a
  centimetre at a time:

  | view (eye height, looking out to) | pixels changing a slide, old → in turn | a car's pixels showing, old → in turn |
  |---|---|---|
  | 40, 300 | 162 → 94 | 958 → 1,686 |
  | 120, 500 | 130 → 88 | 242 → 890 |
  | 15, 700 | 93 → 95 | 1,431 → 2,039 |
  | 300, 400 | 136 → 115 | 143 → 637 |

  The remaining changes are edges, which move as the eye does.

## Design calls for the owner

- **The plaza is square, the block itself.** The disc's round kerb went with it, and the planters and benches ring
  tighter (10.2).
- **The plaza still has no lamps of its own.** Their ring stood in the roads and had already been cleared. Its light
  is the statue's four spots and the streets' lamps.
- **The lights' timing:** 3 s of WALK at least, and longer cycles at most crossings (a plain crossing's phase goes
  from 9.2 s to 11.1 s), so the cars wait a little longer at the reds.
- **The walkers:** 80 s of patience, queues 0.55 apart, and some front-row waiters cross their own street instead.
- **The floor is painted in turn**, so a distant car in a junction keeps its wheels: the paint no longer covers them.
  Where two paints meet, the later in the order shows (lanes over roads, boxes over all strips), as the old ladder
  meant them to.
