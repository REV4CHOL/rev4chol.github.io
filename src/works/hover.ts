/**
 * Which pane is awake after a pointer move, decided from what lies under the pointer on every move.
 *
 * The floor used to follow each pane's own pointerover/pointerout. But waking a pane lifts it into another layer
 * while Pixi is still dispatching that pointerover, and Pixi keeps the pointer's path from before the lift: the next
 * pointerout went to the layer the pane had left, never to the pane. A pane crossed in one quick move stayed awake —
 * lifted, looping, its label up — with the pointer out on bare floor or on the page's chrome (found verifying the
 * fourth batch, 2026-09-27).
 *
 * @param hit the pane the floor's hit test found under the pointer (null: bare floor)
 * @param onFloor whether the pointer is on the floor itself, not on the page's chrome lying over it
 * @param awake the pane awake now (null: none)
 * @param dragging whether a drag of the floor is under way: it wakes nothing, but lets the awake pane go
 * @returns the pane that should be awake after this move (null: none)
 */
export function paneToWake(hit: string | null, onFloor: boolean, awake: string | null, dragging: boolean): string | null {
  const under = onFloor ? hit : null;
  if (under === awake) return awake;
  return under && !dragging ? under : null;
}
