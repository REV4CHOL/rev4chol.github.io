import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { pickLoopFiles } from './src/lib/loop-files';

const p = (f: string) => fileURLToPath(new URL(f, import.meta.url));

/** Per-project loop listing: { projects: { slug: [video files] } }. Served
 *  live by the dev server (drop a file with ANY name, refresh, it's listed)
 *  and baked into dist on build so static hosting gets the same answer. */
function scanLoops(): { projects: Record<string, string[]> } {
  const out: Record<string, string[]> = {};
  const root = p('public/content/projects/');
  if (!existsSync(root)) return { projects: out };
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
  return { projects: out };
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
        contact: p('contact.html'),
        project: p('project.html'),
      },
    },
  },
});
