import { isPlaceholder, type Project } from '../lib/content';

/** THE FLOOR'S SIGNPOSTS (owner's testers, 2026-09-27: "confused, not knowing what to do, where to go … what to
 *  click on, like completely lost"; owner, 2026-09-28: "still unclear … imagine a not so tech-savvy person read
 *  it"). The floor's controls in one line, and the hover caption ends with what opens the pane. PLAIN WORDS: an
 *  instruction is a sentence a stranger can follow — the house's arrow-between-verb-and-noun code read as code. */
export const FLOOR_LEGEND = {
  fine: 'DRAG TO MOVE AROUND ▪ SCROLL TO ZOOM ▪ HOVER A FILM TO PREVIEW IT ▪ CLICK IT TO OPEN',
  coarse: 'DRAG TO MOVE AROUND ▪ PINCH TO ZOOM ▪ TAP A FILM TO PREVIEW IT ▪ TAP IT AGAIN TO OPEN',
} as const;

/** On a touch screen the first tap only selects (wakes and captions) a pane; the caption says what the second does. */
export const OPEN_VERB = { fine: 'CLICK TO OPEN', coarse: 'TAP AGAIN TO OPEN' } as const;

export function legendText(fine: boolean): string {
  return fine ? FLOOR_LEGEND.fine : FLOOR_LEGEND.coarse;
}

/** A pane's strip: the owner's `short` name is the whole strip (APL 2026 TEASER already carries its year); otherwise
 *  the year and the slug in words, not in the address's hyphens (owner's testers, 2026-09-30: the strip said
 *  ELECTRIC-FISH and MIEN-VIEN, the page said something else: "two names for one film"). */
export function stripName(p: Pick<Project, 'short' | 'year' | 'slug'>): string {
  return (p.short || `${p.year} · ${p.slug.replace(/-/g, ' ')}`).toUpperCase();
}

type CaptionFields = Pick<Project, 'year' | 'role' | 'runtime' | 'film' | 'filmPending' | 'filmPrivate'>;

/** `2025 · DIRECTOR / EDITOR / COLORIST · 1:30 ▪ CLICK TO OPEN`; a placeholder's starts `PLACEHOLDER · NO FILM YET ▪`. */
export function captionMeta(p: CaptionFields, fine: boolean): string {
  const facts = [p.year, p.role, p.runtime].filter(Boolean).join(' · ').toUpperCase();
  return [isPlaceholder(p) ? 'PLACEHOLDER · NO FILM YET' : '', facts, fine ? OPEN_VERB.fine : OPEN_VERB.coarse]
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
