# Chapter 1: SODA COAST and FAR EAST to the edge, two places held at the heart — design (2026-09-27)

The owner: "Chapter 1: move Soda Coast to Sodium Haze. And Far East to Motel Eden. Then leave the original panes as they left blank, i am about to fill in two more to those two positions."

## What was found

CH·01 lies as a 5 × 4 block, with the six featured at its heart (json order fills the cluster, then the ring, first-fit):

```
glass-harvest  | saline-throne | copper-lullaby | rust-choir | neon-liturgy
acid-pastoral  | PHILIA        | MIEN-VIEN      | SODA-COAST | sodium-haze
gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH  | FAR-EAST   | motel-eden
salt-cathedral | velvet-static | winter-arcade  | halide     | mistchild
```

- SODA COAST (json 12) and FAR EAST (json 25) are featured and sit in the cluster's right column. SODIUM HAZE (json 24) and MOTEL EDEN (json 27) are placeholders on the ring's right edge, beside them.
- The layout places featured panes into the cluster in json order and fills the ring in json order. So a pane's place is fixed by its json index and its size class, and nothing else.
- `projects.json` is read by:
  - `loadProjects` (the dossier, the works page);
  - the build's media manifest (only for self-hosted film files).
- There is no way yet to hold an empty place: removing an entry reflows every pane after it.

## The design

### A. The moves

- SODA COAST takes SODIUM HAZE's json index (24), and FAR EAST takes MOTEL EDEN's (27), both as regular panes (`tileSize: "normal"`). The ring is filled in json order, so each lands exactly where its placeholder stood. Everything else keeps its place.
- They leave the cluster, so they drop the FEATURED dress. Their posters keep the floor's rhythm: SODA COAST 0.5 photographic, FAR EAST 0.72.
- Every other field is unchanged (links, media, texts).
- SODIUM HAZE and MOTEL EDEN leave the site, entries and folders both.

### B. Held places

- **A new kind of entry: `{ "blank": true, "category": "human", "tileSize": "large" }`.** It holds a place on the floor for a film to come. The two go in at SODA COAST's and FAR EAST's old json indices (12, 25). Being `large`, they join the cluster in the same order, so they sit exactly where the two films stood.
- **The parser splits the file in two:**
  - `parseFloor(raw)` is the floor's stream, films and held places in json order (a held place gets the internal key `blank-<json index>`).
  - `parseProjects(raw)` is films only. The dossier, the counts, the semantic list and the prev/next chain never see a held place.
  - A held place takes only `category`, `tileSize` and `position`. A film may not use a `blank-N` slug.
- **`channelProjects` becomes generic** over anything with a `category`, so the works page filters both lists the same way.
- **On the floor a held place is an unlit screen (`BlankPane`):**
  - the same size and seams as its neighbours;
  - black glass with a faint bone frame and dim corner brackets;
  - no poster, loop, label, tag or plate;
  - it never takes the pointer (no hover, no dossier).
  - It flies with the rest on a chapter flip, counts toward the carpet's bounds, and is torn down with the world.
- **The HUD counts films** (CH·01: 18 projects loaded).
- **Filling a held place is the old routine:** replace its line with the film's entry (`"tileSize": "large"`), and the film lands in that exact spot.

## What does not change

CH·02; every other CH·01 pane's place; the layout engine; the dossiers; the other pages; `about-old.*`.

## Tests

- **`content.test.ts`:**
  - `parseFloor` keeps held places in order, with `blank-N` keys and the defaults;
  - `parseProjects` skips them;
  - a held place's bad category or size is refused, as is a film squatting a `blank-N` slug.
- **`channels.test.ts`:** the filter works on floor items.
- **`content-files.test.ts`:**
  - the shipped floor: CH·01 has 18 films plus 2 held places (the cluster 4 + 2), CH·02 has 20 films with 6 featured;
  - SODA COAST at json 24 and FAR EAST at 27, both regular;
  - held places at 12 and 25;
  - no `sodium-haze` or `motel-eden` entry or folder;
  - the CH·01 geometry as the owner asked for it: the band laid out puts each held place in the cluster's right column, SODA COAST and FAR EAST just right of them, and the four featured unmoved.

## Verification in the pane

- **CH·01, desktop:**
  - the grid read back from the world;
  - the two unlit screens in the cluster, SODA COAST and FAR EAST on the right edge;
  - pointer over a held place: no hover, no label;
  - a flip each way with no errors.
- **Phone preset:** the floor.
- **The dossier:** SODA COAST and FAR EAST unchanged, counts P·NN/38.

## As built (2026-09-27)

- **Data.** The splice touched exactly json 12 (held), 24 (SODA COAST, now regular), 25 (held) and 27 (FAR EAST, now regular). The other 36 entries are byte-identical. `sodium-haze/` and `motel-eden/` are gone, leaving 38 film folders.
- **Parser.** `parseFloor` / `parseProjects` / `isBlank` / `loadFloor` (one shared fetch). The inline tileSize, category and position checks moved into `tileSizeOf`, `categoryOf` and `gridPosOf`, shared with held places, with their messages unchanged. `blank-N` film slugs are refused as reserved.
- **Floor.**
  - `BlankPane` (`src/works/blank.ts`): black glass (#060606 at 0.94), a bone frame at 0.14, bone corner brackets at 0.30, `eventMode 'none'`.
  - `WorksWorld.create` takes the floor stream; posters and tiles are built for films only.
  - `panes()` feeds the bounds and both flights. `destroy()` kills the held panes' tweens too.
  - The works page passes `channelProjects(floor, key)` and counts films for the HUD.
- **In the pane:**
  - The world read back as the 5 × 4 grid below, and the HUD reads "18 PROJECTS LOADED".
    ```
    glass-harvest  | saline-throne | copper-lullaby | rust-choir | neon-liturgy
    acid-pastoral  | PHILIA        | MIEN-VIEN      | [ held ]   | soda-coast
    gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH  | [ held ]   | far-east
    salt-cathedral | velvet-static | winter-arcade  | halide     | mistchild
    ```
  - Held places are unlit screens. The pointer over one wakes nothing (no hover, no label); over SODA COAST, the pane lifts and labels.
  - Flips run both ways with no errors: CH·02 mounts with no held places, and CH·01 returns with both.
  - The phone shows 18 + 2 panes, all ×2.
  - The dossiers: SODA COAST P·24/38 and FAR EAST P·26/38, WATCH live. SODIUM HAZE's old page reads SIGNAL LOST.
- **Pane lesson.** A hidden Browser pane pauses requestAnimationFrame, so gsap's exit flight never completes and a flip stalls with the URL already changed. Drive gsap by hand to test: `setInterval(() => rvlGsap.ticker.tick(), 16)` (GSAP 3 has no `useRAF`), then clear it.
- **Tests:** 284 passed, 3 skipped.
