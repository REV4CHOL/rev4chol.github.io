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
