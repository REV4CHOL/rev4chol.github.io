import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// An export that runs one frame long ends on a pure black frame, and a loop that ends on black flashes black every
// time it wraps: on its pane, on its film page's hero, in the homepage's reel. Masters keep arriving that way: MIEN
// VIEN, FOREST ONSEN, then the owner, 2026-09-30: "webloop Soft Hours & Lonely Lands has a black frame. Remove the
// black frame for me". The sweep that followed found the same last frame on PHILIA's loop and on the reel's fourth
// clip. This test decodes every loop's first frame and its last quarter second, so the next one is caught here.
// (It needs ffmpeg on the path; without it the test is skipped.)

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** A frame whose brightest pixel is darker than this is black (video black is 16; the darkest picture frame in any
 *  loop, HALIDE's room between two flashes, peaks at 119). */
const BLACK = 32;

/** Every loop the site plays: each film's videos and the homepage reel's, as paths under public/content. */
function loops(): string[] {
  const videos = (dir: string) =>
    existsSync(root + dir)
      ? readdirSync(root + dir).filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f)).map((f) => `${dir}/${f}`)
      : [];
  const films = readdirSync(`${root}projects`, { withFileTypes: true }).filter((d) => d.isDirectory());
  return [...films.flatMap((d) => videos(`projects/${d.name}`)), ...videos('home')];
}

/** The brightest pixel (luma) of each frame ffmpeg decodes, given options before and after the input. */
function peaks(file: string, before: string[], after: string[] = []): number[] {
  const out = spawnSync(
    'ffmpeg',
    ['-v', 'error', ...before, '-i', root + file, ...after, '-vf', 'signalstats,metadata=mode=print:file=-', '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).stdout;
  return [...out.matchAll(/lavfi\.signalstats\.YMAX=(\d+)/g)].map((m) => Number(m[1]));
}

describe('no loop flashes black at its wrap', () => {
  it.skipIf(!ffmpeg)('no loop begins or ends on a black frame', () => {
    const files = loops();
    expect(files.length).toBeGreaterThan(20);
    const black: string[] = [];
    for (const file of files) {
      // (the filter may hand on a frame or two more than the one the output keeps: the first printed is frame 0)
      const head = peaks(file, [], ['-frames:v', '1']);
      const tail = peaks(file, ['-sseof', '-0.25']);
      expect(head.length, `${file}: its first frame decodes`).toBeGreaterThan(0);
      expect(tail.length, `${file}: its last frames decode`).toBeGreaterThan(0);
      if (head[0]! < BLACK) black.push(`${file}: the first frame`);
      tail.forEach((peak, i) => {
        if (peak < BLACK) black.push(`${file}: frame ${tail.length - i} from the end`);
      });
    }
    expect(black).toEqual([]);
  }, 180_000);
});
