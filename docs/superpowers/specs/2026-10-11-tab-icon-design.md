# The tab icon — design (2026-10-11)

The owner:

- "yes make it for me. The design must follow exactly like the website's art direction. That icon's color is definitely in the same color as the greenish color of my site"

## What was found

- **The site has no icon.** No page declares one and there is no file. Every visitor's browser asks for `/favicon.ico`
  on its first visit, gets a 404, and the tab shows a generic globe. Found on 2026-10-11, checking the live site.
- **The green is `--signal: #C8FF00`** (`tokens.css`): the wordmark's period (`.brand em`), the active link, the HUD's
  switches. The About file stamps it `SGN//C8FF00`.
- **The wordmark** is Bodoni Moda 700 in bone, its period in signal: `REVACHOL.`. Bodoni Moda has an optical-size axis
  (6 to 96). Its small cuts carry sturdier hairlines.
- **The hardware a mark can borrow:** the floor's registration crosses (`.wk-reg`), the legend's tick rail
  (`.hk-ticks`), the RVL codes, and the grain (`src/shell/grain.ts`: an overlay, so the void stays black).
- **The CSP already allows it:** `img-src 'self'`.
- **`about-old.html` is never touched.** A root `/favicon.ico` reaches it anyway: a page with no icon link asks for that
  file.

## Design

### 1. The mark

- The wordmark's own letter, **R.**: Bodoni Moda's R and its round period, both in signal, on a void plate. The
  wordmark's R is bone. Here it turns signal, the owner's green.
- Around it, in signal at 55 % on the void (the dim tone of the site's hardware): the floor's registration crosses at
  the corners, and the legend's tick rail on the bottom crosses' line, a ruler under the letter.

### 2. One drawing at four sizes

| Size | Where it shows | What it carries |
|---|---|---|
| 16 px | a tab on a standard screen | R. alone: Bodoni Moda 900 at opsz 6, set on the pixel grid, with a 3 × 3 period |
| 32 px | a tab on a HiDPI screen | R. (800 at opsz 11), the four crosses and an 8-tick rail |
| 48 px | Windows shortcuts, search results | the same at 48: 14 ticks |
| 180 px | a phone's home screen | drawn smooth in the wordmark's own cut (700 at opsz 32); the crosses, a 16-tick rail, the code `RVL` on the top crosses' line, and the site's grain on the light (the void stays void); the crosses clear iOS's rounded corners |

- 16, 32 and 48 are two-tone pixel grids (signal, dim signal, void). Each is set from the font's raster at its size and
  tuned by hand:
  - the period sits a pixel closer than the font sets it;
  - at 16 the foot's tail pixel goes, so the period fits.
- The files:
  - `public/favicon.ico`: the three as PNG frames, 874 bytes;
  - `public/apple-touch-icon.png`: 24 KB.
- `scripts/make-icons.py` makes both. Its grids are the source, the colours come from `tokens.css`, and the 180 is drawn
  from the fonts in `public/fonts/`.

### 3. The pages

- Every page but `about-old.html` gets, after its description:
  - `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />`;
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`.
- HOW-TO-EDIT gets a "Tab icon" section: the two files, how to swap them, and the browser's long memory for icons.

## Tests

- `tab-icon.test.ts`:
  - every page but the archived ABOUT links both icons, and `about-old.html` links none;
  - the `.ico` holds 16, 32 and 48 px frames whose pixels are exactly `--signal`, its dim mix and `--void`, read from
    `tokens.css`;
  - the 180 is 180 × 180, with the R. in signal and a void corner.

## Verification

- The build in real Chrome:
  - every page serves both icons (200, `image/x-icon`), and Chrome decodes the `.ico`;
  - no page logs a console error: the favicon 404 is gone, and the CSP refuses nothing;
  - the smoke check stays clean: 9 pages at 1440 × 900, 1920 × 1080 and on a 390 × 844 touch phone.
- The same on the live site after the Pages deploy.

## Design calls for the owner

- The mark: R. in signal on void, with dim registration crosses and a tick rail. The alternative is the inverted plate,
  a void R. on a signal square (the `.st-plate` way). It is louder in a tab, and further from the site's black.
- The R is signal, not the wordmark's bone: the owner asked for the green.
- The 180's code reads `RVL`.
- The 180 carries the site's grain. The tab sizes do not: at 16 to 48 px it would only be noise.
