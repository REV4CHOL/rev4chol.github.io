# STORY without a graphics chip — design (2026-10-11)

The owner, on "STORY's city renders on the main processor and froze the page for about 87 seconds ... a visitor with
graphics acceleration off would see the same freeze. I can look into it if you want":

- "Yep, do both of these for me"

## What was found

- **Measured** in Chrome 155 on a machine without a GPU. Chrome draws there with SwiftShader, its software renderer,
  as it does wherever graphics acceleration is off or the GPU is blocklisted. The built STORY, at 1440 × 900:

  | Phase | Time |
  |---|---|
  | the city's build (`mountCity3D`, on the main thread) | 5.2 s, once |
  | the first frame to the second | 87 s |
  | every frame after | 15 to 17 s |
  | the page's own JavaScript per frame | 18 to 47 ms |

- **The city was already at its floor.** The site's LITE caps it at `low`: a third of the pixels (480 × 300), no
  shadows, no point lights. Even so, each frame carries 4.5 million triangles, 155,000 points and 439 draw calls,
  through four passes.
- **The time is the software renderer drawing triangles.** The page's own work per frame is milliseconds, and the 58
  shader programs cost nothing measurable on the page's thread. Between frames the page answers nothing: no click, no
  scroll.
- **The governor cannot help.** It shrinks the pixels and steps the tier, and it already stood at the floor of both. A
  frame made of triangles does not shrink with its pixels.
- **A browser with no WebGL at all is worse.** The renderer throws, the boot's catch takes the failure for a stale
  deploy and reloads the page once, and the page then stays black under the chrome.
- **The site already knows a software renderer by its name** (`quality.ts`'s `SOFTWARE_GPU`: SwiftShader, llvmpipe,
  Microsoft Basic Render Driver) and opens it at LITE.

## Design

### 1. The gate (`src/about/city-gate.ts`)

- Before anything of the city loads, STORY asks what the browser draws with. It opens one throwaway context for the
  renderer's name, and one strict context (`failIfMajorPerformanceCaveat`) that a browser refuses on software. Both are
  released at once.
- The answers:
  - **live:** a graphics chip. The page is exactly today's.
  - **still:** a software renderer, by its name or by the refused strict context.
  - **no-3d:** no WebGL at all.

### 2. The still page

- **The still** stands in the canvas's seat. It is `public/content/story/still.jpg`, one frame of the live city: its
  opening drift at night, at the desktop's opening tier (high, the screen's own pixels), 1920 × 1080. It is read
  straight off the renderer, so no chrome is baked in; the vignette, the nav and the HUD sit over it as over the city.
- **The hint's seat says why, in plain words:**
  - `THIS BROWSER HAS NO GRAPHICS ACCELERATION, SO THE LIVE CITY WOULD FREEZE IT ▪ HERE IS A STILL OF THE CITY`;
  - with no WebGL: `THIS BROWSER CANNOT DRAW 3D ▪ HERE IS A STILL OF THE CITY`.
- **The dial's seat offers `LOAD THE LIVE CITY ANYWAY`** (not on no-3d). It loads the city as a GPU would, with
  `LOADING THE LIVE CITY ▪ ON THIS BROWSER IT WILL BE VERY SLOW` meanwhile, and the still leaves once the city is
  built.
- **The still is lock-exempt like the canvas** (counter-zoomed to true viewport pixels). It is placed before the lock
  arms.
- **The film layers stay off it, as off the live city.** The site's grain and scanlines once crawled over the city's
  dark glass (the owner: "the whole city is having this window glitch"), and the still is that same glass.
- **The city's code (`city3d`, three.js, 874 KB) is not fetched** unless the live city is asked for.

### 3. The guide

- HOW-TO-EDIT says what the still is, where it lives, and how to replace it.

## Tests

- `city-gate.test.ts`:
  - GPU names fly the live city: NVIDIA, Intel, AMD, Apple, Adreno, Mali, and a browser that keeps the name to itself;
  - software names, and the performance caveat, show the still;
  - no WebGL shows the still, with nothing to load;
  - the four lines are pinned;
  - the still is a 1920 × 1080 JPEG under 450 KB;
  - `story.ts` asks the gate before the lock, and exempts the still with the canvas.

## Verification

- The build in Chrome on this machine, which has no GPU:
  - STORY shows the still and the line at once, and answers at once;
  - the smoke check of 9 pages at 1440 × 900, 1920 × 1080 and on a 390 × 844 touch phone is clean, STORY included;
  - `LOAD THE LIVE CITY ANYWAY` builds the city: the dial comes back and the ride is set.
- With a GPU it cannot be reproduced here. The gate's live path is the old `armFlight`, unchanged, and the tests cover
  the names.
- The same on the live site after the Pages deploy.

## Design calls for the owner

- **A still, not a lighter city.** A city light enough for a CPU (about 50,000 triangles for a usable frame rate)
  would be another city.
- **The lines' wording.**
- **The still's frame:** the opening drift at night, at high.
- **`LOAD THE LIVE CITY ANYWAY` is offered:** some CPUs are strong enough to crawl through it, and it is the visitor's
  choice to make.
