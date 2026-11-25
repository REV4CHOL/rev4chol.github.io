import type { Project } from '../lib/content';

/** What stands under the film's thread (where the synopsis stood until 2026-11-25): the film's player, ready to play ('watch'); or one plain line saying why there is
 *  nothing to play (a film whose link is on its way; a film kept off the public web; a placeholder). */
export type WatchKind = 'watch' | 'pending' | 'private' | 'placeholder';

export function watchKind(p: Pick<Project, 'film' | 'filmPending' | 'filmPrivate'>): WatchKind {
  if (p.film) return 'watch';
  if (p.filmPrivate) return 'private';
  return p.filmPending ? 'pending' : 'placeholder';
}

/** The player's shape for a film of picture ratio `ratio` (width over height): vertical footage stands vertical, in
 *  its own ratio; every other film plays in the 16:9 player, which letterboxes scope and 4:3 inside itself. */
export function playerRatio(ratio: number): number {
  return ratio < 1 ? ratio : 16 / 9;
}

/** Two boxes (viewport px) meet where they overlap; touching edges do not. */
export function meets(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}
export interface Box { left: number; top: number; right: number; bottom: number }
