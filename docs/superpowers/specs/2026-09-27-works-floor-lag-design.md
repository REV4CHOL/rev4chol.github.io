# Works floor: the loops' lag — design (2026-09-27)

The owner: "Optimise the work section's performance. It only takes seconds before every video loop on that section lagging up".

## What was found

**How it was measured.**

- Chrome 153, driven over the DevTools pipe on the owner's PC (RTX 5080), against the live site and the dev build.
- The owner's display: 3840 × 2160 at 150 %, so the floor's canvas is 3840 × 2160.
- Per second, the probe records:
  - the floor's frames;
  - every video texture upload;
  - each loop's frames presented and decoded;
  - how far each loop's clock advanced against the wall clock ("1.00" means real time).

**How loops lag.**

- When the browser's GPU process runs out of headroom, the hardware video decoders starve first. Every loop freezes or crawls while the floor itself keeps drawing.
- This was reproduced by running the floor unthrottled, which saturates the GPU process: the shipped loops advanced at 0–4 % of real time.

**Where the floor's GPU work goes.** Capacity is the frame rate at 4K when unthrottled:

| Floor | Capacity | GPU work per frame |
|---|---|---|
| As shipped, idle | 669 fps | 1.49 ms |
| As shipped, after the pointer has crossed every pane once | 486 fps | 2.06 ms |
| Loops upload only their new frames | 2,465 fps | 0.41 ms |
| … and faded glows hidden, after crossing every pane | 2,454 fps | 0.41 ms |
| … and no glows at all (reference only) | 3,847 fps | 0.26 ms |

### Defect 1: every loop re-uploads on every display refresh

- `tile.ts` sets `updateFPS = 30` on each loop's texture. Commit 5a4d9fc meant it to upload "~24 frames/s instead of 60".
- Pixi 8.20.1's `VideoSource.updateFrame` ignores that throttle. Once `updateFPS` is set, the texture joins the shared ticker and re-uploads on every tick.
- So the setting did the opposite of its intent. It replaced Pixi's default (upload when the video presents a new frame, via `requestVideoFrameCallback`) with an upload on every display refresh.
- For ten loops, that is:
  - 600 uploads a second at 60 Hz;
  - 1,200 at 120 Hz (the owner's desktop);
  - 2,400 at 240 Hz;
  - all for about 250 new frames a second.
- Uploads were most of the floor's GPU work: 1.08 of 1.49 ms a frame.
- The homepage reel (`hero.ts`) carries the same line.

### Defect 2: every pane the pointer touches keeps a blur running

- A pane's underglow is a sprite with a `BlurFilter` (eight passes).
- Hover raises it; leaving fades it back to 0.
- But Pixi runs a visible object's filters every frame, and alpha 0 still counts as visible: `collectRenderables` checks visible, renderable and culled, not alpha.
- So every pane the pointer has crossed adds eight blur passes to every frame for the rest of the visit. The floor grows heavier the longer anyone looks around.
- Crossing every pane once cost 38 % more GPU work per frame.

### What did not reproduce here

- This PC has so much headroom that the lag did not appear at a normal frame rate. The shipped floor kept every loop at real time:
  - at 60 Hz, idle, over 30 s on the live site;
  - with the pointer sweeping the panes, resting on one, and parked;
  - with the page paced at 120, 144 and 240 Hz.
- A machine with less headroom reaches the stall sooner, for example:
  - a laptop;
  - a 5K Mac at 2× (5120 × 2880);
  - Safari, whose video-to-WebGL copy is a synchronous round trip to its GPU process.
- Both defects multiply the work by the display's refresh rate and by the time spent looking around.

**Ruled out.**

- The network: the live loops arrive at about 4.5 MB/s, so the visible floor is fully downloaded in about 3 s.
- The play set: it is stable, with no wake/sleep churn.
- Decoder fallback: all ten loops decode in hardware (`D3D11VideoDecoder`).

## The design

Two fixes, each invisible on screen.

1. **`src/lib/video-texture.ts`: `videoTexture(v)`.**
   - This is the one way a `<video>` becomes a texture, for the floor's tiles and the homepage reel.
   - It is Pixi's default: the texture uploads when the video presents a new frame, never on the display's clock.
   - No `updateFPS` appears anywhere in `src/`, and the module says why.
2. **`src/works/glow.ts`: `PaneGlow`.**
   - This is a pane's underglow and its fades.
   - It stands hidden whenever it is fully faded, so its blur runs only while it can be seen.
   - Featured panes rest lit at 0.14 as before, and the hover raises every glow to 0.4 as before.

## Tests

- **`tests/video-texture.test.ts`:** Pixi's real `VideoSource` over a stand-in `<video>`.
  - Two seconds of a 120 Hz display upload nothing.
  - 48 presented frames upload 48 times.
  - A paused loop uploads nothing.
  - No `updateFPS` appears in `src/`, and both call sites use `videoTexture`.
  - Red before the fix (240 uploads from the ticks alone).
- **`tests/glow.test.ts`:**
  - A glow faded to nothing stands hidden.
  - Rising, it shows from its first frame.
  - A featured glow rests lit.
  - A fade cut short by a new hover stays shown.
  - Red before the fix.

## Verification

- Capacity at 4K, idle and after crossing every pane, must match the "fixed" rows above.
- The owner's session replay (idle, sweep, rest, park) must keep every loop at real time.
- Uploads must equal presented frames.
- A hovered pane and the resting featured glows must look the same before and after.
