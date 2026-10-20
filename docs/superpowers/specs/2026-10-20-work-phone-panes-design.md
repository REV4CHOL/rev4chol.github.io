# WORK on a phone: whole-screen panes — design (2026-10-20)

The owner, on the reel shipped the same day (c3c8827):

- "I would prefer the sizing of all panes on Phone in the work section to be like this website on phone:
  https://www.antiantiart.com/". Then, with two screenshots of it on their phone: "Look at these reference photos (Minus
  the texts dont care about them)".
- "And also for the texts for each pane, I prefer only the Project name, and the Role names are enough. Do not clog this
  section up with texts."
- "Also I want the videos to play continuously on the pane via its loop. When I access the web just now, no loop play at
  all".

## The reference (measured from the owner's two screenshots; the site itself is blocked in this environment)

- Each project is one pane, exactly one screen tall and the full width, edge to edge.
- The video covers the pane: landscape footage is cropped to the phone's tall frame.
- Panes stack with no gap: a scroll mid-way shows the end of one and the start of the next.
- The header and the footer lie over the picture, with no plate. The words are the owner's to set; theirs are not wanted.

## Why no loop played

- The reel played loops only above the LITE tier. The quality governor keeps a day's verdict in localStorage, and opens
  the next visit there. A phone judged LITE once (the old WebGL floor was heavy on phones) opened the reel on posters for
  the rest of the day.
- A battery saver (iOS Low Power Mode) refuses a `play()` no touch asked for. The homepage re-offers playback on every
  touch; the reel did not.

## The design

1. **A pane is the screen.**
   - The reel covers the whole screen, and each film's pane is 100% of it. Panes snap one per swipe.
   - The poster, then the loop, cover the pane (`object-fit: cover`, centred).
   - A vertical film fills the upright screen as it is. On a phone held on its side it stands whole in the middle
     (`contain`), never cropped wide (the standing vertical rule).
   - The cut between two panes is a hairline of field blue.
2. **The words: the film's name and its roles, nothing else.**
   - The name is in Clash Display (the display voice), with ▸ in the film's accent.
     - It stands on one line when it can at 34 px or more, up to 52.
     - A longer name wraps at its words, from 34, 28 or 24 by its length, never under 22, until its longest word fits.
     - It is measured in its own face with its ▸: a per-letter guess left KATARA's ▸ on a line alone.
   - Under it, the roles as the record has them, in the micro voice, upper case. A role never breaks inside, and no
     line opens on a slash.
   - They stand bottom left, over a dark fade, above the foot.
   - Gone from a pane: the frame number, the chapter line, the edge code, the pane's code and FEATURED tag, the year and
     name strip, the stills, year, running time, tags, synopsis, the OPEN THIS FILM plate and the scroll cue.
3. **The hardware stays, without words:**
   - the film's accent tab over its name;
   - the viewfinder's corners in its accent (the floor's crop marks), round the picture between the header and the foot;
   - the scan lines;
   - the sprockets down the left edge;
   - the scrub rail down the right edge.
4. **The chrome lies over the picture,** as on the homepage.
   - The header's own veil, and the homepage's ink halo on the switches.
   - The foot (the chapters, `LIST ▸`) on a dark fade, with no plate.
   - The EOF slate is a whole screen of its own.
5. **The loops roll.**
   - The pane in the gate plays its loop on every tier. Only a visitor's Save-Data or a 2g line keeps the posters.
   - The next pane's loop waits warm (played until it has a picture, then held), so a swipe lands on it rolling.
   - A pane two away gives its video back.
   - Every touch re-offers the loop: the heal for a battery saver.
   - Under CALM the loops still play; nothing else moves.
6. **One tap anywhere on a pane opens its film,** with the house wipe.

## Tests

- `reel.test.ts`:
  - which screens get the reel;
  - the loops' rule;
  - the roles' line;
  - the name's one-line size and its wrapping start;
  - the rail and the gate;
  - the reel's words.
- `floor-ways.test.ts`:
  - the pane is the screen and its picture covers it;
  - the vertical rule on a phone held on its side;
  - a pane builds only its name and its roles;
  - the loops follow no tier, and a touch re-offers them.

## Verification

- The built site in Chrome on touch phones at 390 × 844, 375 × 667, 360 × 780, 430 × 932 and 844 × 390.
  - The walkthrough: arrival, advance, scrub, EOF, chapter, THE LIST and back, one-tap open. No overflow.
  - Every pane's words clear the header, the foot and the rail. A one-word name is on one line.
- The loops in each state:
  - a remembered LITE and a pinned `?gfx=lite`: they roll;
  - Save-Data: posters;
  - a battery saver: posters until a touch, then rolling.
- CALM. A tablet and desktops keep the floor.
- check, test and build. The same live.

## Design calls for the owner

- Landscape footage is cropped to the phone's tall screen around its middle, as on the reference. A film whose subject
  sits off-centre shows the middle of its frame; a per-film focus point could follow.
- The name bottom left, in the display voice with its ▸ in the accent, and the roles under it.
- The viewfinder's corners, the accent tab, the sprockets and the rail kept, as hardware without words.
- No scroll cue: the rail and the pane itself say there is more.
- The foot and the header over the picture, with no plates.
