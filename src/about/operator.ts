/** Pure logic for the OPERATOR FILE (About page). No DOM — safe in node tests. */

export const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const SHEET_SLOTS = 8;

/** Portrait candidates, best format first: /content/about/portrait.<ext> */
export function portraitCandidates(): string[] {
  return PHOTO_EXTS.map((e) => `/content/about/portrait.${e}`);
}

/** Contact-sheet candidates: 8 slots × every extension (01.jpg … 08.webp). */
export function sheetCandidates(): string[][] {
  return Array.from({ length: SHEET_SLOTS }, (_, i) =>
    PHOTO_EXTS.map((e) => `/content/about/${String(i + 1).padStart(2, '0')}.${e}`),
  );
}

/** "colorist, editor, ai generalist" → ["COLORIST", "EDITOR", "AI GENERALIST"] */
export function capabilitiesFromTagline(tagline: string): string[] {
  return tagline
    .split(/,\s*/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

export interface Slice {
  y: number;
  h: number;
  dx: number;
}

/** Horizontal slice-displacement plan for one glitch frame: 3–7 slices,
 *  each 2–10% of the frame tall, shifted up to ±maxShift. */
export function slicePlan(rand: () => number, height: number, maxShift: number): Slice[] {
  const n = 3 + Math.floor(rand() * 5);
  const out: Slice[] = [];
  for (let i = 0; i < n; i++) {
    const h = Math.max(4, Math.round((0.02 + rand() * 0.08) * height));
    const y = Math.floor(rand() * Math.max(1, height - h));
    out.push({ y, h, dx: Math.round((rand() * 2 - 1) * maxShift) });
  }
  return out;
}

/** ms of quiet between ambient bursts: 4–9 s. */
export function nextBurstDelay(rand: () => number): number {
  return 4000 + Math.floor(rand() * 5000);
}

/** One burst's length in ms: 180–320. */
export function burstLength(rand: () => number): number {
  return 180 + Math.floor(rand() * 140);
}
