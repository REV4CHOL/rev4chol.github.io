import { describe, expect, it } from 'vitest';
import {
  THREAD, THREAD_INK, bandFrames, frameSize, planBand, planSide, sideBox, threadName,
  type Box, type Pic, type ThreadPlan,
} from '../src/project/thread-plan';

const film = { name: 'PHILIA', year: 2026, place: 'P·14/20' };
const wide: Pic[] = ['01', '09', '18', '26', '35', '43'].map((code) => ({ code, w: 192, h: 102 }));
const tall: Pic[] = ['1-01', '1-03', '1-05', '2-02', '2-07', '2-11'].map((code) => ({ code, w: 108, h: 192 }));
const scope: Pic[] = wide.map((p) => ({ ...p, h: 80 }));
const four3: Pic[] = wide.map((p) => ({ ...p, h: 144 }));

/** every box a plan draws: frames, rollers, reels, the gate, with its labels as points */
const drawn = (p: ThreadPlan): Box[] => [
  ...p.frames.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h })),
  ...p.rollers.map((r) => ({ x: r.x - r.r, y: r.y - r.r, w: 2 * r.r, h: 2 * r.r })),
  ...p.reels.map((r) => ({ x: r.x - r.rings[0], y: r.y - r.rings[0], w: 2 * r.rings[0], h: 2 * r.rings[0] })),
  ...(p.gate ? [{ x: p.gate.x - 13, y: p.gate.y - 13, w: 26, h: 26 }] : []),
  ...p.labels.map((l) => ({ x: l.x, y: l.y - p.type, w: 0, h: p.type })),
  ...p.frames.map((f) => ({ x: f.label.x, y: f.label.y - p.type, w: 0, h: p.type })),
];
const inside = (b: Box, o: Box) => b.x >= o.x - 0.01 && b.y >= o.y - 0.01 && b.x + b.w <= o.x + o.w + 0.01 && b.y + b.h <= o.y + o.h + 0.01;
const apart = (a: Box, b: Box, by: number) => a.x + a.w + by <= b.x || b.x + b.w + by <= a.x || a.y + a.h + by <= b.y || b.y + b.h + by <= a.y;

describe('quiet is a rule', () => {
  it('no bone line above 0.30, no type above 0.38, the accent at 0.55, the stills at 0.40', () => {
    const { line, tick, frame, roller, hub, reel, gate, type, code, accent, still } = THREAD_INK;
    for (const v of [line, tick, frame, roller, hub, gate, ...reel]) expect(v).toBeLessThanOrEqual(0.3);
    for (const v of [type, code]) expect(v).toBeLessThanOrEqual(0.38);
    expect(accent).toBe(0.55);
    expect(still).toBe(0.4);
    expect(reel).toHaveLength(4);
  });
  it('the band is 120 px, the film two hairlines 3 px apart, 14 px kept clear of the player', () => {
    expect([THREAD.bandH, THREAD.gap, THREAD.clear, THREAD.sideGap, THREAD.sideMin]).toEqual([120, 3, 14, 24, 160]);
  });
});

describe("the film's name on its thread", () => {
  it('in capitals, the English line of a two-language name', () => {
    expect(threadName('Philia', 20, 2)).toEqual(['PHILIA']);
    expect(threadName('Ever Faraway / Miên Viễn', 20, 2)).toEqual(['EVER FARAWAY']);
  });
  it('breaks at spaces into lines of at most 20, two lines, then trails off', () => {
    expect(threadName('Soft Hours & Lonely Lands', 20, 2)).toEqual(['SOFT HOURS & LONELY', 'LANDS']);
    const long = threadName("Forest Onsen - Ecopark's Eco Retreat Commercial", 20, 2);
    expect(long).toHaveLength(2);
    expect(long.every((l) => [...l].length <= 20)).toBe(true);
    expect(long[1].endsWith('…')).toBe(true);
    expect(long[0]).toBe('FOREST ONSEN -');
  });
  it('a word longer than a line is cut, not lost', () => {
    const one = threadName('mr_PURPLE_dreams_in_electric_fish', 20, 2);
    expect(one.every((l) => [...l].length <= 20)).toBe(true);
    expect(one.join('').replace('…', '').length).toBeGreaterThan(20);
  });
  it('one line for a phone', () => {
    expect(threadName('Remnants of a Dream / Tàn Tích Của Một Giấc Mơ', 30, 1)).toEqual(['REMNANTS OF A DREAM']);
    expect([...threadName('APL 2026 TEASER: Valor Rises, Battles Collide', 30, 1)[0]].length).toBeLessThanOrEqual(30);
  });
});

describe('a frame takes the shape of its own picture', () => {
  it('fits the box whole, never stretched', () => {
    expect(frameSize({ w: 192, h: 102 }, 80, 64)).toEqual({ w: 80, h: 43 });
    expect(frameSize({ w: 108, h: 192 }, 80, 64)).toEqual({ w: 36, h: 64 });
    expect(frameSize({ w: 192, h: 80 }, 80, 64)).toEqual({ w: 80, h: 33 });
    expect(frameSize({ w: 192, h: 144 }, 80, 64)).toEqual({ w: 80, h: 60 });
  });
});

describe('how many frames, and whether the film goes on beside the player', () => {
  it('3 on a phone; 4 with a side run; else 4 under 1000 px and 5 from there', () => {
    expect([bandFrames(394, false), bandFrames(519, false)]).toEqual([3, 3]);
    expect([bandFrames(520, false), bandFrames(999, false), bandFrames(1000, false), bandFrames(1684, false)]).toEqual([4, 4, 5, 5]);
    expect([bandFrames(1204, true), bandFrames(1684, true)]).toEqual([4, 4]);
  });
  it('the side box starts 24 px right of the player and needs 160 px', () => {
    const player = { x: 0, y: 176, w: 1243, h: 739 };
    expect(sideBox({ w: 1684, h: 915 }, player)).toEqual({ x: 1267, y: 120, w: 417, h: 795 });
    expect(sideBox({ w: 1426, h: 915 }, player)).toBeNull(); // 159 px
    expect(sideBox({ w: 1427, h: 915 }, player)).not.toBeNull(); // 160 px
    expect(sideBox({ w: 1684, h: 915 }, { x: 0, y: 176, w: 1684, h: 706 })).toBeNull(); // the player fills the row
    expect(sideBox({ w: 1684, h: 300 }, null)).toBeNull(); // a private film: no player
  });
});

describe('the band', () => {
  const widths = (lo: number, hi: number) => Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10);

  it('a phone: the film crosses from edge to edge with three frames and a gate, no reel', () => {
    const p = planBand({ w: 394, rail: 0, side: null, pics: wide, film });
    expect(p.type).toBe(8);
    expect(p.frames.map((f) => f.code)).toEqual(['01', '09', '18']);
    expect(p.reels).toEqual([]);
    expect(p.gate && !p.gate.vertical).toBe(true);
    expect(p.exit).toBeNull();
    expect(p.box).toEqual({ x: 0, y: 0, w: 394, h: 120 });
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', 'P·14/20']);
    expect(p.labels[1].anchor).toBe('end');
    expect(p.path).toMatch(/^M ?0[ ,]/);
  });

  it('no side run: the spool in the rail, five frames, the gate, the reel inside the band', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics: wide, film });
    expect(p.type).toBe(9);
    expect(p.frames.map((f) => f.code)).toEqual(['01', '09', '18', '26', '35']);
    expect(p.reels).toHaveLength(2);
    expect(p.reels[0].x).toBeLessThan(0); // the feed spool, in the rail
    expect(p.reels[0].accent).toBe(false);
    expect(p.reels[1].accent).toBe(true); // the take-up reel
    expect(p.reels[1].x + p.reels[1].rings[0]).toBeLessThanOrEqual(1130);
    expect(p.gate && !p.gate.vertical).toBe(true);
    expect(p.gate!.x).toBeGreaterThan(p.frames[4].x + p.frames[4].w);
    expect(p.gate!.x).toBeLessThan(p.reels[1].x - p.reels[1].rings[0]);
    expect(p.exit).toBeNull();
    expect(p.box).toEqual({ x: -164, y: 0, w: 1294, h: 120 });
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', '2026', 'P·14/20']);
  });

  it('a side run: four frames, three rollers, and the film leaves the foot inside the side box', () => {
    const side = { x: 1267, y: 120, w: 417, h: 795 };
    const p = planBand({ w: 1684, rail: 164, side, pics: wide, film });
    expect(p.frames.map((f) => f.code)).toEqual(['01', '09', '18', '26']);
    expect(p.rollers).toHaveLength(3);
    expect(p.reels).toHaveLength(1);
    expect(p.gate).toBeNull();
    expect(p.exit).toBeGreaterThan(side.x + 40);
    expect(p.exit).toBeLessThan(side.x + side.w - 40);
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', '2026']);
    expect(p.path.trim()).toMatch(new RegExp(`${p.exit}[ ,]120$`)); // (it ends at the band's foot, at the exit)
  });

  it('no rail to stand in (a small tablet upright): no feed spool; the film enters at the left edge, the reel still ends it', () => {
    const p = planBand({ w: 724, rail: 0, side: null, pics: wide, film });
    expect(p.box).toEqual({ x: 0, y: 0, w: 724, h: 120 });
    expect(p.type).toBe(9);
    expect(p.reels).toHaveLength(1);
    expect(p.reels[0].accent).toBe(true);
    expect(p.frames).toHaveLength(4);
    expect(p.labels.map((l) => l.text)).toEqual(['PHILIA', 'P·14/20']);
    expect(p.path).toMatch(/^M ?0[ ,]/);
  });

  it('a rail but a band under 520 px (a narrow PC window): the phone\'s drawing, nothing in the rail', () => {
    const p = planBand({ w: 464, rail: 164, side: null, pics: wide, film });
    expect(p.box).toEqual({ x: 0, y: 0, w: 464, h: 120 });
    expect(p.reels).toEqual([]);
    expect(p.frames).toHaveLength(3);
  });

  it('a long name stands in two lines under the spool', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics: wide, film: { ...film, name: 'Soft Hours & Lonely Lands' } });
    expect(p.labels.map((l) => l.text)).toEqual(['SOFT HOURS & LONELY', 'LANDS', '2026', 'P·14/20']);
  });

  it('at every width and for every shape: all of it inside its box, the frames apart, no number missing', () => {
    for (const pics of [wide, tall, scope, four3]) {
      for (const w of widths(280, 1800)) for (const rail of [0, 164]) {
        for (const side of w >= 900 ? [null, { x: w - 300, y: 120, w: 300, h: 700 }] : [null]) {
          const p = planBand({ w, rail, side, pics, film });
          const at = `${pics[0].code} w ${w} rail ${rail} side ${!!side}`;
          expect(p.path, at).not.toMatch(/NaN|undefined|Infinity/);
          expect(p.frames, at).toHaveLength(bandFrames(w, side !== null));
          for (const b of drawn(p)) expect(inside(b, p.box), `${at} ${JSON.stringify(b)}`).toBe(true);
          for (const f of p.frames) expect(inside(f, { x: 0, y: 0, w, h: 120 }), at).toBe(true);
          for (let i = 1; i < p.frames.length; i++) expect(apart(p.frames[i - 1], p.frames[i], 8), `${at} frames ${i}`).toBe(true);
          const solid = [...p.rollers.map((r) => ({ x: r.x - r.r, y: r.y - r.r, w: 2 * r.r, h: 2 * r.r })), ...p.reels.map((r) => ({ x: r.x - r.rings[0], y: r.y - r.rings[0], w: 2 * r.rings[0], h: 2 * r.rings[0] }))];
          for (const f of p.frames) for (const s of solid) expect(apart(f, s, 4), `${at} frame and wheel`).toBe(true);
          expect(p.box.y, at).toBe(0);
          expect(p.box.h, at).toBe(120);
        }
      }
    }
  });

  it('with no pictures the film runs bare', () => {
    const p = planBand({ w: 1130, rail: 164, side: null, pics: [], film });
    expect(p.frames).toEqual([]);
    expect(p.path.length).toBeGreaterThan(10);
  });
});

describe('the side run', () => {
  const side = { x: 1267, y: 120, w: 417, h: 795 };
  const player = { x: 0, y: 176, w: 1243, h: 739 };

  it('straight down from the band: two frames, the gate level with the player, the reel, the place', () => {
    const band = planBand({ w: 1684, rail: 164, side, pics: wide, film });
    const p = planSide({ side, exit: band.exit!, player, pics: wide.slice(4), film });
    expect(p.box).toEqual({ x: 0, y: 0, w: 417, h: 795 });
    expect(p.path).toMatch(new RegExp(`^M ?${band.exit! - side.x}[ ,]0`)); // (it starts where the band's film left)
    expect(p.frames.map((f) => f.code)).toEqual(['35', '43']);
    expect(p.gate && p.gate.vertical).toBe(true);
    const gateY = p.gate!.y + side.y; // in the band's px
    expect(gateY).toBeGreaterThan(player.y + 0.35 * player.h);
    expect(gateY).toBeLessThan(player.y + 0.6 * player.h);
    expect(p.reels).toHaveLength(1);
    expect(p.reels[0].accent).toBe(true);
    expect(p.labels.map((l) => l.text)).toEqual(['P·14/20']);
    expect(p.exit).toBeNull();
    for (const b of drawn(p)) expect(inside(b, p.box), JSON.stringify(b)).toBe(true);
  });

  it('in every box from 160 px wide, short or tall, landscape or upright: inside the box, the frames apart', () => {
    for (const pics of [wide.slice(4), tall.slice(4), scope.slice(4), []]) {
      for (const w of [160, 200, 260, 320, 417, 600]) {
        for (const h of [260, 400, 560, 795]) {
          const s = { x: 1000, y: 120, w, h };
          const pl = { x: 0, y: 176, w: 976, h: h - 56 };
          const band = planBand({ w: 1000 + w, rail: 164, side: s, pics: wide, film });
          const p = planSide({ side: s, exit: band.exit!, player: pl, pics, film });
          const at = `side ${w} x ${h} pics ${pics.length}`;
          expect(p.path, at).not.toMatch(/NaN|undefined|Infinity/);
          for (const b of drawn(p)) expect(inside(b, p.box), `${at} ${JSON.stringify(b)}`).toBe(true);
          for (let i = 1; i < p.frames.length; i++) expect(apart(p.frames[i - 1], p.frames[i], 8), at).toBe(true);
          expect(p.frames.length, at).toBeLessThanOrEqual(pics.length);
        }
      }
    }
  });
});

// ---- added: what the laws above cannot see (text has width; the line must read as one strip; nothing touches) ----

const CH = 0.86; // the micro face's advance per character (Martian Mono, capitals, 0.16em; measured on a picture: 7.75 px at 9 px)
/** a label as the box its words cover */
const textBox = (t: { text: string; x: number; y: number; anchor: string }, type: number): Box => {
  const w = [...t.text].length * type * CH - 0.16 * type; // (the last letter's spacing is not ink)
  const x = t.anchor === 'end' ? t.x - w : t.anchor === 'middle' ? t.x - w / 2 : t.x;
  return { x, y: t.y - type * 0.8, w, h: type * 0.8 + 1 };
};
const codes = (p: ThreadPlan) => p.frames.map((f) => ({ text: f.code, ...f.label }));
/** the path's commands as numbers (absolute M, L, C only) */
const segs = (d: string) => [...d.matchAll(/([MLC])([^MLC]*)/g)].map((m) => ({ c: m[1], n: m[2].trim().split(/[ ,]+/).map(Number) }));
/** points along the centre line, every few px */
const along = (d: string): [number, number][] => {
  const out: [number, number][] = [];
  let px = 0, py = 0;
  for (const s of segs(d)) {
    if (s.c === 'M') { [px, py] = s.n; out.push([px, py]); continue; }
    if (s.c === 'L') {
      const [x, y] = s.n; const k = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / 2));
      for (let i = 1; i <= k; i++) out.push([px + ((x - px) * i) / k, py + ((y - py) * i) / k]);
      [px, py] = [x, y]; continue;
    }
    const [x1, y1, x2, y2, x, y] = s.n;
    for (let i = 1; i <= 60; i++) {
      const t = i / 60, u = 1 - t;
      out.push([u * u * u * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y]);
    }
    [px, py] = [x, y];
  }
  return out;
};
/** the film's own width: two hairlines 3 px apart, each 1 px */
const HALF = 2.5;
const offLine = (p: ThreadPlan, b: Box, by: number) => along(p.path).every(([x, y]) => x < b.x - HALF - by || x > b.x + b.w + HALF + by || y < b.y - HALF - by || y > b.y + b.h + HALF + by);
const wheels = (p: ThreadPlan): Box[] => [
  ...p.rollers.map((r) => ({ x: r.x - r.r, y: r.y - r.r, w: 2 * r.r, h: 2 * r.r })),
  ...p.reels.map((r) => ({ x: r.x - r.rings[0], y: r.y - r.rings[0], w: 2 * r.rings[0], h: 2 * r.rings[0] })),
];
const gateBox = (p: ThreadPlan): Box[] => (p.gate ? [{ x: p.gate.x - 13, y: p.gate.y - 13, w: 26, h: 26 }] : []);

const NAMES = ['Philia', 'Soft Hours & Lonely Lands', "Forest Onsen - Ecopark's Eco Retreat Commercial", 'APL 2026 TEASER: Valor Rises, Battles Collide'];
const bands = () => {
  const out: { p: ThreadPlan; at: string }[] = [];
  for (const pics of [wide, tall, scope, four3]) for (let w = 280; w <= 1800; w += 20) for (const rail of [0, 150, 157, 164, 220]) {
    const narrowSide = w >= 520 + 160 ? [{ x: 324, y: 120, w: w - 324, h: 700 }] : [];
    for (const side of [...(w >= 900 ? [null, { x: w - 300, y: 120, w: 300, h: 700 }, { x: w - 417, y: 120, w: 417, h: 795 }] : [null]), ...narrowSide]) {
      const name = NAMES[(w / 20 + rail) % NAMES.length];
      out.push({ p: planBand({ w, rail, side, pics, film: { ...film, name } }), at: `${pics[0].code} w ${w} rail ${rail} side ${side?.w ?? 0} ${name}` });
    }
  }
  return out;
};
const sides = () => {
  const out: { p: ThreadPlan; at: string }[] = [];
  for (const pics of [wide.slice(4), tall.slice(4), scope.slice(4), four3.slice(4), []]) for (const w of [160, 180, 200, 260, 320, 417, 600, 900, 1250]) {
    for (const h of [260, 300, 400, 560, 795, 1000]) {
      const s = { x: 1000, y: 120, w, h };
      const band = planBand({ w: 1000 + w, rail: 164, side: s, pics: wide, film });
      out.push({ p: planSide({ side: s, exit: band.exit!, player: { x: 0, y: 176, w: 976, h: h - 56 }, pics, film }), at: `side ${w} x ${h} ${pics[0]?.code ?? 'none'} ${pics.length}` });
    }
  }
  return out;
};

describe('the line reads as one strip', () => {
  it('one sub-path of absolute M, L and C, every join smooth (no kink)', () => {
    for (const { p, at } of [...bands(), ...sides()]) {
      expect(p.path, at).toMatch(/^M[^M]*$/);
      expect(p.path, at).not.toMatch(/[a-zHVSQTA]/);
      let prevOut: [number, number] | null = null;
      let px = 0, py = 0;
      for (const s of segs(p.path)) {
        if (s.c === 'M') { [px, py] = [s.n[0], s.n[1]]; continue; }
        const n = s.n;
        const end: [number, number] = [n[n.length - 2], n[n.length - 1]];
        const inDir: [number, number] = s.c === 'L' ? [end[0] - px, end[1] - py] : (n[0] !== px || n[1] !== py ? [n[0] - px, n[1] - py] : [n[2] - px, n[3] - py]);
        const outDir: [number, number] = s.c === 'L' ? inDir : (n[2] !== end[0] || n[3] !== end[1] ? [end[0] - n[2], end[1] - n[3]] : [end[0] - n[0], end[1] - n[1]]);
        if (prevOut) {
          const cos = (prevOut[0] * inDir[0] + prevOut[1] * inDir[1]) / (Math.hypot(...prevOut) * Math.hypot(...inDir));
          expect(cos, `${at} at ${px},${py}`).toBeGreaterThan(0.999);
        }
        prevOut = outDir;
        [px, py] = end;
      }
    }
  });
  it('the line runs on each roller, at its rim plus a small clearance, never through it', () => {
    for (const { p, at } of bands()) {
      const pts = along(p.path);
      for (const r of p.rollers) {
        const d = Math.min(...pts.map(([x, y]) => Math.hypot(x - r.x, y - r.y)));
        expect(d, at).toBeGreaterThan(r.r + HALF - 0.6);
        expect(d, at).toBeLessThan(r.r + 5);
      }
    }
  });
});

describe('nothing touches', () => {
  it('in the band: words inside the box, clear of the line, the frames, the wheels, the gate and each other', () => {
    for (const { p, at } of bands()) {
      const words = [...p.labels.map((l) => textBox(l, p.type)), ...codes(p).map((c) => textBox(c, p.type))];
      for (const b of words) {
        expect(inside(b, p.box), `${at} ${JSON.stringify(b)}`).toBe(true);
        expect(offLine(p, b, 1), `${at} word on the line ${JSON.stringify(b)}`).toBe(true);
        for (const s of [...wheels(p), ...gateBox(p)]) expect(apart(b, s, 2), `${at} word on a wheel`).toBe(true);
        for (const f of p.frames) expect(apart(b, f, 2), `${at} word on a frame`).toBe(true);
      }
      for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) {
        expect(apart(words[i], words[j], 2), `${at} words ${i} ${j}`).toBe(true);
      }
      for (const f of p.frames) for (const g of gateBox(p)) expect(apart(f, g, 4), `${at} frame and gate`).toBe(true);
      for (const g of gateBox(p)) for (const s of wheels(p)) expect(apart(g, s, 4), `${at} gate and wheel`).toBe(true);
    }
  });
  it('beside the player: words, frames, the gate and the reel apart; a short box drops the second frame, then the first', () => {
    for (const { p, at } of sides()) {
      const words = [...p.labels.map((l) => textBox(l, p.type)), ...codes(p).map((c) => textBox(c, p.type))];
      const parts = [...p.frames, ...gateBox(p), ...wheels(p)];
      for (const b of words) {
        expect(inside(b, p.box), `${at} ${JSON.stringify(b)}`).toBe(true);
        expect(offLine(p, b, 1), `${at} word on the line`).toBe(true);
        for (const s of parts) expect(apart(b, s, 2), `${at} word on a part`).toBe(true);
      }
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
        expect(apart(parts[i], parts[j], 4), `${at} parts ${i} ${j}`).toBe(true);
      }
    }
    const s = { x: 1000, y: 120, w: 200, h: 260 };
    const ex = planBand({ w: 1200, rail: 164, side: s, pics: wide, film }).exit!;
    const pl = { x: 0, y: 176, w: 976, h: 204 };
    expect(planSide({ side: s, exit: ex, player: pl, pics: tall.slice(4), film }).frames.map((f) => f.code)).toEqual(['2-07']);
    expect(planSide({ side: { ...s, h: 795 }, exit: ex, player: { ...pl, h: 739 }, pics: tall.slice(4), film }).frames.map((f) => f.code)).toEqual(['2-07', '2-11']);
  });
});

describe('the words', () => {
  it('a rail from 150 px holds a long name in two lines and the year, all of it left of the band', () => {
    for (const rail of [150, 157, 164]) {
      const p = planBand({ w: 1130, rail, side: null, pics: wide, film: { ...film, name: 'Soft Hours & Lonely Lands' } });
      expect(p.labels.length, String(rail)).toBe(4);
      for (const l of p.labels.slice(0, 3)) expect(textBox(l, 9).x + textBox(l, 9).w, String(rail)).toBeLessThanOrEqual(0);
    }
  });
  it('a phone writes the name beside the place, never under it', () => {
    for (const w of [280, 320, 394, 519]) {
      const p = planBand({ w, rail: 0, side: null, pics: wide, film: { ...film, name: 'APL 2026 TEASER: Valor Rises, Battles Collide' } });
      expect(apart(textBox(p.labels[0], 8), textBox(p.labels[1], 8), 8), String(w)).toBe(true);
    }
  });
  it('the same boxes give the same drawing (pure)', () => {
    const o = { w: 1684, rail: 164, side: { x: 1267, y: 120, w: 417, h: 795 }, pics: wide, film };
    expect(planBand(o)).toEqual(planBand(o));
  });
});

describe('empty black between the frames', () => {
  it('a band that is not a phone\'s never packs its frames edge to edge: from 724 px they stand at least 16 px apart', () => {
    for (const w of [724, 800, 900, 1000, 1130, 1684]) for (const rail of [0, 164]) for (const pics of [wide, scope, four3]) {
      const p = planBand({ w, rail, side: null, pics, film });
      for (let i = 1; i < p.frames.length; i++) expect(p.frames[i].x - p.frames[i - 1].x - p.frames[i - 1].w, `w ${w} rail ${rail} ${i}`).toBeGreaterThanOrEqual(i === 1 ? 10 : 16);
    }
  });
});

describe('a side box beside a band too short for the loop', () => {
  it('the film ends in the band (gate, reel, place) rather than shrink its frames to nothing; the side run is not drawn', () => {
    for (const w of [520, 600, 700, 800]) {
      const p = planBand({ w, rail: 164, side: { x: 324, y: 120, w: w - 324, h: 700 }, pics: wide, film });
      expect(p.exit, String(w)).toBeNull();
      expect(p.reels.at(-1)?.accent, String(w)).toBe(true);
      expect(p.labels.at(-1)?.text, String(w)).toBe('P·14/20');
    }
  });
  it('wherever a band hands the film on, its frames stay at least 40 px wide', () => {
    for (let w = 520; w <= 1800; w += 20) for (const sx of [324, w - 417, w - 300, w - 160]) {
      if (sx < 1 || w - sx < 160) continue;
      const p = planBand({ w, rail: 164, side: { x: sx, y: 120, w: w - sx, h: 700 }, pics: wide, film });
      if (p.exit !== null) for (const f of p.frames) expect(f.w, `w ${w} side at ${sx}`).toBeGreaterThanOrEqual(40);
    }
  });
});
