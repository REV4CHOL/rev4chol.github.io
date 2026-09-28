/** The vertical pane's spine (owner 2026-09-28: "whenever I bring you vertical footage, you gonna make a special
 *  vertical pane"): a narrow card has no room for the id strip along its foot, so the id reads up its left edge,
 *  scaled down only when it would overrun the room it has, never enlarged. */
export function spineFit(textWidth: number, room: number): number {
  return textWidth > room && textWidth > 0 ? room / textWidth : 1;
}
