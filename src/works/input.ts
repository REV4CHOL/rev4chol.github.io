export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Drag/inertia/rubber-band camera. pos is the camera offset applied to the world. */
export class PanController {
  pos = { x: 0, y: 0 };
  dragging = false;
  lastGestureDist = 0;
  private vel = { x: 0, y: 0 };
  /** Unclamped drag position — the rubber band is a fixed 35% of (raw - clamp), not a per-frame decay. */
  private raw = { x: 0, y: 0 };
  private last = { x: 0, y: 0, t: 0 };

  constructor(
    private el: HTMLElement,
    private bounds: Bounds,
    private inertia = true,
  ) {
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastGestureDist = 0;
    this.vel = { x: 0, y: 0 };
    this.raw = { ...this.pos };
    this.last = { x: e.clientX, y: e.clientY, t: performance.now() };
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
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const now = performance.now();
    const dx = e.clientX - this.last.x;
    const dy = e.clientY - this.last.y;
    const dt = Math.max(1, now - this.last.t);
    this.raw.x += dx;
    this.raw.y += dy;
    this.lastGestureDist += Math.hypot(dx, dy);
    if (this.inertia) this.vel = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
    // Rubber band is distance-proportional: overshoot shown is always 35% of the actual
    // overshoot distance, so it's constant regardless of how fast or in how many steps
    // the drag covered that distance. pos === raw exactly while inside bounds.
    const clampX = clamp(this.raw.x, this.bounds.minX, this.bounds.maxX);
    const clampY = clamp(this.raw.y, this.bounds.minY, this.bounds.maxY);
    this.pos.x = clampX + (this.raw.x - clampX) * 0.35;
    this.pos.y = clampY + (this.raw.y - clampY) * 0.35;
    this.last = { x: e.clientX, y: e.clientY, t: now };
  };

  private onUp = () => {
    this.dragging = false;
    // A pointer that sat still before release leaves a stale, possibly-seconds-old
    // velocity in this.vel (it's only ever written on move) — don't fling from it.
    if (performance.now() - this.last.t > 80) {
      this.vel = { x: 0, y: 0 };
    }
  };

  /** Remove the host listeners — required before mounting a new world on the same host. */
  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onUp);
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
      const cx = clamp(this.pos.x, this.bounds.minX, this.bounds.maxX);
      const cy = clamp(this.pos.y, this.bounds.minY, this.bounds.maxY);
      const spring = 1 - Math.pow(1 - 0.14, steps);
      this.pos.x += (cx - this.pos.x) * spring;
      this.pos.y += (cy - this.pos.y) * spring;
    }
  }
}
