import type { Project } from '../lib/content';

/** What stands where WATCH would: the button; the button greyed (a film whose link is on its way); or one plain line
 *  saying why there is nothing to press (a film kept off the public web; a placeholder). */
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
