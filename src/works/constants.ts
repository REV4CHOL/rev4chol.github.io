/* World geometry. Values marked TUNE may be adjusted during visual passes —
   the exported names and shapes are the contract and must not change. */
export const CARD_W = 400;
export const CARD_H = 225;
export const ISO = { a: 0.8, b: 0.4, c: -0.8, d: 0.4 }; // TUNE — resting 2:1 shear
export const HOVER_M = { a: 1.18, b: 0, c: 0, d: 1.18 }; // upright, magnified
export const HOVER_LIFT = 26; // the awake card rises this far off the floor (card units)
export const SIZE_MUL_LARGE = 2; // every pane = exactly 2×2 cells (the featured size, for all since the owner's equal-panes rule) so the carpet stays seamless
export const SEAM = 8; // TUNE — card-space gap between tiles (the only air in the carpet)
export const WORLD_PAD = 220;

export const STEP_W = CARD_W + SEAM;
export const STEP_H = CARD_H + SEAM;

/** A pane's card: the carpet's row height, the width its film's ratio gives (400 for 16:9, 300 for 4:3, 538 for
    scope); a tall pane (a vertical film's, layout.ts) is two rows and the seam between them high — 258 × 458 at 9:16. */
export function cardSize(ratio: number, tall: boolean): { cw: number; ch: number } {
  const ch = tall ? 2 * CARD_H + SEAM : CARD_H;
  return { cw: Math.round(ch * ratio), ch };
}

/** The hover's scale on HOVER_M for a card `ch` units high at the floor's `zoom`: upright and lifted, it stands at most
    84% of the screen's height, so a tall pane's whole frame shows; never more than the plain lift. */
export function hoverFit(ch: number, sizeMul: number, zoom: number, screenH: number): number {
  return Math.min(1, (screenH * 0.84) / (ch * sizeMul * HOVER_M.d * zoom));
}

/** The hover's scale on HOVER_M that fits the upright card into a box `boxW` × `boxH` screen px at the floor's
    `zoom`; never more than the plain lift (the review's walkthroughs, 2026-09-30: pinched in, a phone's preview stood wider than
    its screen). */
export function hoverFitIn(cw: number, ch: number, sizeMul: number, zoom: number, boxW: number, boxH: number): number {
  return Math.min(1, boxW / (cw * sizeMul * HOVER_M.a * zoom), boxH / (ch * sizeMul * HOVER_M.d * zoom));
}

/** A touch screen's preview stands under the header and the switches… */
const PREVIEW_TOP = 132;
/** …and over the caption's room and the chapter tabs. */
const PREVIEW_FOOT = 232;

/** The box a lifted preview must fit, in screen px. A mouse lifts a pane where it lies: the box is the screen less the
    margins the tall pane always had. A touch screen has no pointer to follow, so the pane comes to the box's middle:
    between the header and the caption's room over the chapter tabs; at least 40% of a short screen's height. */
export function previewBox(screenW: number, screenH: number, coarse: boolean): { x: number; y: number; w: number; h: number } {
  if (!coarse) return { x: screenW * 0.04, y: screenH * 0.08, w: screenW * 0.92, h: screenH * 0.84 };
  return { x: screenW * 0.04, y: PREVIEW_TOP, w: screenW * 0.92, h: Math.max(screenH * 0.4, screenH - PREVIEW_TOP - PREVIEW_FOOT) };
}

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
