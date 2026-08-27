export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Drag/inertia/rubber-band camera. pos is the camera offset applied to the world. */
export class PanController {
  pos = { x: 0, y: 0 };
  dragging = false;
  lastGestureDist = 0;
  private vel = { x: 0, y: 0 };
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
    this.last = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.el.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const now = performance.now();
    const dx = e.clientX - this.last.x;
    const dy = e.clientY - this.last.y;
    const dt = Math.max(1, now - this.last.t);
    this.pos.x += dx;
    this.pos.y += dy;
    this.lastGestureDist += Math.hypot(dx, dy);
    if (this.inertia) this.vel = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
    this.last = { x: e.clientX, y: e.clientY, t: now };
  };

  private onUp = () => {
    this.dragging = false;
  };

  panBy(dx: number, dy: number): void {
    this.pos.x += dx;
    this.pos.y += dy;
  }

  panTo(x: number, y: number): void {
    this.pos.x = x;
    this.pos.y = y;
    this.vel = { x: 0, y: 0 };
  }

  tick(): void {
    if (!this.dragging) {
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;
      this.vel.x *= 0.92;
      this.vel.y *= 0.92;
      if (Math.abs(this.vel.x) < 0.01) this.vel.x = 0;
      if (Math.abs(this.vel.y) < 0.01) this.vel.y = 0;
    }
    const cx = clamp(this.pos.x, this.bounds.minX, this.bounds.maxX);
    const cy = clamp(this.pos.y, this.bounds.minY, this.bounds.maxY);
    if (this.dragging) {
      // resist while dragging past the edge
      this.pos.x = cx + (this.pos.x - cx) * 0.35;
      this.pos.y = cy + (this.pos.y - cy) * 0.35;
    } else {
      // spring home
      this.pos.x += (cx - this.pos.x) * 0.14;
      this.pos.y += (cy - this.pos.y) * 0.14;
    }
  }
}
