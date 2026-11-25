/** THE ROLES AS THE SITE SHOWS THEM, AND WHO DIRECTED (owner, 2026-11-25: "In many panes and films' page, EDITOR are
 *  going before COLORIST. But this violate the alphabetic order. So it should be COLORIST, then EDITOR. And in the
 *  future, other roles will have the same treatment. As for DIRECTOR, I dont want it to be in ROLE anymore. So all
 *  projects that have ROLE as Director, its's directed by me. So I want this sentence: Directed by REVACHOL, placed
 *  above ROLE."; then: "there are some other films that are directed by other directors. Please give them the same
 *  treatment as ours too").
 *
 *  The content file keeps a film's role line as it was written, Director and all, in any order. Every place that shows
 *  a film reads it through this file, never the line itself (tests/roles.test.ts holds that): the roles stand A to Z
 *  without Director, and the direction is a line of its own, DIRECTED BY and a name: REVACHOL when the role line names
 *  Director, the film's `director` when someone else directed. A film with neither shows no such line: a director is
 *  never guessed. */
export const OWNER = 'Revachol';
export const DIRECTED_BY = 'DIRECTED BY';

/** capitals and small letters are one alphabet, an accent does not move a letter, a number counts as a number */
const order = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const parts = (line: string): string[] => line.split('/').map((r) => r.trim().replace(/\s+/g, ' ')).filter(Boolean);
const isDirector = (role: string): boolean => /^director$/i.test(role);

/** A film's roles as every page shows them: A to Z, joined by " / ", without Director. '' when none is left. */
export function rolesShown(p: { role: string }): string {
  return parts(p.role).filter((r) => !isDirector(r)).sort(order.compare).join(' / ');
}

/** Who directed the film, as written: REVACHOL when its role line names Director, the film's own director when
 *  someone else did, both (" / " between them) when both are on record, '' when nobody is. */
export function directorOf(p: { role: string; director: string }): string {
  return [parts(p.role).some(isDirector) ? OWNER : '', p.director.trim()].filter(Boolean).join(' / ');
}

/** The line a pane shows above a film's roles: `DIRECTED BY REVACHOL`, in capitals; '' when nobody is on record. */
export function directedLine(p: { role: string; director: string }): string {
  const who = directorOf(p);
  return who ? `${DIRECTED_BY} ${who.toUpperCase()}` : '';
}
