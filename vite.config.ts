import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { pickLoopFiles } from './src/lib/loop-files';

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

function mediaManifest(): Plugin {
  return {
    name: 'revachol-media-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/content/media-manifest.json')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(scanLoops()));
      });
    },
    closeBundle() {
      const dist = p('dist/content/');
      if (existsSync(dist)) writeFileSync(`${dist}media-manifest.json`, JSON.stringify(scanLoops()));
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [mediaManifest()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: p('index.html'),
        works: p('works.html'),
        about: p('about.html'),
        aboutOld: p('about-old.html'), // the pre-remake ABOUT, archived live
        contact: p('contact.html'),
        project: p('project.html'),
      },
    },
  },
});
