# THE LIST on a laptop: the side machines come in — design (2026-11-24)

The owner, on THE LIST (`works.html?view=list`):

- "When I bring on this list in the Macbook laptops, windows laptops etc., the animation on the two left and right
  sides is not showing up, apparently because the central part got enlarged and took all the space. I believe this
  might be a resolution problem. Maybe this need to be able to dynamically adapt to each different resolutions that
  those devices uniquely possess?"

This amends one line of `2026-10-13-list-city-design.md` ("under 300 (1,440 wide) the city and the hardware but no
machines"). Everything else that design set stays.

## Why the machines were missing

- With a fine pointer every page is laid on a plate `max(1440, screen.width)` px wide and scaled with CSS `zoom`
  (`lib/poster-lock.ts`). So the list's margins follow the screen's width, not the window's.
- `sideLayout` (`works/list-art.ts`) took a margin as `floor((plate − 1,192) / 2)` and gave no machines under 300
  (`MACHINES_MIN`). `works/list-deco.ts` then hid the machines' canvas.
- The machines needed a plate of 1,792 or wider. Every laptop's plate is 1,440 to 1,728 (a 13" MacBook Air 1,470, a
  14" MacBook Pro 1,512, a 16" 1,728; Windows laptops at 1,366, 1,280 and 1,536 wide stand on 1,440 or 1,536). No laptop
  got the machines: the October design, working as written.
- A second switch, unchanged: the quality governor's lowest tier (LITE) hides the machines on any screen.

## The owner's choice

Three prototypes, shown as one picture at 1,440 × 900:

- A: the machines shrink to fit the thin side strips;
- **B: the list gets narrower, each row its name above its details, so full-size machines fit (chosen)**;
- C: full-size machines lean in from the screen's edges, partly cut off.

Screens 1,920 wide and more stay exactly as they are.

## The design

### 1. The column (`works/list-art.ts`)

- `columnFor(plate)`: the reading column narrows just enough to leave each margin 300 plate px, between 840
  (`COLUMN_MIN`, at the 1,440 plate) and today's 1,192 (`COLUMN`, from a 1,792 plate up).
  - 1,440 → 840; 1,470 → 870; 1,512 → 912; 1,536 → 936; 1,728 → 1,128; 1,791 → 1,191; 1,792 and wider → 1,192.
  - A plate under a laptop's (under 1,439) keeps 1,192, so nothing changes for it. The 1,439 lets a zoomed 1,440, which
    reads 1,439.99, keep its machines.
- `sideLayout` lays the margins against that column. A narrowed column's margin is rounded rather than floored, so a
  plate of 1,439.99 still holds 300.
- Every laptop's margin is 300: room for a machine 220 plate px wide, the lime bay plate and the cue above it. There are
  no callouts (as at 1,920; they need 2,560's room).
- On a 1,792 plate and wider, `sideLayout` gives the same numbers as before, to the pixel.

### 2. The rows (`styles/components.css`)

- Under `html.rvl-list-tight` the rows' group is `clamp(768px, 100% − 616px, 1120px)` wide: the column less 36 a side.
  The 616 is two margins of 300, plus 72, less the sheet's own 28 a side.
- A row stands its name over its details: `'thumb title open' / 'thumb meta open'`, the name taking the whole width
  between the thumbnail and OPEN. The thumbnail, the type sizes and OPEN are unchanged.
- With a city built, the sheet's black narrows to the same column: `clamp(420px, 50% − 300px, 596px)` either side of
  the middle. Nothing in the margins ever stands under a title.
- The city's own drawn frame (the dotted rule and ticks) follows `columnFor` too.

### 3. When the list narrows (decided here)

- **By the plate's width alone, never by the tier.** `pages/works.ts` sets the class as `listTight(plate, fine
  pointer)`. One device always reads one layout.
- The tier moves while the page is open: it can drop to LITE a few seconds after loading and reopen about a minute
  later. A layout that followed it would reflow every row under the reader. While the tier is LITE, a laptop's
  narrowed list keeps city-only gutters and no machines. LITE's own rule (no machines) is not changed.
- Measured at 1,440 × 900 with THE LIST open: `rvlQuality.set(0)` then `set(2)`. The rows' width (768) and total
  height (1,843 px) did not change, and no resize was observed. The machines hid at LITE and came back at FULL.
- A touch screen never narrows (it builds no city), and neither does a phone's reel.

### 4. The first frame (decided here)

- In the prototype the class came with the list's decoration code, a lazy chunk. Opening `?view=list` directly at
  1,440 × 900 painted one frame with the rows 1,120 wide, then reflowed them to 768.
- The class is now set in `pages/works.ts`, right after the poster lock, when the plate and the pointer are first
  known and before the first `await`. It is set again on every resize, after the lock's own refit.
- Measured on the built site: the first painted frame of the list is already 768 wide, by both ways in (straight to
  `?view=list`, and the floor then THE LIST's button). The city arrives a frame later, as it does today. That frame is
  plain black, and the rows do not move.
- `works/list-deco.ts` never sets or clears the class.

## Units of code

- `src/works/list-art.ts`: `COLUMN_MIN`, `columnFor`, `listTight`; `sideLayout` reads the column.
- `src/works/list-deco.ts`: the city's column frame from `columnFor`; its header comment.
- `src/pages/works.ts`: the class, after the poster lock and on resize.
- `src/styles/components.css`: the narrowed band and the stacked rows.

## Tests (`tests/list-art.test.ts`)

- `columnFor` at 1,440, 1,439.99, 1,470, 1,512, 1,536, 1,728, 1,791, 1,792, 1,920 and 2,560, and at 1,438
  (unchanged).
- A zoomed 1,439.99 keeps both bays' machines.
- The wide screens' margins pinned to the values the code of 2026-10-13 gives, read off it before the change: 1,920 ×
  1,080, 2,000 × 1,131 and 2,560 × 1,440, both sides, every slot, plate, spine and label lane.
- Every plate from 1,440 to 1,791 (by half pixels, at three heights): both bays' machines, 220 wide, nothing over the
  narrowed column.
- `listTight`: a laptop with a fine pointer only; never a touch screen, never 1,792 or wider.
- The earlier tests that assumed a fixed column read `columnFor`. They still protect what they did: nothing crosses
  the column at any screen; phones and tablets build nothing; a margin under 300 keeps its hardware alone (now at
  1,438); the conduit runs bay to bay (now at 1,440 too).
- The three places agree: the CSS band's `clamp()` halves and the rows' width are read from `components.css` and tied
  to `COLUMN_MIN`, `MACHINES_MIN`, `COLUMN`, the rows' 1,120 and the sheet's padding.
- The stacked row's grid areas.
- The class is set after the poster lock and before the first `await`, from the same plate the decoration reads; the
  decoration never touches it.
- These source pins normalise line ends.

## Verification (a hidden Chrome, the built site, the tier pinned to FULL unless said)

- Eight laptop screens: 1,470 × 956, 1,440 × 900, 1,280 × 800, 1,512 × 982 and 1,728 × 1,117 at DPR 2; 1,366 × 768;
  1,536 × 864 at 1.25; 1,280 × 720 at 1.5.
  - On every one, both bays' machines show with their lime plates.
  - They are 220 px wide on screen (196 at 1,280 wide, 209 at 1,366, where the plate is scaled down).
  - The machines move: two crops a second apart differ, with the city hidden.
  - Nothing stands over a title, and the column is pure black behind the rows.
  - No name runs to more than two lines.
  - A name has 522 to 810 px where it had 446.
  - No console errors.
- 1,920 × 1,080, 2,000 × 1,131 and 2,560 × 1,440: still (CALM) frames byte-identical to the unchanged build's, with the
  same slots. Two runs of the unchanged build were identical to each other first.
- Touch at 390 × 844, 1,180 × 820 and 1,366 × 1,024: no city, as before.
- The keyboard: Tab reaches all 19 rows in order, each row stacked. The focus ring is whole around the row and inside
  the sheet. As before the change, a row the Tab has just scrolled to has its ring's bottom 5 px under the screen's edge.
- The unpinned tier on a laptop: a 1,440 × 900 screen, no `?gfx=`, a fresh browser per run, an integrated GPU's name,
  8 GB or 16 GB with 8 threads, the processor slowed six times.
  - Straight to `?view=list`, the list opened at LITE, with no machines, at 3, 15 and 30 s. It stood at BALANCED, with
    the machines, at 75 s. This held on both profiles, on this branch and on the weak-machine release.
  - By the floor and then THE LIST's button, it was the same in three runs of four. In the fourth (16 GB, this branch),
    the floor had already reached BALANCED, and the list stood at FULL with its machines from 3 s.
  - The rows stood 768 wide in every reading: the tier never moved them. The same page unslowed held FULL at 57 to
    60 frames a second.

## Design calls for the owner

1. The column narrows on every laptop, so the list itself is narrower there: 768 px of rows at 1,440, against 1,120.
2. A row's name stands over its details on a laptop. On wider screens they stay side by side.
3. A laptop's machines are 220 plate px wide (284 at 1,920, 412 at 2,560), and have no callouts.
4. The layout follows the screen, never the tier. While a weak laptop runs at LITE, its narrowed list keeps the city
   in the gutters, with no machines.
5. The narrowing ends at 1,792 wide. From there up nothing changes. Between 1,728 and 1,792 the column is almost full
   width again.

## Out of scope

Phones and touch screens (they build no city); what LITE shows; the machines' drawing.
