import { readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The owner, 2026-11-24, of XIÊU LÒNG's footage wall (27 stills then): "Remove still 6, still 22. still 27." and "bring
// the bottom half stills up to the top, then the top half stills to the bottom". The three went; of the 24 left, the
// lower twelve (old 14 to 26) now open the wall as 01 to 12 and the upper twelve (old 01 to 13) follow as 13 to 24,
// each half in its own order. The wall reads the folder by number, so the files carry the order.
const DIR = 'public/content/projects/xieu-long/stills/';
const size = (f: string) => statSync(DIR + f).size;

describe("XIÊU LÒNG's footage wall (owner)", () => {
  const files = readdirSync(DIR).sort();

  it('24 stills, numbered 01 to 24 with no gap (the wall stops at the first missing number)', () => {
    expect(files).toEqual(Array.from({ length: 24 }, (_, i) => `${String(i + 1).padStart(2, '0')}.jpg`));
  });

  it('the old lower half opens the wall and the old upper half follows (the files, by their sizes in bytes)', () => {
    expect(size('01.jpg')).toBe(139843); // was 14
    expect(size('12.jpg')).toBe(221691); // was 26
    expect(size('13.jpg')).toBe(95924); // was 01
    expect(size('24.jpg')).toBe(207771); // was 13
  });

  it('the three stills taken out are gone', () => {
    const sizes = files.map(size);
    for (const gone of [77362, 140875, 98684]) expect(sizes).not.toContain(gone); // were 06, 22, 27
  });
});
