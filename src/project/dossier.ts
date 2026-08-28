/** FNV-1a — stable across sessions, so a slug always yields the same dossier. */
export function hashSlug(slug: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
