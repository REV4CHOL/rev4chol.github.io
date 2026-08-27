import { describe, expect, it } from 'vitest';
import { BAYER4, bayerDither, hexToRgb } from '../src/lib/dither';

function gray(v: number, w = 4, h = 4): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  return d;
}

const DARK: [number, number, number] = [6, 6, 6];
const LIGHT: [number, number, number] = [200, 255, 0];

describe('hexToRgb', () => {
  it('parses hex colors', () => {
    expect(hexToRgb('#C8FF00')).toEqual([200, 255, 0]);
    expect(hexToRgb('#060606')).toEqual([6, 6, 6]);
  });
});

describe('bayerDither', () => {
  it('maps black to all-dark and white to all-light', () => {
    const black = gray(0);
    bayerDither(black, 4, 4, DARK, LIGHT);
    expect([black[0], black[1], black[2]]).toEqual(DARK);

    const white = gray(255);
    bayerDither(white, 4, 4, DARK, LIGHT);
    expect([white[0], white[1], white[2]]).toEqual(LIGHT);
  });

  it('mid gray follows the Bayer matrix pattern exactly', () => {
    const mid = gray(128);
    bayerDither(mid, 4, 4, DARK, LIGHT);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * 4 + x) * 4;
        const threshold = ((BAYER4[y][x] + 0.5) / 16) * 255;
        const expected = 128 > threshold ? LIGHT : DARK;
        expect([mid[i], mid[i + 1], mid[i + 2]], `cell ${x},${y}`).toEqual(expected);
      }
    }
  });

  it('keeps alpha at 255', () => {
    const d = gray(90);
    bayerDither(d, 4, 4, DARK, LIGHT);
    expect(d[3]).toBe(255);
  });
});
