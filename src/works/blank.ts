import { Container, Graphics, Matrix } from 'pixi.js';
import { CARD_H, CARD_W, ISO, SIZE_MUL_LARGE } from './constants';
import type { Placed } from './layout';

const BONE = 0xedede6;

/** A held place on the floor (owner 2026-09-27: "leave the original panes as they
 *  left blank, i am about to fill in two more to those two positions") — an unlit
 *  screen. Same size and seams as its neighbours, so the carpet stays whole:
 *  black glass, a faint frame, dim corner brackets, and nothing else — no poster,
 *  no loop, no label, no tag, and it never takes the pointer. */
export class BlankPane extends Container {
  readonly placed: Placed;
  readonly sizeMul: number;

  constructor(placed: Placed) {
    super();
    this.placed = placed;
    this.sizeMul = placed.span === 2 ? SIZE_MUL_LARGE : 1;
    const hw = CARD_W / 2;
    const hh = CARD_H / 2;
    const g = new Graphics();
    g.rect(-hw, -hh, CARD_W, CARD_H).fill({ color: 0x060606, alpha: 0.94 });
    g.rect(-hw, -hh, CARD_W, CARD_H).stroke({ color: BONE, alpha: 0.14, width: 1 });
    const L = 30;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      g.moveTo(sx * hw, sy * hh).lineTo(sx * hw - sx * L, sy * hh);
      g.moveTo(sx * hw, sy * hh).lineTo(sx * hw, sy * hh - sy * L);
    }
    g.stroke({ color: BONE, alpha: 0.3, width: 2 });
    const card = new Container();
    card.addChild(g);
    const s = this.sizeMul;
    card.setFromMatrix(new Matrix(ISO.a * s, ISO.b * s, ISO.c * s, ISO.d * s, 0, 0));
    this.addChild(card);
    this.zIndex = placed.col + placed.row;
    this.eventMode = 'none';
  }

  extentX(): number {
    return ((Math.abs(ISO.a) * CARD_W + Math.abs(ISO.c) * CARD_H) / 2) * this.sizeMul;
  }

  extentY(): number {
    return ((Math.abs(ISO.b) * CARD_W + Math.abs(ISO.d) * CARD_H) / 2) * this.sizeMul;
  }
}
