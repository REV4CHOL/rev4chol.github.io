import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bounds, PanController } from '../src/works/input';

// PanController only touches the DOM via el.addEventListener/setPointerCapture, so we
// build a minimal fake element that records the listeners it's given, then invoke those
// listeners directly with plain pointer-event-shaped objects to drive gestures.
type FakeEvent = { clientX?: number; clientY?: number; pointerId?: number };
type Listener = (e: FakeEvent) => void;

function makeController(bounds: Bounds, inertia = true) {
  const listeners: Record<string, Listener> = {};
  const el = {
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
    setPointerCapture: () => {},
  } as unknown as HTMLElement;
  const pan = new PanController(el, bounds, inertia);
  return { pan, listeners };
}

function fireDown(listeners: Record<string, Listener>, x: number, y: number, pointerId = 1) {
  listeners.pointerdown({ clientX: x, clientY: y, pointerId });
}
function fireMove(listeners: Record<string, Listener>, x: number, y: number) {
  listeners.pointermove({ clientX: x, clientY: y });
}
function fireUp(listeners: Record<string, Listener>) {
  listeners.pointerup({});
}

/** Deterministic stand-in for performance.now(), since PanController reads it directly. */
function stubClock(start = 0) {
  let t = start;
  vi.spyOn(performance, 'now').mockImplementation(() => t);
  return {
    advance: (ms: number) => {
      t += ms;
    },
    set: (v: number) => {
      t = v;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

const WIDE: Bounds = { minX: -1_000_000, maxX: 1_000_000, minY: -1_000_000, maxY: 1_000_000 };

describe('PanController dt-independence', () => {
  it('settles to ~the same position whether ticked at 60x16.667ms or 30x33.333ms', () => {
    const bounds: Bounds = { minX: -500, maxX: 500, minY: -500, maxY: 500 };
    const clock = stubClock(0);

    const runFling = (ticks: number, dtMs: number) => {
      clock.set(0);
      const { pan, listeners } = makeController(bounds, true);
      fireDown(listeners, 0, 0);
      clock.advance(50);
      fireMove(listeners, 500, 0); // dx=500 over 50ms -> vel = (500/50)*16 = 160 px/frame
      clock.advance(10); // well under the 80ms stale-velocity cutoff
      fireUp(listeners);
      for (let i = 0; i < ticks; i++) pan.tick(dtMs);
      return pan.pos.x;
    };

    const posA = runFling(60, 16.667); // ~1000ms simulated at a 60Hz-equivalent tick rate
    const posB = runFling(30, 33.333); // ~1000ms simulated at a 30Hz-equivalent tick rate

    expect(Math.abs(posA - posB)).toBeLessThan(1.5);
  });
});

describe('PanController distance-proportional rubber band', () => {
  it('shows ~35px overshoot for a 100px overdrag whether dragged slowly or quickly', () => {
    const bounds: Bounds = { minX: -500, maxX: 500, minY: -500, maxY: 500 };

    const overshootFor = (steps: number) => {
      const { pan, listeners } = makeController(bounds, true);
      fireDown(listeners, 0, 0);
      const dxPerStep = 600 / steps; // drag 100px past maxX(500)
      let x = 0;
      for (let i = 0; i < steps; i++) {
        x += dxPerStep;
        fireMove(listeners, x, 0);
        pan.tick(16.667); // a real ticker fires every frame regardless of pointer events
      }
      return pan.pos.x - bounds.maxX;
    };

    const slow = overshootFor(60); // many small moves, ~1s worth of frames
    const fast = overshootFor(1); // one big jump, a single frame

    expect(slow).toBeGreaterThan(34);
    expect(slow).toBeLessThan(36);
    expect(fast).toBeGreaterThan(34);
    expect(fast).toBeLessThan(36);
  });

  it('tracks pos exactly equal to raw while inside bounds', () => {
    const bounds: Bounds = { minX: -500, maxX: 500, minY: -500, maxY: 500 };
    const { pan, listeners } = makeController(bounds, true);
    fireDown(listeners, 0, 0);
    fireMove(listeners, 200, -80);
    expect(pan.pos.x).toBeCloseTo(200, 5);
    expect(pan.pos.y).toBeCloseTo(-80, 5);
  });
});

describe('PanController stale-velocity guard', () => {
  it('drops velocity if the pointer sat still for >80ms before release', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);

    fireDown(listeners, 0, 0);
    clock.advance(16);
    fireMove(listeners, 50, 0);
    clock.advance(16);
    fireMove(listeners, 150, 0);
    clock.advance(16);
    fireMove(listeners, 300, 0); // fast moves, vel = 150 px/frame right before the pause
    clock.advance(200); // holds still for 200ms
    fireUp(listeners);

    const posAfterRelease = pan.pos.x;
    for (let i = 0; i < 5; i++) pan.tick(16.667);

    expect(Math.abs(pan.pos.x - posAfterRelease)).toBeLessThan(1);
  });

  it('keeps velocity (coasts) when release follows the last move within 80ms', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);

    fireDown(listeners, 0, 0);
    clock.advance(16);
    fireMove(listeners, 160, 0); // vel = 160 px/frame
    clock.advance(10); // well under the cutoff
    fireUp(listeners);

    const posAfterRelease = pan.pos.x;
    pan.tick(16.667);

    expect(pan.pos.x - posAfterRelease).toBeGreaterThan(50);
  });
});

describe('PanController panBy/panTo', () => {
  it('panBy zeroes velocity so a live fling does not fight a keyboard nudge', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);
    fireDown(listeners, 0, 0);
    clock.advance(16);
    fireMove(listeners, 160, 0); // vel = 160 px/frame
    clock.advance(10);
    fireUp(listeners);

    pan.panBy(5, 0);
    const afterPanBy = pan.pos.x;
    pan.tick(16.667);

    expect(Math.abs(pan.pos.x - afterPanBy)).toBeLessThan(0.01);
  });

  it('panTo zeroes velocity', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);
    fireDown(listeners, 0, 0);
    clock.advance(16);
    fireMove(listeners, 160, 0);
    clock.advance(10);
    fireUp(listeners);

    pan.panTo(42, 7);
    pan.tick(16.667);

    expect(pan.pos.x).toBeCloseTo(42, 5);
    expect(pan.pos.y).toBeCloseTo(7, 5);
  });
});

describe('PanController inertia disabled', () => {
  it('never coasts after release', () => {
    const { pan, listeners } = makeController(WIDE, false);
    fireDown(listeners, 0, 0);
    fireMove(listeners, 300, 0);
    fireUp(listeners);

    const posAfterRelease = pan.pos.x;
    for (let i = 0; i < 10; i++) pan.tick(16.667);

    expect(Math.abs(pan.pos.x - posAfterRelease)).toBeLessThan(0.01);
  });
});
