/** THE CUB ON THE FLOOR (owner, 2026-10-20: "here's my teddy bear cub design sheet. Make me a giant 3D teddy bear
 *  model exactly on this in the work section (PC and tablet), watching over the panes and being cute. Be sure to give
 *  the bear idle animations. Users can also pet this bear when clicking on him").
 *
 *  He is the owner's own bear: a body carved from the sheet's four photographs, wearing the photographs themselves as
 *  his skin (scripts/bear/build.py made public/content/bear/). He is drawn from the three-quarter photograph's own
 *  angle, so at rest he IS that photograph; the rig (works/bear-rig.ts) bends him and his mind (works/bear-motion.ts)
 *  says how. Each point of him takes its colour from the photographs that saw it, weighted per vertex at build time.
 *
 *  On the page he sits bottom left over the floor (works/bear-layout.ts), turned toward the films, a canvas of his own
 *  above the floor's and under its chrome. He is solid to the pointer: over him, the floor lets its pane go and the
 *  cursor says PET HIM ▸; a press pets him (it opens no film and starts no drag); a drag across him strokes him; a
 *  wheel over him still zooms the floor. His canvas takes the pointer only while it is on him — over his empty
 *  corners the floor keeps it.
 *
 *  Never on a phone (the reel has no floor). The list stands over him: he rests. A hidden tab stops him. CALM sits
 *  him still. The quality tier sets his resolution and his frame rate. */
import {
  Bone, BufferAttribute, BufferGeometry, Color, Group, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial,
  Skeleton, SkinnedMesh, SRGBColorSpace, TextureLoader, Vector3, Vector4, WebGLRenderer,
} from 'three';
import type { Texture } from 'three';
import { finePointer, reducedMotion } from '../lib/env';
import { posterZoom } from '../lib/poster-lock';
import { quality } from '../lib/quality';
import { sound } from '../lib/sound';
import { setCursorLabel } from '../shell/cursor';
import { cubBox, type Rect } from './bear-layout';
import { CubBrain, type CubEvent, type Pose, type Reaction } from './bear-motion';
import { BONE, BONES, proxies, skin } from './bear-rig';

export interface CubHooks {
  /** the film awake under the pointer: where its middle stands on the screen (viewport px) and its accent */
  awake(): { x: number; y: number; accent: string } | null;
}
export interface Cub {
  /** the list stands over the floor (true): he rests and hides; false: back */
  park(on: boolean): void;
  react(kind: Reaction): void;
}

type Cam5 = [number, number, number, number, number];
interface Views {
  cams: Record<string, Cam5>;
  atlas: { w: number; h: number; tiles: Record<string, { x: number; y: number; w: number; h: number; cropX: number; cropY: number }> };
  views: { cam: string; tile: string; mirror: boolean; primary: boolean }[];
  marks: { eyes: { at: [number, number, number]; r: number }[]; camUp: [number, number, number]; camRight: [number, number, number] };
}

const BASE = '/content/bear';
/** The height the camera aims at, his own units (the build fitted the photographs about it). */
const AIM = 0.45;
export const CUB_LABEL = 'PET HIM ▸';

/** His body: the build's binary (positions quantised, triangles, the photographs' weights per vertex). */
export function decodeBody(buf: ArrayBuffer): { pos: Float32Array; idx: Uint16Array; wts: Uint8Array; nw: number } {
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'RVLB') throw new Error('not a cub');
  const nv = dv.getUint32(8, true), ni = dv.getUint32(12, true), nw = dv.getUint32(16, true);
  const lo = [0, 1, 2].map((k) => dv.getFloat32(20 + k * 4, true)), hi = [0, 1, 2].map((k) => dv.getFloat32(32 + k * 4, true));
  const q = new Uint16Array(buf, 44, nv * 3);
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) pos[i] = lo[i % 3] + (q[i] / 65535) * (hi[i % 3] - lo[i % 3]);
  const idx = new Uint16Array(buf, 44 + nv * 6, ni);
  const wts = new Uint8Array(buf, 44 + nv * 6 + ni * 2, nv * nw);
  return { pos, idx, wts, nw };
}

/** A photograph's projection as two rows: rest position → its tile's (u, v), 0 → 1 across the tile. */
function rows(v: Views, cam: string, tile: string): { U: Vector4; V: Vector4; rect: Vector4 } {
  const [psi, phi, s, ox, oy] = v.cams[cam];
  const t = v.atlas.tiles[tile];
  const cs = Math.cos(psi), sn = Math.sin(psi), cp = Math.cos(phi), sp = Math.sin(phi);
  // crop px = ox + s (cs x + sn z); crop py = oy − s (cp y − sp (−sn x + cs z))
  const U = new Vector4((s * cs) / t.w, 0, (s * sn) / t.w, (ox - t.cropX) / t.w);
  const V = new Vector4((-s * sp * sn) / t.h, (-s * cp) / t.h, (s * sp * cs) / t.h, (oy - t.cropY) / t.h);
  return { U, V, rect: new Vector4(t.x / v.atlas.w, t.y / v.atlas.h, t.w / v.atlas.w, t.h / v.atlas.h) };
}

const VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec3 aRest;
attribute vec3 aRestN;
attribute vec4 aWa;
attribute vec2 aWb;
varying vec3 vRest;
varying vec4 vWa;
varying vec2 vWb;
varying vec3 vN;
varying vec3 vN0;
varying vec3 vView;
void main() {
  vRest = aRest; vWa = aWa; vWb = aWb;
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vN = normalize(normalMatrix * objectNormal);
  vN0 = normalize(normalMatrix * aRestN);
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const frag = (n: number, primary: number) => /* glsl */ `
uniform sampler2D uSkin;
uniform vec4 uU[${n}];
uniform vec4 uV[${n}];
uniform vec4 uRect[${n}];
uniform float uMir[${n}];
uniform vec3 uPlush;
uniform float uHappy;
uniform float uDozy;
uniform vec3 uEye[2];
uniform float uEyeR;
uniform vec3 uUp;
uniform vec3 uRight;
uniform vec3 uThread;
uniform vec3 uBlush;
uniform vec3 uRim;
uniform float uRimK;
uniform vec3 uLight;
varying vec3 vRest;
varying vec4 vWa;
varying vec2 vWb;
varying vec3 vN;
varying vec3 vN0;
varying vec3 vView;
vec4 photo(int k, vec3 p) {
  vec4 P = vec4(p * vec3(uMir[k], 1.0, 1.0), 1.0);
  vec2 t = clamp(vec2(dot(uU[k], P), dot(uV[k], P)), 0.0, 1.0);
  return texture2D(uSkin, uRect[k].xy + t * uRect[k].zw);
}
void main() {
  float wk[6];
  wk[0] = vWa.x; wk[1] = vWa.y; wk[2] = vWa.z; wk[3] = vWa.w; wk[4] = vWb.x; wk[5] = vWb.y;
  vec3 acc = vec3(0.0);
  float ws = 0.0;
  for (int k = 0; k < ${n}; k++) {
    float w = wk[k];
    if (w <= 0.002) continue;
    vec4 c = photo(k, vRest);
    if (k != ${primary}) w *= smoothstep(0.4, 0.9, c.a); // (the primary's backdrop is filled with its own edge colours)
    acc += c.rgb * w;
    ws += w;
  }
  vec3 col = ws > 1e-3 ? acc / ws : uPlush;
  // the happy face (and the dozing one): each bead hidden under the knit just above it, a stitched eye in its place,
  // ^ when happy, a sleepy curve when he nods off; the cheeks blush when he is petted
  float shut = max(uHappy, smoothstep(0.45, 0.9, uDozy));
  if (shut > 0.004) {
    for (int e = 0; e < 2; e++) {
      vec3 d = vRest - uEye[e];
      vec2 q = vec2(dot(d, uRight), dot(d, uUp)) / uEyeR;
      float r = length(q);
      if (r < 1.7) {
        vec3 above = photo(${primary}, vRest + uUp * uEyeR * 2.4).rgb;
        col = mix(col, above, shut * (1.0 - smoothstep(1.1, 1.55, r)));
        float happyShare = uHappy / max(shut, 1e-3);
        float arch = abs(length(q - vec2(0.0, -0.6)) - 0.95) * step(-0.3, q.y);
        float sleepy = abs(length(q - vec2(0.0, 1.05)) - 1.05) * step(q.y, 0.25) + step(0.92, abs(q.x));
        float dist = mix(sleepy, arch, step(0.5, happyShare));
        col = mix(col, uThread, shut * (1.0 - smoothstep(0.13, 0.24, dist)));
      }
      vec3 cheek = uEye[e] - uUp * uEyeR * 2.1 + uRight * uEyeR * (e == 0 ? -1.1 : 1.1);
      vec3 dc = vRest - cheek;
      vec2 qc = vec2(dot(dc, uRight), dot(dc, uUp)) / uEyeR;
      col = mix(col, uBlush, uHappy * 0.42 * (1.0 - smoothstep(0.6, 1.9, length(qc * vec2(0.85, 1.25)))));
    }
  }
  // the photographs' own light stays where it fell; a part that turns catches a little more or less of it
  float shade = 1.0 + 0.5 * (dot(normalize(vN), uLight) - dot(normalize(vN0), uLight));
  col *= clamp(shade, 0.72, 1.28);
  // the film he is watching glows on his edges
  float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0), 2.4);
  col += uRim * fres * uRimK;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** A soft round shadow on the floor under him. */
const SHADOW_FRAG = /* glsl */ `
uniform float uK;
varying vec2 vUv;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  gl_FragColor = vec4(0.0, 0.0, 0.0, uK * (1.0 - smoothstep(0.15, 1.0, r)) * 0.62);
}`;

/** Fetch his files and put him on the floor. Null (no cub) if WebGL or his files fail: the floor never waits on him. */
export async function mountCub(hooks: CubHooks): Promise<Cub | null> {
  let views: Views, body: ReturnType<typeof decodeBody>, skinTex: Texture;
  try {
    const loader = new TextureLoader();
    const [v, b, t] = await Promise.all([
      fetch(`${BASE}/cub-views.json`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Views>; }),
      fetch(`${BASE}/cub-body.bin`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); }),
      loader.loadAsync(`${BASE}/cub-skin.webp`),
    ]);
    views = v; body = decodeBody(b); skinTex = t;
  } catch {
    return null;
  }

  const root = document.createElement('div');
  root.id = 'cub';
  root.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'cub-gl';
  const fx = document.createElement('div');
  fx.className = 'cub-fx';
  root.append(canvas, fx);
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'default' });
  } catch {
    return null;
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  document.body.append(root);

  // ---------------------------------------------------------------------------------------------- his body --
  const nv = body.pos.length / 3;
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(body.pos, 3));
  geo.setIndex(new BufferAttribute(body.idx, 1));
  geo.computeVertexNormals();
  geo.setAttribute('aRest', new BufferAttribute(body.pos.slice(), 3));
  geo.setAttribute('aRestN', new BufferAttribute((geo.getAttribute('normal').array as Float32Array).slice(), 3));
  const wa = new Float32Array(nv * 4), wb = new Float32Array(nv * 2);
  for (let i = 0; i < nv; i++) {
    for (let k = 0; k < 4; k++) wa[i * 4 + k] = body.wts[i * body.nw + k] / 255;
    for (let k = 0; k < 2; k++) wb[i * 2 + k] = body.wts[i * body.nw + 4 + k] / 255;
  }
  geo.setAttribute('aWa', new BufferAttribute(wa, 4));
  geo.setAttribute('aWb', new BufferAttribute(wb, 2));
  const sk = skin(body.pos);
  geo.setAttribute('skinIndex', new BufferAttribute(sk.index, 4));
  geo.setAttribute('skinWeight', new BufferAttribute(sk.weight, 4));

  skinTex.flipY = false;
  skinTex.colorSpace = SRGBColorSpace;
  skinTex.needsUpdate = true;
  const vrows = views.views.map((v) => ({ ...rows(views, v.cam, v.tile), mir: v.mirror ? -1 : 1 }));
  const primary = views.views.findIndex((v) => v.primary);
  const eyes = views.marks.eyes;
  const lin = (c: string) => new Color(c);
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: frag(vrows.length, primary),
    uniforms: {
      uSkin: { value: skinTex },
      uU: { value: vrows.map((r) => r.U) }, uV: { value: vrows.map((r) => r.V) }, uRect: { value: vrows.map((r) => r.rect) },
      uMir: { value: vrows.map((r) => r.mir) },
      uPlush: { value: lin('#e9dcc2') },
      uHappy: { value: 0 }, uDozy: { value: 0 },
      uEye: { value: eyes.map((e) => new Vector3(...e.at)) },
      uEyeR: { value: Math.max(...eyes.map((e) => e.r)) },
      uUp: { value: new Vector3(...views.marks.camUp) }, uRight: { value: new Vector3(...views.marks.camRight) },
      uThread: { value: lin('#2b1d2a') }, uBlush: { value: lin('#ff9db0') },
      uRim: { value: new Color(0, 0, 0) }, uRimK: { value: 0 },
      uLight: { value: new Vector3(-0.45, 0.6, 0.66).normalize() },
    },
  });

  const bones = BONES.map((b) => { const o = new Bone(); o.name = b.name; return o; });
  BONES.forEach((b, i) => {
    const p = b.parent >= 0 ? BONES[b.parent].at : [0, 0, 0];
    bones[i].position.set(b.at[0] - p[0], b.at[1] - p[1], b.at[2] - p[2]);
    if (b.parent >= 0) bones[b.parent].add(bones[i]);
  });
  bones[BONE.head].rotation.order = 'YXZ';
  const cub = new SkinnedMesh(geo, mat);
  cub.frustumCulled = false;
  cub.add(bones[0]);
  const stage = new Group();
  stage.rotation.y = views.cams.threeq[0]; // (the three-quarter photograph's turn: at rest he is that photograph)
  stage.add(cub);
  const shadowMat = new ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uK: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: SHADOW_FRAG,
  });
  const shadow = new Mesh(new PlaneGeometry(0.78, 0.66), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.02, 0.001, -0.02);
  shadow.renderOrder = -1;
  stage.add(shadow);
  const scene = new Scene();
  scene.add(stage);
  stage.updateMatrixWorld(true);
  cub.bind(new Skeleton(bones));

  // the camera: the three-quarter photograph's own (orthographic, looking down by its pitch), framed on his body
  const phi = views.cams.threeq[1];
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.set(0, AIM + 6 * Math.sin(phi), 6 * Math.cos(phi));
  camera.lookAt(0, AIM, 0);
  camera.updateMatrixWorld(true);
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const tmp = new Vector3();
  for (let i = 0; i < nv; i += 3) {
    tmp.set(body.pos[i * 3], body.pos[i * 3 + 1], body.pos[i * 3 + 2]).applyMatrix4(stage.matrixWorld).sub(new Vector3(0, AIM, 0));
    const a = tmp.dot(right), c = tmp.dot(up);
    x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, c); y1 = Math.max(y1, c);
  }
  // room round him for a hop, a wave, a flicked ear
  const fw = x1 - x0, fh = y1 - y0;
  x0 -= fw * 0.1; x1 += fw * 0.1; y1 += fh * 0.14; y0 -= fh * 0.035;
  camera.left = x0; camera.right = x1; camera.top = y1; camera.bottom = y0;
  camera.updateProjectionMatrix();
  const aspect = (x1 - x0) / (y1 - y0);

  // the hit test's balls, riding his bones
  const balls = proxies(body.pos, sk.index, sk.weight).map((p) => ({ bone: bones[p.bone], c: new Vector3(...p.c), r: p.r }));

  // ------------------------------------------------------------------------------------------- his place --
  let box = { left: 0, top: 0, width: 0, height: 0 };
  const rectOf = (sel: string): Rect | null => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect(), z = posterZoom();
    return r.width > 0 && r.height > 0 ? { left: r.left / z, top: r.top / z, right: r.right / z, bottom: r.bottom / z } : null;
  };
  const tierRatio = () => [1, 1.25, 2][quality.tier()];
  const place = () => {
    const z = posterZoom();
    box = cubBox(
      { w: window.innerWidth / z, h: window.innerHeight / z, coarse: !finePointer() },
      { tabs: rectOf('#ch-switch'), foot: rectOf('.hud-bl') ?? rectOf('.hud-br') },
      aspect,
    );
    Object.assign(root.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tierRatio()) * z);
    renderer.setSize(box.width, box.height, false);
    canvas.style.width = `${box.width}px`;
    canvas.style.height = `${box.height}px`;
  };
  place();

  // ---------------------------------------------------------------------------------------------- his mind --
  const brain = new CubBrain();
  brain.calm = reducedMotion();
  const calmWatch = new MutationObserver(() => { brain.calm = reducedMotion(); });
  calmWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  let pointer: { x: number; y: number; t: number } | null = null;
  const headPos = new Vector3();
  /** Where on the screen (viewport px) a point of him stands. */
  const toScreen = (p: Vector3) => {
    const q = p.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + ((q.x + 1) / 2) * r.width, y: r.top + ((1 - q.y) / 2) * r.height };
  };
  const aim = (now: number): { yaw: number; pitch: number } | null => {
    const film = hooks.awake();
    const target = film ?? (pointer && finePointer() && now - pointer.t < 4000 ? pointer : null);
    if (!target) return null;
    bones[BONE.head].getWorldPosition(headPos);
    headPos.y += 0.2;
    const h = toScreen(headPos);
    // across the whole screen his head turns only a little (LOOK): spread the screen over that little
    return { yaw: ((target.x - h.x) / window.innerWidth) * 0.42 - 0.07, pitch: ((target.y - h.y) / window.innerHeight) * 0.42 };
  };

  const apply = (p: Pose) => {
    const [root0, bodyB, head, earL, earR, armL, armR, footL, footR] = bones;
    root0.position.y = p.hop;
    root0.scale.set(1 - p.squash * 0.45, 1 + p.squash, 1 - p.squash * 0.45);
    bodyB.rotation.set(p.lean, 0, p.rock);
    bodyB.scale.set(1 + 0.008 * p.breath, 1 + 0.012 * p.breath, 1 + 0.009 * p.breath);
    head.rotation.set(p.head.pitch, p.head.yaw, p.head.roll);
    earL.rotation.set(0, 0, -p.ears[0]);
    earR.rotation.set(0, 0, p.ears[1]);
    armL.rotation.set(0, p.arms[0].swing, p.arms[0].lift);
    armR.rotation.set(0, -p.arms[1].swing, -p.arms[1].lift);
    footL.rotation.set(0, 0, p.feet[0]);
    footR.rotation.set(0, 0, -p.feet[1]);
    mat.uniforms.uHappy.value = p.happy;
    mat.uniforms.uDozy.value = p.dozy;
    shadowMat.uniforms.uK.value = 1 - Math.min(0.6, p.hop * 8);
  };

  // the film he watches lends his edges its colour
  const rim = mat.uniforms.uRim.value as Color;
  const rimWant = new Color(0, 0, 0);
  const tint = (dt: number) => {
    const film = hooks.awake();
    if (film) rimWant.set(film.accent); else rimWant.setRGB(0, 0, 0);
    const k = 1 - Math.exp(-dt / 0.25);
    rim.lerp(rimWant, k);
    mat.uniforms.uRimK.value += ((film ? 0.55 : 0) - mat.uniforms.uRimK.value) * k;
  };

  // hearts, Zs, the squeak
  const spawn = (cls: string, text: string, dx: number, delay: number) => {
    bones[BONE.head].getWorldPosition(headPos);
    headPos.y += 0.32;
    const s = toScreen(headPos), r = root.getBoundingClientRect(), z = posterZoom();
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    el.style.left = `${(s.x - r.left) / z + dx}px`;
    el.style.top = `${(s.y - r.top) / z}px`;
    el.style.animationDelay = `${delay}s`;
    el.addEventListener('animationend', () => el.remove());
    fx.append(el);
    window.setTimeout(() => el.remove(), 4000);
  };
  const happen = (events: CubEvent[]) => {
    for (const e of events) {
      if (e.kind === 'heart') for (let i = 0; i < e.n; i++) spawn('cub-heart', '♥', (i - (e.n - 1) / 2) * 22 + (Math.random() - 0.5) * 10, i * 0.09);
      else if (e.kind === 'z') spawn('cub-z micro', 'Z', 18, 0);
      else if (e.kind === 'squeak') sound.squeak(e.big);
    }
  };

  // ------------------------------------------------------------------------------------------- his touch --
  const ray = { o: new Vector3(), d: new Vector3() };
  const cam = new Vector3();
  /** Is the screen point (viewport px) on him — on his body, with nothing of the page's chrome over it? */
  const onHim = (x: number, y: number): boolean => {
    if (root.hidden || !box.width) return false;
    const r = canvas.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
    const top = document.elementFromPoint(x, y);
    if (top && top !== canvas && top.tagName !== 'CANVAS') return false; // (a readout, a tab, a caption over him)
    const nx = ((x - r.left) / r.width) * 2 - 1, ny = 1 - ((y - r.top) / r.height) * 2;
    ray.o.set(nx, ny, -1).unproject(camera);
    camera.getWorldDirection(ray.d);
    for (const b of balls) {
      b.bone.localToWorld(cam.copy(b.c));
      const oc = cam.sub(ray.o);
      const t = oc.dot(ray.d);
      if (oc.lengthSq() - t * t < b.r * b.r) return true;
    }
    return false;
  };

  let over = false, labelled = false;
  let press: { id: number; x: number; t: number; moved: number } | null = null;
  const setOver = (on: boolean) => {
    if (on === over) return;
    over = on;
    canvas.style.pointerEvents = on ? 'auto' : '';
  };
  const now = () => performance.now() / 1000;
  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY, t: performance.now() };
    brain.stir(now());
    if (press && e.pointerId === press.id) {
      // a stroke: the drag across him, its sideways speed
      const dx = e.clientX - press.x;
      press.moved += Math.abs(dx);
      press.x = e.clientX;
      if (press.moved > 6) brain.stroke(now(), true, Math.max(-1, Math.min(1, dx / 8)));
      return; // (the move goes on its way: the cursor follows it; the floor, which never had the press, ignores it)
    }
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') setOver(onHim(e.clientX, e.clientY));
  };
  const onDown = (e: PointerEvent) => {
    if (!onHim(e.clientX, e.clientY)) return;
    // his: it pets him, and it never reaches the floor (no film opens, no drag starts)
    e.stopPropagation();
    e.preventDefault();
    sound.unlock();
    press = { id: e.pointerId, x: e.clientX, t: now(), moved: 0 };
    brain.pet(now());
  };
  const onUp = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;
    press = null;
    brain.stroke(now(), false);
  };
  // a wheel over him is the floor's: handed on
  const onWheel = (e: WheelEvent) => {
    const floor = document.getElementById('floor');
    if (!floor) return;
    const copy = new WheelEvent('wheel', {
      deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ, deltaMode: e.deltaMode, clientX: e.clientX, clientY: e.clientY,
      ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, bubbles: true, cancelable: true,
    });
    floor.dispatchEvent(copy);
    if (copy.defaultPrevented) e.preventDefault();
  };
  const leave = () => setOver(false);
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerleave', leave);

  // ------------------------------------------------------------------------------------------- his clock --
  let raf = 0, last = 0, parked = false, alive = true;
  let lastPose: Pose | null = null;
  let frozen: Partial<Pose> | null = null; // (the debug handle's: a pose held for a still)
  const fps = () => (brain.calm ? 12 : [24, 30, 60][quality.tier()]);
  const frame = (ms: number) => {
    raf = requestAnimationFrame(frame);
    if (ms - last < 1000 / fps() - 2) return;
    const dt = Math.min(0.1, (ms - last) / 1000);
    last = ms;
    brain.look(aim(ms));
    const pose = brain.step(ms / 1000);
    lastPose = pose;
    apply(frozen ? { ...pose, ...frozen } : pose);
    tint(dt);
    happen(brain.drain());
    // the cursor names him while it is on him (the floor's own label returns as a pane wakes)
    if (over !== labelled && finePointer()) { setCursorLabel(over ? CUB_LABEL : null); labelled = over; }
    renderer.render(scene, camera);
  };
  const run = () => { if (!raf && alive && !parked && !document.hidden) raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
  window.addEventListener('resize', () => { place(); });
  quality.on(() => place());
  canvas.addEventListener('webglcontextlost', () => { alive = false; stop(); root.hidden = true; });

  // he arrives with a little hello
  root.classList.add('is-arriving');
  window.setTimeout(() => root.classList.remove('is-arriving'), 900);
  brain.react('hello', now());
  run();
  (window as unknown as { rvlCub: unknown }).rvlCub = { // a debug handle for verification
    box: () => ({ ...box }), over: () => over, pose: () => lastPose, onHim, pet: () => brain.pet(now()),
    freeze: (p: Partial<Pose> | null) => { frozen = p; },
    renderer, camera, bones,
  };

  return {
    park(on: boolean) {
      parked = on;
      root.hidden = on;
      if (on) { stop(); setOver(false); } else run();
    },
    react(kind: Reaction) { brain.react(kind, now()); },
  };
}
