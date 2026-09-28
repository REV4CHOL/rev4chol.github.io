# Adaptive quality, plain words, ENTER — design (2026-09-28)

The owner, after the testers' second round:

1. "Website instruction still unclear as fuck. Imagine a not so tech-savvy person read it, of course they cant."
2. "On weaker PCs and Laptops and phones, the website is downright unplayable and laggy. Develop a system where the
   website automatically adapts to any computer strength, or find other suitable solutions. Not everyone has strong
   machines bro."
3. "“ENTER MY WORK” change to “ENTER” only."

## 1. What was found

### 1.1 The words

Every instruction on the site is written in the house grammar — `VERB ▸ OBJECT`, three-letter abbreviations, the
site's own nouns ("the floor", "roam", "tuning", "freq"). The last round put the instructions on screen; this round
found they are on screen and still unreadable to anyone outside the house:

| Where | Today | A stranger reads |
|---|---|---|
| WORK legend | `DRAG ▸ ROAM ▪ SCROLL ▸ ZOOM ▪ HOVER ▸ PREVIEW ▪ CLICK ▸ OPEN` | code |
| WORK, phone | `DRAG ▸ ROAM ▪ PINCH ▸ ZOOM ▪ TAP ▸ SELECT ▪ TAP AGAIN ▸ OPEN` | code |
| WORK caption | `2025 · COLORIST · 1:36 ▪ CLICK ▸ OPEN` | "click open?" |
| WORK cursor over a pane | `ENTER ▸` | enter what? |
| WORK chapter tabs, cursor | `SWITCH ▸` | switch what? |
| STORY, opening | `AUTO ▸ THE CITY DRIVES ▪ FREE ▸ YOU FLY` | a riddle |
| STORY, free flight | `DRAG ▸ LOOK ▪ WASD ▸ MOVE ▪ E/Q ▸ RISE/SINK ▪ SHIFT ▸ BOOST ▪ T ▸ TIME` | a keyboard map |
| Dossier, end | `◂ BACK TO THE FLOOR` / `NEXT ▸ TITLE` | which floor? |
| Dossier, lost | `BACK TO THE FLOOR ▸` | which floor? |
| Dossier, pending film | tooltip `TRANSMISSION PENDING` | ? |
| Dossier, placeholder | `PLACEHOLDER PANE ▪ NO FILM HERE YET` | "pane"? |
| Homepage, scroll cue | `SCROLL ▾` over `WORK` | fine, terse |
| Swipe card | `TUNING ▸ NEXT` / `TUNING ▸ BACK` | tuning? |
| CONTACT | `COPY FREQ` | frequency? |
| HUD, every page | `SFX ● MUS ● MTN ●` | MTN? |
| Legend type | 10 px Martian Mono at 55 % bone | too small to bother |

Two things are wrong at once: the grammar (an arrow between a verb and a noun is not a sentence), and the size (the
one line that explains the floor is the smallest type on the page).

### 1.2 The lag

Measured in real Chrome (Chrome 141, headless, DevTools pipe) against the LIVE site on the owner's PC, with the
machine emulated four ways. Each page: boot, settle 1.5 s, then 8 s of frame intervals. `long` is the share of
frames over 1.6× the display's interval.

| Machine | Homepage | WORK | STORY | Dossier / About / Contact |
|---|---|---|---|---|
| This PC, 1366×768, DPR 1 | 55 fps | 59 fps, 10 loops | 46 fps (ultra) | 60 fps |
| CPU at a quarter (a weak laptop's CPU) | 60 fps | 60 fps, 10 loops | **24 fps** (high, scale 0.64) | 60 fps |
| CPU at a sixth + software GPU (a weak GPU's proxy) | **22 fps** | **6.4 fps**, 10 loops | not run — the city's build stalls the software renderer for minutes | 60 fps |
| Phone 375×812, DPR 3, CPU at a quarter (this PC's GPU) | 60 fps, canvas 563×1218 at 1.5× | 60 fps, 4 loops | **46 fps, 29 % long** (mid, scale 0.75) | 60 fps |

Reading:

- The homepage and the floor are **GPU-bound**. A quarter of the CPU costs them nothing; a weak GPU takes the
  homepage to 22 fps and the floor to 6 fps. Their cost is in full-screen passes: the hero's three filters
  (RGB split, displacement, glitch) over a canvas at up to 2× DPR; the floor's canvas at 2× with ten loops
  uploading and a colour-matrix filter over the whole carpet on hover; plus, on every page, the grain layer — a
  full-viewport `mix-blend-mode: overlay` div whose background changes eleven times a second — and the scanline
  layer over it.
- The STORY city is **CPU-bound**: 3,800 people, 2,000 vehicles and 150 runners are simulated every frame on any
  desktop; its governor only trims the render (scale, then tier). At a quarter of the CPU it sits at 24 fps.
- Nothing adapts except the city. `env.ts` knows two devices (phone or not): a phone gets 4 loops and DPR ≤ 1.5, a
  desktop 10 loops and DPR ≤ 2, whatever the machine. Pixi renders every display refresh — 144 full-scene frames a
  second on a 144 Hz laptop with an integrated GPU.
- A machine has no way to say "less": the only switch is MTN (calm), which stills everything, reel included.

The A/B of the levers (same emulation, one page reloaded per experiment) is in §4.

## 2. The design

### 2.1 Plain words (item 1)

Rule: **an instruction is a sentence a stranger can follow, in the house type.** Mono caps and the `▪` separator
stay; the `VERB ▸ NOUN` grammar goes from instructions. `▸`/`◂` stay on buttons and links as arrows (WATCH ▸,
NEXT ▸, ◂ BACK), where an arrow reads as an arrow.

| Where | Reads now |
|---|---|
| WORK legend, mouse | `DRAG TO MOVE AROUND ▪ SCROLL TO ZOOM ▪ HOVER A FILM TO PREVIEW IT ▪ CLICK IT TO OPEN` |
| WORK legend, touch | `DRAG TO MOVE AROUND ▪ PINCH TO ZOOM ▪ TAP A FILM TO PREVIEW IT ▪ TAP IT AGAIN TO OPEN` |
| WORK caption | `2025 · COLORIST · 1:36 ▪ CLICK TO OPEN` / `… ▪ TAP AGAIN TO OPEN`; a placeholder's starts `PLACEHOLDER · NO FILM YET ▪` |
| WORK cursor over a pane | `OPEN ▸` |
| WORK chapter tabs, cursor | `SWITCH CHAPTER ▸` |
| STORY, opening (AUTO) | `AUTOPILOT IS ON ▪ PRESS FREE TO FLY THE CITY YOURSELF` |
| STORY, free, keyboard | `DRAG TO LOOK AROUND ▪ W A S D TO MOVE ▪ E / Q TO RISE / SINK ▪ SHIFT TO GO FASTER ▪ T TO CHANGE THE TIME OF DAY` |
| STORY, free, touch | `DRAG TO LOOK AROUND ▪ STICK TO MOVE ▪ ▲ ▼ TO RISE / SINK` |
| Dossier, end | `◂ BACK TO ALL FILMS` / `NEXT FILM ▸ TITLE`; cursors `BACK ◂` / `NEXT ▸` |
| Dossier, lost | `BACK TO ALL FILMS ▸` |
| Dossier, pending film | tooltip `FILM LINK COMING SOON` |
| Dossier, placeholder | `PLACEHOLDER ▪ NO FILM HERE YET` |
| Homepage, scroll cue | `SCROLL DOWN ▾` over `WORK` |
| Swipe card | `NEXT PAGE ▸` / `◂ PREVIOUS PAGE` |
| CONTACT | `COPY EMAIL` (then `COPIED ▸`) |
| HUD | `SFX ● MUSIC ● MOTION ●` |
| Legend type (WORK, STORY) | 12 px, 70 % bone; the fresh legend stays signal-lit until the first pane opens |

"The floor" survives inside the house (code, docs); on screen the visitor reads "all films", which is also what the
nav's WORK leads to. Boot lines (`LOAD SITE MANIFEST … OK`, `CLICK TO SKIP`), the status decor (`PROCEDURE ::
… // ONLINE`, `UPLINK :: CHANNEL OPEN`) and the About page's `TRANSMIT? YES ▸ INITIATE CONTACT` are voice, not
instruction, and stay.

### 2.2 The door (item 3)

`ENTER MY WORK ▸` → `ENTER ▸`. The arrow is the house's button arrow, as on WATCH ▸; "only" is read as dropping the
words, not the arrow (flagged for the owner).

### 2.3 Adaptive quality (item 2)

**One governor for the site** — `src/lib/quality.ts` — and every surface reads its tier. Three tiers:

| | FULL (2) | BALANCED (1) | LITE (0) |
|---|---|---|---|
| Pixi canvas resolution | min(DPR, 2); phone min(DPR, 1.5) | min(DPR, 1.5); phone 1 | 1 |
| Pixi ticker | the display's rate | ≤ 60 fps | ≤ 30 fps |
| Floor: live loops | 10; phone 4 | 6; phone 3 | 3; phone 2 |
| Floor: hover | desaturate the carpet + the pane's blurred glow | same | dim the carpet by alpha only; no glow |
| Floor: chapter flip | misregistration, speed lines, camera kicks | same | the panes slide, nothing else |
| Homepage hero | RGB split + displacement + glitch | RGB split + glitch | glitch during bursts only |
| Grain + scanline layers | grain re-dealt every 90 ms | every 180 ms | both hidden (the A/B: two full-viewport layers a frame) |
| Floor: the featured panes' resting glow (a blurred sprite each) | on | on | none — the build's find: these six blur passes, not the loops, were the floor's cost on a weak GPU |
| Decor animations (sweep, ghost-clip, flicks, slices, echoes, ring spin, ticker, VHS) | on | on | off (`html.rvl-lite`) |
| STORY city | opens high | opens mid | opens low, with a phone's crowd counts |
| The reel, the loops, the cursor, hover captions, the wipe | on | on | on |

LITE still moves: the reel plays, the loops play, panes lift on hover, chapters flip. It is the site with the
expensive garnish removed, not calm mode.

**The opening tier** (`startTier(device)`, pure):

- FULL by default on a desktop.
- BALANCED at most on a coarse pointer, on fewer than 4 cores or less than 4 GB, or on a
  GPU whose renderer string names an integrated Intel part (`Intel … (HD|UHD|Iris) Graphics`).
- LITE on `saveData`, `2g`/`slow-2g`, or a software renderer (`SwiftShader`, `llvmpipe`, `Software`).
- The address may pin it: `?gfx=lite|balanced|full` (the owner's and the testers' switch; pinned for the session).

**The governor** (`judge` + `steer`, pure, tested) runs on every page but STORY (the city keeps its own). A
`requestAnimationFrame` sampler collects frame intervals; every 60 frames it judges the window:

- `refresh` = the window's 10th-percentile interval, capped at 16.7 ms (a 120 Hz display running at 60 is fine; a
  60 Hz display running at 30 is not "a 30 Hz display").
- SLOW when the mean interval is over 1.4× `refresh` or more than a quarter of the frames are long (> 1.6×
  `refresh`). FAST when the mean is under 1.1× `refresh` and fewer than one frame in twenty is long.
- The first 2.5 s hold (boot residue). Frames over 250 ms are dropped (tab switches, the boot screen).
- SLOW → one tier down, 3 s cooldown, and the tier left becomes the ceiling. A ceiling reopens one step 60 s after
  the step down that closed it — unless that tier has been left twice this session, which closes it for good.
  (The city's governor closes on the first step; the site's gives a transient hiccup — an install, another tab —
  one way back.)
- FAST for 12 s since the last step down → one tier up, to the ceiling.
- Every change is applied live: the surfaces subscribe (`quality.on`). No reload.

**Memory across pages.** The site is separate documents, so a verdict must travel: `sessionStorage rvl-gfx-session`
carries `{ tier, ceiling, downs }` (the session's state, restored on the next page); `localStorage rvl-gfx` carries
`{ tier, at }` for 24 h as the opening tier of a new visit (ceiling FULL — it may climb). The class
`html.rvl-lite` / `rvl-balanced` / `rvl-full` is stamped as the shell mounts.

**Diagnostics.** `window.rvlQuality = { tier, label, set(t), state() }`; nothing in the HUD changes.

### 2.4 Where the knobs land

- `env.ts`: `dprCap()` and `liveVideoCap()` read the tier (both already gate on the pointer).
- `shell.ts`: `quality.start()` before the atmosphere mounts, so the grain reads the tier.
- `grain.ts`: interval by tier; hidden at LITE; re-tunes on change.
- `hero.ts`: `applyFilters(tier)` on the root; at LITE the glitch filter is enabled only while a burst runs. The
  renderer's resolution and the ticker's `maxFPS` follow the tier.
- `world.ts`: resolution and `maxFPS`; `hover()` skips the desaturation filter at LITE (the alpha dim stays);
  `exit()`/`arrive()` skip the misregistration rig, the streaks and the camera kicks at LITE; the playback cap is
  read on every update.
- `tile.ts`: no glow at LITE (a featured pane's resting glow included).
- `playback.ts`: `cap` and `maxElements` become getters over `liveVideoCap()`.
- `city3d.ts`: the opening tier is the lesser of its own rule and the site's (LITE → low, BALANCED → mid); at LITE
  the crowd, traffic and runner counts are the phone's.
- CSS: `.rvl-lite` rules beside the `.rvl-calm` ones — `#grain` hidden; the sweep, ghost-clip, flick, ch-slices,
  a-echo, a-sweep, a-cal-sweep, name pulse, reticle spin, p-vhs, p-sweep, p-ring-spin, the ticker and the
  glide-panel flick stand still. The carets keep blinking.

## 3. Tests

- `tests/quality.test.ts`: `startTier` (desktop full; phone, small device, Intel GPU → balanced; a 3g estimate moves nothing — Chrome read "3g" on this PC against the live site and opened it BALANCED (found in the live check, fixed after 9566369); saveData, 2g,
  SwiftShader → lite; the URL pin); `judge` (a clean 60 Hz window is fast; every other frame doubled is slow; a
  120 Hz display at 60 is fast; a steady 30 fps is slow); `steer` (hold, down, cooldown, ceiling, reopen after 60 s,
  closed after two downs, up after 12 s to the ceiling); `restoreState`/`saveState` round trips through fake
  storages, a throwing storage is ignored, a stale 24 h record is ignored; the knob tables (`videoCapFor`,
  `resolutionFor`, `maxFpsFor`); source pins (shell starts it; grain, hero, world, tile, city read it; the CSS has
  the `.rvl-lite` block; `dprCap`/`liveVideoCap` read the tier).
- `tests/legend.test.ts`: the new legend and caption strings.
- `tests/wayfinding.test.ts`: the door reads `ENTER ▸`; the pins move to the new strings (`OPEN ▸`, `SWITCH CHAPTER
  ▸`, `◂ BACK TO ALL FILMS`, `NEXT FILM ▸`, the STORY lines, `COPY EMAIL`, `SFX`/`MUSIC`/`MOTION`, the legend's
  12 px); no instruction line in `src/` or the pages carries the old `VERB ▸ NOUN` pairs.

## 4. Verification

- The A/B (§1.2's machine, one lever per reload) ranks the levers; the tier table above is confirmed or amended by
  it before the build.
- After the build, the same four machines: LITE must hold the homepage and the floor near the display's rate on the
  software GPU, and BALANCED must open on the throttled phone; the governor must step down within ~10 s on the
  software GPU and never move on this PC.
- Dev and live in real Chrome: `?gfx=lite` shows the stripped floor and hero (no grain, plain flip, 3 loops), the
  legend reads the new lines at 12 px, the door reads ENTER ▸, the dossier's links read the new words; the
  governor's state survives a page change (sessionStorage).
- Gates: `tsc --noEmit`, `vitest run`, `vite build`; live checks after the deploy.

### 4.1 The A/B of the levers (live site, before the build)

Software GPU + CPU at a sixth, 1366×768 at DPR 1, one lever per reload, 6 s each (`scratchpad/perf/knobs.mjs`).

| Homepage | fps | Works floor | fps |
|---|---|---|---|
| baseline | 20.7 | baseline, 10 loops | 6.5 |
| grain hidden | 22.5 | 3 loops | 6.6 |
| grain + scanlines hidden | 23.5 | 0 loops | 8.1 |
| hero: no filters | **36.1** | grain hidden | 7.3 |
| hero: RGB split only | 33.3 | Pixi ticker 30 | 6.7 |
| hero: RGB split + glitch (no displacement) | 25.0 | hover a pane (desaturation + glow) | 6.1 |
| CSS animations paused | 25.7 | hover, desaturation off | 6.4 |
| Pixi ticker 30 | 24.0 | LITE: 3 loops + grain hidden | 7.8 |
| LITE: no filters + grain hidden + animations paused | 35.2 | LITE + ticker 30 | 7.2 |
| LITE + ticker 30 | **53.0** (11 % long) | | |

Reading: the hero's three full-screen passes are the homepage's cost (the displacement the largest); the grain, the
scanlines and the idle CSS animations add a few frames each; the ticker cap pays only once the passes are gone. On
the floor none of the levers reachable from outside moved the needle — the cost was found in the build: the six
featured panes' resting glows, each a blurred sprite carrying a blur filter, redrawn every frame. LITE creates none.

### 4.2 After the build (dev, 2026-09-28, `scratchpad/perf/weak.mjs`, 6 s per page)

| Machine | Opens | Homepage | Works | Story | Dossier / About / Contact |
|---|---|---|---|---|---|
| This PC | FULL | 60 fps | 60 fps, 10 loops | 60 fps (high) | 60 fps |
| CPU at a quarter | FULL | 60 fps | 60 fps, 10 loops | 31.5 fps (high, scale 0.64 — the city's own governor) | 60 fps |
| CPU at a sixth + software GPU | **LITE** (by device) | **58 fps** (was 20.7) | **60 fps**, 3 loops (was 6.5) | not run | 60 fps |
| Phone 375×812, DPR 3, CPU at a quarter | **BALANCED** (by device) | 60 fps, canvas 375×812 at 1× | 60 fps, 3 loops | 57.8 fps (mid; was 46 with 29 % long) | 60 fps |

The state travelled through all six pages of each session (the session record). No machine that should stay FULL
moved.

**The governor watched** (`scratchpad/perf/govern.mjs`: the session record seeded FULL on the software GPU, so the
sampler had to find its own way): FULL at 2 s (9 fps, three filters) → BALANCED at 6 s (30 fps, two filters, ticker
60) → LITE at 10 s (grain off, no pass between bursts, ticker 30) → 56–60 fps, the glitch pass lighting only for
the bursts. At ~70 s the ceiling reopened, the governor climbed to BALANCED, measured 31 fps, stepped back to LITE —
BALANCED left twice, closed for the session.

**The words in real Chrome** (`scratchpad/ux/verify-words.mjs`, DPR 2, 45 checks): every string of §2.1 on its
page; the legend at 12 px; `OPEN ▸` over a pane, `SWITCH CHAPTER ▸` over a tab; `?gfx=lite` → `html.rvl-lite`, grain
and scanlines hidden, resolution 1, ticker 30, 3 loops, no glows, no desaturation on hover (the dim stays), a plain
flip (no rig, no streaks); the pin carried to ABOUT (sweep and echoes still); the homepage at LITE with no filter pass
between bursts, the drifts still, the reel playing; `?gfx=full` → 10 loops, grain back. Screenshots of the floor and
the homepage at both tiers and of the legend in `scratchpad/ux/shots/`.

### 4.3 Found on live after the deploy: the reel's black loops

The owner, minutes after 9566369: "homepage right now have blackout loops, cant see the videos". Not the tiers — the
previous production build rendered the same black in the same Chrome, and on a black page the chain could be rebuilt
any way without effect. The cause (Pixi 8.20): a video texture is allocated and filled in one `texImage2D(video)`; a
video with metadata but no decoded frame fails that call, nothing is allocated, and every later frame lands on nothing
(`glCopySubTextureCHROMIUM: The destination level … must be defined`, 256 times in six seconds) — the clip is black
for the visit. The reel's clips resolve at `loadedmetadata` and the opening clip was drawn at once; every cut rewinds
the incoming clip (a seek empties the frame) and showed it in that moment. Which clips went black was timing, so it
came and went between builds and machines (the works panes never had it: they gate on a presented frame). Fixed at
the site's one video-texture entry (`lib/video-texture.ts`: Pixi's video uploader guarded — a 1×1 placeholder until
the video holds a frame, the recorded size left stale so the first frame re-allocates; an allocated texture mid-seek
is left alone) and in the reel (`onFrame`: the opening clip and every cut wait for a presented frame). A full rotation
of the seven clips on dev: zero black samples, zero upload errors.
