# SODA COAST, the AI generalist, the COLORIST and AI chapters — design (2026-09-26)

The owner:

1. "Replace VHS EDEN in chapter 1 with this" — `D:\WORK\PROJECT\Web Materials\2025 PhanThiet_webloop`. Title: Soda Coast. Year 2025. Role: Director / Colorist / Editor / Sound Designer. Runtime 01:56. Genre EXPERIMENTAL / SUPERNATURAL. Synopsis: "A ghost of the past, the present and the future." — **corrected mid-build:** that line is PHILIA's (the chapter's other real film); SODA COAST's is "I see summer. And then the sea."
2. "HOMEPAGE: add another title: AI Generalist before COLORIST."
3. "Work section: Chapter 1 change name to COLORIST. Chapter 2 change name to AI. I know the 'AI' have the risk of being smaller than the ch02 on top, but u gotta stop that. The 'AI' must be bigger than ch02 on top. Same goes for 'COLORIST'."

## What was found

**The film.** The folder holds one web loop (1280 × 720, 8.2 s, 24 fps, 12.2 Mbps, a timecode track) and 51 Resolve stills. The picture is **scope inside 16:9**: the loop's active image is 1280 × 540 (cropdetect), 48 stills are 3840 × 2160 letterboxed the same way and three (1.85, 1.89, 1.90) are bare 4096 × 1742. One reel, numbered `_1.N.1` — N is the timeline order (the grab timestamps are not). The site already carries a scope film (FAR EAST, `aspect: "2.39:1"`: loop 1280 × 534, stills 1600 × 670, poster 1280 × 534) and a film without its link yet (MIEN VIEN, `filmPending: true`: WATCH shows, greyed, TRANSMISSION PENDING). VHS EDEN is a placeholder: CH·01 (human), `large`, slot 12 of `projects.json`.

**The homepage roles bar** is `site.json`'s `tagline` ("colorist, editor, filmmaker"), upper-cased and joined with ` · `, spaces underscored.

**The chapter names** live in `src/works/channels.ts` and show twice: the bottom-centre dial (`CH·NN` in 10 px Martian Mono over the name in 16 px Clash Display; 12 px on a phone) and the flip's ident stamp (`CH·NN ▸ TUNING` over the name at `--t-2xl`). Measured in the pane at 1440 × 900 with the new names: the dial's `CH·02` spans **44 px**, `AI` **19 px** — the label is more than twice as wide as the word under it; `COLORIST` spans 90 px. The ident's `CH·02 ▸ TUNING` spans 76 px over an `AI` of 62 px. The owner's fear is real in both places.

## The design

### A. SODA COAST in VHS EDEN's slot

`projects.json` slot 12: `soda-coast`, "Soda Coast", 2025, "Director / Colorist / Editor / Sound Designer", runtime "1:56" (the other real films' form), tags `experimental`, `supernatural`, accent `#4FB3FF` (the film's soda-blue sky against its orange stripes), `aspect: "2.39:1"`, the synopsis "I see summer. And then the sea.", one credit (the four roles, Revachol), `film: null` + `filmPending: true` (no link given), `category: "human"`, `tileSize: "large"` (the chapter keeps its six). The media, by the FAR EAST recipe:

- `preview.mp4`: the loop cropped to 2.39 (1280 × 534), H.264 CRF 23, no audio, no timecode track, faststart — ≤ 2 MB.
- `poster.jpg`: still 51 (the three friends looking down into the lens against the sky — the loop's opening shot), 1280 × 534.
- `stills/01..51.jpg`: timeline order by N; scaled to 1600 wide and cut to 1600 × 670 (the letterbox bars and the bare-scope frames land on one size).

The `vhs-eden` folder goes with its entry. PHILIA's synopsis becomes the owner's "A ghost of the past, the present and the future." (it was mine: "Summer keeps a copy of everyone.").

### B. The AI generalist

`tagline`: "AI generalist, colorist, editor, filmmaker" → the bar reads `AI_GENERALIST · COLORIST · EDITOR · FILMMAKER`.

### C. COLORIST and AI, always bigger than their labels

`CHANNELS` names: `COLORIST`, `AI`. A pure rule in `channels.ts`: **a name spans at least `NAME_OVER_INDEX` (1.1) times the label over it** — `nameScale(pairs)` returns the factor a set of names must grow by (1 when they already do; the largest need wins; unmeasurable widths leave the size alone). Type width is linear in its size, so the factor is exact.

- **The dial**: the name's text is its own span (`.ch-word`, the `▸` mark stays outside the measure); `.ch-name`'s size multiplies `var(--ch-scale, 1)` on desktop and phone. After the buttons mount, when the fonts land, and on every resize, the page measures each word and label at scale 1 and sets `--ch-scale` on the dial. **One scale for both names**: they grow together and stay one size, so the pair reads as a matched title bar instead of one giant word beside a small one. With COLORIST and AI that is ~2.5×.
- **The ident**: at each flip, the label's final text is set before its scramble, both are measured, and the name grows by `nameScale` before the existing cap to 92 % of the plate shrinks anything that would overflow.

## What does not change

The floor, the tiles, the dossier layout, the channel keys (`human`, `machine`) and the deep links (`?ch=machine`), every other film, the other pages, `about-old.*`.

## Tests

- channels: the names are COLORIST and AI; `nameScale` — 1 when every name already clears the ratio; the exact factor for a short name (AI's measured 19.1 under 44 → 2.534); the largest need across a set; zero or missing widths ignored.
- content-files: the tagline's first role is "AI generalist", colorist second; PHILIA carries the ghost line; slot 12 is `soda-coast` with the owner's fields (no `vhs-eden` anywhere), its poster, loop and 51 stills on disk.

## Verification in the pane

Desktop 1440 × 900: the dial's `AI` and `COLORIST` each wider than their `CH·NN` (measured), one size; a flip to CH·02 shows the ident's `AI` wider than `CH·02 ▸ TUNING`. Phone preset: the same measures. The homepage roles bar with AI_GENERALIST first, desktop and phone. `/project.html?p=soda-coast` (or the floor): the pane shows the poster and plays the loop at 2.39; the dossier carries the fields, the WATCH button greyed, the 51-still wall.

## As built (2026-09-26)

- **SODA COAST** as specced, with the owner's synopsis correction: SODA COAST reads "I see summer. And then the sea.", PHILIA reads "A ghost of the past, the present and the future.". Media: poster 1280 × 534 (96 KB, still 51); loop 1280 × 534, 8.2 s, 1.86 Mbps, 1.9 MB, no timecode track; 51 stills 1600 × 670 at JPEG q5, 4.7 MB in all (the three bare-scope 4096 × 1742 frames land on the same size: scale to 1600 wide, then cut to 670). The pane: the floor builds a 538 × 225 scope card captioned 2025 · SODA-COAST; no VHS or EDEN text of VHS EDEN's left in the scene. The dossier: every field, the two genre pills, the loop playing, WATCH greyed with TRANSMISSION PENDING, the 51-still wall.
- **The dial**, measured in the pane: desktop 1440 × 900 — `--ch-scale` 2.53, both names 40.4 px; AI spans 1.10 × its CH·02, COLORIST 5.31 × its CH·01. Phone preset — scale 3.37 (the phone's base name is 12 px), both names 40.5 px, AI 1.10 ×; the two names stack in two rows as the phone layout intends, clear of the bottom HUD.
- **The ident**, measured after each flip: AI grows from 96 to 130 px and spans exactly 1.1 × CH·02 ▸ TUNING; COLORIST keeps its 96 px (4.0 ×).
- **Beyond the spec: the roles bar's wrap.** Four roles no longer fit a phone's line, and the old join left the second line opening with a stray dot ("· FILMMAKER"). The builder moved to `src/home/roles.ts` (`rolesLine`, tested): each separator is glued to the role before it with a no-break space, so the phone reads AI_GENERALIST · COLORIST · / EDITOR · FILMMAKER. The desktop line is one row (229 px).
- Gates: tsc clean, 274 passed / 3 skipped (the names and four `nameScale` cases, two content cases, three roles cases), the build emits `soda-coast` into `dist/content` and its manifest.
