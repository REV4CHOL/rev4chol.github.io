# WORK on a phone: the roll at once, slower, smoother — design (2026-10-20)

The owner, on the rolling strip shipped the same day (ac2112f, b16ea3a): "I want the auto scrolling to happen instantly,
but slower and smoother".

## What the first roll did

- It started from rest and swelled to its pace over about a second and a half. After a touch it rested 2.5 seconds
  before rolling on.
- Its pace was one screen every 7 seconds.
- JavaScript moved it frame by frame (requestAnimationFrame), snapped to whole device pixels. When the page's main
  thread was busy, the strip stood still: a film's video starting, a poster decoding.
  - Measured on the live site in Chrome, through its screencast, with the main thread held busy for 1.5 s: no new
    picture at all — the strip froze.
  - With the CPU slowed 4×, its per-frame steps ran from 0.67 to 4 px.

## The design

1. **At once.** From the first frame the strip rolls at its full pace, with no swell. A release eases straight back
   into the roll: the throw coasts at the finger's speed toward the pace, with no rest.
2. **Slower.** One screen every 12 seconds (`ROLL_SECONDS`), so 70 px/s on an 844-px phone.
3. **Smoother: the roll runs on the compositor.**
   - Each pane runs one linear Web Animation a lap: from (n − 1) panes below the screen's top to one pane above it,
     in its own height, so a turn of the phone needs no new keyframes. It is phased by where the pane stands.
   - Its words' fade runs as opacity keyframes on the same lap: the fade under the header and the foot, laid out from
     the band and where the words stand in the pane.
   - The rail's playhead runs as a transform lap the length of the chapter.
   - Rolling, the screen's clock moves them all. No main-thread work can stall them, and positions are never snapped
     to pixels.
   - By hand (a finger, the coast, the rail, a keyboard's focus), the animations pause and their times are set from
     the strip's offset. At the roll's pace the clock takes them again, from that same place.
   - The offset is read back off pane 0's timeline when a finger lands.
4. The loops follow the strip on a 150 ms beat while it rolls, and on every move by hand.
5. Unchanged: endless, a tap opens and a drag never does, CALM never rolls by itself, the rail, the focus points, the
   loops' fallback.

## Tests

`reel.test.ts`:
- the pace;
- each pane's lap progress is the strip's own arithmetic (paneTop), and the offset reads back off the clock;
- the keyframes;
- the fade laid on the lap matches the fade computed by hand at every point.

`floor-ways.test.ts` pins the animations, the instant start, the throw easing into the roll, and no inline transforms.

## Verification

- Chrome, with the CPU free and with the main thread blocked for 1.5 s through the screencast: the strip keeps moving.
- The strip at 390 × 844 and 844 × 390:
  - the pace from the first sample;
  - a drag, a throw and its return to the roll;
  - the rail, CALM, a tap.
- The playhead on its film's tick.
- The words clear at three sizes. The loops and the fallback.
- A tablet and desktops keep the floor.
- check, test and build; the same live.

## Design calls for the owner

- 12 seconds a screen.
- No rest after a touch: the throw eases straight into the roll.
