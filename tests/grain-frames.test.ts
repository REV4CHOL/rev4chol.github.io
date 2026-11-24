import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dataUrlBytes } from '../src/lib/data-url';

// The owner, 2026-11-25: "I am using phone. The performance when scrolling the Work section is super laggy". The grain
// re-deals its frame every 90 ms at FULL by writing the frame into the layer's style. The frames were data: URLs, a
// tile of noise at the screen's ratio: about 100 KB of text, parsed again at every re-deal (about 3 ms of script a time
// on a slowed phone profile, measured, on both the WORK strip and a film page). The same PNG bytes now stand behind a
// short blob: URL; the picture does not change.

describe("the grain's frames", () => {
  it('a data: URL gives back its own bytes and type', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 250, 255]);
    const url = 'data:image/png;base64,' + Buffer.from(png).toString('base64');
    const got = dataUrlBytes(url);
    expect(got.type).toBe('image/png');
    expect([...got.bytes]).toEqual([...png]);
  });

  it('a URL that is not base64 data gives nothing', () => {
    expect(dataUrlBytes('data:,hello').bytes.length).toBe(0);
    expect(dataUrlBytes('blob:http://x/1').bytes.length).toBe(0);
  });

  it('the grain writes its frames as blob: URLs (the CSP lets img-src take blob:)', () => {
    const grain = readFileSync('src/shell/grain.ts', 'utf8');
    expect(grain).toMatch(/URL\.createObjectURL/);
    expect(readFileSync('src/lib/csp.ts', 'utf8')).toMatch(/img-src[^"]*blob:/);
  });
});
