/** BUILDING SKINS (owner: every building unique, no cardboard) — the
 *  catalogue behind the facade atlas. The city's facades are drawn ONCE
 *  into an atlas of 48 cells: six window FAMILIES (the plan's window
 *  rhythms — punched grid, tiny residential, wide office bays, ribbon
 *  bands, art-deco piers, glass curtain) in eight material VARIANTS each
 *  (brick, sandstone, concrete, plaster, corrugated steel, granite, bronze
 *  glass...). A cell is a TILE at a fixed physical scale — 16 units wide,
 *  64 tall, 4 texels a unit, a 3-unit floor — that the shader wraps over
 *  a building's real width and height, so a window is the same size on a
 *  hut and on a tower and a wide slab gets more bays, not wider ones. Each
 *  building picks a cell from its style's family, a phase along the tile,
 *  a tint jitter, a shopfront or none, a crown or none: no two alike.
 *  Every cell also carries a HEIGHT field the renderer turns into a normal
 *  map (recessed windows, sills, piers, joints), so the key light rakes
 *  across real relief, and a MASK of its glass, so the glass can mirror.
 *  Pure: numbers and hex strings, no DOM, no three; tested. */
import type { FacadeStyle, WinStyle } from './city-plan';

/** The atlas: 8 × 6 cells of 64 × 256 texels. */
export const ATLAS = { cols: 8, rows: 6, w: 64, h: 256 } as const;
/** The tile's scale: texels per unit, floor pitch in texels, the shopfront strip's height in texels. */
export const PX = 4;
export const FLOOR = 12;
export const SHOP = 16;
/** The upper floors' band: the tile above the shop strip, a whole number of floors. */
export const UPPER = ATLAS.h - SHOP;
export const VARIANTS = 8;

export type Relief = 'brick' | 'block' | 'panel' | 'plaster' | 'corrugated' | 'flush' | 'rivet';
export interface Variant {
  /** The wall's colour, its joints (mortar, seams), the window frames, the dark glass. */
  wall: string; joint: string; frame: string; glass: string;
  relief: Relief;
  /** How many of the windows burn (0..1) and how warm they are (0..1). */
  lit: number; warm: number;
}
export interface Family {
  win: WinStyle;
  /** The bay pitch in texels (the floor pitch is FLOOR for every family). */
  bay: number;
  /** The window inside a bay: x from the bay's left, width; y up from the floor's bottom, height (texels). */
  wx: number; ww: number; wy: number; wh: number;
  variants: Variant[];
}

const v = (wall: string, joint: string, frame: string, glass: string, relief: Relief, lit: number, warm: number): Variant =>
  ({ wall, joint, frame, glass, relief, lit, warm });

/** The families, in the atlas' row order; each family's eighth variant is
 *  its odd one: the grid's is the LANDMARK's blue-lit stone, the curtain's
 *  is the MEGASTRUCTURE's cold wall of light. */
export const FAMILIES: Family[] = [
  { win: 'grid', bay: 16, wx: 4, ww: 8, wy: 3, wh: 7, variants: [
    v('#7b3f34', '#5a2d26', '#2a2a30', '#141c30', 'brick', 0.45, 0.7),
    v('#6b4a3a', '#4e352a', '#3a3028', '#121a2c', 'brick', 0.4, 0.65),
    v('#b39a72', '#8f7a58', '#3a3634', '#16203a', 'block', 0.42, 0.6),
    v('#8a8c94', '#6e7078', '#24262c', '#101828', 'panel', 0.5, 0.5),
    v('#c9c4b8', '#a8a396', '#4a4640', '#1a2440', 'plaster', 0.4, 0.75),
    v('#4a4c58', '#36384a', '#1e2028', '#0e1626', 'block', 0.48, 0.45),
    v('#a88a52', '#7a6238', '#2c2a2a', '#141c30', 'brick', 0.4, 0.7),
    v('#5c6a92', '#46527a', '#2a3450', '#182848', 'block', 0.9, 0.2), // the landmark: blue-lit to the crown
  ] },
  { win: 'tiny', bay: 8, wx: 2, ww: 4, wy: 4, wh: 6, variants: [
    v('#c8b89a', '#a89878', '#4a4238', '#161e34', 'plaster', 0.5, 0.85),
    v('#7a4838', '#5a3428', '#2e2622', '#12192c', 'brick', 0.5, 0.8),
    v('#7f818c', '#606270', '#2a2c34', '#101826', 'panel', 0.55, 0.6),
    v('#6a3a26', '#4a2818', '#2a1e18', '#141a28', 'corrugated', 0.6, 0.9), // the poor quarters' rust
    v('#8fa3b8', '#6e8298', '#3a4250', '#14203a', 'plaster', 0.45, 0.7),
    v('#2c3a5e', '#1e2a48', '#141c30', '#0e1628', 'panel', 0.6, 0.55),
    v('#4a5a4a', '#364634', '#202a20', '#101a28', 'corrugated', 0.6, 0.85), // patched steel, tarp green
    v('#9a7a40', '#76592c', '#3a3020', '#141c30', 'brick', 0.5, 0.8),
  ] },
  { win: 'wide', bay: 32, wx: 3, ww: 26, wy: 3, wh: 7, variants: [
    v('#84868e', '#66686e', '#22242a', '#101a2e', 'panel', 0.5, 0.45),
    v('#a89a82', '#867a64', '#3a342c', '#141e34', 'block', 0.45, 0.6),
    v('#3a3c46', '#2a2c34', '#181a20', '#0c1424', 'flush', 0.55, 0.35),
    v('#4a5f80', '#384a66', '#1c2434', '#101c34', 'panel', 0.5, 0.4),
    v('#5c4a3a', '#44362a', '#2a2018', '#121a2c', 'rivet', 0.45, 0.7),
    v('#bfc2c8', '#9a9ea6', '#3c3e44', '#182240', 'panel', 0.42, 0.5),
    v('#22242c', '#16181e', '#0e1014', '#0a1220', 'flush', 0.6, 0.3),
    v('#6a6b50', '#50513a', '#2a2a20', '#121a2a', 'block', 0.45, 0.65),
  ] },
  { win: 'ribbon', bay: 8, wx: 1, ww: 7, wy: 2, wh: 7, variants: [
    v('#c4c8cc', '#9a9ea4', '#40444a', '#16203a', 'panel', 0.5, 0.5),
    v('#6a4e34', '#503a26', '#2a2018', '#141a2c', 'flush', 0.45, 0.75),
    v('#8e8f96', '#6c6d74', '#2a2b30', '#101a2e', 'panel', 0.5, 0.5),
    v('#3d5a86', '#2c4468', '#182238', '#101c36', 'flush', 0.55, 0.35),
    v('#2a2c36', '#1c1e26', '#101218', '#0c1222', 'flush', 0.6, 0.4),
    v('#8a3a30', '#662a22', '#2c1c18', '#141a2c', 'panel', 0.45, 0.7),
    v('#a8aeb8', '#848a94', '#383c44', '#16223c', 'rivet', 0.5, 0.45),
    v('#3f6a5a', '#2e5044', '#182820', '#101c30', 'panel', 0.5, 0.55),
  ] },
  { win: 'strip', bay: 16, wx: 5, ww: 6, wy: 0, wh: 10, variants: [
    v('#c2b9a6', '#9c9482', '#3c3830', '#16203a', 'block', 0.45, 0.65),
    v('#a5573f', '#7e4030', '#2e2018', '#141a2c', 'block', 0.45, 0.75),
    v('#26272e', '#18191e', '#0c0d10', '#0a1220', 'flush', 0.6, 0.35),
    v('#b0b2ba', '#8a8c94', '#3a3c44', '#16223c', 'panel', 0.5, 0.5),
    v('#d0c8b4', '#a8a08c', '#4a4438', '#1a2440', 'block', 0.4, 0.7),
    v('#2f4a3e', '#20362c', '#101c16', '#0e1a2c', 'flush', 0.55, 0.45),
    v('#7a3f2c', '#5a2c1e', '#2a1a14', '#12182a', 'brick', 0.5, 0.8),
    v('#5a6a84', '#445266', '#222a38', '#121e38', 'panel', 0.5, 0.4),
  ] },
  { win: 'curtain', bay: 8, wx: 1, ww: 7, wy: 1, wh: 8, variants: [
    v('#1e3a66', '#7a8aa8', '#7a8aa8', '#1a3060', 'flush', 0.55, 0.3),
    v('#1e5060', '#6a8a90', '#6a8a90', '#184450', 'flush', 0.55, 0.35),
    v('#4a3a26', '#8a7a5a', '#8a7a5a', '#3a2c1c', 'flush', 0.5, 0.7),
    v('#16181f', '#3a3c44', '#3a3c44', '#101218', 'flush', 0.6, 0.35),
    v('#5a6470', '#a8b0bc', '#a8b0bc', '#4a5460', 'flush', 0.5, 0.4),
    v('#26504a', '#6a9088', '#6a9088', '#1e4440', 'flush', 0.5, 0.45),
    v('#2e2a52', '#7a72a8', '#7a72a8', '#262046', 'flush', 0.55, 0.3),
    v('#2a4a80', '#c8d0dc', '#c8d0dc', '#203c6a', 'flush', 0.92, 0.12), // the megastructure: a curtain of cold light
  ] },
];

export const CELLS = FAMILIES.length * VARIANTS;
export const familyOf = (win: WinStyle): number => FAMILIES.findIndex((f) => f.win === win);

/** The plan's special styles (city-plan.ts): the landmark, the megastructure, the shanty quarters. */
const LANDMARK = 20, MEGA = 21, SHANTY = [22, 23];

/** Which atlas cell a building wears: its style's family, a variant by its
 *  own hash — the landmark and the megastructure get their family's eighth,
 *  the shanties the corrugated ones. */
export function skinFor(tex: number, style: FacadeStyle, hash: number): number {
  const fam = familyOf(style.win);
  if (tex === LANDMARK) return familyOf('grid') * VARIANTS + 7;
  if (tex === MEGA) return familyOf('curtain') * VARIANTS + 7;
  if (SHANTY.includes(tex)) return familyOf('tiny') * VARIANTS + (hash < 0.5 ? 3 : 6);
  const n = fam === familyOf('grid') || fam === familyOf('curtain') ? VARIANTS - 1 : VARIANTS; // the eighth is spoken for
  return fam * VARIANTS + Math.min(n - 1, Math.floor(hash * n));
}

/** A building's tint jitter about the cell's colours: a little hue, a little
 *  light, so two buildings in the same skin are not the same building.
 *  Returns linear multipliers per channel around 1. */
export function tintJitter(h1: number, h2: number): [number, number, number] {
  const l = 0.86 + h1 * 0.28; // ±14 % light
  const hue = (h2 - 0.5) * 0.16; // a nudge warm or cool
  return [l * (1 + hue), l, l * (1 - hue)];
}

/** A height field to a tangent-space normal map: central differences, the
 *  +y of the map up the wall (canvas row 0 is the top), the slope scaled by
 *  `strength`. Returns RGBA bytes with alpha from `mask` (255 where glass). */
export function heightToNormal(height: Float32Array, w: number, h: number, mask: Uint8Array, strength: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  const at = (x: number, y: number) => height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * 0.5 * strength; // up the wall: the row above minus the row below
      const len = Math.hypot(dx, dy, 1);
      const o = (y * w + x) * 4;
      out[o] = (-dx / len) * 127.5 + 127.5;
      out[o + 1] = (-dy / len) * 127.5 + 127.5;
      out[o + 2] = (1 / len) * 127.5 + 127.5;
      out[o + 3] = mask[y * w + x];
    }
  }
  return out;
}
