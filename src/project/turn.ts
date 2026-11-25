/** A TURN OF THE DEVICE (the review's walkthroughs, 2026-11-25): the page keeps its scroll in px while the layout above
 *  the player changes height, so an iPad turned to portrait and back left the player's top at -312 px, and an Android
 *  phone turned on its side while a film played showed 111 px of a 251 px player, YouTube's controls under the edge.
 *  After a turn, a player that was in view, or whose film was playing, is brought back whole under the header (in the
 *  middle of the room there; a player taller than the room has its top under the header). Touch screens only: a window
 *  resized on a PC never moves the page (pages/project.ts, armTurn). */

export interface Size { w: number; h: number }

/** The screen changed between upright and on its side. */
export function turned(a: Size, b: Size): boolean {
  return a.w > a.h !== b.w > b.h;
}

/** The share of the player (or of the room under the header, for a player taller than it) that must show for it to count
 *  as in view. */
export const IN_VIEW_SHARE = 0.25;

/** The player's box (screen px) showed a fair share of itself under a header `header` px tall, on a screen `vh` tall. */
export function inView(box: { top: number; bottom: number }, vh: number, header: number): boolean {
  const room = vh - header;
  const seen = Math.min(box.bottom, vh) - Math.max(box.top, header);
  const height = box.bottom - box.top;
  if (room <= 0 || height <= 0 || seen <= 0) return false;
  return seen / Math.min(height, room) >= IN_VIEW_SHARE;
}

/** The scroll that brings the player (its top and height in screen px, the page at `y`) whole under the header, in the
 *  middle of the room; its top under the header when it is taller than the room; null when it stands right already. */
export function turnScroll(o: { y: number; top: number; height: number; vh: number; header: number }): number | null {
  const room = o.vh - o.header;
  if (o.height <= room && o.top >= o.header && o.top + o.height <= o.vh) return null;
  const want = o.height <= room ? Math.round(o.header + (room - o.height) / 2) : o.header;
  const to = Math.max(0, Math.round(o.y + o.top - want));
  return Math.abs(to - o.y) < 1 ? null : to;
}
