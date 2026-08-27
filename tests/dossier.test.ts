import { describe, expect, it } from 'vitest';
import { barcodeSvg, hashSlug, specimenCodes, wallRhythm } from '../src/project/dossier';

describe('specimen codes', () => {
  it('are deterministic — the dossier never changes between visits', () => {
    expect(specimenCodes('neon-dream')).toEqual(specimenCodes('neon-dream'));
    expect(hashSlug('neon-dream')).toBe(hashSlug('neon-dream'));
  });

  it('differ per slug — every film gets its own paperwork', () => {
    const a = specimenCodes('neon-dream');
    const b = specimenCodes('static-hymn');
    expect(a.code).not.toBe(b.code);
    expect(a.sig).not.toBe(b.sig);
    expect(a.bars).not.toEqual(b.bars);
  });

  it('keeps barcode stripes printable: 28 stripes, widths 1–4', () => {
    const { bars } = specimenCodes('chrome-orchard');
    expect(bars).toHaveLength(28);
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
    }
  });
});

describe('footage-wall rhythm', () => {
  it('follows pair, pair, full — the 2-2-1 breathing cycle', () => {
    expect(wallRhythm(5)).toEqual(['pair', 'pair', 'full']);
    expect(wallRhythm(10)).toEqual(['pair', 'pair', 'full', 'pair', 'pair', 'full']);
  });

  it('promotes a lone leftover still to a full-bleed row', () => {
    expect(wallRhythm(1)).toEqual(['full']);
    expect(wallRhythm(3)).toEqual(['pair', 'full']);
    expect(wallRhythm(7)).toEqual(['pair', 'pair', 'full', 'pair']);
    expect(wallRhythm(6)).toEqual(['pair', 'pair', 'full', 'full']);
  });

  it('consumes exactly n stills for any count', () => {
    for (let n = 0; n <= 24; n++) {
      const rows = wallRhythm(n);
      const used = rows.reduce((s, r) => s + (r === 'pair' ? 2 : 1), 0);
      expect(used).toBe(n);
    }
    expect(wallRhythm(0)).toEqual([]);
  });
});

describe('barcode svg', () => {
  it('draws one rect per stripe and sizes the viewBox to the print width', () => {
    const svg = barcodeSvg([2, 1, 3], 22);
    expect(svg.match(/<rect /g)).toHaveLength(3);
    // width = 2+1+3 stripes + 2 gaps of 1 = 8
    expect(svg).toContain('viewBox="0 0 8 22"');
  });
});
