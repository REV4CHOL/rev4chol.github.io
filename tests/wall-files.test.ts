import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aspectRatio, parseJson, parseProjects } from '../src/lib/content';
import {
  WALL_FPS, WALL_GUTTER, WALL_MAX_H, WALL_MAX_W, WALL_SHORT_PASS_SECONDS,
  dropsEveryFifth, halfRect, packWall, passFrames, ratioOfAspect, readWalls, sharedLength, tileSize, wallManifestEntry,
  type LoopPrint, type WallFilm, type WallMap, type WallRect,
} from '../src/lib/wall-files';

// THE WALL VIDEO'S ARITHMETIC (spec 2026-11-24-work-wall-video-design, §4.2 to §4.4): one video per chapter plays
// every pane's loop as a tile. The script that builds it (scripts/make-walls.mjs), the media manifest
// (vite.config.ts) and these tests read the same pure module.

const film = (slug: string, aspect: string): WallFilm => ({ slug, ratio: ratioOfAspect(aspect), tall: ratioOfAspect(aspect) < 1 });

// FIXTURES, not the site's content: two chapters as they stood on 2026-11-24 (twelve films; five with one vertical),
// so the arithmetic is checked on real shapes whatever projects.json holds today. The site's own chapters are
// checked from the files, in tests/walls.test.ts.
const CH01 = [
  film('remnants-of-a-dream', '16:9'), film('mien-vien', '4:3'), film('far-east', '2.39:1'), film('an-hoi', '4:3'),
  film('lien-quan', '16:9'), film('soda-coast', '2.39:1'), film('electric-fish', '4:3'),
  film('soft-hours-lonely-lands', '2.39:1'), film('philia', '16:9'), film('mission-impassible', '2.39:1'),
  film('halide', '2.39:1'), film('mistchild', '2.39:1'),
];
const CH02 = [
  film('katara', '16:9'), film('the-father', '16:9'), film('forest-onsen', '16:9'), film('jaecoo-j5', '16:9'),
  film('galaxy-z-fold-8-ultra', '9:16'),
];
// each loop's frame count and frame rate, in the same order (ffprobe, 2026-11-24)
const CH01_LOOPS: Array<[number, number]> = [
  [173, 23.976], [145, 23.976], [202, 25], [291, 25], [239, 29.97], [196, 24], [103, 24], [212, 24], [447, 29.97],
  [147, 24], [190, 24], [224, 24],
];
const CH02_LOOPS: Array<[number, number]> = [[135, 24], [229, 24], [237, 24], [107, 23.976], [179, 29.97]];
// the first chapter with two more films, one of them in a fifth ratio (3:2): any count and any ratio must pack
const CH01_MORE = [...CH01, film('the-lovers', '4:3'), film('xieu-long', '3:2')];
const CH01_MORE_LOOPS: Array<[number, number]> = [...CH01_LOOPS, [200, 25], [135, 25]];

/** a tile with its gutter */
const ringed = (r: WallRect): WallRect => ({
  x: r.x - WALL_GUTTER, y: r.y - WALL_GUTTER, w: r.w + 2 * WALL_GUTTER, h: r.h + 2 * WALL_GUTTER,
});
const overlap = (a: WallRect, b: WallRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('the packing: rows of one height in a frame no larger than 1920×1080', () => {
  for (const [name, films] of [['twelve films', CH01], ['five films, one vertical', CH02], ['fourteen films, five ratios', CH01_MORE]] as const) {
    it(`${name}: every tile lies inside the frame with its gutter, and no two overlap`, () => {
      const p = packWall(films)!;
      expect(p.width).toBeLessThanOrEqual(WALL_MAX_W);
      expect(p.height).toBeLessThanOrEqual(WALL_MAX_H);
      // both sides a multiple of four: the half-size copy has even sides too
      expect(p.width % 4).toBe(0);
      expect(p.height % 4).toBe(0);
      const rects = films.map((f) => ringed(p.tiles[f.slug]));
      for (const [i, r] of rects.entries()) {
        expect(r.x, films[i].slug).toBeGreaterThanOrEqual(0);
        expect(r.y, films[i].slug).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w, films[i].slug).toBeLessThanOrEqual(p.width);
        expect(r.y + r.h, films[i].slug).toBeLessThanOrEqual(p.height);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          expect(overlap(rects[i], rects[j]), `${films[i].slug} / ${films[j].slug}`).toBe(false);
        }
      }
    });

    it(`${name}: one scale: each tile is a row high and its film's ratio wide; a tall tile is two rows and the gutters between`, () => {
      const p = packWall(films)!;
      for (const f of films) {
        const t = p.tiles[f.slug];
        expect(t.h, f.slug).toBe(f.tall ? 2 * p.rowHeight + 2 * WALL_GUTTER : p.rowHeight);
        expect(Math.abs(t.w - t.h * f.ratio), f.slug).toBeLessThanOrEqual(1);
        // every edge on an even pixel: in a 4:2:0 picture a tile's colour samples are its own
        for (const v of [t.x, t.y, t.w, t.h]) expect(v % 2, f.slug).toBe(0);
        expect(tileSize(f, p.rowHeight)).toEqual({ w: t.w, h: t.h });
      }
    });
  }

  it('the fixtures pack as worked out by hand: four rows of 262 px in 1904×1080, and two rows of 404 px in 1920×824', () => {
    const size = (films: WallFilm[]) => {
      const { width, height, rows, rowHeight } = packWall(films)!;
      return { width, height, rows, rowHeight };
    };
    expect(size(CH01)).toEqual({ width: 1904, height: 1080, rows: 4, rowHeight: 262 });
    expect(size(CH02)).toEqual({ width: 1920, height: 824, rows: 2, rowHeight: 404 });
    expect(packWall(CH02)!.tiles['galaxy-z-fold-8-ultra']).toEqual({ x: 4, y: 4, w: 460, h: 816 });
    expect(packWall(CH01)!.tiles['remnants-of-a-dream']).toMatchObject({ w: 466, h: 262 });
    // two more films fill the frame's empty corner at the same scale; a 3:2 tile is 394 px wide in a 262 px row
    expect(size(CH01_MORE)).toEqual({ width: 1904, height: 1080, rows: 4, rowHeight: 262 });
    expect(packWall(CH01_MORE)!.tiles['xieu-long']).toMatchObject({ w: 394, h: 262 });
  });

  it('any chapter packs: one film to forty, in any mix of ratios', () => {
    const ratios = ['16:9', '4:3', '2.39:1', '3:2', '1:1', '9:16', '21:9'];
    for (let n = 1; n <= 40; n++) {
      const films = Array.from({ length: n }, (_, i) => film(`f${i}`, ratios[(i * 3 + n) % ratios.length]));
      const p = packWall(films);
      expect(p, `${n} films`).not.toBeNull();
      expect(Object.keys(p!.tiles), `${n} films`).toHaveLength(n);
      expect(p!.width, `${n} films`).toBeLessThanOrEqual(WALL_MAX_W);
      expect(p!.height, `${n} films`).toBeLessThanOrEqual(WALL_MAX_H);
    }
  });

  it('no films, no packing; one film takes the tallest row that fits', () => {
    expect(packWall([])).toBeNull();
    const one = packWall([film('a', '16:9')])!;
    expect(one.rows).toBe(1);
    expect(one.tiles.a).toEqual({ x: 4, y: 4, w: 1906, h: 1072 });
    expect(packWall([film('a', '9:16')]), 'a tall tile needs two rows').toMatchObject({ rows: 2 });
  });

  it('a ratio is read as written, with no list to keep: W:H is W over H', () => {
    expect(ratioOfAspect('16:9')).toBe(16 / 9);
    expect(ratioOfAspect('4:3')).toBe(4 / 3);
    expect(ratioOfAspect('2.39:1')).toBe(2.39);
    expect(ratioOfAspect('9:16')).toBe(9 / 16);
    expect(ratioOfAspect('3:2')).toBe(1.5);
    for (const odd of ['anything else', '', '16:0', '0:9', '16/9']) expect(ratioOfAspect(odd), odd).toBe(16 / 9);
  });

  it('every film in projects.json reads the same ratio here as on the floor', () => {
    // (the script builds tiles from this reading, the floor builds panes from content.ts's: the two must not part)
    const file = fileURLToPath(new URL('../public/content/projects.json', import.meta.url));
    const projects = parseProjects(parseJson(readFileSync(file, 'utf8'), 'projects.json'));
    expect(projects.length).toBeGreaterThan(0);
    for (const p of projects) expect(ratioOfAspect(p.aspect), `${p.slug} (${p.aspect})`).toBe(aspectRatio(p.aspect));
  });

  it('the half-size copy: the same rectangle, halved', () => {
    expect(halfRect({ x: 478, y: 544, w: 466, h: 262 })).toEqual({ x: 239, y: 272, w: 233, h: 131 });
  });
});

describe('the shared length: every pane restarts together', () => {
  const passes = (loops: Array<[number, number]>) => loops.map(([n, fps]) => passFrames(n, fps));

  it('a 29.97 fps loop loses every fifth frame; slower loops keep every frame', () => {
    expect(dropsEveryFifth(29.97)).toBe(true);
    expect(dropsEveryFifth(25)).toBe(false);
    expect(passFrames(239, 29.97)).toBe(192);
    expect(passFrames(447, 29.97)).toBe(358);
    expect(passFrames(202, 25), 'a 25 fps loop runs 4% slower, frame for frame').toBe(202);
    expect(passFrames(173, 23.976)).toBe(173);
  });

  it("the fixtures' loops: 515 frames (21.46 s) and 405 (16.88 s); no pane restarts under 2 s into a pass", () => {
    const ch01 = sharedLength(passes(CH01_LOOPS));
    const ch02 = sharedLength(passes(CH02_LOOPS));
    expect(ch01).toEqual({ frames: 515, shortestLastPass: 67 });
    expect(ch02).toEqual({ frames: 405, shortestLastPass: 84 });
    // two more loops (8.00 s and 5.40 s at 25 fps) are new inputs: here the same length still serves them
    const more = sharedLength(passes(CH01_MORE_LOOPS));
    expect(more).toEqual({ frames: 515, shortestLastPass: 67 });
    for (const s of [ch01, ch02, more]) expect(s.shortestLastPass / WALL_FPS).toBeGreaterThan(WALL_SHORT_PASS_SECONDS);
  });

  it('whatever the loops, no other length up to 30 s has a longer shortest last pass', () => {
    const odd: Array<[number, number]> = [[100, 24], [333, 24], [47, 24]];
    for (const loops of [CH01_LOOPS, CH02_LOOPS, CH01_MORE_LOOPS, odd]) {
      const p = passes(loops);
      const best = sharedLength(p);
      const lastPass = (len: number) => Math.min(...p.map((n) => len % n || n));
      expect(lastPass(best.frames)).toBe(best.shortestLastPass);
      for (let len = Math.max(...p); len <= 30 * WALL_FPS; len++) {
        expect(lastPass(len), `length ${len}`).toBeLessThanOrEqual(best.shortestLastPass);
      }
    }
  });

  it('never shorter than the longest pass, never past 30 s unless one loop is; the shorter length wins a tie', () => {
    expect(sharedLength([100]), 'a pass that ends at the restart is a whole pass').toEqual({ frames: 100, shortestLastPass: 100 });
    expect(sharedLength([100, 50])).toEqual({ frames: 100, shortestLastPass: 50 });
    expect(sharedLength([300, 700]).frames).toBe(700);
    expect(sharedLength([800]), 'a loop longer than 30 s still plays whole').toEqual({ frames: 800, shortestLastPass: 800 });
    const s = sharedLength(passes(CH01_LOOPS));
    expect(s.frames).toBeGreaterThanOrEqual(Math.max(...passes(CH01_LOOPS)));
    expect(s.frames).toBeLessThanOrEqual(30 * WALL_FPS);
  });
});

describe('a wall that has gone stale: the manifest lists only the tiles that are still good', () => {
  const print = (n: number): LoopPrint => ({ file: 'preview.mp4', bytes: 1000 + n, sha256: `hash-${n}` });
  const MAP: WallMap = {
    width: 1904, height: 1080, fps: 24, frames: 515, seconds: 21.458, file: 'human.mp4', small: 'human-s.mp4',
    tiles: {
      a: { x: 4, y: 4, w: 466, h: 262, fps: 24, loop: print(1) },
      b: { x: 478, y: 4, w: 350, h: 262, fps: 25, loop: print(2) },
      c: { x: 836, y: 4, w: 626, h: 262, fps: 29.97, loop: print(3) },
    },
  };
  const disk = { a: print(1), b: print(2), c: print(3) };
  const both = { full: true, small: true };
  const slugs = ['a', 'b', 'c'];

  it('a wall built from the loops on disk lists every tile, with its rectangle and its loop frame rate', () => {
    expect(wallManifestEntry(MAP, slugs, disk, both)).toEqual({
      file: 'human.mp4', small: 'human-s.mp4', width: 1904, height: 1080, fps: 24, frames: 515,
      tiles: {
        a: { x: 4, y: 4, w: 466, h: 262, fps: 24 },
        b: { x: 478, y: 4, w: 350, h: 262, fps: 25 },
        c: { x: 836, y: 4, w: 626, h: 262, fps: 29.97 },
      },
    });
  });

  it('a changed byte length, hash or file name drops that tile, and only that tile', () => {
    const keys = (d: Record<string, LoopPrint | undefined>) => Object.keys(wallManifestEntry(MAP, slugs, d, both)!.tiles);
    expect(keys({ ...disk, b: { ...print(2), bytes: 5 } })).toEqual(['a', 'c']);
    expect(keys({ ...disk, c: { ...print(3), sha256: 'another' } })).toEqual(['a', 'b']);
    expect(keys({ ...disk, a: { ...print(1), file: 'loop.mp4' } })).toEqual(['b', 'c']);
  });

  it('a film that left the chapter loses its tile; so does a film with no loop on disk', () => {
    expect(Object.keys(wallManifestEntry(MAP, ['a', 'c'], disk, both)!.tiles)).toEqual(['a', 'c']);
    expect(Object.keys(wallManifestEntry(MAP, slugs, { a: print(1), b: undefined, c: print(3) }, both)!.tiles)).toEqual(['a', 'c']);
  });

  it('no entry without the full-size video, or with no good tile left; a missing half-size copy leaves the wall', () => {
    expect(wallManifestEntry(MAP, slugs, disk, { full: false, small: true })).toBeNull();
    expect(wallManifestEntry(MAP, [], disk, both)).toBeNull();
    expect(wallManifestEntry(MAP, slugs, {}, both)).toBeNull();
    expect(wallManifestEntry(MAP, slugs, disk, { full: true, small: false })!.small).toBeNull();
  });

  it('the manifest as the page fetches it: a well-formed entry passes, anything else is dropped', () => {
    const entry = wallManifestEntry(MAP, slugs, disk, both)!;
    expect(readWalls({ human: entry })).toEqual({ human: entry });
    expect(readWalls({ human: { ...entry, small: null } }).human.small).toBeNull();
    expect(readWalls(null)).toEqual({});
    expect(readWalls('walls')).toEqual({});
    expect(readWalls({ human: null, machine: { file: 7 }, other: { ...entry, tiles: {} } })).toEqual({});
    expect(Object.keys(readWalls({ human: { ...entry, tiles: { a: entry.tiles.a, b: { x: 'left' } } } }).human.tiles)).toEqual(['a']);
  });
});
