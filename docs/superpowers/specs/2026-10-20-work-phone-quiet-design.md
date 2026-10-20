# WORK on a phone: the roll even slower, and sounds on presses only — design (2026-10-20)

The owner, on the roll shipped the same day (2901c2c):

- "Yeah low power works". The loops shown as MP4 images play on their iPhone in Low Power Mode.
- "Speed: Even slower."
- "Also I prefer the only SFX is when pressing any text or buttons in the work section. No SFX when scrolling pls its too
  much".

## 1. Even slower

- One screen every 18 seconds (`ROLL_SECONDS`, from 12). That is 47 px/s on an 844-px phone.
- The rest stays the same: the roll starts at once, a throw eases straight back into it, and CALM never rolls.

## 2. WORK on a phone sounds only on presses

**Where the scrolling sounds came from:** the shell gives every page a short blip whenever the pointer comes over a link
or a button (`pointerover`). A touch fires `pointerover` the moment a finger lands. Each pane of the strip is a link, so
every swipe began with a blip.

**The design:**

- On a phone, the WORK page asks for sounds on presses only: it sets `data-sfx="press"` on its body when it builds the
  strip. The shell reads that ask as each pointer comes over, since the page decides after the shell has mounted, and
  its blip stands down.
- Every press keeps its sound:
  - a film opened: a click, then the wipe's whoosh as the page leaves;
  - the chapter switch: the chime;
  - LIST and the way back to the films: a click;
  - the HUD's SFX and MUSIC switches: a click;
  - the nav and the foot's links: a click.
- The strip itself never sounds: no drag, throw, rail or roll makes one. Neither does a drag down THE LIST.
- **A tablet's and a desktop's WORK keep their blips**, over the links and as a pane of the floor wakes. So do the other
  pages. A film's page is its own page, not the WORK section.
- (Amended after the first ship, which quieted WORK on every device. The owner: "no no that quiet only go with PHONE.
  bruh revert others". The floor's wake blip and the desktop's link blips are back as they were.)

## Tests

- `reel.test.ts`: the pace.
- `floor-ways.test.ts` pins:
  - the WORK page asks for press-only sounds on a phone alone, and the shell's blip stands down on that ask;
  - the floor keeps its wake blip, and opening a film still clicks;
  - the strip makes no sound;
  - a tap on a film clicks.

## Verification

On the built site, with every sound call counted:

- A 390 × 844 touch phone:
  - the strip at 18 s a screen;
  - drags, throws and the rail make no sound;
  - a press on the chapter, on LIST and on a film each sound once.
- 1440 × 900 and a tablet (820 × 1180, touch): the floor, its links and THE LIST blip as before, and the presses
  sound.
- The homepage still blips over its links: only WORK on a phone is quiet.
- check, test and build; the same live.

## Design calls for the owner

- 18 seconds a screen.
- The quiet covers WORK on a phone: the strip, THE LIST over it, and the foot's chapter and LIST buttons (which sound
  when pressed). A phone is what gets the strip: a coarse pointer, at most 640 px wide or 500 px tall.
- A film's page and the other pages keep their blips, on a phone too.
