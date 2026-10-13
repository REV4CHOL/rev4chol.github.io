# The films' names in the display voice — design (2026-10-13)

The owner, with three crops of film names — `"ĂN HỎI" CEREMONY`, `FAR EAST`, `HALIDE` — set in Bodoni Moda:

- "right now the font for project titles are very hard to read. Change font for me based on our remaining fonts on our
  website"

## What was found

- The site has four voices (`tokens.css`): Clash Display (the display voice), Bodoni Moda (the serif: the wordmark, the
  synopses), Geist Mono and Martian Mono (the readouts), with their Vietnamese companions.
- Two places set a film's name in Bodoni Moda, bold, upper case: **the WORK floor's caption** beside the awake pane
  (`#tile-label .tl-title`, 22–32 px over the dimmed floor), and **THE LIST** (`.fl-title`, 22 px; 18 px on a phone).
  The original design gave Bodoni "film/project titles".
- Every other place a name stands is already Clash Display: the film page's headline, its ticker and its next-film
  link, the station ident's chapter name.
- Bodoni's hairlines are a pixel or less at these sizes. Over the floor's posters, and under a screen's subpixel
  smoothing (the colour fringes in the owner's crops), the thin half of every letter fades.

## Design

- **Both places take the display voice** (`var(--f-display)`: Clash Display, with its Vietnamese companion for Ỏ and
  the like), bold, upper case, as on the film's own page. Sizes and places stay as they were; the caption still wraps
  inside the width its placement gives it, and THE LIST's titles still break anywhere rather than widen a phone.
- A hair of letter spacing (0.02em) and wider word gaps (0.12em, the film page's headline has 0.18em): Clash's own
  word space is narrow in capitals, and `FAR EAST` ran close to one word.
- The type scale's rule (`tokens.css`) now reads: Clash Display owns `--t-xl` and up, and every film's name at any
  size. Bodoni keeps the wordmark and the synopses.

## Tests

- `fonts.test.ts`: every film's name is set in the display voice — the floor's caption, THE LIST, the film page's
  headline, next-film link and ticker; the display voice draws every letter of every title (the caption and THE LIST
  join that list); the serif voice draws every synopsis.

## Verification

- THE LIST at 1440 and on a 390 touch phone, and the floor's caption, in Chrome: Clash Display 700 in both places,
  the Vietnamese name drawn whole, the phone with no sideways overflow.
- check, test and build; the smoke check of 9 pages at three sizes, locally and live.

## Design calls for the owner

- **Clash Display Bold, upper case**, the face of the film page's headline, rather than a mono: the monos are the
  site's readout voice (the years, roles and runtimes beside each name), set small and tracked wide.
- **Bodoni stays** for the REVACHOL wordmark and the synopses.
