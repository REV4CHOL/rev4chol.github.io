// THE WALL VIDEOS (npm run walls). One video per chapter that plays every pane's loop as a tile, a half-size copy of
// it, and a map of where each tile lies: public/content/walls/<chapter>.mp4, <chapter>-s.mp4, <chapter>.json.
// The arithmetic is src/lib/wall-files.ts; this file only reads the loops and runs ffmpeg.
// Run it after a loop is added or replaced, and after a film joins or leaves a chapter. Commit what it writes.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickLoopFiles } from '../src/lib/loop-files.ts';
import {
  WALL_FPS, WALL_GUTTER, WALL_SHORT_PASS_SECONDS, dropsEveryFifth, packWall, passFrames, ratioOfAspect, sharedLength,
} from '../src/lib/wall-files.ts';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const outFlag = process.argv.indexOf('--out');
const outDir = outFlag > 0 ? resolve(process.argv[outFlag + 1]) : join(root, 'walls');

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const tmp = mkdtempSync(join(tmpdir(), 'rvl-walls-'));
const stop = (msg) => {
  rmSync(tmp, { recursive: true, force: true });
  console.error(`make-walls: ${msg} Nothing was written.`);
  process.exit(1);
};

if (run('ffmpeg', ['-version']).status !== 0 || run('ffprobe', ['-version']).status !== 0) {
  stop('ffmpeg and ffprobe must be on the PATH (winget install Gyan.FFmpeg).');
}

/** A loop's frame count and frame rate, or null when ffprobe cannot read it. */
function probe(file) {
  const r = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=r_frame_rate,nb_read_frames', '-of', 'json', file,
  ]);
  if (r.status !== 0) return null;
  try {
    const s = JSON.parse(r.stdout).streams[0];
    const [n, d] = String(s.r_frame_rate).split('/').map(Number);
    const frames = Number(s.nb_read_frames);
    const fps = n / (d || 1);
    return frames > 0 && fps > 0 ? { frames, fps } : null;
  } catch {
    return null;
  }
}

const encode = (frames, extra) => [
  '-frames:v', String(frames), '-r', String(WALL_FPS), '-c:v', 'libx264', ...extra, '-pix_fmt', 'yuv420p',
  '-crf', '23', '-g', String(2 * WALL_FPS), '-keyint_min', String(2 * WALL_FPS), '-sc_threshold', '0', '-an', '-movflags', '+faststart',
];
const mb = (file) => (statSync(file).size / 1e6).toFixed(1);

const films = JSON.parse(readFileSync(join(root, 'projects.json'), 'utf8')).filter((e) => e && e.slug && !e.blank && !e.gap);
const built = [];
for (const chapter of ['human', 'machine']) {
  const list = films.filter((f) => (f.category === 'machine' ? 'machine' : 'human') === chapter);
  if (list.length === 0) continue;
  const tiles = [];
  for (const f of list) {
    const dir = join(root, 'projects', f.slug);
    let files = [];
    try { files = readdirSync(dir); } catch { /* no folder: reported below */ }
    const loop = pickLoopFiles(files, f.film && f.film.type === 'local' && f.film.src ? [f.film.src] : [])[0];
    if (!loop) stop(`${f.slug} has no loop file.`);
    const path = join(dir, loop);
    const p = probe(path);
    if (!p) stop(`the loop of ${f.slug} (${loop}) cannot be read.`);
    const bytes = readFileSync(path);
    const ratio = ratioOfAspect(f.aspect ?? '16:9');
    tiles.push({
      slug: f.slug, ratio, tall: ratio < 1, path, fps: p.fps, drop: dropsEveryFifth(p.fps), pass: passFrames(p.frames, p.fps),
      loop: { file: loop, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') },
    });
  }
  const pack = packWall(tiles.map(({ slug, ratio, tall }) => ({ slug, ratio, tall })));
  if (!pack) stop(`the films of ${chapter} do not fit one frame.`);
  const len = sharedLength(tiles.map((t) => t.pass));

  // each loop: every fifth frame out if it runs at 29.97, then frame for frame at 24; scaled to its tile; ringed by its
  // own edge pixels; repeated for ever from its first frame. Then every tile laid on one black frame.
  const g = WALL_GUTTER;
  const chains = [`color=c=black:s=${pack.width}x${pack.height}:r=${WALL_FPS}[bg0]`];
  tiles.forEach((t, i) => {
    const r = pack.tiles[t.slug];
    chains.push(
      `[${i}:v]${t.drop ? "select='mod(n+1,5)'," : ''}setpts=N/${WALL_FPS}/TB,fps=${WALL_FPS},` +
      `scale=${r.w}:${r.h}:flags=lanczos,setsar=1,format=yuv420p,` +
      `pad=${r.w + 2 * g}:${r.h + 2 * g}:${g}:${g},fillborders=left=${g}:right=${g}:top=${g}:bottom=${g}:mode=smear,` +
      `loop=loop=-1:size=${t.pass}:start=0,setpts=N/${WALL_FPS}/TB[t${i}]`,
      `[bg${i}][t${i}]overlay=x=${r.x - g}:y=${r.y - g}[bg${i + 1}]`,
    );
  });
  chains.push(`[bg${tiles.length}]split[full][half]`, `[half]scale=${pack.width / 2}:${pack.height / 2}:flags=area[small]`);

  const full = `${chapter}.mp4`;
  const small = `${chapter}-s.mp4`;
  const r = run('ffmpeg', [
    '-v', 'error', '-y', ...tiles.flatMap((t) => ['-i', t.path]), '-filter_complex', chains.join(';'),
    '-map', '[full]', ...encode(len.frames, ['-profile:v', 'high', '-level:v', '4.0']), join(tmp, full),
    '-map', '[small]', ...encode(len.frames, ['-profile:v', 'high']), join(tmp, small),
  ]);
  if (r.status !== 0) stop(`ffmpeg failed on ${chapter}: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ')}`);

  const map = {
    width: pack.width, height: pack.height, fps: WALL_FPS, frames: len.frames, seconds: Math.round((len.frames / WALL_FPS) * 1000) / 1000,
    file: full, small,
    tiles: Object.fromEntries(tiles.map((t) => [t.slug, { ...pack.tiles[t.slug], fps: Math.round(t.fps * 1000) / 1000, loop: t.loop }])),
  };
  writeFileSync(join(tmp, `${chapter}.json`), `${JSON.stringify(map, null, 2)}\n`);
  built.push(full, small, `${chapter}.json`);

  const last = len.shortestLastPass / WALL_FPS;
  console.log(
    `${chapter}: ${tiles.length} tiles in ${pack.rows} rows of ${pack.rowHeight} px, frame ${pack.width}x${pack.height}; ` +
    `${len.frames} frames, ${map.seconds} s; shortest last pass ${last.toFixed(2)} s; ` +
    `${full} ${mb(join(tmp, full))} MB, ${small} ${mb(join(tmp, small))} MB`,
  );
  if (last < WALL_SHORT_PASS_SECONDS) console.warn(`  warning: a pane of ${chapter} restarts ${last.toFixed(2)} s into a pass`);
}

mkdirSync(outDir, { recursive: true });
for (const f of built) copyFileSync(join(tmp, f), join(outDir, f));
rmSync(tmp, { recursive: true, force: true });
console.log(`written to ${outDir}`);
