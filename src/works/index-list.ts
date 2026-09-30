import type { Project } from '../lib/content';
import { aspectRatio } from '../lib/content';
import { CHANNELS, channelProjects, type ChannelKey } from './channels';

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

/** The control that changes the view says what it gives; the way back says where it leads. */
export function toggleText(view: WorkView, total: number): string {
  return view === 'list' ? '◂ BACK TO THE FILM WALL' : `LIST ALL ${films(total)} ▸`;
}

/** A row's thumbnail: the film's own shape inside a 128 × 72 box, never cropped (owner 2026-09-28: vertical footage is
 *  shown vertical everywhere). */
export const THUMB = { w: 128, h: 72 } as const;

export function thumbSize(ratio: number): { w: number; h: number } {
  return ratio >= THUMB.w / THUMB.h
    ? { w: THUMB.w, h: Math.round(THUMB.w / ratio) }
    : { w: Math.round(THUMB.h * ratio), h: THUMB.h };
}

/** `2026 · COLORIST · 11:42`; a film kept off the public web says so where its running time would stand. */
export function rowMeta(p: Pick<Project, 'year' | 'role' | 'runtime' | 'filmPrivate'>): string {
  return [p.year, p.role, p.runtime || (p.filmPrivate ? 'PRIVATE FILM' : '')].filter(Boolean).join(' · ').toUpperCase();
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

/** Every film, chapter by chapter in the chapters' order, each chapter in json order. */
export function listGroups(projects: Project[]): ListGroup[] {
  return CHANNELS.map((ch) => {
    const list = channelProjects(projects, ch.key);
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
