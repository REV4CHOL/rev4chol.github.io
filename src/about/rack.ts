/** ABOUT's skill rack: whether it shows the small counters at its bars' ends ("CRE ▪ 01/04"). A counter stands at the
 *  end of its bar after the name and the rail; with a long name it ran past the bar's edge and was cut mid-word (the
 *  review's walkthroughs, 2026-11-25: four of eight on every desktop size). It is decoration, so where ANY counter of
 *  the rack would not stand whole, the rack drops them all (uniform hardware), and the names keep their size.
 *  `capRight` is a shown counter's right edge, `edge` the right edge of its bar's inner box (inside the padding), both
 *  in the same px; half a pixel is layout rounding, not a cut. */
export function rackKeepsCaps(rows: readonly { capRight: number; edge: number }[]): boolean {
  return rows.every((r) => r.capRight <= r.edge + 0.5);
}
