/** Where a film page's scroll cue stands (lib/swipe-nav.ts armScrollCue; pages/project.ts placeCue). At the screen's
 *  foot, as ABOUT's, unless the intake sheet's first row would stand there too: then midway between the hero's foot and
 *  the sheet. All in screen px, read as the page stands at its top. */

/** The sheet rises into place as it is revealed ([data-stamp]: 16 px), so its top is read that much higher. */
export const STAMP_RISE = 16;
/** The clear space the cue keeps from the sheet's first row. */
export const CUE_CLEAR = 10;

export interface Box { top: number; bottom: number; left: number; right: number }

/** The cue's distance from the screen's foot when it must move, else null (it stays where ABOUT's stands). Null too
 *  when the band between the hero and the sheet is too short to hold it. */
export function cueBottom(cue: Box, sheet: Omit<Box, 'bottom'>, heroFoot: number, screenH: number): number | null {
  if (sheet.top >= screenH) return null; // (the sheet starts below the screen: the cue is gone before it arrives)
  const sheetTop = sheet.top - STAMP_RISE;
  const meets = cue.bottom > sheetTop - CUE_CLEAR && cue.right > sheet.left && cue.left < sheet.right;
  if (!meets) return null;
  const h = cue.bottom - cue.top;
  const gap = sheetTop - heroFoot;
  if (gap < h + 2 * CUE_CLEAR) return null;
  const top = heroFoot + (gap - h) / 2;
  return screenH - top - h;
}
