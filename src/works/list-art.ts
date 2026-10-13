/** THE LIST'S MARGINS (owner, 2026-10-13: "decoration art filling up the two sides' negative space … a lot of our art
 *  direction mixing with 8bit" — and "keep all the projects all perfectly readable in the middle"). Either side of the
 *  reading column: the site's hardware — a slanted lime plate naming the bay, a spine of readouts at the screen's
 *  edge — and the bay's two machines (works/machines.ts), with room on the outer side for their
 *  callouts when the margin is wide. Pure: where everything stands, in plate px, for a screen's size. */

/** The reading column, plate px: the rows' 1,120 and 36 a side. Nothing in the margins ever crosses into it. */
export const COLUMN = 1192;
/** Under this many plate px a side, a margin carries nothing: the plain black list (a phone, a tablet). */
export const MARGIN_MIN = 80;
/** Under this many, a margin carries its hardware alone: the machines need the room. */
export const MACHINES_MIN = 300;
/** The header's rows and the HUD's, plate px: the margins' contents stand between. */
export const TOP = 168, BOTTOM = 72;

export const TAGS = { left: 'GRADE ▸ BAY 01', right: 'CUT ▸ BAY 02' } as const;
export const SPINES = {
  left: 'RVL//GRADE :: BAY 01 :: PRISM ▪ ORRERY ▪ LUT :: SGN//C8FF00',
  right: 'RVL//CUT :: BAY 02 :: FLATBED ▪ SPLICE ▪ TOTEM :: REVACHOL.OS_V4.3',
} as const;
/** Each bay's machines, top to bottom. */
export const BAY_MACHINES = { left: ['orrery', 'lut'], right: ['totem', 'flatbed'] } as const;
export type MachineKey = 'orrery' | 'lut' | 'totem' | 'flatbed';

export interface Box { x: number; y: number; w: number; h: number }
export interface Slot extends Box { key: MachineKey }
export interface Side {
  side: 'left' | 'right';
  /** the margin's own span, plate px: [x0, x1) */
  span: [number, number];
  /** the spine's left edge */
  spine: number;
  /** the lime plate's box, or null when the margin is too narrow for it */
  tag: { x: number; y: number; w: number } | null;
  /** the machines' boxes (empty under MACHINES_MIN) */
  slots: Slot[];
  /** where the callouts' labels stand, [x0, x1), or null when there is no room beside the machines */
  labels: [number, number] | null;
}

const TAG_H = 26, CUE_H = 34, LABELS_MIN = 176, MACHINE_MAX = 460;

/** Where a margin's hardware and machines stand on a plate `plateW` × `plateH`, or null when the margin is too narrow. */
export function sideLayout(plateW: number, plateH: number, side: 'left' | 'right'): Side | null {
  const margin = Math.floor((plateW - COLUMN) / 2);
  if (margin < MARGIN_MIN) return null;
  const left = side === 'left';
  const span: [number, number] = left ? [0, margin] : [plateW - margin, plateW];
  // the spine at the screen's edge (the column's own rule, ticked, is the city's: works/list-deco.ts); the rest between
  const spine = left ? 12 : plateW - 26;
  const room: [number, number] = left ? [44, margin - 36] : [plateW - margin + 36, plateW - 44];
  const avail = room[1] - room[0];
  const tagW = Math.min(avail, 220);
  const tag = avail >= 132 ? { x: left ? room[1] - tagW : room[0], y: TOP, w: tagW } : null;
  if (margin < MACHINES_MIN) return { side, span, spine, tag, slots: [], labels: null };
  // the machines keep to the column's side; the callouts take the outer side when it has room
  const withLabels = avail - LABELS_MIN - 16 >= 240;
  const mw = Math.min(MACHINE_MAX, withLabels ? avail - LABELS_MIN - 16 : avail);
  const mx = left ? room[1] - mw : room[0];
  const labels: [number, number] | null = withLabels ? (left ? [room[0], mx - 16] : [mx + mw + 16, room[1]]) : null;
  const y0 = TOP + TAG_H + CUE_H, y1 = plateH - BOTTOM - 24;
  const hTop = Math.round((y1 - y0) * 0.55);
  const [a, b] = BAY_MACHINES[side];
  const slots: Slot[] = [
    { key: a, x: mx, y: y0, w: mw, h: hTop },
    { key: b, x: mx, y: y0 + hTop, w: mw, h: y1 - y0 - hTop },
  ];
  return { side, span, spine, tag, slots, labels };
}

/** THE CONDUIT's run, plate px: from under the grade bay's lower machine to under the cut bay's, at `y` — behind the
 *  list in between, where the column's black swallows it. */
export function conduitRun(left: Side, right: Side): { x0: number; x1: number; y: number } | null {
  const a = left.slots[1], b = right.slots[1];
  if (!a || !b) return null;
  return { x0: a.x + a.w / 2, x1: b.x + b.w / 2, y: Math.max(a.y + a.h, b.y + b.h) + 6 };
}
