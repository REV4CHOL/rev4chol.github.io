# Every pane at the featured size; the menu HOMEPAGE, WORK, ABOUT, CONTACT — design (2026-09-27)

The owner, mid-build on the second film batch:

1. "Work Section: Also all panes outside the FEATURED must have the similar sizes as their FEATURED counterparts."
2. "The sections' order must be: Homepage => WORK => ABOUT => CONTACT."

## What was found

- **The floor.** `src/works/layout.ts` lays a contiguous carpet on a lattice of 400 × 225 cells.
  - A regular pane is one cell. A featured pane (`tileSize: "large"`) is a 2 × 2 block (`SIZE_MUL_LARGE` 2), reserved as one centred cluster, and the 1 × 1s wrap around it.
  - Each chapter holds 20 panes, 6 of them featured, so 14 of the 20 are a quarter of the featured area. That now includes two of the owner's real films, HALIDE and MISTCHILD.
- **Size and featured-ness are already two things.**
  - A tile's scale comes from its placed span (`sizeMul`).
  - The featured dress comes from `tileSize`: the inset rule, the FEATURED tag, the photographic poster mix.
  - So a pane can be big without being featured.
- **Arrival and exit animations** alternate their direction by lattice-row parity (`row % 2`) and stagger by `row % 3`.
- **The camera opens on the world origin** at scale 1 on every device (no initial zoom).
- **The menu** is `site.json`'s `nav`. The header, every page's swipe and glide neighbours, and the cues all follow it (`navNeighbors`). Today it reads HOMEPAGE · ABOUT · WORK · CONTACT · STORY.

## The design

### A. Equal panes

- **`layoutProjects` places panes, not cells.** Every pane is a 2 × 2 block of cells, the size a featured pane always had.
  - The panes sit on a centred landscape band of pane slots: of the shapes from square to 2.2:1, the one leaving the fewest empty slots, nearest 1.6 on a tie (see As built: the first cut's `round(√(1.6·n))` left a ragged row).
  - The featured still gather as one solid cluster at the heart of the band, reserved before anything else places.
  - Every other pane fills around them first-fit and row-major, always rescanning from the top, so the band has no holes.
- **The cluster's centre is shifted onto the world origin**, where the camera opens, so arrival still lands on the featured.
- **Explicit `position` pins are read in pane slots** (`{ "col": 1, "row": 0 }` is the band's second pane on the first row), placed before anything else. No film uses a pin today; HOW-TO-EDIT says so.
- **Featured stays a dress, not a size.** Regular panes keep their poster rhythm, with a third in hard duotone.
- **Arrival and exit alternate and stagger by the pane's band row** (`paneBand = ⌊row / span⌋`, a pure helper), so the rhythm survives the even rows.
- **Each chapter** becomes 20 equal panes on a clean 5 × 4 block, with the six featured at the centre as 3 × 2 and the other fourteen as the ring.

### B. The menu

`site.json`'s `nav` becomes HOMEPAGE, WORK, ABOUT, CONTACT, STORY.

- **STORY stays at the line's end.** The owner placed it after CONTACT on 2026-09-16, and this order names the four before it.
- **The swipe and glide chain follows the data:** HOMEPAGE ▸ WORK ▸ ABOUT ▸ CONTACT ▸ STORY.
- No page carries a hard-coded neighbour, since every one calls `navNeighbors(site.nav, …)`.

## What does not change

- The panes' order in `projects.json`, the chapters, the featured six and their dress.
- The posters, the loops, the dossiers, the pinch zoom.
- Every other page.
- `about-old.*`.

## Tests

- **`tests/layout.test.ts`** (the `packRows` cases stand):
  - every pane is a 2 × 2 block, featured or not;
  - deterministic;
  - no overlaps;
  - contiguous;
  - no holes in any band row;
  - the featured form one solid cluster centred within half a cell of the origin, whatever the stream order;
  - organic growth from 13 to 212 panes, with the band's width and the cluster's envelope bounded;
  - pins honoured in pane slots and kept clear;
  - `paneBand` alternates row by row.
- **`tests/content-files.test.ts`:** the nav pin.

## Verification in the pane

- **Desktop, both chapters:** every pane's scale and extent equal, the featured cluster in the opening view, the arrival animation playing.
- **Phone preset:** the floor.
- **The menu:** the header order, and the glide cues from HOMEPAGE (▸ WORK) and ABOUT (◂ WORK, ▸ CONTACT).

## As built (2026-09-27)

- **The band rule changed during the build.** The first cut kept the old `round(√(1.6·n))` width. Twenty panes then lay 6 × 4, with a last row of two and a ragged corner. The band now picks, among the landscape shapes (square to 2.2:1 in panes), the one that leaves the fewest empty slots, nearest 1.6 on a tie.
  - Both chapters are a clean **5 × 4 block**. The six featured sit at the centre as 3 × 2, and the other fourteen form a complete one-pane ring around them.
  - CH·01's ring includes HALIDE and MISTCHILD on the bottom edge.
  - CH·02's centre is STATIC-HYMN, KATARA and THE-FATHER over TENDER-MACHINES, JAECOO-J5 and TERMINAL-BLOOM.
- **In the pane (desktop and phone):**
  - all 20 panes have span 2 and `sizeMul` 2, with one extent per aspect (16:9 500 × 250, scope 610 × 305, 4:3 420 × 210, at ISO);
  - the opening view's nearest panes are the featured;
  - the header on both reads HOMEPAGE · WORK · ABOUT · CONTACT · STORY;
  - the homepage's scroll cue leads to WORK, and ABOUT's to CONTACT.
- **Found on the way: a teardown leak.** On a channel flip, panes flying out under a still pointer woke hover tweens. `destroy()` then tore the scene graph down under them, and the next ticks threw `Cannot set properties of null (setting 'x')` from `ProjectTile.applyMatrix`. The bigger panes made it easy to hit. Two fixes:
  - `hover()` refuses while the world is exiting.
  - `destroy()` kills every tile's tweens (`ProjectTile.killTweens`) and the layers'.
  - Re-run with a pane hovered at each flip (ELECTRIC-FISH, then TERMINAL-BLOOM), both directions, polling each mount (about 9 s each on the pane's software GPU): no errors. Pixi's BindGroup teardown warnings stand, as before.
- **Tests:** `layout.test.ts` is rewritten for the equal-pane contract, with the shipped-chapter block pinned 5 × 4, featured inside and the rest on the ring, plus one `packRows` case for equal 2 × 2 panes. 278 passed, 3 skipped.
