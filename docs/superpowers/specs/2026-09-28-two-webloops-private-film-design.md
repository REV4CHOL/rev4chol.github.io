# Two new webloops and a private film — design (2026-09-28)

The owner:

- "forget about Mien Vien watch link, it will never arrived cuz the director want to keep the film not opened to the masses."
- "Change the webloop on JAECOO J5 (chapter 2) to this: `D:\WORK\PROJECT\Web Materials\2026 JAECOO_webloop\JAECOO_webloop.mp4`"
- "Change the webloop on Forest Onsen (chapter 2) to this: `D:\WORK\PROJECT\Web Materials\2026 Forest Onsen_webloop\ForestOnsen_webloop.mp4`"

## What was found

- **The new loops:**

  | Film | New loop | Picture | Last frame | Opening shot |
  |---|---|---|---|---|
  | JAECOO J5 | 3840 × 2160, 23.976 fps, 4.46 s (107 frames), 127 Mbps, 71 MB, plus a timecode track | full frame, 16:9 | clean (luma ~81) | the steering-wheel badge: the shot the current poster already shows |
  | FOREST ONSEN | 1280 × 720, 24 fps, 9.92 s (238 frames), 11.9 Mbps, 15 MB, plus a timecode track | full frame, 16:9 | **one pure black frame** (luma 16 against ~70): it would flash black at every wrap | the golden path; the current poster is the OLD loop's opening shot (Mount Fuji over the flower field) |

- **The loops on the site today:** JAECOO J5 1280 × 720, 4.17 s, 0.93 MB (CRF 21); FOREST ONSEN 1280 × 720, 11.4 s, 2.9 MB (CRF 29, the dense foliage push-in, checked 1:1 on 09-27).
- **The media manifest** is built from the folders at dev and build time, so a loop replaced under the same name `preview.mp4` needs no list change.
- **MIEN VIEN** is `"film": null` + `"filmPending": true`. Its dossier shows WATCH greyed out with the hover text "FILM LINK COMING SOON". That is no longer true.
- **Dropping the flag is not an option.** Since 09-27, `film: null` without it means PLACEHOLDER: the floor strip says PLACEHOLDER, the caption opens "PLACEHOLDER · NO FILM YET" and the dossier says "PLACEHOLDER ▪ NO FILM HERE YET". MIEN VIEN is a real film.
- **HOW-TO-EDIT** still says `null` means "no WATCH button (trailer-only project)". That has been wrong since 09-27.

## Design

### 1. The loops

- Both are cut with the house loop flags into `public/content/projects/<slug>/preview.mp4`, replacing the old file: `-map 0:v:0 -an -dn -sn -map_metadata -1 -write_tmcd 0 -c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart`.
- **JAECOO J5:** `scale=1280:720:flags=lanczos`, CRF 21 (its 08-29 level), native 23.976 fps: 1.02 MB, 4.46 s.
- **FOREST ONSEN:** `-frames:v 237` drops the black last frame, so 9.875 s. CRF 29, the level accepted for this film on 09-27: 2.48 MB. CRF 27 looked a shade crisper at 1:1 in the densest foliage but weighs 3.2 MB.

### 2. The posters

- The house rule (09-27): a pane's poster is its loop's opening shot, so a waking pane has no jump.
- **JAECOO J5 keeps its poster.** The new loop opens on the same steering-wheel badge shot.
- **FOREST ONSEN gets a new poster:** the new loop's first frame, 1280 × 720, cut from the source. No 4K still is that frame: still 1.6.5 is the same path later in the move.

### 3. A private film

- A new optional field, `"filmPrivate": true`: a real film that will never have a public link.
  - It is not a placeholder. `isPlaceholder()` is false, so the floor treats it as the film it is (strip, caption, dossier status ONLINE), exactly as today.
  - The dossier shows no WATCH button. Where it would stand, one quiet line in the placeholder line's style: `PRIVATE FILM ▪ NOT AVAILABLE TO WATCH ONLINE`.
  - The reason (the director's wish) stays off the site. The line says what a visitor can and cannot do.
  - The parser reads it like `filmPending`: true or false, default false. A link in `film` wins over it, as over `filmPending`. Both flags true is refused: they say opposite things.
- **MIEN VIEN:** `"filmPending": true` becomes `"filmPrivate": true`. The pending path stays for any future film awaiting its link.
- **HOW-TO-EDIT:** the new flag, and the `null` line corrected (no film and no flag = a PLACEHOLDER pane).

## Tests

- `content.test.ts`: `filmPrivate` defaults false, accepts true, rejects junk; both flags true is refused.
- `legend.test.ts`: a private film is not a placeholder, and its caption carries no PLACEHOLDER; in projects.json MIEN VIEN is private, not pending, with no link, and no film is pending today.
- `wayfinding.test.ts`: the dossier's private line is pinned.
- `content-files.test.ts`: the two new loops, read from each mp4's `mvhd` (4.46 s and 9.875 s), each faststart (`moov` before `mdat`) and under 3 MB.

## Verification

- Dev, real Chrome over CDP: both panes wake and play the new loops (source, duration, frames advancing, no black); both dossier heroes play them; FOREST ONSEN's sleeping pane shows the golden path; MIEN VIEN's dossier shows the private line with no WATCH and no PLACEHOLDER.
- The same on the live site after the Pages deploy.

## Design calls for the owner

- The private line's wording: `PRIVATE FILM ▪ NOT AVAILABLE TO WATCH ONLINE`.
- FOREST ONSEN's new poster (the new loop's first frame). The owner asked only for the loop.
- FOREST ONSEN at CRF 29, with the black last frame dropped.
