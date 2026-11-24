import { describe, expect, it } from 'vitest';
import { hashSlug, STILL_EXTS, stillSlotUrls, wallRhythm, wallRows } from '../src/project/dossier';

describe('stills auto-discovery contract', () => {
  it('probes every format per slot, jpg first, gif included', () => {
    expect([...STILL_EXTS]).toEqual(['jpg', 'jpeg', 'png', 'webp', 'gif']);
    expect(stillSlotUrls('neon-dream', 1)).toEqual([
      '/content/projects/neon-dream/stills/01.jpg',
      '/content/projects/neon-dream/stills/01.jpeg',
      '/content/projects/neon-dream/stills/01.png',
      '/content/projects/neon-dream/stills/01.webp',
      '/content/projects/neon-dream/stills/01.gif',
    ]);
    expect(stillSlotUrls('x', 12)[0]).toBe('/content/projects/x/stills/12.jpg');
  });
});

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

// (owner, 2026-11-24, DEATHMAN: "Notice the main.jpg, they are meant to be place in big pictures for the stills": the
//  2-2-1 rhythm gives 18 stills four full rows, and the film has five main pictures. A film may name the stills that
//  take a full row; the others pair up in order between them.)
describe("a film's own big stills", () => {
  it('a film that names none keeps the 2-2-1 rhythm', () => {
    for (const n of [0, 1, 5, 7, 18, 30]) expect(wallRows(n, [])).toEqual(wallRhythm(n));
    expect(wallRows(18)).toEqual(wallRhythm(18));
  });

  it('each named still takes a full row; the others pair up in order between them', () => {
    expect(wallRows(18, [1, 6, 9, 12, 15, 18])).toEqual(
      ['full', 'pair', 'pair', 'full', 'pair', 'full', 'pair', 'full', 'pair', 'full', 'pair', 'full'],
    );
    expect(wallRows(5, [3])).toEqual(['pair', 'full', 'pair']);
  });

  it('a still left alone before a named one, or at the end, takes a full row too', () => {
    expect(wallRows(4, [3])).toEqual(['pair', 'full', 'full']);
    expect(wallRows(4, [2])).toEqual(['full', 'full', 'pair']);
  });

  it('every still is placed once, whatever is named (numbers outside the wall are ignored)', () => {
    for (const big of [[1], [2, 3], [0, 99], [18], [1, 2, 3, 4]]) {
      for (let n = 0; n <= 20; n++) {
        const rows = wallRows(n, big);
        expect(rows.reduce((s, k) => s + (k === 'pair' ? 2 : 1), 0)).toBe(n);
      }
    }
  });
});
