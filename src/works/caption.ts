/** WHERE A PREVIEW'S CAPTION STANDS (the review's walkthroughs, 2026-09-30: the hover title "sat on the preview" or ran off the
 *  screen's edge, and on a phone it shared one spot with the legend and the count line). The caption was placed from
 *  the pane's resting size, a fixed step right of its centre: inside the lifted card at the floor's own zoom, off the
 *  screen beside a pane near the edge. Now it is placed from the lifted card itself: under it, flush with its left
 *  edge; over it when there is no room under; beside it (wrapping into the room it has) when the card fills the
 *  height; as a last resort over the picture's foot. Always whole on the screen. Pure: the label's size comes through
 *  `measure`, which the world answers from the DOM. */
export interface Box { x: number; y: number; w: number; h: number }

export type CaptionSide = 'below' | 'above' | 'right' | 'left' | 'over';

export interface CaptionSpot {
  left: number;
  top: number;
  /** the width the label was measured at, and must keep */
  maxWidth: number;
  side: CaptionSide;
}

/** The label never runs wider than this, however wide the screen. */
export const CAPTION_MAX = 520;
/** Beside the card the label needs at least this much room to be worth reading. */
const SIDE_MIN = 200;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * @param card the lifted card's box on the screen
 * @param view the room captions may use: the screen between the header and the chapter tabs, inside its margins
 * @param measure the label's size when laid out no wider than `maxWidth`
 * @param gap the air between the card and its caption
 */
export function captionSpot(
  card: Box,
  view: Box,
  measure: (maxWidth: number) => { w: number; h: number },
  gap = 14,
): CaptionSpot {
  const full = Math.min(CAPTION_MAX, view.w);
  const s = measure(full);
  const right = view.x + view.w;
  const bottom = view.y + view.h;
  const leftUnder = clamp(card.x, view.x, right - s.w);

  const below = card.y + card.h + gap;
  if (below + s.h <= bottom) return { left: leftUnder, top: below, maxWidth: full, side: 'below' };
  const above = card.y - gap - s.h;
  if (above >= view.y) return { left: leftUnder, top: above, maxWidth: full, side: 'above' };

  const roomRight = right - (card.x + card.w + gap);
  if (roomRight >= SIDE_MIN) {
    const max = Math.min(full, roomRight);
    const b = measure(max);
    return { left: card.x + card.w + gap, top: clamp(card.y, view.y, bottom - b.h), maxWidth: max, side: 'right' };
  }
  const roomLeft = card.x - gap - view.x;
  if (roomLeft >= SIDE_MIN) {
    const max = Math.min(full, roomLeft);
    const b = measure(max);
    return { left: card.x - gap - b.w, top: clamp(card.y, view.y, bottom - b.h), maxWidth: max, side: 'left' };
  }
  return { left: clamp(card.x + 16, view.x, right - s.w), top: Math.max(view.y, bottom - s.h), maxWidth: full, side: 'over' };
}
