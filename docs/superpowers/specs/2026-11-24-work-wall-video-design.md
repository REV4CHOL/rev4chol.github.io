# WORK on weak machines: the wall as one video, an honest device ladder — design (2026-11-24)

Part 1 of the performance round. HOMEPAGE, STORY and the film pages follow in their own specs (§3).

Revised the same day after three later messages from the owner (§1, messages 5 to 7): the combined video goes to weak
machines only, and the site keeps deciding from live signs after a machine arrives (§4.9).

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

Later the same day the owner was shown one resting pane at its true size, 716 px wide, drawn from four sources:
today's own loop, a tile 640 px wide, the one-wall tile of about 466 px, and the half-size tile. They were told
plainly that "a little softer" had understated the wall's softness, and were asked which machines should get the
combined video: only weak machines (recommended); every machine but a strong PC, as approved; or two wall videos for
weak machines. Their answer, and two more messages after it:

5. "Also applied to machines with 8 GB RAM or less pls". That is: weak machines only, with the memory line moved
   from 4 GB to 8 GB. It replaces the part of the plan approved earlier that day in which every machine below FULL
   got the wall (§4.1, §4.6).
6. "can you make it so the website can detect if the machine they ran on have sufficient RAM or not, and seamlessly
   change performance on the fly?"
7. "Like they can also actually dynamic and monitor measure how much RAMs the machine has left and respond
   accordingly"

To 6 and 7 the owner was told plainly that no browser tells a page how much memory the machine has free. The closest
real thing is a live meter of what the site itself holds, with the machine's own signs of distress beside it (§4.9).

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
  half-size copy and the wall's watch (§4.5) are there for a laptop that cannot.

### 2.7 What a page is told about memory (checked on the live site in headless Chrome 158, the development PC)

- `navigator.deviceMemory` read 32. It is the machine's total memory, rounded, told once, and it is undefined
  outside a secure context. Older versions of Chrome reported no value above 8, and that a 16 GB machine reads 16 is
  from the API's published list of values; neither was measured here. Firefox and Safari do not have the property.
- `PressureObserver` exists, and `PressureObserver.knownSources` is `["cpu"]`: there is no memory source. An observer
  on `cpu` was accepted. It delivered no reading in 14 s, with the page focused and a core kept busy, so its states
  (`nominal`, `fair`, `serious`, `critical`, by the API's definition) were not seen here.
- `performance.memory` exists and counts the page's JavaScript heap only. It read 7 to 9 MB on WORK and 235 to 268 MB
  on STORY, against a limit of 4,192 MB. In this headless Chrome it moved within a second of a 150 MB allocation;
  the old laptop's `MEMORY` line shows whether it moves there.
- `performance.measureUserAgentSpecificMemory` is undefined. It needs cross-origin isolation, which the site does
  not have.
- `document.wasDiscarded` exists, and is false on a fresh load.

Read from the code, not measured:

- Pixi 8.20 answers a lost WebGL context with `preventDefault()`, which is what lets the browser give the context
  back. When it returns, Pixi drops every texture handle and uploads each texture again from its picture the next
  time it is drawn. Nothing in Pixi checks for a lost context before it draws.
- The WORK floor has no handler for a lost context and none for a hidden page (`src/works/world.ts`). Its ticker
  runs on the browser's animation frames, which stop in a hidden tab. The page pauses none of the floor's videos.
- STORY's canvas handles a lost context: it drops to its lowest tier. THE LIST's decoration hides its canvas. The
  homepage's reel has no handler.

## 3. Scope

Part 1 is five things:

1. The device ladder: how a machine is placed, and that a weak one stays where it was put.
2. The WORK floor plays one combined video on a weak machine, and on any machine that proves slow, so every pane
   moves there. A machine that is not weak keeps each pane's own loop.
3. The ladder keeps deciding after a machine arrives: from live signs of distress, and from a meter of what the site
   itself holds (§4.9).
4. Waste removed from the WORK floor on every tier.
5. A readout the owner can open on the old laptop.

Not in this part:

- HOMEPAGE, STORY and the film pages. Each gets its own spec after the owner's laptop test, as they chose. The
  measurements in §2.2 are their baseline. The new signals live in the shared ladder. Here only the WORK floor
  reports to them and answers in its videos; a step of the shared tier is felt on every page, as today (§4.9). The
  homepage and STORY take the rest up in their own parts (§10).
- A phone's WORK. The reel is untouched here; its panes are being redesigned under a separate request.
- The STORY city's own governor (`src/about/city-governor.ts`), which has its own "less than 4" rule.

## 4. The design

### 4.1 What plays where

Two things decide the floor's video: the machine's class and the tier.

- **The weak class** (§4.6): a machine that reports 8 GB of memory or less, or 4 threads or fewer, or whose main
  pointer is a touch screen (a tablet; a phone has its reel). It is read from the hardware at every page's start.
- **The tier**: FULL, BALANCED or LITE, as today. A weak machine never rises above BALANCED.

| | FULL | BALANCED | LITE |
|---|---|---|---|
| A weak machine | Not reached, except by the pin: own loops | The wall | The wall |
| Any other machine | Own loops, as today | Own loops, as today | The wall |

A machine that is not weak reaches LITE by proving slow, or by having no graphics chip at work (a software
renderer). Today it plays 3 loops there; now every pane moves.

The floor is in one of five modes:

| Mode | When | What the panes show | Videos decoding |
|---|---|---|---|
| `own` | The table above gives own loops | Each pane its own loop, as today | Up to 12 |
| `wall` | The table gives the wall; or the own loops failed their health watch (§4.5); or the floor lost its context in this visit (§4.9) | Every pane its tile of the wall video | 1, plus the pointed pane's loop |
| `wall-small` | The wall video cannot hold its frame rate (the wall's watch, §4.5) | Every pane its tile of the half-size copy | 1, plus the pointed pane's loop |
| `posters` | A wall is due and cannot play: the file is missing or failed, or the visitor has Save-Data or a 2g line | Posters; the panes nearest the middle play their own loops | Up to 3 |
| `starved` | The half-size copy cannot hold 12 frames a second | Posters; only the pointed pane plays | 1 |

The mode is worked out in four steps:

1. The first table gives own loops or the wall, from the class and the tier.
2. Own loops become the wall where this machine's own loops failed their health watch (§4.5), in this visit or
   within the last day; and for the rest of a visit in which the floor lost its WebGL context (§4.9).
3. A wall that is due and cannot play gives `posters`: no usable file, Save-Data, or a 2g line.
4. A wall that plays follows its own watch (§4.5): `wall`, then `wall-small`, then `starved`. With no half-size
   file, `posters` stands in for `wall-small`.

A pinned page (`?gfx=`) takes step 1 from the pinned tier, and step 3 as it stands. It skips steps 2 and 4: it shows
both watches' readings on the readout and obeys neither, and it ignores what an earlier visit remembered. So
`?gfx=full` shows twelve own loops on any machine. That is the owner's switch for seeing the floor as it was.

When the mode is worked out:

- When the floor is built: the page's load, a chapter flip, the return from THE LIST, the page shown again after a
  long spell hidden, and a WebGL context given back (§4.9).
- At once, while the floor stands: when the tier steps down, when the health watch fails, and when the wall's watch
  gives a verdict.
- A step up changes no video until the floor is next built. So a machine never downloads the wall video and then
  the twelve loops in one view.

How many panes may decode their own loop:

| Mode | A desktop or a laptop | A tablet, or a window under 820 px |
|---|---|---|
| `own` | 12, at FULL and at BALANCED | 4 at FULL, 3 at BALANCED |
| `wall`, `wall-small`, `posters` | 3 | 3; 2 at LITE |
| `starved` | 1 | 1 |

- `videoCapFor` does not change: 12 · 12 · 3 on a desktop and 4 · 3 · 2 on a tablet or a narrow window (FULL ·
  BALANCED · LITE). `own` uses it as it is. The wall modes and `posters` use the smaller of it and 3. So a machine
  that is not weak plays twelve own loops at BALANCED exactly as today, and no machine decodes more than three
  loops beside a wall. A tablet is weak, so it reaches `own` only by the pin.
- The pointed pane (hover, or a tap on a touch screen) always plays its own full loop, as today. Lifted, it stands up
  to 84% of the screen's height, where a tile would look coarse.
- In the wall modes a pane with no valid tile (§4.4) plays its own loop, nearest the middle first. The pointed pane
  and these panes share the cap above.
- Save-Data and a 2g line already open at LITE (`startTier`). They never start a wall video: the visitor asked for
  less data, or nothing streams. At LITE they get `posters`, which is exactly today's LITE.
- The half-size copy is reached only through the wall's own watch. No tier asks for it by itself.
- The owner's 2026-11-08 rule, "almost all panes to load at once", stands as built on a machine that is not weak,
  and now holds wherever a wall plays.

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
own size, not enlarged on a pane, and "a little softer" understated the fourth. They then saw one resting pane at its
true size from four sources, and chose (§1, message 5): the wall for weak machines only, with the memory line at
8 GB. So the softness is settled. A machine outside the weak class keeps its own sharp loops, and meets the wall
only after it has proved slow.

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
- for each slug: the tile's rectangle in the full-size frame, its loop's frame rate, and its loop's fingerprint
  (file name, byte length, SHA-256).

A wall is stale when a loop changed after the wall was built. Three layers keep an old picture off a pane:

1. **At build time.** The media manifest plugin (`vite.config.ts`) already lists every loop for the site. It gains a
   `walls` entry per chapter, listing only the tiles whose fingerprint matches the loop file on disk and whose film is
   still in that chapter, each with its loop's frame rate. A chapter whose video files are missing gets no entry.
   The dev server answers the same way, so a replaced loop shows on its own pane at the next refresh.
2. **At run time.** The floor reads walls only from the manifest and never probes for a file. A pane with no tile
   listed plays its own loop (§4.1). A chapter with no entry has no wall: where one is due, the floor stands in
   `posters`.
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
- **The wall's watch.** Every 2 s the unit reads the frames the wall video presented and the frames it dropped.
  Under 18 presented frames a second for 6 s moves `wall` to `wall-small`. Under 12 for 6 s moves `wall-small` to
  `starved`. The first 4 s after a video starts are not judged, and nor is a hidden page. A move down is remembered
  for the session, so the next page does not try again.
- **The loops' health watch** runs in `own`. Smooth frames on the page say nothing about starving decoders, so the
  floor reads the videos themselves.
  - Every second, for each own loop the floor has told to play, it reads the frames the video has presented so far
    (the element's own totals from `getVideoPlaybackQuality`: frames decoded, less frames dropped) and works out
    the frames due: the loop's frame rate times the seconds it has been counted. The frame rate is the manifest's
    (§4.4); 24 where a film has none listed.
  - A loop is counted once it has been told to play for 3 s and its data is buffered at least a second past the
    play position, or to the file's end. A loop still downloading is not counted, so a slow line is not read as a
    slow machine. A counted loop that has presented no frame counts as none of its frames: that is the frozen pane.
  - When the counted loops together present under half of their frames due over 5 s, the watch has failed. Not
    judged: a hidden page, the first 4 s after the page shows again, a paused floor, and fewer than two counted
    loops.
  - A failed watch switches the floor to the wall at once (§4.1, step 2) and is told to the ladder (§4.9). It is
    remembered for the visit, and for a day from the moment it failed: the flag carries its own time, which later
    saves do not refresh, so after a day the machine tries its own loops again. The tier itself does not move: the
    page's own frames may be smooth.
  - Where the browser gives no such totals, the watch does nothing.
- **Every switch happens under the posters.** The videos that are leaving are released, each pane shows its poster,
  the new video starts, and the panes take it up once its frame gate opens. §4.9 lists what the visitor sees.
- **Changing file** always builds a new wall unit and destroys the old one. Nothing is resized in place.
- **Stopping.** THE LIST, a chapter flip, the page's exit, a page hidden for 30 s and a lost context (§4.9) destroy
  the wall unit: the video is paused, emptied (`src = ''`, `load()`) and its source destroyed.

### 4.6 The device ladder (`src/lib/quality.ts`)

- **The weak class.** A new pure function, worked out again at every page's start from the device and never read
  from storage. A machine is weak when any one of these holds:
  - it reports 8 GB of memory or less (`deviceMemory <= 8`);
  - it reports 4 threads or fewer (`hardwareConcurrency <= 4`);
  - its main pointer is coarse: a tablet or a phone.

  A value the browser does not report makes nothing weak. Today's rule reads memory as `deviceMemory ?? 8`; beside
  "8 or less" that default would make every Firefox and Safari visitor weak, so the memory line reads a reported
  value only.
- **What the memory line can tell.** Chrome and Edge report the machine's total memory, rounded, once, on a secure
  page (§2.7). 8 or less reads as weak; 16 and 32 do not. Its known costs:
  - An old Chrome reports no value above 8. There every larger machine reads as 8, is weak, and gets the wall.
  - Firefox and Safari report nothing. One 8 GB laptop is weak in Chrome and not weak in Firefox, where the thread
    line, the measured frames and the health watch have to catch it.
  - How Chrome rounds a 12 GB machine was not checked.
- **The opening tier.** `startTier` caps a weak machine at BALANCED. That replaces "fewer than 4 threads, or less
  than 4 GB", which let the laptop profile's 4 GB and 4 threads through (§2.3). A touch screen is capped already.
- **A hardware ceiling.** The highest tier a device may reach: BALANCED for a weak machine, FULL for any other. The
  restored tier and ceiling are both lowered to it. So a weak machine never climbs to FULL, and what an earlier
  visit remembered cannot lift it.
- **The ceiling reaches every page.** The ladder is shared, so a weak machine is held at BALANCED across the site.
  Today a phone, a tablet and an 8 GB laptop may climb to FULL after 12 s of fast frames. What FULL gave them, and
  they now do without: a sharper Pixi canvas (up to 1.5 device pixels a CSS pixel on a touch screen and 2 on a
  laptop, against 1 and 1.5), the homepage reel's lens pass, the grain's faster re-deal, the display's own frame
  rate above 60, and on a laptop the STORY city's top tier. A phone's WORK reel does not read the tier and is
  untouched. This is design call 1 (§8).
- **A named integrated GPU alone** still opens BALANCED and may climb to FULL on fast frames, as today. A laptop with
  more than 8 GB and more than 4 threads has that room.
- **Stalls count.** A frame longer than 250 ms is no longer thrown away. Three of them within 10 s make the window
  SLOW, and the governor steps down as for any slow window. Not counted: frames inside the opening hold of 2.5 s, the
  first frame after the tab returns from hidden, and gaps over 5 s (a sleeping machine).
- **Live signals.** After a machine arrives the ladder also takes: a lost WebGL context, a discarded tab, processor
  pressure, the floor's memory budget and the loops' health watch (§4.9). Each is recorded with its time.
- **The pin still wins.** `?gfx=` sets the tier and the ceiling whatever the hardware and the signals say. It is the
  owner's and the testers' switch. A pinned page records the signals and shows them on the readout, and moves
  neither the tier nor the mode; its meter sheds nothing. The floor still stops and is built again after a lost
  context, and still gives its videos back when hidden.
- `window.rvlQuality.state()` also reports the hardware ceiling, the weak class and the line that gave it, the tier
  the page opened at, and the signal that last changed the level.
- Unchanged: `videoCapFor`'s table and the tiers' other knobs, the 12 s before a step up, the reopening rule, the
  day's memory of the tier, and that a line's speed never moves the tier.

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
  - `LEVEL` the tier, its ceiling, the hardware ceiling, the tier the page opened at, and the signal that last
    changed the level with how long ago;
  - `FRAMES` frames per second over the last second, and the stalls since the page opened;
  - `WALL` the floor's mode, the file playing, frames presented per second, frames dropped of frames decoded;
  - `OWN LOOPS` how many of the panes' own videos are playing, and their frames presented of frames due over the
    last 5 s;
  - `MEMORY` the machine's memory as the browser reports it, or `NOT REPORTED`; the meter's textures and heap, live;
    the budget; `OVER` when it is crossed;
  - `PRESSURE` the processor's state, live; `NO READING` until one arrives; `NOT OFFERED` without the observer;
  - `DEVICE` threads, the pointer, weak or not and by which line, and the GPU's name.
- A `COPY` button puts those lines on the clipboard as text.
- Nothing is sent anywhere. The panel reads what the page already knows.

### 4.9 What the site can know about memory, and what it does on the fly

**The limit.** A page is told the machine's total memory, rounded, once, and only in Chrome and Edge. No browser
tells a page how much memory is free. So the site decides on arrival from the size it is told (the weak class, §4.6),
and then keeps deciding from symptoms, and from a meter of what the site itself holds.

Two ways around the limit were considered and rejected:

- **Cross-origin isolation through a service worker**, to switch on the browser's own memory measurement. It
  measures the page only, never the machine, and isolation puts the film pages' YouTube embeds at risk.
- **Probing**: allocating memory and timing it. It spends the memory it is trying to protect, and its answer is
  unreliable.

**Symptoms.** Each lightens the site as soon as it is read, is recorded with its time, and is remembered as any step
down is: in the session, and for a day. Stalls and pressure go through the governor as a slow window does, with its
3 s between two steps. The others act on the spot.

| Symptom | How it is read | What it does |
|---|---|---|
| Slow frames | The window of 60 frames, as today | A step down, by today's rules |
| Stalls | Three frames over 250 ms within 10 s (§4.6) | The window is SLOW: a step down |
| Starving decoders | The loops' health watch (§4.5) | The floor takes the wall; the tier stays |
| A lost WebGL context | `webglcontextlost` on the floor's canvas | One step down; the tier that was left is closed for the session; the wall is due for the rest of the visit; the floor is built again (below) |
| A discarded tab | `document.wasDiscarded` is true at load | The page opens one tier lower than the device rule and the remembered tier give, and that tier is the visit's ceiling |
| Processor pressure | `PressureObserver` on `cpu`, where the browser has one | `serious` or `critical` for 10 s running counts as a SLOW window; no step up while it lasts |
| The site's own growth | The meter, still over its budget after shedding (below) | One step down |

**A lost context on the floor.** A browser takes a page's WebGL context away when its graphics process fails or is
short of memory, so the floor reads it as a memory signal.

1. On `webglcontextlost` the floor stops its own ticker, since Pixi would go on drawing (§2.7). It releases every
   video and tells the ladder. Pixi has already called `preventDefault()`, so the browser may give the context
   back. The page's chrome stays; the ground behind it is empty.
2. On `webglcontextrestored` the floor is not patched in place. The world is destroyed and built again by the
   chapter flip's path: the same chapter, the same place, no opening animation, one tier lower, and on the wall for
   the rest of the visit (§4.1, step 2). Without that, a machine that is not weak would be handed its twelve loops
   again. Building anew arms every frame gate again and leaves one path to test. Pixi's own restore uploads each
   texture again and knows nothing of the videos.
3. If the context is not back within 4 s, or is lost a second time in the visit, the page switches to THE LIST,
   which is plain HTML. The floor stays one press away, and choosing it builds a new one. There is never a dead
   floor.

**A discarded tab.** Chrome throws a background tab away when memory is short and loads it again when the visitor
returns; `document.wasDiscarded` is then true. Chrome's Memory Saver setting also discards tabs that were only
idle, and the flag does not say which it was (not checked here). A wrong reading costs one visit a tier lower.

**Processor pressure.** A machine out of memory starts swapping, and swapping shows as load and as stalls. Where the
browser has `PressureObserver`, the ladder watches `cpu` with one reading a second. The reading is the whole
machine's, not the page's: another program working hard lowers the site's level while it works. In the check of
§2.7 the observer delivered nothing, so the rule does nothing without a reading, and the readout shows what the old
laptop's Chrome delivers.

**Giving memory back.** Today the floor does nothing when its tab is hidden. Its ticker stops with the browser's
animation frames, and the page pauses no video (§2.7). Whether Chrome keeps a hidden tab's decoders working is not
known; the plan measures it before and after.

- When the page is hidden, every floor video is paused at once.
- After 30 s hidden, the floor releases its videos: the wall unit and every own loop. 30 s is longer than a look at
  another tab, so coming straight back costs nothing. A tab left longer is one nobody is watching, and its decoders
  and video textures are the largest things the page can hand back.
- When the page shows again, the floor works out its mode as at a build and takes its videos up under the posters.
  The files should come from the browser's cache; the plan reads the network log.

**The meter.** Every 5 s while the page shows, the floor adds up what the site itself holds:

- the texture bytes Pixi has uploaded for the floor, from its list of managed textures, each counted as width ×
  height × 4: posters, video frames, glows, and the filters' render targets;
- the JavaScript heap, where the browser reports it (`performance.memory`: Chrome and Edge).

It also lists, without adding them, the live video elements and their picture sizes.

The budget, for a canvas of 1366×768 at 1×:

| Machine | Budget |
|---|---|
| Reports 4 GB or less | 96 MB |
| Weak otherwise | 144 MB |
| Not weak | 256 MB |

- Where the numbers come from (§2.2, §2.7): today's floor holds 81 MB of textures at rest and 122 MB after hovering
  and dragging, with twelve loops, and a heap of 7 to 9 MB. On the wall, twelve loop textures of 2.6 to 3.5 MB give
  way to one of 8.3 MB (arithmetic), so the figure at rest should fall below today's. 96 MB then leaves room for the
  pointed pane and a hover, and would have caught today's own growth to 122. 144 MB is today's figure after use and
  a fifth more. 256 MB is about twice it: a guard against a leak, nothing finer.
- A filter's render target is sized by the canvas, to a power of two. The textures of such sizes were 36 of the
  81 MB (three of 2048×1024, three of 1024×1024); that all six are filter targets is read from their sizes, not
  traced. So 45% of a budget grows with the canvas's pixel count against 1366×768, and the rest does not: the
  budget times (0.55 + 0.45 × the canvas's pixels ÷ 1,049,088).
- The numbers stand on one canvas size. Before they ship, the plan measures the built floor's count in each mode
  at 1366×768 and at 1920×1080, checks the meter against the harness's own count, and raises any budget that the
  figure after use comes within a fifth of.

Over budget on two readings running, the floor sheds in a fixed order:

1. It releases at once every own video that is not showing: the sleeping panes waiting out their 20 s, and the
   pointed pane's loop once the pointer has left.
2. Still over on the next two readings, it tells the ladder, which steps down one tier.
3. At LITE there is nothing further to shed. The readout says `OVER`.

What the meter cannot see: the browser's video decoders, and the graphics process's own memory. They are the
larger part. The WORK page's graphics process held 852 to 920 MB while the page had asked for 81 to 122 MB of
textures (§2.2). So the meter guards against the site's own growth. It is not a reading of the machine.

**Signals not used.**

| Signal | Why not |
|---|---|
| A memory-pressure source | The browser has none: `PressureObserver.knownSources` is `["cpu"]` (§2.7) |
| `measureUserAgentSpecificMemory` | It needs cross-origin isolation. GitHub Pages cannot send the headers, and the reading would be the page's only |
| `performance.memory` as a rule of its own | It counts the JavaScript heap only: 7 to 9 MB on WORK. It is on the meter. STORY's heap is 235 to 268 MB, and a rule on it belongs to STORY's part |

**What the visitor sees.** Every switch happens under the panes' posters, behind the frame gate the floor already
has. A step down switches at once. A step up changes no video until the floor is next built.

| Switch | What the visitor sees |
|---|---|
| Own loops to the wall | Every pane rests on its poster for a moment, then all of them move again, softer at rest. The pointed pane keeps its own loop |
| The wall to its half-size copy | The same moment on posters, then softer tiles |
| The half-size copy to `starved` | The panes rest on their posters; the pointed pane plays |
| A step up | No change in the videos until the next chapter flip, page, or return from THE LIST. The tier's other knobs change at once, as today |
| A lost context | The ground empties, then the floor stands again without its opening animation, one tier lower and on the wall; or THE LIST after 4 s |
| The page shown again after 30 s hidden | Posters, then motion |
| A discarded tab reopened | An ordinary load, one tier lower |

**Where it lives.** The weak class, the signals, the budget's arithmetic and their memory are in the shared ladder
(`src/lib/quality.ts`), as pure functions with a thin live part. The tier is shared, so a step down made by stalls,
pressure or a discarded tab is felt on every page that follows the tier. Everything else here acts on the WORK
floor only: the watches, the lost context, the hidden page, the meter. The homepage and STORY take those up in their
own parts (§10).

## 5. When something fails

| Failure | What the visitor sees |
|---|---|
| The manifest has no wall for the chapter | Where a wall is due, `posters`: today's LITE, up to 3 loops |
| The wall video's request fails, or the file will not decode | The unit is destroyed; where a wall is due, the floor stands in `posters` for the session |
| The video loads but presents no frame | Posters stay up (the frame gate); after 8 s without a frame, as above |
| One film has no valid tile | That pane plays its own loop; the others keep their tiles |
| The half-size copy is missing while the full-size is there | `wall` runs; a verdict of the wall's watch against it gives `posters` |
| The own loops fail their health watch and no wall can play | `posters`: 3 own loops in place of 12 starving ones |
| The pointed pane's own loop fails | Its tile stays; the pane's existing retry and cooldown apply |
| The floor's WebGL context is lost | The floor stops, and is built again one tier lower and on the wall when the context returns; THE LIST if it is not back in 4 s or is lost twice (§4.9) |
| Chrome discarded the tab in the background | The reload opens one tier lower, for that visit |
| The browser reports no memory, has no pressure observer, or gives no video frame totals | That line decides nothing and the others carry on; the readout says `NOT REPORTED` or `NOT OFFERED` |
| The meter is over its budget at LITE | Nothing more is shed; the readout says `OVER` |
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
- The floor's mode: one pure function from the tier, the weak class, the pin, Save-Data or 2g, the wall's and the
  half-size file's presence, the health watch's flag, a lost context in the visit and the wall watch's verdict, to
  one of the five modes. Tested through both tables of §4.1 and its four steps:
  - BALANCED gives `wall` on a weak machine and `own` on any other; LITE gives `wall` on both; FULL gives `own`;
  - the health flag turns `own` into `wall`, and into `posters` where no wall can play; so does a lost context in
    the visit;
  - Save-Data and 2g give `posters` wherever a wall is due;
  - a pinned page ignores the flag and both watches;
  - a step up changes nothing until the next build; a step down from BALANCED to LITE moves `own` to `wall` on a
    machine that is not weak, and changes nothing on a weak one.
- The cap on own loops: every cell of §4.1's third table.
- The wall's watch: 6 s under 18 frames moves down; a single bad reading does not; the first readings after a
  start are not judged.
- The loops' health watch, on made-up readings: under half of the frames due over 5 s fails, and half does not; a
  loop still downloading is not counted; a counted loop with no frame counts as none; a loop's first 3 s, a hidden
  page and a single counted loop are not judged.
- `quality`:
  - the weak class: 8 GB is weak and 16 is not; an unreported memory is not weak by memory; 4 threads are weak and
    8 are not; a coarse pointer is weak;
  - a weak machine opens BALANCED and its hardware ceiling is BALANCED; the existing fixtures whose device now falls
    in the weak class move to BALANCED, and the plan lists each one;
  - a remembered FULL on a weak machine restores as BALANCED with a BALANCED ceiling;
  - the pin still gives FULL on a weak machine;
  - three stalls in 10 s give a step down, two do not, and none are counted inside the hold or after a hidden tab;
  - a lost context steps down one tier at once and closes the tier that was left; at LITE the tier stays;
  - a discarded tab opens one tier lower, with that tier as the visit's ceiling;
  - pressure: 10 s of `serious` or `critical` running count as a SLOW window and 9 s do not; `nominal` or `fair`
    starts the count again; no reading at all changes nothing;
  - the budget: each class's number, and its growth with the canvas;
  - the shedding order: over twice releases, over twice more steps down, a reading within the budget starts again;
  - the health flag is saved in the session's and the day's records with its own time, lapses a day after the
    failure whatever was saved since, and records written before this part still restore;
  - `state()` names the signal that last changed the level;
  - a pinned page records every signal and moves neither the tier nor the mode;
  - the knob table still reads 12 · 12 · 3 and 4 · 3 · 2.
- Playback: a pane asleep 20 s is released and one asleep 19 s is not; no pane wakes while the floor is paused, also
  when the tier changes.
- The hidden page: every video pauses at once; the videos are released at 30 s and not at 29; the page showing again
  works the mode out anew.
- The lost context, on a fake floor: the ticker stops and the videos are released at the loss; a return builds the
  floor again; 4 s without one, or a second loss, gives THE LIST.
- Glow: the existing three behaviours hold with no filter on the sprite.

Content tests:

- Each chapter's wall, its half-size copy and its map exist; the videos are `+faststart` (the existing MP4 reader);
  each map's length matches its video's; the full-size file is under 16 MB and the half-size under 6 MB.
- Every film on a chapter has a valid tile (§4.4, layer 3).
- `tests/loop-frames.test.ts` (needs ffmpeg) also walks `walls/*.mp4`: no wall starts or ends on a black frame.

Source pins to update:

- `tests/quality.test.ts`: the knob test's `[12, 12, 3]` stays as it is. The opening-tier fixtures whose device is
  now weak are updated (above).
- `tests/video-texture.test.ts`: `wall.ts` joins the files that must call `videoTexture(` and never set `updateFPS`.
- `tests/floor-ways.test.ts`: the pins on `pause()` and on the page's call to it keep passing; pins are added for
  the paused guard, and for the floor's handlers of a lost context, a returned context and a hidden page.
- `tests/playback.test.ts`: the fake panes gain what the release rule reads.

## 7. Verification

### 7.1 With the harness (the development PC, a fresh browser per page)

Expectations, not promises. The last task of the plan measures the right-hand column and records it in the plan.

Three profiles answer as a laptop with a named integrated GPU at 1366×768, the main thread slowed six times. They
differ in what they report: 4 GB and 4 threads (§2.1's laptop profile), 8 GB and 8 threads, 16 GB and 8 threads.

| | Today (measured) | Expected | After the build |
|---|---|---|---|
| The 4 GB profile: the tier 2 s, 15 s and 60 s after boot | balanced, full, full | balanced at all three; the wall | measured in the plan's last task |
| The 8 GB profile: the same | not measured | balanced at all three; the wall | measured in the plan's last task |
| The 16 GB profile: the same | not measured | balanced, then full, as today; own loops at both | measured in the plan's last task |
| WORK, the 4 GB profile, `?gfx=balanced`: videos decoding at rest | 11 | 1 | measured in the plan's last task |
| WORK, the 4 GB profile, `?gfx=balanced`: picture decoded each second | about 200 million px | about 50 million | measured in the plan's last task |
| WORK, the 4 GB profile, `?gfx=balanced`: all, used | 1,266 | lower by about 280, from the video alone | measured in the plan's last task |
| WORK, the 4 GB profile, `?gfx=balanced`: GPU memory, used | 724 | lower by about 320, from the video alone | measured in the plan's last task |
| WORK, the 4 GB profile: Pixi textures, rest → used | 81 → 122 | lower; by how much is not known until the glows are baked | measured in the plan's last task |
| WORK at LITE, any profile: panes moving | 3 | all | measured in the plan's last task |
| WORK, `?gfx=balanced` on the development PC as it is | not measured; 12 own loops by the code | the same: 12 own loops | measured in the plan's last task |
| THE LIST after a tier change: videos | 11 playing | 0 | measured in the plan's last task |
| THE LIST: all / GPU memory | 995 / 472 | at or under 696 / 182 | measured in the plan's last task |
| Six chapter flips: canvases and textures alive | not measured | no growth from flip to flip | measured in the plan's last task |
| A pane's first hover: requests for `hover.mp4` | one per pane, by the code | none | measured in the plan's last task |
| WORK at FULL on the development PC as it is | 12 sharp loops | the same picture; fewer decoders once far panes have slept 20 s | measured in the plan's last task |
| The floor's context lost and given back (forced through `WEBGL_lose_context`) | no handler in the code | the floor stands again, one tier lower and on the wall | measured in the plan's last task |
| The same, never given back | no handler in the code | THE LIST after 4 s | measured in the plan's last task |
| WORK hidden for 40 s: videos held, and frames decoded while hidden | not measured | none held after 30 s; all back when the page shows | measured in the plan's last task |
| The health watch, its verdict forced | no such watch | own loops give way to the wall at once; the next page opens on the wall | measured in the plan's last task |
| The meter's texture figure against the harness's count | no meter | within a tenth | measured in the plan's last task |

Also checked in real Chrome, on the dev server and on the live site:

- `?gfx=lite` on the development PC, and `?gfx=balanced` on the 4 GB profile: every pane of both chapters moves, in
  its own ratio, with no neighbour's picture at any pane's edge (a pixel check along each pane's border).
- The pointed pane switches to its own loop and back with no black frame.
- A loop file replaced without a rebuild: that pane plays the new loop, the others their tiles.
- A wall file removed: where a wall is due, the floor stands in `posters`.
- A tablet (a coarse pointer, 1024×768): the wall plays.
- A phone (390×844): the reel, unchanged.
- The readout's `MEMORY` and `PRESSURE` lines show a value or their plain words on every profile, and nothing
  throws where a reading is missing.
- A discarded tab: the plan tries to force one from the harness. If it cannot, the rule rests on its unit tests, and
  the plan says so.
- The gates: `npm run check`, `npm test`, `npm run build`; then the live checks after the deploy.

### 7.2 On the owner's laptop (the real proof)

The owner opens `works.html?stats=1` on the live site in Chrome on the old laptop, and reads back:

1. After 30 s at rest: the seven lines (the `COPY` button), and whether every pane is moving.
2. After pointing at three panes and switching to CH·02: the seven lines again, and whether anything froze.
3. After a minute in another tab, then back: the seven lines, and how the panes came back.
4. Once, `works.html?stats=1&gfx=full` for 30 s: the seven lines. This is the floor as it was before this part,
   twelve own loops. Its `OWN LOOPS` line gives the frames presented of the frames due, and so shows which of the
   two causes in §2.6 the laptop had.
5. In words: is the motion smooth, do the panes look too soft, and what Task Manager shows for Chrome.

What the lines decide:

- `WALL` drops many frames at `wall`, few at `wall-small`: the laptop cannot hold 1080p, and the ladder is doing its
  job. Nothing to change.
- `DEVICE` reads not weak, or `LEVEL` opened at FULL: the placement missed the laptop, and the `DEVICE` and `MEMORY`
  lines say what rule would catch it.
- `OWN LOOPS` at `?gfx=full` presents under half of its frames: the laptop's decoders starve on twelve loops, which
  is the failure the health watch is there to catch on a machine that is not weak.
- `PRESSURE` reads `NO READING` throughout: the pressure rule decides nothing on that Chrome, and the stalls and the
  watches carry the load. A state that rises with the laptop's own load shows the rule has something to read.
- `MEMORY` reads `OVER` at rest: the budget is too tight for that screen, and its number is revisited.
- `FRAMES` low with a healthy `WALL`: the cost is the floor's drawing, not the video. That is the next part's first
  question.

HOMEPAGE, STORY and the film pages are designed after this reading.

## 8. Design calls for the owner

1. **The ceiling reaches every page.** A phone, a tablet and an 8 GB laptop are held at BALANCED across the site
   and do without what FULL gave them (§4.6). The alternative keeps the ceiling at the earlier line (4 GB or less, or
   4 threads or fewer) and lets the 8 GB and touch lines choose only the floor's video.
2. **The thread line.** A desktop with four threads, plenty of memory and a strong graphics card is weak too. The
   alternative is memory and the pointer alone.
3. **The 8 GB line reads an old Chrome's capped value as weak**, so a strong machine on an old Chrome gets the wall.
   And one 8 GB machine is weak in Chrome and not weak in Firefox or Safari, which report no memory.
4. **Tablets get the wall.** Today a tablet plays 3 own loops at BALANCED, and 4 once it has climbed to FULL.
5. **A step up waits for the next floor.** A machine that climbs keeps its video until the next chapter flip or
   page. The alternative switches at once and downloads both.
6. **The health watch's numbers**: under half of the frames due, over 5 s, at least two loops counted, 3 s of grace.
   A failure is remembered for a day, and it does not move the tier.
7. **The half-size copy comes only through the wall's watch.** In the plan approved earlier, LITE started on it. Now
   LITE starts on the full-size wall, and falls to the copy when the wall's watch says so.
8. **CRF 23 for the wall** (13.4 MB for CH·01). CRF 27 is about 8 MB and shows more compression once enlarged.
9. **The 29.97 fps loops lose every fifth frame**; the alternative is a 30 fps wall, where the 24 fps loops, most of
   them, repeat every fourth frame instead.
10. **Save-Data and 2g get no wall**: 3 loops and posters, as today.
11. **Where a wall is due and cannot play, 3 own loops play**, also on a machine whose twelve loops starved.
12. **A lost context**: the floor waits 4 s for it, is built anew and not patched, plays the wall for the rest of
    the visit, and gives way to THE LIST at a second loss. The tier that was left stays closed for the session.
13. **A discarded tab opens one tier lower**, though Chrome's Memory Saver also discards idle tabs on a machine with
    memory to spare. The alternative ignores the flag.
14. **Processor pressure lowers the level** after 10 s of `serious` or `critical`. It is the whole machine's load: a
    render or an export running beside the browser lowers the site too. The alternative only holds back a step up.
15. **A page hidden for 30 s gives its videos back**, and shows posters for a moment on return.
16. **The meter's budgets**: 96 · 144 · 256 MB for a 1366×768 canvas, 45% of each growing with the canvas; two
    readings of 5 s before each shedding step; resting videos first, then one tier.
17. **The baked glow** follows the pane's slant at rest, where today's blur is even on the screen. It rests at 14%
    opacity.
18. **`?stats=1`** is the readout's address, and its panel stands at the left edge.
19. **Sleeping panes release after 20 s**; the pointed pane's loop after 5 s in the wall modes.

## 9. The local rules file

The floor's rule of 2026-11-08 is replaced by:

- **The floor's loops:** a machine that is not weak plays each pane's own loop at FULL and at BALANCED, as since
  2026-11-08 (`videoCapFor` 12). A weak machine (8 GB or less, 4 threads or fewer, or a touch screen) and any
  machine at LITE play one wall video per chapter (`public/content/walls/`) as tiles, and only the pointed pane
  decodes its own loop. So does a machine whose own loops failed their health watch, for a day. Where a wall is due
  and cannot play (a missing file, Save-Data, a 2g line), at most 3 own loops play.

And it gains:

- Under "Media from the owner": after any loop is added or replaced, or a film joins or leaves a chapter, run
  `npm run walls` and commit `public/content/walls/`. The content tests fail on a stale wall.
- Under "Laws": never destroy the wall's shared source from a pane; a tile's texture is made only after the wall
  video has presented a frame; the weak class and the hardware ceiling are worked out from the device at every start
  and never read from storage; on a lost context the floor stops its ticker and is built anew, never patched in
  place.
- Under "Verifying": `?stats=1` shows the readout; `rvlQuality.state()` reports the hardware ceiling, the weak class
  and the signal that last changed the level.

## 10. Out of scope, noted for later parts

- Building the floor only when the visitor leaves THE LIST. A direct `?view=list` load still builds it: 696 MB against
  an empty page's 334.
- The Pixi canvas's antialiasing below FULL. It changes every slanted edge and needs the owner's eye.
- The homepage and STORY taking up the ladder's live signals: a lost context on the homepage's reel, giving their
  videos and scenes back when hidden, a meter and a budget of their own. STORY's JavaScript heap is 235 to 268 MB
  (§2.7), and a rule on it belongs there.
- The floor's 2048×1024 filter targets that remain after the glows are baked (the hover's desaturation pass).
- The STORY governor's "less than 4".

## 11. Risks and unknowns

- **The laptop may not decode 1080p H.264 on its chip.** Then the wall's watch moves it to the half-size copy about
  10 s after the video starts. Stated unknown; §7.2 settles it.
- **Softness** is settled by the owner for the machines that get the wall (§4.2). The laptop test still asks how it
  looks there.
- **The health watch cannot be proven on the development PC**, which is too strong to starve its decoders. It stands
  on unit tests with made-up readings and on a forced verdict in the harness. The real reading is the old laptop's
  `OWN LOOPS` line at `?gfx=full`.
- **A wrong verdict from the health watch** costs a strong machine its sharp loops for a day. The guards are the
  buffered rule, the grace and the two-loop minimum, and `?gfx=full` shows the loops again at any time.
- **A machine that is not weak and has proved slow** may try its own loops once more after climbing back to
  BALANCED. The governor's rule that a tier left twice stays closed ends it.
- **An old Chrome's capped memory value** gives a strong machine the wall's softer panes (design call 3).
- **Processor pressure was not seen delivering a reading** (§2.7). Until one is seen on a real machine the rule is
  inert, and the stalls and the watches do its work.
- **A lost context was not caused for real.** The harness forces one through the WebGL extension. That Pixi's app
  can be destroyed while its context is lost is read from its source, and the plan runs the forced loss first.
- **The meter's texture list.** That Pixi's managed list holds the filters' targets is from reading its code. The
  plan checks the meter against the harness's count before the budgets mean anything.
- **The budgets stand on one canvas size and one day's measurements.** A budget set too low sheds on a healthy
  machine. The plan's measurements and the laptop's `MEMORY` line are the check.
- **A discarded tab's flag** cannot tell memory trouble from Memory Saver's housekeeping (design call 13).
- **Poster textures surviving a flip** is from reading Pixi's cache code, not from a measurement. The plan measures
  six flips before and after.
- **The hover clip's wasted request** is from reading the pane's code. The plan confirms it with a network log before
  removing it.
- **How much of the floor's texture memory the glows' blur holds** is not known. The plan measures after the bake.
- **Edge bleed.** The gutter and the half-pixel inset are the guard; the pixel check in §7.1 is the proof.
- **Stalls at boot.** A slow machine's first seconds have long frames. The hold, and the rule of three in 10 s, keep
  one freeze from costing a tier; the laptop's `FRAMES` line shows whether the numbers need moving.
- **Browsers without the readings.** Firefox and Safari report no device memory. Where a browser also lacks the
  pressure observer or the heap figure, the ladder rests on the thread count, the pointer, the measured frames, the
  stalls, the health watch and a lost context.
- **A wall adds a step to the owner's editing.** Forgetting it costs one pane its tile, never a wrong picture, and
  the tests say so before a push.
