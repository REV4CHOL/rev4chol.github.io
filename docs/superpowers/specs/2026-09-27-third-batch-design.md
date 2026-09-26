# The third batch: FOREST ONSEN, SOFT HOURS & LONELY LANDS, "ĂN HỎI" CEREMONY — design (2026-09-27)

The owner:

- "Change all Sound Mixer roles written on every project to Sound Designer."
- "And move FAR EAST to Copper Lullaby (chapter 1)" and "move SODA COAST to RUST CHOIR (chapter 1)".
- FOREST ONSEN: "Replace TENDER MACHINES in chapter 2 with this." YouTube `5drz5nwLdKM`; the title "FOREST ONSEN - Ecopark's Eco Retreat Commercial"; 2026; AI Lead / Colorist; 00:47; Real Estate / TV Commercial; "Change your life’s experience, with Forest Onsen."
- SOFT HOURS & LONELY LANDS: "Place at the pane where SODA COAST just left." YouTube `G_wItkJWT2o`; 2025; Director / Colorist / Editor / Sound Designer; 01:46; Experimental; "The stillness of ordinary moments, in familiar places that feel strangely distant, with the extraordinary emotions for the empty spaces."
- "ĂN HỎI" CEREMONY: "Replace upper blank space in chapter 1 with this. This is a featured." YouTube `XKkHkLVUC40`; the title `"Ăn Hỏi" Ceremony`; 2026; Director / Colorist / Editor / Sound Designer; 03:17; Experimental / Slice of Life; "Gathering together, saying the first words, for their time spent together for all eternity."

## What was found

- **The floor today** (json order fills the featured cluster, then the ring first-fit):
  ```
  CH·01  glass-harvest  | saline-throne | copper-lullaby  | rust-choir     | mistchild
         acid-pastoral  | PHILIA        | MIEN-VIEN       | [ held 12 ]    | soda-coast
         gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH   | [ held 25 ]    | far-east
         salt-cathedral | velvet-static | winter-arcade   | halide         | neon-liturgy

  CH·02  midnight-protocol | signal-decay    | last-transmission | pale-circuitry | hollow-signal
         dead-channel      | STATIC-HYMN     | KATARA            | THE-FATHER     | iron-lullaby
         dream-compiler    | TENDER-MACHINES | JAECOO-J5         | TERMINAL-BLOOM | latent-scripture
         neural-drift      | oracle-fatigue  | phantom-dataset   | silicon-vespers| weight-of-ghosts
  ```
- **The json slots in play:**

  | Slot | Holds |
  |---|---|
  | 5 | TENDER MACHINES (featured, CH·02) |
  | 9 | COPPER LULLABY |
  | 12 | the upper held place |
  | 16 | RUST CHOIR |
  | 24 | SODA COAST |
  | 25 | the lower held place |
  | 27 | FAR EAST |

  All are placeholders except SODA COAST and FAR EAST.
- **"Sound Mixer"** appears only in `projects.json`: the role and the credit of KATARA, JAECOO J5 and mr_PURPLE_dreams_in_electric_fish. SODA COAST already reads Sound Designer.
- **The sources.** There are no `*_thumbnail_*` files this time. Each loop is 1280 × 720:

  | Film | Loop | Picture area | Stills |
  |---|---|---|---|
  | FOREST ONSEN | `loop-4.mp4`, 11.4 s | full frame, 16:9 | 10 at 3840 × 2160, full frame (the folder's `.drx` grade files are not media) |
  | SOFT HOURS | 8.9 s | letterboxed; rows 93–626 are clean picture (row 92 and row 627 are blended), so scope | 36, picture rows 277–1882 |
  | ĂN HỎI | 11.6 s, 25 fps | pillarboxed; columns 160–1119, so 4:3 | 35, picture columns 480–3359 |
- **Fonts.**
  - Clash Display, Bodoni Moda and Martian Mono carry `Ă` but not `Ỏ`/`ỏ` (U+1ECE/F), nor the combining hook above (U+0309); only Geist Mono has the Vietnamese block.
  - So wherever the title shows in a display face, the browser borrows that one letter from a system font: the hover label, the dossier headline, the ticker and the next-link.
  - The pane's own strip is `year · slug` in ASCII, so the floor is unaffected.

## The design

### A. Sound Designer

- In KATARA, JAECOO J5 and mr_PURPLE_dreams_in_electric_fish, "Sound Mixer" becomes "Sound Designer", in both the role and the credit. The rest of each role is unchanged.

### B. The CH·01 moves (json slots; nothing else moves)

- **FAR EAST → slot 9** (COPPER LULLABY's place, top row).
  - COPPER LULLABY takes FAR EAST's old slot 27 (the right edge, row 3). This is a swap, as with MISTCHILD.
  - The owner named no new film for that spot and asked for no held place there, and a swap keeps the 5 × 4 floor whole.
- **SODA COAST → slot 16** (RUST CHOIR's place, top row).
  - Its old slot 24 goes to SOFT HOURS, as the owner asked.
  - That leaves RUST CHOIR no place, so it leaves the site, entry and folder, the way SODIUM HAZE and MOTEL EDEN did.
- Both moved films keep every field; only their json slot changes.

### C. The new films

- **Entries.** Each entry follows the previous batch's shape: slug, title, year, role, runtime, tags, accent, aspect (when not 16:9), synopsis, credits `[{ role, name: "Revachol" }]`, film `{ type: "youtube", src: embed URL }`, category, tileSize.
  - The owner's text is used verbatim: their title, straight quotes and all; the synopses exactly as typed, curly apostrophe included.
  - Runtimes follow the real films' `m:ss` form.
  - Genres become lowercase tags, one per genre.

  | | FOREST ONSEN | SOFT HOURS & LONELY LANDS | "ĂN HỎI" CEREMONY |
  |---|---|---|---|
  | slug | `forest-onsen` | `soft-hours-lonely-lands` | `an-hoi` |
  | slot | 5 (TENDER MACHINES') | 24 (SODA COAST's old) | 12 (the upper held place) |
  | chapter / size | machine / large | human / normal | human / large (featured) |
  | tags | real estate, tv commercial | experimental | experimental, slice of life |
  | runtime | 0:47 | 1:46 | 3:17 |
  | aspect | 16:9 | 2.39:1 | 4:3 |
  | accent | `#EDCB8A`, the film's golden light | `#F39A7E`, the coral bougainvillea of its opening shot | `#CFDB9E`, the pale sage of the bouquet |

  Each accent is the film's own dominant saturated hue, lifted for legibility on black. Each is set apart from its floor neighbours: for ĂN HỎI, MIEN VIEN's cyan, SODA COAST's blue and SOFT HOURS' pink; for SOFT HOURS, the blues of MISTCHILD and SODA COAST above it, and COPPER LULLABY's hot pink below it (so coral, not the pink of later shots).
- **Slugs are ASCII.** The pane strip reads `2026 · AN-HOI`, `2025 · SOFT-HOURS-LONELY-LANDS` and `2026 · FOREST-ONSEN`. The longest fits well inside its scope card (538 wide). No `short` is added: the owner gave none, and the hover label wraps as it does for every title.
- **Media**, using the established recipes; every loop is re-encoded with the standard flags (video only, no data track, CRF 23, raised for a grainy loop):

  | Film | Loop | Poster | Stills |
  |---|---|---|---|
  | FOREST ONSEN | 1280 × 720 | 1280 × 720, the loop's first frame; its opening shot has no matching still | 10 at 1600 × 900 |
  | SOFT HOURS | 1280 × 534, `crop=1280:534:0:93:exact=1` | 1280 × 534 from still 23, the loop's opening shot | 36 at 1600 × 670, cut in rgb24 inside picture rows 277–1882 |
  | ĂN HỎI | 960 × 720, `crop=960:720:160:0` | 1280 × 960 from still 34, the loop's opening shot | 35 at 1600 × 1200, cut inside columns 480–3359 |

  Stills are numbered `01.jpg`…, in Resolve label order (A.B.C, numeric).
- **TENDER MACHINES leaves the site**, entry and folder. FOREST ONSEN takes its slot, so it stands in the CH·02 cluster exactly where TENDER MACHINES stood.
- **ĂN HỎI fills the upper held place** at the same size, so it lands exactly there. The lower held place (json 25) stays for the owner's next film.

### The result

```
CH·01  glass-harvest  | saline-throne | far-east       | soda-coast   | mistchild
       acid-pastoral  | PHILIA        | MIEN-VIEN      | AN-HOI       | soft-hours-lonely-lands
       gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH  | [ held 25 ]  | copper-lullaby
       salt-cathedral | velvet-static | winter-arcade  | halide       | neon-liturgy

CH·02  … | STATIC-HYMN  | KATARA    | THE-FATHER     | …
       … | FOREST-ONSEN | JAECOO-J5 | TERMINAL-BLOOM | …   (the rest unchanged)
```

Totals:
- 39 films: 14 real (MIEN VIEN still awaits its link) and 25 placeholders.
- 1 held place.
- CH·01: 19 films + 1 held. CH·02: 20 films.

## What does not change

- The layout engine and the parser.
- Every other entry's bytes.
- The other pages, and `about-old.*`.

## Tests (`content-files`)

- **Sound Designer:** no role or credit anywhere says Sound Mixer; the three films read Sound Designer.
- **The third batch:** each film at its slot, with every field, its credit, film link, poster, loop and exact still count.
- **The moves:**
  - FAR EAST at 9 and COPPER LULLABY at 27, both regular;
  - SODA COAST at 16;
  - RUST CHOIR and TENDER MACHINES gone, entries and folders;
  - one held place left, at 25;
  - 40 entries in all.
- **CH·01 geometry:** the grid above, cell by cell, for every real film, the held place and the moved placeholders.
- **CH·02 geometry:** FOREST ONSEN at (1, 2), TENDER MACHINES' old cell.
- **Counts:** CH·02 has 20 films with 6 featured. CH·01 has 19 films with 5 featured, plus 1 held, on a 20-pane floor with 6 large.
- **Existing tests updated:** the SODA COAST test, which now expects slot 16, and the previous held-places test, restated for the current state.

## Verification in the pane

- **CH·01:**
  - the world's grid read back;
  - ĂN HỎI's loop in the cluster, with its FEATURED tag;
  - SOFT HOURS on the right edge;
  - the held place still unlit.
- **CH·02:** FOREST ONSEN in the cluster.
- **Hover labels:**
  - FOREST ONSEN's long title wraps inside the label;
  - see how "ĂN HỎI" renders its borrowed Ỏ.
- **Dossiers of the three new films:**
  - one-line headline;
  - WATCH live;
  - stills in order;
  - KATARA shows "Sound Designer".
- **Flips:** each way, with no errors.

## As built (2026-09-27)

- **Data.** The splice changed exactly json 3, 5, 9, 12, 15, 16, 19, 24 and 27.
  - The other 31 entries are byte-identical.
  - The three moved films are byte-identical at their new slots.
  - The file now has 40 entries: 39 films and 1 held place, at 25.
  - The `tender-machines/` and `rust-choir/` folders are gone.
- **Media:**

  | Film | Loop | Poster | Stills |
  |---|---|---|---|
  | FOREST ONSEN | 1280 × 720, 2.8 MB | 90 KB | 10 at 1600 × 900 |
  | SOFT HOURS | 1280 × 534, 1.1 MB | 60 KB | 36 at 1600 × 670 |
  | ĂN HỎI | 960 × 720, 1.8 MB | 82 KB | 35 at 1600 × 1200 |

  - Every edge row or column carries picture, with no bar, and each loop is video-only.
  - FOREST ONSEN's loop is CRF 29. Its push-ins through foliage made 5.8 MB at CRF 23. Frame-exact 1:1 crops against the source at CRF 29 show no banding in the light shafts or blocking in the leaves.
- **Accent.** SOFT HOURS took the coral `#F39A7E`, not the first-draft pink. Its opening shot (and poster) is coral bougainvillea, and COPPER LULLABY's hot pink sits right below it.
- **In the pane (desktop 1000 × 417):**
  - **CH·01** read back as the grid above, and the HUD reads "19 PROJECTS LOADED".
    - ĂN HỎI plays in the cluster under a sage FEATURED tag.
    - SOFT HOURS' coral strip `2025 · SOFT-HOURS-LONELY-LANDS` fits its scope card.
    - The held place is unlit.
  - **The flip** to CH·02 ran clean; FOREST ONSEN stands in TENDER MACHINES' cell, and the HUD reads "20 PROJECTS LOADED".
  - **Hover labels** carry each film's meta in its accent. FOREST ONSEN's long title wraps inside the label.
  - **Dossiers:** ĂN HỎI is P·13/39, FOREST ONSEN P·06/39 (its headline fits at 59.6 px) and SOFT HOURS P·25/39.
    - Each has all its stills, in order, and the right role.
    - WATCH opens `XKkHkLVUC40`.
    - KATARA reads "Sound Designer".
  - **Network:** the only 404s are the three `hover.mp4` probes, which are expected for films with no hover clip.
- **The borrowed Ỏ.** In the dossier headline (Clash Display) and the hover label (Bodoni Moda), the `Ỏ` of "ĂN HỎI" is visibly lighter than its neighbours, because it is drawn by a system font.
  - The fix is a Vietnamese companion face on a `unicode-range` covering the Vietnamese block.
  - That means downloading font files, so it is left for the owner to decide.
- **Tests:** 289 passed, 3 skipped.
