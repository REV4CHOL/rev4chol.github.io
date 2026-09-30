/** A HUD switch's text: its name and its state, in words (the review's walkthroughs, 2026-09-30: `SFX ●` read as a status line,
 *  and a 5 px dot, filled or hollow, was the whole state). */
export function switchLabel(name: string, on: boolean): string {
  return `${name} ${on ? 'ON' : 'OFF'}`;
}
