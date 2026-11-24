import { escapeHtml } from './escape';

/* THE CROSS (owner, 2026-11-25, of DIRECTOR / EDITOR / COLORIST / SOUND DESIGNER: 'can we replace the "/" with a better,
   custom designed symbol? This is a website-wide change'; shown four drawn marks, they chose the cross: "I want a bold,
   fat red cross (same kind of red we have on website). Make it looks aesthetic").

   Wherever a line lists things (a film's roles, its artists, ABOUT's skills), the slash between them is drawn as the
   site's red cross (`.rvl-x`, base.css). The slash itself stays in the page, unseen under the cross: a screen reader
   and a copy get the line as it was written. A slash inside a word (24/7), the double slash of a status line and the
   player's time are not lists and keep theirs: the time's is written by the player's bar, which never comes here. */

/** The cross, as markup: the slash it stands for, to be painted over. */
export const CROSS = '<span class="rvl-x"> / </span>';

/** A slash that parts a list, with the word before it: spaces (plain or no-break) on both sides. */
const PARTED = /(\S+)[ \u00a0]+\/[ \u00a0]+/g;

/** A line as HTML, its text escaped, each list slash drawn as the cross. The word before a cross holds it (no line
 *  opens on a cross), and the line may break after it. */
export function crossedHtml(line: string): string {
  return escapeHtml(line).replace(PARTED, `<span class="rvl-xp">$1${CROSS}</span><wbr>`);
}

/** The same, written into an element. */
export function fillCrossed<T extends HTMLElement>(el: T, line: string): T {
  el.innerHTML = crossedHtml(line);
  return el;
}
