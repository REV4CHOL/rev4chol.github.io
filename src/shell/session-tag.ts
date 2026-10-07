/** The HUD's session tag, RVL- and four hex digits, kept in sessionStorage so every page of one visit shows the
 *  same one. What storage hands back is used only when it has exactly that shape: anything else (a value another
 *  script on this origin planted, a cut-off tag) is replaced by a new tag and never shown (security review
 *  2026-10-07: the HUD wrote the stored value into the page as markup). */
export const SESSION_TAG = /^RVL-[0-9A-F]{4}$/;

export function sessionTag(stored: string | null, random: () => number = Math.random): string {
  if (stored !== null && SESSION_TAG.test(stored)) return stored;
  return `RVL-${Math.floor(random() * 0x10000).toString(16).toUpperCase().padStart(4, '0')}`;
}
