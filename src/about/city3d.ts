/** REVACHOL, TRAVERSABLE — the about page IS the city (owner decree,
 *  logartis.info model), graded to the reference plate: the opening pulls
 *  OUT to the whole skyline; the sky carries the plate's bands (black-indigo
 *  → violet → a teal-cyan horizon glow over the distant city); facades wear
 *  cinematic two-tone shading (the moon side burns, the far side sleeps);
 *  streets run alive with headlight/taillight rivers and storefront glow;
 *  UnrealBloom halos every light in the low-res pixel buffer.
 *
 *  Three flight modes (owner decree): TOUR — the page's native scroll flies
 *  the story route with its content stations; AUTO — an endless drifting
 *  loop around the city; FREE — drag to look, WASD to move, shift to boost.
 *  Scroll is never hijacked; calm mode stills idle motion, the visitor
 *  still drives. */
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CanvasTexture,
  CatmullRomCurve3, Float32BufferAttribute, FogExp2, InstancedMesh, Matrix4,
  Mesh, MeshBasicMaterial, NearestFilter, Object3D, PerspectiveCamera,
  PlaneGeometry, Points, PointsMaterial, Scene, SphereGeometry, Sprite,
  SpriteMaterial, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
  BoxGeometry, Color, DoubleSide,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';

const PIX = 2;
const WARM = ['#ff9a4d', '#ffb36b', '#ff7a35', '#e8722e', '#ffd9a0'];
const COOL = ['#7de8ff', '#ff5e7a', '#b79cff'];
const NEON = ['#C8FF00', '#FF2E63', '#B79CFF']; // the house voice

const pick = (rand: () => number, arr: string[]) => arr[Math.floor(rand() * arr.length)];
const windowColor = (rand: () => number) => (rand() < 0.82 ? pick(rand, WARM) : pick(rand, COOL));

/** Every hand-pixel canvas is authored in sRGB — mark it so, or the renderer
 *  gamma-lifts the night into a grey wash (measured). */
function asPixelTex(t: CanvasTexture): CanvasTexture {
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  return t;
}

function facadeTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = rand() < 0.5 ? '#0a0a16' : '#0c0d1d';
  x.fillRect(0, 0, 64, 256);
  const core = rand() < 0.35 ? 8 + Math.floor(rand() * 40) : -99;
  const dim = 0.55 + rand() * 0.45;
  for (let fy = 4; fy < 250; fy += 5) {
    const mood = rand();
    const p = (mood < 0.32 ? 0.014 : mood < 0.74 ? 0.09 : mood < 0.94 ? 0.26 : 0.8) * dim;
    const floorColor = rand() < 0.25 ? windowColor(rand) : null;
    for (let fx = 3; fx < 58; fx += 5) {
      if (Math.abs(fx - core) < 5) continue;
      if (rand() < p) {
        x.fillStyle = floorColor ?? windowColor(rand);
        x.globalAlpha = 0.4 + rand() * 0.55;
        x.fillRect(fx, fy, 3, 3);
      }
    }
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

export type FlyMode = 'tour' | 'auto' | 'free';
export interface CityRide {
  setProgress(p: number): void;
  setMode(m: FlyMode): void;
  look(dx: number, dy: number): void;
  keys: Set<string>;
}

export function mountCity3D(canvas: HTMLCanvasElement, seed: number): CityRide {
  const rand = mulberry32(seed);
  const calm = reducedMotion();
  const scene = new Scene();
  scene.fog = new FogExp2('#0d0b2a', 0.0056);

  const camera = new PerspectiveCamera(58, 1, 0.1, 1100);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new Vector2(2, 2), 0.72, 0.45, 0.3));
  composer.addPass(new OutputPass());

  // -- sky ----------------------------------------------------------------
  scene.add(new Mesh(
    new SphereGeometry(880, 24, 20),
    new MeshBasicMaterial({ map: skyTexture(), side: BackSide, fog: false, depthWrite: false }),
  ));
  const starShell = (n: number, size: number, tint: string): Points => {
    const pos: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const y = rand() * 0.92 + 0.08;
      const r = 420 + rand() * 300;
      pos.push(Math.cos(a) * r, y * r * 0.8, Math.sin(a) * r);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return new Points(g, new PointsMaterial({ color: tint, size, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
  };
  const starsA = starShell(1500, 2.2, '#EDEDE6');
  const starsB = starShell(700, 3.2, '#cfe6ff');
  const starsC = starShell(260, 2.2, '#ffd9a0');
  scene.add(starsA, starsB, starsC);

  const moon = new Sprite(new SpriteMaterial({ map: moonTexture(), transparent: true, fog: false, depthWrite: false }));
  moon.position.set(110, 300, 460);
  moon.scale.set(46, 46, 1);
  scene.add(moon);

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
    scene.add(s);
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
    scene.add(h);
  }

  const ground = new Mesh(new PlaneGeometry(1800, 1800), new MeshBasicMaterial({ color: '#04040a' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // -- the city -----------------------------------------------------------
  const LOT = 13, STREET = 7, HALF = 11;
  const G = LOT + STREET;
  const EXT = HALF * G;
  const facades = Array.from({ length: 12 }, () => facadeTexture(rand));
  const perTex: Matrix4[][] = facades.map(() => []);
  const roofBits: Matrix4[] = [];
  const antennaBits: Matrix4[] = [];
  const stripMats: Matrix4[] = [];
  const stripCols: Color[] = [];
  const dummy = new Object3D();
  const tall: { x: number; z: number; h: number }[] = [];
  const putBox = (x: number, y: number, z: number, w: number, h: number, d: number, bucket: Matrix4[]) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    bucket.push(dummy.matrix.clone());
  };
  for (let bx = -HALF; bx <= HALF; bx++) {
    for (let bz = -HALF; bz <= HALF; bz++) {
      if (Math.abs(bx) < 1 && Math.abs(bz) < 1) continue;
      const cx = bx * G, cz = bz * G;
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const w = 4 + rand() * 6;
        const d = 4 + rand() * 6;
        const centerPull = 1 - Math.min(1, (Math.abs(bx) + Math.abs(bz)) / (HALF * 1.5));
        const h = 6 + rand() * 26 + centerPull * rand() * 40;
        const x = cx + (rand() - 0.5) * (LOT - w);
        const z = cz + (rand() - 0.5) * (LOT - d);
        putBox(x, h / 2, z, w, h, d, perTex[Math.floor(rand() * facades.length)]);
        if (h > 30) {
          putBox(x, h + (h * 0.28) / 2, z, w * 0.66, h * 0.28, d * 0.66, perTex[Math.floor(rand() * facades.length)]);
          if (h > 44) putBox(x, h * 1.28 + (h * 0.16) / 2, z, w * 0.38, h * 0.16, d * 0.38, perTex[Math.floor(rand() * facades.length)]);
          tall.push({ x, z, h: h * (h > 44 ? 1.44 : 1.28) });
        }
        const bits = 1 + Math.floor(rand() * 2);
        for (let rb = 0; rb < bits; rb++) {
          putBox(
            x + (rand() - 0.5) * w * 0.5, h + 0.7, z + (rand() - 0.5) * d * 0.5,
            0.8 + rand() * 1.4, 1.4, 0.8 + rand() * 1.4, roofBits,
          );
        }
        if (rand() < 0.16) putBox(x + (rand() - 0.5) * w * 0.4, h + 2.4, z + (rand() - 0.5) * d * 0.4, 0.22, 4.8, 0.22, antennaBits);
        // LIVELY STREETS: a glowing storefront band at the base of the
        // inner-city buildings — shop light spilling onto the pavement
        if (Math.abs(bx) <= 4 && Math.abs(bz) <= 4 && rand() < 0.75) {
          const side = Math.floor(rand() * 4);
          const sx = side === 0 ? x : side === 1 ? x : x + (side === 2 ? w / 2 + 0.08 : -w / 2 - 0.08);
          const sz = side === 0 ? z + d / 2 + 0.08 : side === 1 ? z - d / 2 - 0.08 : z;
          dummy.position.set(sx, 0.85, sz);
          dummy.scale.set(side < 2 ? w * 0.82 : 0.14, 1.5, side < 2 ? 0.14 : d * 0.82);
          dummy.updateMatrix();
          stripMats.push(dummy.matrix.clone());
          stripCols.push(new Color(rand() < 0.72 ? pick(rand, WARM) : pick(rand, [...COOL, '#C8FF00'])));
        }
      }
    }
  }
  const box = new BoxGeometry(1, 1, 1);
  const dark = new MeshBasicMaterial({ color: '#08080f' });
  // CINEMATIC SHADING, the stylized way: the moon hangs at +x/+z, so those
  // faces carry the map at full strength and the far faces sleep in blue
  // shadow — two-tone per box, no lights computed (box groups: +x,-x,+y,-y,+z,-z)
  const facadeMats = (map: CanvasTexture) => {
    const lit = new MeshBasicMaterial({ map });
    const shad = new MeshBasicMaterial({ map, color: '#565b8f' });
    return [lit, shad, dark, dark, lit, shad];
  };
  for (let i = 0; i < facades.length; i++) {
    const inst = new InstancedMesh(box, facadeMats(facades[i]), perTex[i].length);
    perTex[i].forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
  for (const bits of [roofBits, antennaBits]) {
    const inst = new InstancedMesh(box, dark, bits.length);
    bits.forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
  {
    const strips = new InstancedMesh(box, new MeshBasicMaterial({ color: '#ffffff' }), stripMats.length);
    stripMats.forEach((m, j) => {
      strips.setMatrixAt(j, m);
      strips.setColorAt(j, stripCols[j]);
    });
    strips.instanceMatrix.needsUpdate = true;
    if (strips.instanceColor) strips.instanceColor.needsUpdate = true;
    scene.add(strips);
  }

  // -- midground ring -----------------------------------------------------
  {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 64;
    const x = c.getContext('2d')!;
    x.fillStyle = '#0a0a16'; x.fillRect(0, 0, 32, 64);
    const r2 = mulberry32(seed ^ 0x51f15e);
    for (let i = 0; i < 150; i++) {
      x.fillStyle = windowColor(r2);
      x.globalAlpha = 0.35 + r2() * 0.6;
      x.fillRect(1 + Math.floor(r2() * 30), 1 + Math.floor(r2() * 62), 1, 1);
    }
    x.globalAlpha = 1;
    const mats: Matrix4[] = [];
    for (let i = 0; i < 850; i++) {
      const a = rand() * Math.PI * 2;
      const r = 250 + rand() * 160;
      const w = 5 + rand() * 9;
      const h = 4 + rand() * 15;
      dummy.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
    }
    const inst = new InstancedMesh(box, facadeMats(asPixelTex(new CanvasTexture(c))), mats.length);
    mats.forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // -- landmark -----------------------------------------------------------
  const lmx = 1.6 * G, lmz = 0.6 * G;
  const lmBucket: Matrix4[] = [];
  putBox(lmx, 30, lmz, 11, 60, 11, lmBucket);
  putBox(lmx, 60 + 11, lmz, 7.5, 22, 7.5, lmBucket);
  putBox(lmx, 82 + 6, lmz, 4.6, 12, 4.6, lmBucket);
  {
    const inst = new InstancedMesh(box, facadeMats(facades[facades.length - 1]), 3);
    lmBucket.forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
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
  tall.push({ x: lmx, z: lmz, h: 110 });

  // -- signage, street light, beacons (the house voice) --------------------
  const signGeo = new PlaneGeometry(2.2, 9);
  for (let i = 0; i < 150; i++) {
    const color = NEON[Math.floor(rand() * NEON.length)];
    const sgn = new Mesh(signGeo, new MeshBasicMaterial({
      map: signTexture(rand, color), transparent: true, blending: AdditiveBlending,
      fog: false, depthWrite: false, side: DoubleSide,
    }));
    const bx = Math.floor(rand() * 7) - 3;
    const bz = Math.floor(rand() * 7) - 3;
    sgn.position.set(
      bx * G + (rand() < 0.5 ? -1 : 1) * (LOT / 2 + 0.4),
      6 + rand() * 26,
      bz * G + (rand() - 0.5) * LOT,
    );
    sgn.rotation.y = rand() < 0.5 ? Math.PI / 2 : 0;
    scene.add(sgn);
  }
  {
    const pos: number[] = [];
    for (let i = 0; i < 460; i++) {
      const along = (rand() - 0.5) * 2 * EXT;
      const lane = (Math.floor(rand() * 7) - 3) * G + (LOT / 2 + STREET / 2) * (rand() < 0.5 ? 1 : -1);
      if (rand() < 0.5) pos.push(along, 0.4, lane);
      else pos.push(lane, 0.4, along);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    scene.add(new Points(g, new PointsMaterial({ color: '#C8FF00', size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.45 })));
  }
  const beacons: Sprite[] = [];
  for (const t of tall.slice(0, 16)) {
    const s = new Sprite(new SpriteMaterial({ map: glowTexture('#FF2E63'), transparent: true, fog: false, depthWrite: false }));
    s.position.set(t.x, t.h + 1.8, t.z);
    s.scale.set(3.2, 3.2, 1);
    beacons.push(s);
    scene.add(s);
  }

  // -- LIVELY STREETS: rivers of head- and taillights ----------------------
  interface Car { lane: number; laneAxis: 'x' | 'z'; at: number; s: number; v: number }
  const carSet = (n: number, color: string, dir: 1 | -1): { pts: Points; cars: Car[]; arr: Float32Array } => {
    const cars: Car[] = [];
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const laneAxis = rand() < 0.5 ? 'x' : 'z';
      const at = (Math.floor(rand() * 9) - 4) * G + (G / 2) * (rand() < 0.5 ? 1 : -1) * 0 + (LOT / 2 + STREET / 2) * (dir === 1 ? 1 : -1) * 0.4;
      cars.push({ lane: i, laneAxis, at: (Math.floor(rand() * 9) - 4) * G + (dir === 1 ? 1.4 : -1.4) + (LOT / 2 + STREET / 2) * 0, s: (rand() - 0.5) * 2 * EXT, v: (0.22 + rand() * 0.34) * dir });
      void at;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(arr, 3));
    const pts = new Points(g, new PointsMaterial({ color, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false }));
    scene.add(pts);
    return { pts, cars, arr };
  };
  // lanes sit in the street gaps between blocks; two flows per axis
  const flows = [
    carSet(70, '#ffe6c4', 1),   // headlights toward +
    carSet(70, '#ff5040', -1),  // taillights toward −
    carSet(14, '#C8FF00', 1),   // the acid taxis
  ];
  for (const f of flows) {
    for (const car of f.cars) {
      // snap each car's cross-street position onto a real street center
      car.at = (Math.floor(rand() * 8) - 4) * G + G / 2 + (rand() < 0.5 ? 1.4 : -1.4);
    }
  }
  const driveCars = () => {
    for (const f of flows) {
      for (let i = 0; i < f.cars.length; i++) {
        const car = f.cars[i];
        car.s += car.v;
        if (car.s > EXT) car.s = -EXT;
        if (car.s < -EXT) car.s = EXT;
        const j = i * 3;
        if (car.laneAxis === 'x') {
          f.arr[j] = car.s; f.arr[j + 1] = 0.6; f.arr[j + 2] = car.at;
        } else {
          f.arr[j] = car.at; f.arr[j + 1] = 0.6; f.arr[j + 2] = car.s;
        }
      }
      (f.pts.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    }
  };
  driveCars();

  // -- routes ---------------------------------------------------------------
  // TOUR: pulled-out vista over the whole skyline, then the dive and climb
  const route = new CatmullRomCurve3([
    new Vector3(-3.8 * G, 62, 4.9 * G),
    new Vector3(-2.5 * G, 42, 3.3 * G),
    new Vector3(-1.5 * G, 24, 2.4 * G),
    new Vector3(-G / 1.9, 8, 0.6 * G),
    new Vector3(-G / 3, 9, -1.4 * G),
    new Vector3(G / 2, 16, -2.2 * G),
    new Vector3(1.6 * G, 26, -1.6 * G),
    new Vector3(2.2 * G, 44, -0.4 * G),
    new Vector3(2.0 * G, 74, 1.0 * G),
    new Vector3(1.2 * G, 118, 2.2 * G),
  ]);
  // AUTO: an endless closed drift — wide ring, two inner dives
  const autoRoute = new CatmullRomCurve3([
    new Vector3(-3 * G, 40, 0),
    new Vector3(-2 * G, 18, 2.6 * G),
    new Vector3(0.4 * G, 12, 3 * G),
    new Vector3(2.6 * G, 30, 1.6 * G),
    new Vector3(3 * G, 52, -0.8 * G),
    new Vector3(1.2 * G, 20, -2.8 * G),
    new Vector3(-1.4 * G, 10, -2.4 * G),
    new Vector3(-2.8 * G, 26, -1.2 * G),
  ], true, 'catmullrom', 0.9);

  let mode: FlyMode = 'tour';
  let target = 0;
  let sm = 0;
  let autoT = 0.001;
  let tick = 0;
  const keys = new Set<string>();
  const free = { pos: new Vector3(-4.8 * G, 86, 6.2 * G), yaw: 2.5, pitch: -0.25 };
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
    free.pos.x = Math.min(500, Math.max(-500, free.pos.x));
    free.pos.z = Math.min(500, Math.max(-500, free.pos.z));
    camera.position.copy(free.pos);
    camera.lookAt(free.pos.x + fwd.x, free.pos.y + fwd.y, free.pos.z + fwd.z);
  };

  const render = () => {
    if (mode === 'free') {
      applyFree();
    } else if (mode === 'auto') {
      autoT = (autoT + (calm ? 0.00008 : 0.00016)) % 1;
      autoRoute.getPointAt(autoT, pos);
      autoRoute.getPointAt((autoT + 0.02) % 1, look);
      camera.position.copy(pos);
      camera.lookAt(look.x, look.y + 2, look.z);
    } else {
      sm += (target - sm) * (calm ? 0.16 : 0.07);
      const t = Math.min(0.999, Math.max(0, sm)) * 0.985;
      route.getPointAt(t, pos);
      route.getPointAt(Math.min(0.999, t + 0.012), look);
      if (!calm) pos.x += Math.sin(tick * 0.011) * 0.7;
      camera.position.copy(pos);
      // the flight's ends aim at WORLD TARGETS, not the route tangent (the
      // lookahead sits a few units off, so offsets over-pitch): the vista
      // holds the city's heart in frame, the terminus rises to the moon
      let lx = look.x, ly = look.y + 1.2, lz = look.z;
      const vw = Math.max(0, (0.12 - t) / 0.12);
      const tw = Math.max(0, (t - 0.86) / 0.14) * 0.9;
      lx += (10 - lx) * vw; ly += (34 - ly) * vw; lz += (10 - lz) * vw;
      lx += (110 - lx) * tw; ly += (300 - ly) * tw; lz += (460 - lz) * tw;
      camera.lookAt(lx, ly, lz);
    }
    composer.render();
  };

  const fit = () => {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(Math.ceil(w / PIX), Math.ceil(h / PIX), false);
    composer.setSize(Math.ceil(w / PIX), Math.ceil(h / PIX));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
      for (let i = 0; i < clouds.length; i++) clouds[i].position.x += 0.014 * ((i % 3) + 1);
      driveCars(); // the streets never stop
    }
    if (mode !== 'tour' || !calm || Math.abs(target - sm) > 0.0004) render();
  };
  loop();

  return {
    setProgress: (p) => { target = Math.min(1, Math.max(0, p)); },
    setMode: (m) => {
      if (m === 'free' && mode !== 'free') {
        // pick up flight where the current camera is
        free.pos.copy(camera.position);
        fwd.subVectors(look, camera.position).normalize();
        free.yaw = Math.atan2(fwd.x, fwd.z);
        free.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, fwd.y)));
      }
      mode = m;
    },
    look: (dx, dy) => {
      free.yaw -= dx * 0.0034;
      free.pitch = Math.max(-1.35, Math.min(1.35, free.pitch - dy * 0.0034));
    },
    keys,
  };
}
