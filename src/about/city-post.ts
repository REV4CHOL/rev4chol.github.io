/** THE LENS — the city is photographed, not rendered (owner decree: a 24mm
 *  wide-angle with real glass). One pass on the half-res pixel buffer:
 *
 *  LensPass — barrel distortion (the centre magnified, the corners pinned so
 *  no black edges), lateral chromatic aberration (red and blue bend by
 *  different amounts, growing with radius), field softness toward the
 *  corners and a cos⁴-style optical vignette, and the time of day's grade.
 *
 *  (A motion-blur pass once streaked the frame by reprojection while the
 *  camera moved; the owner read it as a glow that followed the camera, and
 *  it is gone.) */
import {
  AddEquation, AdditiveBlending, CustomBlending, HalfFloatType, Material, NormalBlending, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, SrcAlphaFactor, Vector2,
  Vector3, WebGLRenderTarget, WebGLRenderer, ZeroFactor,
} from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

/** A composer target in half floats (the bloom's headroom). */
/** The composer's target: half-float for the bloom's range; `samples` above zero multisamples the scene pass — the
 *  desktop's anti-aliasing (a half-resolution render of thin kit and window grids sparkled under the camera's motion:
 *  the owner's "window glitch" on the PC once the phone was sharp). */
export function lensTarget(w: number, h: number, samples = 0): WebGLRenderTarget {
  return new WebGLRenderTarget(w, h, { type: HalfFloatType, samples });
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const LENS_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float aspect;
  uniform float k;
  uniform float ca;
  uniform float vig;
  uniform float soft;
  uniform vec3 gLow;
  uniform vec3 gHigh;
  uniform float gContrast;
  varying vec2 vUv;
  vec3 fetch(vec2 uv, vec2 d, float r2) {
    vec2 off = d * (ca * r2);
    return vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
  }
  void main() {
    vec2 c = vUv - 0.5;
    vec2 a = vec2(c.x * aspect, c.y);
    float r2 = dot(a, a) / (0.25 * (aspect * aspect + 1.0)); // 0 at the centre, 1 at the corners
    vec2 d = c * (1.0 + k * r2) / (1.0 + k);
    vec2 uv = 0.5 + d;
    vec3 col = fetch(uv, d, r2);
#if SOFT
    float s = soft * r2; // the field softness: four more fetches (a phone compiles without them: SOFT 0)
    col = col * 0.4 + 0.15 * (
      fetch(uv + vec2(s, 0.0), d, r2) + fetch(uv - vec2(s, 0.0), d, r2) +
      fetch(uv + vec2(0.0, s), d, r2) + fetch(uv - vec2(0.0, s), d, r2));
#endif
    col *= 1.0 - vig * pow(r2, 1.15);
    // the grade (the time of day sets it): contrast about the mids, a tint for the shadows, a tint for the highlights
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = (col - 0.4) * gContrast + 0.4;
    col += gLow * (1.0 - clamp(luma * 3.0, 0.0, 1.0)) + gHigh * clamp(luma - 0.4, 0.0, 1.0);
    col = max(col, 0.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class LensPass extends Pass {
  private readonly quad: FullScreenQuad;
  private readonly mat: ShaderMaterial;

  /** `cheap`: without the softness fetches — a phone (owner: mobile is very laggy). */
  constructor(opts: { k?: number; ca?: number; vig?: number; soft?: number; cheap?: boolean } = {}) {
    super();
    this.mat = new ShaderMaterial({
      defines: { SOFT: opts.cheap ? 0 : 1 },
      uniforms: {
        tDiffuse: { value: null }, aspect: { value: 1 },
        k: { value: opts.k ?? 0.11 }, ca: { value: opts.ca ?? 0.005 },
        vig: { value: opts.vig ?? 0.3 }, soft: { value: opts.soft ?? 0.0022 },
        gLow: { value: new Vector3(-0.012, 0, 0.024) }, gHigh: { value: new Vector3(0.02, 0.008, -0.012) }, gContrast: { value: 1.06 },
      },
      vertexShader: VERT, fragmentShader: LENS_FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }

  setAspect(aspect: number): void { this.mat.uniforms.aspect.value = aspect; }
  /** The grade: a tint for the shadows, a tint for the highlights, the contrast about the mids. */
  setGrade(low: [number, number, number], high: [number, number, number], contrast: number): void {
    (this.mat.uniforms.gLow.value as Vector3).set(low[0], low[1], low[2]);
    (this.mat.uniforms.gHigh.value as Vector3).set(high[0], high[1], high[2]);
    this.mat.uniforms.gContrast.value = contrast;
  }

  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose(): void { this.mat.dispose(); this.quad.dispose(); }
}

const HAZE_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 texel;
  uniform float radius;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D( tDiffuse, vUv );
    float amt = 1.0 - c.a; // the fog of war's amount here (the fog chunk writes it; the sky and the city inside the fence carry 1)
    if ( amt < 0.03 ) { gl_FragColor = vec4( c.rgb, 1.0 ); return; }
    vec2 r = radius * amt * texel;
    vec3 sum = c.rgb;
    float wsum = 1.0;
    for ( int i = 0; i < 12; i++ ) { // a Vogel disc of twelve taps
      float a = float( i ) * 2.39996;
      float rr = sqrt( ( float( i ) + 0.5 ) / 12.0 );
      vec4 s = texture2D( tDiffuse, vUv + vec2( cos( a ), sin( a ) ) * rr * r );
      float w = mix( 0.15, 1.0, clamp( ( 1.0 - s.a ) / amt, 0.0, 1.0 ) ); // a tap as far into the haze as this pixel counts in full; the sharp city barely
      sum += s.rgb * w;
      wsum += w;
    }
    gl_FragColor = vec4( sum / wsum, 1.0 );
  }
`;

/** THE DISTANCE BLUR (owner: "fog of war and distance blur beyond boundaries — very natural and seamless"): the fog
 *  chunk writes every opaque surface's fog-of-war amount into the frame's alpha (see-through materials leave it as the
 *  solid wrote it: keepAmount); this pass, after the scene and before
 *  the bloom, blurs each pixel over a small disc by its own amount, each tap weighted by its own amount against the
 *  centre's, so the sharp city never smears into the haze and the haze never bleeds into the city. The bloom then
 *  blooms the softened far lights softly. */
export class HazePass extends Pass {
  private readonly quad: FullScreenQuad;
  private readonly mat: ShaderMaterial;

  constructor() {
    super();
    this.mat = new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, texel: { value: new Vector2(1 / 2, 1 / 2) }, radius: { value: 6 } },
      vertexShader: VERT, fragmentShader: HAZE_FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }

  /** The disc's radius at full amount: about 0.65 % of the frame's height. */
  setSize(w: number, h: number): void {
    (this.mat.uniforms.texel.value as Vector2).set(1 / Math.max(1, w), 1 / Math.max(1, h));
    this.mat.uniforms.radius.value = Math.max(2, h * 0.0065);
  }

  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose(): void { this.mat.dispose(); this.quad.dispose(); }
}

/** THE BLUR'S AMOUNT IS THE SOLIDS' (owner, 2026-10-11: "all the streets afar have weird depth of field"): the distance
 *  blur reads the fog of war's amount from the frame's alpha, which every opaque surface writes (the fog chunk). A
 *  see-through material blended its own alpha in on top — over, or added — so a far street under its lamps' glow,
 *  its traffic's lights and its decals read alpha 1, as sharp as the city inside the fence: a dark unblurred streak
 *  through the blurred far city, on every side. A see-through material keeps the frame's alpha instead: its colour
 *  blends exactly as before, its alpha not at all, so a pixel blurs as the solid behind it does. (A custom blend is
 *  left as it is.) */
export function keepAmount(m: Material): void {
  if (!m.transparent || (m.blending !== NormalBlending && m.blending !== AdditiveBlending)) return;
  m.blendSrc = SrcAlphaFactor;
  m.blendDst = m.blending === AdditiveBlending ? OneFactor : OneMinusSrcAlphaFactor;
  m.blendEquation = AddEquation;
  m.blendSrcAlpha = ZeroFactor;
  m.blendDstAlpha = OneFactor;
  m.blendEquationAlpha = AddEquation;
  m.blending = CustomBlending;
}

/** A 24mm across the frame's long edge (full-frame 36mm: 2·atan(18/24)),
 *  expressed as three's vertical fov for the given aspect. */
export function fov24(aspect: number): number {
  const half = Math.atan(18 / 24);
  return aspect >= 1 ? (2 * Math.atan(Math.tan(half) / aspect) * 180) / Math.PI : (2 * half * 180) / Math.PI;
}
