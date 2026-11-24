/** WALL FILES: the arithmetic of a chapter's wall video (docs/superpowers/specs/2026-11-24-work-wall-video-design.md,
 *  §4.2 to §4.4). How the tiles pack into one frame, how long the shared video runs, and which tiles of a built wall
 *  are still good. Pure, with no imports and nothing from Node or the browser, so the script
 *  (scripts/make-walls.mjs), the media manifest (vite.config.ts) and the tests read the same rules. Erasable
 *  TypeScript only: Node runs this file as it is. */

export const WALL_MAX_W = 1920;
export const WALL_MAX_H = 1080;
/** each tile is ringed by this many pixels of its own edge, so no neighbour's picture can show in a pane */
export const WALL_GUTTER = 4;
export const WALL_FPS = 24;
export const WALL_MAX_SECONDS = 30;
/** the script warns when a pane's last pass before the shared restart is shorter than this */
export const WALL_SHORT_PASS_SECONDS = 2;

export interface WallRect { x: number; y: number; w: number; h: number }
/** `tall`: a vertical film's tile stands two rows high, as its pane does on the floor */
export interface WallFilm { slug: string; ratio: number; tall: boolean }
/** `tiles` are the pictures' rectangles, gutters excluded */
export interface WallPacking { width: number; height: number; rows: number; rowHeight: number; tiles: Record<string, WallRect> }

/** A film's picture ratio from its `aspect` key, read as written: `W:H` is W over H ("16:9", "4:3", "2.39:1",
 *  "9:16", "3:2", and any ratio a later film brings). So this module holds no list of ratios to keep in step with
 *  content.ts's aspectRatio; a test checks the two agree on every film in projects.json. A key that is not of that
 *  form reads as 16:9, as there. */
export function ratioOfAspect(aspect: string): number {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect);
  const ratio = m ? Number(m[1]) / Number(m[2]) : NaN;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
}

/** Every tile lies on even pixels, so in a 4:2:0 picture its colour samples are its own. */
const even = (n: number): number => 2 * Math.round(n / 2);

/** A tile's picture size at a row height: a tall tile spans two rows and the two gutters between them. */
export function tileSize(film: WallFilm, rowHeight: number, gutter: number = WALL_GUTTER): { w: number; h: number } {
  const h = film.tall ? 2 * rowHeight + 2 * gutter : rowHeight;
  return { w: even(h * film.ratio), h };
}

/** One try: `rows` rows of `rowHeight`. Tall tiles first, each in the pair of rows with the most room; then the
 *  rest, widest first, each into the first row it fits. Null when something does not fit. */
function packAt(films: WallFilm[], rows: number, rowHeight: number, maxW: number, gutter: number): WallPacking | null {
  const cell = rowHeight + 2 * gutter;
  const used: number[] = new Array(rows).fill(0);
  const tiles: Record<string, WallRect> = {};
  for (const f of films.filter((x) => x.tall)) {
    if (rows < 2) return null;
    const { w, h } = tileSize(f, rowHeight, gutter);
    let at = 0;
    for (let r = 1; r < rows - 1; r++) if (Math.max(used[r], used[r + 1]) < Math.max(used[at], used[at + 1])) at = r;
    const x = Math.max(used[at], used[at + 1]);
    if (x + w + 2 * gutter > maxW) return null;
    tiles[f.slug] = { x: x + gutter, y: at * cell + gutter, w, h };
    used[at] = used[at + 1] = x + w + 2 * gutter;
  }
  const rest = films.filter((x) => !x.tall).map((f) => ({ f, ...tileSize(f, rowHeight, gutter) }));
  rest.sort((a, b) => b.w - a.w);
  for (const { f, w, h } of rest) {
    const r = used.findIndex((x) => x + w + 2 * gutter <= maxW);
    if (r < 0) return null;
    tiles[f.slug] = { x: used[r] + gutter, y: r * cell + gutter, w, h };
    used[r] += w + 2 * gutter;
  }
  // (both sides a multiple of four, so the half-size copy has even sides too)
  return { width: 4 * Math.ceil(Math.max(...used) / 4), height: 4 * Math.ceil((rows * cell) / 4), rows, rowHeight, tiles };
}

/** The packing with the tallest rows that fits a frame of `maxW` by `maxH`: every tile in its film's ratio, all at
 *  one scale. Fewer rows win a tie. Null for no films, or when nothing fits. */
export function packWall(
  films: WallFilm[], maxW: number = WALL_MAX_W, maxH: number = WALL_MAX_H, gutter: number = WALL_GUTTER,
): WallPacking | null {
  if (films.length === 0) return null;
  let best: WallPacking | null = null;
  for (let rows = 1; rows <= films.length + 1; rows++) {
    const top = 2 * Math.floor((Math.floor(maxH / rows) - 2 * gutter) / 2);
    for (let h = top; h >= 2 && (!best || h > best.rowHeight); h -= 2) {
      const p = packAt(films, rows, h, maxW, gutter);
      if (p) { best = p; break; }
    }
  }
  return best;
}

/** A 29.97 fps loop loses every fifth frame on its way to 24; slower loops keep every frame. */
export function dropsEveryFifth(fps: number): boolean {
  return fps > 27;
}

/** How many frames of the wall one pass of a loop takes. */
export function passFrames(frames: number, fps: number): number {
  return dropsEveryFifth(fps) ? frames - Math.floor(frames / 5) : frames;
}

/** The wall's length in frames: between the longest pass and `maxFrames`, the length whose shortest last pass is the
 *  longest (the shorter length on a tie). A pass that ends exactly at the restart counts as a whole pass. */
export function sharedLength(
  passes: number[], maxFrames: number = WALL_MAX_SECONDS * WALL_FPS,
): { frames: number; shortestLastPass: number } {
  const longest = Math.max(...passes);
  let best = { frames: longest, shortestLastPass: 0 };
  for (let len = longest; len <= Math.max(longest, maxFrames); len++) {
    const shortest = Math.min(...passes.map((p) => len % p || p));
    if (shortest > best.shortestLastPass) best = { frames: len, shortestLastPass: shortest };
  }
  return best;
}

/** A tile's rectangle in the half-size copy. */
export function halfRect(r: WallRect): WallRect {
  return { x: r.x / 2, y: r.y / 2, w: r.w / 2, h: r.h / 2 };
}

/** What a wall was built from: the loop's name, its length in bytes and its SHA-256. */
export interface LoopPrint { file: string; bytes: number; sha256: string }
export interface WallMapTile extends WallRect { fps: number; loop: LoopPrint }
/** `public/content/walls/<chapter>.json`, written by the script beside the two videos. */
export interface WallMap {
  width: number; height: number; fps: number; frames: number; seconds: number;
  file: string; small: string;
  tiles: Record<string, WallMapTile>;
}
export interface WallEntryTile extends WallRect { fps: number }
/** A chapter's wall as the media manifest lists it: only the tiles that are still good. `small` is null when the
 *  half-size copy is missing. */
export interface WallEntry {
  file: string; small: string | null;
  width: number; height: number; fps: number; frames: number;
  tiles: Record<string, WallEntryTile>;
}

/** The manifest's entry for a chapter. A tile is listed when its film is still in the chapter (`slugs`) and its
 *  loop on disk (`loops`) is the one the wall was built from. No entry without the full-size video, or with no good
 *  tile left. */
export function wallManifestEntry(
  map: WallMap, slugs: string[], loops: Record<string, LoopPrint | undefined>, has: { full: boolean; small: boolean },
): WallEntry | null {
  if (!has.full) return null;
  const tiles: Record<string, WallEntryTile> = {};
  for (const [slug, t] of Object.entries(map.tiles)) {
    const now = loops[slug];
    if (!slugs.includes(slug) || !now) continue;
    if (now.file !== t.loop.file || now.bytes !== t.loop.bytes || now.sha256 !== t.loop.sha256) continue;
    tiles[slug] = { x: t.x, y: t.y, w: t.w, h: t.h, fps: t.fps };
  }
  if (Object.keys(tiles).length === 0) return null;
  return {
    file: map.file, small: has.small ? map.small : null,
    width: map.width, height: map.height, fps: map.fps, frames: map.frames, tiles,
  };
}

/** The manifest's `walls` as fetched. Anything of the wrong shape is dropped, so a broken manifest gives no wall (and
 *  where one is due, the floor's `posters`) and never a broken pane. */
export function readWalls(raw: unknown): Record<string, WallEntry> {
  const out: Record<string, WallEntry> = {};
  if (!raw || typeof raw !== 'object') return out;
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  for (const [chapter, e] of Object.entries(raw as Record<string, Partial<WallEntry> | null>)) {
    if (!e || typeof e.file !== 'string' || !num(e.width) || !num(e.height) || !num(e.fps) || !num(e.frames)) continue;
    if (!e.tiles || typeof e.tiles !== 'object') continue;
    const tiles: Record<string, WallEntryTile> = {};
    for (const [slug, t] of Object.entries(e.tiles as Record<string, Partial<WallEntryTile> | null>)) {
      if (t && num(t.x) && num(t.y) && num(t.w) && num(t.h) && num(t.fps)) tiles[slug] = { x: t.x, y: t.y, w: t.w, h: t.h, fps: t.fps };
    }
    if (Object.keys(tiles).length === 0) continue;
    out[chapter] = {
      file: e.file, small: typeof e.small === 'string' ? e.small : null,
      width: e.width, height: e.height, fps: e.fps, frames: e.frames, tiles,
    };
  }
  return out;
}
