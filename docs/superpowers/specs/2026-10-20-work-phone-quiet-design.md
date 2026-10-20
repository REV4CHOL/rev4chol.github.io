# WORK: the roll even slower, and sounds on presses only — design (2026-10-20)

The owner, on the roll shipped the same day (2901c2c):

- "Yeah low power works". The loops shown as MP4 images play on their iPhone in Low Power Mode.
- "Speed: Even slower."
- "Also I prefer the only SFX is when pressing any text or buttons in the work section. No SFX when scrolling pls its too
  much".

## 1. Even slower

- One screen every 18 seconds (`ROLL_SECONDS`, from 12). That is 47 px/s on an 844-px phone.
- The rest stays the same: the roll starts at once, a throw eases straight back into it, and CALM never rolls.

## 2. WORK sounds only on presses

**Where the scrolling sounds came from:**

- The shell gives every page a short blip whenever the pointer comes over a link or a button (`pointerover`). A touch
  fires `pointerover` the moment a finger lands. Each pane of the strip is a link, so every swipe began with a blip.
- On a desktop or tablet, the floor gives the same blip each time a pane wakes under the pointer. Panning the floor or
  passing over it set off a run of blips.

**The design:**

- `works.html` asks for sounds on presses only, with `data-sfx="press"` on its body. The shell's blip stands down on a
  page that asks.
- The floor's wake blip goes.
- Every press keeps its sound:
  - a film opened: a click, then the wipe's whoosh as the page leaves;
  - the chapter switch: the chime;
  - LIST and the way back to the films: a click;
  - the HUD's SFX and MUSIC switches: a click;
  - the nav and the foot's links: a click.
- The strip itself never sounds: no drag, throw, rail or roll makes one.
- Other pages keep their blips. A film's page is its own page, not the WORK section.

## Tests

- `reel.test.ts`: the pace.
- `floor-ways.test.ts` pins:
  - `works.html` asks for press-only sounds, and the shell's blip stands down on that ask;
  - the floor has no wake blip, and opening a film still clicks;
  - the strip makes no sound;
  - a tap on a film clicks.

## Verification

On the built site, with every sound call counted:

- A 390 × 844 touch phone:
  - the strip at 18 s a screen;
  - drags, throws and the rail make no sound;
  - a press on the chapter, on LIST and on a film each sound once.
- 1440 × 900 and 1920 × 1080:
  - passing over the floor and over the links, and panning, make no sound;
  - a press on the chapter and on a film each sound.
- The homepage still blips over its links: only WORK is quiet.
- check, test and build; the same live.

## Design calls for the owner

- 18 seconds a screen.
- The quiet covers the whole WORK section on every device. The desktop floor loses its blip as a pane wakes, and THE
  LIST loses its blip over a row.
- A film's page and the other pages keep their blips.
