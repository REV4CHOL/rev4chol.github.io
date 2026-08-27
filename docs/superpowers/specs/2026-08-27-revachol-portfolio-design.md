# REVACHOL — Cinematic Portfolio Website — Design Spec

**Date:** 2026-08-27
**Status:** Approved pending user review
**Phase:** 1 of N — Site shell + Works world + Project detail template

---

## 1. Overview

A portfolio website for a cinematic filmmaker working under the name **REVACHOL**. The
aesthetic is cyberpunk / mixed-media / ASCII / dither / glitch — "organized chaos."
Every element is interactive and animated, governed by a discipline system so the chaos
reads as intentional design, not noise.

**Core conceit:** the site is a mysterious cinematic operating system. First visit boots
it up. The Works page is its surveillance floor — a living isometric world where all
films play simultaneously (floor796.com DNA). HUD residue (timecode, coordinates,
session ID) ticks in the corners of every page.

### Goals

- "Absolute cinema": a jaw-dropping, deeply interactive showcase.
- Every interactive element has motion/response; imagery uses dither-as-attention.
- **Customization contract:** the owner can add/replace projects, pictures, and videos
  by dropping files in a folder and editing one JSON file. No rebuild for content
  changes, before or after deployment. The technical design never breaks from a
  content edit.
- Static output deployable to any static host.

### Non-goals (Phase 1)

- Final Homepage / About / Contact designs (styled on-brand stubs only; briefed later).
- CMS, backend, analytics, i18n, blog.
- Pinch-zoom on the Works canvas (drag only in v1).
- Bespoke per-project page layouts (one template, per-project skin).

---

## 2. Decisions Locked During Brainstorm

| Question | Decision |
|---|---|
| Hosting | Static output, simple hosting (Netlify/Vercel/any) |
| Build approach | **Vite + TypeScript + PixiJS v8 (WebGL)** — user chose the shader ceiling |
| Works canvas model | Draggable isometric world (no auto-drift; still until touched) |
| Scale | 9–20 projects; tiered playback |
| Detail pages | One template, per-project skin via JSON |
| Mobile | Adapted canvas: same world, tuned down, tap-to-magnify, tap-again-to-enter |
| Sound | Full sound identity, WebAudio-synthesized, toggle in HUD, off until first interaction |
| Phase 1 scope | Shell + Works + detail template + styled stubs for Home/About/Contact |

---

## 3. Creative Direction & Design System

### 3.1 Palette

| Token | Hex | Role |
|---|---|---|
| `--void` | `#060606` | Background everywhere |
| `--surface` | `#0A0A12` | Raised panels |
| `--signal` | `#C8FF00` | Acid green — default HUD/system accent |
| `--field` | `#2418FF` | Ultramarine — large graphic moments, deep zones |
| `--alert` | `#FF2E63` | Hot pink — hovers, live indicators, warnings |
| `--flourish` | `#B79CFF` | Lavender — secondary accents |
| `--bone` | `#EDEDE6` | Text |

**Discipline rule:** one dominant accent per view; others appear only as micro-accents.
Project detail pages flood the project's own accent color (from JSON) into HUD, links,
labels.

### 3.2 Typography

Fonts self-hosted from `D:\WORK\PROJECT\JOB\AI\WEBSITE_AI\FONT`, converted to woff2
(originals untouched; fallback = serve OTF/TTF directly if conversion tooling fails).

| Font | Use | Rules |
|---|---|---|
| **Clash Display** | Big headings, hero text, section titles, nav-scale statements | The loudest voice. Uppercase, tight tracking. |
| **Bodoni Moda** | REVACHOL wordmark, film/project titles | High-contrast cinematic accent. **Never side-by-side with Clash at the same size** — always a size tier below any neighboring Clash. Enforced via a type-scale token system: Clash owns scale steps ≥ `--t-xl`; Bodoni owns `--t-lg` and below when adjacent. |
| **Geist Mono** | All body copy and interface text | The calm workhorse. |
| **Martian Mono** | Micro-labels only: metadata, dates, tags, captions, HUD | ≤11px, uppercase, tracked out, sparse. Never competes with body. |

### 3.3 Effect Arsenal

Every effect has intensity tiers: **idle < hover < active**. Global budget (§8) caps
what runs simultaneously.

- **Dither = attention (signature move):** all imagery lives Bayer-dithered; whatever
  is focused (hover / near viewport center / scrolled into view) resolves to clean.
- Headings scramble-decode in (ASCII character cycling).
- Links invert/strike on hover; every interactive element gets an RGB-split microglitch
  on hover.
- Permanent subtle film grain + scanlines; CRT vignette at viewport edges.
- Custom crosshair cursor with live coordinate readout; morphs to `ENTER ▸` over
  project tiles; native cursor hidden (restored on touch devices and reduced-motion).
- Page transitions: datamosh-style glitch-wipe bursts.
- Boot sequence on first visit per session (1.2–2 s, skippable on click/key): ASCII
  REVACHOL logo, fake system checks — actually disguised preloading of fonts + first
  media. Repeat visits in the same session skip it.
- `prefers-reduced-motion`: calm mode — static grain, no scramble, no drift, no
  glitch-wipes (simple fades), cursor restored.

### 3.4 Sound Identity

Fully synthesized via WebAudio — zero audio files.

- Works floor: sub-bass room-tone hum (filtered noise, very low level).
- Hover: ~3 ms band-passed tick blip.
- Click: deeper thunk.
- Transition: filtered whoosh.
- Detail page: film audio only when the visitor plays the full film.
- Master toggle in the HUD; muted until first user interaction (browser autoplay law);
  preference persisted in `localStorage`.

---

## 4. The Works World

### 4.1 Layout

- Dimetric 2:1 isometric plane (floor796 angle) rendered in WebGL (PixiJS v8), world
  size ≈ 3× viewport.
- Tiles = film screens lying on the floor as parallelograms, arranged in loose city
  blocks with deliberate irregularity. `tileSize: "large"` projects get double-size
  tiles. Deterministic auto-layout seeded by project order; optional per-project
  `position` override in JSON.
- Between tiles: HUD debris — Martian Mono project IDs, wireframe geometry, dither
  gradients, drifting ASCII rain at the void edges.
- Navigation: grab-and-drag with inertia; soft rubber-band at world bounds; touch-drag
  on mobile. **No auto-drift** — world is still until touched.

### 4.2 Hover ("the magnific moment")

1. Tile un-skews toward camera, lifts, scales ~1.6×, glow shadow.
2. Its dither resolves to clean, full brightness; rest of world dims ~40% +
   desaturates.
3. Preview loop swaps to the longer montage cut (`hover.mp4`).
4. Film title materializes beside the tile in Bodoni Moda (scramble-in);
   year/role/runtime in Martian Mono.
5. Cursor becomes `ENTER ▸`; hover blip fires.

### 4.3 Click → Detail Transition

Tile erupts to fullscreen with a datamosh burst → navigate to
`project.html?p=<slug>` where the same preview loop is already the hero. Reads as one
continuous camera move.

### 4.4 Tiered Playback (performance core)

- Priority order: hovered tile (always full) → tiles nearest viewport center → rest.
- Simultaneous playing videos capped: **10 desktop / 4 mobile**.
- Above-cap tiles show an **animated dithered poster** (canvas shimmer + glitch ticks
  over the still — alive, near-zero cost).
- Videos wake/sleep on priority change; WebGL texture uploads only for playing tiles.

### 4.5 Mobile Adaptation

Same world. Tap = magnify + montage (hover state); tap again (or the `ENTER` affordance
that appears) = navigate. 4 live videos max; drag only.

### 4.6 Works Page DOM Overlay

- Nav bar: `REVACHOL` (Bodoni Moda) left; `HOMEPAGE / WORK / ABOUT / CONTACT`
  (Geist Mono, labels driven by `site.json`) right.
- Corner HUD: live pan coordinates, running timecode, session ID, sound toggle,
  `N PROJECTS LOADED`.
- Hidden semantic `<ul>` of all projects (real links) under the canvas for SEO and
  screen readers.

---

## 5. Project Detail Page

DOM page (not canvas), route `project.html?p=<slug>` — static-host friendly, no
rewrites needed.

Layout top to bottom:

1. Full-bleed hero: preview loop autoplaying, resolves from dither on load.
2. Film title, huge, Bodoni Moda (no adjacent Clash at that scale — rule holds).
3. Martian Mono metadata strip: year / role / runtime / tags.
4. Synopsis in Geist Mono.
5. `WATCH FILM` → player: local `film.mp4` **or** Vimeo/YouTube embed per JSON.
   Embeds lazy-load only on click (privacy + weight).
6. Stills gallery: each image resolves from dither as it enters viewport; click =
   lightbox.
7. Credits table (Geist Mono, Martian Mono labels).
8. Prev / next project footer.

**Per-project skin:** `accent` from JSON floods all HUD elements, links, labels,
selection color on this page. Template markup never changes per project.

---

## 6. Site Shell (Phase 1)

- `index.html` (Homepage), `about.html`, `contact.html`: styled on-brand stubs — nav,
  HUD, boot, one Clash Display statement each, "SECTION UNDER CONSTRUCTION" in-universe
  framing. Final designs briefed later.
- Shared shell on all pages: nav, HUD corners, cursor, grain/scanlines, sound engine,
  transitions.

---

## 7. Technical Architecture

### 7.1 Stack

- **Vite + TypeScript**, multi-page app: 5 HTML entries (`index`, `works`, `about`,
  `contact`, `project`).
- **PixiJS v8** for the Works world; **pixi-filters** (RGB split, glitch, CRT) +
  custom shaders (Bayer dither, displacement burst).
- **GSAP** (free core) for DOM/HUD animation.
- Vitest for unit tests.
- `npm run dev` for development; `npm run build` → static `dist/`.

### 7.2 Project Structure

```
D:\WORK\PROJECT\JOB\AI\WEBSITE_AI\SITE\
  index.html  works.html  about.html  contact.html  project.html
  src/
    styles/        design tokens (CSS custom props), base, components
    lib/           content loader + schema validation, sound engine, cursor,
                   transitions, dither, scramble, HUD
    works/         Pixi world: world, tile, layout, playback manager, input
    project/       detail page logic
    shell/         boot sequence, nav, page bootstrap
  public/
    fonts/         woff2 (converted once from the FONT folder)
    content/       ← THE OWNER'S DOMAIN (see §7.3)
  docs/superpowers/specs/
  HOW-TO-EDIT.md
```

### 7.3 Content Model (the customization contract)

Content is fetched at **runtime** — never baked into the bundle. Swapping media or
editing JSON requires no rebuild, before or after deployment.

```
public/content/
  site.json          name, nav labels, socials, tagline, contact email,
                     global palette overrides
  projects.json      ordered array of project entries
  projects/<slug>/
    poster.jpg       1280px-wide still (required)
    preview.mp4      3–5 s loop, ~640px wide, muted, h264 (required)
    hover.mp4        8–15 s montage, ~960px (optional; falls back to preview)
    film.mp4         full film (optional; or embed URL in JSON)
    stills/*.jpg     gallery images (filenames listed in JSON — static hosts
                     cannot list directories)
```

`projects.json` entry schema:

```json
{
  "slug": "neon-dream",
  "title": "Neon Dream",
  "year": 2025,
  "role": "Director / DoP",
  "runtime": "12:40",
  "tags": ["short film", "sci-fi"],
  "accent": "#C8FF00",
  "tileSize": "normal",
  "synopsis": "…",
  "credits": [{ "role": "Director", "name": "…" }],
  "film": { "type": "vimeo", "src": "https://vimeo.com/…" },
  "stills": ["01.jpg", "02.jpg"],
  "position": null
}
```

- `film.type` ∈ `vimeo | youtube | local`; `local` plays `film.mp4` from the folder.
- `position` optional `{ "col": n, "row": n }` override of auto-layout.
- `HOW-TO-EDIT.md`: every field documented in plain filmmaker language + export
  recipes (resolution/codec/bitrate per file) + how to add/remove/reorder projects.
- Optional helper: ffmpeg batch script that generates `preview.mp4` + `poster.jpg`
  from any master file.
- Phase 1 ships with 12 procedurally generated placeholder projects (synthesized
  posters/loops) so the world is demo-able before real footage drops in.

### 7.4 Error Handling (built for a human editor)

- Malformed JSON → boot screen reports `CONTENT ERROR` with file + parse position
  (in-universe styling, genuinely useful).
- Schema violations → friendly console + boot warnings naming the field and project.
- Missing media → tile degrades to poster-only (or placeholder if poster missing too);
  console lists exactly which files are missing for which slug.
- Missing/unknown `?p=` slug on detail page → styled 404-in-universe panel with a
  link back to the floor.

---

## 8. Performance Budget

- 60 fps target on a mid-range desktop; graceful on mobile.
- ≤10 live video textures desktop / ≤4 mobile; all others frozen posters.
- `devicePixelRatio` capped at 2 (1.5 on mobile).
- Texture uploads paused for non-playing tiles; world renders on demand when idle
  (no unnecessary RAF churn on static frames beyond ambient effects).
- Media weight guidance enforced by convention: preview ≤ ~2 MB, hover ≤ ~6 MB.
- Fonts subset to woff2; total font payload target < 300 KB.

---

## 9. Accessibility

- `prefers-reduced-motion` → calm mode (§3.3).
- Hidden semantic project list + real `<a>` navigation under the canvas.
- Detail pages are real DOM: headings hierarchy, alt text from JSON (`title` +
  optional per-still captions later), keyboard-focusable controls, visible focus
  style (accent outline).
- Works world keyboard support: arrow keys pan, Tab cycles projects (moving the
  world to each tile, triggering its hover state), Enter opens.
- Sound off by default; toggle reachable by keyboard.

---

## 10. Verification Plan

- **Vitest units:** content loader + schema validation (good/bad/missing fixtures),
  playback prioritizer (given viewport + tile positions → expected play set),
  auto-layout determinism, slug routing.
- **Live browser passes at every milestone (driven by Claude in a real browser):**
  boot → works → hover magnify → montage swap → click → detail → back; tier
  wake/sleep while panning; JSON edit + media swap → refresh roundtrip; mobile
  viewport (touch taps); reduced-motion mode; keyboard navigation; malformed-JSON
  error surface.
- Nothing is called done without being seen working.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Video-texture upload cost tanks fps | Hard caps + wake/sleep + posters beyond cap; budget verified in browser early (milestone 1 spike) |
| Filmmaker-supplied media too heavy | Conventions + export recipes + ffmpeg helper; graceful playback regardless |
| Shader effects overwhelm low-end GPUs | Effect intensity tiers + capability sniff (fallback: fewer filters, DPR 1) |
| JSON hand-editing breaks site | Schema validation with human-readable, in-universe error surfaces |
| Browser autoplay policies block previews | All previews muted + `playsinline`; sound gated behind interaction |
