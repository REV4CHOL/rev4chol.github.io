# MISTCHILD to NEON LITURGY's corner — design (2026-09-27)

The owner: "Move MISTCHILD to neon liturgy."

## What was found

- On CH·01, NEON LITURGY (a placeholder, json 18) holds the ring's top-right corner, and MISTCHILD (json 32) holds the bottom-right corner. Both are regular panes.
- The ring fills first-fit in json order, so exchanging the two entries exchanges their spots, and nothing else moves.

## The design

- **A swap.** MISTCHILD takes json 18, the top-right corner, and NEON LITURGY takes json 32, MISTCHILD's old corner.
- **Why a swap.** The owner didn't ask for MISTCHILD's old spot to be held. When they wanted the spots left empty after the last move, they said so. A swap keeps the 5 × 4 floor whole and deletes nothing.
- **If the owner prefers otherwise:**
  - to hold that corner empty, replace NEON LITURGY's line with a held place;
  - to drop NEON LITURGY and leave a gap, delete its line.

## Tests

`content-files`:
- MISTCHILD's json slot is 18;
- the CH·01 layout puts MISTCHILD at (4, 0) and NEON LITURGY at (4, 3).

## As built

- The two entries' text spans were exchanged, and exactly json 18 and 32 changed.
- The pane read back the grid below, with MISTCHILD's loop playing in the corner under the "2025 · MISTCHILD" caption.
  ```
  glass-harvest  | saline-throne | copper-lullaby | rust-choir | mistchild
  acid-pastoral  | PHILIA        | MIEN-VIEN      | [ held ]   | soda-coast
  gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH  | [ held ]   | far-east
  salt-cathedral | velvet-static | winter-arcade  | halide     | neon-liturgy
  ```
- 284 tests pass.
