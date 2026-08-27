import { Container, Graphics, Matrix } from 'pixi.js';

/** Flooded color fields on the floor plane — the reference DNA's saturated
    ultramarine disc/ring laid under the carpet like station structure, plus a
    quiet violet echo. Big, graphic, committed: fields, not noise. Drawn in a
    2:1 floor-plane basis so the shapes lie on the same ground as the tiles. */
export function buildFields(center: { x: number; y: number }): Container {
  const c = new Container();
  c.setFromMatrix(new Matrix(1, 0.5, -1, 0.5, center.x, center.y));

  const g = new Graphics();
  // main field: a deep ultramarine landing-pad disc, offset up-right of the carpet
  const dx = 420;
  const dy = -260;
  g.circle(dx, dy, 1250).fill({ color: 0x2418ff, alpha: 0.32 });
  g.circle(dx, dy, 1360).stroke({ color: 0x2418ff, alpha: 0.55, width: 64 });
  g.circle(dx, dy, 1540).stroke({ color: 0x2418ff, alpha: 0.28, width: 10 });
  g.circle(dx, dy, 1720).stroke({ color: 0x2418ff, alpha: 0.14, width: 4 });
  // violet echo arc low-left — tension/release; the second voice stays quiet
  g.arc(-980, 640, 760, Math.PI * 0.15, Math.PI * 1.05)
    .stroke({ color: 0xb79cff, alpha: 0.22, width: 34 });
  c.addChild(g);
  return c;
}
