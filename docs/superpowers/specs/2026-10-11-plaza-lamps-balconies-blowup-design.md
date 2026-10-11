# The plaza's lamps, the balconies, the blow-up — design (2026-10-11)

The owner, on STORY's city, after the round that squared the plaza:

- "add a ring of lamps on the plaza deck, then commit and make these live"
- "and roads across whole city still flickering when camera moves"
- "across whole city, many dudes are standing like this outside balcony. FIX." (a screenshot: a man in a suit standing
  in the air past a balcony's end rail, beside a woman on the balcony)

## What was found

### The balconies

- When a balcony got two people talking, the second stood 1.3 along from the first. The first could stand anywhere
  along the slab, so on a 5-unit balcony about 38 % of pairs put the second past the slab's end, in the air beside its
  rail. Across the city, 85 perches stood off their slab.

### The flicker

- The paints no longer fight for depth (the previous round). With them settled, the roads held still in the renders
  here at full resolution, with or without the real lights. At night the moon casts no shadows, so shadows are not it.
- **The canvas is blown up nearest-neighbour** (`story.css`: `image-rendering: pixelated`). The frame is drawn at
  `min(ratio, 2) / PIX` of its CSS size, times the quality governor's scale. The governor shrinks that scale by fifths
  when frames run long (0.8, 0.64, down to 0.6), and grows it back by 1.15 steps. Each step below 1 makes the browser
  blow the frame up by a fraction (1.25, 1.56, 1.67 screen pixels a frame pixel). It then doubles some rows and
  columns and not others, and every thin line — the lane paint, the kerbs, the zebras, the window grids — hops between
  them as the eye moves. Phones always stood at a fraction: a ratio-3 phone, 2.4. Screens over twice normal density
  stood at one too.
- The code's own history names this sparkle once already ("every thin rail and window grid sparkled as the camera
  moved"), at a device ratio of 1.5. That fix made the blow-up whole at the governor's full scale; the governor's
  fifths brought it back.
- Measured, at the high tier with the scale pinned at 0.8, a frame flown forward a step at a time and blown up both
  ways: 4,064 screen pixels blinked nearest-neighbour, 3,580 smoothed.

## Design

### 1. The balconies (`city-plan.ts`)

- The second of a pair stands a step along whichever way the slab has room, or is not placed. Every perch stands on its
  slab, 0.8 clear of the end rails.

### 2. The plaza's ring of lamps (`city-plan.ts`, `city3d.ts`)

- Twelve lamps (`PLAZA_LAMP`): 11.6 from the statue, 6 tall (a step taller than a street's 5.5), standing on the deck.
- They stand between the planters and the benches. The furniture ring turns 15° so that no lamp stands on the axes,
  where the bridges' own poles and hangers rise at the deck's edge.
- Their arms reach in over the plaza toward the statue: a post can carry its own arm direction now, instead of the
  nearest road's.
- The crowd mills round each post (a thin collision box). The tiles of the endless city keep them home.

### 3. The blow-up, whole (`city-governor.ts`, `city3d.ts`)

- `frameSize` picks a frame that is a **whole number of screen pixels a frame pixel**, blown up nearest-neighbour:
  - the nearest whole number, where the asked scale lands within 2 % of one;
  - else, at the pixel tiers (low, mid, and phones), the next whole number up: never more pixels than the governor
    allows;
  - else (the screen's-own-pixel tiers, high and ultra) the asked size, blown up smooth (`image-rendering: auto`).
- The debug handle gains `setScale` (pin the governor's scale) and `setPass` (a post pass off or on), for checks like
  the one above.

## Tests

- `city-plan.test.ts`: every perch stands on a balcony slab, 0.3 clear of its ends (85 did not before). The plaza's
  ring: twelve lamps on the deck, off the axes, arms reaching in, clear of the furniture, solid to the crowd.
- `city-governor.test.ts`: `frameSize` blows up by whole numbers at the shipped tiers, ratios and governor steps, or
  smooth (only off the pixel look), and never takes more pixels than the governor allows.

## Verification

- check, test and build. The smoke check of 9 pages at three sizes, and STORY's checks, locally and live.
- A render of the plaza at night: the ring stands about the statue, its lanterns in, the deck lit and not washed out.

## Design calls for the owner

- **The lamps:** twelve, 6 tall, arms reaching in toward the statue, between the planters and the benches (the
  furniture turned 15° to make room off the axes).
- **When the city lowers its resolution under load**, the high tiers now blow the frame up smooth (a touch soft, no
  hopping). The pixel tiers step to the next whole pixel size instead.
- **Phones get whole pixels too:** a ratio-3 phone now draws its own CSS width (3 screen pixels a pixel), not 1.25
  times it (2.4). That is chunkier and lighter on the phone, and holds still.
