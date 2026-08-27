import { Container, Text } from 'pixi.js';
import { mulberry32 } from '../lib/rng';
import { GLYPHS } from '../lib/scramble';

/** Drifting ASCII columns ringing the void edges of the floor. */
export class AsciiRain extends Container {
  private cols: Text[] = [];
  private clock = 0;
  private rand: () => number;

  constructor(bounds: { minX: number; maxX: number; minY: number; maxY: number }, seed = 42) {
    super();
    this.rand = mulberry32(seed);
    const n = 26;
    const rx = (bounds.maxX - bounds.minX) / 2;
    const ry = (bounds.maxY - bounds.minY) / 2;
    const cx = (bounds.maxX + bounds.minX) / 2;
    const cy = (bounds.maxY + bounds.minY) / 2;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const t = new Text({
        text: this.column(),
        style: { fontFamily: 'Geist Mono', fontSize: 13, fill: 0xc8ff00, lineHeight: 15 },
      });
      t.alpha = 0.1 + this.rand() * 0.12;
      t.anchor.set(0.5, 0);
      t.position.set(
        cx + Math.cos(angle) * rx * (0.92 + this.rand() * 0.2),
        cy + Math.sin(angle) * ry * (0.92 + this.rand() * 0.2),
      );
      this.cols.push(t);
      this.addChild(t);
    }
  }

  private column(): string {
    const len = 4 + Math.floor(this.rand() * 9);
    let s = '';
    for (let i = 0; i < len; i++) s += GLYPHS[Math.floor(this.rand() * GLYPHS.length)] + '\n';
    return s;
  }

  tick(dtMs: number): void {
    this.clock += dtMs;
    if (this.clock < 90) return;
    this.clock = 0;
    const t = this.cols[Math.floor(this.rand() * this.cols.length)];
    t.text = this.column();
  }
}
