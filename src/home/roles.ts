/** The homepage roles bar: the tagline's comma-separated roles, upper-cased, a role's own spaces underscored
 *  (a role never breaks inside), joined by " · " with each separator glued to the role before it — when the
 *  bar wraps (four roles overflow a phone's line), the break falls after a dot and no line opens with one. */
export function rolesLine(tagline: string): string {
  return tagline
    .toUpperCase()
    .split(/,\s*/)
    .map((r) => r.trim().replace(/ /g, '_'))
    .filter(Boolean)
    .join('\u00a0· ');
}
