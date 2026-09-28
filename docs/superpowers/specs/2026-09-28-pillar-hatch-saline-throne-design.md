# GALAXY's ad #1 pillar: the hatch drawn soft; SALINE THRONE off the floor — design

2026-09-28. Two owner notes after the tall-pane round (5088e3f):

- "the galaxy fold page have some grain error in the still column of digital ad 1. Fix."
- "Also in chapter 1, remove the placeholder Saline Throne pane"

## 1. The grain in ad #1's pillar

**What it is** (measured on the live site, real Chrome, 1440 × 900):

- Ad #1 has six stills and ad #2 eleven. Since 5088e3f both pillars run 3 across, so ad #1's pillar is two rows of
  stills, its EOF mark, then about two and a half rows of the `.p-vgrid` hatch.
- The hatch was `repeating-linear-gradient(135deg, rgba(237, 237, 230, 0.13) 0 1px, transparent 1px 12px)`: a
  hard-edged line one CSS pixel wide, every 12 px. Chrome samples a gradient at each device pixel's centre and does
  not smooth a hard stop, so a line that thin renders by luck of phase. The poster lock's zoom (0.99 at 1440 wide,
  1.32 at 1920) and the screen's density move each line's phase: at 100% scale one line comes out a solid staircase,
  the next a chain of lone dots. Over a field 700 px wide the dotted lines read as grain.
- It is not the site's grain layer. The wall is carved out of the grain and the scanlines (hole 2 sits on the wall's
  rect, checked). A capture with both layers hidden differs from the shown one by 0 in every pixel.

**The fix:** the same hatch, each line drawn as a soft ramp: clear, up to 0.13 at 1 px, back to clear at 2 px, then
clear to 12 px. The ink per line is what it was (the ramp's area is 0.13 px, the old line's 1 px × 0.13), so the
pattern keeps its weight. A ramp two pixels wide samples evenly at any phase, so every line renders alike at 100%,
125%, 150% and 200% and under any poster-lock zoom. It is one declaration, `.p-vgrid`'s background: the pillars' feet,
the EOF cells and a single vertical grid's empty cells all take it.

**Why not remove the hatch:** the owner asked for an error to be fixed, not the pattern dropped; the closing report
that shipped the pillars named the hatch. A plain void under the EOF mark is the one-line alternative, offered in the
closing report.

## 2. SALINE THRONE leaves CH·01

- SALINE THRONE is the last of the placeholders generated in phase 1 (f7b7697, "generated placeholder media"): a
  poster, loops, thirty stills, a synopsis nobody wrote for it, and a 12-second synthetic `film.mp4` that exercised
  the self-hosted player. The cut of 2026-09-28 took every film with no film (`isPlaceholder`). SALINE THRONE carried
  its generated test film, so it passed as a real one.
- Out: its entry (json 5) and its folder (`git rm -r`).
- CH·01 re-flows to twelve films on a full 4 × 3 block, no slot empty (the layout's own re-flow):

  ```
  PHILIA        MIEN VIEN       ĂN HỎI       FAR EAST
  LIEN QUAN     ELECTRIC FISH   REMNANTS     SODA COAST
  SOFT HOURS    MISSION         HALIDE       MISTCHILD
  ```

  The six featured stand 3 × 2 at the top left; MISTCHILD stays last, bottom right. CH·02 is unchanged.
- json after: 0 philia, 1 mien-vien, 2 katara, 3 the-father, 4 forest-onsen, 5 far-east, 6 an-hoi, 7 lien-quan,
  8 jaecoo-j5, 9 soda-coast, 10 electric-fish, 11 galaxy-z-fold-8-ultra, 12 soft-hours-lonely-lands,
  13 remnants-of-a-dream, 14 mission-impassible, 15 halide, 16 mistchild. 17 films; the dossiers stamp P·NN/17.
- The self-hosted (`local`) film mode stays in the code and in HOW-TO-EDIT.md; no film uses it now.
- The guard that would have caught it: no film on the list may carry a slug that the placeholder generator
  (`scripts/gen-placeholders.ps1`) makes.

## Tests

- pillars.test.ts: the hatch has no hard edge (every change of tone runs over a pixel at least) and keeps its ink
  (0.13 px per line, a line every 12 px, at 135°).
- content-files.test.ts: the json positions renumbered; CH·01's cell map (4 × 3); 12 (6 featured) + 5 = 17;
  SALINE THRONE with the placeholders gone; the generator guard.
- legend.test.ts: 17 films.

## Verification

- Dev, then live, in real Chrome: the pillar's foot magnified at DPR 1, 1.25, 1.5 and 2 (every line alike); the EOF
  cells; no console errors.
- Works: CH·01 12 panes, no blank, no gap, the 4 × 3 block; CH·02 unchanged; a phone's opening frame.
- Dossiers: P·01/17 to P·17/17; the next-film chain skips nothing; SALINE THRONE's old address behaves as every
  removed film's does.

## Design calls (for the closing report)

- "grain error" read as the hatch's dotted lines: the hatch kept, drawn soft. The alternative: no hatch, plain void
  under the EOF mark.
- CH·01's featured six move from the middle of a band five wide to the top left of the 4 × 3 block.
