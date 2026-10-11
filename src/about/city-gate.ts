/** STORY'S GATE (owner, 2026-10-11: "do both" — a browser without graphics acceleration froze for a minute and a half
 *  on the live city). Such a browser draws the city on its CPU: 4.5 million triangles a frame even at the low tier,
 *  fifteen seconds a frame, and the page answers nothing in between — the governor's render scale cannot help a frame
 *  that is triangles, not pixels. It gets the city's still instead, and can load the live city anyway. A browser with
 *  no WebGL at all gets the still and nothing to load. Pure but for probeGpu(). */
import { SOFTWARE_GPU } from '../lib/quality';

export type Gate = 'live' | 'still' | 'no-3d';

/** What a browser draws with: whether it has WebGL, the renderer's name when it tells (WEBGL_debug_renderer_info), and
 *  whether it refused a context that must not carry a major performance caveat (its own word for a software renderer). */
export interface GpuProbe { webgl: boolean; renderer?: string; caveat: boolean }

export function cityGate(p: GpuProbe): Gate {
  if (!p.webgl) return 'no-3d';
  if (p.caveat || (p.renderer !== undefined && SOFTWARE_GPU.test(p.renderer))) return 'still';
  return 'live';
}

/** Throwaway contexts, released at once: the renderer's name, then a strict context the browser refuses on software. */
export function probeGpu(): GpuProbe {
  try {
    const gl = (document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return { webgl: false, caveat: false };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : undefined;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const strictOpts = { failIfMajorPerformanceCaveat: true };
    const strict = (document.createElement('canvas').getContext('webgl2', strictOpts) ?? document.createElement('canvas').getContext('webgl', strictOpts)) as WebGLRenderingContext | null;
    strict?.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl: true, renderer, caveat: !strict };
  } catch {
    return { webgl: false, caveat: false };
  }
}

/** The still: one frame of the live city, its opening drift at night, at the desktop's opening tier (1920 × 1080). */
export const STILL_SRC = '/content/story/still.jpg';
/** The lines, in plain words (owner 2026-09-28: a sentence a stranger can follow), in the hint's seat. */
export const STILL_LINE = 'THIS BROWSER HAS NO GRAPHICS ACCELERATION, SO THE LIVE CITY WOULD FREEZE IT ▪ HERE IS A STILL OF THE CITY';
export const NO_3D_LINE = 'THIS BROWSER CANNOT DRAW 3D ▪ HERE IS A STILL OF THE CITY';
export const LIVE_ANYWAY = 'LOAD THE LIVE CITY ANYWAY';
export const LOADING_LINE = 'LOADING THE LIVE CITY ▪ ON THIS BROWSER IT WILL BE VERY SLOW';
