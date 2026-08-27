import { Container, Graphics } from 'pixi.js';
import { cellToWorld } from './constants';
import type { Placed } from './layout';

/** Faint sheared cell grid extending a couple of rings past the carpet —
    reads as the station floor the screens are mounted on. No scattered text:
    the carpet itself is the texture. */
export function buildDebris(placed: Placed[]): Container {
  const c = new Container();

  let minC = 0, maxC = 0, minR = 0, maxR = 0;
  for (const p of placed) {
    minC = Math.min(minC, p.col - 2);
    maxC = Math.max(maxC, p.col + p.span + 1);
    minR = Math.min(minR, p.row - 2);
    maxR = Math.max(maxR, p.row + p.span + 1);
  }

  const g = new Graphics();
  for (let col = minC; col <= maxC; col++) {
    for (let row = minR; row <= maxR; row++) {
      const a = cellToWorld(col - 0.5, row - 0.5);
      const b = cellToWorld(col + 0.5, row - 0.5);
      const d = cellToWorld(col + 0.5, row + 0.5);
      const e = cellToWorld(col - 0.5, row + 0.5);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(d.x, d.y).lineTo(e.x, e.y).closePath();
    }
  }
  g.stroke({ color: 0xc8ff00, alpha: 0.11, width: 1 });
  c.addChild(g);
  return c;
}
