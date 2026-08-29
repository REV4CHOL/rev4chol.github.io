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
          preview.mp4   3–5 s loop, 640px wide, silent (required) —
                        plays on the film's pane AND the top of its dossier.
                        ANY video filename works (mp4/webm/mov); only
                        hover.mp4 and your film file are reserved
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
| client | commissioning client — adds a CLIENT row to the spec sheet (leave out to hide) | `"Garena"` |
| tags | list of words | `["short film","sci-fi"]` |
| accent | this film's color, hex | `"#C8FF00"` |
| tileSize | `"normal"` or `"large"` (large = double tile) | `"large"` |
| aspect | `"16:9"` (default), `"4:3"` or `"2.39:1"` — the floor pane AND the whole dossier (hero + stills) present in this ratio; the carpet packs neighbors tight around any width | `"4:3"` |
| category | which works channel: `"human"` or `"machine"` (leave out = human) | `"machine"` |
| synopsis | one short paragraph | |
| credits | list of `{ "role": …, "name": … }` | |
| film | where the full film lives — see below | |
| stills | gallery file names, in order | `["01.jpg","02.jpg"]` |
| position | leave out (auto layout) or pin: `{ "col": 4, "row": 0 }` | |

**film** is what the WATCH button plays. It is one of:
- `{ "type": "vimeo", "src": "https://vimeo.com/123456789" }`
- `{ "type": "youtube", "src": "https://youtu.be/XXXXXXXXXXX" }`
- `{ "type": "embed", "src": "<iframe …></iframe>" }` — ANY other platform
  (Facebook, TikTok, …): paste the platform's full Share ▸ Embed iframe code
  straight in, the player address is pulled out of it
- `{ "type": "local", "src": "film.mp4" }` — put `film.mp4` in the folder
- `null` — no WATCH button (trailer-only project)

For vimeo/youtube, `src` accepts any link form — a watch URL, a share
link, or the **full embed code** pasted straight from the platform's
Share ▸ Embed box (the video id is extracted from it either way).

No link yet but the film is coming? Set `"film": null` plus
`"filmPending": true` — the dossier shows the WATCH button greyed out
until you swap in the real link.

## The project page (the dossier)

Clicking a tile opens the film's **procedure dossier**. Everything on it comes
from the fields above — nothing extra to maintain:

- The page chrome always uses the site's fixed acid palette (green/pink/
  blue/lavender). Your `accent` is the *specimen's* color: it drives the
  pixel-dither reveals and is printed as the HUE chip in the spec sheet.
- The machine codes (CODE, SIG, the barcodes) are generated from the slug —
  stable per film, no field to edit.
- **The footage wall finds your stills by itself** — no field to edit. Drop
  numbered files into the film's `stills/` folder: `01.jpg`, `02.jpg`, …
  (also `.png`, `.webp`, and **`.gif` — GIFs animate right in the wall**).
  Any count, up to 60: 30 files = six full rhythm cycles, 7 files = a
  shorter wall, the layout adapts automatically. Number them without gaps —
  discovery stops at the first missing number. Delete files to shorten.
  The rhythm: two half-width side-by-side, two side-by-side, one
  full-width, repeat — edge to edge, no gaps, every frame 16:9. A lone
  leftover goes full-width. (A `stills` list in projects.json still works
  as a manual override; all placeholder stills are labeled SWAP ME.)
- The bottom bar is navigation: `◂ RETURN TO FLOOR` on the left,
  `(NEXT FILM) ▸` on the right (next = the following entry in
  `projects.json`).
- `credits` stays in the schema but is not rendered on the page right now.

## The About page (the operator file)

Everything lives in `content/about/`. **The test images shipped there are
placeholders — replace them with your real photos.**

- **The portrait is found automatically — no field to edit.** Drop in
  `portrait.jpg` (or `.jpeg/.png/.webp`) for the big scanner portrait. Any
  size, any aspect ratio: it is cover-cropped and dithered into the site's
  look, so you can swap the picture forever without touching the design.
  No portrait = the machine scans static and says AWAITING SUBJECT.
- The portrait glitches on its own every few seconds; hover puts a reticle
  under your cursor, click fires a long burst. Chromatic echo frames breathe
  around it and a scanner line sweeps it continuously. MTN calm mode freezes
  all of it to one still dither.
- **`about.json`** (all fields optional — delete any and the page adapts):
  - `statement` — the line under your name
  - `bio` — list of paragraphs (first one renders big and italic)
  - `facts` — list of `{ "k": "BASE", "v": "Saigon / Remote" }` rows
  - `skills` — the CAP skill board's two banks:
    `{ "creative": ["Colorist", …], "technical": ["DaVinci Resolve", …] }`
  - `capabilities` — list of words for the CLASS callout (defaults to your
    `site.json` tagline split on commas); also the CAP fallback chips when
    no `skills` are set

## The site runs itself

The local site at `http://localhost:5173` is self-hosting: a launcher in
your Windows Startup folder (`revachol-site-server.vbs`) starts it hidden
at every login, and `scripts\serve-forever.cmd` restarts it within seconds
if it ever crashes. Drop content files, refresh the browser, done — no
build step, no terminal.

- **Stop it for good:** delete `revachol-site-server.vbs` from your Startup
  folder (Win+R → `shell:startup`), then end the `node` process in Task
  Manager once.
- **Start it by hand** (after stopping): double-click
  `scripts\serve-forever.vbs` in the site folder.
- **Publishing for the world** happens through GitHub — see the
  Publishing section at the bottom.

## Export recipes (if you don't use the script)

- **poster.jpg** — 1280×720 JPEG, quality ~80.
- **preview.mp4** — 3–5 s, 640px wide, H.264, no audio, ~24fps, target ≤ 2 MB.
  Premiere/Resolve: H.264, width 640, "match source" height, no audio track.
- **hover.mp4** — 8–15 s montage of your best moments, 960px wide, ≤ 6 MB.
- **film.mp4** — only for self-hosting; 1080p H.264 is fine. Big files =
  slow page for visitors; Vimeo/YouTube links are lighter.

## Change / reorder / remove

- **Swap media:** overwrite the file with the same name. Refresh. Done.
- **Change a pane's loop:** drop a video with **any name** (mp4/webm/mov)
  into that film's folder — the same clip is the top of its dossier page,
  so one file drives both. Any time; refresh. If several videos are in the
  folder, `preview.mp4` / `loop.mp4` win first, then A→Z decides.
  `hover.mp4` and a self-hosted film file are never picked.
- **Reorder the floor:** reorder the entries in `projects.json`.
- **Feature a film:** set its `tileSize` to `"large"`. Featured films render
  at double size, gather as one cluster at the centre of the floor, and wear
  the featured dress (double frame, FEATURED tag, resting glow, photographic
  poster). Six featured films make the best centre block.
- **Remove a film:** delete its entry from `projects.json` (the folder can stay).
- **The floor has no size limit.** Add as many films as you like — append
  entries to `projects.json` and each channel's floor grows on its own:
  the band widens with the count, rows extend, the featured cluster
  re-centers. Nothing else to configure.
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
(5 recommended); numbering order = play order; refresh, done. Underscore
names (`loop_1.mp4`) are accepted too.

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

**The site is live at https://rev4chol.github.io/** — hosted free on GitHub
Pages from the repo https://github.com/REV4CHOL/rev4chol.github.io.

Updating the live site is one move. Edit your content locally as usual
(drop files, tweak `projects.json`, check it at localhost), then publish
everything with:

```
git add -A && git commit -m "content update" && git push
```

GitHub receives the push, rebuilds the site on its own servers (the
`deploy` workflow in `.github/workflows/`), and the live site updates
about a minute later. No build step, no uploading folders — the push IS
the publish. If you ever add a custom domain (revachol.com etc.), it plugs
into the repo's Settings ▸ Pages; the site must stay at a domain root,
which GitHub Pages handles automatically.
