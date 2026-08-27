import { Container, Graphics, Text } from 'pixi.js';
import { mulberry32 } from '../lib/rng';
import { GX, GY, cellToWorld } from './constants';
import { isStreet, Placed } from './layout';

/** Static floor furniture: faint iso grid + scattered HUD micro-labels. */
export function buildDebris(placed: Placed[], seed = 796): Container {
  const c = new Container();
  const rand = mulberry32(seed);

  let minC = 0, maxC = 0, minR = 0, maxR = 0;
  for (const p of placed) {
    minC = Math.min(minC, p.col - 2);
    maxC = Math.max(maxC, p.col + 3);
    minR = Math.min(minR, p.row - 2);
    maxR = Math.max(maxR, p.row + 3);
  }

  const g = new Graphics();
  for (let col = minC; col <= maxC; col++) {
    for (let row = minR; row <= maxR; row++) {
      const { x, y } = cellToWorld(col, row);
      g.moveTo(x, y - GY * 0.5)
        .lineTo(x + GX * 0.5, y)
        .lineTo(x, y + GY * 0.5)
        .lineTo(x - GX * 0.5, y)
        .closePath();
    }
  }
  g.stroke({ color: 0xc8ff00, alpha: 0.045, width: 1 });
  c.addChild(g);

  for (let col = minC; col <= maxC; col++) {
    for (let row = minR; row <= maxR; row++) {
      if (!isStreet(col, row) || rand() < 0.82) continue;
      const { x, y } = cellToWorld(col, row);
      const t = new Text({
        text: `SDR${Math.floor(rand() * 90) + 10}·${Math.floor(rand() * 9000) + 1000}`,
        style: { fontFamily: 'Martian Mono', fontSize: 8, fill: 0xedede6, letterSpacing: 2 },
      });
      t.alpha = 0.22;
      t.anchor.set(0.5);
      t.position.set(x, y);
      t.skew.set(-0.3, 0.15);
      c.addChild(t);
    }
  }
  return c;
}
