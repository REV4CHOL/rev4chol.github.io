import { mulberry32 } from '../lib/rng';

/** FNV-1a — stable across sessions, so a slug always yields the same dossier. */
export function hashSlug(slug: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface SpecimenCodes {
  /** intake code, e.g. "DME·4A C209/005.S" */
  code: string;
  /** signature line, e.g. "QR EXC FF✚ 24E1·2445556" */
  sig: string;
  /** barcode stripe widths, all 1–4 units */
  bars: number[];
}

const HEXG = '0123456789ABCDEF';

/** The machine's paperwork for one film. Deterministic: same slug, same codes. */
export function specimenCodes(slug: string): SpecimenCodes {
  const rand = mulberry32(hashSlug(slug));
  const hex = (n: number) =>
    Array.from({ length: n }, () => HEXG[Math.floor(rand() * HEXG.length)]).join('');
  const code = `DME·${hex(2)} ${hex(4)}/${String(Math.floor(rand() * 900) + 100)}.S`;
  const sig = `QR EXC FF✚ ${hex(4)}·${String(Math.floor(rand() * 9000000) + 1000000)}`;
  const bars = Array.from({ length: 28 }, () => 1 + Math.floor(rand() * 4));
  return { code, sig, bars };
}

/**
 * Footage-wall row plan: pair, pair, full-bleed, repeat — a 2-2-1 breathing
 * rhythm. A single leftover still is always promoted to a full-bleed row.
 */
export function wallRhythm(n: number): ('pair' | 'full')[] {
  const rows: ('pair' | 'full')[] = [];
  let left = n;
  let i = 0;
  while (left > 0) {
    if (i % 3 === 2 || left === 1) {
      rows.push('full');
      left -= 1;
    } else {
      rows.push('pair');
      left -= 2;
    }
    i++;
  }
  return rows;
}

/** Inline SVG barcode from stripe widths; scales via viewBox, colored by CSS. */
export function barcodeSvg(bars: number[], height = 22): string {
  const gap = 1;
  let x = 0;
  const rects = bars
    .map((w) => {
      const r = `<rect x="${x}" y="0" width="${w}" height="${height}"/>`;
      x += w + gap;
      return r;
    })
    .join('');
  return `<svg class="p-bars" viewBox="0 0 ${x - gap} ${height}" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`;
}
