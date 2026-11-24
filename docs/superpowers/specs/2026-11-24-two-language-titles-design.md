# Two-language titles: stacked, one column — design (2026-11-24)

Two films carry a name in two languages, written with a slash in `public/content/projects.json`:
`"Temptation / Xiêu Lòng"` (xieu-long) and `"Ever Faraway / Miên Viễn"` (mien-vien). The owner: 'can we design
something special to replace the "/" to make it more appealing? Right now it looks rough'. Shown four mock-ups (A
stacked, B a cross, C a bar, D solid + hollow), they answered: "go for A. But I want the two texts to be organise
neatly in the same column, and it need to sit a bit closer to each other via their line spacing. It needs to be
organise nicely and aesthetically".

## The rule

- `splitTitle` (`src/lib/title.ts`) splits a title at its first `" / "` (space, slash, space) into `main` and `alt`.
  A bar (`GALAXY Z FOLD 8 ULTRA | DIGITAL AD`), a dash, a colon or a bare slash is part of a name. Letters stay as
  written (NFC in, NFC out).
- Wherever a film's name is a headline, a two-part title stands as a lockup: line 1 the English name exactly as a
  one-part name is drawn there; line 2 the Vietnamese name at **0.58** of line 1, in the film's accent, same face and
  weight. No mark between them.
- **One column**: both lines' ink starts at one x. Letters of different sizes have different side bearings (T, X, E,
  M), so the script measures each line's ink (canvas `actualBoundingBoxLeft`, at 1,000 px) and shifts line 2 by the
  difference (`--tt-shift`, in line 2's em: 0.0426 em for XIÊU LÒNG, 0.0226 em for MIÊN VIỄN).
- **Tight leading, one for all**: line 2's tallest mark is the Ễ of MIÊN VIỄN, 0.30 em of line 2 above its cap top
  (measured in the display face at 700: cap 0.67 em, Ễ 0.97 em). Line 2's cap top stands **0.30 + 0.07 = 0.37 em**
  (of line 2) under line 1's baseline, so the Ễ clears it by 0.07 em, never less than 1 px. The script measures the
  two baselines on the lockup set at 1,000 px (the pixel grid lost in it) and sets `--tt-pull`, in em, so the same
  leading holds at every size and on every surface.
- The numbers are one block: `components.css` `:root { --tt-ratio: 0.58; --tt-mark: 0.3; --tt-clear: 0.07; }`,
  mirrored by `LOCKUP` in `src/lib/title.ts` (tests tie them). "A bit closer / further" is `--tt-clear`; "line 2
  bigger / smaller" is `--tt-ratio`.

## Where it applies

| Surface | Lockup | Notes |
|---|---|---|
| Film page hero (`#p-title` and its outlined ghost) | yes | each line scrambles in its own span; the ghost outlines both |
| Film page next-film link (`.p-nextlink`) | yes | `NEXT FILM ▸` then the lockup, line 1 on the link's line; pressed, line 2 turns void like the rest |
| THE LIST row (`.fl-title`) | yes | line 2 in the row's accent; the phone list's ▸ ends line 1 |
| Phone strip pane (`.rl-title`) | yes | fitted on the English line; ▸ ends line 1 |
| Floor hover caption (`#tile-label .tl-title`) | yes | each line scrambles in its own span |
| The film page ticker | no: one running line, a centred dot between the names (`runningTitle`: `TEMPTATION · XIÊU LÒNG`) | the owner, asked: "A dot instead" |
| Browser tab title, aria-labels, the hidden screen-reader list | no: the plain string with its slash | not seen |

A one-part title takes the old path on every surface (plain text, same element, same size): measured unchanged on
REMNANTS OF A DREAM, THE BETROTHAL and GALAXY Z FOLD 8 ULTRA | DIGITAL AD.

## The film page: fit and frame

`fitTitle` fitted the one-line name to the stack's width. A two-part title fits **on each line's width** (the English
sets it; line 2 can only shrink it) **and on a height share**: the lockup's ink never takes more than **20%** of the
hero's height (`LOCKUP.heroShare`). The viewfinder (`.p-scanframe`) is an overlay: its bottom edge (`--p-frame-b`,
default 120 px, 130 px on a phone) rises to stand **18 px** clear of line 1's ink, never lower than its own; a
one-part page never sets it. Measured: at 1440×900 line 1 129.76 px, line 2 75.26 px, the frame's bottom at 620
(was 708), 17 px over TEMPTATION's ink; at 1920×1080 line 1 136 px (full size), frame bottom 763; on a 390 phone the
width rules (line 1 48.85 / 38.34 px) and the frame stays.

Without the frame yielding, the band under the frame (104 px) would hold line 1 at about 73 px, smaller than today's
one-line name with its slash (98 px).

## The phone strip

The fit runs as before on the English line alone, with its ▸ (letters counted on it too), and the name is shown at 66%
of the fit (the owner's earlier choice, unchanged); line 2 is 0.58 of the shown size and wraps only if it must. The ▸
ends line 1: it stays the size and place it has on every one-part pane, and the fit that measures it stays the same.

## Was → now (line 1's baseline to line 2's cap top)

| Surface | was (mock A) | now |
|---|---|---|
| Film page 1440×900 | 61 px | 27.4 px (0.37 × 75.26) |
| THE LIST 1440×900 | 15.4 px | 5.4 px |
| Phone strip 390×844, arrival | 18.2 px | 5.7 px |

## The calls, closed (owner, 2026-11-24)

"In the same column" may also mean the two lines the same width. Stills of that reading (line 2 keeps its left edge,
letter-spaced to 0.5 em, then sized up until its right ink edge meets line 1's) were made beside the default; on
these two names it takes line 2 to 1.21× (XIÊU LÒNG) and 1.63× (MIÊN VIỄN) of 0.58, the latter nearly line 1's size.
Shown the live pages and that picture, the owner chose:

- the column: "Shared left edge" (as built);
- the line spacing: "Good as is" (`--tt-clear` 0.07 stands);
- the ticker, which still ran the slash: "A dot instead" (`runningTitle`, a centred dot in the slash's place).
