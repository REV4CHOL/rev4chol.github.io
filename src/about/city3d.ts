/** REVACHOL, TRAVERSABLE — the about page IS the city now (owner decree,
 *  logartis.info model): a dense 3D pixel metropolis under an ethereal
 *  starry night, and the page scroll flies the camera through it. Content
 *  stations fade in at waypoints along the route; between them the city
 *  gets the screen to itself.
 *
 *  The pixel-art law survives the third dimension two ways: the renderer
 *  draws at 1/3 resolution and the canvas upscales with image-rendering:
 *  pixelated (the blow-up IS the aesthetic), and every window/sign is a
 *  hand-pixel canvas texture under NearestFilter. Palette discipline:
 *  field-blue night mass, bone windows, rationed quartet neon — no color
 *  outside the tokens. Density per the reference plates: ~1200 towers in
 *  six instanced draws.
 *
 *  Scroll is NEVER hijacked — the document scrolls natively and the camera
 *  chases progress with a small lerp. Calm mode kills idle motion (twinkle,
 *  beacons, sway) but scroll-driven flight stays: the visitor is driving. */
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color,
  Float32BufferAttribute, FogExp2, InstancedMesh, Matrix4, Mesh,
  MeshBasicMaterial, NearestFilter, Object3D, PerspectiveCamera, PlaneGeometry,
  Points, PointsMaterial, Scene, Sprite, SpriteMaterial, Vector3, WebGLRenderer,
  BoxGeometry, DoubleSide,
} from 'three';
import { reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';

const PIX = 3; // render at 1/PIX resolution — the upscale is the look
const NIGHT = '#070918';
const NEON = ['#C8FF00', '#FF2E63', '#B79CFF'];

function windowTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#07080f';
  x.fillRect(0, 0, 48, 128);
  for (let wy = 4; wy < 124; wy += 7) {
    for (let wx = 4; wx < 44; wx += 6) {
      if (rand() < 0.34) {
        const roll = rand();
        x.fillStyle = roll < 0.66 ? 'rgba(237,237,230,0.85)' : roll < 0.82 ? '#C8FF00' : roll < 0.94 ? '#B79CFF' : '#FF2E63';
        x.globalAlpha = 0.35 + rand() * 0.65;
        x.fillRect(wx, wy, 3, 4);
      }
    }
  }
  x.globalAlpha = 1;
  const t = new CanvasTexture(c);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  return t;
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
  const t = new CanvasTexture(c);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  return t;
}

function glowTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
}

function nebulaTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 26; i++) {
    const gx = rand() * 512, gy = rand() * 256, r = 30 + rand() * 90;
    const g = x.createRadialGradient(gx, gy, 1, gx, gy, r);
    const col = rand() < 0.55 ? '36,24,255' : '183,156,255';
    g.addColorStop(0, `rgba(${col},${0.05 + rand() * 0.07})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 256);
  }
  return new CanvasTexture(c);
}

export interface CityRide { setProgress(p: number): void }

export function mountCity3D(canvas: HTMLCanvasElement, seed: number): CityRide {
  const rand = mulberry32(seed);
  const calm = reducedMotion();
  const scene = new Scene();
  scene.background = new Color(NIGHT);
  scene.fog = new FogExp2('#0a0d26', 0.011);

  const camera = new PerspectiveCamera(58, 1, 0.1, 700);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);

  // -- the ethereal night: stars in two twinkling shells + a nebula veil --
  const starShell = (n: number, r0: number): Points => {
    const pos: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const y = rand() * 0.9 + 0.06; // keep them above the skyline
      const r = r0 + rand() * 90;
      pos.push(Math.cos(a) * r, y * r, Math.sin(a) * r);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    const m = new PointsMaterial({ color: '#EDEDE6', size: 1.6, sizeAttenuation: false, transparent: true, fog: false });
    return new Points(g, m);
  };
  const starsA = starShell(700, 260);
  const starsB = starShell(500, 320);
  scene.add(starsA, starsB);
  const nebula = new Mesh(
    new PlaneGeometry(1300, 620),
    new MeshBasicMaterial({ map: nebulaTexture(rand), transparent: true, fog: false, depthWrite: false }),
  );
  nebula.position.set(0, 170, -420);
  scene.add(nebula);

  // -- the ground: near-void, with street lights sprinkled along the way --
  const ground = new Mesh(new PlaneGeometry(1200, 1200), new MeshBasicMaterial({ color: '#05050c' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // -- the city: dense instanced towers on a street grid ------------------
  const LOT = 13, STREET = 7, HALF = 10; // 21×21 blocks
  const tiers = [windowTexture(rand), windowTexture(rand), windowTexture(rand), windowTexture(rand), windowTexture(rand), windowTexture(rand)];
  const perTex: Matrix4[][] = tiers.map(() => []);
  const dummy = new Object3D();
  const tall: { x: number; z: number; h: number }[] = [];
  for (let bx = -HALF; bx <= HALF; bx++) {
    for (let bz = -HALF; bz <= HALF; bz++) {
      const cx = bx * (LOT + STREET);
      const cz = bz * (LOT + STREET);
      if (Math.abs(bx) < 1 && Math.abs(bz) < 1) continue; // the central plaza stays open
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const w = 4 + rand() * 6;
        const d = 4 + rand() * 6;
        const centerPull = 1 - Math.min(1, (Math.abs(bx) + Math.abs(bz)) / (HALF * 1.6));
        const h = 6 + rand() * 30 + centerPull * rand() * 34;
        const x = cx + (rand() - 0.5) * (LOT - w);
        const z = cz + (rand() - 0.5) * (LOT - d);
        dummy.position.set(x, h / 2, z);
        dummy.scale.set(w, h, d);
        dummy.rotation.y = 0;
        dummy.updateMatrix();
        perTex[Math.floor(rand() * tiers.length)].push(dummy.matrix.clone());
        if (h > 52) tall.push({ x, z, h });
      }
    }
  }
  const box = new BoxGeometry(1, 1, 1);
  for (let i = 0; i < tiers.length; i++) {
    const mat = new MeshBasicMaterial({ map: tiers[i] });
    const inst = new InstancedMesh(box, mat, perTex[i].length);
    perTex[i].forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // -- neon signage riding the towers, dense near the route ---------------
  const signGeo = new PlaneGeometry(2.2, 9);
  for (let i = 0; i < 130; i++) {
    const color = NEON[Math.floor(rand() * NEON.length)];
    const m = new MeshBasicMaterial({
      map: signTexture(rand, color), transparent: true, blending: AdditiveBlending,
      fog: false, depthWrite: false, side: DoubleSide,
    });
    const sgn = new Mesh(signGeo, m);
    const bx = Math.floor(rand() * 7) - 3;
    const bz = Math.floor(rand() * 7) - 3;
    sgn.position.set(
      bx * (LOT + STREET) + (rand() < 0.5 ? -1 : 1) * (LOT / 2 + 0.4),
      6 + rand() * 26,
      bz * (LOT + STREET) + (rand() - 0.5) * LOT,
    );
    sgn.rotation.y = rand() < 0.5 ? Math.PI / 2 : 0;
    scene.add(sgn);
  }
  // street lights: tiny bone dots low along the avenues
  {
    const pos: number[] = [];
    for (let i = 0; i < 420; i++) {
      const along = (rand() - 0.5) * 2 * HALF * (LOT + STREET);
      const lane = (Math.floor(rand() * 7) - 3) * (LOT + STREET) + (LOT / 2 + STREET / 2) * (rand() < 0.5 ? 1 : -1);
      if (rand() < 0.5) pos.push(along, 0.4, lane);
      else pos.push(lane, 0.4, along);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    scene.add(new Points(g, new PointsMaterial({ color: '#C8FF00', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.5 })));
  }
  // aircraft beacons on the tallest towers
  const beaconMat = new SpriteMaterial({ map: glowTexture('#FF2E63'), transparent: true, fog: false, depthWrite: false });
  const beacons: Sprite[] = [];
  for (const t of tall.slice(0, 14)) {
    const s = new Sprite(beaconMat.clone() as SpriteMaterial);
    s.position.set(t.x, t.h + 1.6, t.z);
    s.scale.set(3.4, 3.4, 1);
    beacons.push(s);
    scene.add(s);
  }

  // -- the route: vista → dive → canyon cruise → climb → into the stars ---
  const G = LOT + STREET;
  const route = new CatmullRomCurve3([
    new Vector3(-2.5 * G, 64, 3.8 * G),
    new Vector3(-1.5 * G, 34, 2.6 * G),
    new Vector3(-G / 1.9, 11, 1.6 * G),
    new Vector3(-G / 1.9, 8, 0),          // street canyon
    new Vector3(-G / 3, 9, -1.4 * G),
    new Vector3(G / 2, 16, -2.2 * G),     // the turn
    new Vector3(1.6 * G, 26, -1.6 * G),
    new Vector3(2.2 * G, 44, -0.4 * G),   // rooftop plaza
    new Vector3(2.0 * G, 74, 1.0 * G),
    new Vector3(1.2 * G, 118, 2.2 * G),   // up into the night
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
      (starsA.material as PointsMaterial).opacity = 0.75 + Math.sin(tick * 0.05) * 0.25;
      (starsB.material as PointsMaterial).opacity = 0.6 + Math.cos(tick * 0.033) * 0.3;
      for (let i = 0; i < beacons.length; i++) {
        (beacons[i].material as SpriteMaterial).opacity = ((tick >> 4) + i) % 2 ? 0.95 : 0.12;
      }
    }
    // skip redraws only when the camera has settled and nothing animates
    if (!calm || Math.abs(target - sm) > 0.0004) render();
  };
  loop();

  return { setProgress: (p) => { target = Math.min(1, Math.max(0, p)); } };
}
