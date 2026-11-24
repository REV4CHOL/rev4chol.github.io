# WORK on a phone: two panes on the screen — design (2026-11-24)

The owner, on the phone's rolling strip (THE REEL, shipped 2026-10-20): "This is for mobile's WORK section: RIght now,
the panes are too long in length and should be shorten. we should be able to see two panes on the phone screen at the
same time instead."

This replaces the sizing of 2026-10-20 ("A pane is the screen", the antiantiart reference, in
`2026-10-20-work-phone-panes-design.md`). Everything else that day's five designs set stays: the endless strip that
rolls from arrival, the finger's drag and throw, only the name and the roles on a pane, the loops on every tier, the
quiet section.

## What the strip does today

- `.reel` covers the screen and each `.rl-frame` is `height: 100%` of it: a pane is 390 × 844 on a 390 × 844 phone.
  The header and the foot lie over the strip; they do not shorten it.
- The view holds one number, `h`, measured off the strip. It serves as the pane's height and as the screen's height.
  Every rule of the strip (`paneTop`, the lap, the rail, the pace, the loops' rule) is written with it.
- A landscape film covers the tall pane around its focus point, so little of it shows: 26% of a 16:9 film's width, 19%
  of a scope film's, 35% of a 4:3 film's (arithmetic, 390 × 844).
- The vertical film (GALAXY Z FOLD 8 ULTRA, 9:16) fills the upright screen as it is.
- The strip rolls one screen every 18 seconds (`ROLL_SECONDS`): 47 px/s on an 844-px phone.
- Loops: every pane on the screen plays, and the next to come in plays before it shows. About three loops decode at
  once, five or six are loaded.

## The owner's choices (questionnaire, 2026-11-24, from mock-ups of the real posters at 390 × 844)

1. Pane height: **half the screen** (over a square pane, and over half of the clear space between header and foot).
2. The vertical film: **a tall pane, two panes high**, uncropped (over a cropped half pane).
3. The roll: **the same motion as today** (over one film every 18 seconds).
4. The design below, as a whole: approved, with the next pane starting as it enters (over playing before it shows).

## The design

### 1. Sizes

- Upright, a pane is half the strip's height and the full width: 390 × 422 on a 390 × 844 phone. Two panes fill the
  screen; while the strip rolls, parts of three show.
- A vertical film's pane is two panes high: the whole screen, as today. The standing rule holds: vertical footage is
  never cropped to a wide shape. It is the phone's form of the floor's tall pane, which stands two rows high.
- A phone held on its side keeps today's sizing: every pane is the whole screen, and a vertical film stands whole in
  the middle. Half of a sideways screen would be a band about 195 px high.
- In a half pane a landscape film shows twice as much as today: 52% of a 16:9 film's width, 39% of a scope film's, 69%
  of a 4:3 film's. The focus points keep their meaning.
- Panes still stack with no gap, the hairline of field blue between them.

### 2. The strip's arithmetic, in units

The strip is measured in units. Upright, a unit is half the strip's height and a pane is 1 unit, a vertical film's 2.
On its side, a unit is the strip's height and every pane is 1 unit. Two heights replace the one `h`: the unit's and the
screen's.

- A pane's place in the strip is the sum of the units before it. A lap is the sum of all units.
- **Endless.** A pane stands from its own height above the screen's top to the lap's end, once in a lap. The screen is
  always covered when the lap is at least the screen plus the tallest pane. A short chapter is laid again until its
  units reach the screen's units plus the tallest pane's, and never to fewer than three panes (today's rule): upright,
  3 units for unit panes and 4 with a vertical film. The two real chapters held 12 and 6 units when this was written
  and hold 14 and 6 since THE LOVERS and XIÊU LÒNG joined chapter one the same day; both are laid once.
- **A pane's lap on the compositor** runs, in its own height, from the lap less its own units below the screen's top to
  one of itself above it. A tall pane's keyframes differ from a unit pane's only by that ratio.
- **The pace.** The strip moves one screen's height every `ROLL_SECONDS` (18), as today: the same pixels a second. A
  unit pane passes a given line in 9 seconds.
- **The rail.** One tick a film, at the film's middle along the lap, so the vertical film's stretch is twice as long.
  The playhead marks the point of the lap under the screen's middle; a touch on the rail brings that point of the lap
  to the screen's middle. On today's strip these are the same rules (a pane was the screen).
- **The film in view** (the debug handle) is the pane under the screen's middle.
- **A keyboard's focus** brings the focused pane to the middle of the screen.

### 3. Words and marks

- The name and the roles stay bottom-left in their pane, at today's sizes and by today's fitting rules. The three
  longest names of chapter one fit a half pane with their roles (measured in the mock-ups: captions run 77 to 143 px
  high).
- They are placed from the pane's own bottom edge, at today's distance (the foot's height, the safe area and 26 px).
  So a pane standing at the screen's bottom shows its words clear of the foot: the lower pane's name is whole whenever
  the strip stands still.
- The upper pane's name is whole only where the pane is tall enough to hold the words under the header. The header ends
  at 124 px, and a name stands whole when its caption starts 144 px or more down its pane. Measured on 2026-11-24 in a
  hidden phone browser, with each of chapter one's 12 films standing still in the upper pane: 12 names whole at
  412 × 785 and taller and at 390 × 844; 11 at 390 × 750; 10 at 390 × 700; 9 at 360 × 700; 5 at 390 × 664 and at
  375 × 667; 2 at 360 × 640; none at 375 × 548 and 360 × 560. (An earlier text of this design said both panes' names
  were whole at arrival and under CALM. That held only on the tallest screens.) Rolling, every name is whole for
  about 7 to 11 seconds a lap, while its pane crosses the lower half.
- The bottom corner marks keep today's distance from the pane's bottom edge; the top marks stand 14 px inside the
  pane's top edge.
- The words fade under the header and the foot as today. The fade is already computed from the pane's place and the
  clear band separately.
- The dark gradient under the words covers the words' whole span in a half pane.

### 4. Loops

- Every pane on the screen plays its loop.
- The next pane to come in is loaded and paused. It starts the moment it enters: the strip's 150 ms beat finds it
  within about 7 px of travel, under the foot.
- Panes within one unit of the screen rest, loaded; further off they give their video back.
- So at most three loops decode at once, as today, and five are loaded (five or six today).
- Unchanged: loops play on every tier, Save-Data and a 2g line keep the posters, a refused play falls back as today.

### 5. Arrival and the rest

- **The strip arrives with film 1's bottom edge at the screen's bottom** (the owner, 2026-11-24: "Film 1 in the lower
  half"). Upright, film 1 stands in the lower half and the chapter's last film above it: the strip starts one pane
  early in its lap. With film 1 on top its name went under the header at once: whole for 0 seconds on screens up to
  700 px tall and for 0.4 to 1.8 seconds on taller ones, then not again until the lap came round, 108 seconds later
  (126 seconds with chapter one's 14 films).
  In the lower half it is whole for 8 to 10 seconds, as on the strip of 2026-10-20 (measured at 390 × 664, 390 × 844
  and 360 × 640). The rule in units: the strip starts the screen's units less film 1's units before the lap's start.
  So a chapter whose first film is vertical arrives with that film filling the screen, and a phone on its side
  arrives with film 1 filling the screen, as before. A channel change arrives the same way.
- The gate wipe at arrival covers every pane standing on the screen at arrival (upright: the last film and film 1),
  not the first only.
- Unchanged: a tap opens the film and a drag never does; the throw and its return to the roll; CALM never rolls by
  itself; the channel change; the LIST switch; the quiet section; a tablet and a desktop keep the floor.

## Units of code

- `works/reel.ts` (pure): the strip's arithmetic takes the unit's height, the screen's height and each pane's units.
  New or changed: the panes' units and places, the lap, `paneTop`, the lap progress and its inverse, the pane's
  keyframes, the pace, the rail's ticks and playhead, the film in view, the focus offset, `stripOrder`, `panePlay`.
- `works/reel-view.ts`: measures the two heights, gives each frame its units, lays the animations from them, and calls
  the loops' rule with the screen's real height.
- `styles/components.css` (the reel's block): a frame's height by its units; the words, the marks and the gradient
  placed from the pane; the arrival wipe; the sideways block keeps the whole screen.
- The local `CLAUDE.md` gains the rule: on a phone, a pane is half the screen and a vertical film's is the whole
  screen; sideways, every pane is the screen.

## Error handling

- A strip with no height yet (hidden under the LIST) measures from the window, as today.
- A turn of the phone re-measures both heights and re-lays the laps; the strip keeps its place in the lap.
- A loop that fails keeps its poster, as today.

## Tests

`reel.test.ts`, with the pane's and the screen's heights apart:
- every pane stands once in a lap and the screen is always covered: chapters of 1, 2, 5 with a tall pane, and 12;
  upright and on its side;
- a short chapter is laid again to the units the screen needs;
- a tall pane's lap and keyframes;
- the pace is one screen's height every 18 seconds;
- the rail's ticks by units, the playhead under the screen's middle, a touch on the rail;
- the words' fade on a half pane's lap matches the fade computed by hand;
- the loops' rule: on the screen plays, the next rests, far panes are freed, never more than three playing at the
  roll's pace.

`floor-ways.test.ts`: the pins that say a pane is the whole screen are rewritten to the new sizes; the words' and
marks' anchors; the arrival wipe; the pace; the sideways block.

## Verification

In a headless browser as a touch phone, never a visible window:
- 390 × 844: chapter one at arrival (film 1 in the lower half with its name whole, the last film above it), mid-roll,
  and its longest names; chapter two with the vertical film standing tall and uncropped;
- film 1's name from arrival: whole for about 8 seconds or more at 390 × 664, 390 × 844 and 360 × 640 (measured from the strip's first frame: 8.7, 10.7 and 8.3 s; from the arrival wipe's end: 8.3, 10.3 and 7.9 s);
- 360 × 640 and 412 × 915: two panes fill the screen;
- 844 × 390: one pane a screen, the vertical film whole in the middle;
- the pace from the first sample; a drag, a throw and its return to the roll; the rail; CALM; a tap opens the film;
  the channel change; the LIST and back;
- the count of playing loops at the roll's pace: three at most;
- a tablet and a desktop keep the floor;
- check, test and build; the same on the live site.

## Design calls for the owner

1. The words keep today's distance from the pane's bottom edge. In the mock-ups they stood 58 px lower; at that place
   the lower pane's name lay under the foot whenever the strip stood still.
2. The next pane starts as it enters, so three loops decode at most (approved; the other way was four).
3. The rail's playhead marks the film at the screen's middle.
4. A keyboard's focus brings its pane to the screen's middle.
5. The arrival wipe covers both panes on the screen.
6. A phone held on its side keeps one pane a screen.
7. A chapter of one or two films is laid again until the strip is long enough: upright, three units, four with a
   vertical film; never fewer than three panes.
8. The strip arrives with film 1 in the lower half (the owner's choice, 2026-11-24); the chapter's last film is the
   first picture at the top of the screen.
9. On a short screen the upper pane's name lies partly under the header while the strip stands still (the numbers are
   in "Words and marks"). Left as it is. One way to change it later: the words stand nearer their pane's bottom edge
   while the pane is in the upper half, and rise to clear the foot only at the screen's bottom.

## Out of scope

The desktop and tablet floor; the film pages; the performance round's device levels (the reel uses none of them).
