# The tall vertical pane, equal pillars, a floor without placeholders — design (2026-09-28)

The owner, on the shipped GALAXY Z FOLD 8 ULTRA round (87e8802):

1. "The verticle pane must be bigger and larger, as they are allowed to run irregular sizing. (work section)"
2. "Inside the Galaxy z fold page, the two columns must be equal-sized, not mismatch like this"
3. Mid-build: "also completely remove all placeholder panes from the work section."

## What was found

- **The vertical pane** has the carpet's row height: a 127 × 225 card, drawn 254 × 450, a third of a landscape pane's 800 × 450.
- **The pillars** balance their heights with different column counts: ad #1's stills 2 across (356 × 633 px at 1440), ad #2's 3 across (238 × 422). The stills differ in size from one pillar to the other.
- **The placeholders:** 21 entries with no film, 6 in CH·01 and 15 in CH·02, each with a folder of generated media. CH·01 also keeps one open gap (json 18), left where MISTCHILD's old pane stood so its neighbours kept their places.

## Design

### 1. The tall pane

- A vertical film's pane stands **two pane rows tall**: a 258 × 458 card (two rows and the seam between them), drawn 516 × 916, about 1.3 times a landscape pane's area. Every vertical film gets it.
- **The layout** gives a tall pane two stacked slots. A featured tall pane takes the cluster's right-hand column, top to bottom, and the other featured fill the rest row by row. A regular tall pane takes the first column with two free slots stacked, row-major. The lego pass advances all four lattice rows it covers together.
- **CH·02** becomes one block: KATARA and THE FATHER over FOREST ONSEN and JAECOO J5, with GALAXY standing the height of both rows at their right.
- **Its dress:** the spine keeps the id at full size (it fits now), the accent bar its full 30, the ticks the featured length. The poster dithers 413 px wide, the floor's 1.6 px per card unit.
- **Its hover:** upright and lifted 1.18 times, the 916-unit card stood 1081 px at the floor's opening zoom, over any laptop's height, and cut off the ad's own lines. A tall pane's hover now stands at most 84% of the screen's height (`hoverFit`), so the whole frame shows; a landscape pane keeps the plain lift at every zoom.

### 2. Equal pillars

- Both pillars take **one column count**, so every still is the same size: 3 across on a wide screen, 2 on a tablet or a phone. The pillars stay equal halves of the wall and one height.
- The shorter part's pillar ends in the hatch, and its first empty cell carries an end mark: `EOF ▪ DIGITAL AD #1`. The longer part's last empty cell carries its own. The mark's cell is as tall as its row: beside a still, a still's height; starting a row, its own line (on a phone, where the pillars stack, a full portrait row of hatch would be dead space).
- `pillarColumns` goes.

### 3. No placeholders

- The 21 placeholder entries leave `projects.json` and their folders leave the site.
- **The open gap goes too.** It held MISTCHILD's old corner so the neighbours would not slide; with the floor re-flowing it would only punch a hole in the middle of CH·01's right edge.
- **CH·01:** 13 films on a 5 × 3 band. The six featured stand 3 × 2 at the heart; SALINE THRONE and FAR EAST flank the top row, SODA COAST and SOFT HOURS the second; MISSION: IMPASSIBLE, HALIDE and MISTCHILD make the bottom row.
- **CH·02:** the five films above.
- 18 films in all: the dossier stamp reads P·NN/18. The placeholder machinery stays (a `null` film still reads PLACEHOLDER), unused.

## Tests

- `layout.test.ts`: `rowsOf`; CH·02's five as one 3 × 2 block with the tall pane in the right column; a regular tall pane in the first stacked pair of free slots; `packRows` advancing a tall pane's four rows together.
- `pillars.test.ts`: `posterWidthFor` 413 for 9:16; the tall card's size; `pillarColumns` gone; pins for the tall pane, the equal pillars and the end mark.
- `content-files.test.ts`: every film's new json position; CH·01 and CH·02 cell by cell; the counts; no placeholder, no gap, no orphan folder.
- `legend.test.ts`: none of the 18 is a placeholder.

## Design calls for the owner

- The tall pane: two rows, the right-hand column of CH·02's cluster; its hover fitted to 84% of the screen's height.
- The pillars 3 across on a wide screen; the hatch and its end mark under the shorter part.
- The open gap removed with the placeholders.
- The placeholder machinery kept, unused.
