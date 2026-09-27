/** THE FOOTAGE IS A DOOR (owner's testers, 2026-09-27: they clicked the picture and got a glitch, not a place). A
 *  clean click on the homepage's footage — no drag, not on a link or a button, not on the poster's words (those keep
 *  their burst) — leaves for WORK. `target` is the pointerup's target; `movedPx` the pointer's travel since its
 *  pointerdown. */
type Closest = { closest?: (selector: string) => unknown } | null | undefined;

/** travel under this is a click, over it a drag (text selection, a glide on a phone) */
export const CLICK_SLOP = 8;

export function doorFromVoidClick(target: Closest, movedPx: number): boolean {
  if (movedPx > CLICK_SLOP) return false;
  if (target?.closest?.('a, button')) return false;
  if (target?.closest?.('#statement')) return false;
  return true;
}
