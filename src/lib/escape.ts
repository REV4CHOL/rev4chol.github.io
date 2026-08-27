/** Escape a string for interpolation into innerHTML. Owner-authored content
    may legally contain <, &, quotes — it must render as text, never as markup. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
