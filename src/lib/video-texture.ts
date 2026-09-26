import { Texture, VideoSource } from 'pixi.js';

/** The one way a <video> becomes a texture — the floor's panes and the homepage reel. Two rules, both learned from
 *  "every video loop … lagging" (owner, 2026-09-27):
 *
 *  - The texture re-uploads when the video presents a NEW frame — Pixi's default (requestVideoFrameCallback), left
 *    alone on purpose, so a 24 fps loop costs 24 uploads a second on any display. Never give its source an
 *    `updateFPS`: Pixi 8's VideoSource.updateFrame ignores that throttle, and setting it moves the texture onto the
 *    shared ticker — an upload on every display refresh. The floor carried `= 30` for a month believing it halved
 *    the uploads; it multiplied them (ten loops: 600 a second at 60 Hz, 1,200 on the owner's 120 Hz desktop, for
 *    ~250 new frames), and when the GPU runs short the video decoders starve first.
 *  - The page owns play and pause, never the texture (`autoPlay: false`). Pixi's default plays a video itself when
 *    it becomes playable; a pane woken and put back to sleep before its loop could play (the pointer crossing it, a
 *    quick drag) was restarted that way and decoded hidden for the rest of the visit — nine of them after a sweep
 *    across the live floor, nineteen loops decoding for ten on screen. */
export function videoTexture(v: HTMLVideoElement): Texture {
  return new Texture({ source: new VideoSource({ resource: v, autoPlay: false }) });
}
