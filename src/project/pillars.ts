/** Stills in pillars (owner 2026-09-28, GALAXY Z FOLD 8 ULTRA, the site's first film in parts: "the Stills has film1
 *  and film2, be sure to include them all, with left pillar being ad #1, and right pillar being ad #2"). A still
 *  named `<part>-<n>.<ext>` belongs to its part; a plain `<n>.<ext>` still is part 0, the one wall of a whole film. */

export interface StillPart {
  part: number;
  urls: string[];
}

const PART_NAME = /^(\d+)-\d+\.\w+$/;

function fileName(url: string): string {
  const last = url.slice(url.lastIndexOf('/') + 1).split(/[?#]/)[0];
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/** The stills grouped by part: parts in part order, each part's stills in the order given. */
export function stillParts(urls: string[]): StillPart[] {
  const byPart = new Map<number, string[]>();
  for (const url of urls) {
    const m = PART_NAME.exec(fileName(url));
    const part = m ? Number(m[1]) : 0;
    const list = byPart.get(part);
    if (list) list.push(url);
    else byPart.set(part, [url]);
  }
  return [...byPart.entries()].sort((a, b) => a[0] - b[0]).map(([part, list]) => ({ part, urls: list }));
}

/** One column count per pillar, so the pillars (equal widths) stand closest to one height. A pillar of n stills in
 *  c columns stands ceil(n / c) / c pillar widths tall (over the stills' ratio, the same for every pillar). The
 *  closest heights win; a tie goes to the fewest columns overall: the bigger stills. */
export function pillarColumns(counts: number[], minCols: number, maxCols: number): number[] {
  const lo = Math.max(1, Math.floor(minCols));
  const hi = Math.max(lo, Math.floor(maxCols));
  let best = counts.map(() => lo);
  let bestSpread = Infinity;
  let bestSum = Infinity;
  const pick: number[] = [];
  const walk = (i: number): void => {
    if (i === counts.length) {
      const heights = counts.map((n, k) => Math.ceil(n / pick[k]) / pick[k]);
      const top = Math.max(...heights);
      const spread = top > 0 ? (top - Math.min(...heights)) / top : 0;
      const sum = pick.reduce((a, b) => a + b, 0);
      if (spread < bestSpread - 1e-9 || (Math.abs(spread - bestSpread) <= 1e-9 && sum < bestSum)) {
        best = [...pick];
        bestSpread = spread;
        bestSum = sum;
      }
      return;
    }
    for (let c = lo; c <= hi; c++) {
      pick[i] = c;
      walk(i + 1);
    }
  };
  walk(0);
  return best;
}
