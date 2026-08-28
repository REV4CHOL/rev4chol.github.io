# About page — OPERATOR FILE (design)

Date: 2026-08-28 · Status: approved by user (concept + design), building

## Intent

Replace the About stub with a full page in the site's acid procedure-dossier
grammar: the machine examines its own operator. Hard requirements from the
user: same established style; **photo-agnostic** (pictures will be swapped
later — any count, any aspect, no filenames hardcoded in JSON); **heavy
dithering and glitch effects**.

## Fiction & naming

Homepage = the signal · works = the floor · project = procedure dossier ·
**about = operator file**. Rail labels: `OP:` (dossier), `CAP:` (capability
matrix), `SHT:` (contact sheet). Finale: `TRANSMIT? YES ▸ INITIATE CONTACT`.

## Page structure (top → bottom)

1. **File header (hero)** — left: stacked mega type `OPERATOR` (signal
   outline) over `REVACHOL` (bone solid, scramble-in), statement line under it
   (Bodoni italic). Right: portrait frame (4:5), corner ticks, concentric
   reticle rings behind (field blue, slow spin), dotted-leader callouts
   (`ALIAS`, `CLASS` from tagline, `FILE` code, `STATUS :: ACTIVE ▸` blink).
   Typed status line `PERSONNEL :: REVACHOL // CLEARED`. `P·OP/01` stamp +
   barcode.
2. **Calibration strip** — full-width SMPTE-style bars from the quartet
   (signal, alert, field, flourish, bone, surface, void) with hex micro
   labels. Pure CSS. The colorist identity moment.
3. **OP: dossier** — bio: first paragraph Bodoni italic at `--t-lg`, rest
   Geist Mono; facts as the dotted spec `dl` grammar.
4. **CAP: matrix** — indexed chips `01 ▸ COLOR GRADE`.
5. **SHT: contact sheet** — gallery grid (auto-fill, cover-fit cells),
   sprocket-hole strips top/bottom (CSS dots), `FR·NN` frame numbers.
   **Dither-first interaction**: cells rest fully dithered; the true photo
   shows on hover/focus. Click = lightbox. Zero photos → section hidden.
6. **TRANSMIT?** — pink outline question, mega green `YES ▸ INITIATE
   CONTACT` → /contact.html, socials as pills, `EOF` barcode stamp.

## Photo contract (the adaptivity guarantee)

Probe `public/content/about/` via HEAD (loops pattern, text/html guard):
`portrait.(jpg|jpeg|png|webp)` and `01..08.(jpg|jpeg|png|webp)`. Every found
image is cover-fit then dithered — any photo lands in the site language.
No portrait → procedural noise specimen + `AWAITING SUBJECT // DROP
PORTRAIT.JPG` caption; the engine still runs on the noise.

## Glitch portrait engine (`src/about/specimen.ts`)

2D canvas only (no Pixi). On load, pre-render from a cover-fit master
(720×900): T0 original color · T1 signal dither (resting) · T2 alert dither ·
T3 coarse field dither (outW 180) · R/G/B channel splits of T0. rAF loop:
resting T1 + scan sweep; bursts every 4–9 s for 180–320 ms — treatment
flips, horizontal slice displacement, block corruption, channel-split
ghosting. Hover: reticle tracks cursor + burst. Click: long burst + zap.
Calm (`.rvl-calm` / `reducedMotion()`): static T1, engine never starts.
Pure geometry (slice offsets, burst frame plan, schedule) lives in
`src/about/operator.ts` seeded by mulberry32 — unit-tested.

## Content contract (`about.json`, all fields optional)

```json
{ "statement": "THE EYE BEHIND THE MACHINE",
  "bio": ["…", "…"],
  "facts": [{ "k": "BASE", "v": "…" }],
  "capabilities": ["COLOR GRADE", "EDIT", "AI PIPELINE"] }
```
Missing file/fields → defaults: statement above; capabilities from
`site.tagline` split on commas; facts fall back to STATUS/CLASS/CONTACT
rows. Parser `parseAbout` + `loadAbout` in `content.ts` (fail loudly on
malformed present fields, per ContentError convention).

## Files

- `src/about/operator.ts` (pure) + `tests/operator.test.ts`
- `src/about/specimen.ts` (canvas engine)
- `src/pages/about.ts`, `about.html`, `src/styles/about.css` (rewrites/new)
- `src/lib/stamps.ts` — `armStamps` extracted from project.ts; both pages use
  it (`[data-stamp]` reveal pattern)
- `public/content/about/about.json` + generated varied-aspect test images
  (user swaps later)
- `HOW-TO-EDIT.md` about section

## Non-goals

No Pixi on this page; no new global nav/HUD behavior; no timeline/awards
sections (YAGNI until real content exists); contact page untouched.

## Verification

tsc + vitest (new pure tests) + build; live pane audit at 1440×900 and
375×812 (overflowX 0, nav/HUD clearances, stamps, engine states incl. calm
and no-portrait fallback); commit; memory update.
