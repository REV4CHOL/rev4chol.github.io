import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { UNTOUCHED_PAGES, withCsp } from './src/lib/csp';
import { pickLoopFiles } from './src/lib/loop-files';
import { narrowCss } from './src/lib/narrow-css';
import { THREAD_DIR, type ThreadEntry } from './src/lib/thread-files';
import { scanHover, scanWalls } from './src/lib/wall-scan';

const p = (f: string) => fileURLToPath(new URL(f, import.meta.url));

/** The homepage reel's slots, listed instead of probed: the old HEAD-probe
 *  discovery cost the first paint ~20 sequential round-trips. */
function scanHomeLoops(): string[] {
  const dir = p('public/content/home/');
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => /^loop[-_]\d+\.(mp4|webm|gif)$/i.test(f))
      .sort((a, b) => parseInt(a.match(/(\d+)/)![1], 10) - parseInt(b.match(/(\d+)/)![1], 10));
  } catch {
    return [];
  }
}

/** Each project's stills wall, listed instead of probed: the old HEAD-probe
 *  discovery treated ANY dropped request as "numbering gap, end the reel" —
 *  on a flaky mobile connection one blip stranded the wall at a single
 *  still until a refresh. The manifest is the truth; probing is only the
 *  no-manifest fallback. */
function scanStills(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const root = p('public/content/projects/');
  if (!existsSync(root)) return out;
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    try {
      const files = readdirSync(`${root}${ent.name}/stills/`)
        .filter((f) => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (files.length) out[ent.name] = files;
    } catch { /* no stills folder */ }
  }
  return out;
}

/** Per-project loop listing plus the homepage reel and the stills walls:
 *  { projects, home, stills }. Served live by the dev server (drop a file
 *  with ANY name, refresh, it's listed) and baked into dist on build so
 *  static hosting gets the same answer. */
function scanLoops(): { projects: Record<string, string[]>; home: string[]; stills: Record<string, string[]> } {
  const out: Record<string, string[]> = {};
  const root = p('public/content/projects/');
  if (!existsSync(root)) return { projects: out, home: scanHomeLoops(), stills: scanStills() };
  // a self-hosted full film (film.src) must never be picked as the loop
  const filmBySlug = new Map<string, string>();
  try {
    const parsed = JSON.parse(readFileSync(p('public/content/projects.json'), 'utf8')) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [];
    for (const e of arr as { slug?: string; film?: { type?: string; src?: string } | null }[]) {
      if (e?.slug && e.film?.type === 'local' && e.film.src) filmBySlug.set(e.slug, e.film.src);
    }
  } catch { /* no json, no exclusions */ }
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    let files: string[] = [];
    try {
      files = readdirSync(root + ent.name);
    } catch {
      continue;
    }
    const film = filmBySlug.get(ent.name);
    const loops = pickLoopFiles(files, film ? [film] : []);
    if (loops.length) out[ent.name] = loops;
  }
  return { projects: out, home: scanHomeLoops(), stills: scanStills() };
}

/** Each film's thread pictures (npm run threads): the map as the script wrote it, without a film whose files are not
 *  all there (its thread is then drawn without frames). */
function scanThreads(): Record<string, ThreadEntry[]> {
  const out: Record<string, ThreadEntry[]> = {};
  try {
    const map = JSON.parse(readFileSync(p('public/content/threads.json'), 'utf8')) as Record<string, ThreadEntry[]>;
    for (const [slug, list] of Object.entries(map)) {
      if (!Array.isArray(list) || list.length === 0) continue;
      if (list.every((e) => existsSync(p(`public/content/projects/${slug}/${THREAD_DIR}/${e[0]}.jpg`)))) out[slug] = list;
    }
  } catch { /* no map: no thread pictures */ }
  return out;
}

/** The whole manifest: the loops, the reel and the stills (scanLoops), then each chapter's wall video with only the
 *  tiles that are still good, the films that have a hover clip (src/lib/wall-scan.ts) and each film's thread pictures:
 *  { projects, home, stills, walls, hover, threads }. The pages read walls, hover clips and threads from here and never probe. */
function scanMedia() {
  const root = p('public/content/');
  return { ...scanLoops(), walls: scanWalls(root), hover: scanHover(root), threads: scanThreads() };
}

function mediaManifest(): Plugin {
  // the build's real output folder: `vite build --outDir <elsewhere>` gets its manifest too
  let outDir = p('dist/');
  return {
    name: 'revachol-media-manifest',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/content/media-manifest.json')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(scanMedia()));
      });
    },
    closeBundle() {
      const dir = join(outDir, 'content');
      if (existsSync(dir)) writeFileSync(join(dir, 'media-manifest.json'), JSON.stringify(scanMedia()));
    },
  };
}

/** Every built page but the archived ABOUT carries the site's Content-Security-Policy (src/lib/csp.ts), its script
 *  hashes worked out from the finished page ('post': after Vite's own tags are in). Build only: the dev server, its
 *  client and its error overlay are left as they were. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'revachol-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html, ctx) => (UNTOUCHED_PAGES.includes(basename(ctx.filename)) ? html : withCsp(html)),
    },
  };
}

/** A narrow PC window reads the tablet's layout blocks (src/lib/narrow-css.ts): each sheet of src/styles/ but the
 *  archived ABOUT's gets its marked blocks mirrored, before Vite's own CSS handling, in dev and in the build. */
function narrowWindowCss(): Plugin {
  return {
    name: 'revachol-narrow-css',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0].replace(/\\/g, '/');
      if (!/\/src\/styles\/[^/]+\.css$/.test(file) || file.endsWith('/about-old.css')) return null;
      return { code: narrowCss(code), map: null };
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [narrowWindowCss(), mediaManifest(), contentSecurityPolicy()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: p('index.html'),
        works: p('works.html'),
        about: p('about.html'),
        aboutOld: p('about-old.html'), // the pre-remake ABOUT, archived live
        story: p('story.html'), // the city — the tour rides here now
        contact: p('contact.html'),
        project: p('project.html'),
        lost: p('404.html'), // the site's own "not found": GitHub Pages serves it for any unknown address
      },
    },
  },
});
