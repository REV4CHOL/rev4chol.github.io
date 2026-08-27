import { Container, Matrix, Sprite, Text, Texture } from 'pixi.js';
import type { Project } from '../lib/content';
import { CARD_H, CARD_W, ISO, SIZE_MUL_LARGE, cellToWorld } from './constants';
import type { Placed } from './layout';

export type TileMode = 'sleep' | 'live' | 'hover';

export class ProjectTile extends Container {
  readonly project: Project;
  readonly placed: Placed;
  readonly card = new Container();
  readonly m = { ...ISO }; // live matrix state — tweened for hover/enter
  readonly sizeMul: number;
  mode: TileMode = 'sleep';
  posterSprite: Sprite;

  constructor(project: Project, placed: Placed, posterCanvas: HTMLCanvasElement) {
    super();
    this.project = project;
    this.placed = placed;
    this.sizeMul = placed.span === 2 ? SIZE_MUL_LARGE : 1;
    const { x, y } = cellToWorld(placed.col, placed.row);
    this.position.set(x, y);
    this.zIndex = placed.col + placed.row;

    this.posterSprite = new Sprite(Texture.from(posterCanvas));
    this.posterSprite.anchor.set(0.5);
    this.posterSprite.width = CARD_W;
    this.posterSprite.height = CARD_H;
    this.card.addChild(this.posterSprite);

    const id = new Text({
      text: `${project.year} · ${project.slug}`.toUpperCase(),
      style: { fontFamily: 'Martian Mono', fontSize: 9, fill: project.accent, letterSpacing: 2 },
    });
    id.alpha = 0.55;
    id.position.set(-CARD_W / 2, CARD_H / 2 + 10);
    this.card.addChild(id);

    this.addChild(this.card);
    this.applyMatrix();
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  applyMatrix(): void {
    const s = this.sizeMul;
    this.card.setFromMatrix(new Matrix(this.m.a * s, this.m.b * s, this.m.c * s, this.m.d * s, 0, 0));
  }

  extentX(): number {
    return ((Math.abs(this.m.a) * CARD_W + Math.abs(this.m.c) * CARD_H) / 2) * this.sizeMul;
  }

  extentY(): number {
    return ((Math.abs(this.m.b) * CARD_W + Math.abs(this.m.d) * CARD_H) / 2) * this.sizeMul;
  }
}
