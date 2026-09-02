/** THE LENS — the city is photographed, not rendered (owner decree: a 24mm
 *  wide-angle with real glass). Two passes on the half-res pixel buffer:
 *
 *  MotionBlurPass — camera motion blur by reprojection: every pixel's depth
 *  is unprojected to a world point, projected through LAST frame's camera,
 *  and the screen-space difference is the streak (8 taps, clamped). Nothing
 *  is streaked when the camera holds still; a warp resets the history so no
 *  ghost smears across a cut.
 *
 *  LensPass — barrel distortion (the centre magnified, the corners pinned so
 *  no black edges), lateral chromatic aberration (red and blue bend by
 *  different amounts, growing with radius), field softness toward the
 *  corners and a cos⁴-style optical vignette. */
import {
  DepthTexture, HalfFloatType, Matrix4, PerspectiveCamera, ShaderMaterial, WebGLRenderTarget, WebGLRenderer,
} from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

/** A composer target that keeps its depth — both composer buffers clone it. */
export function lensTarget(w: number, h: number): WebGLRenderTarget {
  return new WebGLRenderTarget(w, h, { type: HalfFloatType, depthTexture: new DepthTexture(w, h) });
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform mat4 invVP;
  uniform mat4 prevVP;
  uniform float strength;
  uniform float maxLen;
  varying vec2 vUv;
  void main() {
    float z = texture2D(tDepth, vUv).x;
    vec4 ndc = vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
    vec4 wp = invVP * ndc; wp /= wp.w;
    vec4 pp = prevVP * wp; pp /= pp.w;
    vec2 vel = (vUv - (pp.xy * 0.5 + 0.5)) * strength;
    float l = length(vel);
    if (l > maxLen) vel *= maxLen / l;
    vec4 col = vec4(0.0);
    for (int i = 0; i < 8; i++) {
      col += texture2D(tDiffuse, vUv + vel * (float(i) / 7.0 - 0.5));
    }
    gl_FragColor = col / 8.0;
  }
`;

export class MotionBlurPass extends Pass {
  private readonly quad: FullScreenQuad;
  private readonly mat: ShaderMaterial;
  private readonly prev = new Matrix4();
  private readonly cur = new Matrix4();
  private readonly inv = new Matrix4();
  private primed = false;

  constructor(private readonly camera: PerspectiveCamera, strength = 0.6) {
    super();
    this.mat = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null },
        invVP: { value: this.inv }, prevVP: { value: this.prev },
        strength: { value: strength }, maxLen: { value: 0.045 },
      },
      vertexShader: VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }

  /** Forget the last frame — call across a cut (mode switch, warp). */
  reset(): void { this.primed = false; }

  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    this.cur.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    if (!this.primed) { this.prev.copy(this.cur); this.primed = true; }
    this.inv.copy(this.cur).invert();
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    this.mat.uniforms.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
    this.prev.copy(this.cur);
  }

  dispose(): void { this.mat.dispose(); this.quad.dispose(); }
}

const LENS_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float aspect;
  uniform float k;
  uniform float ca;
  uniform float vig;
  uniform float soft;
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
    float s = soft * r2;
    col = col * 0.4 + 0.15 * (
      fetch(uv + vec2(s, 0.0), d, r2) + fetch(uv - vec2(s, 0.0), d, r2) +
      fetch(uv + vec2(0.0, s), d, r2) + fetch(uv - vec2(0.0, s), d, r2));
    col *= 1.0 - vig * pow(r2, 1.15);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class LensPass extends Pass {
  private readonly quad: FullScreenQuad;
  private readonly mat: ShaderMaterial;

  constructor(opts: { k?: number; ca?: number; vig?: number; soft?: number } = {}) {
    super();
    this.mat = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, aspect: { value: 1 },
        k: { value: opts.k ?? 0.11 }, ca: { value: opts.ca ?? 0.005 },
        vig: { value: opts.vig ?? 0.3 }, soft: { value: opts.soft ?? 0.0022 },
      },
      vertexShader: VERT, fragmentShader: LENS_FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }

  setAspect(aspect: number): void { this.mat.uniforms.aspect.value = aspect; }

  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose(): void { this.mat.dispose(); this.quad.dispose(); }
}

/** A 24mm across the frame's long edge (full-frame 36mm: 2·atan(18/24)),
 *  expressed as three's vertical fov for the given aspect. */
export function fov24(aspect: number): number {
  const half = Math.atan(18 / 24);
  return aspect >= 1 ? (2 * Math.atan(Math.tan(half) / aspect) * 180) / Math.PI : (2 * half * 180) / Math.PI;
}
