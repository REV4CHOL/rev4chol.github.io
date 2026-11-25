// THE THREADS' PICTURES (npm run threads). Each film's thread shows six small, nearly grey copies of its stills:
// public/content/projects/<slug>/thread/<code>.jpg, and their map, public/content/threads.json ({ slug: [[code, w, h]] }).
// Which stills, what they are called and how small they are is src/lib/thread-files.ts; this file only reads the
// stills and runs ffmpeg. Run it after a film's stills are added, replaced or removed, and commit what it writes.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  THREAD_DIR, THREAD_LONG_SIDE, THREAD_SATURATION, threadPicks, wallCodes, wallOrder,
} from '../src/lib/thread-files.ts';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const tmp = mkdtempSync(join(tmpdir(), 'rvl-threads-'));
const stop = (msg) => {
  rmSync(tmp, { recursive: true, force: true });
  console.error(`make-threads: ${msg} Nothing was written.`);
  process.exit(1);
};

if (run('ffmpeg', ['-version']).status !== 0 || run('ffprobe', ['-version']).status !== 0) {
  stop('ffmpeg and ffprobe must be on the PATH (winget install Gyan.FFmpeg).');
}

const STILL = /\.(jpe?g|png|gif|webp|avif)$/i;
const L = THREAD_LONG_SIDE;
// the longer side is 192 px at most (never upscaled); the other side follows, rounded to an even number
const scale = `scale=w='if(gte(iw,ih),min(${L},iw),-2)':h='if(gte(iw,ih),-2,min(${L},ih))':flags=lanczos,hue=s=${THREAD_SATURATION}`;

/** A picture's width and height, or null when ffprobe cannot read it. */
function sizeOf(file) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  if (r.status !== 0) return null;
  const [w, h] = r.stdout.trim().split(',').map(Number);
  return w > 0 && h > 0 ? [w, h] : null;
}

const films = JSON.parse(readFileSync(join(root, 'projects.json'), 'utf8')).filter((e) => e && e.slug && !e.blank && !e.gap);
const map = {};
const made = []; // [slug, tmp folder, codes]
for (const f of films) {
  let names = [];
  try { names = readdirSync(join(root, 'projects', f.slug, 'stills')); } catch { /* no folder: reported below */ }
  const files = wallOrder(names.filter((n) => STILL.test(n)));
  if (files.length === 0) stop(`${f.slug} has no stills.`);
  const codes = wallCodes(files, f.aspect === '9:16');
  const dir = join(tmp, f.slug);
  mkdirSync(dir, { recursive: true });
  map[f.slug] = [];
  for (const i of threadPicks(files.length)) {
    const src = join(root, 'projects', f.slug, 'stills', files[i]);
    const out = join(dir, `${codes[i]}.jpg`);
    const r = run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', scale, '-frames:v', '1', '-q:v', '5', '-map_metadata', '-1', out]);
    if (r.status !== 0) stop(`ffmpeg failed on ${f.slug}/stills/${files[i]}: ${(r.stderr || '').trim().split('\n').slice(-2).join(' | ')}`);
    const size = sizeOf(out);
    if (!size) stop(`the thumbnail of ${f.slug}/stills/${files[i]} cannot be read.`);
    map[f.slug].push([codes[i], size[0], size[1]]);
  }
  made.push([f.slug, dir]);
}

// every thumbnail was made: now each film's folder is emptied and filled, and the map written
let total = 0;
for (const [slug, dir] of made) {
  const dest = join(root, 'projects', slug, THREAD_DIR);
  mkdirSync(dest, { recursive: true });
  for (const old of readdirSync(dest)) rmSync(join(dest, old), { force: true });
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    copyFileSync(join(dir, name), join(dest, name));
    bytes += statSync(join(dir, name)).size;
  }
  total += bytes;
  console.log(`${slug.padEnd(26)}${String(map[slug].length).padStart(2)} thumbnails  ${(bytes / 1024).toFixed(0)} KB`);
}
writeFileSync(join(root, 'threads.json'), `${JSON.stringify(map, null, 1)}\n`);
rmSync(tmp, { recursive: true, force: true });
console.log(`${made.length} films, ${(total / 1024).toFixed(0)} KB in all; map written to ${join(root, 'threads.json')}`);
