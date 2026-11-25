import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aspectRatio, parseJson, parseProjects } from '../src/lib/content';
import { pickLoopFiles } from '../src/lib/loop-files';
import { mp4Size } from './mp4-facts';

// A master can come with black bars of its own, above and below its picture or at its sides. A pane, a wall video, a
// strip and a film page's hero all show the file as it is, so the bars stand in the pane on every screen. The owner,
// 2026-11-25: "the loop pane for PHILIA is having black bars up and down in the work section, which appear on all
// platforms (phone include). Consider scale it up a bit". Its master is 1280 x 720 with the film's 1.9:1 picture
// between two bars 22 px high; the loop and the poster were cut from it bars and all. (DEATHMAN's master came the same
// way, its 4:3 picture between two bars at the sides, and was cropped when it joined.)
// This test reads every film's loop from end to end and says where its picture stops, so the next one is caught here.
// (It needs ffmpeg on the path; without it the tests are skipped.)

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const films = () => parseProjects(parseJson(readFileSync(`${root}projects.json`, 'utf8'), 'projects.json'));
const loopOf = (slug: string) => pickLoopFiles(readdirSync(`${root}projects/${slug}`))[0];

/** A pixel darker than this is a bar's (video black is 16). */
const BAR = 24;
/** A picture may stop this far short of an edge, px: a soft edge row is not a bar (PHILIA's bars were 16 px). */
const SOFT = 2;

/** The part of the frame that is ever brighter than a bar over the whole loop: [width, height, x, y]. */
function pictureArea(file: string): number[] {
  const out = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-vf', `cropdetect=limit=${BAR}:round=2:reset=0,metadata=mode=print:file=-`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).stdout;
  return ['w', 'h', 'x', 'y'].map((k) => Number([...out.matchAll(new RegExp(`lavfi\\.cropdetect\\.${k}=(\\d+)`, 'g'))].at(-1)?.[1]));
}

/** A strip of a picture file as grey bytes (grey first: a crop of 4:2:0 colour is rounded to even numbers). */
function grey(file: string, crop: string): Buffer {
  return spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `format=gray,crop=${crop}`, '-f', 'rawvideo', '-'], { maxBuffer: 64 * 1024 * 1024 }).stdout;
}

describe('no pane shows bars that came with the file', () => {
  it.skipIf(!ffmpeg)("every film's loop is picture from edge to edge", () => {
    const barred: string[] = [];
    for (const p of films()) {
      const file = `${root}projects/${p.slug}/${loopOf(p.slug)}`;
      const [fw, fh] = mp4Size(file)!;
      const [w, h, x, y] = pictureArea(file);
      expect(Number.isFinite(w! + h! + x! + y!), `${p.slug}: its loop was read`).toBe(true);
      const short = { left: x!, top: y!, right: fw - x! - w!, bottom: fh - y! - h! };
      const bars = Object.entries(short).filter(([, px]) => px > SOFT).map(([edge, px]) => `${px} px at the ${edge}`);
      if (bars.length) barred.push(`${p.slug} (${fw} x ${fh}): ${bars.join(', ')}`);
    }
    expect(barred).toEqual([]);
  }, 240_000);

  // the wall video scales each loop to its pane's shape without asking the file's own (scripts/make-walls.mjs): a loop
  // that is not the shape its film declares stands stretched in every pane of the wall
  it("every film's loop is the shape its film declares", () => {
    for (const p of films()) {
      const [w, h] = mp4Size(`${root}projects/${p.slug}/${loopOf(p.slug)}`)!;
      expect(Math.abs(w / h / aspectRatio(p.aspect) - 1), `${p.slug}: ${w} x ${h} against ${p.aspect}`).toBeLessThan(0.005);
    }
  });

  // PHILIA's picture is 1.9:1 and its pane 16:9: the bars are cut and the picture fills the pane, a little of each side
  // past the pane's edge (about 7 % larger: the owner's "scale it up a bit"). The window is the largest exact 16:9 one
  // inside the picture clear of the bars' soft edge rows, 1184 x 666 of the master's 1280 x 720, set at the film's
  // focus point (45 % across); the loop is that window at 960 x 540 (its size before), the poster the same window of
  // the same frame as before, at its own size (never upscaled).
  it.skipIf(!ffmpeg)("PHILIA's loop and poster are its picture alone, in its pane's shape (owner 2026-11-25)", () => {
    const p = films().find((q) => q.slug === 'philia')!;
    const dir = `${root}projects/philia/`;
    expect(p.aspect).toBe('16:9');
    expect(mp4Size(`${dir}preview.mp4`)).toEqual([960, 540]);
    expect(pictureArea(`${dir}preview.mp4`)).toEqual([960, 540, 0, 0]);
    // the poster: its top rows are the field in the sun, not a bar (they were black down to row 21 of 720)
    const top = grey(`${dir}poster.jpg`, 'iw:4:0:0'); // (its four top rows)
    expect(Math.max(...top)).toBeGreaterThan(128);
    expect([top.length / 4, grey(`${dir}poster.jpg`, '1:ih:0:0').length], 'the poster is the window at its own size').toEqual([1184, 666]);
    expect(1184 / 666).toBeCloseTo(aspectRatio(p.aspect), 6);
  }, 60_000);
});
