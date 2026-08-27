import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bounds, PanController } from '../src/works/input';

// PanController only touches the DOM via el.addEventListener/setPointerCapture, so we
// build a minimal fake element that records the listeners it's given, then invoke those
// listeners directly with plain pointer-event-shaped objects to drive gestures.
type FakeEvent = { clientX?: number; clientY?: number; pointerId?: number; target?: unknown };
type Listener = (e: FakeEvent) => void;

function makeController(
  bounds: Bounds,
  inertia = true,
  setPointerCapture: (pointerId: number) => void = () => {},
) {
  const listeners: Record<string, Listener> = {};
  const el = {
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
    setPointerCapture,
  } as unknown as HTMLElement;
  const pan = new PanController(el, bounds, inertia);
  return { pan, listeners };
}

function fireDown(
  listeners: Record<string, Listener>,
  x: number,
  y: number,
  pointerId = 1,
  target?: unknown,
) {
  listeners.pointerdown({ clientX: x, clientY: y, pointerId, target });
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

describe('PanController pointer capture', () => {
  it('pointer capture falls back safely and never breaks the drag', () => {
    // el.setPointerCapture is wired to record every call and then throw, so this test can
    // assert two things at once: (1) capture is attempted on el rather than the down-target,
    // and (2) a throwing setPointerCapture doesn't break the drag. Node has no real DOM, so a
    // plain-object stand-in for the canvas can never satisfy `instanceof Element` the way a
    // real <canvas> would in the browser — asserting the fallback-to-el path is therefore the
    // honest thing to test here, rather than pretending we can simulate capture landing on the
    // canvas from a Node test.
    const elCalls: number[] = [];
    const elSetPointerCapture = vi.fn((pointerId: number) => {
      elCalls.push(pointerId);
      throw new Error('setPointerCapture is not supported on this fake element');
    });
    const { pan, listeners } = makeController(WIDE, true, elSetPointerCapture);

    const fakeCanvasTarget = {
      setPointerCapture: vi.fn(),
    };

    expect(() => fireDown(listeners, 0, 0, 7, fakeCanvasTarget)).not.toThrow();

    // fakeCanvasTarget is a plain object, not `instanceof Element`, so onDown must fall back
    // to capturing on el instead of the (fake) down-target.
    expect(elSetPointerCapture).toHaveBeenCalledTimes(1);
    expect(elCalls).toEqual([7]);
    expect(fakeCanvasTarget.setPointerCapture).not.toHaveBeenCalled();

    // The throw from el.setPointerCapture must be swallowed: drag state still initializes,
    // and subsequent moves still accumulate normally.
    expect(pan.dragging).toBe(true);
    fireMove(listeners, 50, 30);
    expect(pan.pos.x).toBeCloseTo(50, 5);
    expect(pan.pos.y).toBeCloseTo(30, 5);
  });

  it('captures on the down-target when it is a real Element, not on el', () => {
    // The test above can only prove the el-fallback path, because Node's `node` test
    // environment has no global `Element` — a plain-object target can never satisfy
    // `e.target instanceof Element`, so that test would stay green even if the primary
    // target-based capture branch in onDown silently regressed to always using el. Here we
    // stub a minimal global `Element` so the target-based branch actually runs, and assert
    // capture lands on the target, not on el.
    class FakeElement {
      calls = 0;
      setPointerCapture() {
        this.calls++;
      }
    }
    const prevElement = (globalThis as Record<string, unknown>).Element;
    (globalThis as Record<string, unknown>).Element = FakeElement;
    try {
      const elSetPointerCapture = vi.fn();
      const { pan, listeners } = makeController(WIDE, true, elSetPointerCapture);
      const target = new FakeElement();

      fireDown(listeners, 0, 0, 7, target);

      expect(target.calls).toBe(1);
      expect(elSetPointerCapture).not.toHaveBeenCalled();
      expect(pan.dragging).toBe(true);
    } finally {
      (globalThis as Record<string, unknown>).Element = prevElement;
    }
  });
});
