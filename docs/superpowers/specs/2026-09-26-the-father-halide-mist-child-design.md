# THE FATHER, HALIDE, MISTCHILD — and SODA COAST's link — design (2026-09-26)

The owner, in one message:

1. "Replace VOID CARTOGRAPHY in chapter 2 with this" — `D:\WORK\PROJECT\Web Materials\2026 TheFather_webloop`. Title: The Father. Year 2026. Role: Colorist. Runtime 02:27. Genre Slice of Life. Synopsis: "A father hiding secrets from his own daughter." Watch: YouTube `Idreboecojw`.
2. "Replace PAPER LANTERN WAR in chapter 1 with this" — `…\2026 Halide_webloop`. Title: HALIDE. Year 2026. Role: Director / Colorist / Editor. Runtime 01:06. Genre Experimental. Synopsis: "Whiter dreams and whiter lives." Watch: YouTube `dMbsrk9Eeiw`.
3. "Replace LOW TIDE GOSPEL in chapter 1 with this" — `…\2025 MistChild_webloop`. Title: Mist Child — then, mid-build: "MIST CHILD must be MISTCHILD" (one word, as its YouTube title has it; slug `mistchild`). Year 2026. Role: Director / Colorist / Editor. Runtime 00:47. Genre Experimental. Synopsis: "The child must have felt so lonely, in the mist." Watch: YouTube `dyqpjo4eKJI`.
4. "Here is embed code for the WATCH for Soda Coast in chapter 1" — YouTube `mrR8hRc4XF4`.

## What was found

| | THE FATHER | HALIDE | MISTCHILD |
|---|---|---|---|
| loop | 1280 × 720, 9.5 s, 24 fps, 11.8 Mbps, a timecode track | 1280 × 720, 7.9 s, same form | 1280 × 720, 9.3 s, same form |
| picture (cropdetect) | full 16:9 | scope inside 16:9: 1280 × 536 at y 92 | scope inside 16:9: 1280 × 540 at y 90 |
| stills | 23 × 3840 × 2160, full frame, labels `_1.5.1…23` | 29 × 3840 × 2160, picture 3840 × 1604 at y 278 (2.39), labels `_1.4.1…27`, then `_1.12.1–2` (the stage finale) | 16 × 3840 × 2160, picture 3840 × 1620 at y 270 (2.37), labels `_1.13.1…16` |
| owner's thumbnail | `TheFather_thumbnail_1.8.1.png`: the father applauding in the audience, the loop's opening shot | none | `MistChild_thumbnail_1.13.1.png`: the fountain, the stork, the onlookers (the loop's second shot), letterboxed like the stills |
| look | golden-hour warmth, a teal bokeh here and there | black and white, night crowds, a stage | grey-teal mist, one jelly-blue toy |

The placeholders: `void-cartography` (CH·02, large, slot 4), `paper-lantern-war` (CH·01, normal, slot 31), `low-tide-gospel` (CH·01, normal, slot 32). Each chapter holds 20 films, 6 of them featured (larges), which a test pins. SODA COAST sits in slot 12 with `film: null` and `filmPending: true`.

The house forms: a YouTube film is `{"type": "youtube", "src": "https://www.youtube.com/embed/<id>"}`. The player builds a `youtube-nocookie` URL with autoplay from the id. Runtimes read `M:SS` ("1:56"). 16:9 entries leave `aspect` out. The credits carry the role line once, "Revachol". Titles keep the owner's casing, and every UI upper-cases them.

## The design

### A. The entries: same slots, same sizes

| slot | slug | title | role | runtime | tags | accent | aspect | chapter | size |
|---|---|---|---|---|---|---|---|---|---|
| 4 | `the-father` | The Father | Colorist | 2:27 | slice of life | `#F4B67B` | 16:9 (left out) | machine | large |
| 31 | `halide` | HALIDE | Director / Colorist / Editor | 1:06 | experimental | `#FFFFFF` | 2.39:1 | human | normal |
| 32 | `mistchild` | MISTCHILD | Director / Colorist / Editor | 0:47 | experimental | `#85AFE0` | 2.39:1 | human | normal |

THE FATHER and HALIDE are dated 2026 and MISTCHILD 2025 (see below). Each carries the owner's synopsis, and credit their role line to Revachol. Each gets its YouTube film and no `filmPending`.

- **Accents, from the pictures.**
  - THE FATHER: the backlight that rims the father. Still 21's flare samples `#D6B18E`, lifted to read on the dark page (hue 29°, softer than JAECOO's tangerine `#FFA84D`).
  - HALIDE: pure white. The film is silver halide, black and white, and "whiter dreams and whiter lives". It is the floor's only pure white; the placeholders' warm bone is `#EDEDE6`.
  - MISTCHILD: the jelly-blue toy (`#22587E` sampled), misted. It is softer and more periwinkle than SODA COAST's sky `#4FB3FF`.
- **Sizes.** HALIDE and MISTCHILD take regular screens. The placeholders they replace are regular, so each chapter keeps its six featured. Promoting either is one field (`tileSize: "large"`) plus a swap to keep the six.
- **MISTCHILD's year.** The folder reads 2025, but the owner's line says 2026. The site carried 2026, the owner's words, and the closing report flagged it. **The owner then confirmed 2025** ("yeah mistchild is 2025"), and the entry and its test now say 2025.
- **SODA COAST.** `film` becomes the YouTube `mrR8hRc4XF4` and `filmPending` goes, so WATCH is live.

### B. The media, by the house recipes

- **`the-father`** (16:9, the KATARA / JAECOO form):
  - `preview.mp4`: 1280 × 720, H.264 CRF 23, no audio, no timecode track, faststart.
  - `poster.jpg`: the owner's thumbnail at 1280 × 720.
  - `stills/`: 1600 × 900.
- **`halide`, `mistchild`** (scope, the FAR EAST / SODA COAST form):
  - `preview.mp4`: cropped to 1280 × 534, which lies inside both pictures (HALIDE 92–628, MISTCHILD 90–630).
  - `poster.jpg`: 1280 × 534, cut the same way. HALIDE uses still 25, the loop's opening shot. MISTCHILD uses the owner's thumbnail.
  - `stills/`: scaled to 1600 wide, then cut to the largest 2.39 frame inside the picture. That is 1600 × 670 for MISTCHILD (the picture spans 112.5–787.5 of 900) and **1600 × 668 for HALIDE**: its picture spans 115.8–784.2, so a 670 cut would take a hairline of the bars.
- **The poster rule:** the owner's thumbnail when the folder has one, else the loop's opening shot. The thumbnail is the owner's own choice of the film's face.
- **Order:** stills are numbered `01..NN` in label order, sorted numerically on A, then B, then C, so `_1.12.x` follows `_1.4.27`.
- The three placeholder folders go with their entries (`git rm -r`).

## What does not change

- The floor's layout (every slot keeps its index and size, six featured per chapter).
- Every other film, the channel keys, the pages, the code.
- `about-old.*`.

## Tests

`tests/content-files.test.ts`:

- **The SODA COAST case keeps its fields.** It now expects the YouTube link and `filmPending` false.
- **A table-driven case for each of the three new films:**
  - the slot index, slug, title, year, role, and credits (exactly the role line, Revachol, so no placeholder credit survives);
  - runtime, tags, synopsis, chapter, size and aspect;
  - the YouTube film and no pending flag;
  - poster and loop on disk, the stills count with its first and last names;
  - the placeholder's slug and folder gone.

## Verification in the pane

- **Works floor, both chapters:** the three new screens are present, and no placeholder title or slug is left.
- **Each new dossier and SODA COAST's:**
  - every field is shown;
  - the loop plays at the film's ratio;
  - the stills wall holds the right count;
  - WATCH is live and opens the `youtube-nocookie` player on the right id.
- **Phone preset:** one scope dossier and the floor.

## As built (2026-09-27)

- **The entries** are as designed, with the owner's mid-build rename: MISTCHILD, slug `mistchild`. The splice touched exactly slots 4, 12, 31 and 32; the other 36 entries are byte-identical.
- **THE FATHER:**
  - loop 1280 × 720, 9.5 s, 1.76 Mbps, 2.1 MB;
  - poster 1280 × 720 (56 KB), the owner's thumbnail;
  - 23 stills 1600 × 900 (1.6 MB).
- **HALIDE:**
  - loop 1280 × 534, 7.9 s, 1.6 MB;
  - poster 1280 × 534 (40 KB), still 25;
  - 29 stills 1600 × 668 (1.7 MB).
- **MISTCHILD:**
  - loop 1280 × 534, 9.3 s, 1.8 MB at **CRF 27**: its film grain cost 4.6 MB at CRF 23, and a 1:1 crop comparison showed the grain holding;
  - poster 1280 × 534 (168 KB, q4), the owner's thumbnail;
  - 16 stills 1600 × 670 (1.5 MB).
- **Clean edges: the lesson.** ffmpeg rounds a 4:2:0 crop's y offset down to even. HALIDE's loop picture is lit on rows 93–626 exactly, so the house `crop=iw:534` (y 93, rounded to 92) took in the half-bar row 92: row 0 of the loop measured 119 over a 205 row 1, a dark hairline on the top edge. Three fixes:
  - The loop is cut with `crop=1280:534:0:93:exact=1`.
  - The poster and stills are cut in the source first, inside the picture (lit rows 277–1882 of 2160), in `rgb24` so any offset holds: `crop=3840:1602:0:278,scale=1280:534` for the poster and `crop=3840:1603:0:278,scale=1600:668` for the stills.
  - Every edge row now matches the row inside it. MISTCHILD, FAR EAST and SODA COAST were already clean: their pictures leave 3 px of margin.
- **Pane checks (desktop):**
  - CH·01 has 20 screens, with HALIDE and MIST-CHILD as 538 × 225 scope cards, real posters, no placeholder left. CH·02 has 20, with THE-FATHER's featured 16:9 card playing warm.
  - Each dossier shows every field; the loops play at 2.390 (scope) and 1280 × 720; the walls hold 23, 29 and 16 stills.
  - WATCH is live on all four and opens `youtube-nocookie.com/embed/<id>?autoplay=1&rel=0` for `Idreboecojw`, `dMbsrk9Eeiw`, `dyqpjo4eKJI` and `mrR8hRc4XF4`. MISTCHILD's player loaded the owner's "MISTCHILD | Shot on Iphone 15 Pro Max".
- **The owner's other two mid-build rules** have their own spec (`2026-09-27-works-equal-panes-nav-order-design.md`): every pane at the featured size, and the menu HOMEPAGE, WORK, ABOUT, CONTACT.
