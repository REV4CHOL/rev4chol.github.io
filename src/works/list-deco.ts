/** THE LIST'S CITY AND ITS MACHINES (owner, 2026-10-13: "decoration art filling up the two sides' negative space and
 *  the background … our art direction mixing with 8bit … an animated 8bit city in the black background too" — "keep
 *  all the projects all perfectly readable in the middle"; then the machines, opened up and floating, "a mix between 3D
 *  and pixel arts", "highly customised", "more crazy"). Under THE LIST, three layers on one grid of 8-bit pixels:
 *  - the city (works/pixel-city.ts): one small canvas blown up by a whole number of the screen's pixels;
 *  - the machines (works/list-machines.ts, three.js, loaded when THE LIST first opens on a wide screen): the GRADE bay
 *    left, the CUT bay right, the conduit between them behind the list;
 *  - the ink: the callouts' dotted leaders, ending in lime dots on the parts.
 *  Over them, the site's hardware in each margin (works/list-art.ts): the bay's lime plate and the film it has cued, a
 *  spine of readouts at the screen's edge, the callouts' labels; the column's own rule, dotted and ticked, is the
 *  city's. The reading column's
 *  black is the list's own CSS band: nothing here is ever under a title.
 *
 *  Everything steps twelve times a second. A margin under 80 plate px (a phone, a tablet) builds nothing; under 300 it
 *  keeps the city and the hardware but no machines. CALM draws one still frame; the LITE tier draws the city's still
 *  and no machines; the list's closing, or a hidden tab, stops it all. */
import { isMobile, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';
import { quality } from '../lib/quality';
import { sessionTag } from '../shell/session-tag';
import { COLUMN, conduitRun, Side, sideLayout, SPINES, TAGS } from './list-art';
import type { Anchor, MachineFilm, Machines, Stage } from './list-machines';
import { cueAt } from './machines';
import {
  bayer, beamAngle, carAt, carCount, cityScale, flyerAt, flyerCount, frameAt, INK, mastOn, Plan, planCity, signOn, signPixel,
  skyTone, starOn, STEPS, trainAt, TRAIN_LEN, windowLit,
} from './pixel-city';

export interface ListDeco { start(): void; stop(): void }

const SEED = 0x2e7ac;
const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

export function mountListDeco(listEl: HTMLElement, films: MachineFilm[]): ListDeco {
  const main = listEl.parentElement!;
  const root = document.createElement('div');
  root.id = 'list-deco';
  root.setAttribute('aria-hidden', 'true');
  root.hidden = true;
  main.insertBefore(root, listEl);
  const layer = (cls: string) => { const c = document.createElement('canvas'); c.className = `ld-layer ${cls}`; root.append(c); return c; };
  const city = layer('ld-city'), gl = layer('ld-machines'), inkC = layer('ld-ink');
  const cctx = city.getContext('2d', { alpha: false }), ictx = inkC.getContext('2d');
  const back = document.createElement('canvas'), front = document.createElement('canvas');
  const hud = document.createElement('div');
  hud.className = 'ld-hud';
  root.append(hud);

  let session = 'RVL-0000';
  try { session = sessionTag(sessionStorage.getItem('rvl-sid')); } catch { /* no storage */ }

  let plan: Plan | null = null;
  let D = 4, Z = 1, DPR = 1;
  let sides: [Side, Side] | null = null;
  let machines: Machines | null = null, loading = false, machinesOff = false;
  let stage: Stage | null = null;
  let cueEls: HTMLElement[] = [], labels: Record<'left' | 'right', HTMLElement[]> = { left: [], right: [] };
  let running = false, raf = 0, lastF = -1, t0 = performance.now();
  let pointed: number | null = null, lookAt: [number, number] | null = null;

  const lite = () => quality.tier() === 0;
  const still = () => reducedMotion() || lite();

  /* ------------------------------------------------------------ the build -- */

  const build = () => {
    Z = posterZoom(); DPR = window.devicePixelRatio || 1;
    const plateW = window.innerWidth / Z, plateH = window.innerHeight / Z;
    const l = sideLayout(plateW, plateH, 'left'), r = sideLayout(plateW, plateH, 'right');
    hud.replaceChildren(); cueEls = []; labels = { left: [], right: [] };
    const built = !!l && !!r && !!cctx && !(isMobile() && !window.matchMedia('(pointer: fine)').matches);
    document.documentElement.classList.toggle('rvl-list-city', built); // (the list's black narrows to its band: CSS)
    root.hidden = !built; // (a phone shows nothing of it at all)
    if (!built || !l || !r) { plan = null; sides = null; return; }
    sides = [l, r];
    // one grid: whole screen pixels a city pixel, every layer sized in plate px to land on them exactly
    const dw = Math.round(window.innerWidth * DPR), dh = Math.round(window.innerHeight * DPR);
    D = cityScale(dh);
    const W = Math.ceil(dw / D), H = Math.ceil(dh / D);
    for (const c of [city, gl, inkC]) { c.style.width = `${(W * D) / (Z * DPR)}px`; c.style.height = `${(H * D) / (Z * DPR)}px`; }
    city.width = inkC.width = W; city.height = inkC.height = H;
    const cx = W / 2, hw = ((COLUMN / 2) * Z * DPR) / D;
    plan = planCity(SEED, W, H, [Math.round(cx - hw), Math.round(cx + hw)]);
    paintLayers(plan);
    for (const s of sides) buildHardware(s);
    // the machines: the slots in the city's pixels
    const px = (v: number) => (v * Z * DPR) / D;
    const slots = [...l.slots, ...r.slots].map((s) => ({ key: s.key, x: px(s.x), y: px(s.y), w: px(s.w), h: px(s.h) }));
    const run = conduitRun(l, r);
    const bed = r.slots.find((s) => s.key === 'flatbed');
    stage = {
      W, H, slots,
      conduit: run ? { x0: px(run.x0), x1: px(run.x1), y: px(run.y) } : null,
      sheep: bed ? { x0: px(bed.x + bed.w * 0.1), x1: px(bed.x + bed.w * 0.9), y: px(bed.y + bed.h * 0.04) } : null,
      moon: plan.moon,
    };
    gl.hidden = !slots.length || lite() || machinesOff;
    if (slots.length && !lite() && !machinesOff) ensureMachines();
    machines?.layout(stage);
    lastF = -1;
  };

  const ensureMachines = () => {
    if (machines || loading) return;
    loading = true;
    import('./list-machines').then(({ createMachines }) => {
      loading = false;
      machines = createMachines(gl, films, session);
      if (!machines) { machinesOff = true; gl.hidden = true; return; }
      gl.addEventListener('webglcontextlost', () => { machines = null; machinesOff = true; gl.hidden = true; });
      if (stage) machines.layout(stage);
      lastF = -1; kick();
    }).catch(() => { loading = false; machinesOff = true; gl.hidden = true; });
  };

  const buildHardware = (s: Side) => {
    const el = document.createElement('div');
    el.className = `ld-side ld-${s.side}`;
    const spine = document.createElement('span');
    spine.className = 'ld-spine micro';
    spine.textContent = SPINES[s.side];
    spine.style.left = `${s.spine}px`;
    el.append(spine);
    if (s.tag) {
      const tag = document.createElement('span');
      tag.className = 'ld-tag micro';
      Object.assign(tag.style, { left: `${s.tag.x}px`, top: `${s.tag.y}px`, width: `${s.tag.w}px` });
      tag.textContent = TAGS[s.side];
      const cue = document.createElement('span');
      cue.className = 'ld-cue micro';
      Object.assign(cue.style, { left: `${s.tag.x}px`, top: `${s.tag.y + 34}px`, width: `${s.tag.w}px` });
      cueEls.push(cue);
      el.append(tag, cue);
    }
    hud.append(el);
  };

  /** The layers painted once a size: the sky, the moon and the far skyline (back); the mid and near skylines, their
   *  steady windows, the rail and the column's frame (front, open where the sky shows). */
  const paintLayers = (pl: Plan) => {
    const { w: W, h: H } = pl;
    back.width = front.width = W; back.height = front.height = H;
    const b = back.getContext('2d')!, f = front.getContext('2d')!;
    const sky = b.createImageData(W, H), rgb = INK.sky.map(hex), n = rgb.length - 1;
    for (let y = 0; y < H; y++) {
      const tone = skyTone(y, H), lo = Math.min(n, Math.floor(tone)), fr = tone - lo;
      for (let x = 0; x < W; x++) {
        const c = rgb[fr > bayer(x, y) ? Math.min(n, lo + 1) : lo], i = (y * W + x) * 4;
        sky.data[i] = c[0]; sky.data[i + 1] = c[1]; sky.data[i + 2] = c[2]; sky.data[i + 3] = 255;
      }
    }
    b.putImageData(sky, 0, 0);
    // the moon: a crescent in bone, a dithered halo — the margins' one light
    const { x: mx, y: my, r: mr } = pl.moon;
    for (let y = my - mr - 5; y <= my + mr + 5; y++) for (let x = mx - mr - 5; x <= mx + mr + 5; x++) {
      const d = Math.hypot(x - mx, y - my), cut = Math.hypot(x - mx - mr * 0.5, y - my + mr * 0.3);
      if (d <= mr && cut > mr * 0.85) { b.fillStyle = INK.bone; b.fillRect(x, y, 1, 1); }
      else if (d > mr + 1 && d <= mr + 5 && bayer(x, y) < 0.36 - (d - mr) * 0.06) { b.fillStyle = INK.flourishDim; b.fillRect(x, y, 1, 1); }
    }
    for (const q of pl.buildings.filter((q) => q.layer === 0)) {
      b.fillStyle = INK.far; b.fillRect(q.x, q.top, q.w, q.base - q.top);
      for (const w of q.wins) { b.fillStyle = w.c; b.fillRect(w.x, w.y, 1, 1); }
    }
    f.clearRect(0, 0, W, H);
    for (const q of pl.buildings.filter((q) => q.layer === 1)) {
      f.fillStyle = INK.mid;
      f.fillRect(q.x, q.top, q.w, q.base - q.top);
      for (const r of q.roof) f.fillRect(r.x, r.y, r.w, r.h);
      for (const m of q.masts) f.fillRect(m.x, m.y, 1, q.top - m.y);
      f.fillStyle = INK.midEdge;
      f.fillRect(q.x, q.top, 1, q.base - q.top);
      f.fillRect(q.x, q.top, q.w, 1);
      for (const r of q.roof) f.fillRect(r.x, r.y, r.w, 1);
      for (const w of q.wins) if (!w.flip && w.lit) { f.fillStyle = w.c; f.fillRect(w.x, w.y, 1, 1); }
    }
    f.fillStyle = INK.near; f.fillRect(0, pl.rail, W, 2);
    f.fillStyle = INK.midEdge; f.fillRect(0, pl.rail, W, 1);
    for (let x = 6; x < W; x += 8) { f.fillStyle = INK.boneDim; f.fillRect(x, pl.rail + 2, 1, 1); }
    f.fillStyle = INK.near;
    for (let x = 18; x < W; x += 44) f.fillRect(x, pl.rail + 2, 2, H - pl.rail - 2);
    for (const q of pl.buildings.filter((q) => q.layer === 2)) {
      f.fillStyle = INK.near; f.fillRect(q.x, q.top, q.w, q.base - q.top);
      f.fillStyle = INK.nearEdge; f.fillRect(q.x, q.top, q.w, 1);
      for (const w of q.wins) { f.fillStyle = w.c; f.fillRect(w.x, w.y, 1, 1); }
    }
    // the column's frame: a field-blue rule with ticks either side, and the black dithered out into the city
    const [b0, b1] = pl.band;
    for (let y = 0; y < H; y++) for (let k = 1; k <= 7; k++) {
      const dens = 1 - (k - 1) / 7;
      if (bayer(b0 - k, y) < dens) { f.fillStyle = INK.void; f.fillRect(b0 - k, y, 1, 1); }
      if (bayer(b1 - 1 + k, y) < dens) { f.fillStyle = INK.void; f.fillRect(b1 - 1 + k, y, 1, 1); }
    }
    f.fillStyle = INK.field;
    for (let y = 0; y < H; y += 2) { f.fillRect(b0 - 9, y, 1, 1); f.fillRect(b1 + 8, y, 1, 1); }
    for (let y = 4; y < H; y += 8) {
      const long = y % 32 === 4;
      f.fillStyle = long ? INK.signal : INK.farLit;
      f.fillRect(b0 - (long ? 12 : 11), y, long ? 3 : 2, 1); f.fillRect(b1 + 9, y, long ? 3 : 2, 1);
    }
  };

  /* ------------------------------------------------------------ a frame -- */

  const drawCity = (f: number, t: number) => {
    const pl = plan!, c = cctx!;
    const { w: W, h: H } = pl;
    c.drawImage(back, 0, 0);
    for (const bm of pl.beams) { // the searchlights, dithered, behind the near skylines
      const a = beamAngle(bm, f), dx = Math.sin(a), dy = -Math.cos(a);
      c.fillStyle = INK.flourishDim;
      for (let s = 4; s < bm.reach; s++) {
        const half = 1 + s * 0.06, cx = bm.x + dx * s, cy = bm.y + dy * s, dens = 0.4 * (1 - s / bm.reach);
        for (let k = -half; k <= half; k++) {
          const x = Math.round(cx - dy * k), y = Math.round(cy + dx * k);
          if (y >= 0 && x >= 0 && x < W && bayer(x, y) < dens) c.fillRect(x, y, 1, 1);
        }
      }
    }
    for (const s of pl.stars) if (starOn(s, f)) {
      c.fillStyle = s.c; c.fillRect(s.x, s.y, 1, 1);
      if (s.cross) { c.fillStyle = INK.flourishDim; c.fillRect(s.x - 1, s.y, 1, 1); c.fillRect(s.x + 1, s.y, 1, 1); c.fillRect(s.x, s.y - 1, 1, 1); c.fillRect(s.x, s.y + 1, 1, 1); }
    }
    for (let i = 0; i < flyerCount(W); i++) {
      const q = flyerAt(i, t, W, H);
      c.fillStyle = INK.midEdge; c.fillRect(q.x, q.y, 4, 1);
      c.fillStyle = INK.boneDim; c.fillRect(q.x + (q.dir === 1 ? 3 : 0), q.y, 1, 1);
      if (q.blink) { c.fillStyle = INK.alert; c.fillRect(q.x - 1, q.y, 1, 1); c.fillStyle = INK.signal; c.fillRect(q.x + 4, q.y, 1, 1); }
    }
    c.drawImage(front, 0, 0);
    for (const q of pl.buildings) {
      if (q.layer !== 1) continue;
      for (const w of q.wins) if (w.flip) { c.fillStyle = windowLit(w, f) ? w.c : INK.mid; c.fillRect(w.x, w.y, 1, 1); }
      for (const m of q.masts) if (mastOn(m, f)) { c.fillStyle = INK.alert; c.fillRect(m.x, m.y, 1, 1); }
      for (const s of q.signs) {
        const on = signOn(s, f);
        if (s.w > 3) { c.fillStyle = INK.near; c.fillRect(s.x, s.y, s.w, s.h); }
        if (!on && s.w <= 3) continue;
        c.fillStyle = on ? s.c : INK.midEdge;
        for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) if (signPixel(s, dx, dy, f)) c.fillRect(s.x + dx, s.y + dy, 1, 1);
      }
    }
    const tr = trainAt(t, W);
    if (tr) {
      const y = pl.rail - 3;
      c.fillStyle = '#1b2060'; c.fillRect(tr.x, y, TRAIN_LEN, 3);
      c.fillStyle = INK.bone;
      for (let x = tr.x + 2; x < tr.x + TRAIN_LEN - 2; x += 3) if ((x - tr.x) % 16 !== 14) c.fillRect(x, y + 1, 1, 1);
      const head = tr.dir === 1 ? tr.x + TRAIN_LEN - 1 : tr.x, tail = tr.dir === 1 ? tr.x : tr.x + TRAIN_LEN - 1;
      c.fillRect(head, y + 1, 1, 1);
      c.fillStyle = INK.alert; c.fillRect(tail, y + 1, 1, 1);
    }
    for (let i = 0; i < carCount(W); i++) {
      const q = carAt(i, t, W);
      c.fillStyle = q.row === 0 ? INK.bone : INK.alert;
      c.fillRect(q.x, pl.street[q.row], 1, 1); c.fillRect(q.x + 2, pl.street[q.row], 1, 1);
    }
  };

  /** The callouts: labels in their margin's label lane, a dotted leader to the part, a lime dot on it. */
  const drawCallouts = (anchors: Anchor[]) => {
    if (!ictx || !sides) return;
    ictx.clearRect(0, 0, inkC.width, inkC.height);
    const toPlate = (v: number) => (v * D) / (Z * DPR);
    for (const s of sides) {
      const lane = s.labels, mine = anchors.filter((a) => a.side === s.side).sort((a, b) => a.y - b.y);
      const els = labels[s.side];
      while (els.length < mine.length) { const e = document.createElement('span'); e.className = 'ld-call micro'; hud.append(e); els.push(e); }
      els.forEach((e, i) => { e.hidden = !lane || i >= mine.length; });
      if (!lane) continue;
      let floor = -Infinity;
      mine.forEach((a, i) => {
        const e = els[i];
        if (e.dataset.text !== a.text) { // KEY :: over its value, the site's readout stacked to fit the lane
          e.dataset.text = a.text;
          const m = /^(.*? (?:::|▸))\s(.+)$/.exec(a.text);
          const k = document.createElement('b');
          k.textContent = m ? m[1] : a.text;
          e.replaceChildren(k);
          if (m) e.append(document.createElement('br'), m[2]);
        }
        e.style.maxWidth = `${Math.round(lane[1] - lane[0])}px`;
        e.style.textAlign = s.side === 'left' ? 'right' : 'left';
        const y = Math.max(floor + 40, toPlate(a.y) - 7);
        floor = y;
        e.style.top = `${Math.round(y)}px`;
        if (s.side === 'left') { e.style.left = ''; e.style.right = `${Math.round(window.innerWidth / Z - lane[1])}px`; }
        else { e.style.right = ''; e.style.left = `${Math.round(lane[0])}px`; }
        // the leader, in the city's pixels: from the label's end to the part, every other pixel
        const lx = Math.round(((s.side === 'left' ? lane[1] + 6 : lane[0] - 6) * Z * DPR) / D), ly = Math.round(((y + 7) * Z * DPR) / D);
        const ax = Math.round(a.x), ay = Math.round(a.y);
        const steps = Math.max(Math.abs(ax - lx), Math.abs(ay - ly));
        ictx.fillStyle = INK.boneDim;
        for (let k = 0; k <= steps; k += 2) ictx.fillRect(Math.round(lx + ((ax - lx) * k) / Math.max(1, steps)), Math.round(ly + ((ay - ly) * k) / Math.max(1, steps)), 1, 1);
        ictx.fillStyle = INK.signal; ictx.fillRect(ax - 1, ay - 1, 2, 2);
      });
    }
  };

  const cueNow = (f: number) => (pointed ?? cueAt(f, films.length));
  const draw = (f: number) => {
    if (!plan || !cctx) return;
    const s = still();
    drawCity(f, f / STEPS);
    const cue = cueNow(f);
    const film = films[cue];
    const line = film ? `CUE ▸ ${film.slug.toUpperCase()}` : 'CUE ▸ STANDING BY';
    for (const e of cueEls) if (e.textContent !== line) e.textContent = line;
    root.style.setProperty('--ld-accent', film?.accent ?? INK.signal);
    if (machines && stage && !gl.hidden) {
      machines.draw(f, { cue, held: pointed !== null, look: lookAt, still: s });
      drawCallouts(machines.anchors());
    } else if (ictx) { ictx.clearRect(0, 0, inkC.width, inkC.height); for (const side of ['left', 'right'] as const) for (const e of labels[side]) e.hidden = true; }
  };

  /* ------------------------------------------------------------- the clock -- */

  const tick = () => {
    raf = 0;
    if (!running) return;
    const f = still() ? 60 : frameAt((performance.now() - t0) / 1000);
    if (f !== lastF) { lastF = f; draw(f); }
    if (!still()) raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (running && !raf) { lastF = -1; raf = requestAnimationFrame(tick); } };
  quality.on(() => { if (running) { build(); kick(); } });
  new MutationObserver(() => kick()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = window.setTimeout(() => { if (running) { build(); kick(); } }, 150); });

  // pointing at a film cues it on every screen, and the totem's eye turns to it
  const slugOf = (row: Element | null) => row?.getAttribute('href')?.match(/[?&]p=([a-z0-9-]+)/)?.[1] ?? null;
  const point = (row: HTMLElement | null) => {
    const slug = slugOf(row), i = slug ? films.findIndex((f) => f.slug === slug) : -1;
    pointed = i >= 0 ? i : null;
    if (row && pointed !== null) {
      const r = row.getBoundingClientRect();
      lookAt = [((r.left + r.width / 2) * DPR) / D, ((r.top + r.height / 2) * DPR) / D];
    } else lookAt = null;
    if (still()) kick();
  };
  listEl.addEventListener('pointerover', (e) => point((e.target as Element).closest<HTMLElement>('.fl-row')));
  listEl.addEventListener('pointerleave', () => point(null));
  listEl.addEventListener('focusin', (e) => point((e.target as Element).closest<HTMLElement>('.fl-row')));
  listEl.addEventListener('focusout', () => point(null));

  (window as unknown as { rvlListDeco: unknown }).rvlListDeco = { // a debug handle for verification
    frame: (f: number) => draw(f),
    point: (slug: string | null) => point(slug ? listEl.querySelector<HTMLElement>(`.fl-row[href*="p=${slug}"]`) : null),
    rigs: () => machines?.debug() ?? [],
    stage: () => stage,
    info: () => ({ running, built: !!plan, scale: D, w: city.width, h: city.height, machines: !!machines, loading, off: machinesOff, slots: stage?.slots.map((s) => s.key) ?? [] }),
  };

  return {
    start() {
      if (running) return;
      running = true;
      root.hidden = false;
      build();
      t0 = performance.now() - 4000; // (a still lands mid-scene: the first train under way)
      kick();
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      root.hidden = true;
      document.documentElement.classList.remove('rvl-list-city');
    },
  };
}
