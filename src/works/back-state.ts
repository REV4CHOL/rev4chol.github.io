import { viewFromSearch, type WorkView } from './index-list';

/** THE BROWSER'S BACK ON WORK (the review's walkthroughs, 2026-11-25). Each history entry of WORK carries, in its own
 *  `history.state`, what it showed, so the browser's Back and Forward find it again even when the page is loaded anew
 *  (a Back from a film loads WORK afresh: the page's memory is gone, the entry's state is not).
 *  - THE LIST has an entry of its own: the toggle adds it (`pushed`), so Back from the list returns to the film wall
 *    and Forward to the list; the list's own "back to the wall" button then goes back in history rather than piling
 *    entries up.
 *  - THE LIST'S PLACE: the row the visitor opened, and its height in the list's view, so Back from a film finds the
 *    list where it was left (the list was laid out anew at its top: scrollTop 1340 before, 0 after, on an iPad). */
export interface WorkEntry {
  /** the view this entry shows */
  view?: WorkView;
  /** the list's entry was added by the toggle: the wall's entry stands right behind it */
  pushed?: boolean;
  /** the list's place: the row the visitor opened (or the first in view), by its link, and its height in the list's
   *  view (px from the scroller's top edge) */
  row?: string;
  rowAt?: number;
}

/** What WORK knows of an entry's state, of the right kinds; anything else is left out. */
export function entryOf(state: unknown): WorkEntry {
  const e: WorkEntry = {};
  if (!state || typeof state !== 'object') return e;
  const s = state as Record<string, unknown>;
  if (s.view === 'list' || s.view === 'floor') e.view = s.view;
  if (s.pushed === true) e.pushed = true;
  if (typeof s.row === 'string') e.row = s.row;
  if (typeof s.rowAt === 'number' && Number.isFinite(s.rowAt)) e.rowAt = s.rowAt;
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
