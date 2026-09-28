import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Texture } from 'pixi.js';

type Fn = (...a: unknown[]) => void;

/** A stand-in <video>: Pixi's VideoSource only listens for play/pause/seeked, asks for frame callbacks and reads
 *  the sizes and states below. `present(n)` is the decoder putting n new frames on screen. */
class FakeVideo {
  videoWidth = 1280;
  videoHeight = 720;
  width = 0;
  height = 0;
  readyState = 1; // HAVE_METADATA: a pane builds its texture at loadedmetadata
  HAVE_ENOUGH_DATA = 4;
  HAVE_FUTURE_DATA = 3;
  HAVE_CURRENT_DATA = 2;
  paused = true;
  ended = false;
  playbackRate = 1;
  src = '/content/projects/katara/preview.mp4';
  private listeners = new Map<string, Set<Fn>>();
  private frameCbs = new Map<number, Fn>();
  private nextHandle = 1;
  addEventListener(type: string, fn: Fn): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Fn): void {
    this.listeners.get(type)?.delete(fn);
  }
  private fire(type: string): void {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn();
  }
  requestVideoFrameCallback(fn: Fn): number {
    const h = this.nextHandle++;
    this.frameCbs.set(h, fn);
    return h;
  }
  cancelVideoFrameCallback(h: number): void {
    this.frameCbs.delete(h);
  }
  play(): Promise<void> {
    this.paused = false;
    this.fire('play');
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
    this.fire('pause');
  }
  load(): void {}
  /** The download reaches `state` (3 HAVE_FUTURE_DATA, 4 HAVE_ENOUGH_DATA) and says so, as a real element does. */
  reach(state: 3 | 4): void {
    this.readyState = state;
    this.fire('canplay');
    if (state === 4) this.fire('canplaythrough');
  }
  present(n: number): void {
    for (let i = 0; i < n; i++) {
      const due = [...this.frameCbs.values()];
      this.frameCbs.clear();
      for (const fn of due) fn(0, { mediaTime: i / 24 });
    }
  }
}

let videoTexture: (v: HTMLVideoElement) => Texture;
let tick: (n: number, hz: number) => void;

beforeAll(async () => {
  // Pixi in node: its ticker asks for requestAnimationFrame, its video alpha probe for a canvas, and its source
  // detection for HTMLVideoElement — each gets a stand-in before pixi.js loads
  const g = globalThis as Record<string, unknown>;
  g.requestAnimationFrame = () => 1;
  g.cancelAnimationFrame = () => {};
  g.HTMLVideoElement = FakeVideo;
  g.document = { createElement: () => ({ getContext: () => null }) };
  ({ videoTexture } = await import('../src/lib/video-texture'));
  const { Ticker } = await import('pixi.js');
  let t = performance.now() + 1000;
  tick = (n, hz) => {
    for (let i = 0; i < n; i++) Ticker.shared.update((t += 1000 / hz));
  };
});

/** A playing loop's texture, and a counter of its uploads (every 'update' is a re-upload at the next render). */
async function playingLoop() {
  const v = new FakeVideo();
  const tex = videoTexture(v as unknown as HTMLVideoElement);
  await new Promise((r) => setTimeout(r, 0)); // Pixi's load() awaits its alpha probe
  let uploads = 0;
  tex.source.on('update', () => uploads++);
  await v.play();
  return { v, tex, uploads: () => uploads };
}

describe('a loop texture uploads its new frames, never the display clock (owner: "every video loop … lagging")', () => {
  it('two seconds of a 120 Hz display upload nothing; 48 new frames upload 48 times', async () => {
    const { v, tex, uploads } = await playingLoop();
    tick(240, 120);
    expect(uploads()).toBe(0);
    v.present(48);
    expect(uploads()).toBe(48);
    tex.destroy(true);
  });

  it('a paused loop uploads nothing, whatever the display or the decoder does', async () => {
    const { v, tex, uploads } = await playingLoop();
    v.pause();
    tick(120, 60);
    v.present(24);
    expect(uploads()).toBe(0);
    tex.destroy(true);
  });

  it('a loop put to sleep while it loads stays asleep when it becomes playable — the page owns play and pause', async () => {
    // a pane woken and slept again before its loop could play (the pointer crossing it, a quick drag) used to be
    // restarted by Pixi's autoPlay at canplay: it decoded hidden for the rest of the visit
    const v = new FakeVideo();
    const tex = videoTexture(v as unknown as HTMLVideoElement);
    await new Promise((r) => setTimeout(r, 0));
    await v.play(); // the pane wakes…
    v.pause(); // …and sleeps before its loop can play
    v.reach(3);
    v.reach(4);
    expect(v.paused).toBe(true);
    tex.destroy(true);
  });

  it('nothing in the site sets a video throttle, and both players build their textures one way', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.ts')) files.push(p);
      }
    };
    walk('src');
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\.updateFPS\s*=[^=]/);
    for (const f of ['src/works/tile.ts', 'src/home/hero.ts']) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).toMatch(/videoTexture\(/);
      expect(s, f).not.toMatch(/Texture\.from\((this\.)?video\)|Texture\.from\(v\)/);
    }
  });
});

/** Pixi's GL video uploader, as the module leaves it: a fake GL records the calls, a fake GlTexture the recorded size. */
const TEXTURE_2D = 3553, RGBA = 6408, UNSIGNED_BYTE = 5121;
const fakeGl = () => {
  const calls: unknown[][] = [];
  return { calls, texImage2D: (...a: unknown[]) => { calls.push(['texImage2D', ...a]); }, texSubImage2D: (...a: unknown[]) => { calls.push(['texSubImage2D', ...a]); } };
};
const sourceOf = (v: FakeVideo) => ({ resource: v, pixelWidth: 1280, pixelHeight: 720, resourceWidth: 1280, resourceHeight: 720, isValid: true });
const glTextureOf = (width: number, height: number) => ({ target: TEXTURE_2D, width, height, internalFormat: RGBA, format: RGBA, type: UNSIGNED_BYTE });

describe('the frameless first upload (owner 2026-09-28: "homepage right now have blackout loops")', () => {
  it('a video with its metadata but no frame yet gets a 1×1 placeholder, and the recorded size stays stale', async () => {
    const { glUploadVideoResource } = await import('pixi.js');
    const v = new FakeVideo(); // readyState 1: HAVE_METADATA
    const glTexture = glTextureOf(-1, -1);
    const gl = fakeGl();
    glUploadVideoResource.upload(sourceOf(v) as never, glTexture as never, gl as never, 2);
    expect(gl.calls).toEqual([['texImage2D', TEXTURE_2D, 0, RGBA, 1, 1, 0, RGBA, UNSIGNED_BYTE, null]]);
    expect([glTexture.width, glTexture.height], 'stale on purpose: the first real frame must re-allocate').toEqual([1, 1]);
  });

  it('the first real frame allocates at the video size (Pixi\'s own path, untouched)', async () => {
    const { glUploadVideoResource } = await import('pixi.js');
    const v = new FakeVideo();
    v.readyState = 2; // HAVE_CURRENT_DATA: a frame to upload
    const glTexture = glTextureOf(1, 1);
    const gl = fakeGl();
    glUploadVideoResource.upload(sourceOf(v) as never, glTexture as never, gl as never, 2);
    expect(gl.calls.length).toBe(1);
    expect(gl.calls[0].slice(0, 6)).toEqual(['texImage2D', TEXTURE_2D, 0, RGBA, 1280, 720]);
    expect(gl.calls[0][9]).toBe(v);
    expect([glTexture.width, glTexture.height]).toEqual([1280, 720]);
  });

  it('a clip mid-seek keeps its last frame: an allocated texture is left to Pixi (a sub-upload), never re-placeholdered', async () => {
    const { glUploadVideoResource } = await import('pixi.js');
    const v = new FakeVideo(); // readyState 1 again: the frame is gone while the seek lands
    const glTexture = glTextureOf(1280, 720);
    const gl = fakeGl();
    glUploadVideoResource.upload(sourceOf(v) as never, glTexture as never, gl as never, 2);
    expect(gl.calls.length).toBe(1);
    expect(gl.calls[0][0]).toBe('texSubImage2D');
    expect([glTexture.width, glTexture.height]).toEqual([1280, 720]);
  });

  it('the reel shows a clip only once it has presented a frame — at the start and at every cut', () => {
    const s = readFileSync('src/home/hero.ts', 'utf8');
    expect(s).toMatch(/onFrame\(clips\[0\]/);
    expect(s).toMatch(/onFrame\(cur,/);
    expect(s).not.toMatch(/c\.sprite\.visible = i === 0/);
  });
});
