# STORY without the tour, AUTO by default — design (2026-09-16)

The owner, after the sections reshuffle (`5c35014`): "entirely remove the TOUR part from the STORY section. The default on all platform when going into Story section is now AUTO."

## What the tour is

The tour is the scroll story: five stations (SIGNAL, SUBJECT, DOSSIER, CAP, TRANSMIT) stacked over a 640svh track, the journey rail, scroll driving the camera along the plan's route (`setProgress`), the "SCROLL ▾ FLY THE CITY" cue, and the dossier content rendered into the stations. All of that content already lives on the restored ABOUT page — the stations duplicate it over the city.

## The design

**STORY becomes the windshield alone**: the canvas, the vignette, the flight dial (now **AUTO / FREE**), the time-of-day clock, the free-flight hint, the phone stick and lift. The page opens in **AUTO on every platform** — the dial boots with AUTO lit and the ride set to auto before the first frame (no click sound on the boot set). FREE keeps everything it has: drag-look, WASD, the stick, T for time.

- `story.html` drops the track, the five stations and the journey rail.
- `src/pages/story.ts` drops the tour mode, the STOPS, the rail wiring, the scroll/waypoint machinery, the dossier render with its helpers (`loadAbout`, the portrait, the scramble status), and the boot task "LOAD OPERATOR FILE". `Mode` is `'auto' | 'free'`, module-level, `setMode('auto', boot)` at mount.
- **The glide home** (STORY is the line's end, so only back to CONTACT): the page no longer scrolls, so the boundary check goes; the glide arms **only in AUTO** — in FREE the thumb owns the stick and the look. The old `a3-solo` gate dies with the class.
- `src/styles/story.css` sheds the station layer: every rule for the stations, the track, the rail, the cue, the in-station content (`.a-*`) and the `a3-solo` state. The body takes the former solo defaults outright: no scroll, no browser touch gestures, no text selection. The kept chrome — canvas, vignette, dial, clock, hint, pad, lift, calm and responsive rules for those — stays as it is.
- The renderer (`city3d.ts`) is untouched: its tour machinery stays reachable through the debug API; the page simply never enters it. Booting in auto from the route's opening pose is exactly what pressing AUTO did before.

## What does not change

The city and every `src/about/*` module; the clock and its `?tod=`; calm; the poster-lock exemption; the grain hole; the music; ABOUT and the archive; the nav.

## Tests

sections: `story.html` has no stations, no track, no rail, and keeps the dial; `story.ts` knows no `'tour'`, its modes are `['auto', 'free']`, and it still mounts the city.

## Verification in the pane

STORY boots with AUTO lit and no stations in the DOM; the pose drifts over ticks (the auto flight is flying); FREE lights on click and shows the hint, AUTO returns; the phone preset boots to AUTO and FREE raises the stick and lift. ABOUT and the archive untouched. Screenshots desktop and phone.

## As built (2026-09-16)

- As specced. story.html fell from 91 lines to 27 (the canvas, the vignette, the dial, the clock, the hint); story.ts from 384 to 170 (the dossier render, the portrait, the rail and the scroll machinery left with the tour); story.css from 507 to 100 — 142 station rules and all eight orphaned keyframes dropped by a block-parsing prune, the header rewritten for the windshield, the solo-state body rules made the page defaults.
- The pane, desktop: boots with AUTO lit and mode auto, dial reads AUTO · FREE, zero station/rail nodes, nothing scrollable, the hint hidden; the drift is real — 4.4 units over 90 ticks with no input. FREE lights the hint and takes the stick; AUTO takes it back.
- The pane, phone preset (375 × 812): boots AUTO the same; FREE raises the stick and the lift buttons (a3-touch-free), AUTO lowers them.
- Gates: tsc clean, 265 passed / 3 skipped, the build emits all seven pages.
- The glide home now arms only in AUTO (module-level mode; the old a3-solo gate died with the class); in FREE the thumb owns the stick, as before.
