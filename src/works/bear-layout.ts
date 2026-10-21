/** WHERE THE CUB SITS on the WORK floor (a desktop or a tablet; a phone has the reel and no cub).
 *
 *  Bottom left, turned toward the films (he is drawn at the three-quarter photograph's angle, which faces right), as
 *  big as the room allows: up to 56 % of a desktop's height ("a giant 3D teddy bear … watching over the panes"), 40 %
 *  of a tablet's. He keeps clear of the page's chrome: his feet stand on the line just above the bottom readouts, and
 *  he never reaches over the chapter tabs — where there is too little room beside them (a narrow tablet), he sits up
 *  on the tabs' line instead. Plate px (the chrome's own coordinates). Pure. */

export interface Rect { left: number; top: number; right: number; bottom: number }
export interface Box { left: number; top: number; width: number; height: number }

/** How tall he may stand, as a share of the screen's height. */
export const CUB_SHARE = { desk: 0.56, touch: 0.4 };
const SIDE = 16, GAP = 8, HEAD_ROOM = 150;

/** His box: `aspect` is his drawing's width over its height; `tabs` the chapter tabs, `foot` the bottom readouts. */
export function cubBox(view: { w: number; h: number; coarse: boolean }, chrome: { tabs: Rect | null; foot: Rect | null }, aspect: number): Box {
  const share = view.coarse ? CUB_SHARE.touch : CUB_SHARE.desk;
  const want = view.h * share;
  const floor = (chrome.foot ? chrome.foot.top : view.h - 36) - GAP;
  // beside the tabs: on the readouts' line, as wide as the room left of the tabs
  const room = (chrome.tabs ? chrome.tabs.left : view.w) - SIDE - 2 * GAP;
  const beside = Math.max(0, Math.min(want, room / aspect, floor - HEAD_ROOM));
  // above the tabs: up on their line, any width
  const up = chrome.tabs ? chrome.tabs.top - GAP : floor;
  const above = Math.max(0, Math.min(want, up - HEAD_ROOM, (view.w - 2 * SIDE) / aspect));
  const useBeside = beside >= above * 0.8;
  const height = Math.round(useBeside ? beside : above);
  const bottom = useBeside ? floor : up;
  return { left: SIDE, top: Math.round(bottom - height), width: Math.round(height * aspect), height };
}
