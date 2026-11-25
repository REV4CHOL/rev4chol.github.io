import type { Project } from '../lib/content';
import { aspectRatio } from '../lib/content';
import { splitTitle } from '../lib/title';
import { CHANNELS, channelProjects, type ChannelKey } from './channels';
import { REEL_WORDS } from './reel';

/** THE LIST (owner's testers, 2026-09-30: "they dont know how to navigate the website … they feel lost, as they have
 *  never seen a website like this before"). The floor is the site's own idea, and a first-time visitor had no plain
 *  way around it: no way to see every film at once, none to find one by its name, and five of the seventeen stood
 *  behind a tab that read as a caption. The WORK page now has a second view, one press from the floor: every film of
 *  both chapters as a page of links. This module is its words and its order; the page (pages/works.ts) builds it. */
export type WorkView = 'floor' | 'list';

/** The address decides first (`?view=list`, `?view=floor`), then what this visit chose, then the floor. */
export function viewFromSearch(search: string, remembered: string | null): WorkView {
  const q = new URLSearchParams(search).get('view');
  if (q === 'list' || q === 'floor') return q;
  return remembered === 'list' ? 'list' : 'floor';
}

/** The page's query for a view, keeping whatever else it carries (the chapter). */
export function searchForView(search: string, view: WorkView): string {
  const q = new URLSearchParams(search);
  if (view === 'list') q.set('view', 'list');
  else q.delete('view');
  const s = q.toString();
  return s ? `?${s}` : '';
}

const films = (n: number) => `${n} ${n === 1 ? 'FILM' : 'FILMS'}`;

/** A chapter tab's small line: the chapter showing counts its films, the other says how many MORE stand behind it
 *  (the tab read as a caption, and nobody pressed it). */
export function chapterTabLabel(index: string, count: number, on: boolean): string {
  return `${index} ▪ ${count} ${on ? '' : 'MORE '}${count === 1 ? 'FILM' : 'FILMS'}`;
}

/** The control that changes the view says what it gives; the way back says where it leads — on a phone, the reel
 *  (works/reel.ts). */
export function toggleText(view: WorkView, total: number, reel = false): string {
  if (view === 'list') return reel ? REEL_WORDS.back : '◂ BACK TO THE FILM WALL';
  return `LIST ALL ${films(total)} ▸`;
}

/** A row's thumbnail: the film's own shape inside a 128 × 72 box, never cropped (owner 2026-09-28: vertical footage is
 *  shown vertical everywhere). */
export const THUMB = { w: 128, h: 72 } as const;

export function thumbSize(ratio: number): { w: number; h: number } {
  return ratio >= THUMB.w / THUMB.h
    ? { w: THUMB.w, h: Math.round(THUMB.w / ratio) }
    : { w: Math.round(THUMB.h * ratio), h: THUMB.h };
}

/** `2026 · COLORIST`; a film kept off the public web says so at the end. No running time (owner, 2026-11-24: "Remove
 *  runtime from all sections on the website"). */
export function rowMeta(p: Pick<Project, 'year' | 'role' | 'filmPrivate'>): string {
  return [p.year, p.role, p.filmPrivate ? 'PRIVATE FILM' : ''].filter(Boolean).join(' · ').toUpperCase();
}

export interface ListRow {
  slug: string;
  href: string;
  title: string;
  meta: string;
  accent: string;
  thumb: { w: number; h: number };
}

export interface ListGroup { key: ChannelKey; heading: string; rows: ListRow[] }

/** THE LIST'S ORDER (owner, 2026-11-25, from a phone, of THE LIST standing in the file's order: "all platform: The film
 *  list must follow the alphabetic order"). Inside each chapter the rows stand A to Z by the name the row shows large:
 *  capitals and small letters are one alphabet (the rows are drawn in capitals), an accent does not move a letter, a
 *  number inside a name counts as a number, and THE is a word like any other ("The Betrothal" stands under T, where
 *  a reader of the row looks for it). A two-language name stands by its first line; its second only breaks a tie. */
const AZ = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function titleOrder(a: string, b: string): number {
  const x = splitTitle(a), y = splitTitle(b);
  return AZ.compare(x.main, y.main) || AZ.compare(x.alt ?? '', y.alt ?? '');
}

/** Every film, chapter by chapter in the chapters' order, each chapter A to Z by name (titleOrder), on every screen.
 *  The list handed in is left as it was: the floor places its panes by the file's order, and the phone's strip reads
 *  the same list. */
export function listGroups(projects: Project[]): ListGroup[] {
  return CHANNELS.map((ch) => {
    const list = [...channelProjects(projects, ch.key)].sort((a, b) => titleOrder(a.title, b.title));
    return {
      key: ch.key,
      heading: `${ch.index} ▪ ${ch.name} ▪ ${films(list.length)}`,
      rows: list.map((p) => ({
        slug: p.slug,
        href: `/project.html?p=${encodeURIComponent(p.slug)}`,
        title: p.title,
        meta: rowMeta(p),
        accent: p.accent,
        thumb: thumbSize(aspectRatio(p.aspect)),
      })),
    };
  }).filter((g) => g.rows.length > 0);
}
