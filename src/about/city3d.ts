/** REVACHOL, TRAVERSABLE — the about page IS the city (owner decree,
 *  logartis.info model), now DETAILED to the reference plate: fine pixel
 *  facades with sodium-warm windows, tiered towers with rooftop furniture
 *  and antennas, a lit landmark crown, dithered clouds under a crescent
 *  moon, a pink horizon haze over a distant low city. The reference's
 *  palette owns the CITY (warm amber windows on cold indigo mass, cyan and
 *  pink accents); the house quartet keeps the VOICE (signage, beacons,
 *  street light — the site's neon speaks acid over the borrowed night).
 *
 *  Pixel law: the renderer draws at 1/2 resolution upscaled with
 *  image-rendering: pixelated, and every facade/cloud/crown is a hand-pixel
 *  canvas under NearestFilter. Scroll is never hijacked — the camera chases
 *  the page's native scroll with a small lerp. Calm mode stills the idle
 *  motion (twinkle, beacons, cloud drift, sway); the visitor still flies. */
import {
  AdditiveBlending, BackSide, BufferGeometry, CanvasTexture, CatmullRomCurve3,
  Float32BufferAttribute, FogExp2, InstancedMesh, Matrix4, Mesh,
  MeshBasicMaterial, NearestFilter, Object3D, PerspectiveCamera, PlaneGeometry,
  Points, PointsMaterial, Scene, SphereGeometry, Sprite, SpriteMaterial,
  SRGBColorSpace, Vector3, WebGLRenderer, BoxGeometry, DoubleSide,
} from 'three';
import { reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';

const PIX = 2; // 1/2-res render — finer grain than v1, still visibly pixel
// the reference's window light: sodium warm dominant, cyan/pink/lavender rare
const WARM = ['#ff9a4d', '#ffb36b', '#ff7a35', '#e8722e', '#ffd9a0'];
const COOL = ['#7de8ff', '#ff5e7a', '#b79cff'];
const NEON = ['#C8FF00', '#FF2E63', '#B79CFF']; // the house voice, unchanged

const pick = (rand: () => number, arr: string[]) => arr[Math.floor(rand() * arr.length)];
const windowColor = (rand: () => number) => (rand() < 0.82 ? pick(rand, WARM) : pick(rand, COOL));

/** Every hand-pixel canvas is authored in sRGB — mark it so, or the renderer
 *  treats the values as linear and gamma-lifts the whole city into a grey
 *  wash (measured: near-black facades rendering slate). */
function asPixelTex(t: CanvasTexture): CanvasTexture {
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  return t;
}

/** A facade: floors of 3×3 windows in 5px cells; each floor rolls a mood —
 *  dark, sparse, busy, or fully lit (the reference's striped floors). */
function facadeTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = rand() < 0.5 ? '#0a0a16' : '#0c0d1d';
  x.fillRect(0, 0, 64, 256);
  // an elevator core: a dark vertical band some towers carry
  const core = rand() < 0.35 ? 8 + Math.floor(rand() * 40) : -99;
  // the reference's law: buildings are DARK MASS first — most windows sleep,
  // and whole towers run dim; the lit floors are the exception that reads
  const dim = 0.5 + rand() * 0.5;
  for (let fy = 4; fy < 250; fy += 5) {
    const mood = rand();
    const p = (mood < 0.34 ? 0.012 : mood < 0.76 ? 0.07 : mood < 0.95 ? 0.2 : 0.75) * dim;
    const floorColor = rand() < 0.25 ? windowColor(rand) : null; // some floors share one tenant
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
  for (let i = 0; i < 90; i++) {
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

/** Dithered pixel clouds — blue-grey slabs, lighter on top, checker edges. */
function cloudTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 40;
  const x = c.getContext('2d')!;
  const blobs = 4 + Math.floor(rand() * 4);
  for (let b = 0; b < blobs; b++) {
    const bx = 10 + rand() * 100, by = 14 + rand() * 16, bw = 22 + rand() * 46, bh = 6 + rand() * 10;
    x.fillStyle = '#303763';
    x.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
    x.fillStyle = '#5a639e';
    x.fillRect(bx - bw / 2, by - bh / 2, bw, 2);
    // checker dither along the underside and ends
    x.fillStyle = '#303763';
    for (let dx = 0; dx < bw; dx += 4) {
      x.fillRect(bx - bw / 2 + dx + (Math.floor(by) % 2 ? 2 : 0), by + bh / 2, 2, 2);
      x.fillRect(bx - bw / 2 + dx + (Math.floor(bx) % 2 ? 0 : 2), by - bh / 2 - 2, 2, 2);
    }
  }
  return asPixelTex(new CanvasTexture(c));
}

/** The far ring: a distant low city under a pink haze, drawn once. */
function horizonTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(150,90,170,0.14)');
  g.addColorStop(0.82, 'rgba(215,127,180,0.4)');
  g.addColorStop(1, 'rgba(240,170,200,0.55)');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 96);
  // the low city: dense warm specks on the last rows
  for (let i = 0; i < 2600; i++) {
    const sy = 78 + rand() * 17;
    x.fillStyle = rand() < 0.8 ? pick(rand, WARM) : pick(rand, COOL);
    x.globalAlpha = 0.25 + rand() * 0.6;
    x.fillRect(Math.floor(rand() * 1024), Math.floor(sy), 1, 1);
  }
  // a few distant slab silhouettes
  x.globalAlpha = 1;
  for (let i = 0; i < 40; i++) {
    x.fillStyle = '#161233';
    const w = 6 + rand() * 22, h = 6 + rand() * 16;
    x.fillRect(rand() * 1024, 96 - h, w, h);
  }
  return asPixelTex(new CanvasTexture(c));
}

function skyTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#020207');
  g.addColorStop(0.5, '#04051a');
  g.addColorStop(0.82, '#0a0b28');
  g.addColorStop(1, '#181242');
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  return asPixelTex(new CanvasTexture(c));
}

export interface CityRide { setProgress(p: number): void }

export function mountCity3D(canvas: HTMLCanvasElement, seed: number): CityRide {
  const rand = mulberry32(seed);
  const calm = reducedMotion();
  const scene = new Scene();
  scene.fog = new FogExp2('#0d0b2a', 0.0075);

  const camera = new PerspectiveCamera(58, 1, 0.1, 900);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);

  // -- the ethereal night --------------------------------------------------
  scene.add(new Mesh(
    new SphereGeometry(760, 16, 12),
    new MeshBasicMaterial({ map: skyTexture(), side: BackSide, fog: false, depthWrite: false }),
  ));
  const starShell = (n: number, size: number, tint: string): Points => {
    const pos: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const y = rand() * 0.92 + 0.05;
      const r = 380 + rand() * 260;
      pos.push(Math.cos(a) * r, y * r * 0.8, Math.sin(a) * r);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return new Points(g, new PointsMaterial({ color: tint, size, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
  };
  const starsA = starShell(1500, 1.4, '#EDEDE6');
  const starsB = starShell(700, 2.2, '#cfe6ff');
  const starsC = starShell(260, 1.4, '#ffd9a0');
  scene.add(starsA, starsB, starsC);

  // the moon waits at the END of the flight — the ascent rises to meet it
  const moon = new Sprite(new SpriteMaterial({ map: moonTexture(), transparent: true, fog: false, depthWrite: false }));
  moon.position.set(150, 290, 430);
  moon.scale.set(30, 30, 1);
  scene.add(moon);

  const clouds: Sprite[] = [];
  for (let i = 0; i < 10; i++) {
    const s = new Sprite(new SpriteMaterial({
      map: cloudTexture(rand), transparent: true, opacity: 0.55 + rand() * 0.3, fog: false, depthWrite: false,
    }));
    // biased into the +z sky, where the vista opens and the ascent ends
    const a = rand() < 0.7 ? rand() * Math.PI : rand() * Math.PI * 2;
    const r = 300 + rand() * 220;
    s.position.set(Math.cos(a) * r, 120 + rand() * 170, Math.sin(a) * r);
    s.scale.set(150 + rand() * 130, 46 + rand() * 24, 1);
    clouds.push(s);
    scene.add(s);
  }

  // the pink haze + distant low city, wrapped around everything
  const horizon = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: horizonTexture(rand), transparent: true, fog: false, depthWrite: false, side: DoubleSide }),
  );
  // four billboards make the ring (cheap, and the seams hide in the fog)
  for (let i = 0; i < 4; i++) {
    const h = horizon.clone();
    const a = (i / 4) * Math.PI * 2;
    h.position.set(Math.cos(a) * 420, 34, Math.sin(a) * 420);
    h.scale.set(900, 96, 1);
    h.lookAt(0, 34, 0);
    scene.add(h);
  }

  const ground = new Mesh(new PlaneGeometry(1600, 1600), new MeshBasicMaterial({ color: '#04040a' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // -- the city: tiered towers, dense facades, roof furniture -------------
  const LOT = 13, STREET = 7, HALF = 11;
  const G = LOT + STREET;
  const facades = Array.from({ length: 12 }, () => facadeTexture(rand));
  const perTex: Matrix4[][] = facades.map(() => []);
  const roofBits: Matrix4[] = [];
  const antennaBits: Matrix4[] = [];
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
      if (Math.abs(bx) < 1 && Math.abs(bz) < 1) continue; // the plaza stays open
      const cx = bx * G, cz = bz * G;
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const w = 4 + rand() * 6;
        const d = 4 + rand() * 6;
        const centerPull = 1 - Math.min(1, (Math.abs(bx) + Math.abs(bz)) / (HALF * 1.5));
        const h = 6 + rand() * 26 + centerPull * rand() * 40;
        const x = cx + (rand() - 0.5) * (LOT - w);
        const z = cz + (rand() - 0.5) * (LOT - d);
        const bucket = perTex[Math.floor(rand() * facades.length)];
        putBox(x, h / 2, z, w, h, d, bucket);
        // tiered massing on the tall ones — the reference's setbacks
        if (h > 30) {
          putBox(x, h + (h * 0.28) / 2, z, w * 0.66, h * 0.28, d * 0.66, perTex[Math.floor(rand() * facades.length)]);
          if (h > 44) putBox(x, h * 1.28 + (h * 0.16) / 2, z, w * 0.38, h * 0.16, d * 0.38, perTex[Math.floor(rand() * facades.length)]);
          tall.push({ x, z, h: h * (h > 44 ? 1.44 : 1.28) });
        }
        // rooftop furniture: water tanks, boxes — the bumpy roofline
        const bits = 1 + Math.floor(rand() * 2);
        for (let rb = 0; rb < bits; rb++) {
          putBox(
            x + (rand() - 0.5) * w * 0.5, h + 0.7, z + (rand() - 0.5) * d * 0.5,
            0.8 + rand() * 1.4, 1.4, 0.8 + rand() * 1.4, roofBits,
          );
        }
        if (rand() < 0.16) putBox(x + (rand() - 0.5) * w * 0.4, h + 2.4, z + (rand() - 0.5) * d * 0.4, 0.22, 4.8, 0.22, antennaBits);
      }
    }
  }
  const box = new BoxGeometry(1, 1, 1);
  const dark = new MeshBasicMaterial({ color: '#08080f' });
  // windows live on the WALLS only — a textured roof reads as confetti from
  // the air (box UVs paint every face; +y/-y get the dark slab instead)
  const facadeMats = (m: MeshBasicMaterial) => [m, m, dark, dark, m, m];
  for (let i = 0; i < facades.length; i++) {
    const inst = new InstancedMesh(box, facadeMats(new MeshBasicMaterial({ map: facades[i] })), perTex[i].length);
    perTex[i].forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
  for (const [bits] of [[roofBits], [antennaBits]] as Matrix4[][][]) {
    const inst = new InstancedMesh(box, dark, bits.length);
    bits.forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // -- the LANDMARK: tiered spire with a lit crown (the reference's tower) --
  const lmx = 1.6 * G, lmz = 0.6 * G;
  const lmTex = perTex.length - 1;
  putBox(lmx, 30, lmz, 11, 60, 11, perTex[lmTex]);
  putBox(lmx, 60 + 11, lmz, 7.5, 22, 7.5, perTex[lmTex]);
  putBox(lmx, 82 + 6, lmz, 4.6, 12, 4.6, perTex[lmTex]);
  {
    const inst = new InstancedMesh(box, facadeMats(new MeshBasicMaterial({ map: facades[lmTex] })), 3);
    perTex[lmTex].slice(-3).forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
  const crown = new Mesh(new BoxGeometry(5.2, 3.2, 5.2), new MeshBasicMaterial({ map: crownTexture(), fog: false }));
  crown.position.set(lmx, 95.6, lmz);
  scene.add(crown);
  const spire = new Mesh(new BoxGeometry(0.5, 14, 0.5), new MeshBasicMaterial({ color: '#9fb7d8' }));
  spire.position.set(lmx, 104, lmz);
  scene.add(spire);
  tall.push({ x: lmx, z: lmz, h: 110 });

  // -- the house voice: signs, cornices, street light, beacons -------------
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
  // lit cornices — thin cyan/pink edge strips on nearer rooflines
  const cornGeo = new PlaneGeometry(1, 0.34);
  for (let i = 0; i < 46; i++) {
    const t = tall[Math.floor(rand() * tall.length)];
    if (!t) break;
    const m = new Mesh(cornGeo, new MeshBasicMaterial({
      color: rand() < 0.55 ? '#7de8ff' : '#ff5e7a', transparent: true, opacity: 0.85,
      blending: AdditiveBlending, fog: false, depthWrite: false, side: DoubleSide,
    }));
    m.position.set(t.x, t.h * (0.55 + rand() * 0.4), t.z + 3.2);
    m.scale.x = 3 + rand() * 4;
    if (rand() < 0.5) { m.rotation.y = Math.PI / 2; m.position.x += 3.2; m.position.z -= 3.2; }
    scene.add(m);
  }
  {
    const pos: number[] = [];
    for (let i = 0; i < 460; i++) {
      const along = (rand() - 0.5) * 2 * HALF * G;
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

  // -- the route: vista → dive → canyon → turn → rooftops → into the stars --
  const route = new CatmullRomCurve3([
    new Vector3(-2.5 * G, 64, 3.8 * G),
    new Vector3(-1.5 * G, 34, 2.6 * G),
    new Vector3(-G / 1.9, 11, 1.6 * G),
    new Vector3(-G / 1.9, 8, 0),
    new Vector3(-G / 3, 9, -1.4 * G),
    new Vector3(G / 2, 16, -2.2 * G),
    new Vector3(1.6 * G, 26, -1.6 * G),
    new Vector3(2.2 * G, 44, -0.4 * G),
    new Vector3(2.0 * G, 74, 1.0 * G),
    new Vector3(1.2 * G, 118, 2.2 * G),
  ]);

  let target = 0;
  let sm = 0;
  let tick = 0;
  const pos = new Vector3();
  const look = new Vector3();
  const render = () => {
    sm += (target - sm) * (calm ? 0.16 : 0.07);
    const t = Math.min(0.999, Math.max(0, sm)) * 0.985;
    route.getPointAt(t, pos);
    route.getPointAt(Math.min(0.999, t + 0.012), look);
    if (!calm) pos.x += Math.sin(tick * 0.011) * 0.7;
    camera.position.copy(pos);
    camera.lookAt(look.x, look.y + 1.2, look.z);
    renderer.render(scene, camera);
  };

  const fit = () => {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(Math.ceil(w / PIX), Math.ceil(h / PIX), false);
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
    }
    if (!calm || Math.abs(target - sm) > 0.0004) render();
  };
  loop();

  return { setProgress: (p) => { target = Math.min(1, Math.max(0, p)); } };
}
