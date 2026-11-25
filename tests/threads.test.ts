import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THREAD_DIR, THREAD_LONG_SIDE, threadPicks, wallCodes, wallOrder, type ThreadEntry } from '../src/lib/thread-files';

// EVERY FILM'S THREAD HAS ITS PICTURES (npm run threads). Run it again after a film's stills are added, replaced or
// removed, and commit what it writes: this file fails when the map and a stills folder disagree.
const root = 'public/content/';
const films = JSON.parse(readFileSync(`${root}projects.json`, 'utf8')) as { slug: string; aspect?: string }[];
const map = JSON.parse(readFileSync(`${root}threads.json`, 'utf8')) as Record<string, ThreadEntry[]>;
const STILL = /\.(jpe?g|png|gif|webp|avif)$/i;
const ffprobe = spawnSync('ffprobe', ['-version']).status === 0;
/** A JPEG's own size, read from its frame header (every still and thumbnail today is a JPEG: no program is run). */
const jpegSize = (file: string): [number, number] | null => {
  const b = readFileSync(file);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i + 9 < b.length; ) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
};
/** Any picture's size: a JPEG from its header, another kind through ffprobe (null where that is not installed). */
const sizeOf = (file: string): [number, number] | null => {
  const own = jpegSize(file);
  if (own || !ffprobe) return own;
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [w, h] = r.stdout.trim().split(',').map(Number);
  return [w, h];
};

describe("the threads' pictures (npm run threads)", () => {
  it('the map lists every film, and only films', () => {
    expect(Object.keys(map)).toEqual(films.map((f) => f.slug));
  });

  it("each film's entries are the six picks of its stills as they stand today, by their wall codes", () => {
    for (const f of films) {
      const stills = wallOrder(readdirSync(`${root}projects/${f.slug}/stills`).filter((n) => STILL.test(n)));
      const codes = wallCodes(stills, f.aspect === '9:16');
      expect(map[f.slug].map((e) => e[0]), `${f.slug}: run npm run threads`).toEqual(threadPicks(stills.length).map((i) => codes[i]));
    }
  });

  // (a wall is its film's whole stills folder today. The page would cut a wall at 60 stills, and a film may list its
  //  stills by hand in projects.json: either would make a frame's code differ from the wall's. Teach wallCodes and
  //  scripts/make-threads.mjs that case before a film uses it.)
  it("the codes are the wall's own: no film lists its stills by hand, none has more than the wall's 60", () => {
    for (const f of films) {
      expect((f as { stills?: unknown }).stills, f.slug).toBeUndefined();
      expect(readdirSync(`${root}projects/${f.slug}/stills`).filter((n) => STILL.test(n)).length, f.slug).toBeLessThanOrEqual(60);
    }
  });

  it('every entry has its file, and nothing else stands in the folder', () => {
    for (const f of films) {
      const dir = `${root}projects/${f.slug}/${THREAD_DIR}`;
      for (const [code] of map[f.slug]) expect(existsSync(`${dir}/${code}.jpg`), `${f.slug} ${code}`).toBe(true);
      expect(readdirSync(dir).sort(), f.slug).toEqual(map[f.slug].map((e) => `${e[0]}.jpg`).sort());
    }
  });

  it("a thumbnail is as large as the map says, small, and in its still's own shape", () => {
    for (const f of films) {
      const stills = wallOrder(readdirSync(`${root}projects/${f.slug}/stills`).filter((n) => STILL.test(n)));
      const picks = threadPicks(stills.length);
      map[f.slug].forEach(([code, w, h], i) => {
        expect(jpegSize(`${root}projects/${f.slug}/${THREAD_DIR}/${code}.jpg`), `${f.slug} ${code}`).toEqual([w, h]);
        expect(Math.max(w, h), `${f.slug} ${code}`).toBeLessThanOrEqual(THREAD_LONG_SIDE);
        const still = sizeOf(`${root}projects/${f.slug}/stills/${stills[picks[i]]}`);
        if (!still) return; // (a still that is not a JPEG, on a machine without ffprobe: its shape is not read here)
        expect(Math.abs(w / h / (still[0] / still[1]) - 1), `${f.slug} ${code} shape`).toBeLessThan(0.03); // (rounded to whole, even px)
      });
    }
  });
});
