# Vietnamese companion fonts — design (2026-09-27)

The owner, on the borrowed Ỏ in "Ăn Hỏi" Ceremony: "yes add the font".

## What was found

- **Coverage.** Clash Display, Bodoni Moda and Martian Mono carry `Ă`/`Đ`, but not the Vietnamese block (U+1EA0–1EF9, `Ơ Ư`, the combining hook U+0309). Only Geist Mono has it.
- **Upstream.** Google Fonts offers no Vietnamese for Bodoni Moda or Martian Mono, and Clash Display is not a Google font. A companion face has to lend those letters.
- **Measured against the primaries** on a canvas: the `O` at 400 px, measuring cap height, width and stem.

  | Primary | Cap height | O width | Stem |
  |---|---|---|---|
  | Clash Display 700 | 268 | 298 | 80 |
  | Clash Display 500 | — | — | 46 |
  | Clash Display 400 | — | — | 30 |
  | Bodoni Moda 700 | 300 | 272 | 70 |

  | Candidate | Cap height | O width | Stem |
  |---|---|---|---|
  | Anybody 800 at 100 % width | 270 | 270 | 81 |
  | Anybody 800 at 112.5 % width | — | 306 | 85 |
  | Anybody 500 at 112.5 % width | — | — | 52 |
  | Archivo 800 | 275 | 288 | 74 |
  | Inter Tight 800 | 291 | — | — |
  | Bricolage 800 | — | 243 | 67 |
  | Libre Bodoni 700 | 302 | — | 76 |
  | Playfair 700 | 283 | — | 66 |

  - Side by side in the pane, Anybody 800 at 110 % width sat closest to Clash's own `O`: "HỎI" beside "HOI".
  - Libre Bodoni is Bodoni Moda's genre, cap height and stem.

## The design

- **Three Google Fonts Vietnamese subsets (OFL)** in `public/fonts/`, 33 KB in all:

  | File | Face | Size |
  |---|---|---|
  | `Anybody-Vietnamese-Wide-Var.woff2` | wdth 110, wght 100–600 | 15.4 KB |
  | `Anybody-Vietnamese-Wide-ExtraBold.woff2` | wdth 110, wght 800 | 9.9 KB |
  | `LibreBodoni-Vietnamese-Var.woff2` | wght 400–700 | 8.0 KB |

- **Two families in `tokens.css`,** each second in its voice, so the browser borrows from them only the letters the primary lacks. The primary keeps its own `Ă`/`Đ`.
  - `RVL Viet Display`:
    - requests up to 600 use the variable file; Anybody's natural 500 meets Clash's 500, for the ticker;
    - requests of 601 and up use the 800 cut, which is Clash's 700 stroke, for the headline and the next-link.
  - `RVL Viet Serif`: Libre Bodoni, natural weights.
  - Each face carries its primary's line metrics (`ascent-override` / `descent-override` / `line-gap-override`: Clash 89/25/9 %, Bodoni Moda 112.5/40/0 %), so a borrowed letter never moves a line.
  - Cap heights already agree within 1 % (Anybody 67.5 % vs Clash 67 %; Libre Bodoni 75.4 % vs Bodoni Moda 75 %), so no `size-adjust`.
  - `unicode-range` is Google's Vietnamese range, so a page downloads a companion only when it shows such a letter.
- **`--f-micro`** falls back to Geist Mono, which is already self-hosted and has the whole block. No download.
- The floor's Pixi labels hardcode Martian Mono but only ever draw ASCII (`year · slug`, FEATURED, RVL codes), so they are untouched.

## Tests (`tests/fonts.test.ts`)

- A small WOFF2 → cmap reader.
- Each voice's stack is resolved from `tokens.css` to its self-hosted files. Every film title (as typed and uppercased) must be drawable in the display voice, and every title and synopsis in the serif voice, before any system fallback.
- The companions stand second.
- Each companion file exists, covers U+1EA0–1EF9 and `Ơ ơ Ư ư`, and wears its primary's metrics.
- Red before the change (only `an-hoi`: `ỏ Ỏ`), green after.

## As built

- **In the pane:** the ĂN HỎI dossier headline's `Ỏ` now matches Clash's `O` stroke for stroke, and both display cuts load (the ticker at 500, the headline at 700). The hover label's `Ỏ` is Libre Bodoni at Bodoni Moda's weight.
- **Pane lesson.** Two quick edits to one CSS file can leave Vite's watcher on the first. The page keeps a stale `tokens.css` even after a reload (`?direct` shows the new one). `touch` the file to re-trigger it.
