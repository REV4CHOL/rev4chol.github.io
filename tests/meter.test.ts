import { GlTextureSystem, GpuTextureSystem } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';
import { heapBytes, textureBytes } from '../src/lib/meter';
import { watchPressure } from '../src/lib/pressure';

// TWO READINGS SHIP A ONLY SHOWS (spec 2026-11-24-work-wall-video-design, §4.9): what the site itself holds, and the
// processor's pressure where the browser offers it. They go to the readout (?stats=1) and decide nothing yet.

describe('the meter and the pressure reading', () => {
  const g = globalThis as Record<string, unknown>;
  afterEach(() => {
    delete g.PressureObserver;
  });

  it("the meter adds up Pixi's textures as width × height × 4", () => {
    const renderer = { texture: { managedTextures: [{ pixelWidth: 640, pixelHeight: 360 }, { pixelWidth: 2048, pixelHeight: 1024 }] } };
    expect(textureBytes(renderer)).toBe(640 * 360 * 4 + 2048 * 1024 * 4);
    expect(textureBytes({ texture: { managedTextures: [] } })).toBe(0);
    expect(textureBytes({ texture: {} })).toBe(0); // a renderer that keeps no list
    // an unloaded source leaves a hole in Pixi's list: it holds nothing
    expect(textureBytes({ texture: { managedTextures: [null, { pixelWidth: 400, pixelHeight: 225 }, null] } })).toBe(400 * 225 * 4);
  });

  it("Pixi's texture systems still serve the list the meter reads (marked deprecated since 8.15, and served)", () => {
    for (const system of [GlTextureSystem, GpuTextureSystem]) {
      expect(Object.getOwnPropertyDescriptor(system.prototype, 'managedTextures')?.get, system.name).toBeTypeOf('function');
    }
  });

  it('the heap is read where the browser reports it, and null where it does not', () => {
    const h = heapBytes();
    expect(h === null || typeof h === 'number').toBe(true);
  });

  it('without the observer, pressure is NOT OFFERED', () => {
    expect(watchPressure()()).toBe('not offered');
  });

  it('with it: NO READING until one arrives, then the latest state; an unknown state changes nothing', () => {
    let deliver: (records: Array<{ state?: unknown }>) => void = () => {};
    let watched: unknown[] = [];
    g.PressureObserver = class {
      constructor(cb: (records: Array<{ state?: unknown }>) => void) { deliver = cb; }
      observe(...a: unknown[]) { watched = a; return Promise.resolve(); }
    };
    const read = watchPressure();
    expect(watched).toEqual(['cpu', { sampleInterval: 1000 }]);
    expect(read()).toBe('no reading');
    deliver([{ state: 'nominal' }, { state: 'serious' }]);
    expect(read()).toBe('serious');
    deliver([{ state: 'melting' }]);
    expect(read()).toBe('serious');
    deliver([{ state: 'fair' }]);
    expect(read()).toBe('fair');
  });

  it('a browser that refuses the source leaves NO READING, quietly', async () => {
    g.PressureObserver = class {
      observe() { return Promise.reject(new Error('NotSupportedError')); }
    };
    const read = watchPressure();
    await Promise.resolve();
    expect(read()).toBe('no reading');
    g.PressureObserver = class {
      constructor() { throw new Error('refused'); }
    };
    expect(watchPressure()()).toBe('no reading');
  });
});
