export interface NavItem { label: string; href: string }
export interface Social { label: string; href: string }
export interface SiteContent {
  name: string;
  tagline: string;
  email: string;
  nav: NavItem[];
  socials: Social[];
}
export interface FilmRef { type: 'vimeo' | 'youtube' | 'local'; src: string }
export interface Credit { role: string; name: string }
export interface GridPos { col: number; row: number }
export interface Project {
  slug: string;
  title: string;
  year: number;
  role: string;
  runtime: string;
  tags: string[];
  accent: string;
  tileSize: 'normal' | 'large';
  /** picture aspect of the pane and all dossier media (default 16:9) */
  aspect: '16:9' | '4:3' | '2.39:1';
  /** which works channel the film broadcasts on (default "human") */
  category: 'human' | 'machine';
  synopsis: string;
  credits: Credit[];
  film: FilmRef | null;
  stills: string[];
  position: GridPos | null;
}

export class ContentError extends Error {
  constructor(public file: string, public detail: string) {
    super(`[${file}] ${detail}`);
    this.name = 'ContentError';
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9-]+$/;

function fail(file: string, msg: string): never {
  throw new ContentError(file, msg);
}

function str(v: unknown, file: string, name: string, fallback?: string): string {
  if (v === undefined || v === null) {
    if (fallback !== undefined) return fallback;
    fail(file, `"${name}" is required`);
  }
  if (typeof v !== 'string') fail(file, `"${name}" must be a string`);
  return v;
}

function obj(v: unknown, file: string, name: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(file, `${name} must be an object`);
  return v as Record<string, unknown>;
}

export function parseJson(text: string, file: string): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    fail(file, `broken JSON — ${(e as Error).message}`);
  }
}

export function parseSite(raw: unknown): SiteContent {
  const file = 'site.json';
  const r = obj(raw, file, 'root');
  const name = str(r.name, file, 'name');
  if (!name.trim()) fail(file, '"name" must not be empty');
  if (!Array.isArray(r.nav) || r.nav.length === 0) fail(file, '"nav" must be a non-empty array');
  const nav = r.nav.map((n, i) => {
    const o = obj(n, file, `nav[${i}]`);
    return { label: str(o.label, file, `nav[${i}].label`), href: str(o.href, file, `nav[${i}].href`) };
  });
  const socialsRaw = r.socials ?? [];
  if (!Array.isArray(socialsRaw)) fail(file, '"socials" must be an array');
  const socials = socialsRaw.map((s, i) => {
    const o = obj(s, file, `socials[${i}]`);
    return { label: str(o.label, file, `socials[${i}].label`), href: str(o.href, file, `socials[${i}].href`) };
  });
  return {
    name,
    tagline: str(r.tagline, file, 'tagline', ''),
    email: str(r.email, file, 'email', ''),
    nav,
    socials,
  };
}

export function parseProject(raw: unknown, i: number): Project {
  const file = 'projects.json';
  const r = obj(raw, file, `projects[${i}]`);
  const slug = str(r.slug, file, `projects[${i}].slug`);
  if (!SLUG.test(slug)) fail(file, `projects[${i}].slug "${slug}" must be lowercase letters, digits and hyphens only`);
  const where = `project "${slug}"`;

  const title = str(r.title, file, `${where} title`);
  if (!title.trim()) fail(file, `${where} title must not be empty`);

  if (typeof r.year !== 'number' || !Number.isInteger(r.year) || r.year < 1900 || r.year > 2100)
    fail(file, `${where} year must be an integer between 1900 and 2100`);

  const accent = r.accent === undefined ? '#C8FF00' : str(r.accent, file, `${where} accent`);
  if (!HEX.test(accent)) fail(file, `${where} accent must look like "#C8FF00"`);

  const tileSize = r.tileSize === undefined ? 'normal' : r.tileSize;
  if (tileSize !== 'normal' && tileSize !== 'large') fail(file, `${where} tileSize must be "normal" or "large"`);

  const aspect = r.aspect === undefined ? '16:9' : r.aspect;
  if (aspect !== '16:9' && aspect !== '4:3' && aspect !== '2.39:1')
    fail(file, `${where} aspect must be "16:9", "4:3" or "2.39:1"`);

  const category = r.category === undefined ? 'human' : r.category;
  if (category !== 'human' && category !== 'machine')
    fail(file, `${where} category must be "human" or "machine"`);

  const tags = r.tags ?? [];
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string'))
    fail(file, `${where} tags must be an array of strings`);

  const stills = r.stills ?? [];
  if (!Array.isArray(stills) || stills.some((s) => typeof s !== 'string'))
    fail(file, `${where} stills must be an array of file names`);

  const creditsRaw = r.credits ?? [];
  if (!Array.isArray(creditsRaw)) fail(file, `${where} credits must be an array`);
  const credits = creditsRaw.map((c, ci) => {
    const o = obj(c, file, `${where} credits[${ci}]`);
    return {
      role: str(o.role, file, `${where} credits[${ci}].role`),
      name: str(o.name, file, `${where} credits[${ci}].name`),
    };
  });

  let film: FilmRef | null = null;
  if (r.film !== undefined && r.film !== null) {
    const f = obj(r.film, file, `${where} film`);
    if (f.type !== 'vimeo' && f.type !== 'youtube' && f.type !== 'local')
      fail(file, `${where} film.type must be "vimeo", "youtube" or "local"`);
    film = { type: f.type, src: str(f.src, file, `${where} film.src`) };
  }

  let position: GridPos | null = null;
  if (r.position !== undefined && r.position !== null) {
    const p = obj(r.position, file, `${where} position`);
    if (
      typeof p.col !== 'number' || !Number.isInteger(p.col) ||
      typeof p.row !== 'number' || !Number.isInteger(p.row)
    )
      fail(file, `${where} position needs integer "col" and "row"`);
    position = { col: p.col, row: p.row };
  }

  return {
    slug,
    title,
    year: r.year,
    role: str(r.role, file, `${where} role`, ''),
    runtime: str(r.runtime, file, `${where} runtime`, ''),
    tags: tags as string[],
    accent,
    tileSize,
    aspect,
    category,
    synopsis: str(r.synopsis, file, `${where} synopsis`, ''),
    credits,
    film,
    stills: stills as string[],
    position,
  };
}

export function parseProjects(raw: unknown): Project[] {
  const file = 'projects.json';
  if (!Array.isArray(raw)) fail(file, 'root must be an array of projects');
  if (raw.length === 0) fail(file, 'add at least one project');
  const out = raw.map((r, i) => parseProject(r, i));
  const seen = new Set<string>();
  for (const p of out) {
    if (seen.has(p.slug)) fail(file, `duplicate slug "${p.slug}" — slugs must be unique`);
    seen.add(p.slug);
  }
  return out;
}

const CONTENT_BASE = '/content';

export function projectAssetUrl(slug: string, file: string): string {
  return `${CONTENT_BASE}/projects/${slug}/${file}`;
}

/** Numeric ratio for an aspect key — the single source the pane width, the
 *  dossier hero fit and the stills wall all derive from. */
export function aspectRatio(a: Project['aspect']): number {
  if (a === '4:3') return 4 / 3;
  if (a === '2.39:1') return 2.39;
  return 16 / 9;
}

let loopManifest: Record<string, string[]> | null | undefined; // undefined = not fetched yet

/** Fetch the per-project loop listing once. The dev server answers it live
 *  from the folders; builds bake it into dist. Quiet when absent — the
 *  canonical name chain below still works without it. */
export async function loadLoopManifest(): Promise<void> {
  if (loopManifest !== undefined) return;
  try {
    const res = await fetch('/content/media-manifest.json', { cache: 'no-store' });
    if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) {
      loopManifest = null;
      return;
    }
    const data = (await res.json()) as { projects?: Record<string, string[]> };
    loopManifest = data.projects ?? null;
  } catch {
    loopManifest = null;
  }
}

/** Candidate urls for a project's loop clip, in probe order: every video the
 *  manifest lists in the folder (ANY filename), then the canonical names as
 *  the no-manifest fallback. The floor pane and the dossier hero walk this
 *  same chain on error, so one clip drives both and the owner can swap or
 *  rename the file at any time. */
export function loopSrcChain(slug: string): string[] {
  const listed = (loopManifest?.[slug] ?? []).map((f) => projectAssetUrl(slug, encodeURIComponent(f)));
  const canon = ['preview.mp4', 'loop.mp4', 'loop_1.mp4', 'loop-1.mp4'].map((f) => projectAssetUrl(slug, f));
  return [...new Set([...listed, ...canon])];
}

export function getSlugFromSearch(search: string): string | null {
  return new URLSearchParams(search).get('p');
}

async function fetchParsed(path: string, file: string): Promise<unknown> {
  const res = await fetch(path);
  if (!res.ok) fail(file, `could not load (HTTP ${res.status})`);
  return parseJson(await res.text(), file);
}

let sitePromise: Promise<SiteContent> | null = null;
export function loadSite(): Promise<SiteContent> {
  return (sitePromise ??= fetchParsed(`${CONTENT_BASE}/site.json`, 'site.json').then(parseSite));
}

let projectsPromise: Promise<Project[]> | null = null;
export function loadProjects(): Promise<Project[]> {
  return (projectsPromise ??= fetchParsed(`${CONTENT_BASE}/projects.json`, 'projects.json').then(parseProjects));
}

/* ------------------------------------------------ about (operator file) -- */

export interface AboutFact { k: string; v: string }
export interface AboutContent {
  statement: string;
  bio: string[];
  facts: AboutFact[];
  capabilities: string[];
}

export const ABOUT_FALLBACK: AboutContent = {
  statement: 'THE EYE BEHIND THE MACHINE',
  bio: [],
  facts: [],
  capabilities: [],
};

export function parseAbout(raw: unknown): AboutContent {
  const file = 'about.json';
  const r = obj(raw, file, 'root');
  const statement = str(r.statement, file, 'statement', ABOUT_FALLBACK.statement);
  const bio = r.bio ?? [];
  if (!Array.isArray(bio) || bio.some((b) => typeof b !== 'string'))
    fail(file, '"bio" must be an array of strings');
  const factsRaw = r.facts ?? [];
  if (!Array.isArray(factsRaw)) fail(file, '"facts" must be an array');
  const facts = factsRaw.map((f, i) => {
    const o = obj(f, file, `facts[${i}]`);
    return { k: str(o.k, file, `facts[${i}].k`), v: str(o.v, file, `facts[${i}].v`) };
  });
  const caps = r.capabilities ?? [];
  if (!Array.isArray(caps) || caps.some((c) => typeof c !== 'string'))
    fail(file, '"capabilities" must be an array of strings');
  return {
    statement,
    bio: bio as string[],
    facts,
    capabilities: (caps as string[]).map((c) => c.toUpperCase()),
  };
}

let aboutPromise: Promise<AboutContent> | null = null;
/** about.json is OPTIONAL: a missing file falls back quietly (the page has
 *  designed defaults), but a malformed file that actually exists stays loud. */
export function loadAbout(): Promise<AboutContent> {
  return (aboutPromise ??= (async () => {
    const res = await fetch(`${CONTENT_BASE}/about/about.json`).catch(() => null);
    if (!res || !res.ok) return ABOUT_FALLBACK;
    // dev servers answer missing files with the SPA's index.html — that is
    // an absent file, not a broken one
    if ((res.headers.get('content-type') ?? '').includes('text/html')) return ABOUT_FALLBACK;
    return parseAbout(parseJson(await res.text(), 'about.json'));
  })());
}
