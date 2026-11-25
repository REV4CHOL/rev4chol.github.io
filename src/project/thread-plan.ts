/** THE FILM'S THREAD, ITS GEOMETRY (owner, 2026-11-25). The synopsis line between a film's sheet and its player left
 *  the page; in its place stands a quiet line drawing chosen by the owner from mock-ups: a thin strip of film seen edge
 *  on, leaving a feed spool, passing under a roller, carrying a few small dim frames of the film's own stills, passing a
 *  gate, ending on a take-up reel; on a wide PC it turns down and runs on beside the player. The owner's word on it:
 *  muted and subtle, never loud. So everything here is hairline geometry and true words only.
 *
 *  Pure: boxes in, a description of the drawing out (project/thread-draw.ts turns it into SVG; project/thread.ts
 *  measures the page). No DOM, no clock, no randomness. Every opacity lives in THREAD_INK; the planner hands back only
 *  places, sizes and words. Coordinates are the band's px (origin: its top-left, y down) unless said otherwise, and are
 *  rounded to one decimal; frames stand on whole px. */

export const THREAD_INK = {
  line: 0.24, tick: 0.12, frame: 0.26, roller: 0.22, hub: 0.3, reel: [0.22, 0.18, 0.12, 0.09],
  gate: 0.3, type: 0.36, code: 0.32, accent: 0.55, still: 0.4,
} as const;
export const THREAD = {
  bandH: 120,      // the band's height, px (project.css reserves the same)
  gap: 3,          // between the film's two hairlines
  clear: 14,       // kept clear of the player, its ticks and its label
  sideGap: 24,     // the side box starts this far right of the player's edge
  sideMin: 160,    // no side run in a narrower box
  spoolMin: 150,   // the feed spool stands in the rail only when the rail reaches this far left of the band
  phoneMax: 520,   // a band under this is a phone's
  wideMin: 1000,   // from this width a band with no side run carries five frames
} as const;

export interface Size { w: number; h: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Pic { code: string; w: number; h: number }               // a thumbnail: its still's code, its own size
export interface FilmWords { name: string; year: number; place: string }  // the name as written, e.g. 'Ever Faraway / Miên Viễn'; place 'P·14/20'
export interface PlanFrame {
  code: string; x: number; y: number; w: number; h: number;               // the frame's box (top-left, size)
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };    // where its code is written
}
export interface ThreadPlan {
  box: Box;                 // everything drawn lies inside it; the SVG's viewBox (x is negative where the rail is used)
  type: 8 | 9;              // the micro type's size, px
  path: string;             // SVG path data: the film's centre line, one continuous sub-path
  rollers: { x: number; y: number; r: number }[];
  reels: { x: number; y: number; rings: number[]; accent: boolean }[];    // radii, outermost first, at most 4 (THREAD_INK.reel by place)
  frames: PlanFrame[];
  gate: { x: number; y: number; vertical: boolean } | null;               // vertical: the film runs downward through it
  labels: { text: string; x: number; y: number; anchor: 'start' | 'end' }[];
  exit: number | null;      // a band whose film goes on beside the player: the x where it leaves the band's foot
}

// ---- the drawing's fixed measures (from the mock-up the owner chose; band px) ----

/** The film's straight run, where the frames hang. */
const LINE_Y = 60;
/** The centre line runs this far outside a roller's rim (a 9 px roller: 13 px from its centre). */
const WRAP = 4;
/** The micro face's advance per character, as a share of its size (Martian Mono, capitals, letter-spacing 0.16em;
 *  measured on a rendered picture: about 7.75 px at 9 px). */
const CHAR_EM = 0.86;
/** A frame's code stands this far under the frame's foot (its baseline). */
const CODE_DROP = 14;
/** Frames: the largest box a frame's picture is fitted into. */
const FRAME_PC: Size = { w: 80, h: 64 };
const FRAME_PHONE: Size = { w: 64, h: 48 };
/** The least space between two frames, and between the close pair's two. */
const FRAME_GAP = 8;
const PAIR_GAP = 10;
/** Off a phone, the frames fill at most this share of the run they hang on: empty black between them. */
const FRAME_ROOM = 0.6;
/** The least straight run the frames keep when the film is handed on beside the player (four frames of 60 px). */
const SIDE_RUN_MIN = 280;
/** A frame keeps this far from a wheel or the gate. */
const WHEEL_CLEAR = 8;
/** The gate's reach either side of its centre (its brackets and their ticks stand inside this). */
const GATE_REACH = 13;
/** Where the frames hang along the run, as shares of the run (centres). `null`: the close pair's second, set by edge. */
const SHARES = {
  side: [0.125, null, 0.555, 0.825],
  five: [0.1, null, 0.425, 0.645, 0.895],
  four: [0.1, null, 0.5, 0.85],
  phone: [0.18, 0.5, 0.86],
} as const;
/** The feed spool's rings (outermost first) and the take-up reels' (in the band; beside the player). */
const SPOOL_RINGS = [24, 15, 4];
const BAND_REEL = [28, 23, 18, 7];
const SIDE_REEL = [54, 46, 39, 11];

/** One decimal, never -0. */
const r1 = (v: number): number => Math.round(v * 10) / 10 + 0;
const pt = (x: number, y: number): string => `${r1(x)} ${r1(y)}`;
const textW = (s: string, type: number): number => [...s].length * type * CHAR_EM;

export function threadName(title: string, perLine: number, lines: number): string[] {
  const per = Math.max(1, Math.floor(perLine));
  const max = Math.max(1, Math.floor(lines));
  const first = title.split(' / ')[0].trim().toUpperCase();
  const tokens: string[] = [];
  for (const word of first.split(/\s+/).filter(Boolean)) {
    const ch = [...word];
    for (let i = 0; i < ch.length; i += per) tokens.push(ch.slice(i, i + per).join(''));
  }
  const out: string[] = [];
  let cur = '';
  for (const t of tokens) {
    const cand = cur ? `${cur} ${t}` : t;
    if ([...cand].length <= per) cur = cand;
    else { out.push(cur); cur = t; }
  }
  if (cur) out.push(cur);
  if (out.length <= max) return out;
  const kept = out.slice(0, max);
  const last = [...kept[max - 1]];
  kept[max - 1] = (last.length + 1 <= per ? last.join('') : last.slice(0, per - 1).join('').trimEnd()) + '…';
  return kept;
}

export function frameSize(pic: Size, maxW: number, maxH: number): Size {
  const pw = Math.max(1, pic.w), ph = Math.max(1, pic.h);
  const mw = Math.max(1, maxW), mh = Math.max(1, maxH);
  if (pw * mh >= ph * mw) return { w: Math.max(1, Math.round(mw)), h: Math.max(1, Math.min(Math.round(mh), Math.round((mw * ph) / pw))) };
  return { w: Math.max(1, Math.min(Math.round(mw), Math.round((mh * pw) / ph))), h: Math.max(1, Math.round(mh)) };
}

export function bandFrames(w: number, side: boolean): number {
  if (w < THREAD.phoneMax) return 3;
  if (side) return 4;
  return w < THREAD.wideMin ? 4 : 5;
}

export function sideBox(body: Size, player: Box | null): Box | null {
  if (!player) return null;
  const x = player.x + player.w + THREAD.sideGap;
  const w = body.w - x;
  const h = player.y + player.h - THREAD.bandH;
  if (w < THREAD.sideMin || h <= 0) return null;
  return { x, y: THREAD.bandH, w, h };
}

/** Hangs frames centred on the line between a and b (the straight run's free stretch): each at its share, the close
 *  pair's second by its edge, never nearer than FRAME_GAP to the next nor over the next one's code; when the run is too
 *  short the box shrinks (never the gaps). `room`: the share of the run the frames may fill at most, so black stands
 *  between them (the box shrinks for it, down to 3/4 of its size, no further). */
function hang(pics: readonly Pic[], box: Size, a: number, b: number, shares: readonly (number | null)[], type: number, room = 1): PlanFrame[] {
  if (pics.length === 0 || b <= a) return [];
  const n = pics.length;
  const full = pics.reduce((s, p) => s + frameSize(p, box.w, box.h).w, 0);
  const k0 = Math.min(1, Math.max(0.75, (room * (b - a)) / full));
  for (let k = k0; k > 0.04; k -= 0.05) {
    const sizes = pics.map((p) => frameSize(p, box.w * k, box.h * k));
    const gapAfter = (i: number) => Math.max(shares[i + 1] === null ? PAIR_GAP : FRAME_GAP, textW(pics[i].code, type) + 6 - sizes[i].w);
    const left: number[] = [];
    for (let i = 0; i < n; i++) {
      const s = shares[i];
      const want = s === null ? -Infinity : a + s * (b - a) - sizes[i].w / 2;
      const floor = i === 0 ? a : left[i - 1] + sizes[i - 1].w + gapAfter(i - 1);
      left.push(Math.ceil(s === null ? floor : Math.max(want, floor)));
    }
    // then back from the run's end: nothing past b, the gaps kept
    let ceil = b;
    for (let i = n - 1; i >= 0; i--) {
      left[i] = Math.min(left[i], Math.floor(ceil - sizes[i].w));
      ceil = left[i] - (i > 0 ? gapAfter(i - 1) : 0);
    }
    if (left[0] < a) continue;
    return pics.map((p, i) => {
      const { w, h } = sizes[i];
      const y = Math.round(LINE_Y - h / 2);
      return { code: p.code, x: left[i] + 0, y, w, h, label: { x: left[i] + 0, y: y + h + CODE_DROP, anchor: 'start' as const } };
    });
  }
  return [];
}

export function planBand(o: { w: number; rail: number; side: Box | null; pics: readonly Pic[]; film: FilmWords }): ThreadPlan {
  const w = Math.max(1, o.w);
  const phone = w < THREAD.phoneMax;
  const spool = !phone && o.rail >= THREAD.spoolMin;
  const side = phone ? null : o.side;
  const type: 8 | 9 = phone ? 8 : 9;
  const rollers: ThreadPlan['rollers'] = [];
  const reels: ThreadPlan['reels'] = [];
  const labels: ThreadPlan['labels'] = [];
  let path: string;
  let a: number; // where the straight run is free for frames

  // THE HEAD
  if (spool) {
    // the spool hangs from the rail's left edge; the film leaves its top, falls in an S and passes under the roller
    const sx = -o.rail + 42;
    const sy = LINE_Y - 40 + SPOOL_RINGS[0]; // the film leaves the spool's top at y 20
    reels.push({ x: r1(sx), y: sy, rings: [...SPOOL_RINGS], accent: false });
    rollers.push({ x: 22, y: 63, r: 9 });
    path = `M ${pt(sx, sy - SPOOL_RINGS[0])} L -74 20 C -32 20 -20 76 22 76 C 60 76 70 60 108 60`;
    a = 108;
    // (20 characters from a rail of 164 px; a narrower rail takes fewer, so the words' ink ends left of the band;
    //  the last letter's spacing is not ink)
    const name = threadName(o.film.name, Math.min(20, Math.floor((o.rail - 10 + 0.16 * type) / (type * CHAR_EM))), 2);
    const words = [...name, String(o.film.year)];
    const step = words.length > 2 ? 13 : 15;
    words.forEach((text, i) => labels.push({ text, x: r1(-o.rail + 10), y: 111 - step * (words.length - 1 - i), anchor: 'start' }));
  } else {
    // the film enters at the left edge, dips under a roller and rises to the run; a small phone draws the S narrower
    const f = phone ? Math.min(1, Math.max(0.75, w / 394)) : 1;
    const r = phone ? 7 : 9;
    const ry = phone ? 62 : 63;
    const low = ry + r + WRAP;
    rollers.push({ x: r1(74 * f), y: ry, r });
    path = `M 0 50 L ${pt(22 * f, 50)} C ${pt(44 * f, 50)} ${pt(50 * f, low)} ${pt(74 * f, low)} C ${pt(98 * f, low)} ${pt(102 * f, LINE_Y)} ${pt(126 * f, LINE_Y)}`;
    a = r1(126 * f);
  }

  // THE TAIL
  let b: number;
  let gate: ThreadPlan['gate'] = null;
  let exit: number | null = null;
  const placeW = textW(o.film.place, type);
  // the film is handed on beside the player only when the band keeps a fair run for its frames before the loop;
  // else it ends in the band (and the page draws no side run: exit is null)
  const exitAt = side ? Math.round(Math.min(w - 4, side.x + 0.26 * side.w)) : 0;
  const handOn = side !== null && exitAt - 213 - 9 - WHEEL_CLEAR - a >= SIDE_RUN_MIN;
  if (phone) {
    gate = { x: w - 18, y: LINE_Y, vertical: false };
    path += ` L ${pt(w, LINE_Y)}`;
    b = gate.x - GATE_REACH - WHEEL_CLEAR;
  } else if (handOn) {
    // the film runs on, over a roller, through a slack loop, over a roller, turns down and leaves the band's foot
    exit = exitAt;
    const l1 = exit - 213;
    rollers.push({ x: l1, y: LINE_Y + 13, r: 9 }, { x: l1 + 200, y: LINE_Y + 13, r: 9 });
    const q = 13 * 0.5523;
    path += ` L ${pt(l1, LINE_Y)} C ${pt(l1 + 40, LINE_Y)} ${pt(l1 + 42, 110)} ${pt(l1 + 100, 110)} C ${pt(l1 + 158, 110)} ${pt(l1 + 160, LINE_Y)} ${pt(l1 + 200, LINE_Y)}`;
    path += ` C ${pt(l1 + 200 + q, LINE_Y)} ${pt(exit, LINE_Y + 13 - q)} ${pt(exit, LINE_Y + 13)} L ${exit} ${THREAD.bandH}`;
    b = l1 - 9 - WHEEL_CLEAR;
  } else {
    // the gate, then the film winds onto the top of the take-up reel; the place stands right of the reel
    const R = BAND_REEL[0];
    const rx = w - 116;
    reels.push({ x: rx, y: LINE_Y + R, rings: [...BAND_REEL], accent: true });
    gate = { x: rx - (w >= THREAD.wideMin ? 120 : 72), y: LINE_Y, vertical: false };
    path += ` L ${pt(rx, LINE_Y)}`;
    labels.push({ text: o.film.place, x: rx + R + 12, y: LINE_Y + R + 3, anchor: 'start' });
    b = gate.x - GATE_REACH - WHEEL_CLEAR;
  }

  if (!spool) {
    // the name at the top left (on a phone beside the place, at the top right)
    const cw = type * CHAR_EM;
    const room = phone ? w - placeW - 16 : w - 8;
    const name = threadName(o.film.name, Math.max(4, Math.min(30, Math.floor(room / cw))), 1);
    labels.unshift({ text: name[0] ?? '', x: 0, y: 18, anchor: 'start' });
    if (phone) labels.push({ text: o.film.place, x: w, y: 18, anchor: 'end' });
  }

  const n = Math.min(o.pics.length, bandFrames(w, side !== null));
  const shares = phone ? SHARES.phone : handOn ? SHARES.side : n >= 5 ? SHARES.five : SHARES.four;
  const frames = hang(o.pics.slice(0, n), phone ? FRAME_PHONE : FRAME_PC, a, b, shares, type, phone ? 1 : FRAME_ROOM);

  const box: Box = spool ? { x: -o.rail, y: 0, w: w + o.rail, h: THREAD.bandH } : { x: 0, y: 0, w, h: THREAD.bandH };
  return { box, type, path, rollers, reels, frames, gate, labels, exit };
}

export function planSide(o: { side: Box; exit: number; player: Box; pics: readonly Pic[]; film: FilmWords }): ThreadPlan {
  const W = o.side.w, H = o.side.h;
  const type = 9;
  const ex = o.exit - o.side.x;
  const py = o.player.y - o.side.y;
  const ph = o.player.h;
  const placeW = textW(o.film.place, type);

  // the take-up reel: as large as the mock-up's where it fits, the place on the side with more room
  let R: number;
  let place: 'right' | 'left' | 'below';
  const roomR = (W - ex - 13 - placeW - 2) / 2;
  if (roomR >= 22) { R = Math.min(SIDE_REEL[0], roomR); place = 'right'; }
  else { R = Math.min(SIDE_REEL[0], (W - ex - 2) / 2); place = ex - 14 >= placeW ? 'left' : 'below'; }
  R = Math.max(8, Math.min(R, (H - 60) / 4));
  const below = place === 'below' ? 16 : 0;
  const reelY = Math.max(R + 40, Math.min(py + 0.7 * ph, H - R - 2 - below));
  const reelX = ex + R;
  const rings = SIDE_REEL.map((v) => r1((v * R) / SIDE_REEL[0]));
  const gateY = Math.max(GATE_REACH + 4, Math.min(py + 0.47 * ph, reelY - R - GATE_REACH - 6));

  // two frames hang on the film above the gate, their codes beside them; a short box drops the second, then the first
  const box = { w: Math.min(FRAME_PC.w, 2 * (ex - 2), 2 * (W - ex - 2)), h: FRAME_PC.h };
  const want = [0.16, 0.3].slice(0, Math.min(2, o.pics.length));
  let frames: PlanFrame[] = [];
  for (let n = want.length; n > 0; n--) {
    const sizes = o.pics.slice(0, n).map((p) => frameSize(p, box.w, box.h));
    const cy = want.slice(0, n).map((s) => py + s * ph);
    let limit = gateY - GATE_REACH - WHEEL_CLEAR;
    for (let i = n - 1; i >= 0; i--) {
      cy[i] = Math.min(cy[i], limit - sizes[i].h / 2);
      limit = cy[i] - sizes[i].h / 2 - 2 * FRAME_GAP; // (beside the player the pair stands further apart: more black)
    }
    if (cy[0] - sizes[0].h / 2 < 6) continue;
    frames = sizes.map((s, i) => {
      const x = Math.round(ex - s.w / 2);
      const y = Math.round(cy[i] - s.h / 2);
      const codeW = textW(o.pics[i].code, type);
      const leftX = x - 9;
      const label = leftX - codeW >= 0
        ? { x: leftX, y: r1(y + s.h / 2 + 3), anchor: 'end' as const }
        : { x: x + s.w + 9, y: r1(y + s.h / 2 + 3), anchor: 'start' as const };
      return { code: o.pics[i].code, x, y, w: s.w, h: s.h, label };
    });
    break;
  }

  const labels: ThreadPlan['labels'] = [
    place === 'right' ? { text: o.film.place, x: r1(reelX + R + 13), y: r1(reelY + 3), anchor: 'start' }
      : place === 'left' ? { text: o.film.place, x: r1(ex - 14), y: r1(reelY + 3), anchor: 'end' }
        : { text: o.film.place, x: r1(ex), y: r1(reelY + R + 14), anchor: 'start' },
  ];
  return {
    box: { x: 0, y: 0, w: W, h: H },
    type,
    path: `M ${ex} 0 L ${pt(ex, reelY)}`,
    rollers: [],
    reels: [{ x: r1(reelX), y: r1(reelY), rings, accent: true }],
    frames,
    gate: { x: ex, y: r1(gateY), vertical: true },
    labels,
    exit: null,
  };
}
