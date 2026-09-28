import { glUploadVideoResource, Texture, VideoSource } from 'pixi.js';

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

/** THE FRAMELESS FIRST UPLOAD (owner, 2026-09-28: "homepage right now have blackout loops, cant see the videos").
 *  Pixi 8.20's video uploader allocates and fills the GL texture in ONE texImage2D(video). A video that has its
 *  metadata but no decoded frame yet — the reel's clips resolve at loadedmetadata; every clip is rewound (a seek)
 *  the instant it comes on — makes that call fail: nothing is allocated, Pixi still records the size, and every later
 *  frame is a texSubImage2D onto nothing (Chrome: "glCopySubTextureCHROMIUM: The destination level of the destination
 *  texture must be defined", once per frame) — the clip is black for the whole visit. Until the video holds a frame,
 *  allocate a 1×1 black and leave the recorded size stale, so the first real frame re-allocates. (The floor's panes
 *  also gate their sprite on a presented frame; the reel now does too — this is the floor under both.) */
const uploadVideo = glUploadVideoResource.upload;
glUploadVideoResource.upload = function (source, glTexture, gl, webGLVersion, targetOverride, forceAllocation) {
  const v = source.resource as unknown;
  const unallocated = glTexture.width !== source.pixelWidth || glTexture.height !== source.pixelHeight;
  if (unallocated && v instanceof HTMLVideoElement && v.readyState < v.HAVE_CURRENT_DATA) {
    const target = targetOverride ?? glTexture.target;
    gl.texImage2D(target, 0, glTexture.internalFormat, 1, 1, 0, glTexture.format, glTexture.type, null);
    glTexture.width = 1;
    glTexture.height = 1;
    return;
  }
  uploadVideo.call(glUploadVideoResource, source, glTexture, gl, webGLVersion, targetOverride, forceAllocation);
};
