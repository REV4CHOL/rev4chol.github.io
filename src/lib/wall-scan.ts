/** WALL SCAN: what the media manifest says about the wall videos and the hover clips (spec
 *  2026-11-24-work-wall-video-design, §4.4). NODE ONLY: the manifest plugin (vite.config.ts) and the content tests
 *  import it; nothing the browser loads may. The rules themselves are pure and live in lib/wall-files.ts. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pickLoopFiles } from './loop-files';
import { wallManifestEntry, type LoopPrint, type WallEntry, type WallMap } from './wall-files';

/** a chapter is a film's `category` */
export const CHAPTERS = ['human', 'machine'] as const;

export interface ChapterFilm { slug: string; chapter: string; film: string | null }

/** The films of projects.json (held places and gaps left out), each with its chapter and its self-hosted film file,
 *  which is never taken for the loop. */
export function chapterFilms(contentRoot: string): ChapterFilm[] {
  type Row = { slug?: unknown; blank?: unknown; gap?: unknown; category?: unknown; film?: { type?: unknown; src?: unknown } | null } | null;
  try {
    const parsed = JSON.parse(readFileSync(join(contentRoot, 'projects.json'), 'utf8')) as unknown;
    const out: ChapterFilm[] = [];
    for (const e of (Array.isArray(parsed) ? parsed : []) as Row[]) {
      if (!e || typeof e.slug !== 'string' || e.blank || e.gap) continue;
      const src = e.film?.type === 'local' && typeof e.film.src === 'string' ? e.film.src : null;
      out.push({ slug: e.slug, chapter: e.category === 'machine' ? 'machine' : 'human', film: src });
    }
    return out;
  } catch {
    return [];
  }
}

/** hashes kept by size and time of change: the dev server answers the manifest on every page load */
const hashes = new Map<string, { bytes: number; mtimeMs: number; sha256: string }>();

/** A film's loop as it is on disk now (the first file the loop rules pick): its name, its byte length and its
 *  SHA-256. Null when the folder holds no loop. */
export function loopPrintOf(contentRoot: string, slug: string, film: string | null): LoopPrint | null {
  const dir = join(contentRoot, 'projects', slug);
  try {
    const file = pickLoopFiles(readdirSync(dir), film ? [film] : [])[0];
    if (!file) return null;
    const path = join(dir, file);
    const st = statSync(path);
    const kept = hashes.get(path);
    if (kept && kept.bytes === st.size && kept.mtimeMs === st.mtimeMs) return { file, bytes: st.size, sha256: kept.sha256 };
    const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    hashes.set(path, { bytes: st.size, mtimeMs: st.mtimeMs, sha256 });
    return { file, bytes: st.size, sha256 };
  } catch {
    return null;
  }
}

/** The manifest's `walls`: for each chapter with a built wall, only the tiles whose loop on disk is still the one the
 *  wall was built from and whose film is still in the chapter. A chapter with no map, no full-size video or no good
 *  tile gets no entry. */
export function scanWalls(contentRoot: string): Record<string, WallEntry> {
  const out: Record<string, WallEntry> = {};
  const films = chapterFilms(contentRoot);
  const dir = join(contentRoot, 'walls');
  for (const chapter of CHAPTERS) {
    try {
      const map = JSON.parse(readFileSync(join(dir, `${chapter}.json`), 'utf8')) as WallMap;
      const mine = films.filter((f) => f.chapter === chapter);
      const loops: Record<string, LoopPrint | undefined> = {};
      for (const f of mine) loops[f.slug] = loopPrintOf(contentRoot, f.slug, f.film) ?? undefined;
      const entry = wallManifestEntry(map, mine.map((f) => f.slug), loops, {
        full: existsSync(join(dir, String(map.file))), small: existsSync(join(dir, String(map.small))),
      });
      if (entry) out[chapter] = entry;
    } catch { /* no map, or not a map: no wall for this chapter */ }
  }
  return out;
}

/** The manifest's `hover`: the films whose folder holds a `hover.mp4`. A pane asks for the clip only when its film is
 *  listed (works/tile.ts). */
export function scanHover(contentRoot: string): string[] {
  return chapterFilms(contentRoot)
    .map((f) => f.slug)
    .filter((slug) => existsSync(join(contentRoot, 'projects', slug, 'hover.mp4')))
    .sort();
}
