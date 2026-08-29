export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

/**
 * Lets the pan controller drive a camera zoom without knowing the renderer: `get`/`set`
 * the current scale, `center` is the screen point the world container is anchored to.
 * The controller keeps the world point under the fingers fixed while scale changes.
 */
export interface ZoomHost {
  get(): number;
  set(s: number): void;
  center(): { x: number; y: number };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Release velocity ceiling, px per 60Hz frame. A vigorous human flick peaks around
 * 40–50; the cap only exists so a mis-sampled gesture can never eject the camera
 * (70 px/frame coasts ~875px total — about two phone screens, never "lost in the void").
 */
const MAX_VEL = 70;

/** Pinch zoom range: 0.5 shows the whole neighborhood, 2 reads a pane full-screen on a phone. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

/** Drag/inertia/rubber-band camera. pos is the camera offset applied to the world. */
export class PanController {
  pos = { x: 0, y: 0 };
  dragging = false;
  lastGestureDist = 0;
  private vel = { x: 0, y: 0 };
  /** Unclamped drag position — the rubber band is a fixed 35% of (raw - clamp), not a per-frame decay. */
  private raw = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  /** Event-time clock (same origin as performance.now()) of the last processed sample. */
  private lastStamp = 0;
  /** The single pointer that owns the pan — every other finger is ignored for deltas. */
  private activeId: number | null = null;
  /** Every live pointer, so a lifted first finger can hand the drag to a survivor. */
  private touches = new Map<number, { x: number; y: number }>();
  /** Finger distance of the pinch in progress, or null when not pinching. */
  private pinchDist: number | null = null;

  constructor(
    private el: HTMLElement,
    private bounds: Bounds,
    private inertia = true,
    private zoomHost?: ZoomHost,
  ) {
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
  }

  /** Camera bounds in screen px scale with the zoom (world extents shrink when zoomed out). */
  private b(): Bounds {
    const s = this.zoomHost?.get() ?? 1;
    return {
      minX: this.bounds.minX * s,
      maxX: this.bounds.maxX * s,
      minY: this.bounds.minY * s,
      maxY: this.bounds.maxY * s,
    };
  }

  /**
   * Event timeStamp shares performance.now()'s origin and carries the HARDWARE sample
   * time, so bursts of queued-up moves delivered in one task still show their honest
   * spacing. Handler-run time (the old clock) made those bursts look 1ms apart and
   * inflated release velocity up to 16x — the mobile fling bug.
   */
  private stamp(e: PointerEvent): number {
    return e.timeStamp || performance.now();
  }

  private onDown = (e: PointerEvent) => {
    const id = e.pointerId ?? 0;
    this.touches.set(id, { x: e.clientX, y: e.clientY });
    // capture on the actual down-target (the Pixi canvas), not this.el: capturing on the
    // parent retargets pointerup away from the canvas, which makes Pixi treat every up as
    // "outside" and kills pointertap on tiles. Captured events still bubble through this.el.
    // (Element is guarded the same way src/lib/env.ts guards `window` — this file's tests
    // run under vitest's plain `node` environment, which has no DOM globals at all.)
    const target = typeof Element !== 'undefined' && e.target instanceof Element ? e.target : this.el;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointers can't be captured — dragging still works */
    }
    // extra fingers must not restart or steer the one-finger drag — but exactly two
    // fingers begin a pinch: zoom + pan by the midpoint from here on
    if (this.dragging && this.activeId !== null && id !== this.activeId) {
      if (this.zoomHost && this.touches.size === 2) {
        const [p1, p2] = [...this.touches.values()];
        this.pinchDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        this.last = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        this.lastStamp = this.stamp(e);
        this.vel = { x: 0, y: 0 };
        this.lastGestureDist += 10; // a pinch is never a tap
      }
      return;
    }
    this.activeId = id;
    this.dragging = true;
    this.lastGestureDist = 0;
    this.vel = { x: 0, y: 0 };
    this.raw = { ...this.pos };
    this.last = { x: e.clientX, y: e.clientY };
    this.lastStamp = this.stamp(e);
  };

  private onMove = (e: PointerEvent) => {
    const id = e.pointerId ?? this.activeId;
    const t = id !== null ? this.touches.get(id) : undefined;
    if (t) { t.x = e.clientX; t.y = e.clientY; }
    if (this.pinchDist !== null && this.touches.size >= 2 && t) {
      this.movePinch(this.stamp(e));
      return;
    }
    if (!this.dragging || id !== this.activeId) return;
    const now = this.stamp(e);
    this.applyDelta(e.clientX - this.last.x, e.clientY - this.last.y, now - this.lastStamp);
    this.last = { x: e.clientX, y: e.clientY };
    this.lastStamp = now;
  };

  /** Zoom by the finger-distance ratio about the midpoint, then pan by the midpoint drift. */
  private movePinch(now: number): void {
    const [p1, p2] = [...this.touches.values()];
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    if (this.zoomHost && this.pinchDist! > 0 && d > 0) {
      const sOld = this.zoomHost.get();
      const sNew = clamp(sOld * (d / this.pinchDist!), MIN_SCALE, MAX_SCALE);
      if (sNew !== sOld) {
        // keep the world point under the fingers stationary while the scale changes:
        // world = (mid - C - pos) / s  =>  pos' = mid - C - world * s'
        const C = this.zoomHost.center();
        const k = sNew / sOld;
        this.raw.x = mid.x - C.x - (mid.x - C.x - this.raw.x) * k;
        this.raw.y = mid.y - C.y - (mid.y - C.y - this.raw.y) * k;
        this.zoomHost.set(sNew);
      }
    }
    this.pinchDist = d;
    this.applyDelta(mid.x - this.last.x, mid.y - this.last.y, now - this.lastStamp);
    this.last = mid;
    this.lastStamp = now;
  }

  private applyDelta(dx: number, dy: number, dt: number): void {
    this.raw.x += dx;
    this.raw.y += dy;
    this.lastGestureDist += Math.hypot(dx, dy);
    // dt < 4ms means two samples from (near) the same instant — a velocity read there
    // is noise; keep the previous sample instead. The cap bounds whatever remains.
    if (this.inertia && dt >= 4) {
      let vx = (dx / dt) * 16;
      let vy = (dy / dt) * 16;
      const mag = Math.hypot(vx, vy);
      if (mag > MAX_VEL) {
        vx *= MAX_VEL / mag;
        vy *= MAX_VEL / mag;
      }
      this.vel = { x: vx, y: vy };
    }
    // Rubber band is distance-proportional: overshoot shown is always 35% of the actual
    // overshoot distance, so it's constant regardless of how fast or in how many steps
    // the drag covered that distance. pos === raw exactly while inside bounds.
    const b = this.b();
    const clampX = clamp(this.raw.x, b.minX, b.maxX);
    const clampY = clamp(this.raw.y, b.minY, b.maxY);
    this.pos.x = clampX + (this.raw.x - clampX) * 0.35;
    this.pos.y = clampY + (this.raw.y - clampY) * 0.35;
  }

  private onUp = (e: PointerEvent) => {
    const id = e.pointerId ?? this.activeId;
    if (id !== null) this.touches.delete(id);
    if (this.touches.size < 2) this.pinchDist = null;
    if (id !== this.activeId) return; // a helper finger lifted; the drag continues untouched
    // hand the drag to a surviving finger with no position jump and no inherited velocity
    const next = this.touches.entries().next();
    if (!next.done) {
      const [nid, npos] = next.value;
      this.activeId = nid;
      this.last = { x: npos.x, y: npos.y };
      this.lastStamp = this.stamp(e);
      this.vel = { x: 0, y: 0 };
      return;
    }
    this.activeId = null;
    this.dragging = false;
    // A pointer that sat still before release leaves a stale, possibly-seconds-old
    // velocity in this.vel (it's only ever written on move) — don't fling from it.
    if (this.stamp(e) - this.lastStamp > 80) {
      this.vel = { x: 0, y: 0 };
    }
  };

  /** Remove the host listeners — required before mounting a new world on the same host. */
  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onUp);
    this.touches.clear();
  }

  panBy(dx: number, dy: number): void {
    this.pos.x += dx;
    this.pos.y += dy;
    this.raw.x += dx;
    this.raw.y += dy;
    this.vel = { x: 0, y: 0 };
  }

  panTo(x: number, y: number): void {
    this.pos.x = x;
    this.pos.y = y;
    this.vel = { x: 0, y: 0 };
  }

  /**
   * Advance physics by dtMs of real time (default: one 60Hz frame). Friction, spring-home
   * and the resulting coast distance are all expressed relative to that 60Hz reference frame
   * and scaled by dtMs/16.667, so behavior no longer depends on the ticker's actual rate.
   */
  tick(dtMs = 16.667): void {
    if (!this.dragging) {
      const steps = dtMs / 16.667;
      this.pos.x += this.vel.x * steps;
      this.pos.y += this.vel.y * steps;
      this.vel.x *= Math.pow(0.92, steps);
      this.vel.y *= Math.pow(0.92, steps);
      if (Math.abs(this.vel.x) < 0.01) this.vel.x = 0;
      if (Math.abs(this.vel.y) < 0.01) this.vel.y = 0;
      const b = this.b();
      const cx = clamp(this.pos.x, b.minX, b.maxX);
      const cy = clamp(this.pos.y, b.minY, b.maxY);
      const spring = 1 - Math.pow(1 - 0.14, steps);
      this.pos.x += (cx - this.pos.x) * spring;
      this.pos.y += (cy - this.pos.y) * spring;
    }
  }
}
