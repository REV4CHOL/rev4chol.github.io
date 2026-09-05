/** REVACHOL, TRAVERSABLE — the about page IS the city (owner decree,
 *  logartis.info model), graded to the reference plates and to Newport
 *  City: a blue-green night, a canal avenue with boats and bridges, a
 *  tree-lined avenue, an elevated highway on pillars, a diagonal boulevard,
 *  alleys strung with lanterns and wires, blocks packed edge to edge with
 *  jumbled tenements and towers, a stadium and a Ferris wheel, a stepped
 *  megastructure under a giant hologram, pagodas, an industrial corner of
 *  tanks and smoking stacks, skybridges, market stalls; thousands of
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
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry, ClampToEdgeWrapping, Color, ConeGeometry, DataTexture,
  CylinderGeometry, DirectionalLight, DoubleSide, FogExp2, Group, HemisphereLight, InstancedBufferAttribute,
  InstancedBufferGeometry, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, LineBasicMaterial, LineSegments, Material, Matrix4, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, MeshStandardMaterial, NearestFilter, NeutralToneMapping, NoColorSpace, Object3D, PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, Points,
  PointsMaterial, RepeatWrapping, RGBAFormat, RingGeometry, Scene, ShaderChunk, SphereGeometry, Sprite, SpriteMaterial,
  SRGBColorSpace, TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { WebGLProgramParametersWithUniforms, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { isMobile, reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import {
  AirLane, ART_COLOR, ARTERIAL, ARTERIAL_ROW, arterialLat, ARTS, AutoFlight, bandPoint, bandPositions, BOUND, CAM_R, CANAL, DIAGONAL, EXT, G, HALF, HIGHWAY, HoloKind, OUTER,
  planCity, Poi, RAIL, RAMP_W, rampY, ROAD, Sign, signColor, Solid, starPositions, streetAt, STREET, Street, tourRoute,
} from './city-plan';
import { fov24, LensPass, lensTarget, MotionBlurPass } from './city-post';
import { CityAudio } from './city-audio';
import { CAST, People, Zone } from './city-people';
import { blendLooks, ease, lerpHex, Look as SkyLook, LOOKS as SKY, paintSky, TimeOfDay } from './city-sky';
import { Traffic, DECK_KERB, SPEC } from './city-traffic';
import { ATLAS, CELLS, FAMILIES, FLOOR, heightToNormal, PX as SKIN_PX, SHOP, skinFor, tintJitter, UPPER, VARIANTS } from './city-skins';

/** THE FOG, rewritten for every material at once: three's exponential
 *  distance fog, plus a HAZE that pools in the streets (denser low, only
 *  with distance — the light pollution the plates are soaked in), plus the
 *  FOG OF WAR (owner): past the fence the city dissolves whatever the
 *  distance, so the sandbox reads as infinite and the eye never reaches
 *  its edge — while inside it the air is clear and the render distance
 *  long. The vertex side carries the world position out of the modelview
 *  one (the view's rotation transposed). */
ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif`;
ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorld = cameraPosition + mvPosition.xyz * mat3( viewMatrix );
#endif`;
ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  // the air inside the fence is clear but for a breath of haze low in the streets (owner: the whole map at once,
  // and no fog wall that moves with the eye); a hazy look thickens it
  float haze = 0.14 * clamp( fogDensity / 0.001, 0.6, 3.0 ) * exp( - max( vFogWorld.y, 0.0 ) * 0.03 ) * ( 1.0 - exp( - vFogDepth * 0.006 ) );
  fogFactor = min( 0.985, 1.0 - ( 1.0 - fogFactor ) * ( 1.0 - min( haze, 0.9 ) ) );
  // THE FOG OF WAR (owner: dense — only glimpses of what lies past the fence): a wall standing in the world
  float edge = max( abs( vFogWorld.x ), abs( vFogWorld.z ) );
  fogFactor = max( fogFactor, smoothstep( 292.0, 400.0, edge ) * 0.975 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;

/** ADDITIVE LIGHT IN FOG: a pool of lamplight, a headlight's throw, a
 *  shopfront's wash on the pavement are ADDED to the frame; three's fog
 *  would mix each toward the fog's colour — adding that colour once per
 *  decal, so a street of them far off summed to a white haze (measured).
 *  Their fog DIMS them instead: the same factor, multiplied in. */
const FOG_ADD = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  // the air inside the fence is clear but for a breath of haze low in the streets (owner: the whole map at once,
  // and no fog wall that moves with the eye); a hazy look thickens it
  float haze = 0.14 * clamp( fogDensity / 0.001, 0.6, 3.0 ) * exp( - max( vFogWorld.y, 0.0 ) * 0.03 ) * ( 1.0 - exp( - vFogDepth * 0.006 ) );
  fogFactor = min( 0.985, 1.0 - ( 1.0 - fogFactor ) * ( 1.0 - min( haze, 0.9 ) ) );
  // THE FOG OF WAR (owner: dense — only glimpses of what lies past the fence): a wall standing in the world
  float edge = max( abs( vFogWorld.x ), abs( vFogWorld.z ) );
  fogFactor = max( fogFactor, smoothstep( 292.0, 400.0, edge ) * 0.975 );
  gl_FragColor.rgb *= 1.0 - fogFactor;
#endif`;
function additiveFog<T extends Material>(m: T): T {
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', FOG_ADD);
  };
  m.customProgramCacheKey = () => 'additive-fog';
  return m;
}

/** QUALITY (owner: a render distance that adapts): four tiers of far plane,
 *  fog density, shadows and pixel size. The opening tier reads the
 *  connection (the Network Information API, where the browser offers it)
 *  and the device; from then on the measured frame time steps the tier
 *  down when frames run long and back up when they run short. */
interface Tier { label: string; far: number; fog: number; shadows: boolean; pix: number }
const TIERS: Tier[] = [ // (owner: the whole map inside the fence at once, at every tier — the fog of war is a wall, not a distance)
  { label: 'low', far: 1500, fog: 0.0009, shadows: false, pix: 3 },
  { label: 'mid', far: 1500, fog: 0.0008, shadows: false, pix: 2 },
  { label: 'high', far: 1500, fog: 0.0008, shadows: true, pix: 2 },
  { label: 'ultra', far: 1500, fog: 0.0007, shadows: true, pix: 2 },
];
function startTier(): number {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean; downlink?: number }; deviceMemory?: number };
  const c = nav.connection;
  let t = 2;
  if (c) {
    if (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g') t = 0;
    else if (c.effectiveType === '3g') t = 1;
    else if ((c.downlink ?? 10) >= 20) t = 3;
  }
  if ((nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 4) t = Math.min(t, 1);
  if (isMobile()) t = Math.min(t, 1);
  return t;
}

// the windows: warm sodium and cool fluorescent whites, a rare saturated pane (a shop, a screen behind glass) —
// the colour of the street is the signs' (owner: the lit grids read as a Mondrian by day)
const WARM = ['#ffb36b', '#ffd9a0', '#ffe9c9', '#ffc27a', '#fff1d6', '#ffcf8a'];
const COOL = ['#bfefff', '#dff6ff', '#ffffff', '#cfe3ff', '#e8f4ff', '#a9d8f0'];
const RARE = ['#7de8ff', '#ff5e7a', '#b79cff', '#ff9a4d', '#3dff8f'];

const pick = <T>(rand: () => number, arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const windowColor = (rand: () => number, warm = 0.6) => (rand() < 0.06 ? pick(rand, RARE) : rand() < warm ? pick(rand, WARM) : pick(rand, COOL));

/** Every hand-pixel canvas is authored in sRGB — mark it so, or the renderer
 *  gamma-lifts the night into a grey wash (measured). */
function asPixelTex(t: CanvasTexture): CanvasTexture {
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  return t;
}

/** THE FACADE ATLAS (owner: every building unique, no cardboard) — see
 *  city-skins.ts for the catalogue. Every cell of it is painted here: the
 *  wall in its material's relief (brick courses, stone blocks, panel seams,
 *  plaster, corrugation, rivets), the floors' spandrels and sills, the
 *  windows in the family's rhythm — lit ones burning warm or cool by the
 *  variant's mood, the rest dark glass — and, in the tile's bottom strip,
 *  a row of SHOPFRONTS: lit glass, a sign fascia, a door, pilasters, some
 *  shuttered. Alongside the colour a HEIGHT field (windows recessed, sills
 *  and piers proud, joints cut) becomes the normal map the light rakes
 *  across, and a MASK of the glass rides in its alpha. */
interface SkinAtlas { map: CanvasTexture; normal: CanvasTexture }
function skinAtlas(rand: () => number): SkinAtlas {
  const W = ATLAS.cols * ATLAS.w, H = ATLAS.rows * ATLAS.h;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const height = new Float32Array(W * H);
  const mask = new Uint8Array(W * H);
  // a rectangle of colour — and, where given, of height (texel-depths: a window sits one deep) and of glass
  const put = (px: number, py: number, w: number, h: number, color: string, alpha = 1, dh?: number, glass?: boolean) => {
    x.fillStyle = color; x.globalAlpha = alpha; x.fillRect(px, py, w, h);
    if (dh === undefined && glass === undefined) return;
    for (let yy = py; yy < py + h; yy++) {
      for (let xx = px; xx < px + w; xx++) {
        const i = yy * W + xx;
        if (dh !== undefined) height[i] = dh;
        if (glass !== undefined) mask[i] = glass ? 255 : 0;
      }
    }
  };
  const ri = (n: number) => Math.floor(rand() * n);
  for (let cell = 0; cell < CELLS; cell++) {
    const fam = FAMILIES[Math.floor(cell / VARIANTS)], v = fam.variants[cell % VARIANTS];
    const ox = (cell % ATLAS.cols) * ATLAS.w, oy = Math.floor(cell / ATLAS.cols) * ATLAS.h;
    const cw = ATLAS.w, ch = ATLAS.h;
    const curtain = fam.win === 'curtain';
    // -- the wall and its relief
    put(ox, oy, cw, ch, v.wall, 1, 0, false);
    switch (v.relief) {
      case 'brick': // courses two texels tall, half-bond
        for (let yy = 0; yy < ch; yy += 2) {
          put(ox, oy + yy + 1, cw, 1, v.joint, 0.7, -0.35);
          for (let xx = (yy % 4 ? 0 : 2); xx < cw; xx += 4) put(ox + xx, oy + yy, 1, 1, v.joint, 0.55, -0.3);
        }
        break;
      case 'block': // ashlar: courses six tall, blocks sixteen long, staggered
        for (let yy = 0; yy < ch; yy += 6) {
          put(ox, oy + yy, cw, 1, v.joint, 0.8, -0.4);
          for (let xx = (yy % 12 ? 0 : 8); xx < cw; xx += 16) put(ox + xx, oy + yy, 1, 6, v.joint, 0.6, -0.35);
        }
        break;
      case 'panel': // precast: a seam at every floor and every bay
        for (let yy = 0; yy < ch; yy += FLOOR) put(ox, oy + yy, cw, 1, v.joint, 0.85, -0.5);
        for (let xx = 0; xx < cw; xx += fam.bay) put(ox + xx, oy, 1, ch, v.joint, 0.85, -0.5);
        break;
      case 'rivet': // steel plate: seams and rivet lines
        for (let yy = 0; yy < ch; yy += FLOOR) put(ox, oy + yy, cw, 1, v.joint, 0.8, -0.4);
        for (let xx = 0; xx < cw; xx += fam.bay) put(ox + xx, oy, 1, ch, v.joint, 0.8, -0.4);
        for (let yy = 2; yy < ch; yy += 4) for (let xx = 2; xx < cw; xx += fam.bay) { put(ox + xx, oy + yy, 1, 1, '#ffffff', 0.25, 0.5); put(ox + xx + fam.bay - 4, oy + yy, 1, 1, '#ffffff', 0.25, 0.5); }
        break;
      case 'corrugated': // ribs three texels apart, rust and patches
        for (let yy = 0; yy < ch; yy += 3) { put(ox, oy + yy, cw, 1, '#ffffff', 0.12, 0.3); put(ox, oy + yy + 2, cw, 1, '#000000', 0.28, -0.3); }
        for (let i = 0; i < 40; i++) put(ox + ri(cw), oy + ri(ch), 1 + ri(3), 1 + ri(4), rand() < 0.5 ? '#c86a30' : '#5a3a2a', 0.5);
        break;
      case 'plaster': // render: fine grain, a few cracks
        for (let i = 0; i < 260; i++) put(ox + ri(cw), oy + ri(ch), 1, 1, rand() < 0.5 ? '#000000' : '#ffffff', 0.05 + rand() * 0.06);
        for (let i = 0; i < 14; i++) put(ox + ri(cw), oy + ri(ch), 1, 2 + ri(6), '#000000', 0.12);
        break;
      default: break; // flush: a seamless skin
    }
    // -- grime running down the wall, weather, grain — on the WALL only: the windows are painted over it after
    // (owner: speckle on the panes read as TV static — a lit window is one flat light)
    for (let i = 0; i < 40; i++) put(ox + ri(cw), oy + ri(UPPER), 1, 3 + ri(8), '#000000', 0.12);
    for (let i = 0; i < 300; i++) put(ox + ri(cw), oy + ri(ch), 1, 1, rand() < 0.5 ? '#000000' : '#ffffff', 0.04 + rand() * 0.06);
    // -- the floors: a floor line, a sill, the windows in the family's rhythm (about half of them burning, floor by floor)
    const mood = () => { const m = rand(); return Math.min(0.97, (m < 0.2 ? 0.15 : m < 0.6 ? 0.6 : m < 0.9 ? 1 : 1.3) * v.lit); };
    for (let k = 0; k < UPPER / FLOOR; k++) {
      const fb = oy + UPPER - (k + 1) * FLOOR; // the floor's top row in the canvas (floor k counted up from the shop strip)
      const wTop = fb + FLOOR - fam.wy - fam.wh; // the window sits wy up from the floor's bottom
      if (!curtain) put(ox, fb + FLOOR - 1, cw, 1, '#000000', 0.22, v.relief === 'flush' ? 0 : -0.3);
      const p = mood();
      const floorCol = rand() < 0.3 ? windowColor(rand, v.warm) : null;
      for (let bx = 0; bx < cw; bx += fam.bay) {
        const wx = ox + bx + fam.wx;
        const on = rand() < p;
        const col = on ? (floorCol ?? windowColor(rand, v.warm)) : v.glass;
        put(wx - 1, wTop - 1, fam.ww + 2, fam.wh + 2, v.frame, 1, 0.15, false); // the frame, a shade proud
        put(wx, wTop, fam.ww, fam.wh, col, on ? (fam.win === 'wide' ? 0.5 + rand() * 0.2 : 0.75 + rand() * 0.25) : 1, curtain ? -0.1 : -1, true); // the glass, recessed (a wide pane burns lower: a slab of white bloomed)
        if (!curtain) put(wx - 1, wTop + fam.wh, fam.ww + 2, 1, '#ffffff', 0.35, 0.45); // the sill, proud
        if (fam.win === 'strip') { // the piers between the strips stand proud, floor through floor
          put(ox + bx, fb, fam.wx - 1, FLOOR, v.wall, 1, 1.2, false);
          put(ox + bx + fam.wx + fam.ww + 1, fb, fam.bay - fam.wx - fam.ww - 1, FLOOR, v.wall, 1, 1.2, false);
        }
        if (fam.win === 'tiny' && k % 3 === 1 && v.relief !== 'corrugated') put(ox + bx, fb + FLOOR - 2, fam.bay, 2, v.joint, 0.9, 0.7, false); // a balcony slab
      }
      if (curtain) { // the curtain's spandrel: an opaque pane a shade darker, glass still; mullions at every bay
        put(ox, fb + FLOOR - 3, cw, 3, v.glass, 1, -0.1, true);
        put(ox, fb + FLOOR - 3, cw, 1, '#000000', 0.35, 0.2, true);
        for (let bx = 0; bx < cw; bx += fam.bay) put(ox + bx, fb, 1, FLOOR, v.frame, 1, 0.3, false);
      }
      if (fam.win === 'ribbon') for (let bx = 0; bx < cw; bx += fam.bay) put(ox + bx, wTop, 1, fam.wh, v.frame, 1, 0.1, false); // the band's mullions
    }
    // -- the shopfront strip: the tile's bottom texels, the ground floor of a building that has one
    const sy = oy + UPPER;
    put(ox, sy, cw, SHOP, v.wall, 1, 0, false);
    put(ox, sy + SHOP - 2, cw, 2, '#000000', 0.4, 0); // the plinth
    for (let s = 0; s < 2; s++) { // two shops of eight units
      const sx = ox + s * 32;
      put(sx, sy, 2, SHOP, v.wall, 1, 0.6, false); put(sx + 30, sy, 2, SHOP, v.wall, 1, 0.6, false); // pilasters
      const shut = rand() < 0.22;
      put(sx + 2, sy, 28, 4, shut ? '#2a2a30' : signColor(rand), 1, 0.4, !shut); // the fascia: a lit sign board
      if (shut) {
        for (let yy = sy + 4; yy < sy + SHOP - 2; yy += 2) put(sx + 2, yy, 28, 1, '#000000', 0.35, -0.2, false); // a shutter's ribs
        continue;
      }
      put(sx + 5 + ri(6), sy + 1, 6 + ri(10), 2, '#ffffff', 0.85, 0.4, true); // its lettering, white-hot
      put(sx + 2, sy + 4, 28, SHOP - 6, rand() < 0.7 ? '#fff1d6' : pick(rand, ['#dff6ff', '#ffe0f4', '#e6ffe0']), 0.9, -0.8, true); // the lit shop glass
      put(sx + (rand() < 0.5 ? 3 : 22), sy + 5, 5, SHOP - 7, '#3a2a20', 1, -0.6, false); // the door
      put(sx + 2, sy + 4, 28, 1, v.frame, 1, 0, false); // the frame's head
      for (let m = sx + 9; m < sx + 28; m += 7) put(m, sy + 4, 1, SHOP - 6, v.frame, 1, 0, false); // mullions
    }
  }
  x.globalAlpha = 1;
  const map = asPixelTex(new CanvasTexture(c));
  map.minFilter = LinearMipmapLinearFilter; map.generateMipmaps = true; map.anisotropy = 4; // crisp up close (nearest), averaged into the distance: no shimmer
  const n = document.createElement('canvas');
  n.width = W; n.height = H;
  const nx = n.getContext('2d')!;
  const img = nx.createImageData(W, H);
  img.data.set(heightToNormal(height, W, H, mask, 1.1));
  nx.putImageData(img, 0, 0);
  const normal = new CanvasTexture(n);
  normal.colorSpace = NoColorSpace;
  normal.magFilter = NearestFilter; normal.minFilter = LinearMipmapLinearFilter; normal.generateMipmaps = true; normal.anisotropy = 4;
  return { map, normal };
}

/** LIVING WINDOWS (owner: the lights must feel alive, slowly): some of the
 *  windows (never all) go dark for a stretch and come back, over seconds,
 *  each on its own long period, each building's phases its own. */
const winTime = { value: 0 };
/** Shared, live: the look's pull of every wall toward one colour, and its dark glass (city-sky.ts). */
const wallBleach = { value: 0 };
const wallBleachCol = { value: new Color('#2c4a8e') };
const wallGlass = { value: new Color('#101a36') };
/** Shared, live: how lit the windows are (the look's `windows`) — a lit pane's albedo is its painted light by night, glass by day. */
const wallLit = { value: 1 };

/** THE SKIN: a physically lit material that WRAPS the atlas cell a building
 *  wears over its real width and height (a window is a window's size on
 *  every wall; a wide slab gets more bays, not wider ones), keeps the
 *  windows living, lifts the walls and pulls them a little toward the
 *  look's colour, makes the glass a polished half-mirror (it takes the sky
 *  and the lights; the walls stay matte), reads the relief from the normal
 *  atlas and, on a building so marked, burns a crown at the roofline. Per
 *  instance: aSkin = (cell, phase along the tile, shopfront, crown) and a
 *  tint jitter in the instance colour. */
function skinMaterial(atlas: SkinAtlas, cyl: boolean, far: boolean): MeshStandardMaterial {
  const base = far ? 0.95 : 0.9, lift = far ? 1.25 : 1.35;
  const mat = new MeshStandardMaterial({
    map: atlas.map, emissiveMap: atlas.map, emissive: '#ffffff', emissiveIntensity: base,
    normalMap: atlas.normal, roughness: 1, metalness: 0, color: far ? '#9aa0c8' : '#ffffff',
  });
  const uLift = { value: lift };
  mat.userData.uLift = uLift; mat.userData.base = base; mat.userData.lift = lift;
  const pitch = FAMILIES.map((f) => new Vector2(f.bay, FLOOR));
  const offs = FAMILIES.map((f) => new Vector2(f.wx, f.wy));
  const N = FAMILIES.length;
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = winTime;
    shader.uniforms.uLift = uLift;
    shader.uniforms.uBleach = wallBleach;
    shader.uniforms.uBleachCol = wallBleachCol;
    shader.uniforms.uGlass = wallGlass;
    shader.uniforms.uLit = wallLit;
    shader.uniforms.uPitch = { value: pitch };
    shader.uniforms.uOffs = { value: offs };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aSkin; varying vec4 vSkin; varying vec2 vTile; varying float vTop; varying float vInst;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float skinW = length( instanceMatrix[0].xyz ), skinH = length( instanceMatrix[1].xyz ), skinD = length( instanceMatrix[2].xyz );
          vInst = fract( dot( instanceMatrix[3].xz, vec2( 0.0371, 0.0913 ) ) + instanceMatrix[3].y * 0.011 );
        #else
          float skinW = 1.0, skinH = 1.0, skinD = 1.0;
          vInst = 0.0;
        #endif
        ${cyl ? 'float skinAlong = 3.14159265 * skinW;' : 'float skinAlong = abs( normal.x ) > 0.5 ? skinD : skinW;'}
        vTile = vec2( uv.x * skinAlong * ${SKIN_PX}.0 + aSkin.y * ${ATLAS.w}.0, uv.y * skinH * ${SKIN_PX}.0 ); // texels along the wall and up it
        vTop = ( 1.0 - uv.y ) * skinH; // units below the roofline
        vSkin = aSkin;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uLift; uniform float uBleach; uniform vec3 uBleachCol; uniform vec3 uGlass; uniform float uLit;
        uniform vec2 uPitch[${N}]; uniform vec2 uOffs[${N}];
        varying vec4 vSkin; varying vec2 vTile; varying float vTop; varying float vInst;
        float wHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        // the cell's texel under this fragment: u wraps every tile; v is the shop strip for a shopfronted ground floor, the upper floors wrapped above
        vec2 skinTexel( float shop ) {
          float v = vTile.y;
          float vpx = shop > 0.5 ? ( v < ${SHOP}.0 ? v : ${SHOP}.0 + mod( v - ${SHOP}.0, ${UPPER}.0 ) ) : ${SHOP}.0 + mod( v, ${UPPER}.0 );
          return vec2( mod( vTile.x, ${ATLAS.w}.0 ), vpx );
        }
        vec2 atlasUv( float cell, vec2 px ) {
          vec2 c = vec2( mod( cell, ${ATLAS.cols}.0 ), ${ATLAS.rows - 1}.0 - floor( cell / ${ATLAS.cols}.0 ) );
          return ( c + px / vec2( ${ATLAS.w}.0, ${ATLAS.h}.0 ) ) / vec2( ${ATLAS.cols}.0, ${ATLAS.rows}.0 );
        }
        // which window of the wall this is, in the family's lattice; some (never all) go dark for a stretch and come back
        float windowOff( int fam, float shop ) {
          vec2 px = vec2( vTile.x, vTile.y - ( shop > 0.5 ? ${SHOP}.0 : 0.0 ) );
          vec2 cell = floor( ( px - uOffs[ fam ] ) / uPitch[ fam ] );
          float h = wHash( cell + vInst * 37.0 );
          if ( h < 0.55 ) return 0.0;
          float period = 50.0 + 90.0 * wHash( cell * 1.7 + vInst * 11.0 );
          float w = fract( uTime / period + h * 7.0 );
          return smoothstep( 0.0, 0.006, w ) * smoothstep( 0.3, 0.294, w ); // a SWITCH: on or off inside a second, not a slow dimmer
        }`)
      .replace('#include <map_fragment>', `
        float skinCell = floor( vSkin.x + 0.5 );
        int skinFam = int( floor( skinCell / ${VARIANTS}.0 + 0.001 ) );
        vec2 skinUv = atlasUv( skinCell, skinTexel( vSkin.z ) );
        vec2 skinDx = dFdx( vTile ) / vec2( ${ATLAS.cols * ATLAS.w}.0, ${ATLAS.rows * ATLAS.h}.0 ); // the tile's own gradients: continuous across the wrap, where the atlas uv's are not
        vec2 skinDy = dFdy( vTile ) / vec2( ${ATLAS.cols * ATLAS.w}.0, ${ATLAS.rows * ATLAS.h}.0 );
        vec4 sampledDiffuseColor = textureGrad( map, skinUv, skinDx, skinDy );
        vec4 skinN = textureGrad( normalMap, skinUv, skinDx, skinDy );
        float wmask = skinN.a;
        float wlum = dot( sampledDiffuseColor.rgb, vec3( 0.3, 0.5, 0.2 ) );
        float litness = smoothstep( 0.12, 0.3, wlum );
        float woff = windowOff( skinFam, vSkin.z );
        float litF = wmask * litness * ( 1.0 - woff );            // a burning window: a SOURCE, not a reflector — its albedo is cut
        float glassF = wmask * ( 1.0 - litness * ( 1.0 - woff ) ); // dark glass: a mirror for the sky and the lights
        float wall = 1.0 - wmask;
        // the WALL takes light: its albedo lifted, then pulled a little toward the look's colour (blue by night, pale by day), its own shading kept
        float detail = clamp( wlum / 0.2, 0.45, 1.6 );
        vec3 wallCol = mix( sampledDiffuseColor.rgb * uLift, uBleachCol * detail, uBleach );
        float crown = vSkin.w * ( 1.0 - smoothstep( 2.0, 2.6, vTop ) ) * step( 0.6, vTop );
        vec3 skinCol = mix( uGlass, sampledDiffuseColor.rgb * 0.3, uLit ) * litF + uGlass * glassF + wallCol * wall; // a lit pane is glass by day
        sampledDiffuseColor.rgb = mix( skinCol, vec3( 0.2, 0.12, 0.06 ), crown );
        diffuseColor *= sampledDiffuseColor;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix( 0.9, 0.16, wmask );')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = 0.6 * glassF;')
      .replace('#include <normal_fragment_maps>', `
        mat3 skinTbn = getTangentFrame( - vViewPosition, normal, vTile ); // a frame from the tile's texels: isotropic, whatever the wall's proportions
        vec3 mapN = skinN.xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;
        normal = normalize( skinTbn * mapN );`)
      .replace('#include <emissivemap_fragment>', `
        vec4 emissiveColor = textureGrad( emissiveMap, skinUv, skinDx, skinDy );
        totalEmissiveRadiance = totalEmissiveRadiance.r * ( emissiveColor.rgb * litF + vec3( 1.0, 0.62, 0.3 ) * crown * 0.7 );`);
  };
  mat.customProgramCacheKey = () => (cyl ? 'skin-cyl' : 'skin');
  return mat;
}

/** A shopfront's light on the pavement: a wash, brightest at the glass,
 *  gone six units out, feathered at the ends. */
function spillTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 32);
  const e = x.createLinearGradient(0, 0, 64, 0);
  e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.18, 'rgba(0,0,0,0)'); e.addColorStop(0.82, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = e; x.fillRect(0, 0, 64, 32);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter;
  return t;
}

/** THE CAST'S SPRITE SHEET (owner: NPCs with a lot of variety). For every
 *  kind in the cast (city-people.ts) four looks — two hairstyles, each with
 *  and without their thing (a bag, a briefcase, a cane, a backpack, an
 *  apron) — and for every look eight 8×16 frames: walk A/B, stand, sit,
 *  talk (a hand up), phone (lit, at the face), vend (arms on the counter),
 *  sit with a phone. Composed from parts, not drawn by hand. MARKER colours
 *  stand for the person's own palette, set per instance: white the top
 *  garment, magenta the legs, cyan the hair (or hat, hood, helmet), yellow
 *  the skin, green the glow (a visor, a phone, a hi-vis stripe, a badge, a
 *  crest's tip — drawn unlit). Everything else is drawn as it is. */
export const LOOKS_PER_KIND = 4;
type Hair = 'short' | 'long' | 'bun' | 'bald' | 'cap' | 'capback' | 'helmet' | 'hat' | 'hardhat' | 'hood' | 'bandana' | 'mohawk' | 'spiky';
interface Look {
  h: number; wide?: boolean; slim?: boolean; coat?: 1 | 2; skirt?: boolean; shorts?: boolean; sleeves?: boolean;
  hair: [Hair, Hair]; visor?: boolean; eyes?: boolean; trim?: boolean; hivis?: boolean; badge?: boolean; tie?: boolean;
  metal?: boolean; stoop?: boolean; extra?: 'bag' | 'case' | 'cane' | 'apron' | 'pack';
}
const LOOKS: Record<string, Look> = {
  civ: { h: 16, sleeves: true, hair: ['short', 'long'], extra: 'bag' },
  coat: { h: 16, sleeves: true, coat: 1, hair: ['short', 'bun'], extra: 'bag' },
  dress: { h: 16, skirt: true, hair: ['long', 'bun'], extra: 'bag' },
  hood: { h: 16, sleeves: true, hair: ['hood', 'cap'], extra: 'pack' },
  heavy: { h: 16, wide: true, sleeves: true, hair: ['short', 'bald'], extra: 'bag' },
  kid: { h: 11, slim: true, hair: ['short', 'capback'], extra: 'pack' },
  punk: { h: 16, hair: ['mohawk', 'spiky'], trim: true },
  suit: { h: 16, sleeves: true, tie: true, hair: ['short', 'bald'], extra: 'case' },
  elder: { h: 14, stoop: true, sleeves: true, coat: 1, hair: ['hat', 'bald'], extra: 'cane' },
  cyber: { h: 16, sleeves: true, visor: true, trim: true, hair: ['short', 'long'] },
  vendor: { h: 16, hair: ['cap', 'bandana'], extra: 'apron' },
  courier: { h: 16, shorts: true, hair: ['helmet', 'capback'], extra: 'pack' },
  android: { h: 16, metal: true, eyes: true, sleeves: true, trim: true, hair: ['bald', 'bald'] },
  robe: { h: 16, coat: 2, hair: ['bald', 'hood'] },
  worker: { h: 16, sleeves: true, hivis: true, hair: ['hardhat', 'hardhat'], extra: 'pack' },
  cop: { h: 16, sleeves: true, badge: true, hair: ['cap', 'helmet'] },
};
const MK = { top: '#ffffff', bot: '#ff00ff', hair: '#00ffff', skin: '#ffff00', glow: '#00ff00' };
const INK = { shoe: '#1a1a24', bag: '#4a3524', kase: '#2a2a34', cane: '#7a5a32', apron: '#cfc6b4', metal: '#9a9cae', belt: '#101018', shirt: '#d8d8e0', tie: '#8a1c2a', brim: '#1a1a24' };
type Px = (fx: number, fy: number, w: number, h: number, col: string) => void;

/** One frame of one look into an 8×16 cell (px clips to it). */
function drawPerson(px: Px, L: Look, hair: Hair, extra: Look['extra'], f: number): void {
  const sit = f === 3 || f === 7;
  const skin = L.metal ? INK.metal : MK.skin;
  const sleeve = L.sleeves || L.coat ? MK.top : skin;
  const bodyW = L.wide ? 6 : L.slim ? 2 : 4;
  const bx = L.wide ? 1 : L.slim ? 3 : 2;
  const armL = bx - 1, armR = bx + bodyW;
  const hx = L.stoop ? 4 : 3; // the head's left column (the stooped lean forward)
  const crest = hair === 'mohawk' || hair === 'spiky' ? 2 : 0;
  const headRows = hair === 'hat' || hair === 'hardhat' ? 4 : 3;
  const TH = L.slim ? 4 : 6; // the torso
  // the head: hair or hat over a face; returns the row under it
  const head = (hy: number): number => {
    const faceY = hy + (hair === 'bald' || hair === 'mohawk' ? 0 : headRows - 2);
    switch (hair) {
      case 'short': px(hx, hy, 3, 1, MK.hair); break;
      case 'long': px(hx, hy, 3, 1, MK.hair); px(hx - 1, hy + 1, 1, 3, MK.hair); px(hx + 3, hy + 1, 1, 3, MK.hair); break;
      case 'bun': px(hx, hy, 3, 1, MK.hair); px(hx + 3, hy, 1, 1, MK.hair); break;
      case 'cap': px(hx, hy, 4, 1, MK.hair); break;
      case 'capback': px(hx - 1, hy, 4, 1, MK.hair); break;
      case 'helmet': px(hx, hy, 3, 1, MK.hair); px(hx, hy + 1, 1, 1, MK.hair); px(hx + 2, hy + 1, 1, 1, MK.hair); break;
      case 'hat': px(hx, hy, 3, 1, MK.hair); px(hx - 1, hy + 1, 5, 1, INK.brim); break;
      case 'hardhat': px(hx, hy, 3, 1, MK.hair); px(hx - 1, hy + 1, 5, 1, MK.hair); break;
      case 'hood': px(hx - 1, hy, 5, 1, MK.top); px(hx - 1, hy + 1, 1, 2, MK.top); px(hx + 3, hy + 1, 1, 2, MK.top); break;
      case 'bandana': px(hx, hy, 3, 1, MK.hair); px(hx + 3, hy + 1, 1, 1, MK.hair); break;
      case 'mohawk': px(hx + 1, hy - 2, 1, 2, MK.hair); px(hx + 1, hy - 2, 1, 1, MK.glow); px(hx + 1, hy, 1, 1, MK.hair); break;
      case 'spiky': px(hx, hy - 1, 1, 1, MK.hair); px(hx + 2, hy - 1, 1, 1, MK.hair); px(hx, hy, 3, 1, MK.hair); break;
      case 'bald': break;
    }
    px(hx, faceY, 3, hy + headRows - faceY, skin); // the face (a bald head is all face)
    if (hair === 'mohawk') px(hx + 1, hy, 1, 1, MK.hair);
    if (hair === 'helmet') px(hx + 1, hy + 1, 1, 1, skin);
    if (L.visor) px(hx, faceY, 3, 1, MK.glow);
    if (L.eyes) { px(hx, faceY, 1, 1, MK.glow); px(hx + 2, faceY, 1, 1, MK.glow); }
    return hy + headRows;
  };
  if (sit) { // seated: a shorter figure, the legs out in front, the feet on the ground
    const hy = 16 - (headRows + (TH - 2) + 2 + 1);
    const ty = head(hy);
    px(bx, ty, bodyW, TH - 2, MK.top);
    px(armL, ty + 1, 1, TH - 3, sleeve); px(armR, ty + 1, 1, TH - 3, sleeve);
    px(armL, ty + TH - 3, 1, 1, skin); px(armR, ty + TH - 3, 1, 1, skin);
    if (L.tie) px(bx + 1, ty + 1, 1, 2, INK.tie);
    px(bx, ty + TH - 2, bodyW + 2, 2, L.coat === 2 ? MK.top : MK.bot); // the thighs, out
    px(bx + bodyW, 15, 2, 1, INK.shoe);
    if (f === 7) px(armR - 1, ty + 1, 2, 1, MK.glow); // the phone, in the lap's light
    return;
  }
  const top = 16 - L.h;
  const ty = head(top + crest);
  const legsY = ty + TH;
  px(bx, ty, bodyW, TH, MK.top); // the torso
  if (L.tie) { px(bx + 1, ty, 2, 1, INK.shirt); px(bx + 2, ty + 1, 1, 3, INK.tie); }
  if (L.trim) { px(bx, ty + 2, 1, 1, MK.glow); px(bx + bodyW - 1, ty + 4, 1, 1, MK.glow); }
  if (L.eyes) px(bx + 1, ty + 2, 2, 1, MK.glow); // a chest light
  if (L.hivis) { px(bx, ty + 1, bodyW, 1, MK.glow); px(bx, ty + 3, bodyW, 1, MK.glow); }
  if (L.badge) { px(bx + 2, ty + 1, 1, 1, MK.glow); px(bx, ty + TH - 1, bodyW, 1, INK.belt); }
  if (extra === 'apron') px(bx + 1, ty + 2, bodyW - 2, TH, INK.apron);
  // the arms, by the pose
  const arm = (col: number, y0: number, n: number) => { px(col, y0, 1, n - 1, sleeve); px(col, y0 + n - 1, 1, 1, skin); };
  switch (f) {
    case 0: arm(armL, ty + 2, 4); arm(armR, ty, 4); break; // walking: a swing
    case 1: arm(armL, ty, 4); arm(armR, ty + 2, 4); break;
    case 4: // talking: a hand up
      arm(armL, ty + 1, 4);
      if (armR + 1 <= 7) { px(armR, ty + 1, 1, 2, sleeve); px(armR + 1, ty - 1, 1, 2, skin); }
      else { px(armR, ty - 2, 1, 4, sleeve); px(armR, ty - 2, 1, 1, skin); }
      break;
    case 5: // the phone, held up to the face, lit
      arm(armL, ty + 1, 4);
      px(armR, ty + 2, 1, 2, sleeve); px(armR - 1, ty + 1, 1, 1, skin); px(armR - 1, ty, 2, 1, MK.glow);
      break;
    case 6: // vending: both hands on the counter
      px(armL, ty + 1, 1, 3, sleeve); px(armR, ty + 1, 1, 3, sleeve);
      px(armL + 1, ty + 4, 1, 1, skin); px(armR - 1, ty + 4, 1, 1, skin);
      break;
    default: arm(armL, ty + 1, 4); arm(armR, ty + 1, 4); break; // standing
  }
  // the legs, by the pose: apart, one lifted, together; a coat or a skirt over the top of them
  const legCol = L.shorts ? MK.skin : MK.bot;
  const legW = L.slim ? 1 : L.wide ? 3 : 2;
  const [lx, rx] = f === 0 ? [bx - 1, bx + bodyW - legW + 1] : [bx, bx + bodyW - legW];
  const lift = f === 1 ? 1 : 0;
  px(lx, legsY, legW, 15 - legsY - lift, legCol); px(rx, legsY, legW, 15 - legsY, legCol);
  if (L.shorts) { px(lx, legsY, legW, 3, MK.bot); px(rx, legsY, legW, 3, MK.bot); }
  if (L.coat === 1) px(bx, legsY, bodyW, 3, MK.top);
  if (L.coat === 2) { px(bx, legsY, bodyW, 15 - legsY, MK.top); px(bx - 1, 13, bodyW + 2, 2, MK.top); }
  if (L.skirt) { px(bx, legsY, bodyW, 1, MK.top); px(bx - 1, legsY + 1, bodyW + 2, 2, MK.top); }
  px(lx, 15 - lift, legW, 1, INK.shoe); px(rx, 15, legW, 1, INK.shoe);
  // their thing
  switch (extra) {
    case 'bag': px(Math.min(7, armR + 1), legsY - 2, 1, 2, INK.bag); break;
    case 'case': px(armR, ty + 5, Math.min(2, 8 - armR), 3, INK.kase); break;
    case 'cane': px(Math.min(7, armR + 1), ty + 4, 1, 11 - ty, INK.cane); px(Math.min(7, armR + 1), ty + 4, 1, 1, skin); break;
    case 'pack': px(Math.max(0, armL - 1), ty, 1, 5, INK.bag); break;
    default: break;
  }
}

function peopleTexture(): CanvasTexture {
  const ROWS = CAST.length * LOOKS_PER_KIND;
  const c = document.createElement('canvas');
  c.width = 64; c.height = ROWS * 16;
  const x = c.getContext('2d')!;
  CAST.forEach((kind, ki) => {
    const L = LOOKS[kind.name];
    for (let v = 0; v < LOOKS_PER_KIND; v++) {
      const hair = L.hair[v % 2], extra = v >= 2 ? L.extra : undefined;
      for (let fr = 0; fr < 8; fr++) {
        const ox = fr * 8, oy = (ki * LOOKS_PER_KIND + v) * 16;
        const px: Px = (fx, fy, w, h, col) => { // clipped to the cell
          const x0 = Math.max(0, fx), y0 = Math.max(0, fy), x1 = Math.min(8, fx + w), y1 = Math.min(16, fy + h);
          if (x1 <= x0 || y1 <= y0) return;
          x.fillStyle = col; x.fillRect(ox + x0, oy + y0, x1 - x0, y1 - y0);
        };
        drawPerson(px, L, hair, extra, fr);
      }
    }
  });
  return asPixelTex(new CanvasTexture(c));
}

/** The stadium's seats: blocks of the two clubs' colours around the tiers. */
function seatTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 8;
  const x = c.getContext('2d')!;
  const cols = ['#8a2620', '#6e6a60', '#24589e', '#6e6a60']; // dim: a tier a few units off the deck once read as a white wall
  for (let i = 0; i < 16; i++) { x.fillStyle = cols[i % 4]; x.fillRect(i * 8, 0, 8, 8); }
  x.fillStyle = '#0d1020';
  for (let i = 0; i < 128; i += 2) x.fillRect(i, 3, 1, 1); // the seat rows' shadow
  const t = asPixelTex(new CanvasTexture(c));
  t.wrapS = RepeatWrapping;
  return t;
}

/** The pitch: floodlit green with its lines. */
function pitchTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 152; c.height = 96;
  const x = c.getContext('2d')!;
  x.fillStyle = '#2b7a44'; x.fillRect(0, 0, 152, 96);
  x.fillStyle = '#2f8a4c';
  for (let i = 0; i < 152; i += 16) x.fillRect(i, 0, 8, 96); // mown stripes
  x.strokeStyle = '#dfe8dc'; x.lineWidth = 2;
  x.strokeRect(6, 6, 140, 84);
  x.beginPath(); x.moveTo(76, 6); x.lineTo(76, 90); x.stroke();
  x.beginPath(); x.arc(76, 48, 12, 0, Math.PI * 2); x.stroke();
  x.strokeRect(6, 26, 22, 44); x.strokeRect(124, 26, 22, 44);
  x.strokeRect(6, 38, 8, 20); x.strokeRect(138, 38, 8, 20);
  return asPixelTex(new CanvasTexture(c));
}

/** THE BILLBOARD ATLAS (owner: the plates' giant ads — a face, an eye, a koi): two dozen designs, six by four
 *  cells of 96 × 64, abstract pixel art with glyph rows, never text. */
function billboardAtlas(rand: () => number): CanvasTexture {
  const CW = 96, CH = 64, COLS = 6;
  const c = document.createElement('canvas');
  c.width = CW * COLS; c.height = CH * Math.ceil(ARTS / COLS);
  const x = c.getContext('2d')!;
  const rect = (px: number, py: number, w: number, h: number, col: string) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const disc = (cx: number, cy: number, r: number, col: string) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
  const tri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, col: string) => { x.fillStyle = col; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.lineTo(cx, cy); x.closePath(); x.fill(); };
  const glyphs = (px: number, py: number, w: number, col: string) => { x.fillStyle = col; for (let g = 0; g < Math.floor(w / 6); g++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (rand() < 0.6) x.fillRect(px + g * 6 + i * 2, py + j * 2, 2, 2); };
  const designs: ((o: number, p: number) => void)[] = [
    (o, p) => { rect(o, p, CW, CH, '#08101e'); x.save(); x.translate(o + 48, p + 30); x.scale(1.7, 1); disc(0, 0, 18, '#f4f1e8'); x.restore(); disc(o + 48, p + 30, 12, '#7de8ff'); disc(o + 48, p + 30, 6, '#050810'); disc(o + 52, p + 26, 2, '#ffffff'); glyphs(o + 8, p + 54, 80, '#7de8ff'); },
    (o, p) => { rect(o, p, CW, CH, '#160a1e'); disc(o + 40, p + 26, 16, '#ff4fd8'); rect(o + 40, p + 18, 12, 16, '#ff4fd8'); rect(o + 24, p + 42, 36, 22, '#ff4fd8'); rect(o + 58, p + 20, 3, 3, '#160a1e'); glyphs(o + 62, p + 12, 30, '#ffffff'); },
    (o, p) => { rect(o, p, CW, CH, '#081a3a'); for (let i = 0; i < 5; i++) rect(o + 4 + i * 18, p + 50 + (i % 2) * 4, 12, 1, '#4fa3ff'); x.save(); x.translate(o + 44, p + 28); x.scale(1.8, 1); disc(0, 0, 12, '#ff9a4d'); x.restore(); tri(o + 66, p + 28, o + 84, p + 14, o + 84, p + 42, '#ff9a4d'); disc(o + 30, p + 24, 2, '#08101e'); rect(o + 36, p + 20, 12, 3, '#ffd23f'); },
    (o, p) => { rect(o, p, CW, CH, '#b0222a'); rect(o + 36, p + 30, 26, 26, '#ffd23f'); for (let i = 0; i < 4; i++) rect(o + 36 + i * 6.5, p + 12, 4, 20, '#ffd23f'); rect(o + 62, p + 24, 12, 4, '#ffd23f'); glyphs(o + 6, p + 6, 26, '#ffffff'); },
    (o, p) => { rect(o, p, CW, CH, '#0c2a20'); rect(o + 40, p + 18, 16, 42, '#3dff8f'); rect(o + 44, p + 8, 8, 12, '#3dff8f'); rect(o + 40, p + 34, 16, 10, '#f4f1e8'); glyphs(o + 6, p + 54, 30, '#3dff8f'); },
    (o, p) => { rect(o, p, CW, CH, '#101a2e'); x.save(); x.beginPath(); x.arc(o + 48, p + 34, 30, Math.PI, 0); x.closePath(); x.clip(); for (let i = 0; i < 6; i++) rect(o + 18 + i * 10, p + 4, 10, 30, i % 2 ? '#ff3b3b' : '#f4f1e8'); x.restore(); rect(o + 47, p + 34, 2, 22, '#f4f1e8'); },
    (o, p) => { rect(o, p, CW, CH, '#050810'); for (let r = 26; r > 4; r -= 6) disc(o + 48, p + 32, r, r % 12 === 2 ? '#5df2ff' : '#050810'); glyphs(o + 6, p + 4, 40, '#5df2ff'); },
    (o, p) => { rect(o, p, CW, CH, '#050810'); for (let i = -6; i < 12; i++) { if (i % 2) continue; x.fillStyle = '#5df2ff'; x.beginPath(); x.moveTo(o + i * 12, p); x.lineTo(o + i * 12 + 12, p); x.lineTo(o + i * 12 + 42, p + CH); x.lineTo(o + i * 12 + 30, p + CH); x.closePath(); x.fill(); } },
    (o, p) => { for (let i = 0; i < 8; i++) rect(o, p + i * 8, CW, 8, ['#ff4fd8', '#ff9a4d', '#ffd23f', '#ff4fd8'][i % 4]); glyphs(o + 30, p + 28, 40, '#050810'); },
    (o, p) => { rect(o, p, CW, CH, '#1a1030'); disc(o + 34, p + 30, 16, '#ffd23f'); disc(o + 66, p + 30, 12, '#f4f1e8'); disc(o + 72, p + 26, 11, '#1a1030'); },
    (o, p) => { rect(o, p, CW, CH, '#ffd6ee'); disc(o + 38, p + 24, 12, '#ff2e63'); disc(o + 58, p + 24, 12, '#ff2e63'); tri(o + 27, p + 30, o + 69, p + 30, o + 48, p + 54, '#ff2e63'); },
    (o, p) => { const g = x.createLinearGradient(0, p, 0, p + CH); g.addColorStop(0, '#1a3a8a'); g.addColorStop(1, '#5a1a7a'); x.fillStyle = g; x.fillRect(o, p, CW, CH); for (let r = 0; r < 5; r++) glyphs(o + 6, p + 6 + r * 11, 84, r % 2 ? '#b79cff' : '#ffffff'); },
    (o, p) => { rect(o, p, CW, CH, '#8a1a1a'); rect(o + 14, p + 34, 68, 14, '#f4f1e8'); rect(o + 30, p + 24, 34, 12, '#f4f1e8'); disc(o + 28, p + 50, 5, '#050810'); disc(o + 68, p + 50, 5, '#050810'); glyphs(o + 6, p + 8, 40, '#ffd23f'); },
    (o, p) => { rect(o, p, CW, CH, '#7ab800'); disc(o + 48, p + 34, 20, '#050810'); tri(o + 30, p + 26, o + 26, p + 6, o + 44, p + 16, '#050810'); tri(o + 66, p + 26, o + 70, p + 6, o + 52, p + 16, '#050810'); disc(o + 40, p + 32, 3, '#C8FF00'); disc(o + 56, p + 32, 3, '#C8FF00'); },
    (o, p) => { rect(o, p, CW, CH, '#2a1608'); x.save(); x.beginPath(); x.arc(o + 48, p + 34, 26, 0, Math.PI); x.closePath(); x.clip(); rect(o, p, CW, CH, '#ffb36b'); x.restore(); rect(o + 22, p + 32, 52, 4, '#f4f1e8'); for (let i = 0; i < 3; i++) rect(o + 36 + i * 10, p + 10 + (i % 2) * 4, 3, 16, '#f4f1e8'); },
    (o, p) => { rect(o, p, CW, CH, '#08102a'); for (let i = 0; i < 20; i++) rect(o + Math.floor(rand() * CW), p + Math.floor(rand() * CH), 1, 1, '#ffffff'); rect(o + 42, p + 20, 12, 30, '#f4f1e8'); tri(o + 42, p + 20, o + 54, p + 20, o + 48, p + 6, '#ff3b3b'); tri(o + 42, p + 50, o + 34, p + 58, o + 42, p + 40, '#ff3b3b'); tri(o + 54, p + 50, o + 62, p + 58, o + 54, p + 40, '#ff3b3b'); },
    (o, p) => { rect(o, p, CW, CH, '#101a2e'); rect(o + 24, p + 12, 48, 44, '#8a90a0'); rect(o + 32, p + 22, 12, 10, '#5df2ff'); rect(o + 52, p + 22, 12, 10, '#5df2ff'); rect(o + 36, p + 42, 24, 4, '#050810'); rect(o + 46, p + 4, 4, 8, '#8a90a0'); },
    (o, p) => { rect(o, p, CW, CH, '#050810'); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { x.save(); x.translate(o + 8 + i * 16, p + 8 + j * 16); x.rotate(Math.PI / 4); rect(-5, -5, 10, 10, (i + j) % 2 ? '#ff4fd8' : '#5df2ff'); x.restore(); } },
    (o, p) => { rect(o, p, CW, CH, '#050810'); x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(o + 54, p + 4); x.lineTo(o + 34, p + 36); x.lineTo(o + 48, p + 36); x.lineTo(o + 40, p + 60); x.lineTo(o + 64, p + 26); x.lineTo(o + 50, p + 26); x.closePath(); x.fill(); },
    (o, p) => { rect(o, p, CW, CH, '#1a0a1e'); tri(o + 30, p + 10, o + 66, p + 10, o + 48, p + 36, '#ff4fd8'); rect(o + 47, p + 36, 2, 16, '#ff4fd8'); rect(o + 38, p + 52, 20, 3, '#ff4fd8'); disc(o + 40, p + 14, 3, '#3dff8f'); },
    (o, p) => { rect(o, p, CW, CH, '#050810'); for (let r = 0; r < 5; r++) rect(o + 20 + r * 6, p + 4 + r * 6, 56 - r * 12, 56 - r * 12, r % 2 ? '#050810' : '#ff9a4d'); },
    (o, p) => { rect(o, p, CW, CH, '#081a3a'); x.fillStyle = '#5df2ff'; x.beginPath(); x.moveTo(o, p + 40); for (let i = 0; i <= CW; i += 4) x.lineTo(o + i, p + 40 + Math.sin(i / 8) * 8); x.lineTo(o + CW, p + CH); x.lineTo(o, p + CH); x.closePath(); x.fill(); glyphs(o + 6, p + 6, 60, '#ffffff'); },
    (o, p) => { rect(o, p, CW, CH, '#2a0a3a'); x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(o + 20, p + 50); x.lineTo(o + 20, p + 22); x.lineTo(o + 34, p + 36); x.lineTo(o + 48, p + 14); x.lineTo(o + 62, p + 36); x.lineTo(o + 76, p + 22); x.lineTo(o + 76, p + 50); x.closePath(); x.fill(); },
    (o, p) => { rect(o, p, CW, CH, '#0a3a3a'); rect(o + 22, p + 40, 52, 24, '#3dffc8'); disc(o + 48, p + 26, 14, '#ffe0c0'); rect(o + 30, p + 8, 36, 16, '#1a0a0a'); rect(o + 30, p + 8, 6, 30, '#1a0a0a'); rect(o + 60, p + 8, 6, 30, '#1a0a0a'); rect(o + 66, p + 12, 10, 3, '#ff3b3b'); },
  ];
  designs.forEach((d, i) => {
    const o = (i % COLS) * CW, p = Math.floor(i / COLS) * CH;
    x.save(); x.beginPath(); x.rect(o, p, CW, CH); x.clip();
    d(o, p);
    x.restore();
  });
  return asPixelTex(new CanvasTexture(c));
}

/** A hologram's logo: rings and a glyph, cyan over magenta. */
function logoTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, 64, 64);
  for (const [r, col] of [[30, '#5df2ff'], [26, 'rgba(0,0,0,0)'], [20, '#ff4fd8'], [16, 'rgba(0,0,0,0)']] as [number, string][]) {
    if (col === 'rgba(0,0,0,0)') { x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; } else { x.globalCompositeOperation = 'source-over'; x.fillStyle = col; }
    x.beginPath(); x.arc(32, 32, r, 0, Math.PI * 2); x.fill();
  }
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (rand() < 0.6) x.fillRect(26 + i * 4, 26 + j * 4, 3, 3);
  return asPixelTex(new CanvasTexture(c));
}

/** A condenser's face: dark louvres, a fan disc. */
function grilleTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.fillStyle = '#5a6070'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#2a2e38';
  for (let y = 1; y < 16; y += 3) x.fillRect(1, y, 14, 1);
  x.fillStyle = '#1a1c24'; x.beginPath(); x.arc(8, 8, 4.5, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#3a3e4a'; x.beginPath(); x.arc(8, 8, 1.5, 0, Math.PI * 2); x.fill();
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

function glowTexture(color: string, soft = false): CanvasTexture {
  const c = document.createElement('canvas');
  const S = soft ? 64 : 32, h = S / 2;
  c.width = c.height = S;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(h, h, 1, h, h, h - 1);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  if (soft) { // filtered and mipmapped: a decal on the ground far off must not sparkle (owner: the street lights flickered)
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    return t;
  }
  return asPixelTex(new CanvasTexture(c));
}

/** A roof, greyscale, tinted by the look: panel joints, a rim, plant boxes
 *  and vents (owner: the roofs read as cardboard from the air by day). */
function roofTexture(rand: () => number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 700; i++) { x.fillStyle = rand() < 0.5 ? '#8a8a8a' : '#a8a8a8'; x.fillRect(Math.floor(rand() * 64), Math.floor(rand() * 64), 1, 1); }
  x.fillStyle = '#7c7c7c';
  for (let i = 16; i < 64; i += 16) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); }
  x.fillStyle = '#6a6a6a'; x.fillRect(0, 0, 64, 2); x.fillRect(0, 62, 64, 2); x.fillRect(0, 0, 2, 64); x.fillRect(62, 0, 2, 64); // the rim
  for (let i = 0, n = 3 + Math.floor(rand() * 4); i < n; i++) { // plant boxes with a shadow
    const px = 6 + Math.floor(rand() * 46), py = 6 + Math.floor(rand() * 46), w = 4 + Math.floor(rand() * 6), h = 4 + Math.floor(rand() * 5);
    x.fillStyle = '#585858'; x.fillRect(px + 1, py + 1, w, h);
    x.fillStyle = '#c4c4c4'; x.fillRect(px, py, w, h);
    x.fillStyle = '#8c8c8c'; x.fillRect(px + 1, py + 1, w - 2, 1);
  }
  for (let i = 0; i < 5; i++) { x.fillStyle = '#5a5a5a'; x.fillRect(4 + Math.floor(rand() * 56), 4 + Math.floor(rand() * 56), 2, 2); } // vents
  return asPixelTex(new CanvasTexture(c));
}

/** A vehicle's wrap: a side (a window band, wheels), an end (windscreen,
 *  lights, bumper) and a roof — white where the body colour goes (owner:
 *  the vehicles read as cardboard boxes). */
function carTextures(): { side: CanvasTexture; end: CanvasTexture; top: CanvasTexture } {
  const make = (draw: (x: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 16;
    const x = c.getContext('2d')!;
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 32, 16);
    draw(x);
    return asPixelTex(new CanvasTexture(c));
  };
  const side = make((x) => {
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 32, 3); // the roof line
    x.fillStyle = '#1c2436'; x.fillRect(5, 3, 22, 5); // the window band
    x.fillStyle = '#ffffff'; for (let px = 11; px < 27; px += 7) x.fillRect(px, 3, 1, 5); // pillars
    x.fillStyle = '#d0d0d0'; x.fillRect(0, 9, 32, 1); // a trim line
    x.fillStyle = '#2a2a30'; x.fillRect(0, 14, 32, 2); // the skirt
    for (const wx of [7, 25]) { // the wheels
      x.fillStyle = '#0a0a0e'; x.fillRect(wx - 3, 10, 6, 6); x.fillRect(wx - 4, 11, 8, 4);
      x.fillStyle = '#7a7a82'; x.fillRect(wx - 1, 12, 2, 2);
    }
  });
  const end = make((x) => {
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 32, 3);
    x.fillStyle = '#1c2436'; x.fillRect(4, 3, 24, 5); // the screen
    x.fillStyle = '#3a3a42'; x.fillRect(2, 9, 28, 1);
    x.fillStyle = '#fff4d6'; x.fillRect(3, 10, 6, 3); x.fillRect(23, 10, 6, 3); // the lights
    x.fillStyle = '#2a2a30'; x.fillRect(0, 13, 32, 3); // the bumper
    x.fillStyle = '#4a4a52'; x.fillRect(12, 10, 8, 3); // the grille
  });
  const top = make((x) => {
    x.fillStyle = '#f2f2f2'; x.fillRect(4, 3, 24, 10); // a lighter panel
    x.fillStyle = '#1c2436'; x.fillRect(24, 2, 4, 12); x.fillRect(4, 3, 3, 10); // the screens, seen from above
    x.fillStyle = '#d8d8d8'; x.fillRect(0, 7, 32, 1);
  });
  return { side, end, top };
}

/** A headlight's throw on the road: bright and narrow by the car (the top),
 *  widening and fading ahead. */
function headlightTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 32;
  const x = c.getContext('2d')!;
  for (let r = 0; r < 32; r++) {
    const w = 5 + r * 0.32, a = Math.pow(1 - r / 32, 1.6);
    x.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    x.fillRect(8 - w / 2, r, w, 1);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
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
/** Pixel clouds (owner: by day they read as grey slabs): soft rounded puffs — overlapping ellipses with a
 *  radial fall-off to nothing, a lit crown, a darker belly — greyscale, tinted by the look; `low` makes the
 *  dark silhouette tier that sits against the horizon glow. */
function cloudTexture(rand: () => number, low: boolean): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 48;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, 160, 48);
  const body = low ? 138 : 224, crown = low ? 190 : 255, belly = low ? 96 : 168; // the high tier bright: a cloud, not smoke
  const grey = (v: number, a: number) => `rgba(${v},${v},${v},${a})`;
  const blobs = 6 + Math.floor(rand() * 5);
  for (let b = 0; b < blobs; b++) {
    const bx = 18 + rand() * 124, by = 22 + (rand() - 0.5) * 12, rw = 14 + rand() * 24, rh = 6 + rand() * 9;
    x.save();
    x.translate(bx, by); x.scale(rw / rh, 1);
    const g = x.createRadialGradient(0, -rh * 0.25, 0, 0, 0, rh);
    g.addColorStop(0, grey(crown, 0.95));
    g.addColorStop(0.55, grey(body, 0.85));
    g.addColorStop(0.85, grey(belly, 0.5));
    g.addColorStop(1, grey(belly, 0));
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, rh, 0, Math.PI * 2); x.fill();
    x.restore();
  }
  // a flat belly: the underside sheared off, a shade darker
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = '#000'; x.fillRect(0, 40, 160, 8);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = grey(belly, 0.35); x.fillRect(0, 30, 160, 10);
  x.globalCompositeOperation = 'source-over';
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = false; // soft, not blocky: a cloud
  return t;
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

/** One block of ground, the street centred (owner: road markings and road
 *  textures clear at every time of day): asphalt with a bright double
 *  yellow, dashed white lane lines where the lanes really are (city-traffic
 *  OFFSETS), solid white edge lines, zebra crossings and stop lines at the
 *  crossing, manholes and drains; kerbed pavements paved a unit square; the
 *  lots' stone in the corners. Tiled every G units with lot centres on the
 *  tile corners, 8 texels a unit, mipmapped so the paint holds to the
 *  horizon without sparkle. Returns the colour and its GLOW twin (the same
 *  picture lifted toward white) so the streets' own light by night carries
 *  the paint brighter than the asphalt. */
function groundTextures(rand: () => number, aniso: number): { map: CanvasTexture; glow: CanvasTexture } {
  const S = 8, T = G * S;
  const c = document.createElement('canvas');
  c.width = c.height = T;
  const x = c.getContext('2d')!;
  const mid = T / 2, half = (STREET / 2) * S, road = (ROAD / 2) * S;
  // the lots' ground: a mid stone with a coarse grid (the alleys and yards show it)
  x.fillStyle = '#4c5062'; x.fillRect(0, 0, T, T);
  x.fillStyle = '#42465a';
  for (let i = 0; i < T; i += 2 * S) { x.fillRect(i, 0, 1, T); x.fillRect(0, i, T, 1); }
  // the pavements: slabs a unit square
  x.fillStyle = '#6c7082';
  x.fillRect(mid - half, 0, half * 2, T); x.fillRect(0, mid - half, T, half * 2);
  x.fillStyle = '#5c6074';
  for (let i = 0; i < T; i += S) {
    x.fillRect(mid - half, i, half * 2, 1); x.fillRect(i, mid - half, 1, half * 2);
  }
  for (let j = 0; j <= half * 2; j += S) { x.fillRect(mid - half + j, 0, 1, T); x.fillRect(0, mid - half + j, T, 1); }
  // the kerb stones: a light line the road's whole length
  x.fillStyle = '#8e92a6';
  for (const k of [mid - road - 2, mid + road]) { x.fillRect(k, 0, 2, T); x.fillRect(0, k, T, 2); }
  // the asphalt, patched and seamed
  x.fillStyle = '#3e4150';
  x.fillRect(mid - road, 0, road * 2, T); x.fillRect(0, mid - road, T, road * 2);
  for (let i = 0; i < 26; i++) {
    x.fillStyle = rand() < 0.5 ? '#383b49' : '#454858'; x.globalAlpha = 0.85;
    const a = Math.floor(rand() * T), b = mid - road + Math.floor(rand() * (road * 2 - 3 * S));
    const w = S * (2 + Math.floor(rand() * 5)), h = S * (1 + Math.floor(rand() * 3));
    if (rand() < 0.5) x.fillRect(b, a, w, h); else x.fillRect(a, b, h, w);
  }
  x.globalAlpha = 1;
  // the paint: a line `w` texels wide at `at` along both streets, dashed on/off (off 0 = solid), kept out of the crossing
  const clear = road + 5 * S; // the crossing, its crosswalks and its stop lines
  const paint = (color: string, at: number, w: number, on: number, off: number) => {
    x.fillStyle = color;
    for (let i = 0; i < T; i += on + off) {
      let i0 = i, i1 = Math.min(T, i + on);
      if (i1 > mid - clear && i0 < mid + clear) {
        if (i0 < mid - clear) { x.fillRect(at, i0, w, mid - clear - i0); x.fillRect(i0, at, mid - clear - i0, w); }
        if (i1 > mid + clear) { x.fillRect(at, mid + clear, w, i1 - mid - clear); x.fillRect(mid + clear, at, i1 - mid - clear, w); }
        continue;
      }
      x.fillRect(at, i0, w, i1 - i0); x.fillRect(i0, at, i1 - i0, w);
    }
  };
  const YELLOW = '#e6c042', WHITE = '#e8eaf0';
  paint(YELLOW, mid - 3, 2, T, 0); paint(YELLOW, mid + 1, 2, T, 0); // the double yellow
  const lane = Math.round(2.55 * S); // between the two lanes of a direction (city-traffic: 1.35 and 3.75 from the centre)
  paint(WHITE, mid - lane - 1, 2, 3 * S, 3 * S); paint(WHITE, mid + lane - 1, 2, 3 * S, 3 * S);
  paint(WHITE, mid - road + 2, 2, T, 0); paint(WHITE, mid + road - 4, 2, T, 0); // the edge lines
  // the crossing: zebra stripes over each arm, a stop line before each
  x.fillStyle = WHITE;
  for (const side of [-1, 1]) {
    const y0 = side > 0 ? mid + road + Math.round(0.5 * S) : mid - road - Math.round(3.5 * S);
    for (let k = mid - road + Math.round(0.3 * S); k < mid + road - Math.round(0.6 * S); k += Math.round(1.2 * S)) {
      x.fillRect(k, y0, Math.round(0.6 * S), 3 * S); x.fillRect(y0, k, 3 * S, Math.round(0.6 * S));
    }
    const s0 = side > 0 ? mid + road + 4 * S : mid - road - Math.round(4.4 * S);
    x.fillRect(mid - road, s0, road * 2, Math.round(0.4 * S)); x.fillRect(s0, mid - road, Math.round(0.4 * S), road * 2);
  }
  // manholes on the carriageway, drains at the kerbs
  x.fillStyle = '#2a2d3a';
  for (let i = 0; i < 6; i++) {
    const a = Math.floor(rand() * T), b = mid + (rand() - 0.5) * road * 1.2;
    if (Math.abs(a - mid) < clear + 2 * S) continue;
    x.beginPath(); x.arc(b, a, 0.55 * S, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(a, b, 0.55 * S, 0, Math.PI * 2); x.fill();
  }
  for (let i = 3 * S; i < T; i += 9 * S) {
    if (Math.abs(i - mid) < clear + S) continue;
    for (const k of [mid - road + 2, mid + road - 2 - Math.round(0.4 * S)]) { x.fillRect(k, i, Math.round(0.4 * S), S); x.fillRect(i, k, S, Math.round(0.4 * S)); }
  }
  // asphalt and paving grain
  for (let i = 0; i < 5200; i++) {
    x.fillStyle = rand() < 0.5 ? '#000000' : '#ffffff'; x.globalAlpha = 0.03 + rand() * 0.07;
    x.fillRect(Math.floor(rand() * T), Math.floor(rand() * T), 1 + Math.floor(rand() * 2), 1);
  }
  x.globalAlpha = 1;
  return { map: streetTex(c, aniso), glow: streetTex(glowTwin(c), aniso) };
}

/** The same picture lifted toward white: what a street emits by night, so
 *  its paint glows brighter than its asphalt. */
function glowTwin(c: HTMLCanvasElement): HTMLCanvasElement {
  const g = document.createElement('canvas');
  g.width = c.width; g.height = c.height;
  const x = g.getContext('2d')!;
  x.drawImage(c, 0, 0);
  x.fillStyle = '#ffffff'; x.globalAlpha = 0.45; x.fillRect(0, 0, g.width, g.height);
  return g;
}
/** A street texture: repeating, crisp up close (nearest), mipmapped and
 *  anisotropic into the distance so the paint holds without sparkle. */
function streetTex(c: HTMLCanvasElement, aniso: number): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = NearestFilter; t.minFilter = LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = Math.min(8, aniso);
  return t;
}

/** A strip of carriageway for the highway deck, the ramps and the diagonal
 *  boulevard, `width` units across: asphalt between solid white edge lines
 *  at ±edge, dashed white lane lines at the given offsets, a concrete
 *  median with yellow edges (or a double yellow) down the middle, kerb
 *  beyond the edges. Repeats every 12 units along u. Colour and glow twin. */
function roadStrip(width: number, lanes: number[], edge: number, median: number, centre: boolean, aniso: number): { map: CanvasTexture; glow: CanvasTexture } {
  const S = 8, L = 12 * S;
  const c = document.createElement('canvas');
  c.width = L; c.height = Math.round(width * S);
  const x = c.getContext('2d')!;
  const mid = c.height / 2;
  x.fillStyle = '#6c7082'; x.fillRect(0, 0, L, c.height);
  x.fillStyle = '#3e4150'; x.fillRect(0, Math.round(mid - edge * S), L, Math.round(2 * edge * S));
  x.fillStyle = '#e8eaf0';
  x.fillRect(0, Math.round(mid - edge * S) + 1, L, 2); x.fillRect(0, Math.round(mid + edge * S) - 3, L, 2);
  for (const o of lanes) for (const s of [-1, 1]) for (const d of [0, 6 * S]) x.fillRect(d, Math.round(mid + s * o * S) - 1, 3 * S, 2);
  if (median > 0) {
    x.fillStyle = '#7a7e90'; x.fillRect(0, Math.round(mid - median * S / 2), L, Math.round(median * S));
    x.fillStyle = '#e6c042'; x.fillRect(0, Math.round(mid - median * S / 2) - 2, L, 2); x.fillRect(0, Math.round(mid + median * S / 2), L, 2);
  } else if (centre) {
    x.fillStyle = '#e6c042'; x.fillRect(0, mid - 3, L, 2); x.fillRect(0, mid + 1, L, 2);
  }
  for (let i = 0; i < 900; i++) {
    x.fillStyle = i % 2 ? '#000000' : '#ffffff'; x.globalAlpha = 0.03 + ((i * 7919) % 100) / 1400;
    x.fillRect((i * 37) % L, (i * 53) % c.height, 1, 1);
  }
  x.globalAlpha = 1;
  const map = streetTex(c, aniso), glow = streetTex(glowTwin(c), aniso);
  map.wrapT = glow.wrapT = ClampToEdgeWrapping;
  return { map, glow };
}

/** THE ARTERIAL'S STRIP: asphalt about a concrete median with yellow edges (the piers stand in it), a dashed lane
 *  line between the lanes at 3.0 and 5.4, edge lines, kerb stones; the APRONS either side in a darker concrete
 *  with bay lines; the pavements' slabs beyond a second kerb, out to the building line. Repeats every 12 along u. */
function arterialStripTextures(aniso: number): { map: CanvasTexture; glow: CanvasTexture } {
  const S = 8, L = 12 * S, W = Math.round(2 * ARTERIAL_ROW * S);
  const c = document.createElement('canvas');
  c.width = L; c.height = W;
  const x = c.getContext('2d')!;
  const mid = W / 2, half = ARTERIAL.w / 2, apron = half + ARTERIAL.apron;
  const band = (a: number, b: number, color: string) => { // both sides, |lat| in [a, b)
    x.fillStyle = color;
    x.fillRect(0, Math.round(mid - b * S), L, Math.round((b - a) * S)); x.fillRect(0, Math.round(mid + a * S), L, Math.round((b - a) * S));
  };
  band(0, ARTERIAL_ROW, '#6c7082'); // the pavements' slabs
  x.fillStyle = '#5c6074'; for (let i = 0; i < L; i += S) { x.fillRect(i, 0, 1, W); } // slab joints
  band(0, apron + 0.5, '#585c6e'); // the aprons: a darker concrete
  x.fillStyle = '#4a4e60'; for (let i = 0; i < L; i += 6 * S) { x.fillRect(i, Math.round(mid - apron * S), 1, Math.round((apron - half - 0.5) * S)); x.fillRect(i, Math.round(mid + (half + 0.5) * S), 1, Math.round((apron - half - 0.5) * S)); } // bay lines
  band(apron - 0.2, apron + 0.5, '#8e92a6'); // the pavements' kerb stones
  band(half, half + 0.5, '#8e92a6'); // the carriageway's kerb stones
  band(0, half, '#3e4150'); // the asphalt
  band(0, 1.8, '#7a7e90'); // the median's concrete
  band(1.75, 1.95, '#e6c042'); // its yellow edges
  band(half - 0.35, half - 0.1, '#e8eaf0'); // the edge lines
  x.fillStyle = '#e8eaf0';
  for (const s of [-1, 1]) for (const d of [0, 6 * S]) x.fillRect(d, Math.round(mid + s * 4.2 * S) - 1, 3 * S, 2); // the lane line between 3.0 and 5.4
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = i % 2 ? '#000000' : '#ffffff'; x.globalAlpha = 0.03 + ((i * 7919) % 100) / 1400;
    x.fillRect((i * 37) % L, (i * 53) % W, 1, 1);
  }
  x.globalAlpha = 1;
  const map = streetTex(c, aniso), glow = streetTex(glowTwin(c), aniso);
  map.wrapT = glow.wrapT = ClampToEdgeWrapping;
  return { map, glow };
}
/** Plain asphalt with its grain, for the boxes of the six-way crossings; the glow twin lifts it like the streets'. */
function asphaltTextures(aniso: number): { map: CanvasTexture; glow: CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 96;
  const x = c.getContext('2d')!;
  x.fillStyle = '#3e4150'; x.fillRect(0, 0, 96, 96);
  for (let i = 0; i < 700; i++) {
    x.fillStyle = i % 2 ? '#000000' : '#ffffff'; x.globalAlpha = 0.03 + ((i * 7919) % 100) / 1400;
    x.fillRect((i * 37) % 96, (i * 53) % 96, 1, 1);
  }
  x.globalAlpha = 1;
  return { map: streetTex(c, aniso), glow: streetTex(glowTwin(c), aniso) };
}
/** A stairwell seen from above: steps descending into the dark toward −v, lit at the head. */
function stairsTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 96;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 12; i++) { // the head at the top (v = 1): bright treads fading to nothing at the bottom
    const k = i / 12;
    x.fillStyle = `rgb(${Math.round(120 - 110 * k)},${Math.round(126 - 116 * k)},${Math.round(150 - 138 * k)})`;
    x.fillRect(0, i * 8, 32, 6);
    x.fillStyle = '#05060f'; x.fillRect(0, i * 8 + 6, 32, 2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter; t.minFilter = LinearMipmapLinearFilter;
  return t;
}
/** The plaza's paving: light stone flags with a radial pattern, seamed. */
function pavingTexture(aniso: number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#8a8ea0'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#767a8c';
  for (let i = 0; i < 256; i += 16) { x.fillRect(i, 0, 1, 256); x.fillRect(0, i, 256, 1); }
  x.fillStyle = '#9ea2b4';
  for (let i = 0; i < 300; i++) { x.globalAlpha = 0.25; x.fillRect((i * 37) % 256, (i * 53) % 256, 6, 6); }
  x.globalAlpha = 1;
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(4, 4);
  t.magFilter = NearestFilter; t.minFilter = LinearMipmapLinearFilter; t.anisotropy = Math.min(4, aniso);
  return t;
}
/** A zebra crossing: white bars across u, clear between them. */
function zebraTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 16;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, 128, 16);
  x.fillStyle = '#e8eaf0';
  for (let i = 4; i < 128; i += 12) x.fillRect(i, 1, 6, 14);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter; t.minFilter = LinearMipmapLinearFilter;
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
  /** A stick for the free flight: x strafes (−1..1), y drives (−1..1), lift rises (−1..1); undefined leaves an axis as it is. */
  setStick(x?: number, y?: number, lift?: number): void;
  /** Verification handles: jump the free camera; advance n frames by hand
   *  (what the frame clock would do, minus the clock); read the pose. */
  warp(x: number, y: number, z: number, yaw: number, pitch: number): void;
  tick(n?: number): void;
  pose(): { x: number; y: number; z: number; yaw: number; pitch: number; mode: FlyMode; dir: number[] };
  /** The quality tier in force (far plane, fog, shadows, pixel size) — and a way to force one. */
  quality(): { tier: string; far: number; fog: number; shadows: boolean; pix: number };
  /** Verification: one frame rendered at a fixed size and read back as luma per pixel, row-major from the bottom
   *  (the pane may be hidden, which gives the canvas no size). */
  frame(w?: number, h?: number): number[];
  setQuality(t: number): void;
  /** Verification: what lives where — knots of talk, flyers, counts. */
  /** The time of day (city-sky.ts): eased over a couple of seconds, or at once. */
  setTime(t: TimeOfDay, instant?: boolean): void;
  time(): TimeOfDay;
  probe(): {
    people: number; cars: number; flyers: number; knots: number[][]; air: number[][]; pads: number[][]; kinds: number[]; lights: number[][]; look: string; blend: number; bleach: number;
    /** The signal heads and how many show green; the walkers on the catwalks and platforms; the first boats' positions; the trains' positions. */
    signals: [number, number]; catwalkers: number; boats: number[][]; trains: number[][];
  };
  /** The cast's sprite sheet, for inspection. */
  sheet(): HTMLCanvasElement;
}

export function mountCity3D(canvas: HTMLCanvasElement, seed: number): CityRide {
  const plan = planCity(seed);
  const rand = mulberry32(seed ^ 0x9e3779b9); // the renderer's own stream; the plan owns the seed
  const calm = reducedMotion();
  const scene = new Scene();
  (window as unknown as { rvlScene?: Scene }).rvlScene = scene; // verification: the scene graph, for the pane
  // what a LOOK (city-sky.ts) dims or scales: the lamps' glow, the neon, the stars, the point lights
  const dimmables: { m: { opacity: number }; base: number; floor: number; k: 'lamps' | 'stars' }[] = [];
  const scalables: { m: MeshBasicMaterial; floor: number }[] = [];
  const lampHeads: MeshLambertMaterial[] = []; // the lanterns' glow, by the look's lamps
  const dim = <T extends { opacity: number }>(m: T, k: 'lamps' | 'stars' = 'lamps', floor = 0): T => { dimmables.push({ m, base: m.opacity, floor, k }); return m; };
  let lampLevel = 1;
  let starLevel = 1;
  let fogMul = 1;
  let tier = startTier();
  const pixOf = (t: number) => (isMobile() ? 1 : TIERS[t].pix); // a phone's viewport is small: it renders at its own pixels
  let PIX = pixOf(tier);
  const fog = new FogExp2('#0c1826', TIERS[tier].fog);
  scene.fog = fog;

  const camera = new PerspectiveCamera(fov24(1), 1, 0.5, TIERS[tier].far); // near 0.5: depth precision for the decals far down the street
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.toneMapping = NeutralToneMapping; // a soft shoulder and NO toe: the shadows keep what light they have (owner: the city was in darkness)
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = TIERS[tier].shadows;
  renderer.shadowMap.type = PCFShadowMap;
  // CINEMATIC LIGHT (owner: contrast, shadow, highlights): a blue hemisphere
  // (sky above, the streets' sodium below) and the moon as a key light that
  // CASTS SHADOWS — its shadow camera rides with the eye. The facades keep
  // their baked windows as emissive light; the walls between them take the
  // moon and lose it in shadow.
  const hemi = new HemisphereLight('#4a6ac8', '#5a4030', 0.75); // the fill: the sky above, the streets' sodium bounce below (the look sets it)
  scene.add(hemi);
  const MOON = new Vector3(110, 400, 380); // higher than it was: a low moon laid every street in a tower's shadow
  const keyDir = MOON.clone().normalize(); // the key light's direction: the moon's, or a look's sun
  const moonLight = new DirectionalLight('#c4d3ff', 0.75); // the key: the moon by night, the sun by day (the look sets it)
  moonLight.castShadow = TIERS[tier].shadows;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.left = -230; moonLight.shadow.camera.right = 230;
  moonLight.shadow.camera.top = 230; moonLight.shadow.camera.bottom = -230;
  moonLight.shadow.camera.near = 20; moonLight.shadow.camera.far = 900;
  moonLight.shadow.bias = -0.0005;
  moonLight.shadow.normalBias = 0.5;
  moonLight.shadow.radius = 2;
  scene.add(moonLight, moonLight.target);
  const aimMoon = () => { // the shadow frustum follows the eye's ground focus
    camera.getWorldDirection(fwd);
    const fx = camera.position.x + fwd.x * 70, fz = camera.position.z + fwd.z * 70;
    moonLight.target.position.set(fx, 0, fz);
    moonLight.position.set(fx + keyDir.x * 340, keyDir.y * 340, fz + keyDir.z * 340);
  };
  const composer = new EffectComposer(renderer, lensTarget(2, 2));
  const blur = new MotionBlurPass(camera, calm ? 0.35 : 0.6);
  const lens = new LensPass();
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(blur);
  const bloom = new UnrealBloomPass(new Vector2(2, 2), 0.62, 0.42, 0.4);
  composer.addPass(bloom);
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  // -- sky: the dome rides with the camera like a skybox (owner: clouds
  // slid past during climbs when only x/z followed); the distant-city glow
  // ring stays at ground level and follows x/z only --------------------------
  const sky = new Group();
  scene.add(sky);
  // the dome is painted from the look (city-sky.ts); two domes crossfade when the time changes
  const skyTex = (look: SkyLook) => {
    const size = 256;
    const t = new DataTexture(paintSky(look, size), size, size, RGBAFormat);
    t.colorSpace = SRGBColorSpace;
    t.flipY = true;
    t.magFilter = LinearFilter; t.minFilter = LinearFilter; t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  const domeGeo = new SphereGeometry(640, 24, 20);
  const domeA = new Mesh(domeGeo, new MeshBasicMaterial({ map: skyTex(SKY.night), side: BackSide, fog: false, depthWrite: false }));
  const domeB = new Mesh(domeGeo, new MeshBasicMaterial({ map: null, side: BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0 }));
  domeB.visible = false;
  domeA.renderOrder = -2; domeB.renderOrder = -1; // the domes draw before every other transparent thing, whatever its distance
  sky.add(domeA, domeB);
  const nebulae: Sprite[] = [];
  const starsOf = (pos: Float32Array, size: number, tint: string, opacity = 1): Points => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return new Points(g, new PointsMaterial({ color: tint, size, sizeAttenuation: false, transparent: true, opacity, fog: false, depthWrite: false }));
  };
  const starsA = starsOf(starPositions(rand, 2600, 560, 630), 2.2, '#EDEDE6');
  const starsB = starsOf(starPositions(rand, 1100, 560, 630), 3.2, '#cfe6ff');
  const starsC = starsOf(starPositions(rand, 500, 560, 630), 2.0, '#ffd9a0');
  const band = starsOf(bandPositions(rand, 1500, 600, 0.3), 1.4, '#c9d2ff', 0.42);
  sky.add(starsA, starsB, starsC, band);
  for (const [color, th, sc] of [['#b79cff', 0.4, 520], ['#7de8ff', 2.0, 440], ['#ff5e7a', 3.6, 380]] as [string, number, number][]) {
    const p = bandPoint(th, 590);
    if (p.y < 60) continue;
    const s = new Sprite(new SpriteMaterial({
      map: glowTexture(color), transparent: true, opacity: 0.055, blending: AdditiveBlending, fog: false, depthWrite: false,
    }));
    s.position.copy(p);
    s.scale.set(sc, sc * 0.6, 1);
    dim(s.material, 'stars');
    nebulae.push(s);
    sky.add(s);
  }
  dim(starsC.material as PointsMaterial, 'stars');
  dim(band.material as PointsMaterial, 'stars');
  const moon = new Sprite(new SpriteMaterial({ map: moonTexture(), transparent: true, fog: false, depthWrite: false }));
  moon.position.copy(MOON);
  moon.scale.set(46, 46, 1);
  sky.add(moon);
  const moonMat = moon.material as SpriteMaterial;
  // the sun: a soft disc at the key's direction, shown by the day looks
  const sun = new Sprite(new SpriteMaterial({ map: glowTexture('#ffffff', true), transparent: true, opacity: 0, fog: false, depthWrite: false }));
  sky.add(sun);
  const sunMat = sun.material as SpriteMaterial;
  const clouds: Sprite[] = [];
  const lowCloud: boolean[] = [];
  const cloudAt = (low: boolean) => {
    const s = new Sprite(new SpriteMaterial({
      map: cloudTexture(rand, low), transparent: true,
      opacity: low ? 0.85 : 0.55 + rand() * 0.3, fog: false, depthWrite: false,
    }));
    const a = rand() < 0.7 ? rand() * Math.PI : rand() * Math.PI * 2;
    const r = 380 + rand() * 200; // inside the dome (640): a cloud past it vanished behind the crossfading dome at every time change
    s.position.set(Math.cos(a) * r, low ? 70 + rand() * 70 : 170 + rand() * 220, Math.sin(a) * r);
    s.scale.set(low ? 300 + rand() * 200 : 190 + rand() * 160, low ? 42 + rand() * 20 : 58 + rand() * 30, 1);
    clouds.push(s); lowCloud.push(low);
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
  const horizonMat = horizon.material as MeshBasicMaterial; // the clones share it
  for (let i = 0; i < 4; i++) {
    const h = horizon.clone();
    const a = (i / 4) * Math.PI * 2;
    h.position.set(Math.cos(a) * 520, 34, Math.sin(a) * 520); // past the fog of war: the far city's glow shows through it
    h.scale.set(1100, 96, 1);
    h.lookAt(0, 34, 0);
    horizonRing.add(h);
  }

  // -- the ground: streets with lane paint, kerbs and crosswalks; the canal;
  // the diagonal boulevard; the highway deck ---------------------------------
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const groundTex = groundTextures(rand, aniso);
  const GROUND = 106 * G; // a whole number of blocks: lot centres land on the tile corners
  // (Lambert, not a physical material: a street seen along its length mirrors every point light and the sky's
  // horizon at grazing angles — eighteen lamps' sheen summed to a white veil over the whole frame, measured)
  const groundMat = new MeshLambertMaterial({
    map: groundTex.map, emissiveMap: groundTex.glow, emissive: '#2c4a8e', emissiveIntensity: 1.5, // its own glow, in the look's colour, the paint brighter than the asphalt: the streets never fall to black
  });
  // two halves with the canal's slot between them (owner: the water lies 2.6 below the streets, between quay walls);
  // the UVs carry the tiling in block units, so both halves keep the lot centres on the tile corners
  const groundHalf = (xa: number, xb: number) => {
    const H = GROUND / 2;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([xa, 0, -H, xb, 0, -H, xb, 0, H, xa, 0, H]), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array([(xa + H) / G, 0, (xb + H) / G, 0, (xb + H) / G, GROUND / G, (xa + H) / G, GROUND / G]), 2));
    g.setAttribute('normal', new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    const m = new Mesh(g, groundMat);
    m.receiveShadow = true;
    scene.add(m);
  };
  groundHalf(-GROUND / 2, -CANAL.w / 2); groundHalf(CANAL.w / 2, GROUND / 2);
  const wallMat = new MeshLambertMaterial({ color: '#3e4456' });
  for (const s of [-1, 1]) { // the quay walls, their coping flush with the quays
    const wall = new Mesh(new BoxGeometry(0.7, -CANAL.water + 0.6, GROUND), wallMat);
    wall.position.set(s * (CANAL.w / 2 + 0.35), (CANAL.water - 0.6) / 2, 0);
    wall.receiveShadow = true;
    scene.add(wall);
  }
  const water = new Mesh(new PlaneGeometry(CANAL.w, GROUND), new MeshBasicMaterial({ color: '#040812' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = CANAL.water;
  scene.add(water);
  const waterMat = water.material as MeshBasicMaterial;
  const waterTex = waterTexture(rand);
  waterTex.repeat.set(1, GROUND / 64);
  const mirror = new Mesh(new PlaneGeometry(CANAL.w, GROUND), new MeshBasicMaterial({
    map: waterTex, transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false,
  }));
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = CANAL.water + 0.03;
  scene.add(mirror);
  // GROUND PATCHES (owner: no ghost roads): the lots' stone laid over every street band the arterial closed
  {
    const patchMat = new MeshLambertMaterial({ color: '#4c5062', emissive: '#2c4a8e', emissiveIntensity: 0.9 });
    const patches = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), patchMat, plan.patches.length);
    const o = new Object3D();
    plan.patches.forEach((p, j) => { o.position.set(p.x, 0.03, p.z); o.scale.set(p.w, 1, p.d); o.updateMatrix(); patches.setMatrixAt(j, o.matrix); });
    patches.instanceMatrix.needsUpdate = true; patches.receiveShadow = true;
    scene.add(patches);
  }
  const hlenR = Math.hypot(HIGHWAY.x1 - HIGHWAY.x0, HIGHWAY.z1 - HIGHWAY.z0);
  const hnxR = -(HIGHWAY.z1 - HIGHWAY.z0) / hlenR, hnzR = (HIGHWAY.x1 - HIGHWAY.x0) / hlenR; // the axis's left normal
  const streetMats: MeshLambertMaterial[] = []; // the laid roads, the deck, the ramps: lit and glowing with the ground
  const streetMat = (strip: { map: CanvasTexture; glow: CanvasTexture }, repeat: number) => {
    const map = strip.map.clone(), glow = strip.glow.clone();
    map.needsUpdate = true; glow.needsUpdate = true;
    map.repeat.set(repeat, 1); glow.repeat.set(repeat, 1);
    const m = new MeshLambertMaterial({ map, emissiveMap: glow, emissive: '#2c4a8e', emissiveIntensity: 1.8 });
    streetMats.push(m);
    return m;
  };
  const boulevardStrip = roadStrip(DIAGONAL.width + 4, [2.55], 4.9, 0, true, aniso); // two lanes a side (city-traffic OFFSETS.diagonal), its pavements past the edge lines
  const deckStrip = roadStrip(HIGHWAY.width, [2.6, 5.0], DECK_KERB - 0.1, 0.8, false, aniso); // three lanes a side about a median (OFFSETS.highway)
  const rampStrip = roadStrip(RAMP_W, [], RAMP_W / 2 - 0.4, 0, false, aniso); // one lane
  const arterialStrip = arterialStripTextures(aniso); // the carriageway about its median, the aprons, the pavements (OFFSETS.arterial)
  const laidRoad = (st: Street, y: number, width: number, strip = boulevardStrip) => {
    const m = new Mesh(new PlaneGeometry(st.len, width), streetMat(strip, st.len / 12));
    m.receiveShadow = true;
    m.position.set(st.x0 + st.dx * st.len / 2, y, st.z0 + st.dz * st.len / 2);
    m.rotation.y = Math.atan2(-st.dz, st.dx);
    m.rotateX(-Math.PI / 2);
    scene.add(m);
  };
  const deckDark = new MeshBasicMaterial({ color: '#0a0c1e' });
  const bridgeLamps: number[] = []; // the canal bridges' lamp poles and lanterns, lit below with the rail's lights
  const edge: number[] = []; // amber lights along every deck edge — the highway's and the ramps'
  const deckLights: number[] = []; // cold tubes under the deck, over the arterial
  for (const st of plan.streets) {
    if (st.kind === 'arterial') laidRoad(st, 0.05, 2 * ARTERIAL_ROW, arterialStrip);
    if (st.kind === 'diagonal') { // the boulevard's strip with its pavements, squared off at the avenue roads' kerbs (owner: its paint ran into the quay road)
      const half = DIAGONAL.width / 2 + 2, nx = -st.dz, nz = st.dx;
      const pts: number[] = [], uvs: number[] = [];
      for (const [side, t] of [[1, 'start'], [1, 'end'], [-1, 'end'], [-1, 'start']] as [number, string][]) {
        const ex = st.x0 + nx * side * half, ez = st.z0 + nz * side * half;
        const tt = t === 'start' ? (-24 - ez) / st.dz : (-24 - ex) / st.dx; // the avenue road's south kerb (z = −24) at the start, the quay road's west kerb (x = −24) at the end
        pts.push(ex + st.dx * tt, 0.05, ez + st.dz * tt); uvs.push(tt / 12, side > 0 ? 1 : 0);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
      g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
      g.setAttribute('normal', new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const m = new Mesh(g, streetMat(boulevardStrip, 1)); (m.material as MeshLambertMaterial).side = DoubleSide;
      m.receiveShadow = true;
      scene.add(m);
    }
    if (st.kind === 'highway') {
      const deck = new Mesh(new BoxGeometry(st.len, 0.8, st.width), [deckDark, deckDark, streetMat(deckStrip, st.len / 12), deckDark, deckDark, deckDark]);
      deck.receiveShadow = true;
      deck.position.set(st.x0 + st.dx * st.len / 2, HIGHWAY.y, st.z0 + st.dz * st.len / 2);
      deck.rotation.y = Math.atan2(-st.dz, st.dx);
      scene.add(deck);
      // PARAPETS (owner: no vehicle through the outer barrier): a wall along
      // each edge from the kerb (DECK_KERB, which the lanes respect) out to
      // the deck's edge, broken only where a ramp mounts the deck; the amber
      // lights ride the parapet tops
      const yawH = Math.atan2(-st.dz, st.dx);
      const rail = (st.width / 2 - DECK_KERB);
      for (const side of [-1, 1] as const) {
        const gaps: [number, number][] = [];
        for (const r of plan.streets) {
          if (r.kind !== 'ramp' || r.y !== r.y1 || r.y < 1) continue; // a taper: at deck level, diverging along the edge
          const lat = (r.x0 - st.x0) * -st.dz + (r.z0 - st.z0) * st.dx;
          if (Math.sign(lat) !== side) continue;
          const t0 = (r.x0 - st.x0) * st.dx + (r.z0 - st.z0) * st.dz, t1 = t0 + r.len * (r.dx * st.dx + r.dz * st.dz);
          gaps.push([Math.min(t0, t1) - 1, Math.max(t0, t1) + 1]);
        }
        gaps.sort((a, b) => a[0] - b[0]);
        const runs: [number, number][] = [];
        let from = 0;
        for (const [g0, g1] of gaps) { if (g0 > from) runs.push([from, g0]); from = Math.max(from, g1); }
        if (from < st.len) runs.push([from, st.len]);
        const lat = side * (DECK_KERB + rail / 2);
        for (const [a, b] of runs) {
          const wall = new Mesh(new BoxGeometry(b - a, 1.1, rail), deckDark);
          const tm = (a + b) / 2;
          wall.position.set(st.x0 + st.dx * tm - st.dz * lat, HIGHWAY.y + 0.95, st.z0 + st.dz * tm + st.dx * lat);
          wall.rotation.y = yawH;
          scene.add(wall);
          for (let t = a; t <= b; t += 3) edge.push(st.x0 + st.dx * t - st.dz * lat, HIGHWAY.y + 1.6, st.z0 + st.dz * t + st.dx * lat);
        }
      }
      // THE PIERS' CAPS (owner: the deck floated on sticks): a hammerhead across the axis on each of the plan's columns
      const caps = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({ color: '#4a4f62' }), plan.piers.length);
      const o = new Object3D();
      plan.piers.forEach((p, j) => {
        o.rotation.set(0, yawH, 0); o.position.set(p.x, HIGHWAY.y - 1.1, p.z); o.scale.set(2.4, 1.4, 14); o.updateMatrix(); caps.setMatrixAt(j, o.matrix);
      });
      caps.instanceMatrix.needsUpdate = true; caps.castShadow = true; caps.receiveShadow = true;
      scene.add(caps);
      for (let t = 5; t < st.len; t += 10) for (const s of [-1, 1]) deckLights.push(st.x0 + st.dx * t - st.dz * s * 5, HIGHWAY.y - 0.55, st.z0 + st.dz * t + st.dx * s * 5); // the tubes under the deck
    }
    if (st.kind === 'ramp' && st.y === st.y1) { // a TAPER at deck level or a SLIP at grade: a wedge from the deck's edge line (or the arterial's kerb line) out to the piece's outer edge, a parapet along the outer edge alone
      const side = Math.sign(arterialLat(st.x0, st.z0)) || 1;
      const inner = st.y > 1 ? HIGHWAY.width / 2 : ARTERIAL.w / 2;
      const y = st.y > 1 ? st.y : st.y + 0.03;
      const onInner = (x: number, z: number) => { const lat = arterialLat(x, z) - side * inner; return [x - hnxR * lat, z - hnzR * lat]; };
      const outer = (t: number) => [st.x0 + st.dx * t - st.dz * side * (RAMP_W / 2), st.z0 + st.dz * t + st.dx * side * (RAMP_W / 2)];
      const P0 = onInner(st.x0, st.z0), P1 = onInner(st.x0 + st.dx * st.len, st.z0 + st.dz * st.len), P2 = outer(st.len), P3 = outer(0);
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array([P0[0], y, P0[1], P1[0], y, P1[1], P2[0], y, P2[1], P3[0], y, P3[1]]), 3));
      g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, st.len / 12, 0, st.len / 12, 1, 0, 1]), 2));
      g.setAttribute('normal', new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const m = new Mesh(g, streetMat(rampStrip, 1)); (m.material as MeshLambertMaterial).side = DoubleSide;
      m.receiveShadow = true;
      scene.add(m);
      const w = new Mesh(new BoxGeometry(st.len + 0.3, 0.9, 0.3), deckDark); // the outer parapet
      w.position.set((P3[0] + P2[0]) / 2, y + 0.45, (P3[1] + P2[1]) / 2);
      w.rotation.y = Math.atan2(-st.dz, st.dx);
      scene.add(w);
      for (let t = 0; t <= st.len; t += 3) { const o = outer(t); edge.push(o[0], y + 0.5, o[1]); } // amber lights along the outer edge
    } else if (st.kind === 'ramp') { // a RUN: a chain of tilted deck pieces down the ramp's profile, parapets along both sides
      const N = Math.max(4, Math.round(st.len / 8));
      const top = streetMat(rampStrip, st.len / N / 12);
      for (let k = 0; k < N; k++) {
        const t0 = (k / N) * st.len, t1 = ((k + 1) / N) * st.len;
        const y0 = rampY(st, t0), y1 = rampY(st, t1);
        const dh = t1 - t0, dy = y1 - y0;
        const m = new Mesh(new BoxGeometry(Math.hypot(dh, dy) + 0.5, 0.7, RAMP_W), [deckDark, deckDark, top, deckDark, deckDark, deckDark]);
        m.position.set(st.x0 + st.dx * (t0 + t1) / 2, (y0 + y1) / 2 - 0.35, st.z0 + st.dz * (t0 + t1) / 2);
        m.rotation.order = 'YZX';
        m.rotation.set(0, Math.atan2(-st.dz, st.dx), Math.atan2(dy, dh));
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
        for (const s of [-1, 1]) {
          const w = new Mesh(new BoxGeometry(Math.hypot(dh, dy) + 0.5, 0.9, 0.3), deckDark);
          w.position.copy(m.position);
          w.position.x += -st.dz * s * (RAMP_W / 2 - 0.15); w.position.y += 0.75; w.position.z += st.dx * s * (RAMP_W / 2 - 0.15);
          w.rotation.copy(m.rotation);
          scene.add(w);
        }
      }
      for (let t = 0; t <= st.len; t += 3) {
        for (const s of [-1, 1]) edge.push(st.x0 + st.dx * t - st.dz * s * (RAMP_W / 2 - 0.5), rampY(st, t) + 0.5, st.z0 + st.dz * t + st.dx * s * (RAMP_W / 2 - 0.5));
      }
    }
  }
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(edge), 3));
    scene.add(new Points(g, dim(new PointsMaterial({ color: '#ffb347', size: 1.5, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }))));
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
  // -- THE SKINS (owner: every building unique; realistic, cinematic light on them): one atlas
  // (city-skins.ts), four materials (box and cylinder, near and far), and per building its
  // cell, its phase along the tile, a shopfront or none, a crown or none, a tint of its own ----
  const atlas = skinAtlas(rand);
  const skinMats: MeshStandardMaterial[] = [];
  const skinOf = (cyl: boolean, far: boolean) => { const m = skinMaterial(atlas, cyl, far); skinMats.push(m); return m; };
  const skinBox = skinOf(false, false), skinBoxFar = skinOf(false, true), skinCyl = skinOf(true, false), skinCylFar = skinOf(true, true);
  const dark = new MeshLambertMaterial({ map: roofTexture(rand), color: '#22305a' }); // the roofs (and the undersides): panels, plant, a rim — tinted by the look
  const mastMat = new MeshLambertMaterial({ color: '#b4bcc9' }); // the aerials: light steel, read by day
  const masts: { x: number; y: number; z: number; h: number }[] = [];
  const matFor = (kind: Solid['kind'], key: string, far: boolean): Material | Material[] => {
    switch (kind) {
      case 'facade': { const s = far ? skinBoxFar : skinBox; return [s, s, dark, dark, s, s]; }
      case 'cyl': return key === 'dark' ? [dark, dark, dark] : [far ? skinCylFar : skinCyl, dark, dark];
      case 'pyr': return new MeshLambertMaterial({ color: '#0b0b18' });
      case 'spire': return new MeshLambertMaterial({ color: '#5f6a92' });
      case 'dome': return new MeshLambertMaterial({ color: '#0d0e20' });
      case 'tree': return new MeshLambertMaterial({ color: '#0b2418' });
      default: return key === 'mast' ? mastMat : dark;
    }
  };
  const geoFor = (k: Solid['kind']) =>
    k === 'cyl' ? geo.cyl : k === 'pyr' ? geo.pyr : k === 'spire' ? geo.spire : k === 'dome' ? geo.dome : k === 'tree' ? geo.tree : geo.box;
  const dummy = new Object3D();
  interface Bucket { kind: Solid['kind']; key: string; far: boolean; mats: Matrix4[]; skins: number[]; tints: number[] }
  const buckets = new Map<string, Bucket>();
  const shopfronts: { x: number; z: number; w: number; d: number }[] = []; // lit ground floors: they wash the pavement before them
  const NO_SHOP = new Set<Solid['arch']>(['bits', 'street', 'bridge', 'temple', 'industry', 'shanty', 'sprawl', 'over', 'annex']);
  const place = (s: Solid, far: boolean) => {
    if (far && Math.max(Math.abs(s.x), Math.abs(s.z)) > 470) return; // past the fog of war's wall: never seen, not built
    if (s.arch === 'bridge' && s.kind === 'dark' && s.w > 20) return; // the canal's bridges are built below, not as slabs
    const mast = s.kind === 'dark' && s.arch === 'bits' && s.w < 0.3 && s.h > 3;
    if (mast) masts.push({ x: s.x, y: s.y - s.h / 2, z: s.z, h: s.h });
    const plain = (s.arch === 'bits' || s.arch === 'street' || s.arch === 'industry' || s.arch === 'bridge') && s.kind !== 'facade';
    const dressed = !plain && (s.kind === 'facade' || s.kind === 'cyl');
    const key = mast ? 'mast' : plain ? 'dark' : dressed ? 'skin' : String(s.tex);
    const id = `${far ? 'f' : 'c'}:${s.kind}:${key}`;
    let b = buckets.get(id);
    if (!b) { b = { kind: s.kind, key, far, mats: [], skins: [], tints: [] }; buckets.set(id, b); }
    if (s.kind === 'dome') {
      dummy.position.set(s.x, s.y - s.h / 2, s.z);
      dummy.scale.set(s.w / 2, s.h, s.d / 2);
    } else {
      dummy.position.set(s.x, s.y, s.z);
      dummy.scale.set(s.w, s.h, s.d);
    }
    dummy.updateMatrix();
    b.mats.push(dummy.matrix.clone());
    if (dressed) {
      const style = plan.styles[s.tex];
      const shop = !far && s.y - s.h / 2 < 0.6 && s.h > 5 && Math.min(s.w, s.d) >= 6 && !NO_SHOP.has(s.arch) ? 1 : 0;
      const crown = style.crown && s.kind === 'facade' && s.h > 18 ? 1 : 0;
      b.skins.push(skinFor(s.tex, style, rand()), rand(), shop, crown);
      b.tints.push(...tintJitter(rand(), rand()));
      if (shop) shopfronts.push({ x: s.x, z: s.z, w: s.w, d: s.d });
    }
  };
  for (const s of plan.core) place(s, false);
  for (const s of plan.outer) place(s, false);
  for (const s of plan.sprawl) place(s, true);
  const tint = new Color();
  for (const b of buckets.values()) {
    const dressed = b.key === 'skin';
    const g = dressed ? geoFor(b.kind).clone() : geoFor(b.kind); // the skins ride an instance attribute: their own geometry
    if (dressed) g.setAttribute('aSkin', new InstancedBufferAttribute(new Float32Array(b.skins), 4));
    const inst = new InstancedMesh(g, matFor(b.kind, b.key, b.far), b.mats.length);
    b.mats.forEach((m, j) => inst.setMatrixAt(j, m));
    inst.instanceMatrix.needsUpdate = true;
    if (dressed) {
      b.mats.forEach((_, j) => inst.setColorAt(j, tint.setRGB(b.tints[j * 3], b.tints[j * 3 + 1], b.tints[j * 3 + 2])));
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
    inst.castShadow = !b.far && b.kind !== 'tree'; // the sprawl is fog's; the trees would only speckle
    inst.receiveShadow = !b.far;
    scene.add(inst);
  }
  // -- THE CANAL'S BRIDGES (owner: real bridges, elegant and detailed, not planks): a concrete deck carrying
  // the road's paint, a steel bowstring arch each side springing from abutments on the quays, hangers, portal
  // braces between the arches, handrails on balusters -----------------------------------------------------------
  {
    const steel = new MeshLambertMaterial({ color: '#8ea0bc' });
    const railMat = new MeshLambertMaterial({ color: '#d0d6e0' });
    const concrete = new MeshLambertMaterial({ color: '#7d8391' });
    const bridgeStrip = roadStrip(STREET, [2.55], 4.9, 0, true, aniso); // the street's full width: its pavements cross on the deck
    const SEG = 12, HANG = [-9, -6, -3, 0, 3, 6, 9], BAL = 13, RISE = 6.2, HALF_SPAN = 12, DECK_Y = CANAL.deck; // flush with the streets: the water lies below (owner: the approach wedges sat inside the quay crossings)
    const archY = (x: number) => DECK_Y + 0.3 + RISE * (1 - (x / HALF_SPAN) ** 2);
    const ews = plan.bridges.filter((b) => b.yaw === 0);
    const nB = ews.length;
    const arches = new InstancedMesh(geo.box, steel, (SEG * 2 + HANG.length * 2 + 3) * nB);
    const rails = new InstancedMesh(geo.box, railMat, (2 + BAL * 2) * nB);
    let ia = 0, ir = 0;
    const put = (inst: InstancedMesh, j: number, x: number, y: number, z: number, w: number, h: number, d: number, rz = 0) => {
      dummy.position.set(x, y, z); dummy.rotation.set(0, 0, rz); dummy.scale.set(w, h, d); dummy.updateMatrix(); inst.setMatrixAt(j, dummy.matrix);
    };
    // FIVE BUILDS (owner: the stretch of bridges looked copycat): the bowstring arch, a plain girder with lamp poles, a
    // cable-stayed span from a pylon, a steel truss, a stone-parapet bridge with lanterns — by position along the canal
    const stoneMat = new MeshLambertMaterial({ color: '#5d5a66' });
    const cableMat = new MeshLambertMaterial({ color: '#c8ccd6' });
    for (const b of ews) {
      const deck = new Mesh(new BoxGeometry(2 * HALF_SPAN + 2, b.kind === 4 ? 1.2 : 0.6, STREET), [concrete, concrete, streetMat(bridgeStrip, (2 * HALF_SPAN + 2) / 12), concrete, concrete, concrete]);
      deck.position.set(b.x, DECK_Y - (b.kind === 4 ? 0.6 : 0.3), b.z);
      deck.receiveShadow = true; deck.castShadow = true;
      scene.add(deck);
      for (const side of [-1, 1]) {
        const zs = b.z + side * (STREET / 2 + 0.1); // the arches outside the pavements
        if (b.kind === 0) {
          for (let i = 0; i < SEG; i++) { // the arch, in segments
            const x0 = -HALF_SPAN + (2 * HALF_SPAN * i) / SEG, x1 = -HALF_SPAN + (2 * HALF_SPAN * (i + 1)) / SEG;
            const y0 = archY(x0), y1 = archY(x1);
            put(arches, ia++, (x0 + x1) / 2, (y0 + y1) / 2, zs, Math.hypot(x1 - x0, y1 - y0) + 0.1, 0.36, 0.3, Math.atan2(y1 - y0, x1 - x0));
          }
          for (const hx of HANG) put(arches, ia++, hx, (DECK_Y + 0.3 + archY(hx)) / 2, zs, 0.16, archY(hx) - DECK_Y - 0.3, 0.16); // the hangers
        } else if (b.kind === 1) { // a girder: a parapet wall and three lamp poles a side
          const wall = new Mesh(new BoxGeometry(2 * HALF_SPAN + 2, 0.9, 0.3), concrete); wall.position.set(b.x, DECK_Y + 0.45, zs); scene.add(wall);
          for (const px of [-8, 0, 8]) { const pole = new Mesh(new BoxGeometry(0.16, 4.2, 0.16), cableMat); pole.position.set(b.x + px, DECK_Y + 2.1, zs); scene.add(pole); bridgeLamps.push(b.x + px, DECK_Y + 4.3, zs); }
        } else if (b.kind === 2) { // cable-stayed: a pylon at the far bank, stays fanning to the deck
          if (side > 0) {
            const pylon = new Mesh(new BoxGeometry(0.9, 15, 0.9), cableMat); pylon.position.set(b.x + HALF_SPAN - 1, DECK_Y + 7.5, b.z + STREET / 2 + 0.4); scene.add(pylon);
            const pylon2 = pylon.clone(); pylon2.position.z = b.z - STREET / 2 - 0.4; scene.add(pylon2);
            for (const s2 of [-1, 1]) for (const hx of [-9, -5, -1, 3]) {
              const x0 = b.x + HALF_SPAN - 1, y0 = DECK_Y + 14, x1 = b.x + hx, y1 = DECK_Y + 0.4;
              const stay = new Mesh(new BoxGeometry(Math.hypot(x1 - x0, y1 - y0), 0.1, 0.1), cableMat);
              stay.position.set((x0 + x1) / 2, (y0 + y1) / 2, b.z + s2 * (STREET / 2 + 0.4)); stay.rotation.z = Math.atan2(y1 - y0, x1 - x0); scene.add(stay);
            }
            bridgeLamps.push(b.x + HALF_SPAN - 1, DECK_Y + 15.2, b.z + STREET / 2 + 0.4, b.x + HALF_SPAN - 1, DECK_Y + 15.2, b.z - STREET / 2 - 0.4);
          }
        } else if (b.kind === 3) { // a truss: top chord and diagonals a side
          put(arches, ia++, 0, DECK_Y + 3.2, zs, 2 * HALF_SPAN + 2, 0.3, 0.3);
          for (let i = 0; i < 6; i++) {
            const x0 = -HALF_SPAN + (2 * HALF_SPAN * i) / 6, x1 = x0 + (2 * HALF_SPAN) / 6;
            put(arches, ia++, (x0 + x1) / 2, DECK_Y + 1.75, zs, Math.hypot(x1 - x0, 2.9), 0.16, 0.16, Math.atan2(2.9, x1 - x0) * (i % 2 ? -1 : 1));
            put(arches, ia++, x0, DECK_Y + 1.75, zs, 0.16, 2.9, 0.16);
          }
        } else { // a stone bridge: a thick parapet with lanterns on piers
          const wall = new Mesh(new BoxGeometry(2 * HALF_SPAN + 2, 1.1, 0.5), stoneMat); wall.position.set(b.x, DECK_Y + 0.55, zs); scene.add(wall);
          for (const px of [-11, -5.5, 0, 5.5, 11]) { const pier = new Mesh(new BoxGeometry(0.8, 1.6, 0.8), stoneMat); pier.position.set(b.x + px, DECK_Y + 0.8, zs); scene.add(pier); if (px !== 0) bridgeLamps.push(b.x + px, DECK_Y + 2.0, zs); }
        }
        if (b.kind !== 4) {
          put(rails, ir++, 0, DECK_Y + 1.35, b.z + side * (STREET / 2 - 0.15), 2 * HALF_SPAN + 2, 0.1, 0.1); // the handrail, at the pavement's edge
          for (let i = 0; i < BAL; i++) put(rails, ir++, -HALF_SPAN + (2 * HALF_SPAN * i) / (BAL - 1), DECK_Y + 0.85, b.z + side * (STREET / 2 - 0.15), 0.08, 1.0, 0.08);
        }
      }
      if (b.kind === 0) for (const px of [-3, 0, 3]) put(arches, ia++, px, archY(px), b.z, 0.26, 0.26, STREET + 0.4); // portal braces
    }
    arches.count = ia; rails.count = ir;
    for (const inst of [arches, rails]) { inst.instanceMatrix.needsUpdate = true; inst.castShadow = true; inst.receiveShadow = true; scene.add(inst); }
    for (const b of plan.bridges.filter((b) => b.yaw !== 0)) { // the arterial's: a flush girder deck the width of its right of way, balustrades along both edges
      const deck = new Mesh(new BoxGeometry(b.span, 0.6, b.w), concrete);
      deck.position.set(b.x, DECK_Y - 0.3, b.z); deck.rotation.y = b.yaw; deck.receiveShadow = true; deck.castShadow = true;
      scene.add(deck);
      for (const s of [-1, 1]) {
        const rail = new Mesh(new BoxGeometry(b.span, 1.0, 0.25), railMat);
        rail.position.set(b.x + Math.sin(b.yaw) * s * (b.w / 2 - 0.2), DECK_Y + 0.5, b.z + Math.cos(b.yaw) * s * (b.w / 2 - 0.2)); rail.rotation.y = b.yaw;
        scene.add(rail);
      }
    }
    dummy.rotation.set(0, 0, 0);
  }
  // -- THE PLAZA AND THE STALLION (owner: a big statue of a stallion; the dark circle made no sense): a thick paved
  // disc spanning the canal (the boats pass under), a kerb ring, and at its heart a voxel stallion rearing on a
  // plinth — body, neck, head, mane, four legs, the tail — in bronze, lit from its feet -----------------------------
  {
    const paving = new MeshLambertMaterial({ map: pavingTexture(aniso), emissive: '#2c4a8e', emissiveIntensity: 0.7 });
    const disc = new Mesh(new CylinderGeometry(15, 15, 0.6, 48), paving);
    disc.position.set(0, -0.25, 0); disc.receiveShadow = true; disc.castShadow = true;
    scene.add(disc);
    const rim = new Mesh(new CylinderGeometry(15.3, 15.3, 0.16, 48, 1, true), new MeshLambertMaterial({ color: '#8e92a6', side: DoubleSide }));
    rim.position.set(0, 0.0, 0);
    scene.add(rim);
    // THE STALLION (owner: a big statue of a stallion): rearing, facing east along the boulevard. Hind legs planted on the
    // cap, the haunches over them, the barrel tilted up at 40 degrees, a deep chest, the neck arched forward, the head
    // down toward the muzzle, ears pricked, a stepped mane, the forelegs drawn up and pawing, the tail flying back.
    // Lit bronze (a warm emissive so it never falls to a silhouette), spots at its feet.
    const bronze = new MeshStandardMaterial({ color: '#7a5c30', metalness: 0.55, roughness: 0.5, emissive: '#2c1c08', emissiveIntensity: 0.55 });
    const stone = new MeshLambertMaterial({ color: '#4a4e5c' });
    const horse = new Group();
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, m: Material, rz = 0) => {
      const bx = new Mesh(new BoxGeometry(w, h, d), m); bx.position.set(x, y, z); bx.rotation.z = rz; bx.castShadow = true; bx.receiveShadow = true; horse.add(bx); return bx;
    };
    box(0, 1.3, 0, 5.8, 2.6, 4.2, stone); // the plinth
    box(0, 2.72, 0, 4.8, 0.24, 3.2, stone); // its cap
    for (const z of [-0.55, 0.55]) { // the hind legs, planted: hooves, cannons, hocks up to the haunches
      box(-1.15, 2.98, z, 0.78, 0.44, 0.62, bronze);
      box(-1.2, 3.85, z, 0.52, 1.5, 0.48, bronze);
      box(-1.45, 4.95, z, 0.72, 1.3, 0.6, bronze, 0.35);
    }
    box(-1.55, 6.05, 0, 2.0, 1.75, 1.6, bronze, 0.5); // the haunches
    box(-0.15, 6.75, 0, 3.9, 1.65, 1.35, bronze, 0.7); // the barrel, tilted up toward the head
    box(1.3, 7.75, 0, 1.6, 1.7, 1.4, bronze, 0.7); // the chest
    box(2.2, 9.1, 0, 1.05, 2.6, 0.9, bronze, 0.32); // the neck, arched forward
    for (let k = 0; k < 5; k++) box(1.62 + k * 0.28, 8.55 + k * 0.52, 0, 0.5, 0.6, 0.36, bronze, 0.32); // the mane, stepped along the crest
    box(3.15, 10.2, 0, 1.6, 0.82, 0.74, bronze, -0.32); // the head, down toward the muzzle
    box(3.95, 9.88, 0, 0.6, 0.52, 0.56, bronze, -0.32); // the muzzle
    box(3.05, 9.72, 0, 0.9, 0.36, 0.62, bronze, -0.32); // the jaw
    for (const z of [-0.24, 0.24]) box(2.62, 10.85, z, 0.2, 0.46, 0.15, bronze, -0.15); // the ears, pricked
    // the forelegs, drawn up and pawing: one higher than the other
    box(1.95, 6.5, 0.5, 0.5, 1.6, 0.46, bronze, -0.8); box(2.55, 5.7, 0.5, 0.44, 1.35, 0.42, bronze, 0.55); box(2.35, 5.05, 0.5, 0.56, 0.4, 0.5, bronze, 0.55);
    box(1.9, 6.25, -0.5, 0.5, 1.7, 0.46, bronze, -0.45); box(2.25, 5.0, -0.5, 0.44, 1.4, 0.42, bronze, 0.2); box(2.15, 4.3, -0.5, 0.56, 0.4, 0.5, bronze, 0.2);
    box(-2.55, 6.4, 0, 1.5, 0.5, 0.42, bronze, -0.6); box(-3.3, 5.5, 0, 1.1, 0.42, 0.36, bronze, -1.0); // the tail, flying back and down
    horse.rotation.y = 0; // facing +x: east, down the boulevard
    scene.add(horse);
    lampHeads.push(paving);
  }
  // -- SHOP LIGHT ON THE PAVEMENT (owner: the street level lit like a city at night): every
  // shopfront lays a wash of its light on the ground before it, on all four sides ---------------
  {
    const spill = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dim(additiveFog(new MeshBasicMaterial({
      map: spillTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.2,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, // a decal: never z-fights the ground
    }))), shopfronts.length * 4);
    const DEPTH = 5;
    let j = 0;
    dummy.rotation.set(0, 0, 0);
    for (const f of shopfronts) {
      for (const [nx, nz, len] of [[0, 1, f.w], [0, -1, f.w], [1, 0, f.d], [-1, 0, f.d]] as [number, number, number][]) {
        dummy.position.set(f.x + nx * (f.w / 2 + DEPTH / 2 + 0.1), 0.12, f.z + nz * (f.d / 2 + DEPTH / 2 + 0.1));
        dummy.rotation.y = Math.atan2(nx, nz); // the wash's bright edge against the glass
        dummy.scale.set(len * 0.92, 1, DEPTH);
        dummy.updateMatrix();
        spill.setMatrixAt(j, dummy.matrix);
        spill.setColorAt(j, tint.set(rand() < 0.72 ? '#ffe2b8' : pick(rand, ['#dff6ff', '#ffd6ee', '#e0ffe8'])));
        j += 1;
      }
    }
    dummy.rotation.set(0, 0, 0);
    spill.instanceMatrix.needsUpdate = true;
    if (spill.instanceColor) spill.instanceColor.needsUpdate = true;
    scene.add(spill);
  }

  // -- SEARCHLIGHTS: volumetric-looking beams (an additive cone, a brighter
  // core) sweeping from the stadium's masts, the megastructure's top, the
  // industrial cranes and the wheel — the night's light shafts ------------------
  interface Beam { g: Group; phase: number; rate: number; mats: MeshBasicMaterial[]; ops: number[]; len: number }
  const beams: Beam[] = [];
  const beamAt = (x: number, y: number, z: number, len: number, color: string, phase: number) => {
    const g = new Group();
    g.position.set(x, y, z);
    const mats: MeshBasicMaterial[] = [];
    for (const [r, op] of [[len * 0.075, 0.075], [len * 0.03, 0.12]] as [number, number][]) {
      const geoC = new ConeGeometry(r, len, 12, 1, true);
      geoC.translate(0, -len / 2, 0); // the apex at the lamp, the mouth far out
      const m = new Mesh(geoC, new MeshBasicMaterial({
        color, transparent: true, opacity: op, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false,
      }));
      mats.push(m.material as MeshBasicMaterial);
      g.add(m);
    }
    beams.push({ g, phase, rate: 0.0028 + (phase % 1) * 0.002, mats, ops: [0.075, 0.12], len });
    scene.add(g);
  };
  {
    const st = plan.stadium;
    beamAt(st.masts[0].x, st.masts[0].h, st.masts[0].z, 150, '#dfeeff', 0.3);
    beamAt(st.masts[3].x, st.masts[3].h, st.masts[3].z, 150, '#dfeeff', 2.1);
    beamAt(plan.mega.x + 7, plan.mega.top, plan.mega.z - 6, 170, '#bfe9ff', 1.2);
    beamAt(plan.mega.x - 20, plan.mega.top - 28, plan.mega.z + 20, 140, '#ffd6e8', 3.9);
    beamAt(plan.wheel.x, plan.wheel.y + plan.wheel.r + 1, plan.wheel.z, 120, '#fff0d0', 0.8);
    if (plan.stacks.length) beamAt(plan.stacks[0].x + 8, plan.stacks[0].top - 6, plan.stacks[0].z, 130, '#cfe6ff', 4.6);
  }
  const beamDir = new Vector3(), beamTo = new Vector3();
  const sweep = () => {
    for (const b of beams) {
      const t = tick * b.rate + b.phase;
      b.g.rotation.order = 'YXZ';
      // the cone hangs down −y; pitch it up toward the sky, then sweep about the mast
      b.g.rotation.set(0, t, Math.PI - (0.55 + Math.sin(t * 0.7) * 0.35));
      // a beam the eye is inside would wash the frame white: it thins as the eye nears its axis
      beamDir.set(0, -1, 0).applyEuler(b.g.rotation);
      beamTo.copy(camera.position).sub(b.g.position);
      const along = clamp(beamTo.dot(beamDir), 0, b.len);
      const d = beamTo.addScaledVector(beamDir, -along).length();
      const k = clamp((d - 9) / 22, 0, 1);
      b.mats.forEach((m, i) => { m.opacity = b.ops[i] * k * k * lampLevel; });
    }
  };

  // glowing bars: storefront strips at the pavement, LED edges up the needles
  // (the LEDs run at half power — bloom does the rest, a full-white bar reads
  // as a laser), awnings dim over the shopfronts
  const bars = (list: typeof plan.strips, power: number) => {
    if (!list.length) return;
    const mat = new MeshBasicMaterial({ color: '#ffffff' });
    scalables.push({ m: mat, floor: 0.35 });
    const inst = new InstancedMesh(geo.box, mat, list.length);
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
  bars(plan.tarps, 0.5); // the tarps over the shacks and the stalls
  { // the market's canopies
    const canopyMat = new MeshBasicMaterial({ color: '#ffffff' });
    scalables.push({ m: canopyMat, floor: 0.5 });
    const inst = new InstancedMesh(geo.pyr, canopyMat, plan.stalls.length);
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

  // -- THE STADIUM (owner: more detailed): the bowl, three tiers of seats in
  // the clubs' colours, a roof ring lit underneath, a marked pitch with its
  // goals, a crowd of thousands with phone lights flashing, a match being
  // played, floodlights, lit gates, two screens, fireworks now and then; the
  // Ferris wheel beside it --------------------------------------------------------
  const stadium = plan.stadium;
  let pitchMat: MeshLambertMaterial | null = null; // the floodlit pitch: its glow follows the lamps
  const crowdGeo = new BufferGeometry();
  const crowdCol = new Float32Array(4200 * 3);
  const matchArr = new Float32Array(23 * 3);
  const matchGeo = new BufferGeometry();
  const match = { ball: new Vector2(0, 0), vel: new Vector2(0.06, 0.02), home: [] as Vector2[] };
  const fw = { pos: new Float32Array(60 * 3), vel: new Float32Array(60 * 3), col: new Float32Array(60 * 3), life: 0, next: 600, launched: 0 };
  const fwGeo = new BufferGeometry();
  {
    const st = stadium;
    const bowl = new Mesh(new CylinderGeometry(1, 0.86, 1, 32, 1, true), new MeshLambertMaterial({ color: '#101538', side: DoubleSide }));
    bowl.position.set(st.x, st.h / 2, st.z);
    bowl.scale.set(st.w / 2, st.h, st.d / 2);
    scene.add(bowl);
    const seats = seatTexture();
    for (const [r0, y, h] of [[0.6, 3.4, 3.2], [0.74, 6.8, 3.4], [0.88, 10.4, 3.6]] as [number, number, number][]) {
      const tex = seats.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.round(r0 * 20), 1);
      const ring = new Mesh(new CylinderGeometry(1, 0.9, 1, 32, 1, true), new MeshLambertMaterial({
        map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18, side: DoubleSide,
      }));
      ring.position.set(st.x, y, st.z);
      ring.scale.set(st.w / 2 * r0, h, st.d / 2 * r0);
      scene.add(ring);
    }
    const roof = new Mesh(new RingGeometry(0.64, 1.07, 40), new MeshLambertMaterial({ color: '#141a3a', side: DoubleSide }));
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(st.x, st.h + 2.4, st.z);
    roof.scale.set(st.w / 2, st.d / 2, 1);
    scene.add(roof);
    const pitchTex = pitchTexture();
    const pitch = new Mesh(new PlaneGeometry(38, 24), new MeshLambertMaterial({ map: pitchTex, emissive: '#ffffff', emissiveMap: pitchTex, emissiveIntensity: 0.55 }));
    pitchMat = pitch.material as MeshLambertMaterial;
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(st.x, 0.36, st.z);
    scene.add(pitch);
    const goalMat = new MeshBasicMaterial({ color: '#f4f1e8' });
    for (const sx of [-1, 1]) {
      const g = new Group();
      g.position.set(st.x + sx * 18.6, 0, st.z);
      for (const [px, py, pz, w, h, d] of [[0, 1.2, -2.6, 0.12, 2.4, 0.12], [0, 1.2, 2.6, 0.12, 2.4, 0.12], [0, 2.4, 0, 0.12, 0.12, 5.3]] as number[][]) {
        const m = new Mesh(new BoxGeometry(w, h, d), goalMat); m.position.set(px, py, pz); g.add(m);
      }
      scene.add(g);
    }
    // the crowd on the tiers: dark heads, a few thousand, some holding up a light
    const crowd: number[] = [];
    for (const [r0, y, h] of [[0.6, 3.4, 3.2], [0.74, 6.8, 3.4], [0.88, 10.4, 3.6]] as [number, number, number][]) {
      for (let i = 0; i < 1400; i++) {
        const a = rand() * Math.PI * 2, f = rand();
        const rr = r0 * (0.9 + f * 0.12);
        crowd.push(st.x + Math.cos(a) * st.w / 2 * rr, y - h / 2 + f * h + 0.5, st.z + Math.sin(a) * st.d / 2 * rr);
      }
    }
    crowdGeo.setAttribute('position', new BufferAttribute(new Float32Array(crowd), 3));
    for (let i = 0; i < 4200; i++) new Color(rand() < 0.5 ? '#2a2f55' : '#3a3050').toArray(crowdCol, i * 3);
    crowdGeo.setAttribute('color', new BufferAttribute(crowdCol, 3));
    scene.add(new Points(crowdGeo, new PointsMaterial({ vertexColors: true, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false })));
    // the match: two sides in their colours, a referee, the ball
    const mcol = new Float32Array(23 * 3);
    for (let i = 0; i < 23; i++) {
      new Color(i < 11 ? '#ff4a3c' : i < 22 ? '#4fc3ff' : '#ffffff').toArray(mcol, i * 3);
      const side = i < 11 ? -1 : 1, k = i % 11;
      match.home.push(new Vector2(side * (3 + Math.floor(k / 4) * 5), (k % 4 - 1.5) * 5.5));
    }
    matchGeo.setAttribute('position', new BufferAttribute(matchArr, 3));
    matchGeo.setAttribute('color', new BufferAttribute(mcol, 3));
    scene.add(new Points(matchGeo, new PointsMaterial({ vertexColors: true, size: 2.4, sizeAttenuation: true, transparent: true, depthWrite: false })));
    // the rim lights, the floodlights, the roof's under-lights, the gates
    const rim: number[] = [];
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; rim.push(st.x + Math.cos(a) * st.w / 2, st.h + 0.4, st.z + Math.sin(a) * st.d / 2); }
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; rim.push(st.x + Math.cos(a) * st.w / 2 * 0.68, st.h + 2.0, st.z + Math.sin(a) * st.d / 2 * 0.68); }
    for (const m of st.masts) rim.push(m.x, m.h + 0.6, m.z);
    for (const gt of st.gates) { rim.push(gt.x, 3.2, gt.z); }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(rim), 3));
    scene.add(new Points(g, dim(new PointsMaterial({ map: glowTexture('#ffffff'), color: '#e8f4ff', size: 3.6, sizeAttenuation: true, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false })))); // small: seventy of them up close once walled the deck in white
    for (const gt of st.gates) { // a lit portal in the bowl's wall
      const m = new Mesh(new BoxGeometry(6, 4.6, 0.6), new MeshBasicMaterial({ color: '#ffd9a0' }));
      m.position.set(gt.x, 2.3, gt.z);
      m.rotation.y = gt.rotY;
      scene.add(m);
    }
    fwGeo.setAttribute('position', new BufferAttribute(fw.pos, 3));
    fwGeo.setAttribute('color', new BufferAttribute(fw.col, 3));
    scene.add(new Points(fwGeo, new PointsMaterial({ vertexColors: true, size: 3, sizeAttenuation: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false })));
  }
  const flashTmp = new Color();
  const playMatch = () => {
    const st = stadium;
    // the ball drifts about the pitch, the players draw toward it from their posts
    match.vel.x += (rand() - 0.5) * 0.02; match.vel.y += (rand() - 0.5) * 0.02;
    match.vel.clampLength(0, 0.14);
    match.ball.add(match.vel);
    if (Math.abs(match.ball.x) > 17) match.vel.x *= -1;
    if (Math.abs(match.ball.y) > 10.5) match.vel.y *= -1;
    for (let i = 0; i < 22; i++) {
      const h = match.home[i];
      const px = h.x + (match.ball.x - h.x) * 0.45 + Math.sin(tick * 0.02 + i) * 0.6;
      const pz = h.y + (match.ball.y - h.y) * 0.45 + Math.cos(tick * 0.023 + i * 2) * 0.6;
      matchArr[i * 3] = st.x + px; matchArr[i * 3 + 1] = 1.2; matchArr[i * 3 + 2] = st.z + pz;
    }
    matchArr[66] = st.x + match.ball.x; matchArr[67] = 0.8; matchArr[68] = st.z + match.ball.y;
    (matchGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    if (tick % 3 === 0) { // phones held up in the stands
      for (let k = 0; k < 40; k++) {
        const i = Math.floor(rand() * 4200);
        flashTmp.set(rand() < 0.5 ? '#2a2f55' : '#3a3050');
        if (rand() < 0.08) flashTmp.set('#f4f1e8');
        flashTmp.toArray(crowdCol, i * 3);
      }
      (crowdGeo.getAttribute('color') as BufferAttribute).needsUpdate = true;
    }
    // fireworks over the bowl, now and then
    if (fw.life > 0) {
      fw.life -= 1;
      const fade = fw.life / 70;
      for (let i = 0; i < 60; i++) {
        fw.vel[i * 3 + 1] -= 0.012;
        fw.pos[i * 3] += fw.vel[i * 3]; fw.pos[i * 3 + 1] += fw.vel[i * 3 + 1]; fw.pos[i * 3 + 2] += fw.vel[i * 3 + 2];
        fw.col[i * 3] *= 0.97; fw.col[i * 3 + 1] *= 0.97; fw.col[i * 3 + 2] *= 0.97;
      }
      if (fw.life === 0) fw.col.fill(0);
      (fwGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
      (fwGeo.getAttribute('color') as BufferAttribute).needsUpdate = true;
      void fade;
    } else if (--fw.next <= 0 && lampLevel > 0.5) { // (no fireworks by day)
      fw.next = 700 + Math.floor(rand() * 900);
      fw.life = 70;
      fw.launched += 1;
      const cx = st.x + (rand() - 0.5) * 30, cy = st.h + 30 + rand() * 20, cz = st.z + (rand() - 0.5) * 20;
      const col = new Color(pick(rand, ['#ff4a3c', '#ffd23f', '#5df2ff', '#ff4fd8', '#C8FF00']));
      for (let i = 0; i < 60; i++) {
        const a = rand() * Math.PI * 2, b = (rand() - 0.5) * Math.PI, sp = 0.45 + rand() * 0.5;
        fw.pos[i * 3] = cx; fw.pos[i * 3 + 1] = cy; fw.pos[i * 3 + 2] = cz;
        fw.vel[i * 3] = Math.cos(a) * Math.cos(b) * sp; fw.vel[i * 3 + 1] = Math.sin(b) * sp; fw.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * sp;
        col.toArray(fw.col, i * 3);
      }
    }
  };
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
    const signMat = new MeshBasicMaterial({
      map: grp.tex, color: '#ffffff', transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
    });
    scalables.push({ m: signMat, floor: 0.45 });
    const inst = new InstancedMesh(geo.plane, signMat, grp.sign.length);
    const base = new Float32Array(grp.sign.length * 3);
    grp.sign.forEach((sg, j) => {
      dummy.position.set(sg.x, sg.y, sg.z);
      dummy.rotation.set(0, sg.rotY, 0);
      dummy.scale.set(sg.w, sg.h, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
      const col = new Color(sg.color);
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
  // HOLOGRAMS (owner: the plates' ads floating over the streets): scrolling panels of glyphs, a turning ring of
  // them over the plaza, pillars of light, turning logo discs
  interface HoloM { mesh: Object3D; tex: CanvasTexture | null; ctx: CanvasRenderingContext2D | null; kind: HoloKind; phase: number; mats: MeshBasicMaterial[]; base: number[] }
  const holos: HoloM[] = [];
  const logoTex = logoTexture(rand);
  for (const h of plan.holos) {
    if (h.kind === 'panel') {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 72;
      const ctx = c.getContext('2d')!;
      paintHolo(ctx, rand, 0);
      const tex = asPixelTex(new CanvasTexture(c));
      const mat = new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false });
      const m = new Mesh(geo.plane, mat);
      m.position.set(h.x, h.y, h.z); m.scale.set(h.w, h.h, 1); m.rotation.y = h.rotY;
      scene.add(m);
      holos.push({ mesh: m, tex, ctx, kind: 'panel', phase: rand() * 7, mats: [mat], base: [0.3] });
    } else if (h.kind === 'ring') {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 72;
      const ctx = c.getContext('2d')!;
      paintHolo(ctx, rand, 0);
      const tex = asPixelTex(new CanvasTexture(c));
      tex.wrapS = RepeatWrapping; tex.repeat.set(Math.max(1, Math.round(h.w / 5)), 1);
      const mat = new MeshBasicMaterial({ map: tex, color: '#9ff4ff', transparent: true, opacity: 0.34, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false });
      const m = new Mesh(new CylinderGeometry(1, 1, 1, 48, 1, true), mat);
      m.position.set(h.x, h.y, h.z); m.scale.set(h.w / 2, h.h, h.w / 2);
      scene.add(m);
      holos.push({ mesh: m, tex, ctx, kind: 'ring', phase: rand() * 7, mats: [mat], base: [0.34] });
    } else if (h.kind === 'pillar') {
      const g = new Group();
      const mats: MeshBasicMaterial[] = [];
      for (const [r, op, col] of [[1, 0.1, '#5df2ff'], [0.35, 0.22, '#dffbff']] as [number, number, string][]) {
        const mat = new MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false });
        const m = new Mesh(new CylinderGeometry(r, r, 1, 16, 1, true), mat);
        g.add(m); mats.push(mat);
      }
      g.position.set(h.x, h.y, h.z); g.scale.set(h.w / 2, h.h, h.w / 2);
      scene.add(g);
      holos.push({ mesh: g, tex: null, ctx: null, kind: 'pillar', phase: rand() * 7, mats, base: [0.1, 0.22] });
    } else {
      const mat = new MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false });
      const m = new Mesh(new CircleGeometry(0.5, 32), mat);
      m.position.set(h.x, h.y, h.z); m.scale.set(h.w, h.h, 1);
      scene.add(m);
      holos.push({ mesh: m, tex: null, ctx: null, kind: 'logo', phase: rand() * 7, mats: [mat], base: [0.55] });
    }
  }
  const tendHolos = () => {
    for (const h of holos) {
      // (a hologram is a night thing: every kind fades with the look's lamps — by day the plaza's ring covered the sky)
      if (h.kind === 'panel') { if (tick % 4 === 0 && h.ctx && h.tex) { paintHolo(h.ctx, rand, 72 - ((tick >> 2) % 72)); h.tex.needsUpdate = true; } h.mesh.rotation.y += 0.0025; h.mats[0].opacity = h.base[0] * lampLevel; }
      else if (h.kind === 'ring') { h.mesh.rotation.y += 0.004; if (tick % 6 === 0 && h.ctx && h.tex) { paintHolo(h.ctx, rand, 72 - ((tick >> 2) % 72)); h.tex.needsUpdate = true; } h.mats[0].opacity = h.base[0] * lampLevel; }
      else if (h.kind === 'pillar') { const k = 0.75 + 0.25 * Math.sin(tick * 0.03 + h.phase); h.mats.forEach((m, i) => { m.opacity = h.base[i] * k * lampLevel; }); }
      else { h.mesh.rotation.y += 0.012; h.mats[0].opacity = h.base[0] * (0.85 + 0.15 * Math.sin(tick * 0.05 + h.phase)) * lampLevel; }
    }
  };
  // BILLBOARDS (owner: the plates' giant ads): the atlas' art on framed boards, lit or dark, their lamps white
  {
    const atlas = billboardAtlas(rand);
    const billMat = new MeshBasicMaterial({ map: atlas, side: DoubleSide });
    billMat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n attribute float aArt;')
        .replace('#include <uv_vertex>', `vMapUv = ( uv + vec2( mod( aArt, 6.0 ), ${Math.ceil(ARTS / 6) - 1}.0 - floor( aArt / 6.0 ) ) ) / vec2( 6.0, ${Math.ceil(ARTS / 6)}.0 );`);
    };
    billMat.customProgramCacheKey = () => 'billboard';
    const g = geo.plane.clone();
    const arts = new Float32Array(plan.billboards.length);
    plan.billboards.forEach((b, j) => { arts[j] = b.art; });
    g.setAttribute('aArt', new InstancedBufferAttribute(arts, 1));
    const inst = new InstancedMesh(g, billMat, plan.billboards.length);
    const bc = new Color();
    plan.billboards.forEach((b, j) => {
      dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, b.rotY, 0); dummy.scale.set(b.w, b.h, 1); dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
      inst.setColorAt(j, bc.setScalar(b.lit ? 1 : 0.22));
    });
    dummy.rotation.set(0, 0, 0);
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
  }

  // -- street furniture: lamp posts with glowing heads, lanterns, wires,
  // railings, the sprawl's lamps and neon specks, beacons -------------------
  const glowPoints = (pos: number[] | Float32Array, color: string, size: number, opacity = 1) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos instanceof Float32Array ? pos : new Float32Array(pos), 3));
    const pts = new Points(g, dim(new PointsMaterial({
      map: glowTexture(color), color, size, sizeAttenuation: true, transparent: true, opacity,
      blending: AdditiveBlending, depthWrite: false,
    })));
    scene.add(pts);
    return pts;
  };
  {
    // LAMP POSTS (owner: real lamp posts, heads and all): a post, an arm out over the carriageway, a lantern
    // that glows by night and reads as a fixture by day; the arm points at the nearest carriageway's axis
    const nP = plan.posts.length;
    const postMat = new MeshLambertMaterial({ color: '#3a3f52' });
    const headMat = new MeshLambertMaterial({ color: '#cfd6e2', emissive: '#ffd9a0', emissiveIntensity: 1.2 });
    lampHeads.push(headMat);
    const posts = new InstancedMesh(geo.box, postMat, nP), arms = new InstancedMesh(geo.box, postMat, nP), lanterns = new InstancedMesh(geo.box, headMat, nP);
    const heads = new Float32Array(nP * 3);
    const ways = plan.streets.filter((s) => s.kind === 'road' || s.kind === 'diagonal' || s.kind === 'highway' || s.kind === 'ramp' || s.kind === 'arterial');
    plan.posts.forEach((p, j) => {
      const base = p.y ?? 0; // some stand on the highway deck or a ramp
      let ax = 1, az = 0, best = 9;
      for (const s of ways) {
        const u = (p.x - s.x0) * s.dx + (p.z - s.z0) * s.dz;
        if (u < 0 || u > s.len) continue;
        const sy = s.y1 === undefined ? s.y : s.y + (s.y1 - s.y) * (u / s.len);
        if (Math.abs(sy - base) > 3) continue;
        const lat = -(p.x - s.x0) * s.dz + (p.z - s.z0) * s.dx;
        if (Math.abs(lat) > 0.5 && Math.abs(lat) < best) { best = Math.abs(lat); ax = Math.sign(lat) * s.dz; az = -Math.sign(lat) * s.dx; }
      }
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(p.x, base + p.h / 2, p.z); dummy.scale.set(0.22, p.h, 0.22); dummy.updateMatrix(); posts.setMatrixAt(j, dummy.matrix);
      dummy.rotation.set(0, Math.atan2(ax, az), 0);
      dummy.position.set(p.x + ax * 0.6, base + p.h - 0.05, p.z + az * 0.6); dummy.scale.set(0.12, 0.12, 1.2); dummy.updateMatrix(); arms.setMatrixAt(j, dummy.matrix);
      dummy.position.set(p.x + ax * 1.15, base + p.h - 0.25, p.z + az * 1.15); dummy.scale.set(0.36, 0.3, 0.7); dummy.updateMatrix(); lanterns.setMatrixAt(j, dummy.matrix);
      heads[j * 3] = p.x + ax * 1.15; heads[j * 3 + 1] = base + p.h - 0.3; heads[j * 3 + 2] = p.z + az * 1.15;
    });
    dummy.rotation.set(0, 0, 0);
    for (const inst of [posts, arms, lanterns]) { inst.instanceMatrix.needsUpdate = true; scene.add(inst); }
    glowPoints(heads, '#ffe9c9', 4.5);
    // AERIALS (owner: antennas that read as antennas): a base, crossbars up the mast, a red lamp at the tip
    const bars = new InstancedMesh(geo.box, mastMat, masts.length * 3);
    const tips = new Float32Array(masts.length * 3);
    masts.forEach((m, j) => {
      dummy.position.set(m.x, m.y + 0.15, m.z); dummy.scale.set(0.6, 0.3, 0.6); dummy.updateMatrix(); bars.setMatrixAt(j * 3, dummy.matrix);
      dummy.position.set(m.x, m.y + m.h * 0.62, m.z); dummy.scale.set(1.5, 0.07, 0.07); dummy.updateMatrix(); bars.setMatrixAt(j * 3 + 1, dummy.matrix);
      dummy.position.set(m.x, m.y + m.h * 0.86, m.z); dummy.scale.set(0.07, 0.07, 1.1); dummy.updateMatrix(); bars.setMatrixAt(j * 3 + 2, dummy.matrix);
      tips[j * 3] = m.x; tips[j * 3 + 1] = m.y + m.h + 0.15; tips[j * 3 + 2] = m.z;
    });
    bars.instanceMatrix.needsUpdate = true;
    scene.add(bars);
    glowPoints(tips, '#ff3b3b', 1.6, 0.9);
    glowPoints(plan.sprawlLamps, '#ffd9a0', 3);
    glowPoints(plan.lanterns, '#ffb36b', 3);
    glowPoints(plan.spots, '#ffffff', 2.2, 0.9); // the billboards' lamps
    const rail: number[] = [];
    for (const b of plan.bridges) for (let x = -12; x <= 12; x += 2.4) for (const s of [-1, 1]) rail.push(x, 2.5, b.z + s * 5.4);
    glowPoints(rail, '#ffd9a0', 2);
  }
  // -- THE KIT (owner: a lived-in city — Ghost in the Shell's walls): every small thing the plan crusted on the
  // walls and the roofs, one instanced mesh per kind, coloured per instance; and THE CATWALKS across the alleys,
  // the arcades along the facades, the platforms: a deck, rails on posts, a string of lanterns ------------------
  {
    const disc = new CylinderGeometry(0.5, 0.5, 1, 10, 1).rotateX(Math.PI / 2); // a dish: its face along local +z, the wall's normal
    const grille = new MeshLambertMaterial({ map: grilleTexture(), color: '#ffffff' });
    const white = () => new MeshLambertMaterial({ color: '#ffffff' });
    const acBody = white();
    const boothMat = new MeshLambertMaterial({ color: '#2a3a5a', emissive: '#5df2ff', emissiveIntensity: 0.5 });
    const vendMat = new MeshBasicMaterial({ color: '#ffffff' });
    scalables.push({ m: vendMat, floor: 0.3 });
    lampHeads.push(boothMat);
    type KitDef = { geo: BoxGeometry | CylinderGeometry; mat: Material | Material[]; colors: string[]; shadow: boolean };
    const KIT: Record<string, KitDef> = {
      ac: { geo: geo.box, mat: [acBody, acBody, acBody, acBody, grille, acBody], colors: ['#cfd3da', '#c0c4cc', '#d8dce2', '#b4b8c0'], shadow: false },
      pipe: { geo: geo.box, mat: white(), colors: ['#7a8090', '#6e7484', '#6a4a3a', '#5a3a2e', '#8a9098'], shadow: false },
      duct: { geo: geo.box, mat: white(), colors: ['#8a9098', '#7a8088', '#9aa0a8'], shadow: false },
      dish: { geo: disc, mat: white(), colors: ['#d8dce4', '#c8ccd4', '#e4e6ea'], shadow: false },
      rail: { geo: geo.box, mat: white(), colors: ['#c8ccd6', '#b8bcc6'], shadow: false },
      escape: { geo: geo.box, mat: white(), colors: ['#6a7080', '#5a6070'], shadow: false },
      tank: { geo: geo.cyl, mat: white(), colors: ['#8a8f9a', '#7a6a5a', '#9a9fa8'], shadow: true },
      beam: { geo: geo.box, mat: white(), colors: ['#6a7080'], shadow: false },
      bracket: { geo: geo.box, mat: white(), colors: ['#3a3f52'], shadow: false },
      frame: { geo: geo.box, mat: white(), colors: ['#2a2e3a'], shadow: false },
      vend: { geo: geo.box, mat: vendMat, colors: ['#ffffff'], shadow: true },
      bin: { geo: geo.box, mat: white(), colors: ['#2f4a3a', '#3a3a44', '#4a3a2a'], shadow: true },
      crate: { geo: geo.box, mat: white(), colors: ['#6a5030', '#7a6040', '#5a4a3a'], shadow: true },
      booth: { geo: geo.box, mat: boothMat, colors: ['#ffffff'], shadow: true },
      plant: { geo: geo.cyl, mat: white(), colors: ['#8a8f9a', '#6a6f7a'], shadow: false },
    };
    const byKind = new Map<string, typeof plan.clutter>();
    for (const c of plan.clutter) { const l = byKind.get(c.kind); if (l) l.push(c); else byKind.set(c.kind, [c]); }
    const kitTint = new Color();
    for (const [kind, list] of byKind) {
      const def = KIT[kind];
      if (!def) continue;
      const inst = new InstancedMesh(def.geo, def.mat, list.length);
      list.forEach((c, j) => {
        dummy.position.set(c.x, c.y, c.z);
        dummy.rotation.set(0, c.rotY, 0);
        dummy.scale.set(c.w, c.h, c.d);
        dummy.updateMatrix();
        inst.setMatrixAt(j, dummy.matrix);
        inst.setColorAt(j, kitTint.set(c.color ?? pick(rand, def.colors)).multiplyScalar(kind === 'vend' ? 0.8 : 1));
      });
      dummy.rotation.set(0, 0, 0);
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = def.shadow; inst.receiveShadow = def.shadow;
      scene.add(inst);
    }
    // the catwalks
    const cats = plan.streets.filter((s) => s.kind === 'catwalk');
    const deckMat = new MeshLambertMaterial({ color: '#3a3f52' });
    const catRail = new MeshLambertMaterial({ color: '#c8ccd6' });
    let nPosts = 0;
    for (const c of cats) nPosts += Math.floor(c.len / 3) + 1;
    const decks = new InstancedMesh(geo.box, deckMat, cats.length), rails2 = new InstancedMesh(geo.box, catRail, cats.length * 2), posts2 = new InstancedMesh(geo.box, catRail, nPosts * 2);
    const catLights: number[] = [];
    let jp = 0;
    cats.forEach((c, j) => {
      const yaw = Math.atan2(-c.dz, c.dx); // a box's length along the walk
      const mx = c.x0 + c.dx * c.len / 2, mz = c.z0 + c.dz * c.len / 2;
      const nx = -c.dz, nz = c.dx; // the walk's left
      dummy.rotation.set(0, yaw, 0);
      dummy.position.set(mx, c.y - 0.12, mz); dummy.scale.set(c.len, 0.24, c.width); dummy.updateMatrix(); decks.setMatrixAt(j, dummy.matrix);
      for (const s of [-1, 1]) {
        const lat = s * (c.width / 2 - 0.06);
        dummy.position.set(mx + nx * lat, c.y + 0.95, mz + nz * lat); dummy.scale.set(c.len, 0.06, 0.06); dummy.updateMatrix(); rails2.setMatrixAt(j * 2 + (s > 0 ? 1 : 0), dummy.matrix);
        for (let t = 0; t <= c.len + 0.01 && jp < nPosts * 2; t += 3) {
          const px = c.x0 + c.dx * Math.min(t, c.len) + nx * lat, pz = c.z0 + c.dz * Math.min(t, c.len) + nz * lat;
          dummy.position.set(px, c.y + 0.5, pz); dummy.scale.set(0.06, 1.0, 0.06); dummy.updateMatrix(); posts2.setMatrixAt(jp++, dummy.matrix);
        }
      }
      for (let t = 1.5; t < c.len; t += 6) catLights.push(c.x0 + c.dx * t, c.y + 1.7, c.z0 + c.dz * t); // a string of lanterns over the walk
    });
    posts2.count = jp;
    dummy.rotation.set(0, 0, 0);
    for (const inst of [decks, rails2, posts2]) { inst.instanceMatrix.needsUpdate = true; inst.castShadow = true; inst.receiveShadow = true; scene.add(inst); }
    glowPoints(catLights, '#ffd9a0', 2.4);
  }
  // -- THE RAIL (owner: Akira's elevated line): the deck as a chain of boxes along the plan's loop, two rails on it,
  // amber lights under its edge; the stations' canopies on columns with a white strip; three trains of four cars
  // circling it, braking into the stations and waiting there, their windows lit, a headlight and a red tail ------
  const railCurve = new CatmullRomCurve3(plan.rail.pts.map(([x, y, z]) => new Vector3(x, y, z)), true, 'centripetal');
  railCurve.arcLengthDivisions = 800;
  const railLen = railCurve.getLength();
  const stationS = plan.rail.stations.map((st) => {
    let best = 0, bd = Infinity;
    for (let k = 0; k < 800; k++) { const p = railCurve.getPointAt(k / 800); const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < bd) { bd = d; best = k / 800; } }
    return best * railLen;
  }).sort((a, b) => a - b);
  interface Train { s: number; v: number; dwell: number; next: number; since: number }
  const trains: Train[] = [];
  const CARS = 4, CAR = 9, CAR_GAP = 0.8, TRAINS = 3;
  const carMat = new MeshLambertMaterial({ color: '#b8bec8' });
  const carGlass = new MeshLambertMaterial({ color: '#1a2030', emissive: '#ffe9c9', emissiveIntensity: 1.2 });
  lampHeads.push(carGlass);
  const cars3 = new InstancedMesh(geo.box, carMat, TRAINS * CARS), glass3 = new InstancedMesh(geo.box, carGlass, TRAINS * CARS);
  const trainLights = { arr: new Float32Array(TRAINS * 2 * 3), col: new Float32Array(TRAINS * 2 * 3), g: new BufferGeometry() };
  {
    const steel = new MeshLambertMaterial({ color: '#4a5066' }), railMat2 = new MeshLambertMaterial({ color: '#c8ccd6' }), canopyMat = new MeshLambertMaterial({ color: '#3a3f52' });
    const n = plan.rail.pts.length;
    const deck = new InstancedMesh(geo.box, steel, n), rails3 = new InstancedMesh(geo.box, railMat2, n * 2);
    const railLights: number[] = [];
    plan.rail.pts.forEach(([ax, ay, az], i) => {
      const [bx, , bz] = plan.rail.pts[(i + 1) % n];
      const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, nx = -(bz - az) / len, nz = (bx - ax) / len;
      dummy.rotation.set(0, yaw, 0);
      dummy.position.set(mx, ay - 0.35, mz); dummy.scale.set(len + 0.3, 0.7, RAIL.w); dummy.updateMatrix(); deck.setMatrixAt(i, dummy.matrix);
      for (const s of [-1, 1]) {
        dummy.position.set(mx + nx * s * 0.75, ay + 0.1, mz + nz * s * 0.75); dummy.scale.set(len + 0.3, 0.2, 0.14); dummy.updateMatrix(); rails3.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
      if (i % 2 === 0) for (const s of [-1, 1]) railLights.push(mx + nx * s * (RAIL.w / 2), ay - 0.9, mz + nz * s * (RAIL.w / 2));
    });
    dummy.rotation.set(0, 0, 0);
    for (const inst of [deck, rails3]) { inst.instanceMatrix.needsUpdate = true; inst.castShadow = true; inst.receiveShadow = true; scene.add(inst); }
    glowPoints(railLights, '#ffb347', 2.0, 0.8);
    glowPoints(deckLights, '#dfe6ff', 2.4, 0.7); // the cold tubes under the deck
    glowPoints(bridgeLamps, '#ffe9c9', 3.0, 0.9); // the bridges' lamp poles and lanterns
    for (const st of plan.rail.stations) {
      const along = Math.abs(st.dx) > 0.5;
      const canopy = new Mesh(new BoxGeometry(along ? 22 : 9.4, 0.4, along ? 9.4 : 22), canopyMat);
      canopy.position.set(st.x, RAIL.y + 4.6, st.z); canopy.castShadow = true; canopy.receiveShadow = true;
      scene.add(canopy);
      for (const u of [-9, 9]) for (const s of [-1, 1]) {
        const col = new Mesh(new BoxGeometry(0.3, 4, 0.3), railMat2);
        col.position.set(st.x + st.dx * u - st.dz * s * 4.2, RAIL.y + 2.6, st.z + st.dz * u + st.dx * s * 4.2);
        scene.add(col);
      }
      const strip = new Mesh(new BoxGeometry(along ? 20 : 0.3, 0.12, along ? 0.3 : 20), new MeshBasicMaterial({ color: '#dff6ff' }));
      strip.position.set(st.x, RAIL.y + 4.35, st.z);
      scene.add(strip);
    }
    for (let i = 0; i < TRAINS; i++) {
      const s = (i / TRAINS) * railLen;
      const nextIdx = stationS.findIndex((ss) => ss > s);
      trains.push({ s, v: 0.9, dwell: 0, next: nextIdx === -1 ? 0 : nextIdx, since: 60 });
    }
    scene.add(cars3, glass3);
    trainLights.g.setAttribute('position', new BufferAttribute(trainLights.arr, 3));
    trainLights.g.setAttribute('color', new BufferAttribute(trainLights.col, 3));
    scene.add(new Points(trainLights.g, new PointsMaterial({ vertexColors: true, size: 2.6, sizeAttenuation: true, transparent: true, blending: AdditiveBlending, depthWrite: false })));
  }
  // LIFT CABS: a lit box riding each station shaft between the pavement and the platform, dwelling at both ends
  const cabMat = new MeshLambertMaterial({ color: '#dfe6ff', emissive: '#ffe9c9', emissiveIntensity: 0.9 });
  lampHeads.push(cabMat);
  const cabs = new InstancedMesh(geo.box, cabMat, Math.max(1, plan.lifts.length));
  const runCabs = () => {
    plan.lifts.forEach((l, i) => {
      const period = 1500, ph = ((tick + i * 271) % period) / period; // up, dwell, down, dwell
      const u = ph < 0.4 ? ph / 0.4 : ph < 0.5 ? 1 : ph < 0.9 ? 1 - (ph - 0.5) / 0.4 : 0;
      const e = u * u * (3 - 2 * u);
      dummy.rotation.set(0, 0, 0); dummy.position.set(l.x, 1.1 + (l.top - 1.1) * e, l.z); dummy.scale.set(0.8, 1.5, 0.8); dummy.updateMatrix(); cabs.setMatrixAt(i, dummy.matrix);
    });
    cabs.instanceMatrix.needsUpdate = true;
  };
  scene.add(cabs);
  { // the underground entrances' stairs, painted into their insets
    const steps = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({ map: stairsTexture(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), Math.max(1, plan.subways.length));
    plan.subways.forEach((s, i) => { dummy.rotation.set(0, s.rotY, 0); dummy.position.set(s.x, 0.29, s.z); dummy.scale.set(1.7, 1, 4.4); dummy.updateMatrix(); steps.setMatrixAt(i, dummy.matrix); });
    dummy.rotation.set(0, 0, 0);
    steps.instanceMatrix.needsUpdate = true;
    scene.add(steps);
  }
  const railP = new Vector3(), railT = new Vector3();
  const RAIL_HEAD = new Color('#fff4d6'), RAIL_TAIL = new Color('#ff3b2f');
  const runTrains = () => {
    trains.forEach((t, ti) => {
      if (t.dwell > 0) { t.dwell -= 1; if (t.dwell === 0) t.since = 0; }
      else {
        const target = stationS[t.next];
        const d = (((target - t.s) % railLen) + railLen) % railLen; // to the next station, along the loop
        t.v = Math.min(0.9, Math.max(0.12, Math.min(d / 45, t.since / 40 + 0.14) * 0.9)); // brakes into a station, eases out of one
        if (d <= t.v + 0.01) { t.s = target; t.dwell = 240; t.next = (t.next + 1) % stationS.length; }
        else { t.s += t.v; t.since += t.v; }
      }
      for (let k = 0; k < CARS; k++) {
        const sc = t.s - k * (CAR + CAR_GAP) - CAR / 2;
        const u = (((sc % railLen) + railLen) % railLen) / railLen;
        railCurve.getPointAt(u, railP); railCurve.getTangentAt(u, railT);
        const yaw = Math.atan2(railT.x, railT.z);
        dummy.rotation.set(0, yaw, 0);
        dummy.position.set(railP.x, railP.y + 1.55, railP.z); dummy.scale.set(2.3, 3.0, CAR); dummy.updateMatrix(); cars3.setMatrixAt(ti * CARS + k, dummy.matrix);
        dummy.position.set(railP.x, railP.y + 2.05, railP.z); dummy.scale.set(2.36, 1.0, CAR * 0.88); dummy.updateMatrix(); glass3.setMatrixAt(ti * CARS + k, dummy.matrix);
        if (k === 0) { // the headlight, ahead of the first car
          const j = ti * 6;
          trainLights.arr[j] = railP.x + railT.x * (CAR / 2 + 0.2); trainLights.arr[j + 1] = railP.y + 1.2; trainLights.arr[j + 2] = railP.z + railT.z * (CAR / 2 + 0.2);
          RAIL_HEAD.toArray(trainLights.col, j);
        }
        if (k === CARS - 1) { // the tail, behind the last
          const j = ti * 6 + 3;
          trainLights.arr[j] = railP.x - railT.x * (CAR / 2 + 0.2); trainLights.arr[j + 1] = railP.y + 1.2; trainLights.arr[j + 2] = railP.z - railT.z * (CAR / 2 + 0.2);
          RAIL_TAIL.toArray(trainLights.col, j);
        }
      }
    });
    dummy.rotation.set(0, 0, 0);
    cars3.instanceMatrix.needsUpdate = true; glass3.instanceMatrix.needsUpdate = true;
    (trainLights.g.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (trainLights.g.getAttribute('color') as BufferAttribute).needsUpdate = true;
  };
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
    scene.add(new Points(g, dim(new PointsMaterial({
      vertexColors: true, size: 2.6, sizeAttenuation: true, transparent: true, opacity: 0.9,
      blending: AdditiveBlending, depthWrite: false,
    }), 'lamps', 0.35)));
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
    return lane.len * (inCore(st.x0 + st.dx * t, st.z0 + st.dz * t) ? 3 : 0.9) * (st.kind === 'highway' ? 2.2 : st.kind === 'arterial' ? 2.5 : 1);
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
  const total = cars.length; // (the boats have hulls of their own below)
  const carWrap = carTextures();
  const carMesh = new InstancedMesh(geo.box, [ // lit, wrapped: a side, a side, the roof, the underside, an end, an end
    new MeshLambertMaterial({ map: carWrap.side }), new MeshLambertMaterial({ map: carWrap.side }), new MeshLambertMaterial({ map: carWrap.top }),
    new MeshLambertMaterial({ color: '#0a0a10' }), new MeshLambertMaterial({ map: carWrap.end }), new MeshLambertMaterial({ map: carWrap.end }),
  ], total);
  cars.forEach((c, i) => carMesh.setColorAt(i, new Color(
    c.kind === 'bus' ? '#d9d2c4' : c.kind === 'taxi' ? '#ffd23f' : c.kind === 'truck' ? pick(rand, TRUCK) : c.kind === 'moto' ? '#1a1a24' : pick(rand, BODY))));
  scene.add(carMesh);
  { // PARKED along the arterial's aprons (owner: a lived-in boulevard): the plan's spots, in the vehicles' own wraps
    const parkedMesh = new InstancedMesh(geo.box, carMesh.material, Math.max(1, plan.parked.length));
    plan.parked.forEach((p, i) => {
      const [len, w, h] = SPEC[p.kind];
      dummy.rotation.set(0, p.yaw, 0); dummy.position.set(p.x, h / 2 + 0.05, p.z); dummy.scale.set(w, h, len); dummy.updateMatrix(); parkedMesh.setMatrixAt(i, dummy.matrix);
      parkedMesh.setColorAt(i, new Color(p.kind === 'taxi' ? '#ffd23f' : p.kind === 'truck' ? pick(rand, TRUCK) : p.kind === 'moto' ? '#1a1a24' : pick(rand, BODY)));
    });
    parkedMesh.count = plan.parked.length;
    dummy.rotation.set(0, 0, 0);
    parkedMesh.instanceMatrix.needsUpdate = true; if (parkedMesh.instanceColor) parkedMesh.instanceColor.needsUpdate = true; parkedMesh.castShadow = true;
    scene.add(parkedMesh);
  }
  // BOATS (owner: they were car-shaped boxes in car wraps, clipping the bridge decks): a low hull, a cabin aft with lit
  // windows, a white bow light and a red stern light; the hull's top at 0.5 and the cabin's at 1.15, under the decks at 1.35
  const hullMat = new MeshLambertMaterial({ color: '#22283a' }), cabinMat = new MeshLambertMaterial({ color: '#3a4258' });
  const cabinGlass = new MeshLambertMaterial({ color: '#1a2030', emissive: '#ffd9a0', emissiveIntensity: 1.2 });
  lampHeads.push(cabinGlass);
  const hulls = new InstancedMesh(geo.box, hullMat, boats.length), cabins = new InstancedMesh(geo.box, cabinMat, boats.length), cabinWin = new InstancedMesh(geo.box, cabinGlass, boats.length);
  scene.add(hulls, cabins, cabinWin);
  const boatLights = { arr: new Float32Array(boats.length * 2 * 3), col: new Float32Array(boats.length * 2 * 3), g: new BufferGeometry() };
  boatLights.g.setAttribute('position', new BufferAttribute(boatLights.arr, 3));
  boatLights.g.setAttribute('color', new BufferAttribute(boatLights.col, 3));
  scene.add(new Points(boatLights.g, new PointsMaterial({ vertexColors: true, size: 1.6, sizeAttenuation: true, transparent: true, depthWrite: false })));
  const BOW = new Color('#fff4d6'), STERN = new Color('#ff3b2f');
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
  dim(heads.pts.material as PointsMaterial, 'lamps', 0.35); // the headlights dim by day like the throws
  // and the headlights' throw: a cone of light on the road ahead (owner: lit by practicals)
  const throws = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dim(additiveFog(new MeshBasicMaterial({
    map: headlightTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.22, color: '#fff0cc',
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, // a decal: never z-fights the road it lies on
  }))), total);
  throws.frustumCulled = false;
  scene.add(throws);
  const throwTint = new Color();
  const tails = lightsOf('#ffffff', 1.3, true); // per vehicle: dim red, or bright when braking
  const TAIL = new Color('#ff3b2f').multiplyScalar(0.55), BRAKE = new Color('#ff5040').multiplyScalar(1.6);
  const placeVehicle = (
    i: number, x: number, y: number, z: number, yaw: number, pitch: number, w: number, h: number, len: number, weave: number, brake: boolean,
    glow: number, // the headlights' throw, 0..1: a queue of stopped cars dips its beams (stacked throws once washed the deck white)
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
    const ahead = len / 2 + 3;
    dummy.position.set(x + hx * cp * ahead, y - h / 2 + sp * ahead + 0.06, z + hz * cp * ahead);
    dummy.scale.set(w + 1.6, 1, 6);
    dummy.updateMatrix();
    throws.setMatrixAt(i, dummy.matrix);
    throws.setColorAt(i, throwTint.setScalar(glow));
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
      const weave = 0; // (owner: the motorcycles swayed back and forth — they hold their line)
      placeVehicle(i, c.x, c.y + c.h / 2 + 0.05, c.z, c.yaw, c.pitch, c.w, c.h, c.len, weave, c.brake || c.v < 0.01, 0.4 + 0.6 * Math.min(1, c.v / (c.vmax * 0.6)));
    }
    boats.forEach((b, k) => {
      b.t += b.v;
      if (b.t > canal.len) b.t -= canal.len;
      if (b.t < 0) b.t += canal.len;
      const x = canal.x0 + canal.dx * b.t - canal.dz * b.lane, z = canal.z0 + canal.dz * b.t + canal.dx * b.lane;
      const yaw = b.v > 0 ? Math.atan2(canal.dx, canal.dz) : Math.atan2(-canal.dx, -canal.dz);
      const hx = Math.sin(yaw), hz = Math.cos(yaw);
      dummy.rotation.order = 'XYZ'; dummy.rotation.set(0, yaw, 0);
      const W = CANAL.water;
      dummy.position.set(x, W + 0.28, z); dummy.scale.set(2.2, 0.44, 7); dummy.updateMatrix(); hulls.setMatrixAt(k, dummy.matrix);
      dummy.position.set(x - hx * 1.6, W + 0.82, z - hz * 1.6); dummy.scale.set(1.5, 0.64, 2.4); dummy.updateMatrix(); cabins.setMatrixAt(k, dummy.matrix);
      dummy.position.set(x - hx * 1.6, W + 0.9, z - hz * 1.6); dummy.scale.set(1.54, 0.26, 2.2); dummy.updateMatrix(); cabinWin.setMatrixAt(k, dummy.matrix);
      const j = k * 6;
      boatLights.arr[j] = x + hx * 3.4; boatLights.arr[j + 1] = W + 0.7; boatLights.arr[j + 2] = z + hz * 3.4; BOW.toArray(boatLights.col, j);
      boatLights.arr[j + 3] = x - hx * 3.4; boatLights.arr[j + 4] = W + 1.2; boatLights.arr[j + 5] = z - hz * 3.4; STERN.toArray(boatLights.col, j + 3);
    });
    hulls.instanceMatrix.needsUpdate = true; cabins.instanceMatrix.needsUpdate = true; cabinWin.instanceMatrix.needsUpdate = true;
    (boatLights.g.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (boatLights.g.getAttribute('color') as BufferAttribute).needsUpdate = true;
    dummy.rotation.set(0, 0, 0);
    dummy.rotation.order = 'XYZ';
    carMesh.instanceMatrix.needsUpdate = true;
    throws.instanceMatrix.needsUpdate = true;
    if (throws.instanceColor) throws.instanceColor.needsUpdate = true;
    if (carMesh.instanceColor) carMesh.instanceColor.needsUpdate = true;
    (heads.pts.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (tails.pts.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (tails.pts.geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
  };

  // -- TRAFFIC LIGHTS (owner: the vehicles stopped for nothing — the lights lived in the simulation alone): at
  // every lit crossing, for each street and each direction of travel along it, a post on the corner before the
  // box on the side that traffic drives on, an arm over its near lane, a head facing the approach with a red lamp
  // over a green one lit by the crossing's phase, and a pedestrian lamp on the post — white when that street's
  // cars have the red, when the walkers cross ----------------------------------------------------------------------
  interface SignalHead { n: (typeof traffic.nodes)[number]; group: number }
  const signalHeads: SignalHead[] = [];
  let signalLamps: InstancedMesh | null = null;
  {
    const lit = traffic.nodes.filter((n) => n.signal && n.streets.length >= 2);
    let count = 0;
    for (const n of lit) count += n.streets.length * 2;
    const postMat = new MeshLambertMaterial({ color: '#2a2e3a' }), housingMat = new MeshLambertMaterial({ color: '#15171d' });
    const lampMat = new MeshBasicMaterial({ color: '#ffffff' });
    const sposts = new InstancedMesh(geo.box, postMat, count * 2), housings = new InstancedMesh(geo.box, housingMat, count);
    signalLamps = new InstancedMesh(geo.box, lampMat, count * 3);
    let jp = 0, jh = 0, jl = 0;
    const rowOf = (q: Street) => (q.kind === 'arterial' ? ARTERIAL_ROW : q.width / 2);
    for (const n of lit) {
      for (const st of n.streets) {
        const group = n.streets.indexOf(st);
        for (const dir of [1, -1] as const) {
          const ux = st.dx * dir, uz = st.dz * dir; // the approach's heading
          const lx = -uz, lz = ux; // its left: the side it drives on
          // the post at the corner of the two pavements: back from the box by the cross streets' right of way, out on
          // this street's own pavement (the arterial's approaches: at its kerb, in the apron) — then pushed out of any
          // carriageway it still stands in (the six-way crossings), or dropped (owner: 25 posts stood in the road)
          const back = n.streets.reduce((m, o) => (o === st ? m : Math.max(m, rowOf(o))), 0) + 0.9;
          const out = st.kind === 'arterial' ? st.width / 2 + 0.9 : rowOf(st) - 1.2;
          let cx = n.x - ux * back + lx * out, cz = n.z - uz * back + lz * out;
          let clear = false;
          for (let k = 0; k < 6 && !clear; k++) {
            clear = n.streets.every((o) => {
              const u = (cx - o.x0) * o.dx + (cz - o.z0) * o.dz;
              if (u < 0 || u > o.len) return true;
              return Math.abs(-(cx - o.x0) * o.dz + (cz - o.z0) * o.dx) > (o.kind === 'diagonal' ? 4.9 : o.width / 2) + 0.3;
            });
            if (!clear) { cx += lx; cz += lz; }
          }
          if (!clear) continue;
          dummy.rotation.set(0, 0, 0);
          dummy.position.set(cx, n.y + 2.75, cz); dummy.scale.set(0.16, 5.5, 0.16); dummy.updateMatrix(); sposts.setMatrixAt(jp++, dummy.matrix);
          dummy.position.set(cx - lx * 1.6, n.y + 5.4, cz - lz * 1.6); dummy.scale.set(Math.abs(lx) * 3.2 + 0.12, 0.12, Math.abs(lz) * 3.2 + 0.12); dummy.updateMatrix(); sposts.setMatrixAt(jp++, dummy.matrix); // the arm over the near lane
          const hx = cx - lx * 3.0, hz = cz - lz * 3.0, hy = n.y + 4.75;
          const yaw = Math.atan2(-ux, -uz); // the head faces the approach
          dummy.rotation.set(0, yaw, 0);
          dummy.position.set(hx, hy, hz); dummy.scale.set(0.5, 1.2, 0.34); dummy.updateMatrix(); housings.setMatrixAt(jh++, dummy.matrix);
          for (const dy of [0.3, -0.3]) { // red over green, on the face
            dummy.position.set(hx - ux * 0.19, hy + dy, hz - uz * 0.19); dummy.scale.set(0.34, 0.34, 0.06); dummy.updateMatrix(); signalLamps.setMatrixAt(jl++, dummy.matrix);
          }
          dummy.rotation.set(0, Math.atan2(ux, uz), 0); // the pedestrian lamp on the post, for the corner's walkers
          dummy.position.set(cx + ux * 0.1, n.y + 2.6, cz + uz * 0.1); dummy.scale.set(0.22, 0.3, 0.06); dummy.updateMatrix(); signalLamps.setMatrixAt(jl++, dummy.matrix);
          signalHeads.push({ n, group });
        }
      }
    }
    sposts.count = jp; housings.count = jh; signalLamps.count = jl;
    dummy.rotation.set(0, 0, 0);
    for (const inst of [sposts, housings, signalLamps]) { inst.instanceMatrix.needsUpdate = true; scene.add(inst); }
    // ZEBRAS at the arterial's crossings: across its carriageway on the side street's pavement lines, across the side
    // street on the arterial's pavement lines (the ground tile's crossings only know the grid)
    const zebraMat = new MeshBasicMaterial({ map: zebraTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const crossings = lit.filter((n) => n.streets.some((q) => q.kind === 'arterial') && n.streets.some((q) => q.kind === 'road'));
    const zebras = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), zebraMat, Math.max(1, crossings.length * 4));
    let jz = 0;
    for (const n of crossings) {
      const art = n.streets.find((q) => q.kind === 'arterial')!, road = n.streets.find((q) => q.kind === 'road')!;
      for (const s of [-1, 1]) {
        // across the arterial, on the road's pavement line: as long as the carriageway is wide where the road crosses it
        dummy.rotation.set(0, Math.atan2(road.dx, road.dz) + Math.PI / 2, 0);
        dummy.position.set(n.x - road.dz * s * 6.2, 0.07, n.z + road.dx * s * 6.2); dummy.scale.set(ARTERIAL.w / Math.abs(road.dx * art.dz - road.dz * art.dx) + 0.4, 1, 2.4); dummy.updateMatrix(); zebras.setMatrixAt(jz++, dummy.matrix);
        // across the road, on the arterial's pavement line
        dummy.rotation.set(0, Math.atan2(art.dx, art.dz) + Math.PI / 2, 0);
        dummy.position.set(n.x - art.dz * s * (ARTERIAL_ROW - ARTERIAL.walk / 2), 0.07, n.z + art.dx * s * (ARTERIAL_ROW - ARTERIAL.walk / 2)); dummy.scale.set(ROAD + 0.4, 1, 2.2); dummy.updateMatrix(); zebras.setMatrixAt(jz++, dummy.matrix);
      }
    }
    // SIX-WAY BOXES (owner: photo 1 — the boulevard's crossings were two crossings drawn on top of each other): one
    // plain box over each carriageway's reach through the node, over the strips' paint and the tile's, with a
    // zebra at the mouth of every arm and a stop line before the boulevard's
    const sixes = traffic.nodes.filter((n) => n.streets.some((q) => q.kind === 'diagonal') && n.streets.length >= 2);
    const boxMat = streetMat(asphaltTextures(aniso), 1);
    const lineMat = new MeshBasicMaterial({ color: '#e8eaf0', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 });
    const sixZebras = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), zebraMat, Math.max(1, sixes.length * 6));
    let js = 0;
    for (const n of sixes) {
      n.streets.forEach((s, i) => {
        const half = s.kind === 'diagonal' ? 4.9 : s.width / 2;
        const reach = n.streets.reduce((m, o) => (o === s ? m : Math.max(m, rowOf(o))), 0) + 1.5;
        const yaw = Math.atan2(-s.dz, s.dx);
        const box = new Mesh(new PlaneGeometry(2 * reach, 2 * half).rotateX(-Math.PI / 2), boxMat);
        box.position.set(n.x, 0.052 + 0.002 * i, n.z); box.rotation.y = yaw; box.receiveShadow = true;
        scene.add(box);
        for (const d of [-1, 1]) {
          dummy.rotation.set(0, yaw + Math.PI / 2, 0);
          dummy.position.set(n.x + s.dx * d * (reach - 1.3), 0.062, n.z + s.dz * d * (reach - 1.3)); dummy.scale.set(2 * half + 0.4, 1, 2.2); dummy.updateMatrix(); sixZebras.setMatrixAt(js++, dummy.matrix);
          if (s.kind === 'diagonal') { // the boulevard's stop lines (the tile paints the roads')
            const line = new Mesh(new PlaneGeometry(2 * half, 0.4).rotateX(-Math.PI / 2), lineMat);
            line.position.set(n.x + s.dx * d * (reach + 0.4), 0.064, n.z + s.dz * d * (reach + 0.4)); line.rotation.y = yaw + Math.PI / 2;
            scene.add(line);
          }
        }
      });
    }
    sixZebras.count = js;
    zebras.count = jz;
    dummy.rotation.set(0, 0, 0);
    zebras.instanceMatrix.needsUpdate = true; sixZebras.instanceMatrix.needsUpdate = true;
    scene.add(zebras, sixZebras);
  }
  const RED = new Color('#ff3b3b'), GREEN = new Color('#3dff8f'), OFF_RED = new Color('#2a0808'), OFF_GREEN = new Color('#082a12'), WALK = new Color('#e8f4ff'), DONT = new Color('#ff5e4a');
  const tendSignals = () => {
    if (!signalLamps) return;
    signalHeads.forEach((h, i) => {
      const g = traffic.green(h.n, h.group);
      signalLamps!.setColorAt(i * 3, g ? OFF_RED : RED);
      signalLamps!.setColorAt(i * 3 + 1, g ? GREEN : OFF_GREEN);
      signalLamps!.setColorAt(i * 3 + 2, g ? DONT : WALK); // the walkers cross this street when its cars have the red
    });
    if (signalLamps.instanceColor) signalLamps.instanceColor.needsUpdate = true;
  };
  tendSignals();

  // -- PEOPLE (owner: NPCs interacting, going about their business): pixel
  // sprites with lives (city-people.ts) — walking, stopping, talking in
  // knots, browsing and vending at the markets, crossing on the red, sitting ----
  const zones: Zone[] = [];
  for (const st of plan.stalls) {
    let z = zones.find((zn) => Math.abs(zn.x - st.x) < 30 && Math.abs(zn.z - st.z) < 30);
    if (!z) { z = { x: st.x, z: st.z, w: 6, d: 6, stalls: [] }; zones.push(z); }
    z.stalls.push(st);
  }
  for (const z of zones) {
    const xs = z.stalls.map((q) => q.x), zs = z.stalls.map((q) => q.z);
    const x0 = Math.min(...xs) - 3, x1 = Math.max(...xs) + 3, z0 = Math.min(...zs) - 3, z1 = Math.max(...zs) + 3;
    z.x = (x0 + x1) / 2; z.z = (z0 + z1) / 2; z.w = x1 - x0; z.d = z1 - z0;
  }
  const nodeAt = new Map<string, (typeof traffic.nodes)[number]>();
  for (const n of traffic.nodes) nodeAt.set(`${Math.round(n.x)}:${Math.round(n.z)}`, n);
  const crossOK = (x: number, z: number, axis: 'x' | 'z' | 'd'): boolean => {
    const n = nodeAt.get(`${Math.round(x)}:${Math.round(z)}`);
    if (!n || !n.signal) return false;
    const st = axis === 'd' ? n.streets.find((q) => q.kind === 'diagonal') : n.streets.find((q) => q.kind !== 'diagonal' && (axis === 'x') === (q.dx !== 0));
    return st ? !traffic.green(n, Math.max(0, n.streets.indexOf(st))) : false;
  };
  const crossNodes: number[] = [];
  for (let i = -HALF - OUTER - 1; i <= HALF + OUTER; i++) crossNodes.push(streetAt(i));
  // the two sims speak: the walkers ask whether a crosswalk is clear of vehicles and where the walls are; the traffic
  // asks who is in its crosswalks (owner: pedestrians clipped through vehicles, vehicles drove through pedestrians)
  // the plaza's crowd (about the statue, which they browse like a stall), the stages' crowds, the rooftop parties
  zones.push({ x: 0, z: 0, w: 22, d: 22, stalls: [{ x: 0, z: 0, color: '#ffffff' }] });
  for (const st of plan.stages) zones.push({ x: st.x + Math.sign(st.x) * (st.w / 2 + 6.5), z: st.z, w: 9, d: 16, stalls: [] });
  for (const pt of plan.parties) zones.push({ x: pt.x, y: pt.y, z: pt.z, w: pt.w, d: pt.d, stalls: [] });
  const people = new People(plan.streets, zones, plan.stalls, mulberry32(seed ^ 0x7e0b1e), calm ? 1100 : 2200, crossOK, crossNodes, {
    solid: (x, y, z) => plan.grid.hit(x, y, z, 0.3) !== null,
    roadClear: (x, z) => traffic.clearAt(x, z),
    doors: plan.doors,
    perches: plan.perches,
  });
  traffic.peds = (x, z, axis) => people.walkersIn(x, z, axis) > 0;
  const PEOPLE = people.people.length;
  const ROWS = CAST.length * LOOKS_PER_KIND;
  const peopleGeo = new InstancedBufferGeometry();
  {
    const plane = new PlaneGeometry(1, 1);
    peopleGeo.index = plane.index;
    peopleGeo.setAttribute('position', plane.getAttribute('position'));
    peopleGeo.setAttribute('uv', plane.getAttribute('uv'));
  }
  const pPos = new Float32Array(PEOPLE * 3), pFrame = new Float32Array(PEOPLE), pYaw = new Float32Array(PEOPLE);
  const pRow = new Float32Array(PEOPLE), pScale = new Float32Array(PEOPLE);
  const pTop = new Float32Array(PEOPLE * 3), pBot = new Float32Array(PEOPLE * 3), pHair = new Float32Array(PEOPLE * 3);
  const pSkin = new Float32Array(PEOPLE * 3), pGlow = new Float32Array(PEOPLE * 3);
  // the palettes: the cast dresses itself
  const SKINS = ['#f3d2b3', '#e6b48e', '#cf9466', '#a86f45', '#7e4d2b', '#5a3620'];
  const HAIRS = ['#1a1410', '#2c1d12', '#4a3020', '#7a4a26', '#c9a15a', '#d9d3c7', '#8c2a1a', '#3a3a44'];
  const NEON_HAIR = ['#ff2e63', '#7de8ff', '#c8ff00', '#b79cff', '#ff8c42'];
  const TOPS = ['#c8552c', '#2a5aa8', '#d9c26a', '#3f7f5a', '#7a3d8f', '#c9c2b2', '#b03a3a', '#1f2a44', '#e8e2d2', '#1b1b22',
    '#556b2f', '#8b4513', '#d2691e', '#4682b4', '#708090', '#ff8c42', '#2f4f4f', '#9b111e', '#f0e68c', '#6a5acd', '#20b2aa', '#a0522d', '#dcdcdc', '#3b3b3b'];
  const BOTTOMS = ['#1f2a44', '#20202e', '#3a3a44', '#5a4a3a', '#2e3a5a', '#6b6b78', '#1a2a1a', '#8a8a94', '#3b2f2f', '#c9c2b2'];
  const GLOWS = ['#7de8ff', '#ff2e63', '#c8ff00', '#ffb347', '#b79cff', '#ffffff', '#ff5e7a'];
  const SUITS = ['#1b1b22', '#2a2a3a', '#2f2f3f', '#3b3b4b', '#1f2a44', '#3a2a2a'];
  const MUTED = ['#5a4a3a', '#6b6b78', '#3a3a44', '#7a6a5a', '#8a8a94', '#4a5a6a'];
  const ROBES = ['#7a3d1e', '#b04a1a', '#5a3a6a', '#d9c26a', '#3a3a44', '#e8e2d2', '#2a5aa8'];
  const BRIGHT = ['#ff8c42', '#c8ff00', '#7de8ff', '#ff2e63', '#ffd23f', '#e8e2d2', '#4682b4'];
  const palette = (list: string[]) => new Color(pick(rand, list));
  people.people.forEach((p, i) => {
    const name = CAST[p.kind].name;
    pRow[i] = p.kind * LOOKS_PER_KIND + Math.floor(rand() * LOOKS_PER_KIND);
    pScale[i] = name === 'heavy' ? 1.02 + rand() * 0.1 : name === 'kid' ? 1 : name === 'elder' ? 0.94 + rand() * 0.06 : 0.9 + rand() * 0.2;
    let top = palette(TOPS), bot = palette(BOTTOMS), hair = palette(HAIRS), skin = palette(SKINS), glow = palette(GLOWS);
    switch (name) {
      case 'punk': case 'cyber': if (rand() < 0.7) hair = palette(NEON_HAIR); break;
      case 'suit': top = palette(SUITS); bot = top.clone(); break;
      case 'cop': top = new Color('#1c2340'); bot = new Color('#161c34'); hair = new Color('#1c2340'); glow = new Color('#ffd23f'); break;
      case 'worker': top = palette(['#ff7a1a', '#ffb300', '#ff5a1a', '#3a5a8a']); hair = palette(['#ffcc22', '#ffffff', '#ff8c1a']); glow = new Color('#ffe066'); bot = palette(['#2e3a5a', '#5a4a3a', '#3a3a44']); break;
      case 'android': skin = palette(['#9a9cae', '#7c8096', '#b0b4c4']); top = palette(['#3a4058', '#565c74', '#2a2e44', '#7a7e92']); bot = top.clone(); glow = palette(['#7de8ff', '#ff2e63', '#c8ff00']); break;
      case 'elder': hair = palette(['#d9d3c7', '#bfb8ab', '#8a8a8a', '#3a3a44']); top = palette(MUTED); bot = palette(MUTED); break;
      case 'robe': top = palette(ROBES); bot = top.clone(); break;
      case 'courier': hair = palette(['#ff5e2a', '#e8e2d2', '#1a1a22', '#c8ff00', '#2a5aa8']); break;
      case 'kid': top = palette(BRIGHT); break;
      case 'dress': bot = rand() < 0.6 ? skin.clone() : palette(['#20202e', '#3a3a44', '#1f2a44']); break; // bare legs, or tights
      default: break;
    }
    top.toArray(pTop, i * 3); bot.toArray(pBot, i * 3); hair.toArray(pHair, i * 3); skin.toArray(pSkin, i * 3); glow.toArray(pGlow, i * 3);
  });
  peopleGeo.setAttribute('aPos', new InstancedBufferAttribute(pPos, 3));
  peopleGeo.setAttribute('aFrame', new InstancedBufferAttribute(pFrame, 1));
  peopleGeo.setAttribute('aYaw', new InstancedBufferAttribute(pYaw, 1));
  peopleGeo.setAttribute('aRow', new InstancedBufferAttribute(pRow, 1));
  peopleGeo.setAttribute('aScale', new InstancedBufferAttribute(pScale, 1));
  peopleGeo.setAttribute('aTop', new InstancedBufferAttribute(pTop, 3));
  peopleGeo.setAttribute('aBot', new InstancedBufferAttribute(pBot, 3));
  peopleGeo.setAttribute('aHair', new InstancedBufferAttribute(pHair, 3));
  peopleGeo.setAttribute('aSkin', new InstancedBufferAttribute(pSkin, 3));
  peopleGeo.setAttribute('aGlow', new InstancedBufferAttribute(pGlow, 3));
  peopleGeo.instanceCount = PEOPLE;
  // a basic material, patched: each instance's quad is billboarded at its
  // person's feet, its frame and look picked from the sheet, the marker
  // colours swapped for the person's own palette (the glow left unlit); the
  // map, the alpha test and the fog are three's own
  const peopleMat = new MeshBasicMaterial({ map: peopleTexture(), alphaTest: 0.5, color: '#b4b4be', fog: true }); // the dim: under the bloom's threshold
  peopleMat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aPos; attribute float aFrame; attribute float aYaw; attribute float aRow; attribute float aScale;
        attribute vec3 aTop; attribute vec3 aBot; attribute vec3 aHair; attribute vec3 aSkin; attribute vec3 aGlow;
        varying vec3 vTop; varying vec3 vBot; varying vec3 vHair; varying vec3 vSkin; varying vec3 vGlow;`)
      .replace('#include <uv_vertex>', `
        vec3 bbRight = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );
        float bbFlip = dot( bbRight, vec3( sin( aYaw ), 0.0, cos( aYaw ) ) ) < 0.0 ? 1.0 : 0.0;
        vMapUv = vec2( ( mix( uv.x, 1.0 - uv.x, bbFlip ) + aFrame ) / 8.0, 1.0 - ( aRow + 1.0 - uv.y ) / ${ROWS}.0 );
        vTop = aTop; vBot = aBot; vHair = aHair; vSkin = aSkin; vGlow = aGlow;`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = aPos + bbRight * position.x * 0.78 * aScale + vec3( 0.0, ( position.y + 0.5 ) * 1.55 * aScale, 0.0 );`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vTop; varying vec3 vBot; varying vec3 vHair; varying vec3 vSkin; varying vec3 vGlow;`)
      .replace('#include <map_fragment>', `
        vec4 pTex = texture2D( map, vMapUv );
        vec3 pt = pTex.rgb;
        float mTop = step( 2.9, pt.r + pt.g + pt.b );
        float mBot = step( 1.9, pt.r + pt.b ) * step( pt.g, 0.1 );
        float mHair = step( 1.9, pt.g + pt.b ) * step( pt.r, 0.1 );
        float mSkin = step( 1.9, pt.r + pt.g ) * step( pt.b, 0.1 );
        float mGlow = step( 0.9, pt.g ) * step( pt.r, 0.1 ) * step( pt.b, 0.1 );
        vec3 pc = pt;
        pc = mix( pc, vTop, mTop ); pc = mix( pc, vBot, mBot ); pc = mix( pc, vHair, mHair ); pc = mix( pc, vSkin, mSkin );
        pc *= diffuse;
        pc = mix( pc, vGlow, mGlow );
        diffuseColor = vec4( pc, pTex.a );`);
  };
  peopleMat.customProgramCacheKey = () => 'people';
  const peopleMesh = new Mesh(peopleGeo, peopleMat);
  peopleMesh.frustumCulled = false;
  scene.add(peopleMesh);
  const walkPeople = () => {
    people.step();
    for (let i = 0; i < PEOPLE; i++) {
      const p = people.people[i];
      pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
      pFrame[i] = p.frame;
      pYaw[i] = p.yaw;
    }
    (peopleGeo.getAttribute('aPos') as InstancedBufferAttribute).needsUpdate = true;
    (peopleGeo.getAttribute('aFrame') as InstancedBufferAttribute).needsUpdate = true;
    (peopleGeo.getAttribute('aYaw') as InstancedBufferAttribute).needsUpdate = true;
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

  // -- THE AIR (owner: flying vehicles): spinners on the plan's corridors —
  // over the avenues both ways, round the ring, two police patrols low over
  // the streets with searchlights — banking through the turns, bobbing on
  // their fans; and six that set down on the tallest roofs' pads, wait, and
  // take off again --------------------------------------------------------------
  interface Flyer {
    lane: AirLane | null; s: number; v: number; lat: number; phase: number; yaw: number; roll: number;
    x: number; y: number; z: number; police: boolean;
    pad: { x: number; y: number; z: number } | null; stage: 'in' | 'sit' | 'out'; timer: number; from: Vector3; to: Vector3;
  }
  const laneLen = plan.air.map((l) => {
    const cum = [0];
    const n = l.pts.length;
    for (let i = 0; i < (l.loop ? n : n - 1); i++) {
      const [ax, ay, az] = l.pts[i], [bx, by, bz] = l.pts[(i + 1) % n];
      cum.push(cum[i] + Math.hypot(bx - ax, by - ay, bz - az));
    }
    return cum;
  });
  const flyers: Flyer[] = [];
  const flyer = (lane: AirLane | null, police = false): Flyer => ({
    lane, s: 0, v: 0, lat: (rand() - 0.5) * 5, phase: rand() * 7, yaw: 0, roll: 0, x: 0, y: 0, z: 0, police,
    pad: null, stage: 'in', timer: 0, from: new Vector3(), to: new Vector3(),
  });
  plan.air.forEach((lane, li) => {
    const n = lane.kind === 'patrol' ? 1 : lane.kind === 'ring' ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const fl = flyer(lane, lane.kind === 'patrol');
      fl.s = (i / n) * laneLen[li][laneLen[li].length - 1];
      fl.v = lane.speed * (0.85 + rand() * 0.3);
      flyers.push(fl);
    }
  });
  const padCycle = (fl: Flyer, stage: 'in' | 'out') => {
    const pad = fl.pad!;
    const a = rand() * Math.PI * 2;
    const far = new Vector3(pad.x + Math.cos(a) * 80, pad.y + 30 + rand() * 20, pad.z + Math.sin(a) * 80);
    const down = new Vector3(pad.x, pad.y + 0.7, pad.z);
    fl.stage = stage;
    if (stage === 'in') { fl.from.copy(far); fl.to.copy(down); fl.timer = 520 + rand() * 200; }
    else { fl.from.copy(down); fl.to.copy(far); fl.timer = 420 + rand() * 120; }
    fl.phase = fl.timer;
  };
  for (const pad of plan.pads) {
    const fl = flyer(null);
    fl.pad = pad;
    padCycle(fl, rand() < 0.5 ? 'in' : 'out');
    fl.timer *= rand();
    flyers.push(fl);
  }
  const FLYERS = flyers.length;
  const airBody = new InstancedMesh(geo.box, new MeshLambertMaterial({ color: '#2a3252', emissive: '#1a2a55', emissiveIntensity: 0.6 }), FLYERS);
  const airCabin = new InstancedMesh(geo.box, new MeshLambertMaterial({ color: '#0d1626', emissive: '#7de8ff', emissiveIntensity: 0.7 }), FLYERS);
  scene.add(airBody, airCabin);
  const airLights = (() => {
    const arr = new Float32Array(FLYERS * 4 * 3), col = new Float32Array(FLYERS * 4 * 3);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(arr, 3));
    g.setAttribute('color', new BufferAttribute(col, 3));
    const pts = new Points(g, new PointsMaterial({ vertexColors: true, size: 2.2, sizeAttenuation: true, transparent: true, blending: AdditiveBlending, depthWrite: false }));
    scene.add(pts);
    return { arr, col, g };
  })();
  const NAV = [new Color('#ff3b3b'), new Color('#3dff8f'), new Color('#ffffff'), new Color('#4fa3ff').multiplyScalar(1.6)];
  const policeBeams: Group[] = [];
  for (const fl of flyers) {
    if (!fl.police) continue;
    const g = new Group();
    for (const [r, op] of [[6, 0.1], [2.4, 0.16]] as [number, number][]) {
      const geoC = new ConeGeometry(r, 40, 12, 1, true);
      geoC.translate(0, -20, 0);
      g.add(new Mesh(geoC, new MeshBasicMaterial({ color: '#dfeeff', transparent: true, opacity: op, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false })));
    }
    scene.add(g);
    policeBeams.push(g);
  }
  const airTmp = new Vector3();
  const flyAir = () => {
    let bi = 0;
    for (let i = 0; i < FLYERS; i++) {
      const fl = flyers[i];
      let hx = 0, hz = 1, ty = 0;
      if (fl.lane) {
        const lane = fl.lane, cum = laneLen[plan.air.indexOf(lane)], total = cum[cum.length - 1];
        fl.s += fl.v;
        if (fl.s >= total) fl.s -= total;
        let k = 0;
        while (k < cum.length - 2 && cum[k + 1] < fl.s) k += 1;
        const [ax, ay, az] = lane.pts[k], [bx, by, bz] = lane.pts[(k + 1) % lane.pts.length];
        const u = (fl.s - cum[k]) / Math.max(1e-6, cum[k + 1] - cum[k]);
        const dx = bx - ax, dz = bz - az, dh = Math.hypot(dx, dz) || 1;
        hx = dx / dh; hz = dz / dh;
        fl.x = ax + dx * u - hz * fl.lat; fl.y = ay + (by - ay) * u; fl.z = az + dz * u + hx * fl.lat;
        ty = Math.atan2(hx, hz);
      } else { // a pad cycle: in, sit, out
        fl.timer -= 1;
        if (fl.stage === 'sit') {
          fl.x = fl.to.x; fl.y = fl.to.y; fl.z = fl.to.z;
          if (fl.timer <= 0) padCycle(fl, 'out');
        } else {
          const u = 1 - Math.max(0, fl.timer) / fl.phase;
          const e = u * u * (3 - 2 * u);
          airTmp.lerpVectors(fl.from, fl.to, e);
          fl.x = airTmp.x; fl.y = airTmp.y + (fl.stage === 'in' ? (1 - e) * 6 : e * 6); fl.z = airTmp.z;
          hx = fl.to.x - fl.from.x; hz = fl.to.z - fl.from.z;
          const dh = Math.hypot(hx, hz) || 1; hx /= dh; hz /= dh;
          ty = Math.atan2(hx, hz);
          if (fl.timer <= 0) {
            if (fl.stage === 'in') { fl.stage = 'sit'; fl.timer = 300 + rand() * 500; fl.to.copy(fl.to); }
            else padCycle(fl, 'in');
          }
        }
      }
      const bob = Math.sin(tick * 0.05 + fl.phase) * 0.25;
      let dy = ty - fl.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      if (fl.lane || fl.stage !== 'sit') fl.yaw += dy * 0.08;
      fl.roll += (Math.max(-0.5, Math.min(0.5, -dy * 6)) - fl.roll) * 0.1;
      dummy.rotation.order = 'YXZ';
      dummy.position.set(fl.x, fl.y + bob, fl.z);
      dummy.rotation.set(0, fl.yaw, fl.roll);
      dummy.scale.set(2.2, 0.8, 4.2);
      dummy.updateMatrix();
      airBody.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(1.5, 0.6, 1.8);
      dummy.position.y += 0.6;
      dummy.updateMatrix();
      airCabin.setMatrixAt(i, dummy.matrix);
      const sx = Math.sin(fl.yaw), cz = Math.cos(fl.yaw);
      const lx = cz, lz = -sx; // the lateral
      const strobe = ((tick + Math.floor(fl.phase * 10)) % 60) < 4;
      const lights: [number, number, number, Color][] = [
        [fl.x + lx * 1.2, fl.y + bob + 0.2, fl.z + lz * 1.2, NAV[0]],
        [fl.x - lx * 1.2, fl.y + bob + 0.2, fl.z - lz * 1.2, NAV[1]],
        [fl.x, fl.y + bob + 1.1, fl.z, strobe ? NAV[2] : (fl.police && (tick >> 3) % 2 ? NAV[0] : NAV[3].clone().multiplyScalar(0.1))],
        [fl.x - sx * 2.2, fl.y + bob, fl.z - cz * 2.2, NAV[3]],
      ];
      lights.forEach(([x, y, z, c], k) => { const j = (i * 4 + k) * 3; airLights.arr[j] = x; airLights.arr[j + 1] = y; airLights.arr[j + 2] = z; c.toArray(airLights.col, j); });
      if (fl.police) {
        const g = policeBeams[bi++];
        g.position.set(fl.x, fl.y + bob - 0.4, fl.z);
        g.rotation.order = 'YXZ';
        g.rotation.set(0.45 + Math.sin(tick * 0.02 + fl.phase) * 0.3, fl.yaw + Math.sin(tick * 0.013) * 0.5, 0);
      }
    }
    dummy.rotation.set(0, 0, 0);
    dummy.rotation.order = 'XYZ';
    airBody.instanceMatrix.needsUpdate = true;
    airCabin.instanceMatrix.needsUpdate = true;
    (airLights.g.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (airLights.g.getAttribute('color') as BufferAttribute).needsUpdate = true;
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
    if (stick.x || stick.y || stick.lift) { // the phone's stick and lift buttons
      want.addScaledVector(fwd, stick.y); want.addScaledVector(side, stick.x); want.y += stick.lift; strafe += stick.x;
    }
    const driving = want.lengthSq() > 0;
    const push = Math.min(1, want.length()); // a half-pushed stick is a half-throttle
    // the throttle builds while a key is held and bleeds off when released;
    // the velocity chases the intent, and glides to rest without it
    free.throttle = driving ? Math.min(1, free.throttle + 0.02) : Math.max(0, free.throttle - 0.03);
    const boost = keys.has('shift') ? 2.4 : 1;
    const speed = 1.05 * boost * push * (0.25 + 0.75 * free.throttle * free.throttle);
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

  const stick = { x: 0, y: 0, lift: 0 };
  const audio = new CityAudio();
  const lastCam = new Vector3();
  // THE SHADOW MAP MUST EXIST (owner: the whole lit city vanished — every building, the ground, the roads): with
  // the maps enabled but not auto-updating (a moonlit look casts no shadow), the map was never rendered, so
  // every lit material sampled a shadow texture that did not exist and the GPU dropped the draw (GL_INVALID_OPERATION,
  // 'mismatch between texture format and sampler type'). One shadow render primes it; a look at zero shadow
  // intensity then samples a stale map it never shows.
  let shadowPrimed = false;
  const primeShadows = () => {
    if (!renderer.shadowMap.enabled || renderer.shadowMap.autoUpdate || shadowPrimed) return;
    renderer.shadowMap.needsUpdate = true;
    shadowPrimed = true;
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
    tendLook();
    aimMoon();
    tendLights();
    audio.update({
      y: camera.position.y, speed: camera.position.distanceTo(lastCam),
      dStadium: Math.hypot(camera.position.x - stadium.x, camera.position.y - 8, camera.position.z - stadium.z),
      dMarket: zones.reduce((m, z) => Math.min(m, Math.hypot(camera.position.x - z.x, camera.position.y, camera.position.z - z.z)), 1e9),
      fireworks: fw.launched, dFireworks: Math.hypot(camera.position.x - stadium.x, camera.position.y - 40, camera.position.z - stadium.z),
    });
    lastCam.copy(camera.position);
    primeShadows();
    composer.render();
  };

  // -- PRACTICALS (owner: brighter, but lit by practical lights): the lamps,
  // the signs, the lanterns, the stalls' canopies, the holograms and the
  // stadium's masts are the city's light sources. Every lamp lays a pool of
  // light on the ground (cheap, everywhere, at any distance); the strongest
  // sources near the eye are given to a pool of REAL point lights, faded in
  // and out as the eye moves, so the walls, the road, the cars and the
  // people near the camera take light from where the light is ----------------
  {
    const pools: { x: number; y: number; z: number; r: number; color: string; a: number }[] = [];
    // (sixteen thousand of them: a budget — wider or stronger than this and the streets sum to white, measured)
    for (const p of plan.posts) pools.push({ x: p.x, y: p.y ?? 0, z: p.z, r: p.h * (1.4 + rand() * 0.5), color: '#ffe2b8', a: 1 });
    for (let i = 0; i < plan.sprawlLamps.length; i += 3) pools.push({ x: plan.sprawlLamps[i], y: 0, z: plan.sprawlLamps[i + 2], r: 7, color: '#ffd9a0', a: 0.55 });
    for (let i = 0; i < plan.lanterns.length; i += 3) pools.push({ x: plan.lanterns[i], y: 0, z: plan.lanterns[i + 2], r: 3.2, color: '#ffb36b', a: 0.45 });
    for (const st of plan.stalls) pools.push({ x: st.x, y: 0, z: st.z, r: 4.5, color: st.color, a: 0.55 });
    for (const b of plan.billboards) { // a low lit board lays its art's colour on the pavement
      if (!b.lit || b.y > 16) continue;
      const nx = Math.sin(b.rotY), nz = Math.cos(b.rotY);
      pools.push({ x: b.x + nx * 3, y: 0, z: b.z + nz * 3, r: 4 + Math.min(6, b.w * 0.4), color: ART_COLOR[b.art], a: 0.45 });
    }
    for (const sg of plan.signs) { // the street-level signs lay their colour on the pavement (the reference's glowing streets)
      if (sg.y > 12 || !(sg.kind === 'hang' || sg.kind === 'wall' || sg.kind === 'board' || sg.kind === 'tag')) continue;
      const nx = Math.sin(sg.rotY), nz = Math.cos(sg.rotY);
      pools.push({ x: sg.x + nx * 2.4, y: 0, z: sg.z + nz * 2.4, r: 3 + Math.min(5, (sg.w + sg.h) * 0.4), color: sg.color, a: 0.5 });
    }
    const inst = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dim(additiveFog(new MeshBasicMaterial({
      map: glowTexture('#ffffff', true), transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.38,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, // a decal: never z-fights the ground it lies on
    }))), pools.length);
    dummy.rotation.set(0, 0, 0);
    pools.forEach((p, j) => {
      dummy.position.set(p.x, p.y + 0.1, p.z);
      dummy.scale.set(p.r * 2, 1, p.r * 2);
      dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
      inst.setColorAt(j, new Color(p.color).multiplyScalar(p.a));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
  }
  interface Practical { x: number; y: number; z: number; color: Color; power: number; reach: number }
  const practicals: Practical[] = [];
  {
    const LAMP = new Color('#ffe2b8');
    // (32 cd: at 55 the eighteen nearest lamps, a few units from a low eye, whited the road out — measured 230,220,246 mean)
    for (const p of plan.posts) practicals.push({ x: p.x, y: (p.y ?? 0) + p.h + 0.2, z: p.z, color: LAMP, power: 32, reach: 30 });
    for (let i = 0; i < plan.sprawlLamps.length; i += 3) practicals.push({ x: plan.sprawlLamps[i], y: plan.sprawlLamps[i + 1], z: plan.sprawlLamps[i + 2], color: new Color('#ffd9a0'), power: 24, reach: 24 });
    for (let i = 0; i < plan.lanterns.length; i += 3) practicals.push({ x: plan.lanterns[i], y: plan.lanterns[i + 1], z: plan.lanterns[i + 2], color: new Color('#ffb36b'), power: 9, reach: 14 });
    for (const sg of plan.signs) {
      if (sg.kind === 'gantry') continue;
      const nx = Math.sin(sg.rotY), nz = Math.cos(sg.rotY);
      practicals.push({ x: sg.x + nx * 1.2, y: sg.y, z: sg.z + nz * 1.2, color: new Color(sg.color), power: 6 + Math.min(80, sg.w * sg.h * 0.5), reach: 16 + Math.min(40, sg.w) });
    }
    for (const st of plan.stalls) practicals.push({ x: st.x, y: 3.4, z: st.z, color: new Color(st.color), power: 10, reach: 13 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) practicals.push({ x: sx * 4.6, y: 1.0, z: sz * 4.6, color: new Color('#ffd9a0'), power: 30, reach: 22 }); // the stallion's spots
    for (const b of plan.billboards) {
      if (!b.lit) continue;
      const nx = Math.sin(b.rotY), nz = Math.cos(b.rotY);
      practicals.push({ x: b.x + nx * 1.5, y: b.y, z: b.z + nz * 1.5, color: new Color(ART_COLOR[b.art]), power: 10 + Math.min(120, b.w * b.h * 0.6), reach: 18 + Math.min(50, b.w * 1.5) });
    }
    for (const h of plan.holos) practicals.push({ x: h.x, y: h.y, z: h.z, color: new Color('#7de8ff'), power: 80, reach: 50 });
    // the floodlights are aimed into the bowl: their light sits between mast and pitch, not on the highway beside it
    for (const m of stadium.masts) {
      practicals.push({ x: m.x + (stadium.x - m.x) * 0.45, y: m.h * 0.6, z: m.z + (stadium.z - m.z) * 0.45, color: new Color('#eef4ff'), power: 380, reach: 110 });
    }
  }
  const POOL = [0, 8, 14, 18]; // real point lights by tier
  interface Slot { light: PointLight; src: Practical | null; level: number; on: boolean }
  const slots: Slot[] = [];
  const lightPool = new Group();
  scene.add(lightPool);
  const setPool = (n: number) => {
    while (slots.length < n) {
      const light = new PointLight('#ffffff', 0, 30, 2);
      lightPool.add(light);
      slots.push({ light, src: null, level: 0, on: false });
    }
    while (slots.length > n) lightPool.remove(slots.pop()!.light);
  };
  setPool(POOL[tier]);
  const focus = new Vector3();
  const scored: { p: Practical; s: number }[] = [];
  let lightTick = 0;
  let snapLights = true; // across a cut the pool is re-lit at once, no fade
  const tendLights = () => {
    if (!slots.length) return;
    if (snapLights || lightTick++ % 12 === 0) { // the strongest sources about the eye's POSITION (never its gaze: a glance must not re-deal the lights): distance over power
      focus.set(camera.position.x, Math.min(camera.position.y, 12), camera.position.z);
      scored.length = 0;
      for (const p of practicals) {
        const dx = p.x - focus.x, dz = p.z - focus.z;
        if (Math.abs(dx) > 160 || Math.abs(dz) > 160) continue;
        scored.push({ p, s: (dx * dx + (p.y - focus.y) ** 2 + dz * dz) / p.power });
      }
      scored.sort((a, b) => a.s - b.s);
      const best = scored.slice(0, slots.length).map((e) => e.p);
      const keep = scored.slice(0, slots.length * 2).map((e) => e.p); // hysteresis: a lit source stays until it falls well down the list
      for (const sl of slots) if (sl.src && !keep.includes(sl.src)) sl.on = false;
      for (const p of best) {
        if (slots.some((sl) => sl.src === p)) continue;
        const free = slots.find((sl) => !sl.src) ?? slots.filter((sl) => !sl.on).sort((a, b) => a.level - b.level)[0];
        if (!free || (!snapLights && free.src && free.level > 0.05)) continue; // a slot still fading out waits for the next round
        free.src = p; free.on = true; free.level = 0;
        free.light.position.set(p.x, p.y, p.z);
        free.light.color.copy(p.color);
        free.light.distance = p.reach;
      }
      if (snapLights) {
        for (const sl of slots) { if (sl.on) sl.level = 1; else { sl.src = null; sl.light.intensity = 0; } }
        snapLights = false;
      }
    }
    for (const sl of slots) {
      if (!sl.src) continue;
      sl.level += ((sl.on ? 1 : 0) - sl.level) * 0.07;
      sl.light.intensity = sl.src.power * sl.level * lampLevel;
      if (!sl.on && sl.level < 0.01) { sl.src = null; sl.light.intensity = 0; }
    }
  };

  // -- TIME OF DAY (owner: a changing time-of-day system): a LOOK (city-sky.ts)
  // is applied to everything light-shaped; a change eases from the look in
  // force to the next over ~2.5 s, the dome crossfading behind it ------------
  const refreshMaterials = () => { // shadow defines: every material, arrays included
    for (const m of scene.children) {
      const mat = (m as Mesh).material as Material | Material[] | undefined;
      if (!mat) continue;
      for (const one of Array.isArray(mat) ? mat : [mat]) one.needsUpdate = true;
    }
  };
  // the sky the glass and the wet streets mirror (owner: realistic, cinematic light on the buildings): the look's dome, prefiltered
  const pmrem = new PMREMGenerator(renderer);
  let envRT: WebGLRenderTarget | null = null;
  const setEnvironment = (look: SkyLook) => {
    const eq = skyTex(look);
    const rt = pmrem.fromEquirectangular(eq);
    eq.dispose();
    envRT?.dispose(); envRT = rt;
    scene.environment = rt.texture;
  };
  let timeNow: TimeOfDay = 'night';
  let lookFrom: SkyLook = SKY.night, lookTo: SkyLook = SKY.night, lookNow: SkyLook = SKY.night, lookT = 1;
  const applyLook = (L: SkyLook) => {
    keyDir.set(L.key.dir[0], L.key.dir[1], L.key.dir[2]).normalize();
    moonLight.color.set(L.key.color); moonLight.intensity = L.key.intensity;
    hemi.color.set(L.hemi.sky); hemi.groundColor.set(L.hemi.ground); hemi.intensity = L.hemi.intensity;
    fog.color.set(L.fog.color); fogMul = L.fog.density; fog.density = TIERS[tier].fog * fogMul;
    renderer.toneMappingExposure = L.exposure;
    bloom.threshold = L.bloom;
    wallLit.value = Math.min(1, L.windows * 1.15);
    for (const m of skinMats) {
      m.emissiveIntensity = (m.userData.base as number) * L.windows;
      (m.userData.uLift as { value: number }).value = Math.max(1, (m.userData.lift as number) * L.walls);
    }
    scene.environmentIntensity = L.reflect;
    wallBleach.value = L.bleach.amount; wallBleachCol.value.set(L.bleach.color); wallGlass.value.set(L.glass);
    dark.color.set(lerpHex('#22305a', L.bleach.color, L.bleach.amount)); // the roofs go with the walls
    const gm = groundMat;
    gm.color.setScalar(L.groundLift); // the streets' own brightness
    gm.emissive.set(L.bleach.color); gm.emissiveIntensity = L.groundGlow; // and their glow, the paint brighter than the asphalt: no patch of street falls to black
    for (const m of streetMats) { m.color.setScalar(L.groundLift); m.emissive.set(L.bleach.color); m.emissiveIntensity = L.groundGlow * 0.9; }
    // shadows: a sun casts them, the moon does not (owner: no patches of shadow by night) — by the shadow's INTENSITY,
    // never by toggling the maps (that recompiles every shader and stalled the switch for a second); a shadow at
    // zero is not even rendered
    const shadows = L.shadows && TIERS[tier].shadows;
    moonLight.shadow.intensity = shadows ? 1 : 0;
    if (shadows && !renderer.shadowMap.autoUpdate) renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.autoUpdate = shadows;
    if (pitchMat) pitchMat.emissiveIntensity = 0.15 + 0.4 * L.lamps;
    lampLevel = L.lamps; starLevel = L.stars;
    for (const m of lampHeads) m.emissiveIntensity = 1.2 * L.lamps;
    for (const d of dimmables) d.m.opacity = d.base * (d.floor + (1 - d.floor) * (d.k === 'stars' ? L.stars : L.lamps));
    for (const sc of scalables) sc.m.color.setScalar(sc.floor + (1 - sc.floor) * L.lamps);
    moonMat.opacity = L.moon;
    sunMat.opacity = L.sun.opacity; sunMat.color.set(L.sun.color);
    sun.scale.set(L.sun.size, L.sun.size, 1);
    sun.position.copy(keyDir).multiplyScalar(600);
    clouds.forEach((c, i) => (c.material as SpriteMaterial).color.set(lowCloud[i] ? L.clouds.low : L.clouds.high));
    waterMat.color.set(L.water);
    horizonMat.opacity = L.horizon;
    peopleMat.color.setScalar(L.people);
    lens.setGrade(L.grade.low, L.grade.high, L.grade.contrast);
  };
  const finishDome = () => {
    const a = domeA.material as MeshBasicMaterial, b = domeB.material as MeshBasicMaterial;
    a.map?.dispose(); a.map = b.map; a.needsUpdate = true;
    b.map = null; domeB.visible = false;
  };
  const setTime = (t: TimeOfDay, instant: boolean) => {
    if (t === timeNow && lookT >= 1) return;
    timeNow = t; lookFrom = lookNow; lookTo = SKY[t]; lookT = instant ? 1 : 0;
    const b = domeB.material as MeshBasicMaterial;
    b.map?.dispose(); b.map = skyTex(lookTo); b.needsUpdate = true; b.opacity = 0; domeB.visible = true;
    setEnvironment(lookTo);
    if (instant) { finishDome(); lookNow = lookTo; applyLook(lookNow); }
  };
  const tendLook = () => {
    if (lookT >= 1) return;
    lookT = Math.min(1, lookT + 1 / 150);
    const k = ease(lookT);
    lookNow = blendLooks(lookFrom, lookTo, k);
    (domeB.material as MeshBasicMaterial).opacity = k;
    applyLook(lookNow);
    if (lookT >= 1) { finishDome(); lookNow = lookTo; }
  };
  setEnvironment(SKY.night);
  applyLook(lookNow);

  const fit = () => {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(Math.ceil(w / PIX), Math.ceil(h / PIX), false);
    composer.setSize(Math.ceil(w / PIX), Math.ceil(h / PIX));
    camera.aspect = w / h;
    camera.fov = fov24(camera.aspect); // a 24mm across the long edge
    camera.updateProjectionMatrix();
    lens.setAspect(camera.aspect);
    blur.reset(); snapLights = true;
    render();
  };

  /** Everything that moves on its own: traffic, walkers, birds, signs,
   *  screens, holograms, smoke, the wheel, the water. */
  const tickWorld = () => {
    tick += 1;
    if (calm) return;
    winTime.value = tick / 60;
    sweep();
    (starsA.material as PointsMaterial).opacity = (0.7 + Math.sin(tick * 0.05) * 0.3) * starLevel;
    (starsB.material as PointsMaterial).opacity = (0.55 + Math.cos(tick * 0.033) * 0.35) * starLevel;
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
    tendHolos();
    wheel.rotation.x += 0.004;
    waterTex.offset.y = (waterTex.offset.y + 0.0015) % 1;
    (mirror.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(tick * 0.03) * 0.06;
    craftMat.opacity = tick % 40 < 20 ? 1 : 0.15;
    driveCars();
    if (tick % 6 === 0) tendSignals();
    runTrains(); runCabs();
    walkPeople();
    fly();
    flyAir();
    playMatch();
    cruiseCraft();
    breathe();
  };
  driveCars(); runTrains(); runCabs(); walkPeople(); fly(); flyAir(); playMatch(); cruiseCraft(); breathe();
  fit();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(canvas);

  const applyTier = () => {
    const T = TIERS[tier];
    camera.far = T.far;
    camera.updateProjectionMatrix();
    fog.density = T.fog * fogMul;
    setPool(POOL[tier]);
    renderer.shadowMap.enabled = T.shadows;
    moonLight.castShadow = T.shadows;
    moonLight.shadow.intensity = T.shadows && lookNow.shadows ? 1 : 0;
    renderer.shadowMap.autoUpdate = T.shadows && lookNow.shadows;
    if (renderer.shadowMap.autoUpdate) renderer.shadowMap.needsUpdate = true;
    shadowPrimed = false; // the tier's maps are new: render them once even under a look that shows no shadow
    if (PIX !== pixOf(tier)) { PIX = pixOf(tier); fit(); }
    refreshMaterials();
  };
  // the frame clock: long frames step the tier down, short ones (for a
  // while) step it back up; the first seconds and hidden tabs don't count
  let lastFrame = performance.now();
  let frames = 0, spent = 0;
  let lastChange = performance.now() + 3000;
  const loop = () => {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = now - lastFrame;
    lastFrame = now;
    if (document.hidden) return;
    if (now > lastChange && dt < 250) {
      spent += dt; frames += 1;
      if (frames >= 90) {
        const avg = spent / frames;
        spent = 0; frames = 0;
        if (avg > 26 && tier > 0) { tier -= 1; applyTier(); lastChange = now + 4000; }
        else if (avg < 11.5 && tier < TIERS.length - 1 && now - lastChange > 12000) { tier += 1; applyTier(); lastChange = now + 2000; }
      }
    }
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
      blur.reset(); snapLights = true;
    },
    look: (dx, dy) => { free.lookX += dx; free.lookY += dy; }, // an impulse; the head carries it
    keys,
    setStick: (x, y, lift) => { if (x !== undefined) stick.x = clamp(x, -1, 1); if (y !== undefined) stick.y = clamp(y, -1, 1); if (lift !== undefined) stick.lift = clamp(lift, -1, 1); },
    warp: (x, y, z, yaw, pitch) => {
      mode = 'free';
      free.pos.set(x, y, z);
      free.yaw = yaw;
      free.pitch = pitch;
      free.vel.set(0, 0, 0); free.yawV = 0; free.pitchV = 0; free.roll = 0; free.throttle = 0;
      blur.reset(); snapLights = true;
      render();
    },
    tick: (n = 1) => { for (let i = 0; i < n; i++) { tickWorld(); render(); } },
    pose: () => {
      camera.getWorldDirection(fwd);
      return { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: free.yaw, pitch: free.pitch, mode, dir: [fwd.x, fwd.y, fwd.z] };
    },
    quality: () => ({ tier: TIERS[tier].label, far: camera.far, fog: fog.density, shadows: renderer.shadowMap.enabled && moonLight.shadow.intensity > 0, pix: PIX }),
    frame: (w = 240, h = 150) => {
      renderer.setSize(w, h, false); composer.setSize(w, h);
      camera.aspect = w / h; camera.fov = fov24(camera.aspect); camera.updateProjectionMatrix(); lens.setAspect(camera.aspect);
      render();
      const gl = renderer.getContext();
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      fit();
      const out: number[] = [];
      for (let i = 0; i < w * h; i++) out.push(Math.round(px[i * 4] * 0.3 + px[i * 4 + 1] * 0.5 + px[i * 4 + 2] * 0.2));
      return out;
    },
    setQuality: (t) => { tier = Math.max(0, Math.min(TIERS.length - 1, Math.round(t))); applyTier(); lastChange = performance.now() + 30000; render(); },
    setTime: (t, instant = false) => { setTime(t, instant); render(); },
    time: () => timeNow,
    probe: () => ({
      people: PEOPLE, cars: cars.length, flyers: FLYERS, look: lookNow.label, blend: lookT, bleach: wallBleach.value,
      knots: people.knots.filter((k) => k.members.length > 1).slice(0, 6).map((k) => [k.x, k.st.y, k.z, k.members.length]),
      air: flyers.slice(0, 6).map((fl) => [fl.x, fl.y, fl.z]),
      pads: flyers.filter((fl) => fl.pad).map((fl) => [fl.x, fl.y, fl.z, fl.stage === 'sit' ? 1 : 0]),
      kinds: CAST.map((_, k) => people.people.filter((p) => p.kind === k).length),
      lights: slots.filter((sl) => sl.src).map((sl) => [sl.light.position.x, sl.light.position.y, sl.light.position.z, Math.round(sl.light.intensity)]),
      signals: [signalHeads.length, signalHeads.filter((h) => traffic.green(h.n, h.group)).length],
      catwalkers: people.people.filter((p) => p.st?.kind === 'catwalk').length,
      boats: boats.slice(0, 3).map((b) => [canal.x0 + canal.dx * b.t - canal.dz * b.lane, canal.z0 + canal.dz * b.t + canal.dx * b.lane]),
      trains: trains.map((t) => { const u = ((t.s % railLen) + railLen) % railLen / railLen; const q = railCurve.getPointAt(u); return [q.x, q.y, q.z, t.dwell]; }),
    }),
    sheet: () => peopleMat.map!.image as HTMLCanvasElement,
  };
}
