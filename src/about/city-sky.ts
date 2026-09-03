/** TIME OF DAY (owner: a changing time-of-day system) — five looks for the
 *  same city: the starry NIGHT it was built for; DUSK, the blue hour after
 *  sunset; DAWN, a bright ethereal morning; HAZE, a hazy ethereal morning;
 *  DAY, a clear afternoon. A look is a table of every light-shaping value
 *  the renderer owns — the key light (moon or sun), the hemisphere, the fog,
 *  the exposure and bloom threshold, how lit the windows and the lamps are,
 *  the stars and the moon, the sun's disc, the sky dome's gradient and its
 *  glow lobe about the sun, the clouds' tints, the water, the distant-city
 *  glow, the people's dim, the lens grade. Looks BLEND: the renderer eases
 *  from one to the next over a couple of seconds by lerping the table.
 *  Pure: colours are hex strings, lerped here; no three, no DOM; tested. */

export type TimeOfDay = 'night' | 'dusk' | 'dawn' | 'haze' | 'day';
export const TIMES: TimeOfDay[] = ['night', 'dusk', 'dawn', 'haze', 'day'];

export interface Grade { low: [number, number, number]; high: [number, number, number]; contrast: number }
export interface Look {
  label: string;
  /** The key light: a direction to the moon or sun, its colour, its strength. */
  key: { dir: [number, number, number]; color: string; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  /** The fog's colour and a multiplier on the quality tier's density (the near-ground haze scales with it). */
  fog: { color: string; density: number };
  exposure: number;
  /** The bloom threshold: low at night (every neon blooms), above 1 by day (a daylight sky must not bloom; only the sun). */
  bloom: number;
  /** How lit the windows are (1 at night) and how much the city's lamps give (pools, throws, point lights, glow, neon). */
  windows: number;
  lamps: number;
  /** How far the walls' albedo is lifted (1 = the night's lift, tuned for lamps; a sun needs far less). */
  walls: number;
  /** How far the walls, roofs and pavements are BLEACHED toward pale concrete (owner: sun-bleached by day). */
  bleach: number;
  stars: number;
  moon: number;
  /** The sun's disc in the sky (none at night), its colour and size. */
  sun: { color: string; size: number; opacity: number };
  /** The dome: gradient stops from zenith (0) to nadir (1), and a warm lobe about the key's azimuth at the horizon. */
  sky: { stops: [number, string][]; lobe: { color: string; width: number; height: number; strength: number } };
  clouds: { high: string; low: string };
  water: string;
  /** The distant city's glow on the horizon ring. */
  horizon: number;
  /** The pedestrian sprites' dim (a linear grey level). */
  people: number;
  grade: Grade;
}

export const LOOKS: Record<TimeOfDay, Look> = {
  night: {
    label: 'NIGHT',
    key: { dir: [110, 400, 380], color: '#c4d3ff', intensity: 0.75 },
    hemi: { sky: '#4a6ac8', ground: '#5a4030', intensity: 0.75 },
    fog: { color: '#101c30', density: 1 },
    exposure: 1.15, bloom: 0.4, windows: 1, lamps: 1, walls: 1, bleach: 0, stars: 1, moon: 1,
    sun: { color: '#ffffff', size: 0, opacity: 0 },
    sky: {
      stops: [[0, '#020209'], [0.34, '#060a22'], [0.44, '#141d4a'], [0.485, '#3b2f6b'], [0.512, '#2f5a74'], [0.53, '#6fa8b8'], [0.555, '#2c4c66'], [0.61, '#132347'], [1, '#070a1e']],
      lobe: { color: '#6fa8b8', width: 0.3, height: 0.03, strength: 0 },
    },
    clouds: { high: '#5a639e', low: '#2a3060' },
    water: '#040812', horizon: 1, people: 0.45,
    grade: { low: [-0.012, 0, 0.024], high: [0.02, 0.008, -0.012], contrast: 1.06 },
  },
  dusk: {
    label: 'DUSK',
    key: { dir: [-420, 50, 300], color: '#ff9a5a', intensity: 0.55 },
    hemi: { sky: '#3d4f9e', ground: '#7a4a3a', intensity: 1.0 },
    fog: { color: '#34325e', density: 1.15 },
    exposure: 1.1, bloom: 0.7, windows: 0.85, lamps: 0.85, walls: 0.8, bleach: 0.12, stars: 0.25, moon: 0.5,
    sun: { color: '#ffb070', size: 70, opacity: 0.9 },
    sky: {
      stops: [[0, '#0a1030'], [0.3, '#141c4c'], [0.44, '#3a2f6e'], [0.49, '#7a3f6a'], [0.51, '#d86a5a'], [0.53, '#ffae74'], [0.56, '#6a4a70'], [0.62, '#2a2a55'], [1, '#12122a']],
      lobe: { color: '#ffc27a', width: 0.16, height: 0.05, strength: 0.9 },
    },
    clouds: { high: '#ffb08a', low: '#5a4a7a' },
    water: '#2a2650', horizon: 0.6, people: 0.55,
    grade: { low: [-0.01, -0.004, 0.03], high: [0.04, 0.012, -0.02], contrast: 1.06 },
  },
  dawn: {
    label: 'DAWN',
    key: { dir: [-300, 110, -200], color: '#ffc890', intensity: 3.0 },
    hemi: { sky: '#9db8f0', ground: '#a88860', intensity: 1.2 },
    fog: { color: '#dfe6f2', density: 0.9 },
    exposure: 0.95, bloom: 1.1, windows: 0.2, lamps: 0.1, walls: 0.75, bleach: 0.7, stars: 0, moon: 0,
    sun: { color: '#fff0c8', size: 90, opacity: 1 },
    sky: {
      stops: [[0, '#6f9be0'], [0.3, '#a8c8f2'], [0.46, '#e6eefa'], [0.5, '#ffe9c8'], [0.53, '#ffd7a6'], [0.58, '#e8dcd0'], [1, '#c9d2e0']],
      lobe: { color: '#fff0c0', width: 0.2, height: 0.08, strength: 0.8 },
    },
    clouds: { high: '#ffd9c0', low: '#b8a8c8' },
    water: '#9fb8d8', horizon: 0.15, people: 0.9,
    grade: { low: [0.015, 0.01, 0.02], high: [0.03, 0.015, 0], contrast: 1.04 },
  },
  haze: {
    label: 'HAZE',
    key: { dir: [-200, 200, -120], color: '#fff1de', intensity: 1.4 },
    hemi: { sky: '#dfe6f0', ground: '#c0b8aa', intensity: 1.25 },
    fog: { color: '#dde2ea', density: 1.9 },
    exposure: 0.9, bloom: 1.15, windows: 0.25, lamps: 0.25, walls: 0.6, bleach: 0.65, stars: 0, moon: 0,
    sun: { color: '#fff8ee', size: 140, opacity: 0.8 },
    sky: {
      stops: [[0, '#c7d3e2'], [0.4, '#dfe6ee'], [0.5, '#eef0f2'], [0.56, '#e4e6ea'], [1, '#d6dae0']],
      lobe: { color: '#fff6e6', width: 0.35, height: 0.14, strength: 0.7 },
    },
    clouds: { high: '#e8ecf2', low: '#d0d4dc' },
    water: '#c4ccd8', horizon: 0, people: 0.9,
    grade: { low: [0.03, 0.03, 0.035], high: [0.02, 0.01, 0], contrast: 0.95 },
  },
  day: {
    label: 'DAY',
    key: { dir: [-240, 330, -150], color: '#fff5e6', intensity: 3.2 },
    hemi: { sky: '#8fb4f4', ground: '#9a8a70', intensity: 1.6 }, // a sunny sky is a strong fill: the shadow side of a wall is far from black
    fog: { color: '#c2d5ec', density: 0.55 },
    exposure: 0.9, bloom: 1.1, windows: 0.08, lamps: 0, walls: 0.65, bleach: 0.78, stars: 0, moon: 0,
    sun: { color: '#fffaf0', size: 60, opacity: 1 },
    sky: {
      stops: [[0, '#3f7ad8'], [0.3, '#6fa2ea'], [0.47, '#b9d4f4'], [0.5, '#d9e8f8'], [0.54, '#c9d8ea'], [0.6, '#b8c8dc'], [1, '#a8b8cc']],
      lobe: { color: '#ffffff', width: 0.12, height: 0.06, strength: 0.35 },
    },
    clouds: { high: '#f4f6fa', low: '#c8ccd8' },
    water: '#5f8fc8', horizon: 0, people: 0.95,
    grade: { low: [0, 0, 0.01], high: [0.01, 0.005, 0], contrast: 1.06 },
  },
};

/** Parse a stored or URL value; anything unknown is the night. */
export function parseTime(v: string | null | undefined): TimeOfDay {
  return (TIMES as string[]).includes(v ?? '') ? (v as TimeOfDay) : 'night';
}

export function nextTime(t: TimeOfDay): TimeOfDay {
  return TIMES[(TIMES.indexOf(t) + 1) % TIMES.length];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** A smooth ease for the blend's clock. */
export const ease = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c); };

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
/** Lerp two hex colours in sRGB (the looks are authored by eye, in sRGB). */
export function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a), [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Every value of the look between a and b at t (0 = a, 1 = b). The sky's
 *  gradient stops are not blended (the renderer crossfades two domes); the
 *  target's are carried. */
export function blendLooks(a: Look, b: Look, t: number): Look {
  const k = clamp01(t);
  if (k <= 0) return a;
  if (k >= 1) return b;
  return {
    label: k < 0.5 ? a.label : b.label,
    key: { dir: lerp3(a.key.dir, b.key.dir, k), color: lerpHex(a.key.color, b.key.color, k), intensity: lerp(a.key.intensity, b.key.intensity, k) },
    hemi: { sky: lerpHex(a.hemi.sky, b.hemi.sky, k), ground: lerpHex(a.hemi.ground, b.hemi.ground, k), intensity: lerp(a.hemi.intensity, b.hemi.intensity, k) },
    fog: { color: lerpHex(a.fog.color, b.fog.color, k), density: lerp(a.fog.density, b.fog.density, k) },
    exposure: lerp(a.exposure, b.exposure, k),
    bloom: lerp(a.bloom, b.bloom, k),
    windows: lerp(a.windows, b.windows, k),
    lamps: lerp(a.lamps, b.lamps, k),
    walls: lerp(a.walls, b.walls, k),
    bleach: lerp(a.bleach, b.bleach, k),
    stars: lerp(a.stars, b.stars, k),
    moon: lerp(a.moon, b.moon, k),
    sun: { color: lerpHex(a.sun.color, b.sun.color, k), size: lerp(a.sun.size, b.sun.size, k), opacity: lerp(a.sun.opacity, b.sun.opacity, k) },
    sky: b.sky,
    clouds: { high: lerpHex(a.clouds.high, b.clouds.high, k), low: lerpHex(a.clouds.low, b.clouds.low, k) },
    water: lerpHex(a.water, b.water, k),
    horizon: lerp(a.horizon, b.horizon, k),
    people: lerp(a.people, b.people, k),
    grade: { low: lerp3(a.grade.low, b.grade.low, k), high: lerp3(a.grade.high, b.grade.high, k), contrast: lerp(a.grade.contrast, b.grade.contrast, k) },
  };
}

/** The dome as pixels: `size`×`size`, u the azimuth (three's sphere: u = 0
 *  at −x, a quarter turn to +z), v from the nadir (row size−1) to the zenith
 *  (row 0). The gradient by v, then the lobe about the key's azimuth at the
 *  horizon, mixed in by its strength. Returns RGBA bytes. */
export function paintSky(look: Look, size: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const stops = look.sky.stops.map(([p, c]) => [p, ...hexToRgb(c)] as [number, number, number, number]);
  const lobe = hexToRgb(look.sky.lobe.color);
  const [dx, , dz] = look.key.dir;
  const u0 = ((Math.atan2(dz, -dx) / (Math.PI * 2)) % 1 + 1) % 1;
  for (let row = 0; row < size; row++) {
    const p = row / (size - 1); // 0 zenith .. 1 nadir
    let i = 0;
    while (i < stops.length - 2 && stops[i + 1][0] < p) i += 1;
    const [p0, r0, g0, b0] = stops[i], [p1, r1, g1, b1] = stops[i + 1];
    const k = p1 > p0 ? clamp01((p - p0) / (p1 - p0)) : 0;
    const gr = r0 + (r1 - r0) * k, gg = g0 + (g1 - g0) * k, gb = b0 + (b1 - b0) * k;
    const dv = (p - 0.5) / look.sky.lobe.height; // the lobe hugs the horizon
    for (let col = 0; col < size; col++) {
      const u = col / size;
      let du = Math.abs(u - u0);
      if (du > 0.5) du = 1 - du;
      const w = look.sky.lobe.strength * Math.exp(-(du * du) / (look.sky.lobe.width * look.sky.lobe.width) - dv * dv);
      const o = (row * size + col) * 4;
      out[o] = gr + (lobe[0] - gr) * w; out[o + 1] = gg + (lobe[1] - gg) * w; out[o + 2] = gb + (lobe[2] - gb) * w; out[o + 3] = 255;
    }
  }
  return out;
}
