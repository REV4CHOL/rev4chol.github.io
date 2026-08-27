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
