import type { ChannelKey } from './channels';
import { viewFromSearch, type WorkView } from './index-list';

/** THE BROWSER'S BACK ON WORK (the review's walkthroughs, 2026-11-25). Each history entry of WORK carries, in its own
 *  `history.state`, what it showed, so the browser's Back and Forward find it again even when the page is loaded anew
 *  (a Back from a film loads WORK afresh: the page's memory is gone, the entry's state is not).
 *  - THE LIST has an entry of its own: the toggle adds it (`pushed`), so Back from the list returns to the film wall
 *    and Forward to the list; the list's own "back to the wall" button then goes back in history rather than piling
 *    entries up.
 *  - THE LIST'S PLACE: the row the visitor opened, and its height in the list's view, so Back from a film finds the
 *    list where it was left (the list was laid out anew at its top: scrollTop 1340 before, 0 after, on an iPad).
 *  - THE PHONE'S STRIP: the place it stood on when a film was opened, so Back finds that film again (it arrived at
 *    film 1 every time). Its FIRST arrival (film 1 in the lower half) is the owner's and is untouched. */
export interface WorkEntry {
  /** the view this entry shows */
  view?: WorkView;
  /** the list's entry was added by the toggle: the wall's entry stands right behind it */
  pushed?: boolean;
  /** the list's place: the row the visitor opened (or the first in view), by its link, and its height in the list's
   *  view (px from the scroller's top edge) */
  row?: string;
  rowAt?: number;
  /** the phone's strip: the place under the screen's middle when a film was opened (works/reel.ts stripPlace) */
  reel?: ReelPlace;
}

/** A place on the strip: a chapter, a pane of its strip and the part of that pane under the screen's middle. */
export interface ReelPlace { ch: ChannelKey; pane: number; part: number }

/** What WORK knows of an entry's state, of the right kinds; anything else is left out. */
export function entryOf(state: unknown): WorkEntry {
  const e: WorkEntry = {};
  if (!state || typeof state !== 'object') return e;
  const s = state as Record<string, unknown>;
  if (s.view === 'list' || s.view === 'floor') e.view = s.view;
  if (s.pushed === true) e.pushed = true;
  if (typeof s.row === 'string') e.row = s.row;
  if (typeof s.rowAt === 'number' && Number.isFinite(s.rowAt)) e.rowAt = s.rowAt;
  const r = s.reel as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object' && (r.ch === 'human' || r.ch === 'machine') && Number.isInteger(r.pane) && (r.pane as number) >= 0
    && typeof r.part === 'number' && r.part >= 0 && r.part < 1) e.reel = { ch: r.ch, pane: r.pane as number, part: r.part };
  return e;
}

/** A return is the browser's Back or Forward (the navigation's type): a place is restored only then. A fresh visit or a
 *  reload starts as designed (the list at its top). */
export const returning = (navType: string | undefined): boolean => navType === 'back_forward';

/** The list's scroll that stands the row the visitor left (`rowTop`: its top in the list's content) at the height it
 *  was left at (`rowAt`), within the scroller's reach. By the row, not by the pixels: the list may lay out a little
 *  differently on its return (its faces arriving late). */
export function restoredTop(rowTop: number, rowAt: number, maxTop: number): number {
  const t = rowTop - rowAt;
  return Number.isFinite(t) ? Math.min(Math.max(0, maxTop), Math.max(0, Math.round(t))) : 0;
}

/** The view an entry shows: the address first (`?view=`), then the entry's own, then what this visit chose, then the
 *  wall. (Without the entry's own, a Back that loaded the wall's address showed the list this visit had chosen last.) */
export function viewOnLoad(search: string, entry: WorkEntry, remembered: string | null): WorkView {
  return viewFromSearch(search, entry.view ?? remembered);
}

/** The list's "back to the wall" goes back in history when the toggle added the list's entry (the wall's stands right
 *  behind it); a list opened by its own address has no wall behind it, and changes its entry in place as before. */
export const wallByBack = (entry: WorkEntry): boolean => entry.view === 'list' && entry.pushed === true;

/** Where THE LIST opens BY HAND (the review's walkthroughs, an Android tablet: opened from CH·02 it started at CH·01,
 *  the "CH·02 ▪ AI" heading 1 678 px down): from a chapter after the first, the scroll that stands that chapter's
 *  heading where the first chapter's heading stands; from the first chapter, or one the list does not hold, the top.
 *  `heads`: each chapter heading's top in the list's content, in the list's order. A return by Back never comes here:
 *  it restores the place the visitor left (restoredTop). */
export function listStartTop(active: ChannelKey, heads: readonly { key: ChannelKey; top: number }[]): number {
  if (!heads.length || heads[0].key === active) return 0;
  const h = heads.find((x) => x.key === active);
  return h ? Math.max(0, Math.round(h.top - heads[0].top)) : 0;
}

/** Where the strip comes back to: the place it was left on, when it was left in this chapter and the strip has that
 *  pane (`panes`); otherwise null, and the strip arrives as designed. */
export function reelReturn(entry: WorkEntry, ch: ChannelKey, panes: number): [pane: number, part: number] | null {
  const r = entry.reel;
  return r && r.ch === ch && r.pane < panes ? [r.pane, r.part] : null;
}
