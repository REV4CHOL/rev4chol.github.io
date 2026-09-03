/** REVACHOL, TRAVERSABLE — the about page IS the city (owner decree,
 *  logartis.info model), graded to the reference plates and to Newport
 *  City: a blue-green night, a canal avenue with boats and bridges, a
 *  tree-lined avenue, an elevated highway on pillars, a diagonal boulevard,
 *  alleys strung with lanterns and wires, blocks packed edge to edge with
 *  jumbled tenements and towers, a stadium and a Ferris wheel, a stepped
 *  megastructure under a giant hologram, pagodas, an industrial corner of
 *  tanks and smoking stacks, skybridges, market stalls, rain; thousands of
 *  signs in the reference's red/yellow/cyan/white over the house neon;
 *  rivers of vehicles (cars, taxis, buses, weaving motorcycles, boats) with
 *  head- and taillights; pedestrians on the pavements; birds over the
 *  rooftops; a star dome with no hole in it; two-tone cinematic facade
 *  shading; UnrealBloom halos; and the whole thing photographed through a
 *  24mm with real glass (barrel, chromatic fringe, motion blur, vignette).
 *
 *  The city itself comes from the PLAN (city-plan.ts, pure and tested) and
 *  a collision grid — buildings are solid, the camera can never pass
 *  through one in any mode.
 *
 *  Three flight modes (owner decree): TOUR — the page's native scroll flies
 *  the story route (the city was built around it); AUTO — an endless,
 *  randomised, collision-validated drift flown at one steady pace, with a
 *  cinematographer's gaze that pans on a damped spring and never whips;
 *  FREE — a rig with mass: drag to look (the head has momentum), WASD to
 *  move (the throttle builds, the rig glides to rest), shift to boost,
 *  walls stop you. Scroll is never hijacked; calm mode stills idle motion,
 *  the visitor still drives. The streets run on a real traffic network
 *  (city-traffic.ts): lanes, lights, queues, turns, on- and off-ramps. */
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry,
  CylinderGeometry, DoubleSide, FogExp2, Group, InstancedMesh, LineBasicMaterial, LineSegments, Material, Matrix4,
  Mesh, MeshBasicMaterial, NearestFilter, Object3D, PerspectiveCamera, PlaneGeometry, Points, PointsMaterial,
  RepeatWrapping, Scene, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, TorusGeometry, Vector2, Vector3,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import {
  AutoFlight, bandPoint, bandPositions, BOUND, CAM_R, CANAL, EXT, FacadeStyle, G, HIGHWAY, planCity, Poi, RAMP_W, rampY,
  REACH, ROAD, Sign, signColor, Solid, starPositions, STREET, Street, tourRoute,
} from './city-plan';
import { fov24, LensPass, lensTarget, MotionBlurPass } from './city-post';
import { Traffic } from './city-traffic';

const PIX = 2;
// the reference's windows: warm sodium AND a lot of cool cyan-blue-white
const WARM = ['#ffb36b', '#ffd9a0', '#ff9a4d', '#ffe9c9', '#ffc27a'];
const COOL = ['#7de8ff', '#4fc3ff', '#bfefff', '#ffffff', '#ff5e7a', '#b79cff'];

const pick = <T>(rand: () => number, arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const windowColor = (rand: () => number, warm = 0.6) => (rand() < warm ? pick(rand, WARM) : pick(rand, COOL));

/** Every hand-pixel canvas is authored in sRGB — mark it so, or the renderer
 *  gamma-lifts the night into a grey wash (measured). */
function asPixelTex(t: CanvasTexture): CanvasTexture {
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  return t;
}

/** A facade in one of six window rhythms — punched grid, ribbon bands,
 *  vertical strips, tiny residential, wide office bays, glass curtain — on
 *  its tint, with the plan's per-style density, warmth and dimness, an
 *  optional dark service core and an optional burning crown. The reference
 *  is far more lit than the last one: roughly a quarter of the windows. */
function facadeTexture(rand: () => number, s: FacadeStyle): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = s.tint;
  x.fillRect(0, 0, 64, 256);
  const core = s.core ? 8 + Math.floor(rand() * 40) : -99;
  const lit = (px: number, py: number, w: number, h: number, alpha: number, color?: string | null) => {
    x.fillStyle = color ?? windowColor(rand, s.warm);
    x.globalAlpha = alpha;
    x.fillRect(px, py, w, h);
  };
  const mood = () => {
    const m = rand();
    return (m < 0.22 ? 0.04 : m < 0.6 ? 0.2 : m < 0.9 ? 0.45 : 0.9) * s.dim * s.density;
  };
  switch (s.win) {
    case 'grid':
      for (let fy = 4; fy < 250; fy += 5) {
        const p = mood();
        const floor = rand() < 0.25 ? windowColor(rand, s.warm) : null;
        for (let fx = 3; fx < 58; fx += 5) {
          if (Math.abs(fx - core) < 5) continue;
          if (rand() < p) lit(fx, fy, 3, 3, 0.45 + rand() * 0.55, floor);
        }
      }
      break;
    case 'tiny':
      for (let fy = 3; fy < 252; fy += 4) {
        const p = mood() * 1.1;
        for (let fx = 2; fx < 60; fx += 4) if (rand() < p) lit(fx, fy, 2, 2, 0.4 + rand() * 0.5);
      }
      break;
    case 'wide':
      for (let fy = 4; fy < 248; fy += 6) {
        const p = mood();
        for (let fx = 2; fx < 56; fx += 8) if (rand() < p) lit(fx, fy, 6, 3, 0.45 + rand() * 0.5);
      }
      break;
    case 'ribbon':
      for (let fy = 4; fy < 250; fy += 5) {
        const p = mood() * 1.3;
        const band = windowColor(rand, s.warm);
        for (let fx = 2; fx < 62; fx += 4) if (rand() < p) lit(fx, fy, 4, 2, 0.4 + rand() * 0.5, rand() < 0.7 ? band : null);
      }
      break;
    case 'strip':
      for (let fx = 3; fx < 60; fx += 6) {
        if (Math.abs(fx - core) < 5) continue;
        let run = false;
        const col = windowColor(rand, s.warm);
        for (let fy = 2; fy < 254; fy += 2) {
          if (rand() < 0.06) run = !run;
          if (run && rand() < 0.9 * s.density * s.dim + 0.05) lit(fx, fy, 2, 2, 0.4 + rand() * 0.45, col);
        }
      }
      break;
    case 'curtain':
      for (let fy = 2; fy < 252; fy += 5) {
        if (rand() < mood() * 1.5) lit(1, fy, 62, 4, 0.16 + rand() * 0.22, rand() < 0.5 ? windowColor(rand, s.warm) : null);
      }
      x.globalAlpha = 1;
      x.fillStyle = s.tint;
      for (let fx = 0; fx < 64; fx += 8) x.fillRect(fx, 0, 1, 256);
      break;
  }
  if (s.crown) {
    lit(2, 2, 60, 12, 0.55, pick(rand, WARM));
    x.globalAlpha = 1;
    x.fillStyle = '#ffd9a0';
    x.fillRect(0, 14, 64, 1);
  }
  x.globalAlpha = 1;
  return asPixelTex(new CanvasTexture(c));
}

function crownTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const x = c.getContext('2d')!;
  x.fillStyle = '#0c0d1d'; x.fillRect(0, 0, 32, 32);
  const r = mulberry32(7);
  for (let i = 0; i < 110; i++) {
    x.fillStyle = r() < 0.7 ? '#bfefff' : '#7de8ff';
    x.globalAlpha = 0.5 + r() * 0.5;
    x.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2);
  }
  x.globalAlpha = 1;
  return asPixelTex(new CanvasTexture(c));
}

/** A run of abstract glyph blocks in WHITE (the instance colour tints them),
 *  optionally framed — the signage alphabet. Never real text. */
function glyphTexture(rand: () => number, w: number, h: number, n: number, vertical: boolean, frame: boolean): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff';
  if (frame) {
    x.globalAlpha = 0.45;
    x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
    x.globalAlpha = 1;
  }
  const span = vertical ? h : w;
  const across = vertical ? w : h;
  const cell = Math.max(1, Math.floor(Math.min(span / n, across) / 4));
  const glyph = cell * 3;
  const step = span / n;
  for (let g = 0; g < n; g++) {
    const g0 = Math.floor(g * step + (step - glyph) / 2);
    const a0 = Math.floor((across - glyph) / 2);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (rand() < 0.55) {
          if (vertical) x.fillRect(a0 + i * cell, g0 + j * cell, cell, cell);
          else x.fillRect(g0 + i * cell, a0 + j * cell, cell, cell);
        }
      }
    }
  }
  return asPixelTex(new CanvasTexture(c));
}

function glowTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return asPixelTex(new CanvasTexture(c));
}

function moonTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffe9c9';
  x.beginPath(); x.arc(12, 12, 7, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'destination-out';
  x.beginPath(); x.arc(16, 10, 6.4, 0, Math.PI * 2); x.fill();
  return asPixelTex(new CanvasTexture(c));
}

/** Dithered pixel clouds; `low` makes the dark silhouette tier that sits
 *  against the horizon glow in the reference. */
function cloudTexture(rand: () => number, low: boolean): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 40;
  const x = c.getContext('2d')!;
  const body = low ? '#151839' : '#303763';
  const top = low ? '#2a3060' : '#5a639e';
  const blobs = 4 + Math.floor(rand() * 4);
  for (let b = 0; b < blobs; b++) {
    const bx = 10 + rand() * 100, by = 14 + rand() * 16, bw = 26 + rand() * 52, bh = 5 + rand() * 9;
    x.fillStyle = body;
    x.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
    x.fillStyle = top;
    x.fillRect(bx - bw / 2, by - bh / 2, bw, 2);
    x.fillStyle = body;
    for (let dx = 0; dx < bw; dx += 4) {
      x.fillRect(bx - bw / 2 + dx + (Math.floor(by) % 2 ? 2 : 0), by + bh / 2, 2, 2);
      x.fillRect(bx - bw / 2 + dx + (Math.floor(bx) % 2 ? 0 : 2), by - bh / 2 - 2, 2, 2);
    }
  }
  return asPixelTex(new CanvasTexture(c));
}

function horizonTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(90,80,160,0.16)');
  g.addColorStop(0.76, 'rgba(120,170,200,0.34)');
  g.addColorStop(1, 'rgba(180,225,235,0.5)');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 96);
  for (let i = 0; i < 2600; i++) {
    const sy = 78 + rand() * 17;
    x.fillStyle = rand() < 0.7 ? pick(rand, WARM) : pick(rand, COOL);
    x.globalAlpha = 0.25 + rand() * 0.6;
    x.fillRect(Math.floor(rand() * 1024), Math.floor(sy), 1, 1);
  }
  x.globalAlpha = 1;
  for (let i = 0; i < 40; i++) {
    x.fillStyle = '#161233';
    const w = 6 + rand() * 22, h = 6 + rand() * 16;
    x.fillRect(rand() * 1024, 96 - h, w, h);
  }
  return asPixelTex(new CanvasTexture(c));
}

/** The reference's sky: black-indigo above, then violet, then the teal-cyan
 *  glow band RIGHT at the visible horizon (the sphere's equator — put the
 *  band anywhere else and it hides below the skyline, which is exactly the
 *  flat-navy bug the first pass shipped). */
function skyTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#020209');
  g.addColorStop(0.34, '#060a22');
  g.addColorStop(0.44, '#141d4a');
  g.addColorStop(0.485, '#3b2f6b');
  g.addColorStop(0.512, '#2f5a74');
  g.addColorStop(0.53, '#6fa8b8'); // the glow: dimmer than the plate's and under the bloom threshold — it sits at eye level now, from any height
  g.addColorStop(0.555, '#2c4c66');
  g.addColorStop(0.61, '#132347');
  g.addColorStop(1, '#070a1e');
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  return asPixelTex(new CanvasTexture(c));
}

/** One block of ground, the street centred: asphalt with double centre
 *  line, lane dashes and crosswalks at the intersection, kerbed pavements,
 *  the dark lot in the corners. Tiled every G units with lot centres on
 *  the tile corners. 4 px per unit. */
function groundTexture(rand: () => number): CanvasTexture {
  const S = 4, T = G * S;
  const c = document.createElement('canvas');
  c.width = c.height = T;
  const x = c.getContext('2d')!;
  x.fillStyle = '#050512'; x.fillRect(0, 0, T, T);
  const mid = T / 2, half = (STREET / 2) * S, road = (ROAD / 2) * S;
  x.fillStyle = '#0e1022';
  x.fillRect(mid - half, 0, half * 2, T); x.fillRect(0, mid - half, T, half * 2);
  x.fillStyle = '#131630';
  for (let i = 0; i < T; i += 4) { // paving dots on the kerbs
    for (const k of [mid - half + 2, mid + half - 4]) { x.fillRect(i + (k % 8 ? 0 : 2), k, 1, 1); x.fillRect(k, i + (k % 8 ? 0 : 2), 1, 1); }
  }
  x.fillStyle = '#07091a';
  x.fillRect(mid - road, 0, road * 2, T); x.fillRect(0, mid - road, T, road * 2);
  const dashes = (color: string, at: number, on: number, off: number, w: number) => {
    x.fillStyle = color;
    for (let i = 0; i < T; i += on + off) {
      if (Math.abs(i + on / 2 - mid) < road + 2) continue; // clear through the intersection
      x.fillRect(at, i, w, on); x.fillRect(i, at, on, w);
    }
  };
  dashes('#3d3418', mid - 1, 8, 6, 2); // the double yellow
  dashes('#20233a', mid - road / 2 - 1, 6, 8, 1); // lane dashes
  dashes('#20233a', mid + road / 2, 6, 8, 1);
  x.fillStyle = '#8a8fa8';
  x.globalAlpha = 0.28;
  for (let k = 0; k < 7; k++) { // crosswalks on the four arms
    const a = mid - road + 2 + k * 6;
    x.fillRect(a, mid - half, 3, 8); x.fillRect(a, mid + half - 8, 3, 8);
    x.fillRect(mid - half, a, 8, 3); x.fillRect(mid + half - 8, a, 8, 3);
  }
  x.globalAlpha = 0.5;
  x.fillStyle = '#0b0d1f'; // a little wear on the lot corners
  for (let i = 0; i < 90; i++) x.fillRect(Math.floor(rand() * T), Math.floor(rand() * T), 2, 1);
  x.globalAlpha = 1;
  const t = asPixelTex(new CanvasTexture(c));
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** A strip of carriageway for the highway deck and the diagonal boulevard:
 *  dark asphalt, edge lines, a dashed centre. Repeats along u. */
function roadStripTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 16;
  const x = c.getContext('2d')!;
  x.fillStyle = '#090b1c'; x.fillRect(0, 0, 64, 16);
  x.fillStyle = '#2a2d44'; x.fillRect(0, 0, 64, 1); x.fillRect(0, 15, 64, 1);
  x.fillStyle = '#3d3418';
  for (let i = 0; i < 64; i += 16) x.fillRect(i, 7, 8, 2);
  const t = asPixelTex(new CanvasTexture(c));
  t.wrapS = RepeatWrapping;
  return t;
}

/** The canal's mirror: vertical streaks of the city's colours, scrolled. */
function waterTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 120; i++) {
    x.fillStyle = signColor(rand);
    x.globalAlpha = 0.12 + rand() * 0.3;
    x.fillRect(Math.floor(rand() * 64), Math.floor(rand() * 256), 1, 6 + Math.floor(rand() * 30));
  }
  x.globalAlpha = 1;
  const t = asPixelTex(new CanvasTexture(c));
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

function paintScreen(x: CanvasRenderingContext2D, rand: () => number): void {
  x.fillStyle = '#05050c'; x.fillRect(0, 0, 32, 20);
  for (let i = 0; i < 40; i++) {
    x.fillStyle = pick(rand, ['#C8FF00', '#FF2E63', '#B79CFF', '#ffffff', '#ff9a4d', '#7de8ff', '#ff3b3b', '#ffd23f']);
    x.globalAlpha = 0.45 + rand() * 0.55;
    x.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 20), 1 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 4));
  }
  x.globalAlpha = 1;
}

/** A hologram's frame: rows of glyph blocks in cyan and magenta over a
 *  scanline veil, scrolling upward. */
function paintHolo(x: CanvasRenderingContext2D, rand: () => number, tick: number): void {
  x.clearRect(0, 0, 48, 72);
  for (let r = 0; r < 12; r++) {
    const y = (r * 6 + tick) % 72;
    x.fillStyle = r % 3 === 0 ? '#ff4fd8' : '#5df2ff';
    for (let cx = 2; cx < 46; cx += 4) {
      if (rand() < 0.5) { x.globalAlpha = 0.5 + rand() * 0.5; x.fillRect(cx, y, 3, 3); }
    }
  }
  x.globalAlpha = 0.25;
  x.fillStyle = '#5df2ff';
  for (let y = 0; y < 72; y += 2) x.fillRect(0, y, 48, 1);
  x.globalAlpha = 1;
}

export type FlyMode = 'tour' | 'auto' | 'free';
export interface CityRide {
  setProgress(p: number): void;
  setMode(m: FlyMode): void;
  look(dx: number, dy: number): void;
  keys: Set<string>;
  /** Verification handles: jump the free camera; advance n frames by hand
   *  (what the frame clock would do, minus the clock); read the pose. */
  warp(x: number, y: number, z: number, yaw: number, pitch: number): void;
  tick(n?: number): void;
  pose(): { x: number; y: number; z: number; yaw: number; pitch: number; mode: FlyMode; dir: number[] };
}

export function mountCity3D(canvas: HTMLCanvasElement, seed: number): CityRide {
  const plan = planCity(seed);
  const rand = mulberry32(seed ^ 0x9e3779b9); // the renderer's own stream; the plan owns the seed
  const calm = reducedMotion();
  const scene = new Scene();
  scene.fog = new FogExp2('#0c1826', 0.0036);

  const camera = new PerspectiveCamera(fov24(1), 1, 0.1, 1400);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  const composer = new EffectComposer(renderer, lensTarget(2, 2));
  const blur = new MotionBlurPass(camera, calm ? 0.35 : 0.6);
  const lens = new LensPass();
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(blur);
  composer.addPass(new UnrealBloomPass(new Vector2(2, 2), 0.62, 0.42, 0.32));
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  // -- sky: the dome rides with the camera like a skybox (owner: clouds
  // slid past during climbs when only x/z followed); the distant-city glow
  // ring stays at ground level and follows x/z only --------------------------
  const sky = new Group();
  scene.add(sky);
  sky.add(new Mesh(
    new SphereGeometry(880, 24, 20),
    new MeshBasicMaterial({ map: skyTexture(), side: BackSide, fog: false, depthWrite: false }),
  ));
  const starsOf = (pos: Float32Array, size: number, tint: string, opacity = 1): Points => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return new Points(g, new PointsMaterial({ color: tint, size, sizeAttenuation: false, transparent: true, opacity, fog: false, depthWrite: false }));
  };
  const starsA = starsOf(starPositions(rand, 2600, 700, 820), 2.2, '#EDEDE6');
  const starsB = starsOf(starPositions(rand, 1100, 700, 820), 3.2, '#cfe6ff');
  const starsC = starsOf(starPositions(rand, 500, 700, 820), 2.0, '#ffd9a0');
  const band = starsOf(bandPositions(rand, 1500, 760, 0.3), 1.4, '#c9d2ff', 0.42);
  sky.add(starsA, starsB, starsC, band);
  for (const [color, th, sc] of [['#b79cff', 0.4, 520], ['#7de8ff', 2.0, 440], ['#ff5e7a', 3.6, 380]] as [string, number, number][]) {
    const p = bandPoint(th, 700);
    if (p.y < 60) continue;
    const s = new Sprite(new SpriteMaterial({
      map: glowTexture(color), transparent: true, opacity: 0.055, blending: AdditiveBlending, fog: false, depthWrite: false,
    }));
    s.position.copy(p);
    s.scale.set(sc, sc * 0.6, 1);
    sky.add(s);
  }
  const MOON = new Vector3(110, 300, 460);
  const moon = new Sprite(new SpriteMaterial({ map: moonTexture(), transparent: true, fog: false, depthWrite: false }));
  moon.position.copy(MOON);
  moon.scale.set(46, 46, 1);
  sky.add(moon);
  const clouds: Sprite[] = [];
  const cloudAt = (low: boolean) => {
    const s = new Sprite(new SpriteMaterial({
      map: cloudTexture(rand, low), transparent: true,
      opacity: low ? 0.85 : 0.55 + rand() * 0.3, fog: false, depthWrite: false,
    }));
    const a = rand() < 0.7 ? rand() * Math.PI : rand() * Math.PI * 2;
    const r = 480 + rand() * 300;
    s.position.set(Math.cos(a) * r, low ? 70 + rand() * 70 : 170 + rand() * 220, Math.sin(a) * r);
    s.scale.set(low ? 300 + rand() * 200 : 190 + rand() * 160, low ? 42 + rand() * 20 : 58 + rand() * 30, 1);
    clouds.push(s);
    sky.add(s);
  };
  for (let i = 0; i < 8; i++) cloudAt(false);
  for (let i = 0; i < 7; i++) cloudAt(true); // dark slabs against the glow

  const horizonRing = new Group();
  scene.add(horizonRing);
  const horizon = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: horizonTexture(rand), transparent: true, fog: false, depthWrite: false, side: DoubleSide }),
  );
  for (let i = 0; i < 4; i++) {
    const h = horizon.clone();
    const a = (i / 4) * Math.PI * 2;
    h.position.set(Math.cos(a) * 430, 34, Math.sin(a) * 430);
    h.scale.set(920, 96, 1);
    h.lookAt(0, 34, 0);
    horizonRing.add(h);
  }

  // -- the ground: streets with lane paint, kerbs and crosswalks; the canal;
  // the diagonal boulevard; the highway deck ---------------------------------
  const groundTex = groundTexture(rand);
  const GROUND = 106 * G; // a whole number of blocks: lot centres land on the tile corners
  groundTex.repeat.set(106, 106);
  const ground = new Mesh(new PlaneGeometry(GROUND, GROUND), new MeshBasicMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const water = new Mesh(new PlaneGeometry(CANAL.w, 2 * REACH), new MeshBasicMaterial({ color: '#040812' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.06;
  scene.add(water);
  const waterTex = waterTexture(rand);
  waterTex.repeat.set(1, 2 * REACH / 64);
  const mirror = new Mesh(new PlaneGeometry(CANAL.w, 2 * REACH), new MeshBasicMaterial({
    map: waterTex, transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false,
  }));
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0.09;
  scene.add(mirror);
  const strip = roadStripTexture();
  const laidRoad = (st: Street, y: number, width: number) => {
    const tex = strip.clone();
    tex.needsUpdate = true;
    tex.repeat.set(st.len / 14, 1);
    const m = new Mesh(new PlaneGeometry(st.len, width), new MeshBasicMaterial({ map: tex }));
    m.position.set(st.x0 + st.dx * st.len / 2, y, st.z0 + st.dz * st.len / 2);
    m.rotation.y = Math.atan2(-st.dz, st.dx);
    m.rotateX(-Math.PI / 2);
    scene.add(m);
  };
  const deckTex = strip.clone();
  deckTex.needsUpdate = true;
  const deckDark = new MeshBasicMaterial({ color: '#0a0c1e' });
  const edge: number[] = []; // amber lights along every deck edge — the highway's and the ramps'
  for (const st of plan.streets) {
    if (st.kind === 'diagonal') laidRoad(st, 0.05, st.width);
    if (st.kind === 'highway') {
      deckTex.repeat.set(st.len / 14, 1);
      const deck = new Mesh(new BoxGeometry(st.len, 0.8, st.width), [deckDark, deckDark, new MeshBasicMaterial({ map: deckTex }), deckDark, deckDark, deckDark]);
      deck.position.set(st.x0 + st.dx * st.len / 2, HIGHWAY.y, st.z0 + st.dz * st.len / 2);
      deck.rotation.y = Math.atan2(-st.dz, st.dx);
      scene.add(deck);
      for (let t = 0; t <= st.len; t += 3) {
        for (const s of [-1, 1]) edge.push(st.x0 + st.dx * t - st.dz * s * 6.6, HIGHWAY.y + 0.9, st.z0 + st.dz * t + st.dx * s * 6.6);
      }
    }
    if (st.kind === 'ramp') { // a chain of tilted deck pieces down the ramp's ease
      const N = 8;
      const rt = strip.clone();
      rt.needsUpdate = true;
      rt.repeat.set(st.len / N / 14, 1);
      const top = new MeshBasicMaterial({ map: rt });
      for (let k = 0; k < N; k++) {
        const t0 = (k / N) * st.len, t1 = ((k + 1) / N) * st.len;
        const y0 = rampY(st, t0), y1 = rampY(st, t1);
        const dh = t1 - t0, dy = y1 - y0;
        const m = new Mesh(new BoxGeometry(Math.hypot(dh, dy) + 0.5, 0.7, RAMP_W), [deckDark, deckDark, top, deckDark, deckDark, deckDark]);
        m.position.set(st.x0 + st.dx * (t0 + t1) / 2, (y0 + y1) / 2 - 0.35, st.z0 + st.dz * (t0 + t1) / 2);
        m.rotation.order = 'YZX';
        m.rotation.set(0, Math.atan2(-st.dz, st.dx), Math.atan2(dy, dh));
        scene.add(m);
      }
      for (let t = 0; t <= st.len; t += 3) {
        for (const s of [-1, 1]) edge.push(st.x0 + st.dx * t - st.dz * s * (RAMP_W / 2 - 0.5), rampY(st, t) + 0.5, st.z0 + st.dz * t + st.dx * s * (RAMP_W / 2 - 0.5));
      }
    }
  }
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(edge), 3));
    scene.add(new Points(g, new PointsMaterial({ color: '#ffb347', size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false })));
  }

  // -- the city, from the plan ----------------------------------------------
  const geo = {
    box: new BoxGeometry(1, 1, 1),
    cyl: new CylinderGeometry(0.5, 0.5, 1, 12, 1),
    pyr: new ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), // a square-based pyramid, unit footprint
    spire: new ConeGeometry(0.5, 1, 6),
    dome: new SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), // base at y = 0, unit radius
    tree: new ConeGeometry(0.5, 1, 7),
    plane: new PlaneGeometry(1, 1),
  };
  const facadeTex = plan.styles.map((s) => facadeTexture(rand, s));
  const cylTex = facadeTex.map((t) => {
    const c = t.clone();
    c.wrapS = RepeatWrapping;
    c.repeat.set(3, 1);
    c.needsUpdate = true;
    return c;
  });
  const dark = new MeshBasicMaterial({ color: '#08080f' });
  // CINEMATIC SHADING, the stylized way: the moon hangs at +x/+z, so those
  // faces carry the map at full strength and the far faces sleep in blue
  // shadow — two-tone per box, no lights computed (box groups: +x,-x,+y,-y,+z,-z)
  const facadeMats = (map: CanvasTexture, shade: string): Material[] => {
    const lit = new MeshBasicMaterial({ map });
    const shad = new MeshBasicMaterial({ map, color: shade });
    return [lit, shad, dark, dark, lit, shad];
  };
  const matFor = (kind: Solid['kind'], key: string, far: boolean): Material | Material[] => {
    switch (kind) {
      case 'facade': return facadeMats(facadeTex[Number(key)], far ? '#3c4068' : '#565b8f');
      case 'cyl': return key === 'dark' ? [dark, dark, dark] : [new MeshBasicMaterial({ map: cylTex[Number(key)], color: '#b4b8d8' }), dark, dark];
      case 'pyr': return new MeshBasicMaterial({ color: '#0b0b18' });
      case 'spire': return new MeshBasicMaterial({ color: '#5f6a92' });
      case 'dome': return new MeshBasicMaterial({ color: '#0d0e20' });
      case 'tree': return new MeshBasicMaterial({ color: '#0b2418' });
      default: return dark;
    }
  };
  const geoFor = (k: Solid['kind']) =>
    k === 'cyl' ? geo.cyl : k === 'pyr' ? geo.pyr : k === 'spire' ? geo.spire : k === 'dome' ? geo.dome : k === 'tree' ? geo.tree : geo.box;
  const dummy = new Object3D();
  const buckets = new Map<string, { kind: Solid['kind']; key: string; far: boolean; mats: Matrix4[] }>();
  const place = (s: Solid, far: boolean) => {
    const key = (s.arch === 'bits' || s.arch === 'street' || s.arch === 'industry' || (s.arch === 'bridge' && s.kind !== 'facade')) && s.kind !== 'facade'
      ? 'dark' : String(s.tex);
    const id = `${far ? 'f' : 'c'}:${s.kind}:${key}`;
    let b = buckets.get(id);
    if (!b) { b = { kind: s.kind, key, far, mats: [] }; buckets.set(id, b); }
    if (s.kind === 'dome') {
      dummy.position.set(s.x, s.y - s.h / 2, s.z);
      dummy.scale.set(s.w / 2, s.h, s.d / 2);
    } else {
      dummy.position.set(s.x, s.y, s.z);
      dummy.scale.set(s.w, s.h, s.d);
    }
    dummy.updateMatrix();
    b.mats.push(dummy.matrix.clone());
  };
  for (const s of plan.core) place(s, false);
  for (const s of plan.outer) place(s, false);
  for (const s of plan.sprawl) place(s, true);
  for (const b of buckets.values()) {
    const inst = new InstancedMesh(geoFor(b.kind), matFor(b.kind, b.key, b.far), b.mats.length);
    b.mats.forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // glowing bars: storefront strips at the pavement, LED edges up the needles
  // (the LEDs run at half power — bloom does the rest, a full-white bar reads
  // as a laser), awnings dim over the shopfronts
  const bars = (list: typeof plan.strips, power: number) => {
    if (!list.length) return;
    const inst = new InstancedMesh(geo.box, new MeshBasicMaterial({ color: '#ffffff' }), list.length);
    list.forEach((s, j) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.scale.set(s.w, s.h, s.d);
      dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
      inst.setColorAt(j, new Color(s.color).multiplyScalar(power));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
  };
  bars(plan.strips, 1);
  bars(plan.leds, 0.45);
  bars(plan.awnings, 0.35);
  { // the market's canopies
    const inst = new InstancedMesh(geo.pyr, new MeshBasicMaterial({ color: '#ffffff' }), plan.stalls.length);
    plan.stalls.forEach((s, j) => {
      dummy.position.set(s.x, 2.9, s.z);
      dummy.scale.set(3.2, 1.2, 2.6);
      dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
      inst.setColorAt(j, new Color(s.color).multiplyScalar(0.5));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
  }

  // -- the landmark's crown, glow and spire ------------------------------
  const { x: lmx, z: lmz } = plan.landmark;
  const crown = new Mesh(new BoxGeometry(7.4, 3.6, 7.4), new MeshBasicMaterial({ map: crownTexture(), fog: false }));
  crown.position.set(lmx, 131.8, lmz);
  scene.add(crown);
  const crownGlow = new Sprite(new SpriteMaterial({ map: glowTexture('#7de8ff'), transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
  crownGlow.position.set(lmx, 132, lmz);
  crownGlow.scale.set(16, 16, 1);
  scene.add(crownGlow);
  const spire = new Mesh(new BoxGeometry(0.6, 18, 0.6), new MeshBasicMaterial({ color: '#9fb7d8' }));
  spire.position.set(lmx, 142, lmz);
  scene.add(spire);

  // -- the stadium's bowl, pitch and floodlights; the Ferris wheel -------------
  {
    const st = plan.stadium;
    const bowl = new Mesh(new CylinderGeometry(1, 0.86, 1, 28, 1, true), new MeshBasicMaterial({ color: '#101538', side: DoubleSide }));
    bowl.position.set(st.x, st.h / 2, st.z);
    bowl.scale.set(st.w / 2, st.h, st.d / 2);
    scene.add(bowl);
    const pitch = new Mesh(new CylinderGeometry(1, 1, 0.3, 28), new MeshBasicMaterial({ color: '#1c5a3c' }));
    pitch.position.set(st.x, 2.2, st.z);
    pitch.scale.set(st.w / 2 - 5, 1, st.d / 2 - 5);
    scene.add(pitch);
    const rim: number[] = [];
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; rim.push(st.x + Math.cos(a) * st.w / 2, st.h + 0.4, st.z + Math.sin(a) * st.d / 2); }
    for (const m of st.masts) rim.push(m.x, m.h + 0.6, m.z);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(rim), 3));
    scene.add(new Points(g, new PointsMaterial({ map: glowTexture('#ffffff'), color: '#e8f4ff', size: 7, sizeAttenuation: true, transparent: true, blending: AdditiveBlending, depthWrite: false })));
  }
  const wheel = new Group();
  {
    const w = plan.wheel;
    wheel.position.set(w.x, w.y, w.z);
    const rim = new Mesh(new TorusGeometry(w.r, 0.35, 6, 40), new MeshBasicMaterial({ color: '#2a2f55' }));
    rim.rotation.y = Math.PI / 2;
    wheel.add(rim);
    const spokes: number[] = [];
    const lights: number[] = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; spokes.push(0, 0, 0, 0, Math.sin(a) * w.r, Math.cos(a) * w.r); }
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; lights.push(0.6, Math.sin(a) * w.r, Math.cos(a) * w.r); }
    const sg = new BufferGeometry();
    sg.setAttribute('position', new BufferAttribute(new Float32Array(spokes), 3));
    wheel.add(new LineSegments(sg, new LineBasicMaterial({ color: '#3a4070' })));
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(new Float32Array(lights), 3));
    wheel.add(new Points(lg, new PointsMaterial({ color: '#ffd9a0', size: 2.4, sizeAttenuation: true, transparent: true, depthWrite: false })));
    const cabins = new InstancedMesh(geo.box, new MeshBasicMaterial({ color: '#ffffff' }), 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      dummy.position.set(0, Math.sin(a) * w.r, Math.cos(a) * w.r);
      dummy.scale.set(1.8, 1.5, 1.8);
      dummy.updateMatrix();
      cabins.setMatrixAt(i, dummy.matrix);
      cabins.setColorAt(i, new Color(signColor(rand)).multiplyScalar(0.7));
    }
    cabins.instanceMatrix.needsUpdate = true;
    if (cabins.instanceColor) cabins.instanceColor.needsUpdate = true;
    wheel.add(cabins);
    scene.add(wheel);
  }

  // -- SIGNAGE: thousands of instanced glyph planes, tinted per sign, a few
  // always flickering; the giant screens and holograms repaint themselves ----
  const SIGN_SHAPES: Record<Exclude<Sign['kind'], 'screen'>, [number, number, number, boolean, boolean]> = {
    hang: [16, 64, 6, true, false], wall: [16, 64, 6, true, false], board: [64, 16, 7, false, true],
    tag: [32, 16, 3, false, true], roof: [64, 16, 7, false, true], gantry: [96, 24, 9, false, true],
  };
  const signGroups = new Map<string, { sign: Sign[]; tex: CanvasTexture }>();
  const screens: { tex: CanvasTexture; ctx: CanvasRenderingContext2D }[] = [];
  let signIdx = 0;
  for (const sg of plan.signs) {
    if (sg.kind === 'screen') {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 20;
      const ctx = c.getContext('2d')!;
      paintScreen(ctx, rand);
      const map = asPixelTex(new CanvasTexture(c));
      screens.push({ tex: map, ctx });
      const m = new Mesh(geo.plane, new MeshBasicMaterial({ map, fog: false, side: DoubleSide }));
      m.position.set(sg.x, sg.y, sg.z);
      m.scale.set(sg.w, sg.h, 1);
      m.rotation.y = sg.rotY;
      scene.add(m);
      continue;
    }
    const id = `${sg.kind}:${signIdx++ % 3}`;
    let grp = signGroups.get(id);
    if (!grp) {
      const [w, h, n, vertical, frame] = SIGN_SHAPES[sg.kind];
      grp = { sign: [], tex: glyphTexture(rand, w, h, n, vertical, frame) };
      signGroups.set(id, grp);
    }
    grp.sign.push(sg);
  }
  const flickers: { inst: InstancedMesh; base: Float32Array; lit: number[] }[] = [];
  for (const grp of signGroups.values()) {
    const inst = new InstancedMesh(geo.plane, new MeshBasicMaterial({
      map: grp.tex, color: '#ffffff', transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
    }), grp.sign.length);
    const base = new Float32Array(grp.sign.length * 3);
    grp.sign.forEach((sg, j) => {
      dummy.position.set(sg.x, sg.y, sg.z);
      dummy.rotation.set(0, sg.rotY, 0);
      dummy.scale.set(sg.w, sg.h, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
      const col = new Color(sg.color).multiplyScalar(0.9);
      inst.setColorAt(j, col);
      col.toArray(base, j * 3);
    });
    dummy.rotation.set(0, 0, 0);
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
    flickers.push({ inst, base, lit: [] });
  }
  const tmpCol = new Color();
  const flicker = () => {
    for (const f of flickers) {
      for (const j of f.lit) f.inst.setColorAt(j, tmpCol.fromArray(f.base, j * 3));
      f.lit.length = 0;
      const n = Math.max(1, Math.round(f.inst.count * 0.02));
      for (let k = 0; k < n; k++) {
        const j = Math.floor(rand() * f.inst.count);
        tmpCol.fromArray(f.base, j * 3).multiplyScalar(rand() < 0.5 ? 0.12 : 1.35);
        f.inst.setColorAt(j, tmpCol);
        f.lit.push(j);
      }
      if (f.inst.instanceColor) f.inst.instanceColor.needsUpdate = true;
    }
  };
  const holos: { mesh: Mesh; tex: CanvasTexture; ctx: CanvasRenderingContext2D }[] = [];
  for (const h of plan.holos) {
    const c = document.createElement('canvas');
    c.width = 48; c.height = 72;
    const ctx = c.getContext('2d')!;
    paintHolo(ctx, rand, 0);
    const tex = asPixelTex(new CanvasTexture(c));
    const m = new Mesh(geo.plane, new MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false,
    }));
    m.position.set(h.x, h.y, h.z);
    m.scale.set(h.w, h.h, 1);
    m.rotation.y = h.rotY;
    scene.add(m);
    holos.push({ mesh: m, tex, ctx });
  }

  // -- street furniture: lamp posts with glowing heads, lanterns, wires,
  // railings, the sprawl's lamps and neon specks, beacons -------------------
  const glowPoints = (pos: number[] | Float32Array, color: string, size: number, opacity = 1) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos instanceof Float32Array ? pos : new Float32Array(pos), 3));
    const pts = new Points(g, new PointsMaterial({
      map: glowTexture(color), color, size, sizeAttenuation: true, transparent: true, opacity,
      blending: AdditiveBlending, depthWrite: false,
    }));
    scene.add(pts);
    return pts;
  };
  {
    const inst = new InstancedMesh(geo.box, new MeshBasicMaterial({ color: '#0c0d1a' }), plan.posts.length);
    const heads = new Float32Array(plan.posts.length * 3);
    plan.posts.forEach((p, j) => {
      const base = p.y ?? 0; // some stand on the highway deck or a ramp
      dummy.position.set(p.x, base + p.h / 2, p.z);
      dummy.scale.set(0.18, p.h, 0.18);
      dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
      heads[j * 3] = p.x; heads[j * 3 + 1] = base + p.h + 0.25; heads[j * 3 + 2] = p.z;
    });
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
    glowPoints(heads, '#ffe9c9', 4.5);
    glowPoints(plan.sprawlLamps, '#ffd9a0', 3);
    glowPoints(plan.lanterns, '#ffb36b', 3);
    const rail: number[] = [];
    for (const b of plan.bridges) for (let x = -12; x <= 12; x += 2.4) for (const s of [-1, 1]) rail.push(x, 1.9, b.z + s * 5.4);
    glowPoints(rail, '#ffd9a0', 2);
  }
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(plan.wires), 3));
    scene.add(new LineSegments(g, new LineBasicMaterial({ color: '#12162a' })));
  }
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(plan.neon.pos), 3));
    const cols = new Float32Array(plan.neon.col.length * 3);
    plan.neon.col.forEach((c, i) => new Color(c).toArray(cols, i * 3));
    g.setAttribute('color', new BufferAttribute(cols, 3));
    scene.add(new Points(g, new PointsMaterial({
      vertexColors: true, size: 2.6, sizeAttenuation: true, transparent: true, opacity: 0.9,
      blending: AdditiveBlending, depthWrite: false,
    })));
  }
  const beacons: Sprite[] = [];
  for (const b of plan.beacons) {
    const s = new Sprite(new SpriteMaterial({ map: glowTexture('#FF2E63'), transparent: true, fog: false, depthWrite: false }));
    s.position.set(b.x, b.y, b.z);
    s.scale.set(3.2, 3.2, 1);
    beacons.push(s);
    scene.add(s);
  }
  // smoke over the stacks, steam from the vents: sprites cycling upward
  interface Puff { s: Sprite; x: number; y0: number; z: number; t: number; rise: number; drift: number; base: number }
  const puffs: Puff[] = [];
  const puffMat = (color: string) => new SpriteMaterial({ map: glowTexture(color), transparent: true, opacity: 0.2, depthWrite: false });
  for (const st of plan.stacks) {
    for (let i = 0; i < 6; i++) {
      const s = new Sprite(puffMat('#8a8fa8'));
      scene.add(s);
      puffs.push({ s, x: st.x, y0: st.top + 0.5, z: st.z, t: i / 6, rise: 26, drift: 9, base: 5 });
    }
  }
  for (const v of plan.vents) {
    for (let i = 0; i < 3; i++) {
      const s = new Sprite(puffMat('#c8d0e8'));
      scene.add(s);
      puffs.push({ s, x: v.x, y0: 0.4, z: v.z, t: i / 3, rise: 7, drift: 1.2, base: 1.6 });
    }
  }
  const breathe = () => {
    for (const p of puffs) {
      p.t = (p.t + 0.006) % 1;
      p.s.position.set(p.x + p.drift * p.t, p.y0 + p.rise * p.t, p.z);
      const sc = p.base * (0.6 + p.t * 2.2);
      p.s.scale.set(sc, sc, 1);
      (p.s.material as SpriteMaterial).opacity = 0.22 * (1 - p.t);
    }
  };

  // -- LIVELY STREETS: a real traffic network (city-traffic.ts) — lanes,
  // lights, queues, turns, the ramps; vehicles never overlap and never vanish
  // (owner). Cars, taxis, buses, trucks, weaving motorcycles; boats on the
  // canal; pedestrians on the pavements and in the alleys; birds; aircraft ----
  const traffic = new Traffic(plan.streets, mulberry32(seed ^ 0x51f15e));
  const inCore = (x: number, z: number) => Math.abs(x) < EXT + G && Math.abs(z) < EXT + G;
  traffic.populate(calm ? 800 : 1500, (lane) => {
    const st = lane.link.street;
    const t = (lane.link.t0 + lane.link.t1) / 2;
    return lane.len * (inCore(st.x0 + st.dx * t, st.z0 + st.dz * t) ? 3 : 0.9) * (st.kind === 'highway' ? 2.2 : 1);
  });
  const cars = traffic.cars;
  const canal = plan.streets.find((s) => s.kind === 'canal')!;
  interface Boat { lane: number; t: number; v: number }
  const boats: Boat[] = [];
  for (let i = 0; i < 14; i++) {
    const dir = rand() < 0.5 ? 1 : -1;
    boats.push({ lane: dir * 4, t: rand() * canal.len, v: (0.03 + rand() * 0.02) * dir });
  }
  const BODY = ['#141827', '#1a1f33', '#242a44', '#3a1f2a', '#2a2a30', '#1c2d3a', '#e8e0d0'];
  const TRUCK = ['#3a3f55', '#5a2a2a', '#2a3a4a', '#c9c2b2', '#2f4a3a'];
  const total = cars.length + boats.length;
  const carMesh = new InstancedMesh(geo.box, new MeshBasicMaterial({ color: '#ffffff' }), total);
  cars.forEach((c, i) => carMesh.setColorAt(i, new Color(
    c.kind === 'bus' ? '#d9d2c4' : c.kind === 'taxi' ? '#ffd23f' : c.kind === 'truck' ? pick(rand, TRUCK) : c.kind === 'moto' ? '#1a1a24' : pick(rand, BODY))));
  boats.forEach((_, k) => carMesh.setColorAt(cars.length + k, new Color('#1a1c2c')));
  scene.add(carMesh);
  const lightsOf = (color: string, size: number, tinted: boolean) => {
    const arr = new Float32Array(total * 2 * 3);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(arr, 3));
    const col = tinted ? new Float32Array(total * 2 * 3) : null;
    if (col) g.setAttribute('color', new BufferAttribute(col, 3));
    const pts = new Points(g, new PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false, vertexColors: tinted }));
    scene.add(pts);
    return { arr, col, pts };
  };
  const heads = lightsOf('#fff2d8', 1.5, false);
  const tails = lightsOf('#ffffff', 1.3, true); // per vehicle: dim red, or bright when braking
  const TAIL = new Color('#ff3b2f').multiplyScalar(0.55), BRAKE = new Color('#ff5040').multiplyScalar(1.6);
  const placeVehicle = (
    i: number, x: number, y: number, z: number, yaw: number, pitch: number, w: number, h: number, len: number, weave: number, brake: boolean,
  ) => {
    const hx = Math.sin(yaw), hz = Math.cos(yaw); // the heading
    const lx = hz, lz = -hx; // and its lateral
    x += lx * weave; z += lz * weave;
    dummy.position.set(x, y, z);
    dummy.rotation.order = 'YXZ';
    dummy.rotation.set(-pitch, yaw, 0);
    dummy.scale.set(w, h, len);
    dummy.updateMatrix();
    carMesh.setMatrixAt(i, dummy.matrix);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const spread = w > 1 ? 0.45 : 0;
    for (const [k, side] of [[0, -spread], [1, spread]] as [number, number][]) {
      const j = (i * 2 + k) * 3;
      heads.arr[j] = x + hx * cp * len / 2 + lx * side; heads.arr[j + 1] = y + sp * len / 2 + 0.1; heads.arr[j + 2] = z + hz * cp * len / 2 + lz * side;
      tails.arr[j] = x - hx * cp * len / 2 + lx * side; tails.arr[j + 1] = y - sp * len / 2 + 0.1; tails.arr[j + 2] = z - hz * cp * len / 2 + lz * side;
      (brake ? BRAKE : TAIL).toArray(tails.col!, j);
    }
  };
  const driveCars = () => {
    traffic.step();
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      const weave = c.kind === 'moto' ? Math.sin(traffic.tick * 0.05 + c.phase) * 0.7 : 0; // the weave, inside the lane
      placeVehicle(i, c.x, c.y + c.h / 2 + 0.05, c.z, c.yaw, c.pitch, c.w, c.h, c.len, weave, c.brake || c.v < 0.01);
    }
    boats.forEach((b, k) => {
      b.t += b.v;
      if (b.t > canal.len) b.t -= canal.len;
      if (b.t < 0) b.t += canal.len;
      const x = canal.x0 + canal.dx * b.t - canal.dz * b.lane, z = canal.z0 + canal.dz * b.t + canal.dx * b.lane;
      const yaw = b.v > 0 ? Math.atan2(canal.dx, canal.dz) : Math.atan2(-canal.dx, -canal.dz);
      placeVehicle(cars.length + k, x, canal.y + 0.35, z, yaw, 0, 2, 0.6, 6, 0, false);
    });
    dummy.rotation.set(0, 0, 0);
    dummy.rotation.order = 'XYZ';
    carMesh.instanceMatrix.needsUpdate = true;
    if (carMesh.instanceColor) carMesh.instanceColor.needsUpdate = true;
    (heads.pts.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (tails.pts.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (tails.pts.geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
  };

  interface Walker { st: Street; off: number; t: number; v: number }
  const walkable = plan.streets.filter((s) => s.kind === 'road' || s.kind === 'alley' || s.kind === 'diagonal');
  const walkTotal = walkable.reduce((a, s) => a + (s.kind === 'alley' ? s.len * 3 : s.len), 0);
  const walkers: Walker[] = [];
  const WALKERS = 1800;
  const walkArr = new Float32Array(WALKERS * 3);
  for (let i = 0; i < WALKERS; i++) {
    let r = rand() * walkTotal;
    let st = walkable[walkable.length - 1];
    for (const s of walkable) { r -= s.kind === 'alley' ? s.len * 3 : s.len; if (r <= 0) { st = s; break; } }
    const off = st.kind === 'alley' ? (rand() - 0.5) * (st.width - 1.5) : (rand() < 0.5 ? 1 : -1) * (st.width / 2 - 1);
    walkers.push({ st, off, t: rand() * st.len, v: (0.018 + rand() * 0.022) * (rand() < 0.5 ? 1 : -1) });
  }
  const walkGeo = new BufferGeometry();
  walkGeo.setAttribute('position', new BufferAttribute(walkArr, 3));
  scene.add(new Points(walkGeo, new PointsMaterial({ color: '#d8dce8', size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false })));
  const walk = () => {
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i];
      w.t += w.v;
      if (w.t > w.st.len) w.t -= w.st.len;
      if (w.t < 0) w.t += w.st.len;
      const j = i * 3;
      walkArr[j] = w.st.x0 + w.st.dx * w.t - w.st.dz * w.off;
      walkArr[j + 1] = 0.9;
      walkArr[j + 2] = w.st.z0 + w.st.dz * w.t + w.st.dx * w.off;
    }
    (walkGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  interface Flock { x: number; y: number; z: number; vx: number; vz: number; phase: number }
  const flocks: Flock[] = [];
  const BIRDS = 11;
  const birdArr = new Float32Array(2 * BIRDS * 3);
  const birdGeo = new BufferGeometry();
  birdGeo.setAttribute('position', new BufferAttribute(birdArr, 3));
  scene.add(new Points(birdGeo, new PointsMaterial({ color: '#05060f', size: 2.8, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, fog: false })));
  const launchFlock = (f: Flock) => {
    const a = rand() * Math.PI * 2;
    const r = EXT + 120;
    f.x = Math.cos(a) * r; f.z = Math.sin(a) * r; f.y = 115 + rand() * 45;
    const sp = 0.28 + rand() * 0.12;
    const back = a + Math.PI + (rand() - 0.5) * 0.8;
    f.vx = Math.cos(back) * sp; f.vz = Math.sin(back) * sp; f.phase = rand() * 7;
  };
  for (let i = 0; i < 2; i++) { const f = { x: 0, y: 0, z: 0, vx: 0, vz: 0, phase: 0 }; launchFlock(f); f.x *= rand(); f.z *= rand(); flocks.push(f); }
  const fly = () => {
    flocks.forEach((f, fi) => {
      f.x += f.vx; f.z += f.vz; f.phase += 0.09;
      if (Math.abs(f.x) > EXT + 160 || Math.abs(f.z) > EXT + 160) launchFlock(f);
      const hx = -f.vz, hz = f.vx; // the V's wings run perpendicular to the flight
      for (let b = 0; b < BIRDS; b++) {
        const k = b - (BIRDS - 1) / 2;
        const j = (fi * BIRDS + b) * 3;
        birdArr[j] = f.x - f.vx * Math.abs(k) * 9 + hx * k * 8;
        birdArr[j + 1] = f.y + Math.sin(f.phase + b) * 0.45;
        birdArr[j + 2] = f.z - f.vz * Math.abs(k) * 9 + hz * k * 8;
      }
    });
    (birdGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };
  const craftArr = new Float32Array(2 * 3);
  const craft = [{ x: -700, z: 380, vx: 0.42, vz: -0.1 }, { x: 600, z: -520, vx: -0.3, vz: 0.28 }];
  const craftGeo = new BufferGeometry();
  craftGeo.setAttribute('position', new BufferAttribute(craftArr, 3));
  const craftMat = new PointsMaterial({ color: '#ff8a8a', size: 3, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false });
  scene.add(new Points(craftGeo, craftMat));
  const cruiseCraft = () => {
    craft.forEach((c, i) => {
      c.x += c.vx; c.z += c.vz;
      if (Math.abs(c.x) > 900 || Math.abs(c.z) > 900) { c.x = -Math.sign(c.vx) * 850; c.z = (rand() - 0.5) * 900; }
      craftArr[i * 3] = c.x; craftArr[i * 3 + 1] = 250 + i * 30; craftArr[i * 3 + 2] = c.z;
    });
    (craftGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  // -- flight ---------------------------------------------------------------
  const route = tourRoute();
  let flight: AutoFlight | null = null;
  let mode: FlyMode = 'tour';
  let target = 0;
  let sm = 0;
  let tick = 0;
  let bank = 0;
  const keys = new Set<string>();
  // the free rig: position and velocity, a head with momentum, a throttle
  // that builds, a roll that leans into turns and strafes
  const free = {
    pos: new Vector3(-3.6 * G, 90, 4.6 * G), yaw: 2.5, pitch: -0.25,
    vel: new Vector3(), yawV: 0, pitchV: 0, lookX: 0, lookY: 0, roll: 0, throttle: 0,
  };
  // the auto rig's eye: a critically damped pan with a ceiling on its rate
  const cam = { yaw: 0, pitch: 0, yawV: 0, pitchV: 0 };
  const pos = new Vector3();
  const look = new Vector3();
  const fwd = new Vector3();
  const side = new Vector3();
  const want = new Vector3();
  const meant = new Vector3();
  const HEART = new Vector3(0.55 * G, 44, 0.55 * G);
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  // the cinematographer: on each new leg, pick something worth looking at
  // ahead (the landmark, the tallest towers, the screens, the wheel, the
  // holograms) and ease the eye onto it; in the canyons, look down the
  // street at the traffic
  const gaze = { want: new Vector3(), poi: null as Poi | null, leg: -1, held: 0 };
  const chooseGaze = (phase: string) => {
    if (gaze.poi && gaze.held < 240) return; // a subject is held for a few seconds at least
    gaze.poi = null; gaze.held = 0;
    if (phase === 'canyon' || phase === 'dive' || phase === 'flyover' || rand() < 0.3) return;
    const tx = look.x - pos.x, tz = look.z - pos.z;
    const tl = Math.hypot(tx, tz) || 1;
    let best: Poi | null = null;
    let bestScore = 0;
    for (const p of plan.pois) {
      const dx = p.x - pos.x, dz = p.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 40 || dist > 340) continue;
      const dot = (dx * tx + dz * tz) / (dist * tl);
      if (dot < 0.3) continue;
      const score = p.w * (0.5 + dot) * (1 - dist / 420) * (0.6 + rand() * 0.8);
      if (score > bestScore) { best = p; bestScore = score; }
    }
    gaze.poi = best;
  };

  const applyFree = () => {
    // the head: a drag is an impulse on a velocity that decays — the look
    // has momentum, it settles rather than stops (owner: not a spectator cam)
    free.yawV = free.yawV * 0.8 - free.lookX * 0.00068;
    free.pitchV = free.pitchV * 0.8 - free.lookY * 0.00068;
    free.lookX = 0; free.lookY = 0;
    free.yaw += free.yawV;
    free.pitch = clamp(free.pitch + free.pitchV, -1.35, 1.35);
    fwd.set(Math.sin(free.yaw) * Math.cos(free.pitch), Math.sin(free.pitch), Math.cos(free.yaw) * Math.cos(free.pitch));
    side.set(fwd.z, 0, -fwd.x).normalize();
    // the intent, in the rig's frame
    want.set(0, 0, 0);
    let strafe = 0;
    if (keys.has('w') || keys.has('arrowup')) want.add(fwd);
    if (keys.has('s') || keys.has('arrowdown')) want.sub(fwd);
    if (keys.has('a') || keys.has('arrowleft')) { want.add(side); strafe += 1; }
    if (keys.has('d') || keys.has('arrowright')) { want.sub(side); strafe -= 1; }
    if (keys.has('e') || keys.has(' ')) want.y += 1;
    if (keys.has('q') || keys.has('c')) want.y -= 1;
    const driving = want.lengthSq() > 0;
    // the throttle builds while a key is held and bleeds off when released;
    // the velocity chases the intent, and glides to rest without it
    free.throttle = driving ? Math.min(1, free.throttle + 0.02) : Math.max(0, free.throttle - 0.03);
    const boost = keys.has('shift') ? 2.4 : 1;
    const speed = 1.05 * boost * (0.25 + 0.75 * free.throttle * free.throttle);
    if (driving) free.vel.lerp(want.normalize().multiplyScalar(speed), 0.07);
    else free.vel.multiplyScalar(0.94);
    meant.copy(free.pos).add(free.vel);
    free.pos.copy(meant);
    free.pos.y = clamp(free.pos.y, 2, 220);
    free.pos.x = clamp(free.pos.x, -BOUND, BOUND);
    free.pos.z = clamp(free.pos.z, -BOUND, BOUND);
    plan.grid.resolve(free.pos, CAM_R); // buildings are solid: walls stop you, roofs hold you
    // what a wall (or the fence) took, the velocity loses — the slide keeps the rest
    if (Math.abs(free.pos.x - meant.x) > 1e-6) free.vel.x = 0;
    if (Math.abs(free.pos.y - meant.y) > 1e-6) free.vel.y = 0;
    if (Math.abs(free.pos.z - meant.z) > 1e-6) free.vel.z = 0;
    // the lean: into the turn, into the strafe
    const rollTo = clamp(-free.yawV * 9 - strafe * 0.05 * free.throttle, -0.2, 0.2);
    free.roll += (rollTo - free.roll) * 0.08;
    camera.position.copy(free.pos);
    camera.lookAt(free.pos.x + fwd.x, free.pos.y + fwd.y, free.pos.z + fwd.z);
    camera.rotateZ(free.roll);
  };

  const render = () => {
    if (mode === 'free') {
      applyFree();
    } else if (mode === 'auto' && flight) {
      flight.step(calm ? 0.13 : 0.26, pos, look);
      plan.grid.resolve(pos, CAM_R);
      camera.position.copy(pos);
      if (flight.legId !== gaze.leg) { gaze.leg = flight.legId; chooseGaze(flight.phase); }
      gaze.held += 1;
      // the eye: an orbit's centre; else the chosen subject while it stays
      // ahead; else the path ahead (and down the street in a canyon)
      const focus = flight.focus;
      if (gaze.poi) {
        const dx = gaze.poi.x - pos.x, dz = gaze.poi.z - pos.z;
        const d = Math.hypot(dx, dz) || 1;
        const tx = look.x - pos.x, tz = look.z - pos.z;
        if ((dx * tx + dz * tz) / (d * (Math.hypot(tx, tz) || 1)) < 0.17) gaze.poi = null; // past 80° off the path: let it go
      }
      if (focus) gaze.want.set(focus.x, focus.y, focus.z);
      else if (gaze.poi) gaze.want.set(gaze.poi.x, gaze.poi.y, gaze.poi.z);
      else gaze.want.copy(look).setY(look.y - (flight.phase === 'canyon' ? 4 : 0));
      // a critically damped pan with a ceiling on its rate — never a whip,
      // never a jolt (owner: no sudden pans)
      const dx = gaze.want.x - pos.x, dy = gaze.want.y - pos.y, dz = gaze.want.z - pos.z;
      const ey = wrap(Math.atan2(dx, dz) - cam.yaw);
      const ep = Math.atan2(dy, Math.hypot(dx, dz)) - cam.pitch;
      cam.yawV = clamp(cam.yawV + ey * 0.0011 - cam.yawV * 0.066, -0.009, 0.009);
      cam.pitchV = clamp(cam.pitchV + ep * 0.0011 - cam.pitchV * 0.066, -0.006, 0.006);
      cam.yaw += cam.yawV;
      cam.pitch = clamp(cam.pitch + cam.pitchV, -1.2, 1.2);
      fwd.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
      camera.lookAt(pos.x + fwd.x, pos.y + fwd.y, pos.z + fwd.z);
      // a gentle bank into the pans, and the slow breath of a handheld rig
      bank += (clamp(-cam.yawV * 18, -0.16, 0.16) - bank) * 0.05;
      camera.rotateZ(bank + (calm ? 0 : Math.sin(tick * 0.011) * 0.005));
    } else {
      sm += (target - sm) * (calm ? 0.16 : 0.07);
      const t = Math.min(0.999, Math.max(0, sm)) * 0.985;
      route.getPointAt(t, pos);
      route.getPointAt(Math.min(0.999, t + 0.012), look);
      if (!calm) pos.x += Math.sin(tick * 0.011) * 0.7;
      plan.grid.resolve(pos, CAM_R);
      camera.position.copy(pos);
      // the flight's ends aim at WORLD TARGETS, not the route tangent (the
      // lookahead sits a few units off, so offsets over-pitch): the vista
      // holds the city's heart in frame, the terminus rises to the moon
      let lx = look.x, ly = look.y + 1.2, lz = look.z;
      const vw = Math.max(0, (0.12 - t) / 0.12);
      const tw = Math.max(0, (t - 0.86) / 0.14) * 0.9;
      lx += (HEART.x - lx) * vw; ly += (HEART.y - ly) * vw; lz += (HEART.z - lz) * vw;
      lx += (pos.x + MOON.x - lx) * tw; ly += (pos.y + MOON.y - ly) * tw; lz += (pos.z + MOON.z - lz) * tw;
      camera.lookAt(lx, ly, lz);
    }
    sky.position.copy(camera.position); // the dome is a skybox: infinitely far in every direction
    horizonRing.position.set(camera.position.x, 0, camera.position.z); // the far city stays on the ground
    // rain on the glass: down among the streets, none from the heights, none in calm
    const wet = calm ? 0 : clamp((64 - camera.position.y) / 34, 0, 1);
    lens.setRain(wet * wet * (3 - 2 * wet) * 0.42, tick / 60);
    composer.render();
  };

  const fit = () => {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(Math.ceil(w / PIX), Math.ceil(h / PIX), false);
    composer.setSize(Math.ceil(w / PIX), Math.ceil(h / PIX));
    camera.aspect = w / h;
    camera.fov = fov24(camera.aspect); // a 24mm across the long edge
    camera.updateProjectionMatrix();
    lens.setAspect(camera.aspect);
    blur.reset();
    render();
  };

  /** Everything that moves on its own: traffic, walkers, birds, signs,
   *  screens, holograms, smoke, the wheel, the water. */
  const tickWorld = () => {
    tick += 1;
    if (calm) return;
    (starsA.material as PointsMaterial).opacity = 0.7 + Math.sin(tick * 0.05) * 0.3;
    (starsB.material as PointsMaterial).opacity = 0.55 + Math.cos(tick * 0.033) * 0.35;
    for (let i = 0; i < beacons.length; i++) {
      (beacons[i].material as SpriteMaterial).opacity = ((tick >> 4) + i) % 2 ? 0.95 : 0.12;
    }
    for (let i = 0; i < clouds.length; i++) {
      clouds[i].position.x += 0.014 * ((i % 3) + 1);
      if (clouds[i].position.x > 820) clouds[i].position.x = -820;
    }
    if (tick % 6 === 0) {
      for (const s of screens) { paintScreen(s.ctx, rand); s.tex.needsUpdate = true; }
      flicker();
    }
    if (tick % 4 === 0) for (const h of holos) { paintHolo(h.ctx, rand, 72 - ((tick >> 2) % 72)); h.tex.needsUpdate = true; }
    for (const h of holos) h.mesh.rotation.y += 0.0025;
    wheel.rotation.x += 0.004;
    waterTex.offset.y = (waterTex.offset.y + 0.0015) % 1;
    (mirror.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(tick * 0.03) * 0.06;
    craftMat.opacity = tick % 40 < 20 ? 1 : 0.15;
    driveCars();
    walk();
    fly();
    cruiseCraft();
    breathe();
  };
  driveCars(); walk(); fly(); cruiseCraft(); breathe();
  fit();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(canvas);

  const loop = () => {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    tickWorld();
    if (mode !== 'tour' || !calm || Math.abs(target - sm) > 0.0004) render();
  };
  loop();

  const enterFree = () => {
    free.pos.copy(camera.position);
    camera.getWorldDirection(fwd);
    free.yaw = Math.atan2(fwd.x, fwd.z);
    free.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, fwd.y)));
    free.vel.set(0, 0, 0); free.yawV = 0; free.pitchV = 0; free.roll = 0; free.throttle = 0;
  };

  return {
    setProgress: (p) => { target = Math.min(1, Math.max(0, p)); },
    setMode: (m) => {
      if (m === mode) return;
      if (m === 'free') enterFree();
      if (m === 'auto') {
        // every AUTO flight is a new one: seeded from the clock, started from wherever the camera is
        camera.getWorldDirection(fwd);
        cam.yaw = Math.atan2(fwd.x, fwd.z);
        cam.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, fwd.y)));
        cam.yawV = 0; cam.pitchV = 0;
        bank = 0;
        flight = new AutoFlight(plan.grid, mulberry32((Math.random() * 2 ** 32) >>> 0), camera.position, cam.yaw, plan.roomAhead, plan.pois);
        gaze.leg = -1; gaze.poi = null; gaze.held = 0;
      }
      mode = m;
      blur.reset();
    },
    look: (dx, dy) => { free.lookX += dx; free.lookY += dy; }, // an impulse; the head carries it
    keys,
    warp: (x, y, z, yaw, pitch) => {
      mode = 'free';
      free.pos.set(x, y, z);
      free.yaw = yaw;
      free.pitch = pitch;
      free.vel.set(0, 0, 0); free.yawV = 0; free.pitchV = 0; free.roll = 0; free.throttle = 0;
      blur.reset();
      render();
    },
    tick: (n = 1) => { for (let i = 0; i < n; i++) { tickWorld(); render(); } },
    pose: () => {
      camera.getWorldDirection(fwd);
      return { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: free.yaw, pitch: free.pitch, mode, dir: [fwd.x, fwd.y, fwd.z] };
    },
  };
}
