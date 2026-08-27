/* World geometry. Values marked TUNE may be adjusted during visual passes —
   the exported names and shapes are the contract and must not change. */
export const CARD_W = 320;
export const CARD_H = 180;
export const GX = 250; // TUNE — world px per +1 col (screen-x)
export const GY = 132; // TUNE — world px per +1 (col+row) (screen-y)
export const ISO = { a: 0.8, b: 0.4, c: -0.8, d: 0.4 }; // TUNE — resting 2:1 shear
export const HOVER_M = { a: 1.18, b: 0, c: 0, d: 1.18 }; // upright, magnified
export const SIZE_MUL_LARGE = 1.6;
export const WORLD_PAD = 420;

export function cellToWorld(col: number, row: number): { x: number; y: number } {
  return { x: (col - row) * GX, y: (col + row) * GY };
}
