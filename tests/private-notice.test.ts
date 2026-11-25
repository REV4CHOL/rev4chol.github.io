import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// THE PRIVATE FILM'S NOTICE (owner, 2026-11-25, shown the 10 px grey line under the synopsis: "Same words, clearer: keep
// your words, set larger and brighter so they read as a notice, not a footnote"). The words are the owner's, not one
// changed or added; the line is set larger, in full ink, on the house's own plate and hazard strip.
const page = readFileSync('src/pages/project.ts', 'utf8');
const css = readFileSync('src/styles/project.css', 'utf8');
/** A top-level rule's body (top-level rules start their line; overrides inside @media are indented). */
const rule = (sel: string) => {
  const at = css.indexOf(`\n${sel} {`);
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
};

describe("the private film's notice", () => {
  it('keeps the same words, exactly', () => {
    expect(page).toContain("note.textContent = 'PRIVATE FILM ▪ NOT AVAILABLE TO WATCH ONLINE';");
    expect(page.match(/PRIVATE FILM/g)?.length).toBe(1);
  });

  it('no longer shares the quiet footnote style of the placeholder and pending lines', () => {
    expect(css).toContain('\n.p-placeholder, .p-pending {');
    expect(css).not.toContain('.p-placeholder, .p-private, .p-pending {');
  });

  it('is set larger and brighter: full ink, the house micro face above its 10 px, on a plate with a hazard strip', () => {
    const n = rule('.p-private');
    expect(n).toContain('font-size: var(--t-sm)');
    expect(n).toContain('color: var(--bone)');
    expect(n).not.toContain('55%');
    expect(n).toContain('border: 1px solid var(--signal)');
    expect(rule('.p-private::before')).toContain('repeating-linear-gradient(45deg, var(--alert)');
  });

  it('a phone sets it a step smaller, and it may wrap but never widens the page', () => {
    const phone = css.slice(css.lastIndexOf('@media (max-width: 760px) and (pointer: coarse)'));
    expect(phone).toContain('.p-private { font-size: var(--t-xs);');
    expect(rule('.p-private')).toContain('max-width: 100%');
  });

  it('stands where the player would, and links nowhere', () => {
    expect(css).toContain('.p-private, .p-pending { grid-column: 1; grid-row: 2; justify-self: start; }');
    const block = page.slice(page.indexOf("if (kind === 'private')"), page.indexOf("} else if (kind === 'pending')"));
    expect(block).not.toMatch(/href|<a\b/);
  });
});
