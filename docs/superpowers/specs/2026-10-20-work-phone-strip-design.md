# WORK on a phone: the rolling strip, focus points, loops that play at once — design (2026-10-20)

The owner, on the whole-screen panes shipped the same day (6b70c85):

- On my offer of a per-film focus point for the crop: "yes please".
- "i dont care which power mode iphone is on, but I want all the sections in both the homepage and work section to play
  all video right away".
- "I would like for the WORK section: The moment we enter the work section, we can see the already continously scrolling
  down to the next film in a continuous strips. And we can slide our finger up and down to scroll through the strip".

## 1. The rolling strip (WORK on a phone)

- **From arrival, the strip rolls.** The films pass upward on their own at a steady pace, one screen every 7 seconds.
  - It is endless: after the chapter's last film comes its first again, with no seam and no end slate.
  - Each pane keeps the whole screen (the antiantiart sizing), so two panes share the screen as one gives way to the
    next.
- **A finger takes it.**
  - Touching the strip stops it. Sliding up or down moves it with the finger.
  - Letting go throws it with the finger's speed. The throw slows to a rest.
  - After 2.5 seconds at rest, it eases back into its roll.
- **A tap opens the film under it.** A drag never opens one.
- **A pane's words travel with it,** and fade over 28 px as they near the header or the foot. They stand whole in the
  clear band between and never print over the chrome. (Added after the first live look: a rising name crossed the
  foot's chapter labels.)
- **The rail** shows where the strip stands: the lime playhead travels continuously, and a tick marks each film in its
  accent. Touching or dragging along the rail moves the strip there.
- **CALM** (the visitor's MOTION switch): the strip never rolls by itself. A finger still moves it. The loops still play.
- The end slate leaves the phone. The foot already holds both chapters and LIST. A chapter change tunes the other strip
  from its first film.
- A chapter of one or two films is laid twice, so the strip never shows a gap.

## 2. The loops play at once, every pane in view

- Every pane on screen plays its loop. So does the one about to come in, in the direction the strip moves. Panes further
  off rest, and a pane more than two screens away gives its video back.
- **iOS Low Power Mode refuses every video `play()` no touch asked for, even muted.** Nothing on a page can lift it, and
  the refused promise (`NotAllowedError`) is the only sign of it.
  - On a refusal the site falls back to an MP4 shown in an `<img>`. Safari plays that like a silent looping GIF, outside
    the video rules, with the same files and no extra download.
  - The fallback is remembered for the visit, so the next page starts on it at once.
  - A browser that cannot show an MP4 in an `<img>` keeps its poster, and a touch starts the loop, as before.
- **The homepage** on a refusal: the reel's loops stand as images, cutting from one to the next on the reel's clock.
  - The page still takes its colour from each.
  - A loop's baked bars are still trimmed.
  - The canvas's datamosh and lens need a video and wait for one.
- Unverified here: no Safari engine runs in this environment. The owner tests it with Low Power Mode on. If Safari
  refuses the image too, the next step is an animated-WebP copy of each loop (bigger files).

## 3. A focus point per film

- `"focus": "X% Y%"` in a film's entry in `projects.json`: where the picture's subject sits. `0% 0%` is the top left, and
  `50% 50%` (the default) is the middle.
- A phone's pane crops the film around it: the CSS `object-position` of its poster and its loop, video or image.
- `src/lib/content.ts` refuses a malformed focus loudly, naming the film and the field.
- The values are set from each film's loop frames, for the films whose subject sits off the middle.

## Tests

- `reel.test.ts`:
  - the strip's arithmetic: each pane's place in the endless strip; the film in view; the rail's progress and the way
    back from it;
  - the coast toward a target speed; the release speed from the finger's last moves; the pace;
  - which panes play, rest or let go;
  - the strip laid twice for a short chapter.
- `content.test.ts`: the focus field (good values, defaults, malformed ones refused).
- `autoplay.test.ts`: a refusal is recognised by its name only; the visit remembers it.
- `floor-ways.test.ts`: the pins for the wiring (no snap, no end slate, CALM never rolls, the fallback's swap).

## Verification

- Chrome on touch phones (390 × 844, 375 × 667, 430 × 932, 844 × 390):
  - the strip rolls from arrival;
  - a drag moves it, a throw coasts and the roll resumes;
  - a tap opens a film, and a drag opens none;
  - the rail scrubs;
  - the pane in view and the next one play;
  - no overflow, no errors.
- A refusal stand-in (`play()` refused, the MP4 served to the `<img>` as an animated WebP, since Chrome cannot show an
  MP4 in an image): the reel's panes and the homepage's reel move at once on images.
- CALM: no roll. A tablet and desktops keep the floor.
- check, test and build; the same live.

## Design calls for the owner

- The pace: one screen every 7 seconds.
- The rest after a touch: 2.5 seconds, then the roll resumes.
- No end slate on a phone: an endless strip.
- On a refusal, the homepage's cuts are plain and its datamosh waits for a video.
- The focus points picked from the loops' frames.
