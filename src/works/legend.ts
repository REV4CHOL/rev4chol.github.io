import { isPlaceholder, type Project } from '../lib/content';

/** THE FLOOR'S SIGNPOSTS (owner's testers, 2026-09-27: "confused, not knowing what to do, where to go … what to
 *  click on, like completely lost"). The floor's controls in one line — the STORY page's idiom — and the hover
 *  caption ends with the verb that opens the pane, since the cursor's ENTER ▸ alone went unseen. */
export const FLOOR_LEGEND = {
  fine: 'DRAG ▸ ROAM ▪ SCROLL ▸ ZOOM ▪ HOVER ▸ PREVIEW ▪ CLICK ▸ OPEN',
  coarse: 'DRAG ▸ ROAM ▪ PINCH ▸ ZOOM ▪ TAP ▸ SELECT ▪ TAP AGAIN ▸ OPEN',
} as const;

/** On a touch screen the first tap only selects (wakes and captions) a pane; the caption says what the second does. */
export const OPEN_VERB = { fine: 'CLICK ▸ OPEN', coarse: 'TAP AGAIN ▸ OPEN' } as const;

export function legendText(fine: boolean): string {
  return fine ? FLOOR_LEGEND.fine : FLOOR_LEGEND.coarse;
}

type CaptionFields = Pick<Project, 'year' | 'role' | 'runtime' | 'film' | 'filmPending'>;

/** `2025 · DIRECTOR / EDITOR / COLORIST · 1:30 ▪ CLICK ▸ OPEN`; a placeholder's starts `PLACEHOLDER ▪`. */
export function captionMeta(p: CaptionFields, fine: boolean): string {
  const facts = [p.year, p.role, p.runtime].filter(Boolean).join(' · ').toUpperCase();
  return [isPlaceholder(p) ? 'PLACEHOLDER' : '', facts, fine ? OPEN_VERB.fine : OPEN_VERB.coarse]
    .filter(Boolean)
    .join(' ▪ ');
}

/** The legend stands lit until the visitor has opened a pane once, then stays as a quiet reminder. */
const OPENED_KEY = 'rvl-floor-opened';

export interface KeyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function floorOpened(store: KeyStore): boolean {
  try {
    return store.getItem(OPENED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFloorOpened(store: KeyStore): void {
  try {
    store.setItem(OPENED_KEY, '1');
  } catch {
    /* no storage (private mode): the legend simply stays lit */
  }
}
