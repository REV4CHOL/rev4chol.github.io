# WORK on weak machines: the wall as one video, an honest device ladder — design (2026-11-24)

Part 1 of the performance round. HOMEPAGE, STORY and the film pages follow in their own specs (§3).

## 1. What was asked

The owner, 2026-11-24, in two messages (1 and 2, then 3 and 4):

1. "Right now the web is hoarding too much RAM. In this PC its fine. But I have tried running this website on older
   laptops, specifically window, and the performance just completely decimated. Fix"
2. "I really want all types of phone and all types of PC, laptops and etc. will be able to run this website smoothly."
3. "Work section: is it possible for all videos in all panes to play at once?"
4. "I just dont like my experience when booting those old laptops into the Work section, and found out that too many
   panes ain't playing at once, to the point where almost all panes seems freezed"

Their answers to the questionnaires, the same day:

| Question | Answer |
|---|---|
| What goes wrong on the old laptops | Choppy, slow motion. Long or stuck loading. Freezes or crashes. Task Manager showed high RAM. |
| Which pages are worst | HOMEPAGE, WORK, STORY |
| The laptop | Windows, 4 GB or less, Chrome |
| How many panes moved on the laptop's WORK page | "Can't check now" |
| Can the laptop play one 1080p video smoothly | "Haven't tried" |
| How the wall should play every pane on weak machines | "One combined video" |
| STORY on a weak machine | "Lighter live city" (its own spec) |
| The four visible changes to the loops (§4.2) | "Accept all four" |
| The WORK plan (§4.1) | "Yes, go on" |
| Order | "WORK first, then laptop test" |

One correction was made to the owner the same day. The option they picked read "weak laptops and phones". A phone's
WORK is the rolling strip (`src/works/reel.ts`), where each pane plays its own loop. The combined video is for the
floor: laptops, desktops and tablets.

## 2. What was measured

### 2.1 How

- A hidden Chrome on the development PC, driven over the DevTools protocol: no window, muted, a throwaway profile, a
  fresh browser for every page so nothing carries over.
- A script injected before the page's own counts every video, canvas and image, every WebGL texture, renderbuffer and
  buffer in bytes asked for, the frame intervals and the long tasks.
- Windows' own counters give each browser process's private memory, its GPU memory (dedicated plus shared) and its
  processor time.
- Two readings a page: at rest 15 s after boot, then after use (the wall hovered and dragged, a page scrolled).
- "The laptop profile" is the development PC answering as a weak laptop: 1366×768, 4 GB, 4 threads, an Intel HD 4000
  renderer name, the page's main thread slowed six times. It does not slow video decoding or the GPU, and it cannot
  run short of memory. Processor figures from these slowed runs are left out: the slowing itself keeps a core busy.
- Memory is in MB. "All" is the private memory of every browser process together.

### 2.2 The live site, page by page (measured on the development PC, the laptop profile)

| Page | All, rest → used | GPU process | GPU memory | What it holds |
|---|---|---|---|---|
| An empty page | 334 → 336 | 111 → 114 | 50 | nothing |
| WORK, CH·01 | 1,178 → 1,244 | 852 → 920 | 664 → 727 | 11 loops playing; 81 → 122 MB of Pixi textures |
| HOMEPAGE | 1,053 → 1,072 | 732 → 778 | 450 → 496 | 7 videos loaded, 1 playing |
| THE LIST, opened directly | 965 → 995 | 624 → 654 | 474 → 472 | 11 loops playing under the list |
| A film page (54 stills) | 745 → 850 | 448 → 620 | 160 → 280 | 5 → 55 images loaded |
| STORY | 1,204 → 1,146 | 603 → 575 | 221 → 220 | 16 → 28 fps; one freeze of 8.0 s while it builds |

- WORK pinned at BALANCED (`?gfx=balanced`) reads the same as WORK at FULL: 1,189 → 1,266 all, 655 → 724 GPU memory,
  11 loops. Both tiers play a whole chapter since 2026-11-08.
- The floor's largest Pixi textures are render targets of 2048×1024, 8 MB each: the size a filter pass allocates. The
  count of textures grows from 64 to 107 after hovering and dragging.
- THE LIST pinned at BALANCED holds no video at all: 696 all, 153 to 182 GPU memory, 1.6 MB downloaded. Unpinned, 11
  loops play under it and it downloads 17.6 MB. The difference is the tier's change (§2.3): the change's handler runs
  the playback pass with no check that the floor is paused (`src/works/world.ts`, the `quality.on` callback), and the
  pass wakes every pane.

### 2.3 The opening level climbs (measured)

- The laptop profile opens at BALANCED on every page, read 2 s after boot. `startTier` caps it for the integrated GPU's
  name. Its 4 GB and 4 threads do not cap it: the rule is "less than 4".
- 15 s after boot WORK, HOMEPAGE, THE LIST and the film page read FULL. The governor steps up after 12 s of fast
  frames, and a new visit's ceiling is FULL (`restoreState` returns `ceiling: 2`). STORY keeps its own governor and
  stayed at BALANCED.
- The sampler drops every frame longer than 250 ms (`if (document.hidden || dt > 250) return;`). A machine drawing
  fewer than four frames a second never fills a window of 60 frames, so the governor never judges it.
- Nothing in the governor reads the device's memory after the opening guess.

### 2.4 Twelve loops, twelve small copies, one video (measured on the development PC, no slowing)

Three test pages draw the same twelve CH·01 films on one WebGL canvas at 1366×768, each video uploaded as a texture on
every new frame, as the floor does.

| | 12 loops as shipped | 12 copies 480 px wide | One video, 8 s test clip |
|---|---|---|---|
| Decoders | 12 | 12 | 1 |
| Picture decoded each second | 202 million px | 37 million | 37 million |
| All, above the empty page | +494 | +297 | +224 |
| GPU memory, above the empty page | +407 | +98 | +78 |
| Processor cores busy, decoding on the processor | 1.10 | 0.27 | 0.17 |
| Frames dropped at the start, decoding on the processor | 26 | 38 | 3 |
| Files | 18.6 MB | 3.4 MB | 3.8 MB |

- Every video presented 24 frames a second in all three. The development PC is too strong to show a weak laptop's
  stutter, so the cost ratios are what carry over.
- With the graphics card decoding, the processor figures are small and noisy (0.08 to 0.30 cores); the memory figures
  above are from those runs.
- The small copies cost the page's own process the same processor time in both runs (0.14 and 0.13 cores). That reads
  as Chrome decoding small videos on the processor either way; it was not checked further.

### 2.5 The real CH·01 wall video (measured on the development PC)

All twelve loops, each in its own ratio, tiled into one frame: 1920×1080, 24 frames a second, 21.46 s (515 frames).

| | 12 loops as shipped | The wall video | Its half-size copy (960×540) |
|---|---|---|---|
| Picture decoded each second | 202 million px | 49.8 million | 12.4 million |
| Against one full-HD video at 30 fps (arithmetic) | 3.3 × | 0.8 × | 0.2 × |
| All, above the empty page | +494 | +212 | +204 |
| GPU memory, above the empty page | +407 | +85 | +62 |
| Processor cores busy, decoding on the processor | 1.10 | 0.17 | 0.05 |
| File | 18.6 MB | 13.4 MB at CRF 23 | 4.5 MB |

A second encode of the same video at CRF 27 came to about 8.2 MB.

### 2.6 What the numbers do and do not say

- The wall video costs about a sixth of the twelve loops' processor work, and about 280 MB less memory and 320 MB
  less GPU memory. On a laptop with built-in graphics, GPU memory is taken from the same RAM.
- Not verified on the old laptop: which of two things the owner saw. Either the site had dropped to LITE, where 3
  panes play and the rest are posters by design; or the laptop could not decode twelve videos at once and the panes
  stayed on their posters. The design fixes both (§4.1, §4.6), and the readout (§4.8) tells them apart.
- Not verified on the old laptop: whether its Chrome decodes a 1920×1080 H.264 video on the graphics chip. The
  half-size copy and the dropped-frame watch (§4.5) are there for a laptop that cannot.

## 3. Scope

Part 1 is four things:

1. The device ladder: how a machine is placed, and that a weak one stays where it was put.
2. The WORK floor plays one combined video below FULL, so every pane moves.
3. Waste removed from the WORK floor on every tier.
4. A readout the owner can open on the old laptop.

Not in this part:

- HOMEPAGE, STORY and the film pages. Each gets its own spec after the owner's laptop test, as they chose. The
  measurements in §2.2 are their baseline.
- A phone's WORK. The reel is untouched here; its panes are being redesigned under a separate request.
- The STORY city's own governor (`src/about/city-governor.ts`), which has its own "less than 4" rule.

## 4. The design

### 4.1 What plays where

The floor is in one of five modes. The mode is chosen when the floor is built (the page's load, a chapter flip, the
return from THE LIST), when the tier steps down, and when the wall's own watch says so (§4.5). A step up changes no
video until the floor is next built, so a machine never downloads the wall video and then the twelve loops in one
view.

| Mode | When | What the panes show | Videos decoding |
|---|---|---|---|
| `own` | FULL | Each pane its own loop, as today | Up to 12 |
| `wall` | BALANCED | Every pane its tile of the wall video | 1, plus the pointed pane's loop |
| `wall-small` | LITE, or a wall video that cannot hold its frame rate | Every pane its tile of the half-size copy | 1, plus the pointed pane's loop |
| `posters` | Below FULL with no wall: the file is missing or failed, or the visitor has Save-Data or a 2g line | Posters; the panes nearest the middle play their own loops | Up to 3 (a tablet or a narrow window: 3 at BALANCED, 2 at LITE) |
| `starved` | The half-size copy cannot hold 12 frames a second | Posters; only the pointed pane plays | 1 |

- The pointed pane (hover, or a tap on a touch screen) always plays its own full loop, as today. Lifted, it stands up
  to 84% of the screen's height, where a tile would look coarse.
- In the wall modes a pane with no valid tile (§4.4) plays its own loop, nearest the middle first. The pointed pane
  and these panes share the cap on own loops (3 on a desktop).
- `videoCapFor` becomes the cap on own loops: 12 · 3 · 3 on a desktop (FULL · BALANCED · LITE). A tablet and a window
  under 820 px keep 4 · 3 · 2.
- Save-Data and a 2g line already open at LITE (`startTier`). They never start a wall video by themselves: the
  visitor asked for less data, or nothing streams. They get `posters`, which is exactly today's LITE.
- The owner's 2026-11-08 rule, "almost all panes to load at once", now holds on every tier that has a wall.

### 4.2 The wall video

One file per chapter, and a half-size copy of it.

- **Tiles.** Every film of the chapter has one tile, in the film's own ratio. All tiles of a chapter share one scale.
  The tall 9:16 pane's tile is two rows high, as its pane is on the floor.
- **Packing.** Rows of one height fill a frame no larger than 1920×1080. The script takes the largest scale at which
  every tile and its gutter fits. CH·01's twelve tiles make four rows, each tile about 262 px high. CH·02's five
  tiles come out larger; the script prints the scale.
- **Gutters.** Each tile is surrounded by 4 px of its own edge pixels, and a pane samples its tile half a pixel
  inside the picture. Neither a neighbour's picture nor the compression at a tile's edge can show in a pane.
- **Codec.** H.264 High, level 4.0, 4:2:0, 24 frames a second, CRF 23, a key frame every 2 s, no audio, `+faststart`.
  1920×1080 at level 4.0 is what the video chips of old laptops decode.
- **The half-size copy** is the same frame at 960×540, encoded from the same tiles, so one map serves both.

One video has one length and one frame rate. The loops have twelve lengths (4.3 to 14.9 s) and four frame rates. So:

1. **Every pane restarts together.** Each loop starts at its first frame and repeats at its true speed until the
   video ends; then all of them start again. The script picks the length, between the longest loop and 30 s, whose
   shortest last pass is the longest (the shorter length on a tie), and warns if that pass is under 2 s. For today's
   loops that is 21.46 s in CH·01 (shortest last pass 2.8 s) and 16.88 s in CH·02 (3.5 s) (arithmetic from the loops'
   lengths).
2. **The two 25 fps loops run 4% slower** (FAR EAST, AN HOI): every frame is kept and shown at 24 a second.
3. **The three 29.97 fps loops lose every fifth frame** (LIEN QUAN, PHILIA, GALAXY Z FOLD 8 ULTRA).
4. **Resting panes are softer.** At the floor's opening zoom a 16:9 pane's edges are 716 × 403 px on the screen
   (arithmetic from the floor's constants), and its CH·01 tile is 466 × 262. The tile is drawn about 1.5 times its
   size; the half-size copy about 3 times. Today's loops are 960 to 1280 px wide.

The owner accepted all four on 2026-11-24 from a preview of the CH·01 video. The preview showed the tiles at their
own size, not enlarged on a pane, so the softness is design call 1 (§8).

### 4.3 Building it

- `npm run walls` runs `scripts/make-walls.mjs` on the owner's PC with their ffmpeg. It reads `projects.json` and each
  film's loop (the first file the loop rules pick, `src/lib/loop-files.ts`), and writes, for each chapter:
  - `public/content/walls/<chapter>.mp4`;
  - `public/content/walls/<chapter>-s.mp4`;
  - `public/content/walls/<chapter>.json`, the map.
  The chapter is the `category`: `human`, `machine`.
- The outputs are committed. The deploy workflow has no ffmpeg and never builds them.
- The folder stands beside `projects/`, so no wall file is ever taken for a film's loop.
- The script's arithmetic is pure and lives in `src/lib/wall-files.ts`: the packing, the shared length, the
  fingerprints, the manifest entry. The script, the manifest plugin and the tests import the same module. The script
  is plain JavaScript and imports that module directly, which Node does from 22.18.
- When to run it: after a loop file is added or replaced, and after a film joins or leaves a chapter. Reordering
  panes needs nothing: the map is keyed by slug.
- `HOW-TO-EDIT.md` gains the command in the same commit, with one line on when to run it.

### 4.4 The map, and a wall that has gone stale

The map, `walls/<chapter>.json`:

- the frame's size, the frame rate, the frame count and the length;
- the two file names;
- for each slug: the tile's rectangle in the full-size frame, and its loop's fingerprint (file name, byte length,
  SHA-256).

A wall is stale when a loop changed after the wall was built. Three layers keep an old picture off a pane:

1. **At build time.** The media manifest plugin (`vite.config.ts`) already lists every loop for the site. It gains a
   `walls` entry per chapter, listing only the tiles whose fingerprint matches the loop file on disk and whose film is
   still in that chapter. A chapter whose video files are missing gets no entry. The dev server answers the same way,
   so a replaced loop shows on its own pane at the next refresh.
2. **At run time.** The floor reads walls only from the manifest and never probes for a file. A pane with no tile
   listed plays its own loop (§4.1). A chapter with no entry is in `posters`.
3. **In the tests.** A content test, with no ffmpeg, fails when any film on a chapter has no valid tile, and its
   message says to run `npm run walls`.

So a forgotten rebuild costs one pane its tile until the next rebuild. It never shows the old loop.

### 4.5 On the floor

One new unit, `src/works/wall.ts`, owns the wall video. The world creates it; a pane only receives a texture.

- **One video.** A muted, looping `<video>`, `preload="auto"`, playing the full-size or the half-size file.
- **One source.** Its texture is made by `videoTexture()` (`src/lib/video-texture.ts`), so both laws hold: uploads
  only on a new frame, and the page owns play and pause.
- **A frame gate of its own.** Tiles appear only after the video has presented its first frame and the source reports
  the video's size. Until then every pane shows its poster, as a pane does today before its loop's first frame.
- **Tile textures.** For each slug, a texture over the shared source with the map's rectangle as its frame (the
  half-size file: the rectangle halved). They are made after the gate opens, when the source has the video's size: a
  sprite does not follow a source that changes size under it, which is why a pane's own loop re-fits by hand today.
- **A pane's second sprite.** The pane gets a wall sprite above its poster and below its own loop's sprite. It shows
  when the wall is ready and the pane's own loop is not showing. Destroying a pane's sprite or texture never destroys
  the shared source; only the wall unit does that.
- **The pointed pane.** Hover works as today on the pane's own video: created on the first hover, shown once it has
  presented a frame, with the tile under it until then. Asleep again, it is released after 5 s.
- **The dropped-frame watch.** Every 2 s the unit reads the frames the video presented and the frames it dropped.
  Under 18 presented frames a second for 6 s moves `wall` to `wall-small`. Under 12 for 6 s moves `wall-small` to
  `starved`. The first 4 s after a video starts are not judged. A move down is remembered for the session, so the
  next page does not try again.
- **A tier's step down** while the floor stands moves `own` to `wall`, and `wall` to `wall-small`: the own loops are
  released, the wall starts, posters stand in for the moment between.
- **Changing file** always builds a new wall unit and destroys the old one. Nothing is resized in place.
- **Stopping.** THE LIST, a chapter flip and the page's exit destroy the wall unit: the video is paused, emptied
  (`src = ''`, `load()`) and its source destroyed.

### 4.6 The device ladder (`src/lib/quality.ts`)

- **"4 or less".** `startTier` caps at BALANCED for `hardwareConcurrency <= 4` or `deviceMemory <= 4`. Chrome reports
  a 4 GB machine as 4, and "less than 4" lets it through, as the laptop profile showed. A value the browser does not
  report caps nothing, as today. What the old laptop itself reports is on the readout's `DEVICE` line.
- **A hardware ceiling.** A new pure function gives the highest tier a device may reach: BALANCED for 4 threads or
  fewer, or 4 GB or less; FULL otherwise. It is worked out again at every page's start from the device, never read
  from storage. The restored tier and ceiling are both lowered to it. So a 4 GB laptop never climbs to FULL, and
  what an earlier visit remembered cannot lift it.
- **A named integrated GPU alone** still opens BALANCED and may climb to FULL on fast frames, as today. A laptop with
  8 GB or more and more than 4 threads has that room.
- **Stalls count.** A frame longer than 250 ms is no longer thrown away. Three of them within 10 s make the window
  SLOW, and the governor steps down as for any slow window. Not counted: frames inside the opening hold of 2.5 s, the
  first frame after the tab returns from hidden, and gaps over 5 s (a sleeping machine).
- **The pin still wins.** `?gfx=` sets the tier and the ceiling whatever the hardware says. It is the owner's and the
  testers' switch.
- `window.rvlQuality.state()` also reports the hardware ceiling and the tier the page opened at.
- Unchanged: the tiers' other knobs, the 12 s before a step up, the reopening rule, the day's memory, and that a
  line's speed never moves the tier.

### 4.7 Waste removed on every tier

| What | Today | After |
|---|---|---|
| A sleeping pane's video | Paused; the element, its decoder and its texture stay for the visit. Only a count over 24 elements releases one, and a chapter has 12 films. | Released after 20 s asleep (`releaseVideo`), so only panes in or near the view hold a decoder. |
| The resting glow of a featured pane | A white sprite with a blur filter of eight passes, run every frame while it shows (`src/works/glow.ts`). LITE has none since 2026-09-28. | One soft rectangle drawn once per pane size on a 2D canvas and tinted by the sprite. No filter runs. Its fades and its rule (hidden when fully faded) stay. |
| Poster textures at a chapter flip | The world is destroyed with `{ children: true }`, which leaves textures; a poster's texture comes from `Texture.from(canvas)`, which Pixi caches until the texture is destroyed. | Each pane's poster texture is destroyed with its source before the app is. |
| THE LIST | The floor is paused and its loops put to sleep, not released. A tier change wakes all of them under the list (§2.2). | Pausing releases every own loop and the wall. Every playback pass goes through one guard that does nothing while the floor is paused. |
| The hover clip | The first hover of every pane asks for `hover.mp4`. No film has one. The request fails, the loop is loaded again and the pane waits for a new first frame. | The manifest lists which films have a hover clip. A pane with none listed asks for nothing. The clip stays supported for a film that gets one. |

Checked and left alone: the harness lists a second WebGL context on every Pixi page. It is Pixi's own capability
probe, 0×0 and already lost, and holds nothing.

### 4.8 The readout

- `?stats=1` on any page shows one small panel in the house's mono type, fixed at the left edge. Nothing shows
  without the parameter.
- Its lines, refreshed once a second:
  - `LEVEL` the tier, its ceiling, the hardware ceiling, the tier the page opened at;
  - `FRAMES` frames per second over the last second, and the stalls since the page opened;
  - `WALL` the floor's mode, the file playing, frames presented per second, frames dropped of frames decoded;
  - `OWN LOOPS` how many of the panes' own videos are playing;
  - `DEVICE` memory and threads as the browser reports them, and the GPU's name.
- A `COPY` button puts those lines on the clipboard as text.
- Nothing is sent anywhere. The panel reads what the page already knows.

## 5. When something fails

| Failure | What the visitor sees |
|---|---|
| The manifest has no wall for the chapter | `posters`: today's LITE, up to 3 loops |
| The wall video's request fails, or the file will not decode | The unit is destroyed; the floor moves to `posters` for the session |
| The video loads but presents no frame | Posters stay up (the frame gate); after 8 s without a frame, as above |
| One film has no valid tile | That pane plays its own loop; the others keep their tiles |
| The half-size copy is missing while the full-size is there | `wall` runs; a step down from it goes to `posters` |
| The pointed pane's own loop fails | Its tile stays; the pane's existing retry and cooldown apply |
| ffmpeg is missing when `npm run walls` runs | The script stops and says so; nothing is written |
| A loop cannot be read by the script | The script stops, naming the film; no partial wall is written |

## 6. Tests

New, on the pure parts:

- `wall-files`:
  - the packing keeps every tile inside the frame, without overlap, gutters included;
  - a tall tile is two rows high; every tile of a chapter has one scale;
  - the shared length is the one whose shortest last pass is longest, never shorter than the longest loop, and for
    today's loops leaves no last pass under 2 s;
  - the half-size rectangle is the full-size one halved;
  - a changed byte length or hash drops that tile from the manifest entry, and only that tile;
  - a film that left the chapter loses its tile; a missing video file drops the chapter.
- The floor's mode: one pure function from the tier, the wall's presence, Save-Data or 2g, and the watch's verdict to
  one of the five modes, tested through every row of §4.1's table; a step up changes nothing; a step down moves one
  mode.
- The dropped-frame watch: 6 s under 18 frames moves down; a single bad reading does not; the first readings after a
  start are not judged.
- `quality`:
  - 4 GB and 4 threads open BALANCED;
  - the hardware ceiling for each device in the existing fixtures;
  - a remembered FULL on a capped device restores as BALANCED with a BALANCED ceiling;
  - the pin still gives FULL on a capped device;
  - three stalls in 10 s give a step down, two do not, and none are counted inside the hold or after a hidden tab;
  - the knob table reads 12 · 3 · 3 and 4 · 3 · 2.
- Playback: a pane asleep 20 s is released and one asleep 19 s is not; no pane wakes while the floor is paused, also
  when the tier changes.
- Glow: the existing three behaviours hold with no filter on the sprite.

Content tests:

- Each chapter's wall, its half-size copy and its map exist; the videos are `+faststart` (the existing MP4 reader);
  each map's length matches its video's; the full-size file is under 16 MB and the half-size under 6 MB.
- Every film on a chapter has a valid tile (§4.4, layer 3).
- `tests/loop-frames.test.ts` (needs ffmpeg) also walks `walls/*.mp4`: no wall starts or ends on a black frame.

Source pins to update:

- `tests/quality.test.ts`: the knob test's `[12, 12, 3]` becomes `[12, 3, 3]`.
- `tests/video-texture.test.ts`: `wall.ts` joins the files that must call `videoTexture(` and never set `updateFPS`.
- `tests/floor-ways.test.ts`: the pins on `pause()` and on the page's call to it keep passing; a pin is added for the
  paused guard.
- `tests/playback.test.ts`: the fake panes gain what the release rule reads.

## 7. Verification

### 7.1 With the harness (the development PC, the laptop profile, a fresh browser per page)

Expectations, not promises. The last task of the plan measures the right-hand column and records it in the plan.

| | Today (measured) | Expected | After the build |
|---|---|---|---|
| The tier 2 s, 15 s and 60 s after boot | balanced, full, full | balanced at all three | measured in the plan's last task |
| WORK at BALANCED: videos decoding at rest | 11 | 1 | measured in the plan's last task |
| WORK at BALANCED: picture decoded each second | about 200 million px | about 50 million | measured in the plan's last task |
| WORK at BALANCED: all, used | 1,266 | lower by about 280, from the video alone | measured in the plan's last task |
| WORK at BALANCED: GPU memory, used | 724 | lower by about 320, from the video alone | measured in the plan's last task |
| WORK at BALANCED: Pixi textures, rest → used | 81 → 122 | lower; by how much is not known until the glows are baked | measured in the plan's last task |
| WORK at LITE: panes moving | 3 | all | measured in the plan's last task |
| THE LIST after a tier change: videos | 11 playing | 0 | measured in the plan's last task |
| THE LIST: all / GPU memory | 995 / 472 | at or under 696 / 182 | measured in the plan's last task |
| Six chapter flips: canvases and textures alive | not measured | no growth from flip to flip | measured in the plan's last task |
| A pane's first hover: requests for `hover.mp4` | one per pane, by the code | none | measured in the plan's last task |
| WORK at FULL on the development PC as it is | 12 sharp loops | the same picture; fewer decoders once far panes have slept 20 s | measured in the plan's last task |

Also checked in real Chrome, on the dev server and on the live site:

- `?gfx=balanced` and `?gfx=lite`: every pane of both chapters moves, in its own ratio, with no neighbour's picture at
  any pane's edge (a pixel check along each pane's border).
- The pointed pane switches to its own loop and back with no black frame.
- A loop file replaced without a rebuild: that pane plays the new loop, the others their tiles.
- A wall file removed: the floor stands in `posters`.
- A tablet (a coarse pointer, 1024×768): the wall plays.
- A phone (390×844): the reel, unchanged.
- The gates: `npm run check`, `npm test`, `npm run build`; then the live checks after the deploy.

### 7.2 On the owner's laptop (the real proof)

The owner opens `works.html?stats=1` on the live site in Chrome on the old laptop, and reads back:

1. After 30 s at rest: the five lines (the `COPY` button), and whether every pane is moving.
2. After pointing at three panes and switching to CH·02: the five lines again, and whether anything froze.
3. Once, `works.html?stats=1&gfx=full` for 30 s: the five lines. This is the wall as it was before this part, and
   shows which of the two causes in §2.6 the laptop had.
4. In words: is the motion smooth, do the panes look too soft, and what Task Manager shows for Chrome.

What the lines decide:

- `WALL` drops many frames at `wall`, few at `wall-small`: the laptop cannot hold 1080p, and the ladder is doing its
  job. Nothing to change.
- `LEVEL` opened at FULL: the placement missed the laptop, and its `DEVICE` line says what rule would catch it.
- `FRAMES` low with a healthy `WALL`: the cost is the floor's drawing, not the video. That is the next part's first
  question.

HOMEPAGE, STORY and the film pages are designed after this reading.

## 8. Design calls for the owner

1. **Softness at rest.** On the wall tiers a resting pane's tile is drawn about 1.5 times its size (about 3 times at
   LITE). The alternative is two wall videos for a twelve-film chapter: tiles close to today's sharpness, two
   decoders, about half of today's decode work instead of a quarter.
2. **The ceiling rule is "4 GB or less, or 4 threads or fewer".** A desktop with four threads, plenty of memory and a
   strong graphics card is held at BALANCED too. The alternative is memory alone.
3. **A step up waits for the next floor.** A machine that climbs to FULL keeps the wall until the next chapter flip
   or page. The alternative switches at once and downloads both.
4. **CRF 23 for the wall** (13.4 MB for CH·01). CRF 27 is about 8 MB and shows more compression once enlarged.
5. **The 29.97 fps loops lose every fifth frame**; the alternative is a 30 fps wall, where the 24 fps loops, most of
   them, repeat every fourth frame instead.
6. **Save-Data and 2g get no wall**: 3 loops and posters, as today.
7. **Without a wall, BALANCED plays 3 own loops**, not today's 12. Twelve decoders on a weak machine is the failure
   this part removes.
8. **The baked glow** follows the pane's slant at rest, where today's blur is even on the screen. It rests at 14%
   opacity.
9. **`?stats=1`** is the readout's address, and its panel stands at the left edge.
10. **Sleeping panes release after 20 s**; the pointed pane's loop after 5 s on the wall tiers.

## 9. The local rules file

The floor's rule of 2026-11-08 is replaced by:

- **The floor's loops:** every pane in the view plays at once on every tier. At FULL each pane plays its own loop
  (`videoCapFor` 12). Below FULL one wall video per chapter (`public/content/walls/`) plays them all as tiles, and
  only the pointed pane decodes its own loop. With no wall (a missing file, Save-Data, a 2g line) at most 3 own loops
  play.

And it gains:

- Under "Media from the owner": after any loop is added or replaced, or a film joins or leaves a chapter, run
  `npm run walls` and commit `public/content/walls/`. The content tests fail on a stale wall.
- Under "Laws": never destroy the wall's shared source from a pane; a tile's texture is made only after the wall
  video has presented a frame.
- Under "Verifying": `?stats=1` shows the readout; `rvlQuality.state()` reports the hardware ceiling.

## 10. Out of scope, noted for later parts

- Building the floor only when the visitor leaves THE LIST. A direct `?view=list` load still builds it: 696 MB against
  an empty page's 334.
- The Pixi canvas's antialiasing below FULL. It changes every slanted edge and needs the owner's eye.
- Pausing the floor's videos in a hidden tab.
- The floor's 2048×1024 filter targets that remain after the glows are baked (the hover's desaturation pass).
- The STORY governor's "less than 4".

## 11. Risks and unknowns

- **The laptop may not decode 1080p H.264 on its chip.** Then the watch moves it to the half-size copy within about
  8 s. Stated unknown; §7.2 settles it.
- **Softness** (design call 1). Stated unknown until the owner sees it on the laptop.
- **Poster textures surviving a flip** is from reading Pixi's cache code, not from a measurement. The plan measures
  six flips before and after.
- **The hover clip's wasted request** is from reading the pane's code. The plan confirms it with a network log before
  removing it.
- **How much of the floor's texture memory the glows' blur holds** is not known. The plan measures after the bake.
- **Edge bleed.** The gutter and the half-pixel inset are the guard; the pixel check in §7.1 is the proof.
- **Stalls at boot.** A slow machine's first seconds have long frames. The hold, and the rule of three in 10 s, keep
  one freeze from costing a tier; the laptop's `FRAMES` line shows whether the numbers need moving.
- **Firefox and Safari** report no device memory. There the ceiling rests on the thread count and the measured frames.
- **A wall adds a step to the owner's editing.** Forgetting it costs one pane its tile, never a wrong picture, and
  the tests say so before a push.
