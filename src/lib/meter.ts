/** THE METER: what the site itself holds (spec 2026-11-24-work-wall-video-design, §4.9). No browser tells a page how
 *  much of the machine's memory is free, so the site adds up its own: the textures Pixi has uploaded, and the
 *  JavaScript heap where the browser reports it. It cannot see the video decoders or the graphics process's own
 *  memory, which are the larger part: this guards against the site's own growth and is no reading of the machine.
 *
 *  SHIP A SHOWS IT (the readout, `?stats=1`), against the budget (lib/quality.ts budgetFor). Nothing is shed over the
 *  budget until ship B. */

/** A renderer's list of managed texture sources. The WebGL and WebGPU renderers keep one; Pixi's canvas renderer,
 *  which the site never asks for, keeps none. A source that was unloaded leaves a hole in the list (Pixi 8.20 keeps
 *  them in a hash and nulls the entry), and holds nothing. Pixi marks this list as deprecated since 8.15 and still
 *  serves it: tests/meter.test.ts reads it from a real texture system, so an upgrade that drops it is seen there. */
type Managed = ReadonlyArray<{ pixelWidth: number; pixelHeight: number } | null>;

/** Bytes of the textures a renderer manages, each counted as width × height × 4: posters, video frames, glows, and
 *  the filters' render targets. */
export function textureBytes(renderer: { texture: object }): number {
  let bytes = 0;
  for (const s of (renderer.texture as { managedTextures?: Managed }).managedTextures ?? []) {
    if (s) bytes += s.pixelWidth * s.pixelHeight * 4;
  }
  return bytes;
}

/** The JavaScript heap in bytes, where the browser reports it (`performance.memory`: Chrome and Edge); else null. */
export function heapBytes(): number | null {
  const m = (performance as Performance & { memory?: { usedJSHeapSize?: unknown } }).memory;
  return m && typeof m.usedJSHeapSize === 'number' ? m.usedJSHeapSize : null;
}
