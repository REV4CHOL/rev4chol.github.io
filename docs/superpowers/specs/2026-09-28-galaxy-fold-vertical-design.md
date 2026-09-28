# GALAXY Z FOLD 8 ULTRA: the site's first vertical film, in two parts — design (2026-09-28)

The owner:

- `D:\WORK\PROJECT\Web Materials\2026 GalaxyFold_webloop` — "Replace Terminal Bloom in chapter 2 with this."
- Watch: YouTube `hfq64ykkQs4` ("GALAXY Z FOLD 8 ULTRA | Digital Ad #1") "And……." YouTube `60ga3V46lk4` ("… | Digital Ad #2"), both pasted as 867 × 1541 iframes (vertical).
- "So one watch will spawn two embed YouTube videos at once, on the same row together. So make special design for this."
- Title: GALAXY Z FOLD 8 ULTRA | DIGITAL AD. Year 2026. Role: AI Generalist. Runtime 00:24 & 00:37. Genre Commercial Advertising. Syn: Welcome to the fold.
- Mid-build: "from now on, whenever I bring you vertical footage, you gonna make a special vertical pane, and also design vertical stills for all vertical projects." And: "the Stills has film1 and film2, be sure to include them all, with left pillar being ad #1, and right pillar being ad #2".

## What was found

- **The sources.** No `*_thumbnail_*` file.

  | Media | What it is |
  |---|---|
  | `GalaxyFold_webloop.mp4` | 720 × 1280 (vertical), 29.97 fps, 5.97 s (179 frames), 11 Mbps, 8.3 MB, plus a timecode track; full frame; clean wrap (luma 76 → 122, darkest frame 70). The concert ad's shots, then the café ad's. Vietnamese captions are part of the footage. |
  | `Stills/film1` | 6 stills, 2160 × 3840: the café ad (the manga reader, Smart Switch). Ad #1, 0:24. |
  | `Stills/film2` | 11 stills, 2160 × 3840: the concert ad, ending on the product card. Ad #2, 0:37. |

  Resolve labels sort numerically (`_1.2.1`–`_1.2.6`, `_1.1.1`–`_1.1.11`).
- **TERMINAL BLOOM** is json 21, a placeholder, `large` (CH·02's featured cluster, bottom right, cell (3, 2)), with a folder of placeholder media (poster, preview, hover loop, 30 stills).
- **The aspect system** knows 16:9, 4:3 and 2.39:1.
  - A pane is the film's own ratio: its width is its height × the ratio, and the row packs brick-tight around it.
  - A non-16:9 dossier hero fits the picture as a centered band or column; the side fields are dressed rack pillars.
  - The stills wall's cells take the film's ratio in a pair / pair / full rhythm. At 9:16 that is a cell 1280 px tall for a pair, 2560 px for a full row.
- **The pane's dress** assumes a landscape card. The id strip runs along the bottom ("2026 · GALAXY-Z-FOLD-8-ULTRA" is ~250 px at the strip's type, the 9:16 card is 127 wide), and the code tag and the FEATURED tag would collide at the top.
- **WATCH** plays one film. On a wide screen the player sits in the dark field right of the synopsis: 245 × 138 px at 1440. Every embed is built with `autoplay=1`.

## Design

### 1. The vertical format: `"aspect": "9:16"`

The owner's standing rule: vertical footage is presented vertical everywhere, never cropped or blur-filled into 16:9.

- **The vertical pane.** Its own ratio, brick-tight in its row, like every odd-ratio pane. Its dress is made for it:
  - the id strip becomes a **spine** up the left edge: a 20-unit plate the card's full height, the id reading bottom to top, scaled down only if it would overrun, the accent index tab at its foot;
  - the accent bar moves right of the spine, the RVL code moves to the bottom right, the corner ticks shorten to the narrow card;
  - the dithered poster keeps every pane's screen density (its width scales with the card: 203 px for 9:16).
- **The dossier hero:** the existing fit column at 9:16, with its rack pillars. On a phone the picture fills the width and its letterbox bands are one sprocket row thin: the ratio stamp is hidden there, never clipped.
- **The vertical wall:** portrait cells, gapless and full-bleed with the wall's dress (corner ticks, outlined numbers, captions shortened to `STL·NN`). 4 across on a wide screen, 3 on a tablet, 2 on a phone.

### 2. A film in parts: `"film": [ … , … ]`

- `film` may be a list. Each part is a film object like any other, plus an optional `label`. The parser keeps the list as `films` and the first part as `film`, so everything that reads `film` today is unchanged. An empty list is refused.
- **WATCH opens every part at once, on one row** (the special design):
  - the stage takes the full width under the synopsis, starting where WATCH stood;
  - parts stand left to right in list order, each in the project's player shape (9:16 for a vertical project, else 16:9), as tall as the viewport allows (≤ 72vh, ≤ 680 px) and never wider than its share of the row;
  - between two parts, a **hinge**: a hairline with ruler ticks, the fold;
  - under each part, its outlined number and its label (`01 DIGITAL AD #1`);
  - the corner ticks frame the whole stage; the uplink tag reads `UPLINK ▸ 2 TRANSMISSIONS`;
  - a phone keeps the one row (two parts ~160 px wide each).
- **Playback:** the first part starts (the click is the gesture); the others wait. One plays at a time: a part that starts pauses the others; when a part ends, the next one starts. This runs over the YouTube player's postMessage interface (`enablejsapi=1`); if it never answers, the parts still play by hand.

### 3. Stills in pillars

- A vertical project's stills named by part (`1-01.jpg`, `1-02.jpg` … `2-01.jpg` …) stand in side-by-side **pillars**, left to right in part order: left = ad #1, right = ad #2, as the owner asked.
- Each pillar has a head (the part's outlined number, its label, its still count) and a grid of that part's stills. The heads share one row, so the grids start level even when a head wraps (a tablet).
- Each pillar's column count balances the pillars' heights (a pure `pillarColumns`): 2 to 4 across on a wide screen, the closest heights winning, ties to the bigger stills. For 6 and 11 stills that is 2 and 3 across.
- The space left at a pillar's foot, and an empty cell in a last row, is hatched, never blank.
- Below 700 px the pillars stack, part 1 first, 2 across each.

### 4. GALAXY Z FOLD 8 ULTRA | DIGITAL AD (json 21, TERMINAL BLOOM's place; its entry and folder go)

| Field | Value |
|---|---|
| slug | `galaxy-z-fold-8-ultra` |
| title | `GALAXY Z FOLD 8 ULTRA \| DIGITAL AD` (verbatim) |
| year, role, credit | 2026, `AI Generalist`, `AI Generalist` · Revachol |
| runtime | `0:24 & 0:37` (the house form of 00:24 & 00:37) |
| tags | `commercial advertising` |
| synopsis | `Welcome to the fold.` |
| accent | `#8C9EFF`, a periwinkle: the concert light and the violet phone; the chapter's other films are all warm |
| aspect, category, tileSize | `9:16`, `machine`, `large` (the slot's) |
| film | the two YouTube links, labels `Digital Ad #1` and `Digital Ad #2` |

- **Loop:** native 720 × 1280 with the house flags, CRF 23.
- **Poster:** the loop's first frame, 720 × 1280.
- **Stills:** 900 × 1600, `film1` → `1-01`…`1-06`, `film2` → `2-01`…`2-11`, in Resolve order.

## Tests

- `content.test.ts`: `9:16` accepted, ratio 0.5625; `film` as a list (films, labels, `film` = the first); an empty list and a bad part refused.
- A pure module for the new layout math: `stillParts` (grouping by the `N-` prefix), `pillarColumns` (6 + 11 → 2 + 3), `spineFit` (the spine's scale).
- `embeds.test.ts`: an embed without autoplay, with the player API.
- The parts' messaging: `ytState` reads the player's state messages; `ytCommand` builds commands.
- `content-files.test.ts`: the entry, its media (a 720 × 1280 loop read from the mp4, poster, 6 + 11 part stills), TERMINAL BLOOM gone, the film at CH·02's cell (3, 2); counts (21 placeholders, 18 films).
- Source pins for the pane's spine, the stage and the pillars.

## Verification

- Dev, real Chrome: the vertical pane on the floor (wakes, plays the vertical loop, the spine legible); the dossier hero column; WATCH: two vertical players on one row with numbers, labels and the hinge, the first with autoplay, the second without; the pillars (6 left, 11 right, heights balanced); desktop and phone.
- The same on the live site.

## Design calls for the owner

- The accent `#8C9EFF`.
- The pillars are the stills wall's two columns. Phones stack them, ad #1 first.
- Playback: the first ad starts, one at a time, the next after the first ends.
- The pane's spine; the slug `galaxy-z-fold-8-ultra`.
- The poster is the loop's first frame (a concert shot with its caption).
