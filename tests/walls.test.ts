import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WallEntry, WallMap } from '../src/lib/wall-files';
import { CHAPTERS, chapterFilms, scanHover, scanWalls } from '../src/lib/wall-scan';
import { mp4Facts, mp4Size } from './mp4-facts';

// THE SHIPPED WALL VIDEOS (spec 2026-11-24-work-wall-video-design, §4.3, §4.4). `npm run walls` builds them on the
// owner's PC and they are committed: the deploy has no ffmpeg. These tests need none either. The third one is the
// guard against a wall gone stale: a loop replaced, or a film added, without a rebuild.

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const REBUILD = 'run "npm run walls" and commit public/content/walls/';
const films = chapterFilms(root);

describe('the shipped wall videos', () => {
  for (const chapter of CHAPTERS) {
    const mine = films.filter((f) => f.chapter === chapter).map((f) => f.slug);
    if (mine.length === 0) continue;
    const map = (): WallMap => JSON.parse(readFileSync(`${root}walls/${chapter}.json`, 'utf8')) as WallMap;

    it(`${chapter}: the wall, its half-size copy and its map are there`, () => {
      for (const f of [`${chapter}.mp4`, `${chapter}-s.mp4`, `${chapter}.json`]) {
        expect(existsSync(`${root}walls/${f}`), `walls/${f} is missing: ${REBUILD}`).toBe(true);
      }
    });

    it(`${chapter}: both videos play before the whole file is in, run the map's length in the map's frame, and stay light`, () => {
      const m = map();
      const full = mp4Facts(`${root}walls/${m.file}`);
      const half = mp4Facts(`${root}walls/${m.small}`);
      for (const [name, f] of [[m.file, full], [m.small, half]] as const) {
        expect(f.boxes.indexOf('moov'), `${name} faststart`).toBeGreaterThanOrEqual(0);
        expect(f.boxes.indexOf('moov'), `${name} faststart`).toBeLessThan(f.boxes.indexOf('mdat'));
        expect(f.seconds, `${name} length`).toBeCloseTo(m.seconds, 2);
      }
      expect(m.seconds).toBeCloseTo(m.frames / m.fps, 2);
      expect(m.width).toBeLessThanOrEqual(1920);
      expect(m.height).toBeLessThanOrEqual(1080);
      expect(mp4Size(`${root}walls/${m.file}`)).toEqual([m.width, m.height]);
      expect(mp4Size(`${root}walls/${m.small}`), 'one map serves both: the copy is the same frame, halved').toEqual([m.width / 2, m.height / 2]);
      expect(full.bytes, `${m.file} weight`).toBeLessThan(16 * 1024 * 1024);
      expect(half.bytes, `${m.small} weight`).toBeLessThan(6 * 1024 * 1024);
    });

    it(`${chapter}: every film has a tile built from the loop that is on disk now`, () => {
      const listed = Object.keys(scanWalls(root)[chapter]?.tiles ?? {});
      const waiting = mine.filter((slug) => !listed.includes(slug));
      expect(waiting, `a loop changed after the wall was built, or a film is new: ${REBUILD}`).toEqual([]);
    });
  }

  it('the manifest lists a hover clip for exactly the films that have one', () => {
    const have = films.map((f) => f.slug).filter((slug) => existsSync(`${root}projects/${slug}/hover.mp4`)).sort();
    expect(scanHover(root)).toEqual(have);
  });
});

describe('the page reads walls and hover clips from the manifest, and never probes for a file', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  /** lib/content.ts with a manifest of this body already loaded */
  const loaded = async (body: unknown) => {
    vi.resetModules();
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }));
    const content = await import('../src/lib/content');
    await content.loadLoopManifest();
    return content;
  };
  const entry: WallEntry = {
    file: 'human.mp4', small: 'human-s.mp4', width: 1904, height: 1080, fps: 24, frames: 515,
    tiles: { halide: { x: 4, y: 4, w: 626, h: 262, fps: 24 } },
  };

  it('a listed wall and a listed hover clip are found; nothing else is', async () => {
    const c = await loaded({ projects: {}, home: [], stills: {}, walls: { human: entry }, hover: ['katara'] });
    expect(c.wallFor('human')).toEqual(entry);
    expect(c.wallFor('machine')).toBeNull();
    expect(c.hasHoverClip('katara')).toBe(true);
    expect(c.hasHoverClip('halide')).toBe(false);
    expect(c.wallAssetUrl('human-s.mp4')).toBe('/content/walls/human-s.mp4');
  });

  it('an older manifest, a broken entry or no manifest at all: no wall, and no hover clip is asked for', async () => {
    const old = await loaded({ projects: {}, home: [], stills: {} });
    expect(old.wallFor('human')).toBeNull();
    expect(old.hasHoverClip('katara')).toBe(false);
    const broken = await loaded({ walls: { human: { file: 'human.mp4' } }, hover: 'katara' });
    expect(broken.wallFor('human')).toBeNull();
    expect(broken.hasHoverClip('katara')).toBe(false);
    vi.resetModules();
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    const none = await import('../src/lib/content');
    await none.loadLoopManifest();
    expect(none.wallFor('human')).toBeNull();
    expect(none.hasHoverClip('katara')).toBe(false);
  });
});
