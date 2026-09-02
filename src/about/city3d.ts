/** REVACHOL, TRAVERSABLE — the about page IS the city (owner decree,
 *  logartis.info model), graded to the reference plate: the opening pulls
 *  OUT to the whole skyline; the sky carries the plate's bands (black-indigo
 *  → violet → a teal-cyan horizon glow over the distant city) under a star
 *  dome with no hole in it; facades wear cinematic two-tone shading (the
 *  moon side burns, the far side sleeps); streets run alive with head- and
 *  taillight rivers and storefront glow; UnrealBloom halos every light in
 *  the low-res pixel buffer; and the whole thing is photographed through a
 *  24mm with real glass (barrel, chromatic fringe, motion blur, vignette).
 *
 *  The city itself comes from the PLAN (city-plan.ts, pure and tested):
 *  twelve building archetypes across two downtowns and an old town, a far
 *  ring that runs on past the flight fence into the fog so the sandbox reads
 *  as endless, and a collision grid — buildings are solid, the camera can
 *  never pass through one in any mode.
 *
 *  Three flight modes (owner decree): TOUR — the page's native scroll flies
 *  the story route (the city was built around it); AUTO — an endless,
 *  randomised, collision-validated drift; FREE — drag to look, WASD to move,
 *  shift to boost, walls stop you. Scroll is never hijacked; calm mode
 *  stills idle motion, the visitor still drives. */
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry,
  CylinderGeometry, DoubleSide, FogExp2, Group, InstancedMesh, Material, Matrix4, Mesh, MeshBasicMaterial,
  NearestFilter, Object3D, PerspectiveCamera, PlaneGeometry, Points, PointsMaterial, RepeatWrapping, Scene,
  SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import {
  AutoFlight, bandPoint, bandPositions, BOUND, CAM_R, EXT, FacadeStyle, G, LOT, NEON, planCity, Solid,
  starPositions, tourRoute,
} from './city-plan';
import { fov24, LensPass, lensTarget, MotionBlurPass } from './city-post';

const PIX = 2;
const WARM = ['#ff9a4d', '#ffb36b', '#ff7a35', '#e8722e', '#ffd9a0'];
const COOL = ['#7de8ff', '#ff5e7a', '#b79cff'];

const pick = <T>(rand: () => number, arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const windowColor = (rand: () => number, warm = 0.82) => (rand() < warm ? pick(rand, WARM) : pick(rand, COOL));

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
 *  optional dark service core and an optional burning crown. */
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
    return (m < 0.32 ? 0.014 : m < 0.74 ? 0.09 : m < 0.94 ? 0.26 : 0.8) * s.dim * s.density;
  };
  switch (s.win) {
    case 'grid':
      for (let fy = 4; fy < 250; fy += 5) {
        const p = mood();
        const floor = rand() < 0.25 ? windowColor(rand, s.warm) : null;
        for (let fx = 3; fx < 58; fx += 5) {
          if (Math.abs(fx - core) < 5) continue;
          if (rand() < p) lit(fx, fy, 3, 3, 0.4 + rand() * 0.55, floor);
        }
      }
      break;
    case 'tiny':
      for (let fy = 3; fy < 252; fy += 4) {
        const p = mood() * 1.1;
        for (let fx = 2; fx < 60; fx += 4) if (rand() < p) lit(fx, fy, 2, 2, 0.35 + rand() * 0.5);
      }
      break;
    case 'wide':
      for (let fy = 4; fy < 248; fy += 6) {
        const p = mood();
        for (let fx = 2; fx < 56; fx += 8) if (rand() < p) lit(fx, fy, 6, 3, 0.4 + rand() * 0.5);
      }
      break;
    case 'ribbon':
      for (let fy = 4; fy < 250; fy += 5) {
        const p = mood() * 1.4;
        const band = windowColor(rand, s.warm);
        for (let fx = 2; fx < 62; fx += 4) if (rand() < p) lit(fx, fy, 4, 2, 0.35 + rand() * 0.5, rand() < 0.7 ? band : null);
      }
      break;
    case 'strip':
      for (let fx = 3; fx < 60; fx += 6) {
        if (Math.abs(fx - core) < 5) continue;
        let run = false;
        const col = windowColor(rand, s.warm);
        for (let fy = 2; fy < 254; fy += 2) {
          if (rand() < 0.06) run = !run;
          if (run && rand() < 0.9 * s.density * s.dim + 0.05) lit(fx, fy, 2, 2, 0.35 + rand() * 0.45, col);
        }
      }
      break;
    case 'curtain':
      for (let fy = 2; fy < 252; fy += 5) {
        if (rand() < mood() * 1.6) lit(1, fy, 62, 4, 0.14 + rand() * 0.2, rand() < 0.5 ? windowColor(rand, s.warm) : null);
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

function signTexture(rand: () => number, color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = color;
  for (let g = 0; g < 6; g++)
    for (let px = 0; px < 3; px++)
      for (let py = 0; py < 3; py++)
        if (rand() < 0.55) x.fillRect(4 + px * 3, 4 + g * 10 + py * 3, 2, 2);
  return asPixelTex(new CanvasTexture(c));
}

/** A roof billboard: a run of glyph blocks with a lit frame. */
function roofSignTexture(rand: () => number, color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 16;
  const x = c.getContext('2d')!;
  x.fillStyle = color;
  x.globalAlpha = 0.5;
  x.fillRect(0, 0, 64, 1); x.fillRect(0, 15, 64, 1);
  x.globalAlpha = 1;
  for (let g = 0; g < 7; g++)
    for (let px = 0; px < 3; px++)
      for (let py = 0; py < 3; py++)
        if (rand() < 0.55) x.fillRect(4 + g * 8 + px * 2, 5 + py * 2, 1, 1);
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
    x.fillStyle = rand() < 0.8 ? pick(rand, WARM) : pick(rand, COOL);
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
  g.addColorStop(0, '#020207');
  g.addColorStop(0.34, '#05071c');
  g.addColorStop(0.44, '#141a44');
  g.addColorStop(0.485, '#3b2f6b');
  g.addColorStop(0.515, '#3f7b93');
  g.addColorStop(0.54, '#a8dbe3');
  g.addColorStop(0.58, '#132347');
  g.addColorStop(1, '#070a1e');
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  return asPixelTex(new CanvasTexture(c));
}

/** One block of ground: a lot with its street band, tiled every G units so
 *  the grid reads from the air. */
function groundTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 40;
  const x = c.getContext('2d')!;
  x.fillStyle = '#08080f'; x.fillRect(0, 0, 40, 40);
  const lot = (LOT / G) * 40;
  x.fillStyle = '#040409'; x.fillRect((40 - lot) / 2, (40 - lot) / 2, lot, lot);
  const t = asPixelTex(new CanvasTexture(c));
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

function paintScreen(x: CanvasRenderingContext2D, rand: () => number): void {
  x.fillStyle = '#05050c'; x.fillRect(0, 0, 32, 20);
  for (let i = 0; i < 40; i++) {
    x.fillStyle = pick(rand, [...NEON, '#ffffff', '#ff9a4d', '#7de8ff']);
    x.globalAlpha = 0.45 + rand() * 0.55;
    x.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 20), 1 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 4));
  }
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
  scene.fog = new FogExp2('#0d0b2a', 0.0056);

  const camera = new PerspectiveCamera(fov24(1), 1, 0.1, 1400);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  const composer = new EffectComposer(renderer, lensTarget(2, 2));
  const blur = new MotionBlurPass(camera, calm ? 0.35 : 0.6);
  const lens = new LensPass();
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(blur);
  composer.addPass(new UnrealBloomPass(new Vector2(2, 2), 0.72, 0.45, 0.3));
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  // -- sky: everything infinitely far rides with the camera ---------------
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
    const r = 320 + rand() * 260;
    s.position.set(Math.cos(a) * r, low ? 55 + rand() * 55 : 140 + rand() * 180, Math.sin(a) * r);
    s.scale.set(low ? 240 + rand() * 160 : 150 + rand() * 130, low ? 34 + rand() * 16 : 46 + rand() * 24, 1);
    clouds.push(s);
    sky.add(s);
  };
  for (let i = 0; i < 8; i++) cloudAt(false);
  for (let i = 0; i < 7; i++) cloudAt(true); // dark slabs against the glow

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
    sky.add(h);
  }

  const groundTex = groundTexture();
  groundTex.repeat.set(4000 / G, 4000 / G);
  const ground = new Mesh(new PlaneGeometry(4000, 4000), new MeshBasicMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // -- the city, from the plan ----------------------------------------------
  const geo = {
    box: new BoxGeometry(1, 1, 1),
    cyl: new CylinderGeometry(0.5, 0.5, 1, 12, 1),
    pyr: new ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), // a square-based pyramid, unit footprint
    spire: new ConeGeometry(0.5, 1, 6),
    dome: new SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), // base at y = 0, unit radius
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
      default: return dark;
    }
  };
  const dummy = new Object3D();
  const buckets = new Map<string, { kind: Solid['kind']; key: string; far: boolean; mats: Matrix4[] }>();
  const place = (s: Solid, far: boolean) => {
    const key = s.arch === 'bits' && s.kind !== 'facade' ? 'dark' : String(s.tex);
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
  for (const s of plan.far) place(s, true);
  const geoFor = (k: Solid['kind']) =>
    k === 'cyl' ? geo.cyl : k === 'pyr' ? geo.pyr : k === 'spire' ? geo.spire : k === 'dome' ? geo.dome : geo.box;
  for (const b of buckets.values()) {
    const inst = new InstancedMesh(geoFor(b.kind), matFor(b.kind, b.key, b.far), b.mats.length);
    b.mats.forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // glowing bars: storefront strips at the pavement, LED edges up the needles
  // (the LEDs run at half power — bloom does the rest, a full-white bar reads as a laser)
  for (const [list, power] of [[plan.strips, 1], [plan.leds, 0.45]] as [typeof plan.strips, number][]) {
    if (!list.length) continue;
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
  }

  // -- the landmark's crown, glow and spire ------------------------------
  const { x: lmx, z: lmz } = plan.landmark;
  const crown = new Mesh(new BoxGeometry(5.2, 3.2, 5.2), new MeshBasicMaterial({ map: crownTexture(), fog: false }));
  crown.position.set(lmx, 95.6, lmz);
  scene.add(crown);
  const crownGlow = new Sprite(new SpriteMaterial({ map: glowTexture('#7de8ff'), transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
  crownGlow.position.set(lmx, 96, lmz);
  crownGlow.scale.set(13, 13, 1);
  scene.add(crownGlow);
  const spire = new Mesh(new BoxGeometry(0.5, 14, 0.5), new MeshBasicMaterial({ color: '#9fb7d8' }));
  spire.position.set(lmx, 104, lmz);
  scene.add(spire);

  // -- signage: wall neon, roof billboards, the giant screens --------------
  const plane = new PlaneGeometry(1, 1);
  const screens: { tex: CanvasTexture; ctx: CanvasRenderingContext2D }[] = [];
  for (const sg of plan.signs) {
    let map: CanvasTexture;
    if (sg.kind === 'screen') {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 20;
      const ctx = c.getContext('2d')!;
      paintScreen(ctx, rand);
      map = asPixelTex(new CanvasTexture(c));
      screens.push({ tex: map, ctx });
    } else {
      map = sg.kind === 'roof' ? roofSignTexture(rand, sg.color) : signTexture(rand, sg.color);
    }
    const m = new Mesh(plane, new MeshBasicMaterial({
      map, transparent: sg.kind !== 'screen', blending: sg.kind === 'screen' ? undefined : AdditiveBlending,
      fog: false, depthWrite: sg.kind === 'screen', side: DoubleSide,
    }));
    m.position.set(sg.x, sg.y, sg.z);
    m.scale.set(sg.w, sg.h, 1);
    m.rotation.y = sg.rotY;
    scene.add(m);
  }

  // -- street lamps, the far ring's neon, beacons --------------------------
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([...plan.lamps, ...plan.farLamps]), 3));
    scene.add(new Points(g, new PointsMaterial({ color: '#C8FF00', size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.45 })));
  }
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(plan.neon.pos), 3));
    const cols = new Float32Array(plan.neon.col.length * 3);
    plan.neon.col.forEach((c, i) => new Color(c).toArray(cols, i * 3));
    g.setAttribute('color', new BufferAttribute(cols, 3));
    scene.add(new Points(g, new PointsMaterial({
      vertexColors: true, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.9,
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

  // -- LIVELY STREETS: rivers of head- and taillights, core and far ring -----
  const RANGE = EXT + 200;
  interface Car { axis: 'x' | 'z'; at: number; s: number; v: number }
  const carSet = (n: number, color: string, dir: 1 | -1): { pts: Points; cars: Car[]; arr: Float32Array } => {
    const cars: Car[] = [];
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // each car rides a real street centre (odd multiples of G/2), in its direction's lane
      const lane = (Math.floor(rand() * 42) - 21) * G + G / 2 + (dir === 1 ? 1.4 : -1.4);
      cars.push({ axis: rand() < 0.5 ? 'x' : 'z', at: lane, s: (rand() - 0.5) * 2 * RANGE, v: (0.22 + rand() * 0.34) * dir });
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(arr, 3));
    const pts = new Points(g, new PointsMaterial({ color, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false }));
    scene.add(pts);
    return { pts, cars, arr };
  };
  const flows = [
    carSet(120, '#ffe6c4', 1),   // headlights toward +
    carSet(120, '#ff5040', -1),  // taillights toward −
    carSet(22, '#C8FF00', 1),    // the acid taxis
  ];
  const driveCars = () => {
    for (const f of flows) {
      for (let i = 0; i < f.cars.length; i++) {
        const car = f.cars[i];
        car.s += car.v;
        if (car.s > RANGE) car.s = -RANGE;
        if (car.s < -RANGE) car.s = RANGE;
        const j = i * 3;
        if (car.axis === 'x') { f.arr[j] = car.s; f.arr[j + 1] = 0.6; f.arr[j + 2] = car.at; }
        else { f.arr[j] = car.at; f.arr[j + 1] = 0.6; f.arr[j + 2] = car.s; }
      }
      (f.pts.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    }
  };
  driveCars();

  // -- flight ---------------------------------------------------------------
  const route = tourRoute();
  let flight: AutoFlight | null = null;
  let mode: FlyMode = 'tour';
  let target = 0;
  let sm = 0;
  let tick = 0;
  let bank = 0;
  let prevYaw = 0;
  const keys = new Set<string>();
  const free = { pos: new Vector3(-96, 86, 124), yaw: 2.5, pitch: -0.25 };
  const pos = new Vector3();
  const look = new Vector3();
  const fwd = new Vector3();

  const applyFree = () => {
    fwd.set(Math.sin(free.yaw) * Math.cos(free.pitch), Math.sin(free.pitch), Math.cos(free.yaw) * Math.cos(free.pitch));
    const boost = keys.has('shift') ? 2.6 : 1;
    const sp = 0.9 * boost;
    const side = new Vector3(fwd.z, 0, -fwd.x).normalize();
    if (keys.has('w') || keys.has('arrowup')) free.pos.addScaledVector(fwd, sp);
    if (keys.has('s') || keys.has('arrowdown')) free.pos.addScaledVector(fwd, -sp);
    if (keys.has('a') || keys.has('arrowleft')) free.pos.addScaledVector(side, sp);
    if (keys.has('d') || keys.has('arrowright')) free.pos.addScaledVector(side, -sp);
    if (keys.has('e') || keys.has(' ')) free.pos.y += sp;
    if (keys.has('q') || keys.has('c')) free.pos.y -= sp;
    free.pos.y = Math.min(220, Math.max(2, free.pos.y));
    free.pos.x = Math.min(BOUND, Math.max(-BOUND, free.pos.x));
    free.pos.z = Math.min(BOUND, Math.max(-BOUND, free.pos.z));
    plan.grid.resolve(free.pos, CAM_R); // buildings are solid: walls stop you, roofs hold you
    camera.position.copy(free.pos);
    camera.lookAt(free.pos.x + fwd.x, free.pos.y + fwd.y, free.pos.z + fwd.z);
  };

  const render = () => {
    if (mode === 'free') {
      applyFree();
    } else if (mode === 'auto' && flight) {
      flight.step(calm ? 0.16 : 0.32, pos, look);
      plan.grid.resolve(pos, CAM_R);
      camera.position.copy(pos);
      camera.lookAt(look);
      // a gentle bank into the turns
      const yaw = Math.atan2(look.x - pos.x, look.z - pos.z);
      let dy = yaw - prevYaw;
      if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
      prevYaw = yaw;
      bank += (Math.max(-0.22, Math.min(0.22, -dy * 14)) - bank) * 0.08;
      camera.rotateZ(bank);
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
      lx += (10 - lx) * vw; ly += (34 - ly) * vw; lz += (10 - lz) * vw;
      lx += (pos.x + MOON.x - lx) * tw; ly += (MOON.y - ly) * tw; lz += (pos.z + MOON.z - lz) * tw;
      camera.lookAt(lx, ly, lz);
    }
    sky.position.set(camera.position.x, 0, camera.position.z); // the horizon never arrives
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
  fit();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(canvas);

  const loop = () => {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    tick += 1;
    if (!calm) {
      (starsA.material as PointsMaterial).opacity = 0.7 + Math.sin(tick * 0.05) * 0.3;
      (starsB.material as PointsMaterial).opacity = 0.55 + Math.cos(tick * 0.033) * 0.35;
      for (let i = 0; i < beacons.length; i++) {
        (beacons[i].material as SpriteMaterial).opacity = ((tick >> 4) + i) % 2 ? 0.95 : 0.12;
      }
      for (let i = 0; i < clouds.length; i++) {
        clouds[i].position.x += 0.014 * ((i % 3) + 1);
        if (clouds[i].position.x > 640) clouds[i].position.x = -640;
      }
      if (tick % 6 === 0) for (const s of screens) { paintScreen(s.ctx, rand); s.tex.needsUpdate = true; }
      driveCars(); // the streets never stop
    }
    if (mode !== 'tour' || !calm || Math.abs(target - sm) > 0.0004) render();
  };
  loop();

  const enterFree = () => {
    free.pos.copy(camera.position);
    camera.getWorldDirection(fwd);
    free.yaw = Math.atan2(fwd.x, fwd.z);
    free.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, fwd.y)));
  };

  return {
    setProgress: (p) => { target = Math.min(1, Math.max(0, p)); },
    setMode: (m) => {
      if (m === mode) return;
      if (m === 'free') enterFree();
      if (m === 'auto') {
        // every AUTO flight is a new one: seeded from the clock, started from wherever the camera is
        camera.getWorldDirection(fwd);
        prevYaw = Math.atan2(fwd.x, fwd.z);
        bank = 0;
        flight = new AutoFlight(plan.grid, mulberry32((Math.random() * 2 ** 32) >>> 0), camera.position, prevYaw);
      }
      mode = m;
      blur.reset();
    },
    look: (dx, dy) => {
      free.yaw -= dx * 0.0034;
      free.pitch = Math.max(-1.35, Math.min(1.35, free.pitch - dy * 0.0034));
    },
    keys,
    warp: (x, y, z, yaw, pitch) => {
      mode = 'free';
      free.pos.set(x, y, z);
      free.yaw = yaw;
      free.pitch = pitch;
      blur.reset();
      render();
    },
    tick: (n = 1) => { for (let i = 0; i < n; i++) { tick += 1; if (!calm) driveCars(); render(); } },
    pose: () => {
      camera.getWorldDirection(fwd);
      return { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: free.yaw, pitch: free.pitch, mode, dir: [fwd.x, fwd.y, fwd.z] };
    },
  };
}
