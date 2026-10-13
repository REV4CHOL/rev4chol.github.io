/** THE LIST'S MACHINES (owner, 2026-10-13, with an exploded isometric drawing of a handheld console: "we go mix
 *  between 3D and pixel arts like this. They have to feel like they are floating around in the space"; before it, "no
 *  AI tools. Colorist, filmmaking tools, computer tools in general is okay" and "the designs for these objects must not
 *  be generic, but highly customised to our overall art direction"; after a first cast of a monitor, a panel, a camera
 *  and a keyboard, "go more crazy with the design ideas. Edit tools and colorist tools too damn generic").
 *
 *  The trade's tools as the site's own machines, opened up and floating over the city:
 *  - GRADE (left): THE PRISM ORRERY — the moon's light split by a prism into the site's three accents, SGN, ALT and
 *    FLD, each feeding a planet (lift, gamma, gain) that orbits a hub on its ring; and THE LUT CUBE — a 3D lookup table
 *    made solid, a lattice of the cued film's grade, its slices lifting apart while a lime plane scans through.
 *  - CUT (right): THE FLATBED — an editing table's four platters flung apart, the films themselves running between
 *    them as one strip, through a splicer whose blade drops on the beat; THE CRT TOTEM — televisions stacked on a mast,
 *    each on a film, the head set an eye that watches the film pointed at; and an electric sheep (the homepage's
 *    "&_ELECTRIC_SHEEPS"), purple wool, a television for a head, a cable for a tail, drifting between them.
 *  - Across: THE CONDUIT, from the grade to the cut, passing behind the list, lime pulses running through it.
 *
 *  Pure: the palette's inks, the one light, the 2:1 pixel isometric view, the 8-bit clock of every motion, the cued
 *  film's grade, the screens' geometry. works/list-machines.ts builds and draws them on the city's pixel grid. */

export type Vec = [number, number, number];
export type Ink = 'body' | 'deep' | 'bone' | 'steel' | 'glass' | 'sgn' | 'alt' | 'fld' | 'rubber' | 'wool' | 'brass';

/** Three tones an ink — the face turned from the light, the side, the top — all from the site's palette: the field
 *  blue (FLD//2418FF) for hardware, the city's night blues inside, bone, FLR//B79CFF for glass and wool, and the three
 *  accents (SGN//C8FF00, ALT//FF2E63, FLD) for what carries the light. */
export const RAMPS: Record<Ink, readonly [string, string, string]> = {
  body: ['#130a8a', '#2418FF', '#6a5cff'],
  deep: ['#0a0c2a', '#151b55', '#262074'],
  bone: ['#8e8e9e', '#c4c4bc', '#EDEDE6'],
  steel: ['#262074', '#5f63a8', '#a9abc9'],
  glass: ['#5c4d9e', '#8a73e6', '#B79CFF'],
  sgn: ['#4f6600', '#94c200', '#C8FF00'],
  alt: ['#7a0d2a', '#c41f4b', '#FF2E63'],
  fld: ['#0e0870', '#2418FF', '#7d73ff'],
  rubber: ['#0b0b14', '#16162a', '#262640'],
  wool: ['#5c4d9e', '#9d84ee', '#d9cbff'],
  brass: ['#5a4a1a', '#a08a3c', '#e3cf7a'],
};
/** The ink line round every part: the site's void. */
export const OUTLINE = '#060606';

/** The one light (CR-301): from above and from the screen's left, where the city's moon hangs. Tops take the light
 *  tone, faces turned to the left the side tone, faces turned to the right the dark one. */
export const LIGHT: Vec = norm([0.1, 1, 0.5]);

/** The 2:1 pixel isometric view: the camera 45° round and 30° up, so an edge along a floor axis climbs one pixel in
 *  two. A world point's place on the screen, in pixels, is its dot with `right` and `up`. */
export const ISO = {
  right: norm([1, 0, -1]),
  up: [-Math.SQRT1_2 / 2, Math.sqrt(3) / 2, -Math.SQRT1_2 / 2] as Vec,
  /** from the camera into the scene */
  forward: norm([-1, -Math.sqrt(2 / 3), -1]),
};
export const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function norm(v: Vec): Vec { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
/** A world point's screen offset, pixels: x to the right, y up. */
export const project = (p: Vec): [number, number] => [dot(p, ISO.right), dot(p, ISO.up)];
/** The world point under screen pixel (x, y) (y down from the top), on the plane through the origin facing the camera. */
export const unproject = (x: number, y: number): Vec => [ISO.right[0] * x - ISO.up[0] * y, ISO.right[1] * x - ISO.up[1] * y, ISO.right[2] * x - ISO.up[2] * y];
/** `p` moved along the screen alone so it lands on whole pixels: a floating part steps a pixel at a time and never
 *  shimmers between them (its depth is left as it was). */
export function snap(p: Vec): Vec {
  const [x, y] = project(p), dx = Math.round(x) - x, dy = Math.round(y) - y;
  return [p[0] + ISO.right[0] * dx + ISO.up[0] * dy, p[1] + ISO.right[1] * dx + ISO.up[1] * dy, p[2] + ISO.right[2] * dx + ISO.up[2] * dy];
}

/* -------------------------------------------------------------- the clock -- */

/** Steps a second, every motion of the margins and the city alike. */
export const STEPS = 12;
/** How far apart a machine stands at `t` seconds, 0 (whole) to 1 (flung apart): it breathes between OPEN_MIN and 1.
 *  While a film is pointed at in the list it closes to OPEN_HELD — the machines take the film. */
export const OPEN_MIN = 0.55, OPEN_HELD = 0.25;
export function openAt(t: number, period: number, phase: number): number {
  return OPEN_MIN + (1 - OPEN_MIN) * (0.5 - 0.5 * Math.cos(((t + phase) / period) * Math.PI * 2));
}
/** The float: a whole machine rides up and down by up to two pixels, a step at a time. */
export const bobAt = (t: number, period: number, phase: number): number => Math.round(2 * Math.sin(((t + phase) / period) * Math.PI * 2));
/** A loose part's drift round its point: pixels across and up. */
export function driftAt(t: number, reach: number, period: number, phase: number): [number, number] {
  const a = ((t + phase) / period) * Math.PI * 2;
  return [Math.round(Math.cos(a) * reach), Math.round(Math.sin(a * 2) * reach * 0.5)];
}

/** THE ORRERY: planet `i`'s place round the hub at `t`, radians — a turn a minute, the three a third apart. */
export const orbitAt = (t: number, i: number): number => (t / 60) * Math.PI * 2 + (i * Math.PI * 2) / 3;
/** THE FLATBED: how far the film has run at frame `f`, in frames of film (two a step: 24 fps on the 12-step clock). */
export const filmRunAt = (f: number): number => f * 2;
/** THE SPLICER: the blade's height at frame `f`, 1 up to 0 down — it drops in a step every CUT_EVERY frames and
 *  climbs back over the next eight. Each drop is a cut: the strip's next film. */
export const CUT_EVERY = 30;
export function bladeAt(f: number): number {
  const k = f % CUT_EVERY;
  return k === 0 ? 0 : Math.min(1, k / 8);
}
/** THE LUT CUBE: the scan plane's height through the lattice at `t`, 0–1, up and over every six seconds. */
export const scanAt = (t: number): number => (t % 6) / 6;
/** THE TOTEM: the eye's pupil, pixels off the middle, turned toward a point (dx, dy) on the screen — at most `reach`. */
export function lookAt(dx: number, dy: number, reach: number): [number, number] {
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return [0, 0];
  const k = Math.min(reach, d / 40) / d;
  return [Math.round(dx * k), Math.round(dy * k)];
}
/** The eye blinks for two steps every few seconds, on an uneven beat. */
export const blinkAt = (f: number): boolean => { const k = f % 53; return k === 0 || k === 1 || (f % 211 === 5); };
/** THE CONDUIT: pulse `i` of `n`'s place along it at `t`, 0–1, travelling from the grade to the cut. */
export const pulseAt = (t: number, i: number, n: number): number => ((t / 7) + i / n) % 1;
/** THE SHEEP: where it drifts across its span at `t`, 0–1 and back, and the hop of its wool, pixels. */
export function sheepAt(t: number): { u: number; hop: number; facing: 1 | -1 } {
  const p = (t / 40) % 2, u = p < 1 ? p : 2 - p;
  return { u: 0.5 - 0.5 * Math.cos(u * Math.PI), hop: Math.round(Math.abs(Math.sin(t * 1.7)) * 2), facing: p < 1 ? 1 : -1 };
}

/** Frames a film holds the screens before the next is cued: four seconds on the 12-step clock. */
export const CUE_EVERY = 48;
export const cueAt = (f: number, n: number): number => (n > 0 ? Math.floor(f / CUE_EVERY) % n : 0);

/* ------------------------------------------------------- the cued grade -- */

/** THE LUT CUBE's lattice: the colour of node (i, j, k) of an n³ cube for a film whose accent is `accent` — the
 *  input red, green, blue graded the way the site grades: shadows lifted into the field blue, highlights pulled toward
 *  the film's own accent, the middle kept. Returns '#rrggbb'. */
export function lutColor(i: number, j: number, k: number, n: number, accent: string): string {
  const s = n > 1 ? n - 1 : 1;
  const r = i / s, g = j / s, b = k / s;
  const a = [parseInt(accent.slice(1, 3), 16) / 255, parseInt(accent.slice(3, 5), 16) / 255, parseInt(accent.slice(5, 7), 16) / 255];
  const field = [0x24 / 255, 0x18 / 255, 1];
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const out = [r, g, b].map((v, c) => {
    const lift = (1 - luma) ** 2 * 0.35 * field[c];
    const gain = luma ** 2 * 0.45 * a[c];
    return Math.min(1, v * (1 - 0.35 * luma ** 2) * 0.85 + lift + gain + 0.03);
  });
  return '#' + out.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

/* --------------------------------------------------------- the readouts -- */

/** The exploded-view callouts, in the site's readout grammar (`KEY :: VALUE`, a dotted leader, a lime dot on the
 *  part). {slug} and {aspect} are the cued film's; {session} is the visit's RVL- tag. A long name trails off in its
 *  lane. */
export const CALLOUTS = {
  orrery: ['LIGHT :: MOON ▸ PRISM', 'SPLIT :: SGN ▪ ALT ▪ FLD', 'TRK :: LIFT ▪ GAMMA ▪ GAIN'],
  lut: ['LUT :: {slug}.CUBE', 'SCAN :: 4³ NODES'],
  flatbed: ['FLATBED :: 3 PLATTERS', 'SPLICE ▸ {slug}', 'RUN :: 24 FPS'],
  totem: ['CRT :: 5 SETS', 'WATCHING ▸ {slug}'],
  sheep: ['&_ELECTRIC_SHEEP ▮'],
  conduit: ['UPLINK :: GRADE ▸ CUT'],
} as const;
export function fillCallout(text: string, film: { slug: string; aspect?: string } | null, session: string): string {
  return text.replace('{slug}', film ? film.slug.toUpperCase() : 'NO SIGNAL').replace('{aspect}', film?.aspect || '16:9').replace('{session}', session);
}

/* ---------------------------------------------------------- the screens -- */

/** Where a film of `aspect` stands on a screen `w` × `h`: letterboxed or pillarboxed, never cropped (a vertical film
 *  stands vertical). */
export function fitAspect(aspect: string | undefined, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect ?? '16:9');
  const r = m ? Number(m[1]) / Number(m[2]) : 16 / 9;
  if (r >= w / h) { const fh = Math.max(2, Math.round(w / r)); return { x: 0, y: Math.floor((h - fh) / 2), w, h: fh }; }
  const fw = Math.max(2, Math.round(h * r));
  return { x: Math.floor((w - fw) / 2), y: 0, w: fw, h };
}

/** An image in place as 8-bit colour: each channel down to four levels, dithered by the site's 4 × 4 Bayer matrix. */
export function ditherRGB(data: Uint8ClampedArray, w: number, h: number): void {
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, t = (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(3, Math.round((data[i + c] / 255) * 3 + t))) * 85;
    data[i + 3] = 255;
  }
}

/** The film atlas: every film's frame, FRAME_W × FRAME_H, in rows of ATLAS_COLS; the last cell is NO SIGNAL. */
export const FRAME_W = 32, FRAME_H = 18, ATLAS_COLS = 6;
export function atlasCell(i: number): { x: number; y: number } {
  return { x: (i % ATLAS_COLS) * FRAME_W, y: Math.floor(i / ATLAS_COLS) * FRAME_H };
}
export const atlasSize = (n: number): { w: number; h: number } => ({ w: ATLAS_COLS * FRAME_W, h: Math.ceil((n + 1) / ATLAS_COLS) * FRAME_H });
