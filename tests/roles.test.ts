import { describe, expect, it } from 'vitest';
import { rolesLine } from '../src/home/roles';

/** THE HOMEPAGE ROLES BAR (owner 2026-09-26: "add another title: AI Generalist before COLORIST"): the tagline's
 *  comma-separated roles, upper-cased, a role's own spaces underscored, joined by " · ". Four roles no longer
 *  fit a phone's line — a wrap must break after a separator, never open a line with one. */
describe('the homepage roles bar', () => {
  it('reads the roles in order, upper-cased and underscored', () => {
    expect(rolesLine('AI generalist, colorist, editor, filmmaker').replace(/\u00a0/g, ' ')).toBe('AI_GENERALIST · COLORIST · EDITOR · FILMMAKER');
  });

  it('breaks only after a separator: every separator is glued to the role before it', () => {
    const line = rolesLine('AI generalist, colorist, editor, filmmaker');
    expect(line).not.toMatch(/ ·/); // no breakable space before a dot
    expect(line.split(' ')).toEqual(['AI_GENERALIST\u00a0·', 'COLORIST\u00a0·', 'EDITOR\u00a0·', 'FILMMAKER']);
  });

  it('drops empty roles and stray spaces', () => {
    expect(rolesLine(' colorist ,, editor ')).toBe('COLORIST\u00a0· EDITOR');
    expect(rolesLine('')).toBe('');
  });
});
