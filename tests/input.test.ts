import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bounds, PanController, ZoomHost } from '../src/works/input';

// PanController only touches the DOM via el.addEventListener/setPointerCapture, so we
// build a minimal fake element that records the listeners it's given, then invoke those
// listeners directly with plain pointer-event-shaped objects to drive gestures.
type FakeEvent = {
  clientX?: number;
  clientY?: number;
  pointerId?: number;
  target?: unknown;
  timeStamp?: number;
};
type Listener = (e: FakeEvent) => void;

function makeController(
  bounds: Bounds,
  inertia = true,
  setPointerCapture: (pointerId: number) => void = () => {},
  zoom?: ZoomHost,
) {
  const listeners: Record<string, Listener> = {};
  const el = {
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
    setPointerCapture,
  } as unknown as HTMLElement;
  const pan = new PanController(el, bounds, inertia, zoom);
  return { pan, listeners };
}

/** Minimal zoom host: a mutable scale + fixed screen center, like the works world provides. */
function makeZoom(center = { x: 100, y: 100 }, s = 1) {
  const state = { s };
  const host: ZoomHost = {
    get: () => state.s,
    set: (v: number) => {
      state.s = v;
    },
    center: () => center,
  };
  return { host, state };
}

function fireDown(
  listeners: Record<string, Listener>,
  x: number,
  y: number,
  pointerId = 1,
  target?: unknown,
  timeStamp?: number,
) {
  listeners.pointerdown({ clientX: x, clientY: y, pointerId, target, timeStamp });
}
function fireMove(
  listeners: Record<string, Listener>,
  x: number,
  y: number,
  pointerId?: number,
  timeStamp?: number,
) {
  listeners.pointermove({ clientX: x, clientY: y, pointerId, timeStamp });
}
function fireUp(listeners: Record<string, Listener>, pointerId?: number, timeStamp?: number) {
  listeners.pointerup({ pointerId, timeStamp });
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

describe('PanController multi-touch safety (the mobile fling bug)', () => {
  it('ignores a second finger completely: its moves add no pan delta', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);

    fireDown(listeners, 0, 0, 1);
    clock.advance(16);
    fireMove(listeners, 10, 10, 1);
    expect(pan.pos.x).toBeCloseTo(10, 5);

    // second finger lands far away (a pinch attempt) — must not become a 300px "delta"
    clock.advance(16);
    fireDown(listeners, 300, 300, 2);
    clock.advance(16);
    fireMove(listeners, 310, 310, 2);
    expect(pan.pos.x).toBeCloseTo(10, 5);
    expect(pan.pos.y).toBeCloseTo(10, 5);

    // the first finger keeps panning from ITS OWN last position, not finger 2's
    clock.advance(16);
    fireMove(listeners, 20, 20, 1);
    expect(pan.pos.x).toBeCloseTo(20, 5);
    expect(pan.pos.y).toBeCloseTo(20, 5);
  });

  it('a second finger landing mid-drag does not reset gesture distance', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);
    fireDown(listeners, 0, 0, 1);
    clock.advance(16);
    fireMove(listeners, 40, 0, 1);
    const distBefore = pan.lastGestureDist;
    fireDown(listeners, 200, 200, 2); // stray finger
    expect(pan.lastGestureDist).toBe(distBefore); // a tap-guard reset here would misfire tile opens
  });

  it('never coasts to extreme distances after a two-finger interleave', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);
    fireDown(listeners, 200, 300, 1);
    clock.advance(16);
    fireDown(listeners, 80, 140, 2);
    // both fingers move in the same hardware scan: near-zero time between events
    for (let i = 0; i < 8; i++) {
      clock.advance(16);
      fireMove(listeners, 200 + i * 3, 300 + i * 3, 1, 16 * i);
      clock.advance(0.5);
      fireMove(listeners, 80 - i * 3, 140 - i * 3, 2, 16 * i + 0.5);
    }
    fireUp(listeners, 1);
    fireUp(listeners, 2);

    const atRelease = { ...pan.pos };
    for (let i = 0; i < 150; i++) pan.tick(16.667);
    const coast = Math.hypot(pan.pos.x - atRelease.x, pan.pos.y - atRelease.y);
    expect(coast).toBeLessThan(1000);
  });

  it('hands the drag to a remaining finger without a position jump when the first lifts', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);
    fireDown(listeners, 0, 0, 1);
    clock.advance(16);
    fireMove(listeners, 10, 0, 1);
    fireDown(listeners, 500, 500, 2);
    clock.advance(16);
    fireUp(listeners, 1); // first finger lifts, second still down
    expect(pan.dragging).toBe(true);
    clock.advance(16);
    fireMove(listeners, 510, 500, 2); // second finger moves 10px
    expect(pan.pos.x).toBeCloseTo(20, 5); // 10 (finger 1) + 10 (finger 2), no 500px teleport
  });
});

describe('PanController velocity sanity (burst-delivered events)', () => {
  it('derives velocity from event timeStamps, so coalesced bursts do not inflate it', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);
    fireDown(listeners, 200, 500, 1, undefined, 0);
    clock.advance(16);
    fireMove(listeners, 200, 480, 1, 16);
    // main-thread jank: the next samples are DELIVERED in one burst (clock frozen),
    // but their hardware timeStamps show honest 16ms spacing
    fireMove(listeners, 200, 456, 1, 32);
    fireMove(listeners, 200, 432, 1, 48);
    fireMove(listeners, 200, 408, 1, 64);
    fireUp(listeners, 1, 70);

    const atRelease = { ...pan.pos };
    for (let i = 0; i < 150; i++) pan.tick(16.667);
    const coast = Math.abs(pan.pos.y - atRelease.y);
    // honest vel is ~24px/frame -> ~300px coast; the 1ms-dt bug gave ~384px/frame -> ~4800px
    expect(coast).toBeGreaterThan(100);
    expect(coast).toBeLessThan(600);
  });

  it('caps release velocity so no gesture can eject the camera more than ~a screen away', () => {
    const clock = stubClock(0);
    const { pan, listeners } = makeController(WIDE, true);
    fireDown(listeners, 0, 0, 1);
    clock.advance(16);
    fireMove(listeners, 400, 0, 1); // absurd 400px in 16ms
    clock.advance(10);
    fireUp(listeners, 1);

    const atRelease = pan.pos.x;
    for (let i = 0; i < 200; i++) pan.tick(16.667);
    expect(pan.pos.x - atRelease).toBeLessThan(1000);
  });
});

describe('PanController pinch zoom', () => {
  it('two fingers spreading symmetrically doubles the scale and holds the camera still', () => {
    stubClock(0);
    const { host, state } = makeZoom({ x: 100, y: 100 });
    const { pan, listeners } = makeController(WIDE, true, () => {}, host);

    fireDown(listeners, 80, 100, 1);
    fireDown(listeners, 120, 100, 2); // d = 40, mid (100,100) = screen center
    fireMove(listeners, 60, 100, 1, 16);
    fireMove(listeners, 140, 100, 2, 16); // d = 80, mid unchanged

    expect(state.s).toBeCloseTo(2, 5);
    // fingers report sequentially, so the midpoint wiggles a few px mid-pinch —
    // the camera must stay essentially centered, not drift with the zoom
    expect(Math.abs(pan.pos.x)).toBeLessThan(6);
    expect(Math.abs(pan.pos.y)).toBeLessThan(6);
  });

  it('zooms about the finger midpoint: the world point under the fingers stays put', () => {
    stubClock(0);
    const { host, state } = makeZoom({ x: 0, y: 0 });
    const { pan, listeners } = makeController(WIDE, true, () => {}, host);

    fireDown(listeners, 100, 0, 1);
    fireDown(listeners, 200, 0, 2); // d = 100, mid (150,0)
    fireMove(listeners, 300, 0, 2, 16); // d = 200 -> s 2, mid (200,0)

    // zoom compensation: pos' = mid - C - (mid - C - pos) * 2 at the OLD mid... the
    // implementation applies zoom at the new mid then pans by the mid movement:
    // raw = 200 - (200 - 0)*2 = -200, then mid moved 150->200 pans +50 -> -150
    expect(state.s).toBeCloseTo(2, 5);
    expect(pan.pos.x).toBeCloseTo(-150, 3);
  });

  it('clamps scale to [0.5, 2]', () => {
    stubClock(0);
    const { host, state } = makeZoom();
    const { listeners } = makeController(WIDE, true, () => {}, host);

    fireDown(listeners, 90, 100, 1);
    fireDown(listeners, 110, 100, 2); // d = 20
    fireMove(listeners, 0, 100, 1, 16);
    fireMove(listeners, 375, 100, 2, 32); // d = 375 -> raw factor 18.75
    expect(state.s).toBe(2);

    fireMove(listeners, 99, 100, 1, 48);
    fireMove(listeners, 101, 100, 2, 64); // d = 2 -> collapse
    expect(state.s).toBe(0.5);
  });

  it('honors a host-provided zoom-out floor (small screens see a desktop-wide view)', () => {
    stubClock(0);
    const { host, state } = makeZoom();
    host.min = () => 0.2; // a 375px phone matching a ~1920px desktop view
    const { listeners } = makeController(WIDE, true, () => {}, host);

    fireDown(listeners, 90, 100, 1);
    fireDown(listeners, 110, 100, 2); // d = 20
    fireMove(listeners, 99, 100, 1, 16);
    fireMove(listeners, 101, 100, 2, 32); // d = 2 -> collapse toward the floor
    expect(state.s).toBeCloseTo(0.2, 5);
  });

  it('a pinch can never read as a tap', () => {
    stubClock(0);
    const { host } = makeZoom();
    const { pan, listeners } = makeController(WIDE, true, () => {}, host);
    fireDown(listeners, 90, 100, 1);
    fireDown(listeners, 110, 100, 2);
    fireUp(listeners, 2);
    fireUp(listeners, 1);
    expect(pan.lastGestureDist).toBeGreaterThan(8);
  });

  it('pan bounds scale with zoom so a zoomed-in floor can pan proportionally further', () => {
    stubClock(0);
    const bounds: Bounds = { minX: -500, maxX: 500, minY: -500, maxY: 500 };
    const { host } = makeZoom({ x: 100, y: 100 }, 1);
    const { pan, listeners } = makeController(bounds, true, () => {}, host);

    // zoom to 2x with a symmetric pinch (camera stays at 0)
    fireDown(listeners, 80, 100, 1);
    fireDown(listeners, 120, 100, 2);
    fireMove(listeners, 60, 100, 1, 16);
    fireMove(listeners, 140, 100, 2, 16);
    fireUp(listeners, 2, 20);
    fireUp(listeners, 1, 24);
    pan.panTo(0, 0); // discard the pinch's few-px midpoint residual

    // drag 1200px right: raw 1200 vs scaled bound 1000 -> rubber = 1000 + 200*0.35
    fireDown(listeners, 0, 0, 1, undefined, 100);
    fireMove(listeners, 1200, 0, 1, 116);
    expect(pan.pos.x).toBeCloseTo(1070, 1);
  });

  it('lifting one pinch finger returns to a clean one-finger drag', () => {
    stubClock(0);
    const { host, state } = makeZoom({ x: 100, y: 100 });
    const { pan, listeners } = makeController(WIDE, true, () => {}, host);

    fireDown(listeners, 80, 100, 1);
    fireDown(listeners, 120, 100, 2);
    fireMove(listeners, 60, 100, 1, 16);
    fireMove(listeners, 140, 100, 2, 16);
    expect(state.s).toBeCloseTo(2, 5);
    fireUp(listeners, 1, 30); // active finger lifts; finger 2 survives
    expect(pan.dragging).toBe(true);

    const before = pan.pos.x;
    fireMove(listeners, 150, 100, 2, 46); // 10px drag, no teleport, no further zoom
    expect(pan.pos.x - before).toBeCloseTo(10, 3);
    expect(state.s).toBeCloseTo(2, 5);
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
