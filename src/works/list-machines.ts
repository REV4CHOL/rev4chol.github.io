/** THE LIST'S MACHINES, built and drawn (works/machines.ts says what they are). Real 3D — three.js, an orthographic
 *  camera at the 2:1 pixel isometric angle — drawn at the 8-bit city's own pixel size, so the machines and the city
 *  are one picture: every part shaded in three tones of its ink by the one light, the seams between the tones dithered
 *  by the site's 4 × 4 Bayer matrix, and inked with one void pixel round its edge by a second pass, which reads which
 *  part each pixel belongs to and how near it stands (the line goes on the farther part, as a drawing's would). Light
 *  itself — the beams, the scan, the pulses — is dithered see-through and carries no line. The machines keep the
 *  isometric angle, so their edges step as clean pixel stairs and every part steps a whole pixel at a time; what turns
 *  (the orrery's arms, the platters, the LUT cube, the loose parts) turns in 3D. */
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry, DepthTexture, DoubleSide,
  Group, Mesh, NearestFilter, Object3D, OrthographicCamera, PlaneGeometry, Quaternion, Scene, ShaderMaterial, SphereGeometry,
  TorusGeometry, TubeGeometry, Vector2, Vector3, Vector4, WebGLRenderer, WebGLRenderTarget,
} from 'three';
import type { Material } from 'three';
import { projectAssetUrl } from '../lib/content';
import {
  atlasCell, atlasSize, bladeAt, blinkAt, bobAt, CALLOUTS, ditherRGB, driftAt, filmRunAt, fillCallout, fitAspect, FRAME_H, FRAME_W,
  Ink, ISO, LIGHT, lookAt, lutColor, OPEN_HELD, openAt, orbitAt, OUTLINE, project, pulseAt, RAMPS, scanAt, sheepAt, snap, unproject, Vec,
} from './machines';
import type { MachineKey } from './list-art';

export interface MachineFilm { slug: string; title: string; accent: string; aspect?: string }
/** A machine's box on the canvas, in the city's pixels. */
export interface PixelSlot { key: MachineKey; x: number; y: number; w: number; h: number }
export interface Stage {
  W: number; H: number;
  slots: PixelSlot[];
  conduit: { x0: number; x1: number; y: number } | null;
  sheep: { x0: number; x1: number; y: number } | null;
  moon: { x: number; y: number } | null;
}
export interface Anchor { text: string; x: number; y: number; side: 'left' | 'right' }
export interface DrawState {
  /** the cued film, an index into the films */
  cue: number;
  /** a film pointed at in the list: the machines close up to take it */
  held: boolean;
  /** where on the canvas the pointer is, in the city's pixels, or null */
  look: [number, number] | null;
  /** one still frame: no breath, no float */
  still: boolean;
}
export interface Machines {
  layout(s: Stage): void;
  draw(f: number, s: DrawState): void;
  anchors(): Anchor[];
  /** for verification: each machine's fitted scale and its box at full open, local units */
  debug(): { key: string; scale: number; box: { x0: number; x1: number; y0: number; y1: number } }[];
  dispose(): void;
}

/* --------------------------------------------------------------- shaders -- */

const PART_VERT = /* glsl */ `
varying vec3 vN;
varying vec2 vUv;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;
const PART_FRAG = /* glsl */ `
uniform vec3 uDark;
uniform vec3 uMid;
uniform vec3 uLight;
uniform vec3 uL;
uniform float uId;
uniform float uFlat;
uniform float uKeep;
uniform float uUseMap;
uniform sampler2D uMap;
uniform vec4 uRect;
uniform vec2 uScroll;
varying vec3 vN;
varying vec2 vUv;
const float B[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  return (B[y * 4 + x] + 0.5) / 16.0;
}
void main() {
  float b = bayer(gl_FragCoord.xy);
  if (b > uKeep) discard;
  vec3 c;
  if (uUseMap > 0.5) {
    vec2 uv = vUv;
    if (uScroll.x > 0.0) uv.x = fract(uv.x * uScroll.x + uScroll.y);
    c = texture2D(uMap, uRect.xy + uv * uRect.zw).rgb;
  } else if (uFlat > 0.5) {
    c = uLight;
  } else {
    float d = max(dot(normalize(vN), uL), 0.0);
    float t = step(b, clamp((d - 0.22) / 0.14, 0.0, 1.0)) + step(b, clamp((d - 0.56) / 0.14, 0.0, 1.0));
    c = t < 0.5 ? uDark : (t < 1.5 ? uMid : uLight);
  }
  gl_FragColor = vec4(c, uId / 255.0);
}`;
const INK_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const INK_FRAG = /* glsl */ `
uniform sampler2D tCol;
uniform sampler2D tDepth;
uniform vec2 uPx;
uniform vec3 uInk;
varying vec2 vUv;
const float GLOW = 239.5 / 255.0;
const float NONE = 0.5 / 255.0;
void main() {
  vec4 c = texture2D(tCol, vUv);
  float id = c.a;
  float d = texture2D(tDepth, vUv).x;
  vec2 o[4] = vec2[4](vec2(uPx.x, 0.0), vec2(-uPx.x, 0.0), vec2(0.0, uPx.y), vec2(0.0, -uPx.y));
  for (int k = 0; k < 4; k++) {
    float idn = texture2D(tCol, vUv + o[k]).a;
    if (idn < NONE || idn > GLOW || abs(idn - id) < NONE) continue;
    if (texture2D(tDepth, vUv + o[k]).x < d - 0.00002) { gl_FragColor = vec4(uInk, 1.0); return; }
  }
  gl_FragColor = id < NONE ? vec4(0.0) : vec4(c.rgb, 1.0);
}`;

/* ---------------------------------------------------------------- inks -- */

const v3 = (hex: string): Vector3 => new Vector3(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const LIGHT_V = new Vector3(...LIGHT);
const GLOW_ID0 = 240;
interface MatOpts { flat?: boolean; keep?: number; map?: CanvasTexture; rect?: [number, number, number, number]; scroll?: [number, number]; side?: boolean }
function partMat(tones: readonly [string, string, string], id: number, o: MatOpts = {}): ShaderMaterial {
  const m = new ShaderMaterial({
    vertexShader: PART_VERT, fragmentShader: PART_FRAG,
    uniforms: {
      uDark: { value: v3(tones[0]) }, uMid: { value: v3(tones[1]) }, uLight: { value: v3(tones[2]) }, uL: { value: LIGHT_V },
      uId: { value: id }, uFlat: { value: o.flat ? 1 : 0 }, uKeep: { value: o.keep ?? 1 },
      uUseMap: { value: o.map ? 1 : 0 }, uMap: { value: o.map ?? null }, uRect: { value: new Vector4(...(o.rect ?? [0, 0, 1, 1])) },
      uScroll: { value: new Vector2(...(o.scroll ?? [0, 0])) },
    },
  });
  if (o.side) m.side = DoubleSide;
  return m;
}
/** Three tones from one colour: the side as it is, the top lit, the far face in shadow. */
const tonesOf = (hex: string): [string, string, string] => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const f = (k: number) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
  return [f(0.55), f(0.8), hex];
};
const setTones = (m: ShaderMaterial, t: readonly [string, string, string]) => {
  (m.uniforms.uDark.value as Vector3).copy(v3(t[0])); (m.uniforms.uMid.value as Vector3).copy(v3(t[1])); (m.uniforms.uLight.value as Vector3).copy(v3(t[2]));
};

/* ------------------------------------------------------------- geometry -- */

const geoms = new Map<string, BufferGeometry>();
const cached = (k: string, make: () => BufferGeometry): BufferGeometry => { let g = geoms.get(k); if (!g) { g = make(); geoms.set(k, g); } return g; };
const boxG = (w: number, h: number, d: number) => cached(`b${w},${h},${d}`, () => new BoxGeometry(w, h, d));
function cylG(r: number, h: number, axis: 'x' | 'y' | 'z', seg = 12): BufferGeometry {
  return cached(`c${r},${h},${axis},${seg}`, () => {
    const g = new CylinderGeometry(r, r, h, seg, 1);
    if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
    return g;
  });
}
function ringG(r: number, tube: number, axis: 'x' | 'y' | 'z'): BufferGeometry {
  return cached(`r${r},${tube},${axis}`, () => {
    const g = new TorusGeometry(r, tube, 5, 28);
    if (axis === 'y') g.rotateX(Math.PI / 2); else if (axis === 'x') g.rotateY(Math.PI / 2);
    return g;
  });
}
const ballG = (r: number) => cached(`s${r}`, () => new SphereGeometry(r, 12, 8));

/* ------------------------------------------------------------- textures -- */

const tex = (c: HTMLCanvasElement): CanvasTexture => {
  const t = new CanvasTexture(c);
  t.magFilter = NearestFilter; t.minFilter = NearestFilter; t.generateMipmaps = false;
  return t;
};
const canvas2d = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
};
/** The site's calibration bars (CAL ▸ C8FF00 · FF2E63 · 2418FF · B79CFF · EDEDE6 · 0A0A12 · 060606): NO SIGNAL. */
const CAL = ['#C8FF00', '#FF2E63', '#2418FF', '#B79CFF', '#EDEDE6', '#0A0A12', '#060606'];
function paintNoSignal(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  CAL.forEach((c, i) => { g.fillStyle = c; g.fillRect(x + Math.round((i * w) / 7), y, Math.round(((i + 1) * w) / 7) - Math.round((i * w) / 7), h); });
}

/* ------------------------------------------------------------------ rigs -- */

interface RigPart { obj: Object3D; base: Vector3; boom: Vector3 }
interface Ctx { t: number; f: number; open: number; still: boolean; cue: number; films: MachineFilm[]; look: [number, number] | null; rig: Rig }
/** A machine: its parts round a pivot, where each sits and where it floats to, its callouts, and its own motion. */
class Rig {
  readonly group = new Group();
  /** the part of the rig that turns in 3D (the LUT cube), inside the group */
  readonly spin = new Group();
  parts: RigPart[] = [];
  calls: { text: string; obj: Object3D }[] = [];
  scale = 1;
  /** the projected box at full open, local units, y up */
  box = { x0: 0, x1: 0, y0: 0, y1: 0 };
  side: 'left' | 'right' = 'left';
  shown = false;
  period = 10; phase = 0;
  /** where the moon's beam comes from, local units (the orrery) */
  moon: Vector3 | null = null;
  /** the eye's set (the totem) */
  head: Mesh | null = null;
  motion: (c: Ctx) => void = () => {};
  constructor(readonly key: string) { this.group.add(this.spin); }
  add(obj: Object3D, base: Vec, boom: Vec = [0, 0, 0], into: Object3D = this.group): Object3D {
    into.add(obj);
    this.parts.push({ obj, base: new Vector3(...base), boom: new Vector3(...boom) });
    return obj;
  }
  /** every part where it floats at `open`, a whole pixel at a time */
  place(open: number): void {
    const s = this.scale;
    for (const p of this.parts) {
      const x = (p.base.x + p.boom.x * open) * s, y = (p.base.y + p.boom.y * open) * s, z = (p.base.z + p.boom.z * open) * s;
      const q = p.obj.parent === this.spin ? [x, y, z] : snap([x, y, z]);
      p.obj.position.set(q[0] / s, q[1] / s, q[2] / s);
    }
  }
}

/** Everything a machine's build needs: its ids, its textures, the films. */
class Kit {
  private next = 1;
  private glow = GLOW_ID0;
  readonly mats: ShaderMaterial[] = [];
  constructor(readonly atlas: CanvasTexture, readonly atlasW: number, readonly atlasH: number, readonly strip: CanvasTexture, readonly reel: CanvasTexture,
    readonly floppy: CanvasTexture, readonly hue: CanvasTexture, readonly eye: CanvasTexture, readonly face: CanvasTexture) {}
  id(): number { return this.next < GLOW_ID0 ? this.next++ : GLOW_ID0 - 1; }
  glowId(): number { return this.glow < 255 ? this.glow++ : 255; }
  mat(tones: readonly [string, string, string], id: number, o?: MatOpts): ShaderMaterial { const m = partMat(tones, id, o); this.mats.push(m); return m; }
  ink(ink: Ink, id: number, o?: MatOpts): ShaderMaterial { return this.mat(RAMPS[ink], id, o); }
  /** a mesh in one ink */
  solid(g: BufferGeometry, ink: Ink, id = this.id()): Mesh { return new Mesh(g, this.ink(ink, id)); }
  /** a box with one face painted: '+x', '-x', '+y', '-y', '+z', '-z' in BoxGeometry's order */
  skinned(g: BufferGeometry, ink: Ink, face: number, skin: MatOpts, id = this.id()): Mesh {
    const plain = this.ink(ink, id);
    const mats: Material[] = [plain, plain, plain, plain, plain, plain];
    mats[face] = this.mat(RAMPS[ink], id, skin);
    return new Mesh(g, mats);
  }
  /** the atlas's sub-rectangle for film `i` (the last cell is NO SIGNAL) */
  rect(i: number): [number, number, number, number] {
    const c = atlasCell(i);
    return [c.x / this.atlasW, 1 - (c.y + FRAME_H) / this.atlasH, FRAME_W / this.atlasW, FRAME_H / this.atlasH];
  }
  /** a light: one flat tone, dithered see-through, no ink line */
  beam(g: BufferGeometry, hex: string, keep: number): Mesh { return new Mesh(g, this.mat([hex, hex, hex], this.glowId(), { flat: true, keep })); }
}
const F = { px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 } as const;
const UP = new Vector3(0, 1, 0);
/** point a unit cylinder (along y) from a to b */
function stretch(m: Object3D, a: Vector3, b: Vector3): void {
  const d = new Vector3().subVectors(b, a), len = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.copy(new Quaternion().setFromUnitVectors(UP, d.normalize()));
  m.scale.set(1, Math.max(0.001, len), 1);
}

/* ---------------------------------------------------- THE PRISM ORRERY -- */

function buildOrrery(k: Kit): Rig {
  const r = new Rig('orrery');
  r.period = 10; r.phase = 0;
  r.add(k.solid(cylG(3.2, 32, 'y', 10), 'brass'), [0, 0, 0]);
  r.add(k.solid(ballG(4.2), 'brass'), [0, 17, 0], [0, 5, 0]);
  r.add(k.solid(cylG(14, 2.4, 'y', 18), 'body'), [0, -17, 0], [0, -9, 0]);
  r.add(k.solid(cylG(8, 1.8, 'y', 8), 'brass'), [0, -13, 0], [0, -4, 0]);
  // the prism: a block of glass, two slices of it fanned off either end
  const prism: Object3D[] = [
    r.add(k.solid(cylG(9, 1.6, 'z', 3), 'glass'), [0, 33, -6], [0, 5, -7]),
    r.add(k.solid(cylG(9, 10, 'z', 3), 'glass'), [0, 33, 0], [0, 5, 0]),
    r.add(k.solid(cylG(9, 1.6, 'z', 3), 'glass'), [0, 33, 6], [0, 5, 7]),
  ];
  const inks: Ink[] = ['fld', 'sgn', 'alt'];
  const heights = [-7, 0, 7];
  const arms = inks.map(() => k.solid(boxG(2, 2, 1), 'brass'));
  const planets = inks.map((ink) => k.solid(ballG(7), ink));
  const rings = inks.map(() => new Mesh(ringG(9.5, 1.1, 'y'), k.ink('bone', k.id(), { map: k.hue })));
  for (const m of [...arms, ...planets, ...rings]) r.group.add(m);
  const beams = inks.map((ink) => k.beam(cylG(2.2, 1, 'y', 6), RAMPS[ink][2], 0.72));
  const moonbeam = k.beam(cylG(3.4, 1, 'y', 8), '#EDEDE6', 0.3);
  for (const m of [...beams, moonbeam]) r.group.add(m);
  r.calls = [
    { text: CALLOUTS.orrery[0], obj: prism[1] },
    { text: CALLOUTS.orrery[1], obj: beams[1] },
    { text: CALLOUTS.orrery[2], obj: planets[1] },
  ];
  r.motion = ({ t, open }) => {
    const R = 15 + 9 * open, s = r.scale;
    const at = (v: Vector3) => { const q = snap([v.x * s, v.y * s, v.z * s]); return new Vector3(q[0] / s, q[1] / s, q[2] / s); };
    const top = at(new Vector3(0, 33 + 5 * open, 0));
    inks.forEach((_, i) => {
      const a = orbitAt(t, i), y = heights[i];
      const p = at(new Vector3(Math.cos(a) * R, y, Math.sin(a) * R));
      planets[i].position.copy(p);
      rings[i].position.copy(at(new Vector3(p.x, y + 3 * open, p.z)));
      rings[i].rotation.set(0.38, a, 0);
      const arm = arms[i];
      arm.position.set(p.x / 2, y, p.z / 2);
      arm.rotation.set(0, Math.atan2(p.x, p.z), 0);
      arm.scale.set(1, 1, R);
      stretch(beams[i], top, p);
    });
    if (r.moon) { stretch(moonbeam, r.moon, top); moonbeam.visible = true; } else moonbeam.visible = false;
  };
  return r;
}

/* ------------------------------------------------------- THE LUT CUBE -- */

function buildLut(k: Kit): Rig {
  const r = new Rig('lut');
  r.period = 11; r.phase = 3.2;
  const n = 4, g = 6;
  const voxels: { m: Mesh; i: number; j: number; kk: number }[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) for (let kk = 0; kk < n; kk++) {
    const m = new Mesh(boxG(4.2, 4.2, 4.2), k.mat(tonesOf('#808080'), k.id()));
    const base: Vec = [(i - 1.5) * g, (j - 1.5) * g, (kk - 1.5) * g];
    r.add(m, base, [base[0] * 0.25, (j - 1.5) * 6, base[2] * 0.25], r.spin);
    voxels.push({ m, i, j, kk });
  }
  // the crop marks at its corners: the site's registration, in bone
  const c = 1.5 * g + 4;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const id = k.id(), mark = new Group();
    for (const [w, h, d, ox, oy, oz] of [[5, 0.8, 0.8, -sx * 2.1, 0, 0], [0.8, 5, 0.8, 0, -sy * 2.1, 0], [0.8, 0.8, 5, 0, 0, -sz * 2.1]] as const) {
      const m = new Mesh(boxG(w, h, d), k.ink('bone', id)); m.position.set(ox, oy, oz); mark.add(m);
    }
    r.add(mark, [sx * c, sy * c, sz * c], [sx * 4, sy * 9, sz * 4], r.spin);
  }
  const scan = k.beam(boxG(30, 0.5, 30), '#C8FF00', 0.34);
  r.spin.add(scan);
  r.calls = [{ text: CALLOUTS.lut[0], obj: voxels[voxels.length - 1].m }, { text: CALLOUTS.lut[1], obj: scan }];
  let tinted = '';
  r.motion = ({ t, open, still, cue, films }) => {
    const accent = films[cue]?.accent ?? '#C8FF00';
    if (accent !== tinted) {
      tinted = accent;
      for (const v of voxels) setTones(v.m.material as ShaderMaterial, tonesOf(lutColor(v.i, v.j, v.kk, n, accent)));
    }
    r.spin.rotation.y = still ? 0.35 : 0.35 + t * 0.18;
    const span = 1.5 * g * 2 + 6 * 3 * open;
    scan.position.set(0, -span / 2 + span * scanAt(t), 0);
  };
  return r;
}

/* ------------------------------------------------------- THE CRT TOTEM -- */

function buildTotem(k: Kit): Rig {
  const r = new Rig('totem');
  r.period = 9; r.phase = 1.4;
  r.add(k.solid(cylG(1.4, 78, 'y', 8), 'steel'), [0, 2, 0]);
  /** a television: its shell, its screen on the face toward the list (+z), a knob on its side */
  const tv = (w: number, h: number, d: number, at: Vec, boom: Vec, screen: MatOpts, shell: Ink = 'body'): Mesh => {
    r.add(k.solid(boxG(w, h, d), shell), at, boom);
    const panel = k.skinned(boxG(w - 5, h - 5, 1), 'rubber', F.pz, screen);
    r.add(panel, [at[0], at[1] + 0.5, at[2] + d / 2 + 0.3], boom);
    r.add(k.solid(cylG(1.2, 1.2, 'x', 6), shell === 'bone' ? 'deep' : 'bone'), [at[0] + w / 2 + 0.4, at[1] - h / 4, at[2] + d / 4], boom);
    return panel;
  };
  const head = tv(22, 17, 15, [0, 30, 0], [0, 13, 0], { map: k.eye });
  for (const s of [-1, 1]) {
    const ant = k.solid(cylG(0.5, 12, 'y', 5), 'bone');
    ant.rotation.z = -s * 0.45;
    r.add(ant, [s * 5, 43, 0], [s * 1, 18, 0]);
    r.add(k.solid(ballG(1.4), 'sgn'), [s * 7.6, 48.5, 0], [s * 1.5, 19, 0]);
  }
  const screens = [
    tv(24, 19, 16, [0, 7, 0], [0, 0, 3], { map: k.atlas, rect: k.rect(0) }),
    tv(13, 11, 11, [-20, 10, 0], [-13, 3, 0], { map: k.atlas, rect: k.rect(1) }, 'bone'),
    tv(13, 11, 11, [20, 10, 0], [13, 3, 0], { map: k.atlas, rect: k.rect(2) }, 'bone'),
    tv(10, 10, 10, [-7, -13, 0], [-5, -11, 0], { map: k.atlas, rect: k.rect(3) }),
    tv(10, 10, 10, [7, -13, 0], [5, -11, 0], { map: k.atlas, rect: k.rect(4) }),
  ];
  r.calls = [{ text: CALLOUTS.totem[0], obj: screens[0] }, { text: CALLOUTS.totem[1], obj: head }];
  let shown = -1;
  r.motion = ({ cue, films }) => {
    if (cue === shown) return;
    shown = cue;
    screens.forEach((m, i) => {
      const mat = (m.material as ShaderMaterial[])[F.pz];
      (mat.uniforms.uRect.value as Vector4).set(...k.rect(films.length ? (cue + i) % films.length : films.length));
    });
  };
  r.head = head;
  return r;
}

/* ------------------------------------------------------- THE FLATBED -- */

function buildFlatbed(k: Kit, nFilms: number): Rig {
  const r = new Rig('flatbed');
  r.period = 12; r.phase = 6.1;
  // the platters in a row across the screen (along the view's right), each wound with film; the strip unwound from the
  // first in an arch — under the splicer's blade, through the viewer — and down into the last, its frames to the eye
  const U = new Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2), V = new Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
  const row = [-23, 0, 23], ys = [-9, -6, -9], boomY = [-4, 2, -2], spread = [-5, 0, 5], spin = [1.4, -1.1, 1.7], R = 10.5;
  const centre = (i: number, open: number) => new Vector3().addScaledVector(U, row[i] + spread[i] * open).setY(ys[i] + boomY[i] * open);
  const vec = (v: Vector3): Vec => [v.x, v.y, v.z];
  const platters = row.map((_, i) => {
    const id = k.id();
    const plate = new Mesh(cylG(R, 1.6, 'y', 24), [k.ink('steel', id), k.ink('steel', id, { map: k.reel }), k.ink('steel', id)]);
    const c0 = centre(i, 0), boom = centre(i, 1).sub(c0);
    r.add(plate, vec(c0), vec(boom));
    return plate;
  });
  const sAt = new Vector3().addScaledVector(U, -12).setY(13), vAt = new Vector3().addScaledVector(U, 9).addScaledVector(V, -4).setY(18);
  r.add(k.solid(boxG(9, 4, 7), 'bone'), vec(sAt), [0, 6, 0]);
  const blade = k.solid(boxG(8, 6, 0.6), 'steel');
  r.group.add(blade);
  const viewer = r.add(k.solid(boxG(17, 12, 10), 'deep'), vec(vAt), [0, 10, 0]);
  const screen = k.skinned(boxG(13, 8.5, 1), 'rubber', F.pz, { map: k.atlas, rect: k.rect(0) });
  r.add(screen, [vAt.x, vAt.y + 0.5, vAt.z + 5.3], [0, 10, 0]);
  r.add(k.solid(boxG(17, 2, 6), 'body'), [vAt.x, vAt.y + 7, vAt.z - 1], [0, 13, 0]);
  const film = new Mesh(new BufferGeometry(), k.ink('rubber', k.id(), { map: k.strip, scroll: [1 / Math.max(1, nFilms), 0], side: true }));
  r.group.add(film);
  r.calls = [
    { text: CALLOUTS.flatbed[0], obj: platters[2] },
    { text: CALLOUTS.flatbed[1], obj: blade },
    { text: CALLOUTS.flatbed[2], obj: viewer },
  ];
  let shown = -1;
  const half = 5, frameLen = 2 * half * ((FRAME_W + 4) / (FRAME_H + 8));
  const fwd = new Vector3(...ISO.forward);
  r.motion = ({ t, f, open, still, cue, films }) => {
    platters.forEach((p, i) => { p.rotation.y = still ? 0.9 * i : t * spin[i]; });
    const s0 = sAt.clone().setY(sAt.y + 6 * open), v0 = vAt.clone().setY(vAt.y + 10 * open);
    blade.position.set(s0.x, s0.y + 2 + 3 + bladeAt(still ? 4 : f) * 6, s0.z);
    const c0 = centre(0, open), c2 = centre(2, open);
    const pts = [
      c0.clone().addScaledVector(U, 3.5).setY(c0.y + 1.2), c0.clone().addScaledVector(U, 10).setY(c0.y + 8),
      s0.clone().setY(s0.y + 2.6), v0.clone().addScaledVector(V, -6).setY(v0.y - 7.5), // (behind the viewer: its screen stays clear)
      c2.clone().addScaledVector(U, -10).setY(c2.y + 8), c2.clone().addScaledVector(U, -3.5).setY(c2.y + 1.2),
    ];
    const curve = new CatmullRomCurve3(pts, false, 'centripetal');
    const M = 120, pos = new Float32Array(M * 2 * 3), uv = new Float32Array(M * 2 * 2), idx: number[] = [];
    let len = 0, prev = curve.getPointAt(0);
    const tan = new Vector3(), w = new Vector3();
    for (let m = 0; m < M; m++) {
      const u = m / (M - 1), p = curve.getPointAt(u);
      len += p.distanceTo(prev); prev = p;
      curve.getTangentAt(u, tan);
      w.crossVectors(tan, fwd).normalize().multiplyScalar(half); // (the strip turned to the eye: its frames read)
      pos.set([p.x - w.x, p.y - w.y, p.z - w.z, p.x + w.x, p.y + w.y, p.z + w.z], m * 6);
      uv.set([len / frameLen, 0, len / frameLen, 1], m * 4);
      if (m < M - 1) { const a = m * 2, b = a + 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    }
    film.geometry.dispose();
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('uv', new BufferAttribute(uv, 2));
    geo.setAttribute('normal', new BufferAttribute(new Float32Array(M * 2 * 3).fill(0), 3));
    geo.setIndex(idx);
    film.geometry = geo;
    (((film.material as ShaderMaterial).uniforms.uScroll.value) as Vector2).set(1 / Math.max(1, nFilms), -((still ? 0 : filmRunAt(f)) / 24) / Math.max(1, nFilms));
    if (cue !== shown) {
      shown = cue;
      ((screen.material as ShaderMaterial[])[F.pz].uniforms.uRect.value as Vector4).set(...k.rect(films.length ? cue : films.length));
    }
  };
  return r;
}

/* ------------------------------------------------- THE ELECTRIC SHEEP -- */

function buildSheep(k: Kit): Rig {
  const r = new Rig('sheep');
  r.period = 7; r.phase = 2;
  const puffs: [Vec, number][] = [[[0, 0, 0], 5.5], [[5.5, 1, 2], 4.6], [[-5.5, 1, -1], 4.8], [[2, 5, -2], 4.4], [[-2, 5, 2.5], 4.4], [[0, -2, 5], 4.2], [[3.5, -1, -4.5], 4.2], [[-3.5, -1.5, 4.5], 4]];
  for (const [p, rad] of puffs) {
    const l = Math.hypot(...p) || 1;
    r.add(k.solid(ballG(rad), 'wool'), p, [(p[0] / l) * 2.2, (p[1] / l) * 2.2, (p[2] / l) * 2.2]);
  }
  r.add(k.solid(boxG(8, 6.5, 6), 'body'), [0, 3, 8.5], [0, 0.5, 2.5]);
  const face = k.skinned(boxG(6.4, 4.8, 0.6), 'rubber', F.pz, { map: k.face });
  r.add(face, [0, 3.1, 11.7], [0, 0.5, 2.5]);
  for (const s of [-1, 1]) {
    const ear = k.solid(cylG(0.4, 3.5, 'y', 4), 'bone');
    ear.rotation.z = -s * 0.5;
    r.add(ear, [s * 2.6, 7.6, 8.5], [s * 0.5, 1.5, 2.5]);
    for (const z of [-2.5, 2.5]) r.add(k.solid(cylG(0.8, 5, 'y', 5), 'bone'), [s * 2.5, -6.5, z], [0, -1.6, 0]);
  }
  const tail = new CatmullRomCurve3([new Vector3(0, 0, -5.5), new Vector3(1.5, 3.5, -9), new Vector3(-1, -1, -12), new Vector3(2, -4, -14.5)]);
  r.add(k.solid(new TubeGeometry(tail, 16, 0.6, 4, false), 'rubber'), [0, 0, 0], [0, 0, -1.5]);
  r.add(k.solid(boxG(2.2, 1.8, 2.2), 'bone'), [2, -4, -15.5], [0, -0.5, -2.5]);
  for (const s of [-1, 1]) r.add(k.solid(boxG(0.5, 0.5, 1.6), 'sgn'), [2 + s * 0.6, -4, -17.3], [0, -0.5, -3]);
  r.calls = [{ text: CALLOUTS.sheep[0], obj: face }];
  return r;
}

/* ---------------------------------------------------------- loose parts -- */

interface LooseBit { obj: Object3D; spin: Vec; reach: number; period: number; phase: number; at: [number, number]; side: 'left' | 'right'; scale: number }
function looseFor(k: Kit, side: 'left' | 'right', films: number): Omit<LooseBit, 'at' | 'side' | 'scale'>[] {
  const cross = (): Object3D => { // (the site's registration mark: built flat to the eye, and never tumbled)
    const id = k.id(), g = new Group();
    g.add(new Mesh(boxG(9, 2, 2), k.ink('sgn', id)), new Mesh(boxG(2, 9, 2), k.ink('sgn', id)));
    g.userData.flat = true;
    return g;
  };
  if (side === 'left') {
    const chips: Ink[] = ['sgn', 'alt', 'fld', 'glass', 'bone', 'rubber', 'deep'];
    return [
      ...chips.map((ink, i) => ({ obj: k.solid(boxG(3.2, 3.2, 3.2), ink), spin: [0.4 + i * 0.07, 0.3 + i * 0.05, 0.2] as Vec, reach: 2 + (i % 3), period: 8 + i, phase: i * 1.7 })),
      { obj: cross(), spin: [0, 0, 0.45], reach: 3, period: 15, phase: 7 },
      { obj: k.solid(cylG(1.4, 5, 'y', 6), 'steel'), spin: [0.9, 0.2, 0.6], reach: 3, period: 9, phase: 2 },
      { obj: k.solid(cylG(1.4, 5, 'y', 6), 'steel'), spin: [0.3, 0.8, 0.5], reach: 3, period: 11, phase: 5 },
    ];
  }
  const frame = (i: number) => k.skinned(boxG(9, 0.5, 6), 'rubber', F.py, { map: k.atlas, rect: k.rect(films ? i % films : films) });
  return [
    { obj: k.skinned(boxG(12, 1, 12), 'deep', F.py, { map: k.floppy }), spin: [0.25, 0.4, 0.15], reach: 4, period: 12, phase: 3 },
    { obj: frame(5), spin: [0.5, 0.3, 0.2], reach: 3, period: 10, phase: 1 },
    { obj: frame(6), spin: [0.2, 0.6, 0.35], reach: 3, period: 13, phase: 4 },
    { obj: frame(7), spin: [0.35, 0.25, 0.5], reach: 4, period: 9, phase: 6 },
    { obj: k.solid(boxG(9, 0.4, 4), 'steel'), spin: [0.6, 0.2, 0.7], reach: 3, period: 10, phase: 8 },
    { obj: cross(), spin: [0, 0, -0.45], reach: 3, period: 15, phase: 9 },
  ];
}

/* ---------------------------------------------------------------- build -- */

export function createMachines(canvas: HTMLCanvasElement, films: MachineFilm[], session: string): Machines | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  } catch { return null; }
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const n = films.length;

  // the films' frames: each poster as 8-bit colour in the atlas, NO SIGNAL (the CAL bars) until it lands
  const { w: AW, h: AH } = atlasSize(n);
  const [atlasC, atlasG] = canvas2d(AW, AH);
  for (let i = 0; i <= n; i++) { const c = atlasCell(i); paintNoSignal(atlasG, c.x, c.y, FRAME_W, FRAME_H); }
  const atlas = tex(atlasC);
  const SW = FRAME_W + 4, SH = FRAME_H + 8;
  const [stripC, stripG] = canvas2d(Math.max(1, n) * SW, SH);
  const paintStrip = () => {
    stripG.fillStyle = '#0b0b14'; stripG.fillRect(0, 0, stripC.width, SH);
    for (let i = 0; i < Math.max(1, n); i++) {
      const c = atlasCell(n ? i : n);
      stripG.drawImage(atlasC, c.x, c.y, FRAME_W, FRAME_H, i * SW + 2, 4, FRAME_W, FRAME_H);
      stripG.fillStyle = '#5f63a8';
      for (let x = i * SW + 1; x < (i + 1) * SW; x += 4) { stripG.fillRect(x, 1, 2, 2); stripG.fillRect(x, SH - 3, 2, 2); }
    }
  };
  paintStrip();
  const strip = tex(stripC);
  const [reelC, reelG] = canvas2d(24, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const d = Math.hypot(x + 0.5 - 12, y + 0.5 - 12);
    reelG.fillStyle = d > 10.5 ? '#a9abc9' : d > 9.5 ? '#5f63a8' : d > 4.5 ? (Math.abs(d - 7.2) < 0.5 ? '#2f2f4e' : '#141426') : d > 2.6 ? '#5f63a8' : '#EDEDE6';
    reelG.fillRect(x, y, 1, 1);
  }
  reelG.fillStyle = '#C8FF00'; reelG.fillRect(11, 1, 2, 2);
  const reel = tex(reelC);
  const [flopC, flopG] = canvas2d(16, 16);
  flopG.fillStyle = '#151b55'; flopG.fillRect(0, 0, 16, 16);
  flopG.fillStyle = '#EDEDE6'; flopG.fillRect(2, 1, 12, 8);
  flopG.fillStyle = '#8e8e9e'; flopG.fillRect(3, 3, 10, 1); flopG.fillRect(3, 5, 7, 1);
  flopG.fillStyle = '#C8FF00'; flopG.fillRect(3, 7, 3, 1);
  flopG.fillStyle = '#a9abc9'; flopG.fillRect(4, 11, 8, 5);
  flopG.fillStyle = '#151b55'; flopG.fillRect(9, 12, 2, 3);
  const floppy = tex(flopC);
  const [hueC, hueG] = canvas2d(28, 1);
  ['#C8FF00', '#EDEDE6', '#FF2E63', '#B79CFF', '#2418FF', '#5f63a8', '#C8FF00'].forEach((c, i, a) => { hueG.fillStyle = c; hueG.fillRect(Math.round((i * 28) / a.length), 0, 5, 1); });
  const hue = tex(hueC);
  const [eyeC, eyeG] = canvas2d(20, 14);
  const eye = tex(eyeC);
  const [faceC, faceG] = canvas2d(9, 7);
  faceG.fillStyle = '#10123f'; faceG.fillRect(0, 0, 9, 7);
  faceG.fillStyle = '#EDEDE6'; faceG.fillRect(2, 2, 1, 2); faceG.fillRect(6, 2, 1, 2); faceG.fillRect(3, 5, 3, 1);
  faceG.fillStyle = '#FF2E63'; faceG.fillRect(1, 4, 1, 1); faceG.fillRect(7, 4, 1, 1);
  const face = tex(faceC);

  const kit = new Kit(atlas, AW, AH, strip, reel, floppy, hue, eye, face);
  const scene = new Scene();
  const rigs: Record<string, Rig> = {
    orrery: buildOrrery(kit), lut: buildLut(kit), totem: buildTotem(kit), flatbed: buildFlatbed(kit, n), sheep: buildSheep(kit),
  };
  for (const r of Object.values(rigs)) scene.add(r.group);
  const loose: LooseBit[] = [];
  const looseDefs = { left: looseFor(kit, 'left', n), right: looseFor(kit, 'right', n) };
  const conduitMat = kit.ink('body', kit.id());
  const conduit = new Mesh(new BufferGeometry(), conduitMat);
  scene.add(conduit);
  const pulses = [0, 1, 2, 3, 4].map(() => { const m = kit.beam(ballG(2.6), '#C8FF00', 0.9); scene.add(m); return m; });
  let conduitCurve: CatmullRomCurve3 | null = null;
  const conduitCall = new Object3D();
  scene.add(conduitCall);

  // the posters, as they land
  let alive = true;
  films.forEach((film, i) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = projectAssetUrl(film.slug, 'poster.jpg');
    img.decode().then(() => {
      if (!alive) return;
      const [, g] = canvas2d(FRAME_W, FRAME_H);
      g.fillStyle = '#060606'; g.fillRect(0, 0, FRAME_W, FRAME_H);
      const fit = fitAspect(film.aspect, FRAME_W, FRAME_H);
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, fit.x, fit.y, fit.w, fit.h);
      const d = g.getImageData(0, 0, FRAME_W, FRAME_H);
      ditherRGB(d.data, FRAME_W, FRAME_H);
      const cell = atlasCell(i);
      atlasG.putImageData(d, cell.x, cell.y);
      atlas.needsUpdate = true;
      paintStrip(); strip.needsUpdate = true;
    }).catch(() => { /* the cell keeps NO SIGNAL */ });
  });

  // the camera: the 2:1 isometric angle; a world point's pixel is its dot with ISO.right and -ISO.up
  const camera = new OrthographicCamera(0, 1, 0, -1, 1, 4000);
  camera.position.set(-ISO.forward[0] * 2000, -ISO.forward[1] * 2000, -ISO.forward[2] * 2000);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  let rt: WebGLRenderTarget | null = null;
  const inkMat = new ShaderMaterial({
    vertexShader: INK_VERT, fragmentShader: INK_FRAG, depthTest: false, depthWrite: false,
    uniforms: { tCol: { value: null }, tDepth: { value: null }, uPx: { value: new Vector2() }, uInk: { value: v3(OUTLINE) } },
  });
  const inkScene = new Scene();
  const quad = new Mesh(new PlaneGeometry(2, 2), inkMat);
  quad.frustumCulled = false;
  inkScene.add(quad);
  const inkCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let W = 1, H = 1;
  let sheepPath: Stage['sheep'] = null;
  const worldAt = (x: number, y: number, depth = 0): Vector3 => {
    const p = unproject(x, y);
    return new Vector3(p[0] + ISO.forward[0] * depth, p[1] + ISO.forward[1] * depth, p[2] + ISO.forward[2] * depth);
  };
  const snapV = (v: Vector3): Vector3 => { const q = snap([v.x, v.y, v.z]); return new Vector3(q[0], q[1], q[2]); };

  /** a rig's box on the screen at full open, over its whole turn */
  const measure = (r: Rig): void => {
    r.scale = 1;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const corner = new Vector3();
    for (const t of [0, 7.5, 15, 22.5, 30, 37.5, 45, 52.5]) {
      r.group.position.set(0, 0, 0); r.group.scale.setScalar(1);
      r.place(1);
      r.motion({ t, f: Math.round(t * 12), open: 1, still: false, cue: 0, films, look: null, rig: r });
      r.group.updateMatrixWorld(true);
      r.group.traverse((o) => {
        if (!(o instanceof Mesh) || o.visible === false) return;
        const m = o as Mesh;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox!;
        const glow = ((Array.isArray(m.material) ? m.material[0] : m.material) as ShaderMaterial).uniforms?.uId?.value >= GLOW_ID0;
        if (glow) return;
        for (let i = 0; i < 8; i++) {
          corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(m.matrixWorld);
          const [px, py] = project([corner.x, corner.y, corner.z]);
          x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
      });
    }
    r.box = { x0, x1, y0, y1 };
  };
  for (const r of Object.values(rigs)) measure(r);

  const fit = (r: Rig, s: { x: number; y: number; w: number; h: number }, side: 'left' | 'right'): void => {
    const bw = r.box.x1 - r.box.x0, bh = r.box.y1 - r.box.y0;
    r.scale = Math.max(0.2, Math.min(s.w / bw, s.h / bh) * 0.94);
    const ax = s.x + s.w / 2 - r.scale * (r.box.x0 + r.box.x1) / 2, ay = s.y + s.h / 2 + r.scale * (r.box.y0 + r.box.y1) / 2;
    r.group.position.copy(snapV(worldAt(Math.round(ax), Math.round(ay))));
    r.group.userData.base = r.group.position.clone();
    r.group.scale.setScalar(r.scale);
    r.side = side; r.shown = true; r.group.visible = true;
  };

  let anchorsOut: Anchor[] = [];
  const head = rigs.totem.head!;
  let lastEye = '';
  const paintEye = (dx: number, dy: number, shut: boolean, accent: string) => {
    const key = `${dx},${dy},${shut},${accent}`;
    if (key === lastEye) return;
    lastEye = key;
    eyeG.fillStyle = '#10123f'; eyeG.fillRect(0, 0, 20, 14);
    eyeG.fillStyle = '#151b55'; for (let y = 1; y < 14; y += 2) eyeG.fillRect(0, y, 20, 1); // the set's scan lines
    if (shut) { eyeG.fillStyle = '#EDEDE6'; eyeG.fillRect(3, 7, 14, 1); eyeG.fillRect(5, 8, 10, 1); eye.needsUpdate = true; return; }
    const cx = 9.5 + dx, cy = 6.5 + dy;
    for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (Math.abs(py - 7) >= 5.6 * (1 - ((px - 10) / 10.2) ** 2)) continue; // the lids
      const d2 = (px - cx - 0.5) ** 2 + (py - cy - 0.5) ** 2;
      eyeG.fillStyle = d2 < 2.4 ? '#060606' : d2 < 11 ? accent : '#EDEDE6';
      eyeG.fillRect(x, y, 1, 1);
    }
    eyeG.fillStyle = '#EDEDE6'; eyeG.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 1, 1);
    eye.needsUpdate = true;
  };

  return {
    layout(s) {
      W = Math.max(1, s.W); H = Math.max(1, s.H);
      renderer.setSize(W, H, false);
      camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H;
      camera.updateProjectionMatrix();
      rt?.dispose();
      rt = new WebGLRenderTarget(W, H, { minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true, depthTexture: new DepthTexture(W, H) });
      inkMat.uniforms.tCol.value = rt.texture;
      inkMat.uniforms.tDepth.value = rt.depthTexture;
      (inkMat.uniforms.uPx.value as Vector2).set(1 / W, 1 / H);
      for (const r of Object.values(rigs)) { r.shown = false; r.group.visible = false; }
      const bayScale: Record<'left' | 'right', number> = { left: 0, right: 0 };
      for (const sl of s.slots) {
        const r = rigs[sl.key];
        if (!r) continue;
        const side = sl.key === 'orrery' || sl.key === 'lut' ? 'left' : 'right';
        fit(r, sl, side);
        bayScale[side] = Math.max(bayScale[side], r.scale);
      }
      // the moon's light, from where the city hangs it, into the prism
      const orr = rigs.orrery;
      orr.moon = s.moon && orr.shown ? worldAt(s.moon.x, s.moon.y, -40).sub(orr.group.position).divideScalar(orr.scale) : null;
      // the sheep, the size of its bay's machines, on its run
      sheepPath = s.sheep && bayScale.right ? s.sheep : null;
      const sheep = rigs.sheep;
      sheep.scale = bayScale.right * 1.15; sheep.group.scale.setScalar(sheep.scale); sheep.side = 'right';
      sheep.shown = !!sheepPath; sheep.group.visible = !!sheepPath;
      // the loose parts, round their bay's lower machine
      for (const b of loose) scene.remove(b.obj);
      loose.length = 0;
      for (const side of ['left', 'right'] as const) {
        const sl = s.slots.find((q) => q.key === (side === 'left' ? 'lut' : 'flatbed'));
        const top = s.slots.find((q) => q.key === (side === 'left' ? 'orrery' : 'totem'));
        if (!sl || !top || !bayScale[side]) continue;
        const spots: [number, number][] = side === 'left'
          ? [[0.08, 0.1], [0.92, 0.12], [0.1, 0.55], [0.88, 0.5], [0.06, 0.88], [0.94, 0.82], [0.5, 0.02], [0.84, -0.06], [0.12, -0.12], [0.9, 0.98]]
          : [[0.1, -0.1], [0.92, 0.06], [0.06, 0.4], [0.94, 0.62], [0.12, 0.92], [0.86, -0.12]];
        looseDefs[side].forEach((d, i) => {
          const [fx, fy] = spots[i % spots.length];
          loose.push({ ...d, at: [sl.x + sl.w * fx, sl.y + sl.h * fy], side, scale: bayScale[side] * 0.9 });
          d.obj.scale.setScalar(bayScale[side] * 0.9);
          scene.add(d.obj);
        });
      }
      // the conduit: down from the grade, across behind the list, up into the cut
      conduit.geometry.dispose();
      conduit.geometry = new BufferGeometry();
      conduitCurve = null;
      for (const p of pulses) p.visible = false;
      if (s.conduit && bayScale.left && bayScale.right) {
        const lut = s.slots.find((q) => q.key === 'lut')!, bed = s.slots.find((q) => q.key === 'flatbed')!;
        const a = [lut.x + lut.w / 2, lut.y + lut.h * 0.8], b = [bed.x + bed.w / 2, bed.y + bed.h * 0.85], y = s.conduit.y;
        const pts = [[a[0], a[1]], [a[0], y - 6], [a[0] + 6, y], [b[0] - 6, y], [b[0], y - 6], [b[0], b[1]]].map(([x, yy]) => worldAt(x, yy, 30));
        conduitCurve = new CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
        conduit.geometry = new TubeGeometry(conduitCurve, 96, Math.max(1.2, 1.5 * bayScale.left), 6, false);
        for (const p of pulses) { p.visible = true; p.scale.setScalar(Math.max(0.8, bayScale.left)); }
        conduitCall.position.copy(worldAt(a[0] + Math.min(60, (b[0] - a[0]) * 0.15), y, 30));
      }
      conduit.visible = !!conduitCurve;
    },

    draw(f, st) {
      if (!rt) return;
      const t = f / 12;
      const accent = films[st.cue]?.accent ?? '#C8FF00';
      for (const r of Object.values(rigs)) {
        if (!r.shown) continue;
        const breathe = st.still ? 0.8 : openAt(t, r.period, r.phase);
        const open = st.held ? Math.min(breathe, OPEN_HELD + 0.1) : breathe;
        r.place(open);
        r.motion({ t, f, open, still: st.still, cue: st.cue, films, look: st.look, rig: r });
      }
      // the float: each machine rides on its own beat
      for (const r of Object.values(rigs)) {
        if (!r.shown || r.key === 'sheep') continue;
        const base = r.group.userData.base as Vector3;
        const dy = st.still ? 0 : bobAt(t, 6 + r.period * 0.3, r.phase);
        r.group.position.copy(base).addScaledVector(new Vector3(...ISO.up), dy);
      }
      // the sheep's drift
      if (rigs.sheep.shown && sheepPath) {
        const sh = sheepAt(st.still ? 13 : t);
        const x = sheepPath.x0 + (sheepPath.x1 - sheepPath.x0) * sh.u, y = sheepPath.y - (st.still ? 0 : sh.hop);
        rigs.sheep.group.position.copy(snapV(worldAt(Math.round(x), Math.round(y))));
        rigs.sheep.group.rotation.y = sh.facing === 1 ? Math.PI / 2 : 0; // (its face to the way it goes: +x or +z)
      }
      // the eye on the totem's head: it watches the film pointed at, and blinks
      {
        let d: [number, number] = [0, 0];
        if (st.look && rigs.totem.shown) {
          const hp = new Vector3(); head.getWorldPosition(hp);
          const [hx, hy] = project([hp.x, hp.y, hp.z]);
          d = lookAt(st.look[0] - hx, st.look[1] + hy, 3);
        }
        paintEye(d[0], d[1], !st.still && blinkAt(f), accent);
      }
      for (const b of loose) {
        const [dx, dy] = st.still ? [0, 0] : driftAt(t, b.reach, b.period, b.phase);
        b.obj.position.copy(snapV(worldAt(Math.round(b.at[0] + dx), Math.round(b.at[1] - dy))));
        const tt = st.still ? 2 : t;
        if (b.obj.userData.flat) b.obj.quaternion.copy(camera.quaternion);
        else b.obj.rotation.set(b.spin[0] * tt + b.phase, b.spin[1] * tt + b.phase * 0.5, b.spin[2] * tt);
      }
      if (conduitCurve) pulses.forEach((p, i) => p.position.copy(conduitCurve!.getPointAt(pulseAt(st.still ? 0.3 : t, i, pulses.length))));

      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(inkScene, inkCam);

      // the callouts' anchors, where the parts are now
      const out: Anchor[] = [];
      const film = films[st.cue] ? { slug: films[st.cue].slug, aspect: films[st.cue].aspect } : null;
      const wp = new Vector3();
      const push = (text: string, o: Object3D, side: 'left' | 'right') => {
        o.getWorldPosition(wp);
        const [x, y] = project([wp.x, wp.y, wp.z]);
        out.push({ text: fillCallout(text, film, session), x, y: -y, side });
      };
      for (const r of Object.values(rigs)) if (r.shown) for (const c of r.calls) push(c.text, c.obj, r.side);
      if (conduitCurve) push(CALLOUTS.conduit[0], conduitCall, 'left');
      anchorsOut = out;
    },

    anchors: () => anchorsOut,
    debug: () => Object.values(rigs).map((r) => ({ key: r.key, scale: +r.scale.toFixed(3), box: { x0: +r.box.x0.toFixed(1), x1: +r.box.x1.toFixed(1), y0: +r.box.y0.toFixed(1), y1: +r.box.y1.toFixed(1) } })),

    dispose() {
      alive = false;
      rt?.dispose();
      for (const m of kit.mats) m.dispose();
      inkMat.dispose();
      for (const g of geoms.values()) g.dispose();
      geoms.clear();
      for (const t of [atlas, strip, reel, floppy, hue, eye, face]) t.dispose();
      renderer.dispose();
    },
  };
}
