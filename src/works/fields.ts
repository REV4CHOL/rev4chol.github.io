import { Container, Graphics, Matrix } from 'pixi.js';

const SIGNAL = 0xc8ff00;
const FIELD = 0x2418ff;
const ALERT = 0xff2e63;
const FLOURISH = 0xb79cff;
const BONE = 0xedede6;

export interface CarpetBounds { minX: number; maxX: number; minY: number; maxY: number }

/** Chevron: a solid arrow with a notched tail, pointing +x. */
function chevron(g: Graphics, x: number, y: number, w: number, h: number, t: number): void {
  g.poly([x, y, x + w, y + h / 2, x, y + h, x + t, y + h / 2]);
}

function cross(g: Graphics, x: number, y: number, r: number, t: number): void {
  g.rect(x - r, y - t / 2, r * 2, t);
  g.rect(x - t / 2, y - r, t, r * 2);
}

/** Hard-edged graphic furniture on the floor plane, drawn in the same 2:1 basis
 *  as the carpet so it lies on the same ground.
 *
 *  RULE: the void is the ground, not a backdrop to be painted over. Everything
 *  here is a committed shape at full alpha with a hard edge, sized and placed to
 *  RING the carpet — never a large translucent wash, which is what turned the
 *  whole viewport ultramarine and left the palette nowhere to sit. */
export function buildFields(b: CarpetBounds): Container {
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  // radius of the carpet expressed in floor units: (u,v) -> (u - v, (u + v)/2)
  const R = Math.max((b.maxX - b.minX) / 4, (b.maxY - b.minY) / 2);

  const c = new Container();
  c.setFromMatrix(new Matrix(1, 0.5, -1, 0.5, cx, cy));

  const g = new Graphics();

  // --- 1. flat ultramarine slab, upper right. one committed plane, hard edges.
  g.rect(0.62 * R, -2.15 * R, 1.45 * R, 1.62 * R).fill({ color: FIELD, alpha: 1 });
  g.rect(0.62 * R, -0.57 * R, 1.45 * R, 7).fill({ color: BONE, alpha: 0.9 });
  g.rect(0.62 * R, -2.15 * R, 7, 1.62 * R).fill({ color: SIGNAL, alpha: 0.9 });

  // --- 2. HUD rings. hairlines, not atmosphere.
  g.ellipse(0, 0, 1.58 * R, 1.58 * R).stroke({ color: SIGNAL, alpha: 0.8, width: 3 });
  g.ellipse(0, 0, 1.66 * R, 1.66 * R).stroke({ color: SIGNAL, alpha: 0.28, width: 1 });
  g.arc(0, 0, 1.30 * R, Math.PI * 0.62, Math.PI * 1.18)
    .stroke({ color: ALERT, alpha: 0.95, width: 22 });
  g.arc(0, 0, 2.05 * R, Math.PI * 1.22, Math.PI * 1.86)
    .stroke({ color: FLOURISH, alpha: 0.55, width: 9 });

  // --- 3. chevron track, lower left. reads as direction, like the refs' arrow rails.
  for (let i = 0; i < 11; i++) {
    const u = -2.0 * R + i * 0.15 * R;
    chevron(g, u, 0.95 * R, 0.11 * R, 0.13 * R, 0.045 * R);
  }
  g.fill({ color: SIGNAL, alpha: 0.95 });

  // --- 4. checkerboard strip, upper left.
  const cw = 0.075 * R;
  for (let i = 0; i < 18; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2) continue;
      g.rect(-2.05 * R + i * cw, -1.35 * R + j * cw, cw, cw);
    }
  }
  g.fill({ color: BONE, alpha: 0.85 });

  // --- 5. registration marks + tick rail.
  for (const [x, y] of [
    [-1.75 * R, -0.45 * R],
    [1.85 * R, 0.75 * R],
    [-0.35 * R, 1.55 * R],
    [1.20 * R, -1.30 * R],
  ]) {
    cross(g, x, y, 0.075 * R, 3);
  }
  for (let i = 0; i < 40; i++) {
    const u = -2.0 * R + i * 0.1 * R;
    g.rect(u, -1.62 * R, 2, i % 5 === 0 ? 0.07 * R : 0.032 * R);
  }
  g.fill({ color: ALERT, alpha: 0.85 });

  c.addChild(g);
  return c;
}
