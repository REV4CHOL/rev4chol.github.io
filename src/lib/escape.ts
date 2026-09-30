/** Escape a string for interpolation into innerHTML. Owner-authored content
    may legally contain <, &, quotes — it must render as text, never as markup. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A title written with underscores (mr_PURPLE_dreams_in_electric_fish) is one unbreakable word: in a narrow place it
    ran off the screen, or broke mid-word (ELE/CTRIC). A zero-width space after each underscore lets it wrap there. */
export function softBreaks(s: string): string {
  return s.replace(/_/g, '_\u200b');
}
