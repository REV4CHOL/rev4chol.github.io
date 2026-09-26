import { Texture } from 'pixi.js';

/** The one way a <video> becomes a texture — the floor's panes and the homepage reel.
 *
 *  Pixi's default is left alone on purpose: the texture re-uploads when the video presents a NEW frame
 *  (requestVideoFrameCallback), so a 24 fps loop costs 24 uploads a second on any display. Never give its source an
 *  `updateFPS`: Pixi 8's VideoSource.updateFrame ignores that throttle, and setting it moves the texture onto the
 *  shared ticker — an upload on every display refresh. The floor carried `= 30` for a month believing it halved the
 *  uploads; it multiplied them (ten loops: 600 a second at 60 Hz, 1,200 on the owner's 120 Hz desktop, for ~250 new
 *  frames), and when the GPU runs short the video decoders starve first — "every video loop … lagging" (owner,
 *  2026-09-27). */
export function videoTexture(v: HTMLVideoElement): Texture {
  return Texture.from(v);
}
