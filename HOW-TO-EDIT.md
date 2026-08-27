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
| synopsis | one short paragraph | |
| credits | list of `{ "role": …, "name": … }` | |
| film | where the full film lives — see below | |
| stills | gallery file names, in order | `["01.jpg","02.jpg"]` |
| position | leave out (auto layout) or pin: `{ "col": 4, "row": 0 }` | |

**film** is one of:
- `{ "type": "vimeo", "src": "https://vimeo.com/123456789" }`
- `{ "type": "youtube", "src": "https://youtu.be/XXXXXXXXXXX" }`
- `{ "type": "local", "src": "film.mp4" }` — put `film.mp4` in the folder
- `null` — no WATCH button (trailer-only project)

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
- **Feature a film:** set its `tileSize` to `"large"`.
- **Remove a film:** delete its entry from `projects.json` (the folder can stay).

## Homepage picture

The homepage hero is whatever image lives at `content/home/hero.jpg`.
Overwrite that one file (any aspect ratio, ~1920px wide JPEG recommended),
refresh, done — the site re-fits it, re-samples the page's accent color from
it, and runs the glitch treatment on it automatically. No other edit needed.

## Site text and menu

`site.json`: `name` (the wordmark), `tagline`, `email` (contact page),
`nav` labels, `socials`. Same rule — edit, save, refresh.

## Publishing

Build once per CODE change (not content): `npm run build` → upload the `dist/`
folder to any static host (Netlify Drop: drag the folder into the browser).
To update content on an already-published site, replace files inside the
host's `content/` folder (or re-upload `dist/`) — no rebuild needed.
Host the site at the domain root (site.com), not in a subfolder (site.com/portfolio/) — the site's paths assume the root.
