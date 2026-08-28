# Works floor — two channels (design)

Date: 2026-08-28 · Status: approved by user (channel-switcher approach), building

## Intent

Split the works floor into two categories with identical floor design:
**CH·01 MORE HUMAN THAN HUMAN** and **CH·02 THINKING MACHINES**. One floor
on screen at a time (full viewport, current experience untouched); a
channel switcher flips between them with a datamosh static burst.

## Approach (user-selected)

Channel switcher over stacked floors / separate pages: preserves pan,
hover-play, playback budget, and the featured cluster exactly; one Pixi
world alive at a time.

## Behavior

- Switcher chrome: top-center under the nav, zoom-pinned (× --uiz) like all
  works chrome. Two buttons: `CH·01 ▸ MORE HUMAN THAN HUMAN`,
  `CH·02 ▸ THINKING MACHINES` (Clash caps; active = solid signal + ▸,
  inactive = dim bone, hover = signal + blip via global hover sound).
- Flip: click inactive channel → `sound.zap()` + full-viewport static-burst
  overlay (~360 ms scanline/noise flicker; calm mode = plain 200 ms fade) →
  destroy current world → mount `WorksWorld` with that channel's projects →
  HUD count + screen-reader list rebuild → `history.replaceState('?ch=…')`.
- Deep link: `?ch=machine` mounts CH·02 directly; anything else → CH·01.
- Keyboard pan / Enter continue to work across remounts (handler reads a
  mutable current-world ref).

## Content contract

`projects.json` gains optional `"category": "human" | "machine"` (absent →
`"human"`; parser fails loudly on other values). Placeholder split: 13/13
by flavor; featured larges redistributed **3 per channel** (neon-dream,
chrome-orchard, ghost-freight ▸ human; tender-machines, red-telemetry,
void-cartography ▸ machine; static-hymn demoted to normal) so both floors
keep a centered featured cluster. Channel display names are design
constants in `src/works/channels.ts`, not content.

## New teardown (required by remount)

- `PanController.dispose()` — remove its four host pointer listeners.
- `WorksWorld.destroy()` — release every tile's video, dispose pan, hide
  the tile label, `app.destroy(true, { children: true })`.

## Files

- `src/works/channels.ts` (pure: CHANNELS defs, channelProjects filter,
  channelFromSearch) + `tests/channels.test.ts`
- `src/lib/content.ts` (+category), `src/works/input.ts` (+dispose),
  `src/works/world.ts` (+destroy)
- `works.html` (+`#ch-switch` nav, `#ch-static` overlay),
  `src/pages/works.ts` (channel state machine)
- `src/styles/components.css` (switcher + static burst, works chrome zone)
- `public/content/projects.json` (categories + large retag), HOW-TO-EDIT.md

## Verification

tsc + vitest + build; live pane: both channels mount with correct counts
and featured clusters, flip works both ways with overlay, deep link
`?ch=machine`, keyboard pan after a flip, phone width sanity; commit.
