import type { Project } from '../lib/content';
import { aspectRatio, projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { mulberry32 } from '../lib/rng';
import { CARD_W, cardSize } from './constants';

export interface PosterResult {
  canvas: HTMLCanvasElement;
  /** true when this is the generated fallback, not the real poster — the
   *  tile keeps retrying degraded posters on wake (see ProjectTile.healMedia) */
  degraded: boolean;
}

/** Deterministic per-slug treatment. A third of the floor stays hard 1-bit
 *  duotone; the rest keeps progressively more of the original image, so the
 *  carpet has rhythm instead of one uniform texture. Featured larges always
 *  read photographic — the richest material sits at the centre. */
export function posterMix(p: Project): number {
  if (p.tileSize === 'large') return 0.72;
  let h = 0;
  for (let i = 0; i < p.slug.length; i++) h = (h * 31 + p.slug.charCodeAt(i)) >>> 0;
  return [0, 0, 0.5, 0.72][h % 4];
}

/** The dithered poster's width. 640: a 400pt card at ~1.6x, so the Bayer pattern stays a fine screen instead of
 *  upscaling into a visible mosaic. Every landscape card keeps its 640; a portrait card's poster scales with its tall
 *  card (413 for 9:16's 258), the same 1.6 poster pixels per card unit. */
export function posterWidthFor(p: Pick<Project, 'aspect'>): number {
  const ratio = aspectRatio(p.aspect);
  return ratio < 1 ? Math.round((640 * cardSize(ratio, true).cw) / CARD_W) : 640;
}

export async function loadPosterCanvas(p: Project): Promise<PosterResult> {
  const url = projectAssetUrl(p.slug, 'poster.jpg');
  try {
    const img = await loadImage(url);
    return {
      canvas: ditherImageToCanvas(img, img.naturalWidth, img.naturalHeight, posterWidthFor(p), '#060606', p.accent, posterMix(p)),
      degraded: false,
    };
  } catch {
    console.warn(`[revachol] missing media: ${url} — using generated fallback poster`);
    return { canvas: fallbackPoster(p), degraded: true };
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

function fallbackPoster(p: Project): HTMLCanvasElement {
  // a vertical film's fallback stands portrait, like its pane
  const portrait = aspectRatio(p.aspect) < 1;
  const w = portrait ? 135 : 240;
  const h = portrait ? 240 : 135;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0A0A12';
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(p.slug.length * 7919);
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 260; i++) {
    ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), 2, 2);
  }
  return c;
}
