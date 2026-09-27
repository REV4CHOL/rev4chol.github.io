# The fourth batch: REMNANTS OF A DREAM, MISSION: IMPASSIBLE, and JAECOO J5's new cut — design (2026-09-27)

The owner:

- "Change JAECOO J5 to JAECOO J5: Every Road Leads Home, and also change its embed code for watch to" YouTube `IXWAZwI5Xug`.
- REMNANTS OF A DREAM (`2026 TTCMGM_webloop`): "Replace the empty blank space in chapter 1 with this." YouTube `tKWevMRBOzY`; 2026; Colorist; 24:16; Drama / Indie Short Film; "Avalon promises a bright future, but at what cost?"
- MISSION: IMPASSIBLE (`2025 TuChienPhongThi_webloop`): "Replace Copper Lullaby in chapter 1 with this." YouTube `R3tSyucJERw`; 2025; Colorist; 01:36; Comedy / Indie Short Film; "Failure is not an option. Neither is studying."

## What was found

- **The floor today** (json order fills the featured cluster, then the ring first-fit):
  ```
  CH·01  glass-harvest  | saline-throne | far-east      | soda-coast  | ·  (open gap, json 18)
         acid-pastoral  | PHILIA        | MIEN-VIEN     | AN-HOI      | soft-hours-lonely-lands
         gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH | [ held 25 ] | copper-lullaby (json 27)
         salt-cathedral | velvet-static | winter-arcade | halide      | mistchild
  ```
- **"The empty blank space"** is the held place at json 25.
  - On 09-27 the owner asked for two blank panes: "leave the original panes as they left blank, i am about to fill in two more to those two positions".
  - "ĂN HỎI" filled the upper one (json 12). This is the second film, and json 25 is the place that was kept for it.
  - The top-right corner (json 18) is different: it is open floor, because the owner asked to "remove the pane" there. It stays open.
- **The links.** All three videos are public and embeddable on the REVACHOL channel (oEmbed 200), and their titles match the brief.
  - JAECOO J5's old link, `EGIm1gD-KTE`, now returns 404, so its WATCH button is dead on the live site today.
  - The new cut runs 2:46 (YouTube `lengthSeconds` 166), but the site says 2:43, which was the old cut's length.
  - REMNANTS is 24:16 (1456 s), matching the owner's figure.
  - MISSION is 97 s on YouTube; the owner's 01:36 is kept.
- **The sources.** Both loops are 1280 × 720 H.264, each with a stray data track. Both folders' stills are 3840 × 2160 JPEGs. There is no `*_thumbnail_*` in either folder.

  | Film | Loop | Picture | Stills |
  |---|---|---|---|
  | REMNANTS | 7.2 s, 23.976 fps | full frame, 16:9 (edge rows and columns carry picture) | 40, full frame; four shots (12, 14, 15, 36) carry the film's own 4:3 pillarbox |
  | MISSION | 6.1 s, 24 fps | letterboxed: rows 92–627 are clean picture, rows 88–91 and 628+ are black, so scope | 24, in two letterbox sizes: rows 277–1882 (15 of them) and rows 270–1889 (9) |

- **Five of MISSION's 24 stills are the same frames twice** (mean luma difference 0.1–7.0 on a 0–255 scale, then checked side by side):
  - 24 = 5, 16 = 3, 20 = 11, 23 = 15, and 22 = 14 (the hand a hair further on).
  - Each pair is one frame exported twice, once with each letterbox. Stills 19 and 7 are different moments of one shot, and both stay.
- **Poster.** Neither loop opens on a frame that a still matches: the nearest stills differ by a mean of 28 and 30 luma. So each poster is the loop's own first frame, as FOREST ONSEN's was.
- **The loop ends.** The last frames' mean luma is 63 for REMNANTS and 80 for MISSION, so neither loop wraps through a black frame.

## The design

### A. JAECOO J5's new cut

In json 15 three fields change; every other byte of the entry stays:

- the title becomes `JAECOO J5: Every Road Leads Home`;
- the film becomes `https://www.youtube.com/embed/IXWAZwI5Xug`;
- the runtime becomes `2:46`.

The runtime is a design call: the owner did not mention it, but the old figure described the old cut, and the new one runs 2:46.

The slug stays `jaecoo-j5`, so its address, folder and the pane strip `2026 · JAECOO-J5` are unchanged. The poster, loop and 54 stills stay.

### B. The new films

- **Entries** follow the third batch's shape and rules. The owner's text is used verbatim, runtimes are written `m:ss`, and genres become lowercase tags, one per genre.

  | | REMNANTS OF A DREAM | MISSION: IMPASSIBLE |
  |---|---|---|
  | slug | `remnants-of-a-dream` | `mission-impassible` |
  | slot | 25 (the held place) | 27 (COPPER LULLABY's) |
  | chapter / size | human / large (featured) | human / normal |
  | title | `Remnants of a Dream` | `Mission: Impassible` |
  | year · role | 2026 · Colorist | 2025 · Colorist |
  | runtime | 24:16 | 1:36 |
  | tags | drama, indie short film | comedy, indie short film |
  | aspect | 16:9 | 2.39:1 |
  | accent | `#ED6B85` | `#F5AE4A` |
  | film | YouTube `tKWevMRBOzY` | YouTube `R3tSyucJERw` |

  The credit is `[{ role: "Colorist", name: "Revachol" }]`, and `filmPending` is false.
- **Accents.** Each is the film's own hue, lifted for legibility on black, and set apart from the colours around it (CIELAB ΔE76 in brackets).
  - REMNANTS: the rose-red of its paper crane and striped wall. The film's reds run from crimson to brick.
    - LIEN QUAN's vermilion `#FF5C4D` sits two panes along the same row, so the accent takes the cooler, rose end [33].
    - Against its neighbours: ELECTRIC FISH 59, SOFT HOURS 30, ĂN HỎI 73, HALIDE 66.
    - Contrast on black is 6.8:1.
  - MISSION: the ochre of the school's walls and pillars, warmed to marigold.
    - The paler ochre sat within ΔE 10 of FAR EAST's wheat `#EFC468`. Marigold is 16 from it, and FAR EAST is two rows up.
    - Against its neighbours: SOFT HOURS' coral above 34, MISTCHILD's blue below 91.
    - Contrast on black is 10.6:1.
- **Media**, by the established recipes. Loops are video only, with no data or timecode track, at CRF 23 (raised for a grainy loop).

  | Film | Loop | Poster | Stills |
  |---|---|---|---|
  | REMNANTS | 1280 × 720 | 1280 × 720, the loop's first frame | 40 at 1600 × 900 |
  | MISSION | 1280 × 534, `crop=1280:534:0:93:exact=1` | 1280 × 534, the loop's first frame, same crop | 19 at 1600 × 670, cut in rgb24 inside rows 277–1882 (inside both letterbox sizes) |

  Stills are numbered `01.jpg`… in Resolve label order (A.B.C, numeric). MISSION's five repeats are left out, keeping the first of each pair: labels 1.5.1, 1.19.1, 1.24.1, 1.26.1 and 2.2.1.
- **COPPER LULLABY leaves the site**, entry and folder. It was a placeholder.
- **REMNANTS fills the held place** at the same size, so it lands exactly there, featured. CH·01 has no held place left.

### The result

```
CH·01  glass-harvest  | saline-throne | far-east      | soda-coast          | ·  (open gap)
       acid-pastoral  | PHILIA        | MIEN-VIEN     | AN-HOI              | soft-hours-lonely-lands
       gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH | REMNANTS-OF-A-DREAM | mission-impassible
       salt-cathedral | velvet-static | winter-arcade | halide              | mistchild
```

Totals:

- 39 films: 17 real (MIEN VIEN still awaits its link) and 22 placeholders.
- No held place, and 1 open gap.
- CH·01: 19 films (6 featured) + 1 gap. CH·02: 20 films, unchanged.
- The dossiers count to /39.

## What does not change

- The layout engine, the parser and the world.
- Every other entry's bytes.
- CH·02's floor.
- The other pages, and `about-old.*`.

## Tests

- **`content-files.test.ts`:**
  - The fourth batch: each film at its slot, with every field, its credit, film link, poster, loop and exact still count (40 and 19).
  - JAECOO J5: the new title, film and runtime, and every other field as before.
  - The CH·01 history test, restated for today:
    - both held places are filled (12 and 25) and none is left;
    - FAR EAST at 9 and SODA COAST at 16 as before;
    - COPPER LULLABY joins the removed list, entry and folder;
    - the open gap is unchanged.
  - CH·01 cells: `remnants-of-a-dream` at [3, 2], `mission-impassible` at [4, 2].
  - Counts: CH·01 19 films with 6 featured, on a 20-pane floor with 6 large; CH·02 20 with 6.
- **`legend.test.ts`:** 22 placeholders and 17 films.

## Verification (real Chrome over CDP, dev then live)

- **CH·01:**
  - the world's grid read back as above, with no held screen and the one gap measure;
  - REMNANTS' loop plays in the cluster under a rose FEATURED tag;
  - MISSION's scope card is 538 wide on the right edge;
  - the HUD reads "19 PROJECTS LOADED".
- **Hover labels:** each film's title and meta, in its accent.
- **Dossiers:**
  - REMNANTS and MISSION: a one-line headline, the stills in order (40 and 19), and WATCH opening their links.
  - JAECOO J5: the new title on one line, WATCH opening `IXWAZwI5Xug`, and RUNTIME 2:46.
  - COPPER LULLABY's old address reads SIGNAL LOST.
- **Flips:** each way, with no errors.

## As built (2026-09-27)

- **Data.** The splice changed exactly json 15, 25 and 27; the other 37 entries are byte-identical. The file has 40 entries: 39 films and 1 open gap (json 18). `copper-lullaby/` is gone.
- **Media:**

  | Film | Loop | Poster | Stills |
  |---|---|---|---|
  | REMNANTS | 1280 × 720, CRF 23, 0.95 MB | 1280 × 720 | 40 at 1600 × 900 (3.6 MB in all) |
  | MISSION | 1280 × 534, CRF 23, 0.84 MB | 1280 × 534 | 19 at 1600 × 670 (1.9 MB in all) |

  Every edge row of MISSION's poster and stills carries picture, and both loops are video-only with every frame kept (173 and 147).
- **In real Chrome (dev, 1440 × 900):**
  - CH·01 read back as the grid above: 19 panes, no held screen, 1 gap measure, HUD "19 PROJECTS LOADED".
  - REMNANTS is featured, and its loop runs (0.88 s → 2.08 s). MISSION's card is 538 wide.
  - The hover labels read, in each film's accent:
    - "REMNANTS OF A DREAM · 2026 · COLORIST · 24:16" in `rgb(237, 107, 133)`;
    - "MISSION: IMPASSIBLE · 2025 · COLORIST · 1:36" in `rgb(245, 174, 74)`;
    - in CH·02, "JAECOO J5: EVERY ROAD LEADS HOME · … · 2:46".
  - The dossiers:
    - REMNANTS: P·25/39, headline 103.5 px on one line, 40 stills in order;
    - MISSION: P·27/39, 120.4 px, 19 stills;
    - JAECOO J5: P·16/39, 64.3 px, RUNTIME 2:46, its 54 stills.
    - WATCH opens `tKWevMRBOzY`, `R3tSyucJERw` and `IXWAZwI5Xug`.
  - `?p=copper-lullaby` reads SIGNAL LOST. The flips ran clean each way.
  - No console errors. The only 404s are the three `hover.mp4` probes (by design) and `favicon.ico`.

## Found in verification: a pane crossed in one quick move stayed awake

- **Seen.** In the verify run, MISSION was hovered straight after REMNANTS (one move), then the pointer went to the WORK link. MISSION stayed awake — lifted, looping, its label up — with the pointer on the nav, and then on bare floor.
- **Cause, read in Pixi 8.20.1's `EventBoundary.mapPointerMove`:**
  1. When the pointer arrives from another target (bare floor, or the neighbouring pane — on this edge-to-edge floor, nearly always), Pixi computes the event's path before dispatching `pointerover`.
  2. The pane's `pointerover` handler wakes it, and waking lifts the pane from `tilesLayer` into `fxLayer`.
  3. Pixi then stores the pre-lift path as the pointer's `overTargets`.
  4. On the next move, `findMountedTarget` stops at `tilesLayer`, the deepest part of that path still attached. The `pointerout` goes there and bubbles up, never reaching the pane.
  5. So if that next move already leaves the pane, the pane never sleeps.
- **Why nothing repaired it.** Pixi's ticker re-sends the pointer's position (which would re-record the path) only while a `dynamic` object is on the stage. Every hit test pauses it, and the floor's tiles and stage are all `static`, so the ticker never runs.
- **Fix.**
  - Hover no longer rides the panes' own `pointerover`/`pointerout`. On every pointer move, a stage `globalpointermove` handler takes the pane Pixi's hit test found under the pointer, checks that the pointer is on the floor itself (the existing `elementFromPoint === canvas` guard), and asks a pure rule, `paneToWake(hit, onFloor, awake, dragging)` (`src/works/hover.ts`), which pane should be awake.
  - The rule: the pane under the pointer on the floor; none on bare floor or over the chrome; a drag wakes nothing but keeps the pane moving along under the pointer.
  - A `pointerleave` on the canvas (onto the chrome, or out of the window) puts the awake pane to sleep.
- **Tests.**
  - `wayfinding.test.ts` covers the rule's cases.
  - Pins cover the stage handler, the rule's call and the canvas `pointerleave`.
  - A guard fails if `world.ts` wires `tile.on('pointerover'` or `tile.on('pointerout'` again.
- **Verified in real Chrome (`scratchpad/ux/hover-regress.mjs`):**
  - One move onto a pane, then one move to bare floor: it sleeps.
  - REMNANTS → MISSION → the WORK link: nothing awake.
  - Pane → each chapter tab: nothing awake, SWITCH ▸; then bare floor: the label clears.
  - The canvas `pointerleave`: the pane sleeps.
  - A drag across the floor: nothing wakes.
  - A slow sweep across three panes: the last one is awake. It stays awake while the pointer is still inside its lifted (larger) frame, as designed.
