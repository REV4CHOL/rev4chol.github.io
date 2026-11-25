# The film thread: quiet artwork where the synopsis stood — design (2026-11-25)

The owner: "Completely remove the synopsis from all film's pages. AFter removing the synopsis there sure will be a
black blank space left empty, so make sure it get fill with artwork designs that align with our art direction for
that blank space".

Three directions were mocked up (scopes read from the poster, a hardware deck, a strip of film). The owner: "the
designs need to be muted, subtle, because currently its too loud and clogging up our already crazy visuals. SO we
dont have much headspace left. I really like the film path, but it need to be rebuilt". Three quiet rebuilds were
shown (a ghost strip, a negative, a thread); they chose **the thread**, **still** (it never moves), **no tag** where
`SYN:` stood, the field beside the player on a wide PC **filled**, the synopsis words **deleted** from the site.
Asked whether the purple arc and the two plus marks behind the old synopsis should go too: "Keep them". And, as the
build began: "Be sure to keep the old design too they are already good. this new design will be integrated and
existing along with them, so no deleting anything old".

## What changes on a film's page

**Leaves:** the synopsis line (`.p-synopsis`) and its rail tag `SYN:`. Nothing else. The arc (`.p-arc-clip`,
`.p-arc`), the two seeded plus marks (`.p-plus`), the player, its dress, the notices of a private or pending film,
`REC:` and every other mark stand exactly as they did.

**Arrives:** the thread, a line drawing of the film's path, in the row where the synopsis stood (the band, 120 px
tall on every screen, reserved in CSS so the player never moves when the script draws):

- a feed spool at the head of the left rail (where the tag stood), the film's name and year under it in micro type;
- the film seen edge on (two hairlines 3 px apart with faint ticks between them) leaving the spool, dipping under a
  roller and running straight across the band;
- small frames hanging on it, each a hairline rectangle in its still's own shape holding one of the film's stills,
  dim and nearly grey, with the still's wall number under it;
- a gate mark (two thin brackets, one hairline in the film's accent across the film);
- a take-up reel (thin concentric rings, a dot in the film's accent at its centre) with the film's place beside it
  (`P·14/20`).

### The three ways it ends

| Where | The path |
|---|---|
| Room beside the player: at least 160 px between the player's right edge (plus 24 px) and the section's right edge. A wide PC with a film whose player does not fill the row. | Over a roller, a slack loop, a third roller, then down beside the player: two frames, the gate level with the player, the reel near its lower third. |
| No room beside the player, a band 520 px wide or more: tablets, a narrow PC window, the 2.39:1 films, the private film (no player at all). | Five frames (four under 1000 px), the gate, then onto a small reel inside the band's right end. |
| A band under 520 px (a phone; the rail is 0 px wide there). | No spool: the film enters at the band's left edge, dips under a roller, carries three frames, passes the gate and leaves at the right edge. The name stands at the band's top left, the place at its top right. |

The feed spool needs the rail: where the rail is narrower than 150 px (a touch screen up to 760 px wide has none) the
film enters at the band's left edge, as on a phone, and the name stands at the band's top left; the ending still
follows the table.

Which ending is drawn is decided from the measured boxes (the band, the player or a film in parts' stage), never from
the film's data or the device, and decided again whenever those boxes change (the player's width follows the
window's height).

On a phone the tag's row closes with the tag, so the band stands where the tag stood and the player about 68 px
higher than before.

### Quiet is a rule

One table (`THREAD_INK`) holds every opacity, and a test holds the table: no bone line above **0.30**, no type above
**0.38**, the accent on exactly two details (the gate's hairline, the take-up reel's dot) at **0.55**, the stills at
**0.40**. Lines are 1 px, in the bone colour. Type is the micro face at 9 px (8 px on a phone). No fill, no plate, no
glow, no second colour. "A bit more" or "a bit less" is one edit to the table.

The thread is still: no animation, no transition, in every motion setting.

### Every word is true of the film

Only: the film's name (its English line when it carries two; set in capitals; broken into at most two lines of 20
characters in the rail, or one line of 30 on a phone, a longer name trailing off in `…`), its year, its place in the
list (`P·NN/NN`, the stamp the page already shows), and under each frame the code that still carries on the wall
below (`01`, or `1-01` for a still named by part). No invented code, no running time, no person's name, no verb.

## The pictures in the frames

Six stills per film, spread evenly through its wall (`threadPicks`: place `round(i × (n − 1) / 5)` for i = 0…5; a
film with fewer than six stills gives them all). The band takes the first of them in order and the side run the
next two; a layout that shows fewer frames shows the first ones.

They are their own small files, not the wall's stills: a frame is about 80 px wide, a wall still is 1600 px and 60
to 160 KB, and the band stands one screen down on a phone. `npm run threads` (`scripts/make-threads.mjs`, ffmpeg)
writes, for each film:

- `public/content/projects/<slug>/thread/<code>.jpg`: the still scaled so its longer side is 192 px (never
  upscaled), its saturation turned down to 0.15 in the file, its own shape kept (never cropped);
- one line in `public/content/threads.json`: `{ "<slug>": [["<code>", width, height], …] }`.

The build's media manifest carries the map as `threads` (only entries whose files exist), and the page reads it with
`threadFrames(slug)`. A frame takes the picture's own size from the map, so a 1.9:1 still in a 16:9 film and a
vertical film's upright stills both stand in their own shape. The picture is dimmed with the SVG `opacity` attribute
over black (no CSS filter: a filter on an SVG image is unreliable in Safari). A film the map does not list draws its
thread without frames.

`npm run threads` is run after a film's stills are added, replaced or removed, and what it writes is committed. A
test fails when a film's map does not match its stills folder.

## The parts

| File | What it is |
|---|---|
| `src/lib/thread-files.ts` | Pure, shared by the script, the build and the page: `wallOrder(files)` (the wall's order), `threadPicks(count)`, `stillCode(part, place)` (the code the wall's caption and the frame's label both use), the thumbnail's size and saturation. |
| `scripts/make-threads.mjs` | Reads each film's stills, writes the thumbnails and `threads.json`. |
| `vite.config.ts` | The manifest gains `threads`. |
| `src/lib/content.ts` | `threadFrames(slug)`; the `synopsis` field leaves the `Project` type and the parser. |
| `src/project/thread-plan.ts` | Pure geometry: `planBand`, `planSide`, `sideBox`, `bandFrames`, `frameSize`, `threadName`, and `THREAD_INK`. Boxes in, a drawing's description out (a path, rollers, reels, frames, the gate, labels). No DOM. |
| `src/project/thread.ts` | The DOM: measures the band and the player (screen px divided by `zoomOf`), draws two SVGs from the plans, and draws again when the boxes change (one `ResizeObserver`, one frame's delay). |
| `project.html`, `src/pages/project.ts`, `src/styles/project.css` | The synopsis line and its tag leave; the band and the side box arrive; the section is renamed `.p-film-sec`. |
| `public/content/projects.json`, `HOW-TO-EDIT.md` | The `synopsis` lines leave; the guide gains the `npm run threads` step. |

### Never over the player

The thread is two separate boxes that cannot meet the player: the band (above it; its SVG overflows left into the
rail for the spool) and the side box (from 24 px right of the player's edge to the section's right edge, from the
band's foot to the player's foot). Both stand at `z-index: 1`, under the player's 2, take no pointer and are
`aria-hidden`. The path leaves the band's foot and enters the side box's head at the same x, so it reads as one line.
The player's label and corner ticks keep 14 px clear.

## Checks

- Tests first, for each part: the picks and codes; the plans (every drawn box inside its own box, no two frames
  touching, the three endings, portrait frames, the name's breaking); the ink table; the map against every film's
  stills folder and the files' real sizes; the page's markup and layers (the band in the player-layer test's list of
  marks); no `synopsis` left in the content file, the parser or the page.
- On the built site, headless, one film of each shape (PHILIA 16:9, a 2.39:1, a 4:3, TEMPTATION 3:2, GALAXY vertical
  in two parts, EVER FARAWAY private) on a 1920 px PC, a laptop, an iPad, an iPhone and an Android phone: as
  pictures, and by measurement: at least 14 px between every drawn box and the player, its ticks and its label.
- One sheet of the band for all 20 films, to catch a frame that reads as empty.
- Safari on a real iPhone cannot be checked from here.

## Not in this change

Motion of any kind; a per-film choice of stills; the wall position code (`RVL/NNNN`) on the film's page.
