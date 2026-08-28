# HOW TO EDIT YOUR SITE (no coding needed)

Everything you will ever touch lives in ONE folder: `public/content/`.
You never need to rebuild the site for content changes — edit, save, refresh.

## The map

    public/content/
      site.json         your name, menu labels, socials, email
      projects.json     the list of your films (order = order on the floor)
      projects/
        <slug>/         one folder per film
          poster.jpg    a still frame, 1280px wide (required)
          preview.mp4   3–5 s loop, 640px wide, silent (required)
          hover.mp4     8–15 s montage, 960px wide, silent (optional)
          film.mp4      the full film, only if you self-host it (optional)
          stills/       gallery images (each one listed in projects.json)

## Add a new film (5 steps)

1. Pick a slug: lowercase letters, digits, hyphens. Example: `midnight-run`.
2. Make the media. Easiest way — one command from any master file:
   You need ffmpeg installed once (winget install Gyan.FFmpeg).
   `powershell -ExecutionPolicy Bypass -File scripts/make-preview.ps1 -In "D:\path\master.mov" -Slug midnight-run`
   (Or export by hand using the recipes below.) Drop gallery stills into
   `projects/midnight-run/stills/` as `01.jpg`, `02.jpg`, …
3. Open `projects.json` and copy an existing entry. Change every field.
   List your stills by file name: `"stills": ["01.jpg", "02.jpg"]`.
4. Save. Refresh the site. The new tile is on the floor.
5. If the site boots into **CONTENT ERROR**, read the message — it names the
   file, the project and the field that's wrong. Fix, save, refresh.

## Every field in projects.json

| Field | What it is | Example |
|---|---|---|
| slug | folder name, lowercase-with-hyphens | `"neon-dream"` |
| title | film title as shown | `"Neon Dream"` |
| year | number, no quotes | `2026` |
| role | your role line | `"Director / DoP"` |
| runtime | free text | `"12:40"` |
| tags | list of words | `["short film","sci-fi"]` |
| accent | this film's color, hex | `"#C8FF00"` |
| tileSize | `"normal"` or `"large"` (large = double tile) | `"large"` |
| category | which works channel: `"human"` or `"machine"` (leave out = human) | `"machine"` |
| synopsis | one short paragraph | |
| credits | list of `{ "role": …, "name": … }` | |
| film | where the full film lives — see below | |
| stills | gallery file names, in order | `["01.jpg","02.jpg"]` |
| position | leave out (auto layout) or pin: `{ "col": 4, "row": 0 }` | |

**film** is one of:
- `{ "type": "vimeo", "src": "https://vimeo.com/123456789" }`
- `{ "type": "youtube", "src": "https://youtu.be/XXXXXXXXXXX" }`
- `{ "type": "local", "src": "film.mp4" }` — put `film.mp4` in the folder
- `null` — no RUN FULL FILM button (trailer-only project)

## The project page (the dossier)

Clicking a tile opens the film's **procedure dossier**. Everything on it comes
from the fields above — nothing extra to maintain:

- The page chrome always uses the site's fixed acid palette (green/pink/
  blue/lavender). Your `accent` is the *specimen's* color: it drives the
  pixel-dither reveals and is printed as the HUE chip in the spec sheet.
- The machine codes (CODE, SIG, the barcodes) are generated from the slug —
  stable per film, no field to edit.
- `stills` order drives the footage wall's rhythm: two side-by-side, two
  side-by-side, one full-bleed, repeat. A lone leftover still goes full-bleed.
  3 stills read fine; 5+ give the wall its full breathing pattern.
- The YES / NO block at the bottom is navigation: YES = next film in
  `projects.json` order, NO = back to the works floor.

## The About page (the operator file)

Everything lives in `content/about/`. **The test images shipped there are
placeholders — replace them with your real photos.**

- **Photos are found automatically — no field to edit.** Drop in
  `portrait.jpg` (or `.jpeg/.png/.webp`) for the big scanner portrait, and
  `01.jpg` … `08.jpg` for the contact sheet. Any sizes, any aspect ratios,
  any count: every photo is cover-cropped and dithered into the site's look,
  so you can swap pictures forever without touching the design. No portrait
  = the machine scans static and says AWAITING SUBJECT. No numbered photos
  = the contact-sheet section simply doesn't render.
- The portrait glitches on its own every few seconds; hover puts a reticle
  under your cursor, click fires a long burst. MTN calm mode freezes it to
  one still dither.
- The contact sheet shows every photo dithered; the real photo appears only
  under the cursor. Click for full size.
- **`about.json`** (all fields optional — delete any and the page adapts):
  - `statement` — the line under your name
  - `bio` — list of paragraphs (first one renders big and italic)
  - `facts` — list of `{ "k": "BASE", "v": "Saigon / Remote" }` rows
  - `capabilities` — list of words for the CAP chips (defaults to your
    `site.json` tagline split on commas)

## Export recipes (if you don't use the script)

- **poster.jpg** — 1280×720 JPEG, quality ~80.
- **preview.mp4** — 3–5 s, 640px wide, H.264, no audio, ~24fps, target ≤ 2 MB.
  Premiere/Resolve: H.264, width 640, "match source" height, no audio track.
- **hover.mp4** — 8–15 s montage of your best moments, 960px wide, ≤ 6 MB.
- **film.mp4** — only for self-hosting; 1080p H.264 is fine. Big files =
  slow page for visitors; Vimeo/YouTube links are lighter.

## Change / reorder / remove

- **Swap media:** overwrite the file with the same name. Refresh. Done.
- **Reorder the floor:** reorder the entries in `projects.json`.
- **Feature a film:** set its `tileSize` to `"large"`. Featured films render
  at double size, gather as one cluster at the centre of the floor, and wear
  the featured dress (double frame, FEATURED tag, resting glow, photographic
  poster). Six featured films make the best centre block.
- **Remove a film:** delete its entry from `projects.json` (the folder can stay).
- **The two channels:** the works floor broadcasts on `CH·01 FOR NO MANKIND`
  and `CH·02 THINKING MACHINES` — the switcher sits bottom-center.
  A film's `category` decides its channel. Give each channel a few
  `"large"` films so both floors get a featured centre cluster. Deep links:
  `works.html?ch=machine`.

## Homepage reel (the 5 loops)

Drop short clips named `loop-1`, `loop-2`, … up to `loop-8` into
`content/home/` and the homepage becomes an endless full-bleed reel: each clip
plays ~3 seconds, then a datamosh cut jumps to the next, forever. The page's
accent color re-samples from every clip as it lands. Any number of loops works
(5 recommended); numbering order = play order; refresh, done.

Formats, checked in this order per slot: `.mp4`, `.webm`, `.gif`.
**Use mp4** — a 3s mp4 is ~10× smaller and cleaner than the same clip as GIF
(GIFs work, but they're capped at 256 colors and huge).

Cut a 3-second loop from one of your films with ffmpeg (change the start time
`-ss` to pick the moment):

```
ffmpeg -ss 00:01:12 -t 3 -i "MYFILM.mp4" -an -vf "scale=1280:-2" -c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart loop-1.mp4
```

## Homepage picture (fallback / first paint)

`content/home/hero.jpg` (also `.jpeg`/`.png`/`.webp`) is the poster the page
shows instantly while the loops load — and the whole hero, if no loops exist.
Overwrite that one file (any aspect ratio, ~1920px wide JPEG recommended),
refresh, done — the site re-fits it, re-samples the accent from it, and runs
the glitch treatment automatically.

## Motion: full by default, CALM one click away

The site plays full motion for everyone — it does NOT follow the operating
system's "reduce animations" flag (many Windows machines have it off without
the owner knowing, which would show visitors a frozen site). The `MTN` button
in the top-right HUD switches any visitor to a fully still, calm version, and
the choice is remembered on their browser.

## Site text and menu

`site.json`: `name` (the wordmark), `tagline`, `email` (contact page),
`nav` labels, `socials`. Same rule — edit, save, refresh.

## Publishing

Build once per CODE change (not content): `npm run build` → upload the `dist/`
folder to any static host (Netlify Drop: drag the folder into the browser).
To update content on an already-published site, replace files inside the
host's `content/` folder (or re-upload `dist/`) — no rebuild needed.
Host the site at the domain root (site.com), not in a subfolder (site.com/portfolio/) — the site's paths assume the root.
