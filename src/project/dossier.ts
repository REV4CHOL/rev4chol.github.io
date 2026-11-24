/** FNV-1a — stable across sessions, so a slug always yields the same dossier. */
export function hashSlug(slug: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Formats a wall frame may arrive in — GIFs animate right in the wall. */
export const STILL_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

/** Probe candidates for one numbered stills slot: stills/01.jpg … 01.gif */
export function stillSlotUrls(slug: string, slot: number): string[] {
  const n = String(slot).padStart(2, '0');
  return STILL_EXTS.map((e) => `/content/projects/${slug}/stills/${n}.${e}`);
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

/** A film's own big stills (owner, 2026-11-24, DEATHMAN: "Notice the main.jpg, they are meant to be place in big
 *  pictures for the stills"; the 2-2-1 rhythm gives 18 stills four full rows, and the film has five main pictures).
 *  `big` names the stills (their numbers in the wall, from 1) that take a full row each; the others pair up in order
 *  between them, and one left alone before a named still, or at the wall's end, takes a full row too. A film that
 *  names none keeps the 2-2-1 rhythm. */
export function wallRows(n: number, big: readonly number[] = []): ('pair' | 'full')[] {
  const named = new Set(big.filter((b) => Number.isInteger(b) && b >= 1 && b <= n));
  if (!named.size) return wallRhythm(n);
  const rows: ('pair' | 'full')[] = [];
  let i = 1;
  while (i <= n) {
    if (named.has(i) || i === n || named.has(i + 1)) {
      rows.push('full');
      i += 1;
    } else {
      rows.push('pair');
      i += 2;
    }
  }
  return rows;
}
