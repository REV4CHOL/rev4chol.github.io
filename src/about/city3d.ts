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
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, DataTexture,
  CylinderGeometry, DirectionalLight, DoubleSide, FogExp2, Group, HemisphereLight, InstancedBufferAttribute,
  InstancedBufferGeometry, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, LineBasicMaterial, LineSegments, Material, Matrix4, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, NearestFilter, NeutralToneMapping, Object3D, PCFShadowMap, PerspectiveCamera, PlaneGeometry, PointLight, Points,
  PointsMaterial, RepeatWrapping, RGBAFormat, RingGeometry, Scene, ShaderChunk, SphereGeometry, Sprite, SpriteMaterial,
  SRGBColorSpace, TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { isMobile, reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import {
  AirLane, AutoFlight, bandPoint, bandPositions, BOUND, CAM_R, CANAL, EXT, FacadeStyle, G, HALF, HIGHWAY, OUTER, planCity,
  Poi, RAMP_W, rampY, REACH, ROAD, Sign, signColor, Solid, starPositions, streetAt, STREET, Street, tourRoute,
} from './city-plan';
import { fov24, LensPass, lensTarget, MotionBlurPass } from './city-post';
import { CityAudio } from './city-audio';
import { CAST, People, Zone } from './city-people';
import { blendLooks, ease, Look as SkyLook, LOOKS as SKY, paintSky, TimeOfDay } from './city-sky';
import { Traffic, DECK_KERB } from './city-traffic';

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
  // the near-ground haze thickens with the fog's density (the hazy morning's is thick)
  float haze = 0.42 * clamp( fogDensity / 0.0026, 0.6, 2.4 ) * exp( - max( vFogWorld.y, 0.0 ) * 0.03 ) * ( 1.0 - exp( - vFogDepth * 0.011 ) );
  fogFactor = min( 0.985, 1.0 - ( 1.0 - fogFactor ) * ( 1.0 - min( haze, 0.95 ) ) );
  float edge = max( abs( vFogWorld.x ), abs( vFogWorld.z ) );
  fogFactor = max( fogFactor, smoothstep( 272.0, 440.0, edge ) * 0.93 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;

/** QUALITY (owner: a render distance that adapts): four tiers of far plane,
 *  fog density, shadows and pixel size. The opening tier reads the
 *  connection (the Network Information API, where the browser offers it)
 *  and the device; from then on the measured frame time steps the tier
 *  down when frames run long and back up when they run short. */
interface Tier { label: string; far: number; fog: number; shadows: boolean; pix: number }
const TIERS: Tier[] = [
  { label: 'low', far: 900, fog: 0.0036, shadows: false, pix: 3 },
  { label: 'mid', far: 1000, fog: 0.0026, shadows: false, pix: 2 },
  { label: 'high', far: 1200, fog: 0.0019, shadows: true, pix: 2 },
  { label: 'ultra', far: 1400, fog: 0.0014, shadows: true, pix: 2 },
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

/** The window grid of a style's texture — pitch and offset per axis — so a
 *  shader can find which window a texel belongs to. */
function windowCells(s: FacadeStyle): [number, number, number, number] {
  switch (s.win) {
    case 'grid': return [5, 1, 5, 2];
    case 'tiny': return [4, 1, 4, 2];
    case 'wide': return [8, 1, 6, 3];
    case 'ribbon': return [4, 2, 5, 3];
    case 'strip': return [6, 2, 8, 0];
    default: return [8, 0, 5, 2]; // curtain: bands
  }
}

/** LIVING WINDOWS (owner: the lights must feel alive, slowly): the facade's
 *  lit texels are found by their brightness against the wall; some of the
 *  windows (never all) go dark for a stretch and come back, over seconds,
 *  each on its own long period, each building's phases its own. Injected
 *  into the material's map and emissive reads. */
const winTime = { value: 0 };
function livingFacade(mat: MeshLambertMaterial, cells: [number, number, number, number], wall: string, lift: number): MeshLambertMaterial {
  const uLift = { value: lift };
  mat.userData.uLift = uLift; // live: the time of day scales it (a sun needs far less lift than the lamps)
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = winTime;
    shader.uniforms.uLift = uLift;
    shader.uniforms.uPitch = { value: new Vector2(cells[0], cells[2]) };
    shader.uniforms.uOff = { value: new Vector2(cells[1], cells[3]) };
    shader.uniforms.uWall = { value: new Color(wall) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vInst;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vInst = fract( dot( instanceMatrix[3].xz, vec2( 0.0371, 0.0913 ) ) + instanceMatrix[3].y * 0.011 );
        #else
          vInst = 0.0;
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform vec2 uPitch; uniform vec2 uOff; uniform vec3 uWall; uniform float uLift; varying float vInst;
        float wHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float windowOff( vec2 uv ) {
          vec2 cell = floor( ( uv * vec2( 64.0, 256.0 ) - uOff ) / uPitch );
          float h = wHash( cell + vInst * 37.0 );
          if ( h < 0.55 ) return 0.0;
          float period = 50.0 + 90.0 * wHash( cell * 1.7 + vInst * 11.0 );
          float w = fract( uTime / period + h * 7.0 );
          return smoothstep( 0.0, 0.035, w ) * smoothstep( 0.3, 0.26, w );
        }`)
      .replace('#include <map_fragment>', `
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        float wlum = dot( sampledDiffuseColor.rgb, vec3( 0.3, 0.5, 0.2 ) );
        float wmask = smoothstep( 0.12, 0.3, wlum );
        float woff = windowOff( vMapUv );
        sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, uWall, wmask * woff );
        // the WALL takes light (owner: lit by practicals): its albedo lifted; a lit window is a SOURCE,
        // not a reflector — its albedo is cut so a lamp beside it cannot burn it white over its own glow
        sampledDiffuseColor.rgb *= mix( uLift, 0.3, wmask * ( 1.0 - woff ) );
        diffuseColor *= sampledDiffuseColor;`)
      .replace('#include <emissivemap_fragment>', `
        vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
        float elum = dot( emissiveColor.rgb, vec3( 0.3, 0.5, 0.2 ) );
        emissiveColor.rgb = mix( emissiveColor.rgb, uWall, smoothstep( 0.12, 0.3, elum ) * windowOff( vEmissiveMapUv ) );
        totalEmissiveRadiance *= emissiveColor.rgb;`);
  };
  mat.customProgramCacheKey = () => 'living';
  return mat;
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
function cloudTexture(rand: () => number, low: boolean): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 40;
  const x = c.getContext('2d')!;
  const body = low ? '#8a8a8a' : '#9a9a9a'; // greyscale: the look tints them (city-sky.ts)
  const top = '#ffffff';
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

/** One block of ground, the street centred: asphalt with double centre
 *  line, lane dashes and crosswalks at the intersection, kerbed pavements,
 *  the dark lot in the corners. Tiled every G units with lot centres on
 *  the tile corners. 4 px per unit. */
function groundTexture(rand: () => number): CanvasTexture {
  const S = 4, T = G * S;
  const c = document.createElement('canvas');
  c.width = c.height = T;
  const x = c.getContext('2d')!;
  x.fillStyle = '#171a2c'; x.fillRect(0, 0, T, T);
  const mid = T / 2, half = (STREET / 2) * S, road = (ROAD / 2) * S;
  x.fillStyle = '#20233a';
  x.fillRect(mid - half, 0, half * 2, T); x.fillRect(0, mid - half, T, half * 2);
  x.fillStyle = '#2b2f4a';
  for (let i = 0; i < T; i += 4) { // paving dots on the kerbs
    for (const k of [mid - half + 2, mid + half - 4]) { x.fillRect(i + (k % 8 ? 0 : 2), k, 1, 1); x.fillRect(k, i + (k % 8 ? 0 : 2), 1, 1); }
  }
  x.fillStyle = '#101326';
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
  /** The quality tier in force (far plane, fog, shadows, pixel size) — and a way to force one. */
  quality(): { tier: string; far: number; fog: number; shadows: boolean; pix: number };
  setQuality(t: number): void;
  /** Verification: what lives where — knots of talk, flyers, counts. */
  /** The time of day (city-sky.ts): eased over a couple of seconds, or at once. */
  setTime(t: TimeOfDay, instant?: boolean): void;
  time(): TimeOfDay;
  probe(): { people: number; cars: number; flyers: number; knots: number[][]; air: number[][]; pads: number[][]; kinds: number[]; lights: number[][]; look: string; blend: number };
  /** The cast's sprite sheet, for inspection. */
  sheet(): HTMLCanvasElement;
}

export function mountCity3D(canvas: HTMLCanvasElement, seed: number): CityRide {
  const plan = planCity(seed);
  const rand = mulberry32(seed ^ 0x9e3779b9); // the renderer's own stream; the plan owns the seed
  const calm = reducedMotion();
  const scene = new Scene();
  // what a LOOK (city-sky.ts) dims or scales: the lamps' glow, the neon, the stars, the point lights
  const dimmables: { m: { opacity: number }; base: number; floor: number; k: 'lamps' | 'stars' }[] = [];
  const scalables: { m: MeshBasicMaterial; floor: number }[] = [];
  const dim = <T extends { opacity: number }>(m: T, k: 'lamps' | 'stars' = 'lamps', floor = 0): T => { dimmables.push({ m, base: m.opacity, floor, k }); return m; };
  let lampLevel = 1;
  let starLevel = 1;
  let fogMul = 1;
  let tier = startTier();
  let PIX = TIERS[tier].pix;
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
    const r = 480 + rand() * 300;
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
  const ground = new Mesh(new PlaneGeometry(GROUND, GROUND), new MeshLambertMaterial({
    map: groundTex, emissive: '#ffffff', emissiveMap: groundTex, emissiveIntensity: 0.12, // the streets are LIT, not self-lit
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const water = new Mesh(new PlaneGeometry(CANAL.w, 2 * REACH), new MeshBasicMaterial({ color: '#040812' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.06;
  scene.add(water);
  const waterMat = water.material as MeshBasicMaterial;
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
      // PARAPETS (owner: no vehicle through the outer barrier): a wall along
      // each edge from the kerb (DECK_KERB, which the lanes respect) out to
      // the deck's edge, broken only where a ramp mounts the deck; the amber
      // lights ride the parapet tops
      const yawH = Math.atan2(-st.dz, st.dx);
      const rail = (st.width / 2 - DECK_KERB);
      for (const side of [-1, 1] as const) {
        const gaps: [number, number][] = [];
        for (const r of plan.streets) {
          if (r.kind !== 'ramp') continue;
          const hi = r.y > (r.y1 ?? r.y) ? 0 : r.len; // the high end: where it meets the deck
          const hx = r.x0 + r.dx * hi, hz = r.z0 + r.dz * hi;
          const lat = (hx - st.x0) * -st.dz + (hz - st.z0) * st.dx;
          if (Math.sign(lat) !== side) continue;
          const t = (hx - st.x0) * st.dx + (hz - st.z0) * st.dz;
          gaps.push([t - 15, t + 15]);
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
  const facadeTex = plan.styles.map((s) => facadeTexture(rand, s));
  const cylTex = facadeTex.map((t) => {
    const c = t.clone();
    c.wrapS = RepeatWrapping;
    c.repeat.set(3, 1);
    c.needsUpdate = true;
    return c;
  });
  const dark = new MeshLambertMaterial({ color: '#141830' });
  // the moon lights the near faces and the roofs, the far faces sleep in the
  // hemisphere's blue, the shadows take the rest; the windows are emissive
  // (they are their own light) and LIVE — see livingFacade
  const livingMats: { mat: MeshLambertMaterial; base: number; lift: number }[] = []; // the windows' glow and the walls' lift, for the look to scale
  const facade = (map: CanvasTexture, style: FacadeStyle, far: boolean): MeshLambertMaterial => {
    const base = far ? 0.8 : 0.75, lift = far ? 2.0 : 2.6;
    const mat = livingFacade(new MeshLambertMaterial({
      map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: base, color: far ? '#9aa0c8' : '#ffffff',
    }), windowCells(style), style.tint, lift);
    livingMats.push({ mat, base, lift });
    return mat;
  };
  const facadeMats = (map: CanvasTexture, style: FacadeStyle, far: boolean): Material[] => {
    const lit = facade(map, style, far);
    return [lit, lit, dark, dark, lit, lit];
  };
  const matFor = (kind: Solid['kind'], key: string, far: boolean): Material | Material[] => {
    switch (kind) {
      case 'facade': return facadeMats(facadeTex[Number(key)], plan.styles[Number(key)], far);
      case 'cyl': return key === 'dark' ? [dark, dark, dark] : [facade(cylTex[Number(key)], plan.styles[Number(key)], far), dark, dark];
      case 'pyr': return new MeshLambertMaterial({ color: '#0b0b18' });
      case 'spire': return new MeshLambertMaterial({ color: '#5f6a92' });
      case 'dome': return new MeshLambertMaterial({ color: '#0d0e20' });
      case 'tree': return new MeshLambertMaterial({ color: '#0b2418' });
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
    inst.castShadow = !b.far && b.kind !== 'tree'; // the sprawl is fog's; the trees would only speckle
    inst.receiveShadow = !b.far;
    scene.add(inst);
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
    } else if (--fw.next <= 0) {
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
    const pts = new Points(g, dim(new PointsMaterial({
      map: glowTexture(color), color, size, sizeAttenuation: true, transparent: true, opacity,
      blending: AdditiveBlending, depthWrite: false,
    })));
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
  // and the headlights' throw: a cone of light on the road ahead (owner: lit by practicals)
  const throws = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dim(new MeshBasicMaterial({
    map: headlightTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.16, color: '#fff0cc',
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, // a decal: never z-fights the road it lies on
  })), total);
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
      const weave = c.kind === 'moto' ? Math.sin(traffic.tick * 0.05 + c.phase) * 0.7 : 0; // the weave, inside the lane
      placeVehicle(i, c.x, c.y + c.h / 2 + 0.05, c.z, c.yaw, c.pitch, c.w, c.h, c.len, weave, c.brake || c.v < 0.01, 0.4 + 0.6 * Math.min(1, c.v / (c.vmax * 0.6)));
    }
    boats.forEach((b, k) => {
      b.t += b.v;
      if (b.t > canal.len) b.t -= canal.len;
      if (b.t < 0) b.t += canal.len;
      const x = canal.x0 + canal.dx * b.t - canal.dz * b.lane, z = canal.z0 + canal.dz * b.t + canal.dx * b.lane;
      const yaw = b.v > 0 ? Math.atan2(canal.dx, canal.dz) : Math.atan2(-canal.dx, -canal.dz);
      placeVehicle(cars.length + k, x, canal.y + 0.35, z, yaw, 0, 2, 0.6, 6, 0, false, 0.5);
    });
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
  const crossOK = (x: number, z: number, axis: 'x' | 'z'): boolean => {
    const n = nodeAt.get(`${Math.round(x)}:${Math.round(z)}`);
    if (!n || !n.signal) return false;
    const st = n.streets.find((q) => (axis === 'x') === (q.dx !== 0));
    return st ? !traffic.green(n, Math.max(0, n.streets.indexOf(st))) : false;
  };
  const crossNodes: number[] = [];
  for (let i = -HALF - OUTER - 1; i <= HALF + OUTER; i++) crossNodes.push(streetAt(i));
  const people = new People(plan.streets, zones, plan.stalls, mulberry32(seed ^ 0x7e0b1e), calm ? 1100 : 2200, crossOK, crossNodes);
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
        vec3 transformed = aPos + bbRight * position.x * 0.9 * aScale + vec3( 0.0, ( position.y + 0.5 ) * 1.8 * aScale, 0.0 );`);
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

  const audio = new CityAudio();
  const lastCam = new Vector3();
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
    for (const p of plan.posts) pools.push({ x: p.x, y: p.y ?? 0, z: p.z, r: p.h * (1.3 + rand() * 0.5), color: '#ffe2b8', a: 1 });
    for (let i = 0; i < plan.sprawlLamps.length; i += 3) pools.push({ x: plan.sprawlLamps[i], y: 0, z: plan.sprawlLamps[i + 2], r: 7, color: '#ffd9a0', a: 0.8 });
    for (let i = 0; i < plan.lanterns.length; i += 3) pools.push({ x: plan.lanterns[i], y: 0, z: plan.lanterns[i + 2], r: 3.2, color: '#ffb36b', a: 0.5 });
    for (const st of plan.stalls) pools.push({ x: st.x, y: 0, z: st.z, r: 4.5, color: st.color, a: 0.55 });
    const inst = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dim(new MeshBasicMaterial({
      map: glowTexture('#ffffff', true), transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.26,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, // a decal: never z-fights the ground it lies on
    })), pools.length);
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
    for (const p of plan.posts) practicals.push({ x: p.x, y: (p.y ?? 0) + p.h + 0.2, z: p.z, color: LAMP, power: 45, reach: 32 });
    for (let i = 0; i < plan.sprawlLamps.length; i += 3) practicals.push({ x: plan.sprawlLamps[i], y: plan.sprawlLamps[i + 1], z: plan.sprawlLamps[i + 2], color: new Color('#ffd9a0'), power: 24, reach: 24 });
    for (let i = 0; i < plan.lanterns.length; i += 3) practicals.push({ x: plan.lanterns[i], y: plan.lanterns[i + 1], z: plan.lanterns[i + 2], color: new Color('#ffb36b'), power: 9, reach: 14 });
    for (const sg of plan.signs) {
      if (sg.kind === 'gantry') continue;
      const nx = Math.sin(sg.rotY), nz = Math.cos(sg.rotY);
      practicals.push({ x: sg.x + nx * 1.2, y: sg.y, z: sg.z + nz * 1.2, color: new Color(sg.color), power: 6 + Math.min(80, sg.w * sg.h * 0.5), reach: 16 + Math.min(40, sg.w) });
    }
    for (const st of plan.stalls) practicals.push({ x: st.x, y: 3.4, z: st.z, color: new Color(st.color), power: 10, reach: 13 });
    for (const h of plan.holos) practicals.push({ x: h.x, y: h.y, z: h.z, color: new Color('#7de8ff'), power: 80, reach: 50 });
    // the floodlights are aimed into the bowl: their light sits between mast and pitch, not on the highway beside it
    for (const m of stadium.masts) {
      practicals.push({ x: m.x + (stadium.x - m.x) * 0.45, y: m.h * 0.6, z: m.z + (stadium.z - m.z) * 0.45, color: new Color('#eef4ff'), power: 380, reach: 110 });
    }
  }
  const POOL = [0, 6, 12, 16]; // real point lights by tier
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
  let timeNow: TimeOfDay = 'night';
  let lookFrom: SkyLook = SKY.night, lookTo: SkyLook = SKY.night, lookNow: SkyLook = SKY.night, lookT = 1;
  const applyLook = (L: SkyLook) => {
    keyDir.set(L.key.dir[0], L.key.dir[1], L.key.dir[2]).normalize();
    moonLight.color.set(L.key.color); moonLight.intensity = L.key.intensity;
    hemi.color.set(L.hemi.sky); hemi.groundColor.set(L.hemi.ground); hemi.intensity = L.hemi.intensity;
    fog.color.set(L.fog.color); fogMul = L.fog.density; fog.density = TIERS[tier].fog * fogMul;
    renderer.toneMappingExposure = L.exposure;
    bloom.threshold = L.bloom;
    for (const w of livingMats) {
      w.mat.emissiveIntensity = w.base * L.windows;
      (w.mat.userData.uLift as { value: number }).value = Math.max(1, w.lift * L.walls);
    }
    if (pitchMat) pitchMat.emissiveIntensity = 0.15 + 0.4 * L.lamps;
    lampLevel = L.lamps; starLevel = L.stars;
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
    if (tick % 4 === 0) for (const h of holos) { paintHolo(h.ctx, rand, 72 - ((tick >> 2) % 72)); h.tex.needsUpdate = true; }
    for (const h of holos) h.mesh.rotation.y += 0.0025;
    wheel.rotation.x += 0.004;
    waterTex.offset.y = (waterTex.offset.y + 0.0015) % 1;
    (mirror.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(tick * 0.03) * 0.06;
    craftMat.opacity = tick % 40 < 20 ? 1 : 0.15;
    driveCars();
    walkPeople();
    fly();
    flyAir();
    playMatch();
    cruiseCraft();
    breathe();
  };
  driveCars(); walkPeople(); fly(); flyAir(); playMatch(); cruiseCraft(); breathe();
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
    if (PIX !== T.pix) { PIX = T.pix; fit(); }
    for (const m of scene.children) { // shadow defines: every material, arrays included
      const mat = (m as Mesh).material as Material | Material[] | undefined;
      if (!mat) continue;
      for (const one of Array.isArray(mat) ? mat : [mat]) one.needsUpdate = true;
    }
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
    quality: () => ({ tier: TIERS[tier].label, far: camera.far, fog: fog.density, shadows: renderer.shadowMap.enabled, pix: PIX }),
    setQuality: (t) => { tier = Math.max(0, Math.min(TIERS.length - 1, Math.round(t))); applyTier(); lastChange = performance.now() + 30000; render(); },
    setTime: (t, instant = false) => { setTime(t, instant); render(); },
    time: () => timeNow,
    probe: () => ({
      people: PEOPLE, cars: cars.length, flyers: FLYERS, look: lookNow.label, blend: lookT,
      knots: people.knots.filter((k) => k.members.length > 1).slice(0, 6).map((k) => [k.x, k.st.y, k.z, k.members.length]),
      air: flyers.slice(0, 6).map((fl) => [fl.x, fl.y, fl.z]),
      pads: flyers.filter((fl) => fl.pad).map((fl) => [fl.x, fl.y, fl.z, fl.stage === 'sit' ? 1 : 0]),
      kinds: CAST.map((_, k) => people.people.filter((p) => p.kind === k).length),
      lights: slots.filter((sl) => sl.src).map((sl) => [sl.light.position.x, sl.light.position.y, sl.light.position.z, Math.round(sl.light.intensity)]),
    }),
    sheet: () => peopleMat.map!.image as HTMLCanvasElement,
  };
}
