import { describe, expect, it } from 'vitest';
import { hashSlug, wallRhythm } from '../src/project/dossier';

describe('slug hashing', () => {
  it('is deterministic — the same film always seeds the same dossier', () => {
    expect(hashSlug('neon-dream')).toBe(hashSlug('neon-dream'));
    expect(hashSlug('neon-dream')).not.toBe(hashSlug('static-hymn'));
  });
});

describe('footage-wall rhythm', () => {
  it('follows pair, pair, full — the 2-2-1 breathing cycle', () => {
    expect(wallRhythm(5)).toEqual(['pair', 'pair', 'full']);
    expect(wallRhythm(10)).toEqual(['pair', 'pair', 'full', 'pair', 'pair', 'full']);
    expect(wallRhythm(30)).toEqual(Array(6).fill(['pair', 'pair', 'full']).flat());
  });

  it('promotes a lone leftover still to a full-bleed row', () => {
    expect(wallRhythm(1)).toEqual(['full']);
    expect(wallRhythm(3)).toEqual(['pair', 'full']);
    expect(wallRhythm(7)).toEqual(['pair', 'pair', 'full', 'pair']);
    expect(wallRhythm(6)).toEqual(['pair', 'pair', 'full', 'full']);
  });

  it('consumes exactly n stills for any count', () => {
    for (let n = 0; n <= 32; n++) {
      const rows = wallRhythm(n);
      const used = rows.reduce((s, r) => s + (r === 'pair' ? 2 : 1), 0);
      expect(used).toBe(n);
    }
    expect(wallRhythm(0)).toEqual([]);
  });
});
