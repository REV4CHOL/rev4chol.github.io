# WORK on a phone: the reel — design (2026-10-20)

The owner: "Work main section's overall design only works on PC and tablet. But on Phone, its completely
overwhelming and disorienting, like the design does not fit on a Phone at all. I want a complete redesign of the
interface of the Work section, still keeping the fundamental art direction, but changing the UI/UX specifically for
Phones."

## What a phone gets today (measured in Chrome at 390 × 844, 375 × 667, 430 × 932 and 844 × 390, touch)

- The floor is a world tilted 30°, sliced by the screen's edges; you steer it by drag and pinch. One drag throws it into
  empty floor, and the tapped film's caption leaves the screen with it.
- Four lines of lime instructions (DRAG TO MOVE AROUND ▪ PINCH TO ZOOM ▪ TAP A FILM TO PREVIEW IT ▪ TAP IT AGAIN TO
  OPEN) and the LIST ALL 17 FILMS button are printed over the films.
- A film takes two taps to open: the first only selects it.
- On a 375 × 667 phone the chapter tabs stack in the middle of the screen, over the films. In landscape the instructions
  run off both edges and the tabs sit on the films.
- THE LIST is the one view that fits a phone, and it is one press away from the confusion, not the arrival.

The floor is built for a screen big enough to see where you are in it. A phone is not that screen; it needs one film at
a time, moved by the gesture every phone already knows.

## The design: the reel

On a phone, WORK is a showreel: one film fills the screen, and a swipe up advances the reel to the next, like a strip
of film through a gate. Nothing to learn, nothing to pinch, no instructions over the pictures. The desktop's floor and
the tablet's are untouched.

**Which screens:** a coarse pointer (touch) on a screen under 640 px wide, or under 500 px tall (a phone in landscape).
The choice is made once, when the page loads. A phone never builds the floor's WebGL world at all.

### 1. A frame (one film)

- **The pane:** the floor's own pane, now in plain HTML and CSS, so a phone visitor sees the same object as a desktop
  one.
  - The film's accent frame with crop-mark corners, the accent bar, and the `RVL/xxxx` code.
  - FEATURED inverted on the accent, and the inset rule on a featured film.
  - The strip at its foot: `2025 · FAR EAST` on the void plate with the accent tab.
  - It keeps the film's own shape: 16:9, scope letterboxed by its own ratio, 4:3, and a vertical film tall (the vertical
    rule).
  - The film's loop plays in it while it is the frame in the gate; the poster stands until the loop has a picture.
- **The head:** the frame's number as a big outlined Clash numeral (`07`, as on the film page's stills wall), `/ 12`
  beside it, and on the right `CH·01 ▸ COLORIST`.
- **The contact strip:** the film's first stills under the pane, in its own shape: four of a vertical film, three of
  another (as on its page's stills wall).
- **The words:**
  - the title in Clash Display (the display voice), sized to fit the width; the one unbreakable name breaks at its
    underscores;
  - year · role · running time in the micro mono, with the genre tags as dotted square tags;
  - the synopsis's first sentence in Bodoni italic (the film page's SYN: voice), which gives way on a short screen.
- **The door:** the about page's slanted lime plate, `OPEN THIS FILM ▸`. The pane, the title and the plate are one link:
  one tap opens the film, with the house wipe. A private film (MIEN VIEN) says PRIVATE FILM in its meta; its page still
  opens.
- **The film's edge:** sprocket holes run down the frame's left edge, with a vertical edge code beside them
  (`RVL ▸ 07 ▸ CH·01`). They scroll with the frames, so the reel visibly advances. Each frame ends on a frame line.

### 2. The reel

- Frames snap one per swipe. Each stands a little shorter than the screen, so the next one's numeral peeks at the foot
  and says there is more.
- The first frame says so in plain words once: `SCROLL DOWN FOR 11 MORE FILMS ▾`, gone after the first advance.
- Each advance gives the gate's small tick (the site's hover blip, under the SFX switch). The new frame's meta
  scrambles in and its title flickers through the RGB split once; under CALM it simply stands.
- **The scrub rail:** an editor's timeline down the right edge.
  - One tick per film in that film's accent, and a lime playhead on the film in the gate. No label: it would stand on
    the frames' words.
  - Tapping a tick, or dragging a thumb along the rail, scrubs the reel to that film.
- **The end:** each reel ends on an EOF slate.
  - `EOF ▪ CH·01 ▪ 12 FILMS`, with the other chapter's name big and outlined.
  - `TUNE TO CH·02 ▸ AI — 5 MORE FILMS` on the lime plate.
  - `SEE ALL 17 FILMS IN A LIST ▸` in the site's pill.

### 3. The bar (the thumb's reach)

- Fixed at the foot, inside the small viewport (100svh) and above the home indicator's safe area. It holds:
  - the two chapters in their tab grammar (`CH·01 ▪ 12 FILMS` small over `▸ COLORIST` big, in lime when on), the
    chapter name always bigger than its CH·NN label;
  - `LIST ▸` (read aloud as "List all 17 films"), which opens THE LIST. (`ALL FILMS ▸` did not fit beside the two
    chapters on a 390 phone.)
- Switching chapter is the channel change, as on the desktop: the static and the scrambled ident (`CH·02 ▸ TUNING`,
  AI), the chime, then the other reel from its first film. The address keeps `?ch=machine`.
- THE LIST (`?view=list`) is the phone's index of every film. Its back button reads `◂ BACK TO THE REEL`.

### 4. What leaves a phone's WORK

- The floor (its WebGL world, its drag and pinch, its two-tap preview), the four-line legend, and the LIST ALL 17 FILMS
  pill over the films.
- The site's header (wordmark, menu and the SFX ▪ MUSIC ▪ MOTION switches) and the top corner crosses stay as on every
  page. The bottom crosses and the HUD's bottom readouts give their place to the bar.

### 5. Landscape, small phones, states

- **Landscape:** a frame lays out in a row, the pane at left and the words at right. The bar slims; the contact strip
  and the first frame's cue stand down (the peek and the rail say there is more).
- **A short screen** (360 or 375 × 667, or on its side): the contact strip gives way first, then the synopsis to two
  lines, then the synopsis, then the tags; still over, the picture gives a little. The title, the meta and the door
  always fit.
- **Loops:** only the film in the gate plays. A frame two away from the gate gives back its video element. Under CALM the
  loops still play, as on the floor, but nothing else moves. LITE (Save-Data, a 2g line, a weak phone) shows posters
  only.
- **No horizontal overflow** at 360, 375, 390 and 430, nor in landscape.

## Tests

- `reel.test.ts` (pure, `src/works/reel.ts`):
  - phone mode (touch and narrow, or touch and short; never a desktop or a tablet);
  - the pane's size in its own shape (a vertical film tall, never cropped);
  - the title's size;
  - the synopsis teaser (whole words, one sentence);
  - the frame codes and numbers;
  - the rail's scrub index;
  - the words of the cue, the door and the EOF slate (plain sentences).
- `floor-ways.test.ts`:
  - the page builds the reel on a phone and never the floor's world there;
  - the reel's rules come with `.is-reel` only;
  - the chapter names stand bigger than their labels in the bar;
  - the back button's words on a phone.

## Verification

- The built site in Chrome on touch phones at 360 × 780, 375 × 667, 390 × 844, 430 × 932 and 844 × 390:
  - arrival, an advance, a scrub, a chapter change, the EOF slate, THE LIST and back, a film opened by one tap;
  - one video playing at a time;
  - no overflow.
- CALM and LITE.
- A tablet (820 × 1180, touch) and desktops (1440, 1920) still get the floor, unchanged.
- check, test and build; the smoke check; the same live.

## Design calls for the owner

- The phone's Work as a reel: one film at a time, a swipe per film, and no floor on a phone.
- One swipe moves one film; the scrub rail and THE LIST are the fast ways.
- The floor's pane dress kept; the film-strip edge (sprockets and edge codes) added; the big outlined frame numbers.
- The synopsis's first sentence on each frame.
- The door's words, `OPEN THIS FILM ▸`; the list's back button on a phone, `◂ BACK TO THE REEL`.
- The contact strip of stills under each pane.
- The bar at the foot for the chapters, and `LIST ▸` for THE LIST.
- The EOF slate tunes to the other chapter.
- The site's header left as on every page.
