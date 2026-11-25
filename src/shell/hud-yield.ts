/** The HUD's foot readouts ("X:0000 Y:0000", the timecode) are fixed over the page. A readout steps aside (`hud-yield`:
 *  it fades out) while it meets anything of the page it must not lie on: a film's player, ABOUT's photograph, and on
 *  ABOUT the page's own words and controls (the review's walkthroughs, 2026-11-25: the timecode stood over the CLASS
 *  callout under the photo on a 1920 x 945 window, the coordinates on the tagline on the 13-inch iPad). Boxes are in
 *  viewport px; touching edges do not meet. A readout the styles hide has an empty box and never yields. */
export interface Box { left: number; top: number; right: number; bottom: number }

export function hudYields(hud: Box, over: readonly Box[]): boolean {
  if (hud.right <= hud.left || hud.bottom <= hud.top) return false;
  return over.some((b) => b.right > b.left && b.bottom > b.top
    && hud.left < b.right && b.left < hud.right && hud.top < b.bottom && b.top < hud.bottom);
}
