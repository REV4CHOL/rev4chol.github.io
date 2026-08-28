/* World geometry. Values marked TUNE may be adjusted during visual passes —
   the exported names and shapes are the contract and must not change. */
export const CARD_W = 400;
export const CARD_H = 225;
export const ISO = { a: 0.8, b: 0.4, c: -0.8, d: 0.4 }; // TUNE — resting 2:1 shear
export const HOVER_M = { a: 1.18, b: 0, c: 0, d: 1.18 }; // upright, magnified
export const SIZE_MUL_LARGE = 2; // large = exactly 2×2 cells so the carpet stays seamless
export const SEAM = 8; // TUNE — card-space gap between tiles (the only air in the carpet)
export const WORLD_PAD = 220;

export const STEP_W = CARD_W + SEAM;
export const STEP_H = CARD_H + SEAM;

/** Lattice basis = the card's own projected edges, so tiles butt edge-to-edge
    into one contiguous floor (the floor796 read) instead of floating apart. */
export function cellToWorld(col: number, row: number): { x: number; y: number } {
  return {
    x: ISO.a * STEP_W * col + ISO.c * STEP_H * row,
    y: ISO.b * STEP_W * col + ISO.d * STEP_H * row,
  };
}

/** World position from a continuous u-offset (card-space px along the row
    axis) and a row index — the packed-carpet mapping, where mixed-width
    panes (4:3 beside 16:9) sit brick-tight instead of on fixed columns. */
export function rowAxisWorld(u: number, vRow: number): { x: number; y: number } {
  return {
    x: ISO.a * u + ISO.c * STEP_H * vRow,
    y: ISO.b * u + ISO.d * STEP_H * vRow,
  };
}
