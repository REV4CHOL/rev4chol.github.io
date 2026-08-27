# REVACHOL — portfolio site

Cyberpunk / glitch / dither portfolio for a cinematic filmmaker. WebGL isometric
"floor" of films (PixiJS), DOM detail pages, runtime-JSON content.

## Commands

- `npm run dev` — dev server
- `npm run build` — static site into `dist/`
- `npm run preview` — serve the built site
- `npm test` / `npm run check` — vitest + typescript

## Editing content (no rebuild)

All media and text live in `public/content/` — see **HOW-TO-EDIT.md**.
`scripts/make-preview.ps1` turns a master file into poster/preview/hover.

## Structure

- `src/lib` — pure logic + services (content, dither, scramble, sound, embeds)
- `src/shell` — chrome shared by all pages (boot, nav, HUD, cursor, grain)
- `src/works` — the isometric world (layout, tiles, playback, input, world)
- `src/pages` — one entry per HTML page
- `docs/superpowers/` — design spec and implementation plan

## Deploy

`npm run build`, then drop `dist/` on Netlify/Vercel/any static host.
Post-deploy content swaps: replace files under the host's `content/` directory.
